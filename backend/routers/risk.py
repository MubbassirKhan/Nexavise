from fastapi import APIRouter, Depends, HTTPException
from database import store
from deps import current_user, require_project
from services.risk_engine import risk_overview
from services.asset_repository import list_assets as list_supabase_assets
from services.finding_repository import list_findings as list_supabase_findings

router = APIRouter(prefix="/api/risk", tags=["Risk"])


@router.get("/overview")
def overview(projectId: str | None = None, user: dict = Depends(current_user)):
    if projectId:
        require_project(projectId, user)
    try:
        assets = list_supabase_assets(projectId)
        findings = list_supabase_findings(projectId)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load risk data from Supabase") from exc
    return risk_overview(assets, findings)


@router.get("/top")
def top(projectId: str | None = None, limit: int = 5, user: dict = Depends(current_user)):
    if projectId:
        require_project(projectId, user)
    try:
        findings = [f for f in list_supabase_findings(projectId) if f["status"] != "resolved"]
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load risk data from Supabase") from exc
    return sorted(findings, key=lambda item: item["riskScore"], reverse=True)[:max(1, min(limit, 50))]


@router.get("/trend")
def trend(projectId: str, user: dict = Depends(current_user)):
    require_project(projectId, user)
    if store.supabase is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured")
    try:
        response = (store.supabase.table("risk_scores")
                    .select("score,calculated_at")
                    .eq("project_id", projectId)
                    .order("calculated_at")
                    .execute())
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to load risk history from Supabase") from exc
    daily: dict[str, list[int]] = {}
    for row in response.data or []:
        timestamp = row.get("calculated_at")
        if timestamp and row.get("score") is not None:
            day = timestamp[:10]
            daily.setdefault(day, []).append(row["score"])
    return [{"date": day, "score": round(sum(scores) / len(scores))} for day, scores in daily.items()]
