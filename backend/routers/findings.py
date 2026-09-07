from fastapi import APIRouter, Depends, HTTPException
from database import now, store
from deps import current_user
from schemas import AssignRequest, FindingPatch

router = APIRouter(prefix="/api/findings", tags=["Findings"])


@router.get("")
def list_findings(projectId: str | None = None, severity: str | None = None, status: str | None = None, user: dict = Depends(current_user)):
    return [f for f in store.findings if (not projectId or f["projectId"] == projectId) and (not severity or f["severity"] == severity) and (not status or f["status"] == status)]


@router.get("/{finding_id}")
def get_finding(finding_id: str, user: dict = Depends(current_user)):
    finding = next((item for item in store.findings if item["id"] == finding_id), None)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


@router.patch("/{finding_id}")
def patch_finding(finding_id: str, payload: FindingPatch, user: dict = Depends(current_user)):
    finding = next((item for item in store.findings if item["id"] == finding_id), None)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] != finding["status"]:
        finding["statusHistory"].append({"status": changes["status"], "changedBy": user["name"], "changedAt": now()})
        store.log("finding_status_changed", user["id"], {"findingId": finding_id, "status": changes["status"]})
    finding.update(changes)
    finding["updatedAt"] = now()
    return finding


@router.post("/{finding_id}/assign")
def assign_finding(finding_id: str, payload: AssignRequest, user: dict = Depends(current_user)):
    finding = next((item for item in store.findings if item["id"] == finding_id), None)
    assignee = next((item for item in store.users if item["id"] == payload.userId), None)
    if not finding or not assignee:
        raise HTTPException(status_code=404, detail="Finding or assignee not found")
    finding["assignedTo"] = assignee["id"]
    finding["updatedAt"] = now()
    store.log("finding_assigned", user["id"], {"findingId": finding_id, "assigneeId": assignee["id"]})
    return finding
