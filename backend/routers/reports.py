from fastapi import APIRouter, Depends, HTTPException
from database import new_id, now, store
from deps import current_user
from schemas import ReportCreate
from services.risk_engine import risk_overview

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("", status_code=201)
def create_report(payload: ReportCreate, user: dict = Depends(current_user)):
    project = next((p for p in store.projects if p["id"] == payload.projectId), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    assets = [a for a in store.assets if a["projectId"] == payload.projectId]
    findings = [f for f in store.findings if f["projectId"] == payload.projectId]
    report = {"id": new_id("report"), "projectId": payload.projectId, "reportType": payload.reportType, "generatedAt": now(), "project": project, "risk": risk_overview(assets, findings), "executive": {"headline": "Security posture summary", "priority": "Remediate the highest-risk unresolved findings first."}, "technical": {"findings": findings, "assets": assets}, "attackPaths": [p for p in store.attack_paths if p["projectId"] == payload.projectId]}
    store.reports.append(report)
    store.log("report_generated", user["id"], {"reportId": report["id"]})
    return report


@router.get("/{report_id}")
def get_report(report_id: str, user: dict = Depends(current_user)):
    report = next((item for item in store.reports if item["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
