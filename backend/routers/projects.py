from fastapi import APIRouter, Depends, HTTPException
from database import new_id, now, store
from deps import current_user, require_admin
from schemas import ProjectCreate, ProjectPatch

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def with_counts(project: dict) -> dict:
    """Calculate project stats from Supabase."""
    result = dict(project)
    project_id = project["id"]
    if store.supabase is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured")
    try:
        assets_response = store.supabase.table("assets").select("id").eq("project_id", project_id).execute()
        findings_response = store.supabase.table("findings").select("id,risk_score").eq("project_id", project_id).execute()
        assets = assets_response.data or []
        findings = findings_response.data or []
        result["assetCount"] = len(assets)
        result["findingCount"] = len(findings)
        risk_scores = [f.get("risk_score", 0) for f in findings if f.get("risk_score") is not None]
        result["riskScore"] = round(sum(risk_scores) / len(risk_scores)) if risk_scores else 0
    except Exception:
        raise HTTPException(status_code=503, detail="Unable to load project data from Supabase")
    
    return result


@router.get("")
def list_projects(user: dict = Depends(current_user)):
    if store.supabase is not None:
        response = store.supabase.table("projects").select("*").eq("organization_id", user.get("organizationId")).execute()
        return [with_counts({"id": row["id"], "name": row.get("name", ""), "description": row.get("description", ""),
                             "organizationId": row.get("organization_id"), "createdAt": row.get("created_at")})
                for row in (response.data or [])]
    raise HTTPException(status_code=503, detail="Supabase is not configured")


@router.post("", status_code=201)
def create_project(payload: ProjectCreate, user: dict = Depends(require_admin)):
    project = {"id": new_id("proj"), **payload.model_dump(), "createdAt": now()}
    store.projects.append(project)
    store.persist()
    store.log("project_added", user["id"], {"projectId": project["id"]})
    return with_counts(project)


@router.get("/{project_id}")
def get_project(project_id: str, user: dict = Depends(current_user)):
    require_project(project_id, user)
    response = store.supabase.table("projects").select("*").eq("id", project_id).limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Project not found")
    row = response.data[0]
    return with_counts({"id": row["id"], "name": row.get("name", ""), "description": row.get("description", ""),
                       "organizationId": row.get("organization_id"), "createdAt": row.get("created_at")})


@router.patch("/{project_id}")
def patch_project(project_id: str, payload: ProjectPatch, user: dict = Depends(require_admin)):
    project = next((item for item in store.projects if item["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.update({key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None})
    store.persist()
    return with_counts(project)
