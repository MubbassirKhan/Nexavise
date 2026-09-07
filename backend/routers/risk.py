from fastapi import APIRouter, Depends
from database import store
from deps import current_user
from services.risk_engine import risk_overview

router = APIRouter(prefix="/api/risk", tags=["Risk"])


@router.get("/overview")
def overview(projectId: str | None = None, user: dict = Depends(current_user)):
    assets = [a for a in store.assets if not projectId or a["projectId"] == projectId]
    findings = [f for f in store.findings if not projectId or f["projectId"] == projectId]
    return risk_overview(assets, findings)


@router.get("/top")
def top(projectId: str | None = None, limit: int = 5, user: dict = Depends(current_user)):
    findings = [f for f in store.findings if (not projectId or f["projectId"] == projectId) and f["status"] != "resolved"]
    return sorted(findings, key=lambda item: item["riskScore"], reverse=True)[:max(1, min(limit, 50))]
