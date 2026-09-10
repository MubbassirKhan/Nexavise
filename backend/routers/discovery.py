from fastapi import APIRouter, Depends, HTTPException
from database import store
from deps import current_user, require_project
from schemas import DiscoveryRequest
from services.asset_repository import get_asset
from services.discovery_service import discover
from services.security_scanner import ScanTargetError

router = APIRouter(prefix="/api/discovery", tags=["Discovery"])


@router.post("")
def start_discovery(payload: DiscoveryRequest | None = None, assetId: str | None = None, user: dict = Depends(current_user)):
    asset_id = payload.assetId if payload else assetId
    if not asset_id:
        raise HTTPException(status_code=422, detail="assetId is required")
    try:
        asset = get_asset(asset_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to access asset data in Supabase") from exc
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    require_project(asset["projectId"], user)
    if not asset["authorized"]:
        raise HTTPException(status_code=403, detail="Asset is not authorized for discovery.")
    try:
        result = discover(asset)
    except ScanTargetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    store.discovery[result["id"]] = result
    asset.update({"lastSeen": result.get("discoveredAt"), "technologies": result.get("technologies", asset.get("technologies", []))})
    store.persist()
    store.log("discovery_started", user["id"], {"assetId": asset_id})
    return result


@router.get("/{discovery_id}")
def get_discovery(discovery_id: str, user: dict = Depends(current_user)):
    result = store.discovery.get(discovery_id)
    if not result:
        raise HTTPException(status_code=404, detail="Discovery job not found")
    return result
