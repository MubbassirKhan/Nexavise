from database import store
from services.asset_repository import list_assets


def _map_scan(row: dict) -> dict:
    scan = dict(row)
    mappings = {
        "project_id": "projectId",
        "asset_id": "assetId",
        "started_at": "startedAt",
        "completed_at": "completedAt",
        "findings_count": "findingsCount",
        "new_findings": "newFindings",
        "created_by": "createdById",
    }
    for source, target in mappings.items():
        if source in scan:
            scan[target] = scan.pop(source)
    scan.setdefault("assetHostname", scan.get("assetId", ""))
    scan["scanner"] = "Nexavise HTTP Scanner"
    scan.setdefault("options", {})
    scan.setdefault("progress", 100 if scan.get("status") == "completed" else 0)
    scan.setdefault("authorized", True)
    return scan


def list_scans(project_id: str | None = None) -> list[dict]:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    query = store.supabase.table("scans").select("*")
    if project_id:
        query = query.eq("project_id", project_id)
    scans = [_map_scan(row) for row in (query.execute().data or [])]
    assets_by_id = {asset["id"]: asset for asset in list_assets(project_id)}
    for scan in scans:
        asset = assets_by_id.get(scan.get("assetId"))
        if asset:
            scan["assetHostname"] = asset.get("hostname") or asset.get("url") or scan.get("assetId", "")
            scan["targetUrl"] = asset.get("url") or asset.get("hostname")
    return scans


def get_scan(scan_id: str) -> dict | None:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    response = store.supabase.table("scans").select("*").eq("id", scan_id).limit(1).execute()
    if not response.data:
        return None
    scans = _map_scan(response.data[0])
    assets = {asset["id"]: asset for asset in list_assets(response.data[0]["project_id"])}
    asset = assets.get(scans.get("assetId"))
    if asset:
        scans["assetHostname"] = asset.get("hostname") or asset.get("url") or scans.get("assetId", "")
        scans["targetUrl"] = asset.get("url") or asset.get("hostname")
    return scans


def insert_scan(scan: dict, scanner_name: str) -> dict:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    payload = {
        "id": scan["id"],
        "project_id": scan["projectId"],
        "asset_id": scan["assetId"],
        "scanner": scanner_name,
        "status": "pending",
        "progress": 0,
        "options": scan.get("options", {}),
        "authorized": True,
        "started_at": scan["startedAt"],
        "created_by": None,
    }
    response = store.supabase.table("scans").insert(payload).execute()
    return _map_scan(response.data[0]) if response.data else scan


def update_scan(scan_id: str, values: dict) -> None:
    if store.supabase is None:
        return
    mapping = {
        "completedAt": "completed_at",
        "findingsCount": "findings_count",
        "newFindings": "new_findings",
    }
    payload = {mapping.get(key, key): value for key, value in values.items() if key not in {"targetUrl", "result", "error"}}
    store.supabase.table("scans").update(payload).eq("id", scan_id).execute()
