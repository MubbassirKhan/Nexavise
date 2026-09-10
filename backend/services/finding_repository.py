from database import new_id, now, store
from services.asset_repository import list_assets


def _map_finding(row: dict) -> dict:
    finding = dict(row)
    mappings = {
        "project_id": "projectId",
        "asset_id": "assetId",
        "scan_id": "scanId",
        "risk_score": "riskScore",
        "risk_breakdown": "riskBreakdown",
        "technical_details": "technicalDetails",
        "why_risky": "whyRisky",
        "affected_service": "affectedService",
        "affected_port": "affectedPort",
        "assigned_to": "assignedTo",
        "discovered_at": "discoveredAt",
        "updated_at": "updatedAt",
    }
    for source, target in mappings.items():
        if source in finding:
            finding[target] = finding.pop(source)
    finding.setdefault("statusHistory", [])
    finding.setdefault("tags", [])
    return finding


def _with_asset_names(findings: list[dict], project_id: str | None = None) -> list[dict]:
    assets_by_id = {asset["id"]: asset for asset in list_assets(project_id)}
    for finding in findings:
        asset = assets_by_id.get(finding.get("assetId"))
        if asset:
            finding["assetHostname"] = asset.get("hostname") or asset.get("url") or finding.get("assetId", "")
    return findings


def list_findings(project_id: str | None = None, severity: str | None = None, status: str | None = None, asset_id: str | None = None, assigned_to: str | None = None) -> list[dict]:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    query = store.supabase.table("findings").select("*")
    if project_id:
        query = query.eq("project_id", project_id)
    if severity:
        query = query.eq("severity", severity)
    if status:
        query = query.eq("status", status)
    if asset_id:
        query = query.eq("asset_id", asset_id)
    if assigned_to:
        query = query.eq("assigned_to", assigned_to)
    return _with_asset_names([_map_finding(row) for row in (query.execute().data or [])], project_id)


def get_finding(finding_id: str) -> dict | None:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    response = store.supabase.table("findings").select("*").eq("id", finding_id).limit(1).execute()
    if not response.data:
        return None
    finding = _map_finding(response.data[0])
    assets = list_assets(finding.get("projectId"))
    asset = next((item for item in assets if item["id"] == finding.get("assetId")), None)
    if asset:
        finding["assetHostname"] = asset.get("hostname") or asset.get("url") or finding.get("assetId", "")
    return finding


def persist_finding(finding: dict) -> dict:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    existing_response = store.supabase.table("findings").select("id,status,discovered_at").eq("asset_id", finding["assetId"]).eq("title", finding["title"]).limit(1).execute()
    existing = existing_response.data[0] if existing_response.data else None
    if existing:
        finding["id"] = existing["id"]
        finding["status"] = existing.get("status", finding.get("status", "open"))
        finding["discoveredAt"] = existing.get("discovered_at") or finding.get("discoveredAt")
    vulnerability = store.supabase.table("vulnerabilities").select("id").eq("title", finding["title"]).limit(1).execute()
    vulnerability_id = vulnerability.data[0]["id"] if vulnerability.data else new_id("vuln")
    if not vulnerability.data:
        store.supabase.table("vulnerabilities").insert({
            "id": vulnerability_id,
            "title": finding["title"],
            "description": finding["description"],
            "severity": finding["severity"],
            "remediation": finding["remediation"],
        }).execute()
    payload = {
        "id": finding["id"],
        "project_id": finding["projectId"],
        "asset_id": finding["assetId"],
        "scan_id": finding.get("scanId"),
        "vulnerability_id": vulnerability_id,
        "title": finding["title"],
        "description": finding["description"],
        "severity": finding["severity"],
        "status": finding.get("status", "open"),
        "risk_score": finding["riskScore"],
        "risk_breakdown": finding["riskBreakdown"],
        # Existing schema permits nmap/nuclei; HTTP scanner is represented by its API evidence.
        "scanner": "nuclei",
        "evidence": finding["evidence"],
        "technical_details": finding["technicalDetails"],
        "why_risky": finding["whyRisky"],
        "remediation": finding["remediation"],
        "affected_service": finding.get("affectedService"),
        "affected_port": finding.get("affectedPort"),
        "discovered_at": finding.get("discoveredAt", now()),
        "updated_at": finding.get("updatedAt", now()),
    }
    result = store.supabase.table("findings").upsert(payload, on_conflict="id").execute()
    if not result.data:
        raise RuntimeError("Supabase did not return the persisted finding")
    persisted = _map_finding(result.data[0])
    persisted["scanner"] = finding.get("scanner", "Nexavise HTTP Scanner")
    return persisted


def persist_risk_score(finding: dict) -> None:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    store.supabase.table("risk_scores").insert({
        "id": new_id("risk"),
        "project_id": finding["projectId"],
        "asset_id": finding["assetId"],
        "finding_id": finding["id"],
        "score": finding["riskScore"],
        "explanation": "Deterministic score from severity, exposure, and asset criticality.",
        "breakdown": finding["riskBreakdown"],
    }).execute()


def persist_scan_result(scan: dict, asset: dict, observation: dict, finding_count: int) -> None:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    store.supabase.table("scan_results").insert({
        "id": new_id("result"),
        "scan_id": scan["id"],
        "asset_id": asset["id"],
        "result_type": "http_observation",
        "data": {"url": observation.url, "statusCode": observation.status_code, "title": observation.title, "links": observation.links, "findingCount": finding_count},
    }).execute()
