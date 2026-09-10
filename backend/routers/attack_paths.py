from fastapi import APIRouter, Depends, HTTPException
from database import store
from deps import accessible_project_ids, current_user, require_analyst_or_admin, require_project
from services.attack_path_repository import get_attack_path, list_attack_paths
from services.attack_path_service import generate_attack_paths

router = APIRouter(prefix="/api/attack-paths", tags=["Attack Paths"])


@router.get("")
def list_paths(projectId: str | None = None, user: dict = Depends(require_analyst_or_admin)):
    if projectId:
        require_project(projectId, user)
    try:
        if projectId:
            paths = list_attack_paths(projectId)
            # Auto-generate paths if none exist and Supabase is configured
            if not paths and store.supabase:
                try:
                    paths = generate_attack_paths(projectId)
                except Exception:
                    pass  # If generation fails, just return empty list
            return _visible_paths(paths, user)
        else:
            project_ids = accessible_project_ids(user)
            all_paths = []
            for pid in project_ids:
                paths = list_attack_paths(pid)
                # Auto-generate if none exist
                if not paths and store.supabase:
                    try:
                        paths = generate_attack_paths(pid)
                    except Exception:
                        pass
                all_paths.extend(paths)
            return _visible_paths(all_paths, user)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load attack paths from Supabase") from exc


@router.get("/{path_id}")
def get_path(path_id: str, user: dict = Depends(require_analyst_or_admin)):
    try:
        path = get_attack_path(path_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load attack path from Supabase") from exc
    if not path:
        raise HTTPException(status_code=404, detail="Attack path not found")
    require_project(path["projectId"], user)
    if user.get("role") == "analyst" and path.get("finding", {}).get("assignedTo") != user["id"]:
        raise HTTPException(status_code=403, detail="Attack path is not assigned to this analyst")
    return path


@router.post("/analyze", status_code=201)
def analyze(projectId: str | None = None, user: dict = Depends(require_analyst_or_admin)):
    if projectId:
        require_project(projectId, user)
        project_ids = [projectId]
    else:
        project_ids = accessible_project_ids(user)
    try:
        for current_project_id in project_ids:
            existing_paths = list_attack_paths(current_project_id)
            if not existing_paths:
                generate_attack_paths(current_project_id)
        paths = [path for current_project_id in project_ids for path in list_attack_paths(current_project_id)]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to generate attack paths from Supabase") from exc
    paths = _visible_paths(paths, user)
    return {"analyzed": True, "count": len(paths), "paths": paths}


def _visible_paths(paths: list[dict], user: dict) -> list[dict]:
    if user.get("role") == "admin":
        return paths
    return [path for path in paths if path.get("finding", {}).get("assignedTo") == user["id"]]
