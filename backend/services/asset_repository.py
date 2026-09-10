from database import store


def map_asset_row(row: dict) -> dict:
    asset = dict(row)
    asset["projectId"] = asset.pop("project_id", asset.get("projectId"))
    asset["lastSeen"] = asset.pop("last_seen", asset.get("lastSeen"))
    asset["createdAt"] = asset.pop("created_at", asset.get("createdAt"))
    asset.setdefault("technologies", [])
    asset.setdefault("ports", [])
    return asset


def get_asset(asset_id: str) -> dict | None:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    response = store.supabase.table("assets").select("*").eq("id", asset_id).limit(1).execute()
    return map_asset_row(response.data[0]) if response.data else None


def list_assets(project_id: str | None = None) -> list[dict]:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    query = store.supabase.table("assets").select("*")
    if project_id:
        query = query.eq("project_id", project_id)
    return [map_asset_row(row) for row in (query.execute().data or [])]
