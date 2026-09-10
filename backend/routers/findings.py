from fastapi import APIRouter, Depends, HTTPException
from database import now, store
from deps import accessible_project_ids, current_user, require_admin, require_analyst_or_admin, require_project
from schemas import AssignRequest, FindingPatch
from services.finding_repository import get_finding as get_supabase_finding, list_findings as list_supabase_findings

router = APIRouter(prefix="/api/findings", tags=["Findings"])


@router.get("/assignees")
def assignees(user: dict = Depends(require_analyst_or_admin)):
    if store.supabase is not None:
        response = store.supabase.table("users").select("id,name,email,organization_id,roles(name)").eq("organization_id", user.get("organizationId")).execute()
        return [{"id": row["id"], "name": row.get("name", ""), "email": row.get("email", ""), "role": (row.get("roles") or {}).get("name")} for row in (response.data or [])]
    raise HTTPException(status_code=503, detail="Supabase is not configured")


@router.get("")
def list_findings(projectId: str | None = None, severity: str | None = None, status: str | None = None, user: dict = Depends(current_user)):
    if projectId:
        require_project(projectId, user)
    try:
        assigned_to = user["id"] if user.get("role") == "analyst" else None
        if projectId:
            return list_supabase_findings(projectId, severity, status, assigned_to=assigned_to)
        return [finding for project_id in accessible_project_ids(user)
            for finding in list_supabase_findings(project_id, severity, status, assigned_to=assigned_to)]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load findings from Supabase") from exc


@router.get("/{finding_id}")
def get_finding(finding_id: str, user: dict = Depends(current_user)):
    try:
        finding = get_supabase_finding(finding_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load finding from Supabase") from exc
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    require_project(finding["projectId"], user)
    return finding


@router.patch("/{finding_id}")
def patch_finding(finding_id: str, payload: FindingPatch, user: dict = Depends(current_user)):
    try:
        finding = get_supabase_finding(finding_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load finding from Supabase") from exc
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    require_project(finding["projectId"], user)
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] != finding["status"]:
        store.log("finding_status_changed", user["id"], {"findingId": finding_id, "status": changes["status"]})
    payload_db = {"status": changes["status"], "updated_at": now()} if "status" in changes else {"updated_at": now()}
    if "remediation" in changes:
        payload_db["remediation"] = changes["remediation"]
    try:
        response = store.supabase.table("findings").update(payload_db).eq("id", finding_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to update finding in Supabase") from exc
    return response.data[0] if response.data else finding


@router.post("/{finding_id}/assign")
def assign_finding(finding_id: str, payload: AssignRequest, user: dict = Depends(require_admin)):
    try:
        finding = get_supabase_finding(finding_id)
        if store.supabase is not None:
            assignee_response = store.supabase.table("users").select("id,name,organization_id").eq("id", payload.userId).limit(1).execute()
            assignee = assignee_response.data[0] if assignee_response.data else None
            if assignee:
                assignee["organizationId"] = assignee.get("organization_id")
        else:
            raise RuntimeError("Supabase is not configured")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load finding from Supabase") from exc
    if not finding or not assignee:
        raise HTTPException(status_code=404, detail="Finding or assignee not found")
    require_project(finding["projectId"], user)
    if assignee.get("organizationId") != user.get("organizationId"):
        raise HTTPException(status_code=403, detail="Assignee is outside the user's organization")
    try:
        response = store.supabase.table("findings").update({"assigned_to": assignee["id"], "updated_at": now()}).eq("id", finding_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to assign finding in Supabase") from exc
    store.log("finding_assigned", user["id"], {"findingId": finding_id, "assigneeId": assignee["id"]})
    return get_supabase_finding(finding_id) or finding
