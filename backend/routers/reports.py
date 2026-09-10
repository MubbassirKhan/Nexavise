from fastapi import APIRouter, Depends, HTTPException
from database import new_id, now, store
from deps import current_user, require_project
from schemas import ReportCreate
from services.risk_engine import risk_overview
from services.asset_repository import list_assets as list_supabase_assets
from services.finding_repository import list_findings as list_supabase_findings
from services.attack_path_repository import list_attack_paths

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("", status_code=201)
def create_report(payload: ReportCreate, user: dict = Depends(current_user)):
    project = require_project(payload.projectId, user)
    try:
        assets = list_supabase_assets(payload.projectId)
        findings = list_supabase_findings(payload.projectId)
        attack_paths = list_attack_paths(payload.projectId)
        if user.get("role") == "analyst":
            findings = [finding for finding in findings if finding.get("assignedTo") == user["id"]]
            visible_finding_ids = {finding["id"] for finding in findings}
            attack_paths = [path for path in attack_paths if path.get("findingId") in visible_finding_ids]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load report data from Supabase") from exc
    report = {"id": new_id("report"), "projectId": payload.projectId, "reportType": payload.reportType, "generatedAt": now(), "project": project, "risk": risk_overview(assets, findings), "executive": {"headline": "Security posture summary", "priority": "Remediate the highest-risk unresolved findings first."}, "technical": {"findings": findings, "assets": assets}, "attackPaths": attack_paths}
    response = store.supabase.table("reports").insert({"id": report["id"], "project_id": report["projectId"], "report_type": report["reportType"], "content": report, "generated_by": user["id"], "generated_at": report["generatedAt"]}).execute()
    if not response.data:
        raise HTTPException(status_code=503, detail="Supabase did not return the generated report")
    store.log("report_generated", user["id"], {"reportId": report["id"]})
    return report


@router.get("/{report_id}")
def get_report(report_id: str, user: dict = Depends(current_user)):
    if store.supabase is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured")
    response = store.supabase.table("reports").select("*").eq("id", report_id).limit(1).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Report not found")
    row = response.data[0]
    require_project(row["project_id"], user)
    return row.get("content") or {"id": row["id"], "projectId": row["project_id"], "reportType": row["report_type"]}
