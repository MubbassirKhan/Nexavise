from fastapi import APIRouter, Depends, HTTPException
from database import new_id, store
from deps import current_user
from services.attack_path_service import build_path

router = APIRouter(prefix="/api/attack-paths", tags=["Attack Paths"])


@router.get("")
def list_paths(projectId: str | None = None, user: dict = Depends(current_user)):
    return [path for path in store.attack_paths if not projectId or path["projectId"] == projectId]


@router.get("/{path_id}")
def get_path(path_id: str, user: dict = Depends(current_user)):
    path = next((item for item in store.attack_paths if item["id"] == path_id), None)
    if not path:
        raise HTTPException(status_code=404, detail="Attack path not found")
    return path


@router.post("/analyze", status_code=201)
def analyze(projectId: str | None = None, user: dict = Depends(current_user)):
    candidates = [f for f in store.findings if (not projectId or f["projectId"] == projectId) and f["status"] != "resolved"]
    paths = []
    for finding in sorted(candidates, key=lambda item: item["riskScore"], reverse=True)[:10]:
        asset = next(item for item in store.assets if item["id"] == finding["assetId"])
        path = build_path(asset, finding)
        store.attack_paths.append(path)
        paths.append(path)
    return {"analyzed": True, "count": len(paths), "paths": paths}
