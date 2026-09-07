from fastapi import APIRouter, Depends, HTTPException
from database import store
from deps import current_user
from schemas import DiscoveryRequest
from services.discovery_service import discover

router = APIRouter(prefix="/api/discovery", tags=["Discovery"])


@router.post("")
def start_discovery(payload: DiscoveryRequest | None = None, assetId: str | None = None, user: dict = Depends(current_user)):
    asset_id = payload.assetId if payload else assetId
    if not asset_id:
        raise HTTPException(status_code=422, detail="assetId is required")
    asset = next((item for item in store.assets if item["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not asset["authorized"]:
        raise HTTPException(status_code=403, detail="Only explicitly authorized assets can be discovered")
    result = discover(asset)
    store.discovery[result["id"]] = result
    store.log("discovery_started", user["id"], {"assetId": asset_id})
    return result


@router.get("/{discovery_id}")
def get_discovery(discovery_id: str, user: dict = Depends(current_user)):
    result = store.discovery.get(discovery_id)
    if not result:
        raise HTTPException(status_code=404, detail="Discovery job not found")
    return result
