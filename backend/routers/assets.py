from fastapi import APIRouter, Depends, HTTPException
from database import new_id, now, store
from deps import current_user, require_project
from schemas import AssetCreate, AssetPatch

router = APIRouter(prefix="/api/assets", tags=["Assets"])


def enrich(asset: dict) -> dict:
    result = dict(asset)
    result["technologies"] = asset.get("technologies", [])
    result["findingCount"] = sum(f["assetId"] == asset["id"] and f["status"] != "resolved" for f in store.findings)
    for severity in ("critical", "high", "medium", "low"):
        result[f"{severity}Count"] = sum(f["assetId"] == asset["id"] and f["severity"] == severity and f["status"] != "resolved" for f in store.findings)
    scores = [f["riskScore"] for f in store.findings if f["assetId"] == asset["id"] and f["status"] != "resolved"]
    result["riskScore"] = max(scores, default=0)
    return result


@router.get("")
def list_assets(projectId: str | None = None, user: dict = Depends(current_user)):
    if projectId:
        require_project(projectId, user)
    return [enrich(a) for a in store.assets if not projectId or a["projectId"] == projectId]


@router.post("", status_code=201)
def create_asset(payload: AssetCreate, user: dict = Depends(current_user)):
    require_project(payload.projectId, user)
    asset = {"id": new_id("asset"), **payload.model_dump(), "lastSeen": None, "createdAt": now()}
    store.assets.append(asset)
    store.log("asset_added", user["id"], {"assetId": asset["id"]})
    if asset["authorized"]:
        store.log("asset_authorized", user["id"], {"assetId": asset["id"]})
    return enrich(asset)


@router.get("/{asset_id}")
def get_asset(asset_id: str, user: dict = Depends(current_user)):
    asset = next((item for item in store.assets if item["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    require_project(asset["projectId"], user)
    return enrich(asset)


@router.patch("/{asset_id}")
def patch_asset(asset_id: str, payload: AssetPatch, user: dict = Depends(current_user)):
    asset = next((item for item in store.assets if item["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    require_project(asset["projectId"], user)
    before = asset.get("authorized")
    asset.update({key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None})
    if asset.get("authorized") and not before:
        store.log("asset_authorized", user["id"], {"assetId": asset_id})
    return enrich(asset)


@router.delete("/{asset_id}")
def delete_asset(asset_id: str, user: dict = Depends(current_user)):
    asset = next((item for item in store.assets if item["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    require_project(asset["projectId"], user)
    store.assets.remove(asset)
    return {"deleted": True, "id": asset_id}
