from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from database import new_id, now, store
from deps import accessible_project_ids, current_user, require_project
from schemas import ScanCreate
from services.asset_repository import get_asset
from services.scan_repository import get_scan as get_supabase_scan, insert_scan, list_scans as list_supabase_scans
from services.security_scanner import ScanTargetError, TargetHostMismatchError, validate_target
from services.scanner_service import complete_scan

router = APIRouter(prefix="/api/scans", tags=["Scans"])


@router.post("", status_code=202)
def create_scan(payload: ScanCreate, background_tasks: BackgroundTasks, user: dict = Depends(current_user)):
    require_project(payload.projectId, user)
    try:
        asset = get_asset(payload.assetId)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to access asset data in Supabase") from exc
    if asset and asset.get("projectId") != payload.projectId:
        asset = None
    if not asset:
        raise HTTPException(status_code=404, detail="Project asset not found")
    if not asset["authorized"]:
        raise HTTPException(status_code=403, detail="Asset is not authorized for scanning.")
    try:
        target_url = payload.targetUrl or payload.options.get("targetUrl")
        validate_target(asset, target_url)
    except TargetHostMismatchError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ScanTargetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    scan = {"id": new_id("scan"), "projectId": payload.projectId, "assetId": payload.assetId, "assetHostname": asset["hostname"], "targetUrl": target_url or asset.get("url"), "scanner": "Nexavise HTTP Scanner", "status": "queued", "progress": 0, "options": payload.options, "startedAt": now(), "authorized": True, "createdBy": user["name"], "createdById": user["id"]}
    try:
        insert_scan(scan, payload.scanner)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to create scan in Supabase") from exc
    store.scans.append(scan)
    store.persist()
    store.log("scan_started", user["id"], {"scanId": scan["id"], "scanner": payload.scanner})
    background_tasks.add_task(complete_scan, scan["id"])
    return scan


@router.get("")
def list_scans(projectId: str | None = None, user: dict = Depends(current_user)):
    if projectId:
        require_project(projectId, user)
    try:
        if projectId:
            return list_supabase_scans(projectId)
        return [scan for project_id in accessible_project_ids(user) for scan in list_supabase_scans(project_id)]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load scans from Supabase") from exc


@router.get("/{scan_id}")
def get_scan(scan_id: str, user: dict = Depends(current_user)):
    try:
        scan = get_supabase_scan(scan_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load scan from Supabase") from exc
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    require_project(scan["projectId"], user)
    return scan


@router.post("/{scan_id}/cancel")
def cancel_scan(scan_id: str, user: dict = Depends(current_user)):
    try:
        scan = get_supabase_scan(scan_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load scan from Supabase") from exc
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    require_project(scan["projectId"], user)
    if scan["status"] in ("completed", "cancelled", "failed"):
        raise HTTPException(status_code=409, detail="Scan cannot be cancelled in its current state")
    response = store.supabase.table("scans").update({"status": "cancelled", "completed_at": now()}).eq("id", scan_id).execute()
    scan = {**scan, "status": "cancelled", "completedAt": now()}
    store.log("scan_cancelled", user["id"], {"scanId": scan_id})
    return scan
