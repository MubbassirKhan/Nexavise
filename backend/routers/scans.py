from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from database import new_id, now, store
from deps import current_user
from schemas import ScanCreate
from services.scanner_service import complete_scan

router = APIRouter(prefix="/api/scans", tags=["Scans"])


@router.post("", status_code=202)
def create_scan(payload: ScanCreate, background_tasks: BackgroundTasks, user: dict = Depends(current_user)):
    asset = next((item for item in store.assets if item["id"] == payload.assetId and item["projectId"] == payload.projectId), None)
    if not asset:
        raise HTTPException(status_code=404, detail="Authorized project asset not found")
    if not asset["authorized"]:
        raise HTTPException(status_code=403, detail="Scan blocked: asset is not explicitly authorized")
    scan = {"id": new_id("scan"), "projectId": payload.projectId, "assetId": payload.assetId, "assetHostname": asset["hostname"], "scanner": payload.scanner, "status": "pending", "progress": 0, "options": payload.options, "startedAt": now(), "authorized": True, "createdBy": user["name"]}
    store.scans.append(scan)
    store.log("scan_started", user["id"], {"scanId": scan["id"], "scanner": payload.scanner})
    background_tasks.add_task(complete_scan, scan["id"])
    return scan


@router.get("")
def list_scans(projectId: str | None = None, user: dict = Depends(current_user)):
    return [scan for scan in store.scans if not projectId or scan["projectId"] == projectId]


@router.get("/{scan_id}")
def get_scan(scan_id: str, user: dict = Depends(current_user)):
    scan = next((item for item in store.scans if item["id"] == scan_id), None)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.post("/{scan_id}/cancel")
def cancel_scan(scan_id: str, user: dict = Depends(current_user)):
    scan = next((item for item in store.scans if item["id"] == scan_id), None)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan["status"] in ("completed", "cancelled"):
        raise HTTPException(status_code=409, detail="Scan cannot be cancelled in its current state")
    scan.update({"status": "cancelled", "completedAt": now()})
    store.log("scan_cancelled", user["id"], {"scanId": scan_id})
    return scan
