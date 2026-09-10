from fastapi import APIRouter, Depends, HTTPException
from database import new_id, now, store
from deps import current_user, require_admin
from schemas import ProjectCreate, ProjectPatch

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def with_counts(project: dict) -> dict:
    result = dict(project)
    result["assetCount"] = sum(asset["projectId"] == project["id"] for asset in store.assets)
    result["findingCount"] = sum(finding["projectId"] == project["id"] for finding in store.findings)
    result["riskScore"] = round(sum(f["riskScore"] for f in store.findings if f["projectId"] == project["id"]) / max(1, result["findingCount"]))
    return result


@router.get("")
def list_projects(user: dict = Depends(current_user)):
    return [with_counts(project) for project in store.projects]


@router.post("", status_code=201)
def create_project(payload: ProjectCreate, user: dict = Depends(require_admin)):
    project = {"id": new_id("proj"), **payload.model_dump(), "createdAt": now()}
    store.projects.append(project)
    store.log("project_added", user["id"], {"projectId": project["id"]})
    return with_counts(project)


@router.get("/{project_id}")
def get_project(project_id: str, user: dict = Depends(current_user)):
    project = next((item for item in store.projects if item["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return with_counts(project)


@router.patch("/{project_id}")
def patch_project(project_id: str, payload: ProjectPatch, user: dict = Depends(require_admin)):
    project = next((item for item in store.projects if item["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.update({key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None})
    return with_counts(project)
