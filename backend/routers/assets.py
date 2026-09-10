from fastapi import APIRouter, Depends, HTTPException
from database import new_id, now, store
from deps import accessible_project_ids, current_user, require_project
from schemas import AssetCreate, AssetPatch
from services.asset_repository import map_asset_row
from services.finding_repository import list_findings as list_supabase_findings

router = APIRouter(prefix="/api/assets", tags=["Assets"])


def _require_supabase():
    if store.supabase is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured")
    return store.supabase


def _to_database(values: dict) -> dict:
    mapping = {
        "projectId": "project_id",
        "lastSeen": "last_seen",
        "createdAt": "created_at",
    }
    columns = {"id", "project_id", "domain", "ip", "url", "hostname", "type", "status", "exposure", "criticality", "authorized", "last_seen", "tags"}
    return {mapping.get(key, key): value for key, value in values.items() if mapping.get(key, key) in columns}


def _execute(operation):
    try:
        return operation()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Unable to access asset data in Supabase") from exc


def _ensure_project_row(client, project: dict) -> None:
    existing = _execute(client.table("projects").select("id").eq("id", project["id"]).limit(1).execute)
    if existing.data:
        return
    _execute(client.table("projects").insert({
        "id": project["id"],
        "organization_id": project.get("organizationId"),
        "name": project["name"],
        "description": project.get("description", ""),
        "created_at": project.get("createdAt") or now(),
    }).execute)


def enrich(asset: dict) -> dict:
    result = dict(asset)
    result["technologies"] = asset.get("technologies", [])
    try:
        findings = [f for f in list_supabase_findings(asset_id=asset["id"]) if f["status"] != "resolved"]
    except TypeError:
        findings = [f for f in store.findings if f["assetId"] == asset["id"] and f["status"] != "resolved"]
    result["findingCount"] = len(findings)
    for severity in ("critical", "high", "medium", "low"):
        result[f"{severity}Count"] = sum(f["severity"] == severity for f in findings)
    scores = [f["riskScore"] for f in findings]
    result["riskScore"] = max(scores, default=0)
    return result


@router.get("")
def list_assets(projectId: str | None = None, user: dict = Depends(current_user)):
    if projectId:
        require_project(projectId, user)
    client = _require_supabase()
    query = client.table("assets").select("*")
    if projectId:
        query = query.eq("project_id", projectId)
    else:
        query = query.in_("project_id", accessible_project_ids(user))
    response = _execute(query.execute)
    return [enrich(map_asset_row(asset)) for asset in (response.data or [])]


@router.post("", status_code=201)
def create_asset(payload: AssetCreate, user: dict = Depends(current_user)):
    project = require_project(payload.projectId, user)
    client = _require_supabase()
    _ensure_project_row(client, project)
    asset = {"id": new_id("asset"), **payload.model_dump(), "lastSeen": None, "createdAt": now()}
    response = _execute(client.table("assets").insert(_to_database(asset)).execute)
    rows = response.data or []
    if not rows:
        raise HTTPException(status_code=503, detail="Supabase did not return the created asset")
    asset = map_asset_row(rows[0])
    store.log("asset_added", user["id"], {"assetId": asset["id"]})
    if asset["authorized"]:
        store.log("asset_authorized", user["id"], {"assetId": asset["id"]})
    return enrich(asset)


@router.get("/{asset_id}")
def get_asset(asset_id: str, user: dict = Depends(current_user)):
    client = _require_supabase()
    response = _execute(client.table("assets").select("*").eq("id", asset_id).limit(1).execute)
    if not response.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = map_asset_row(response.data[0])
    require_project(asset["projectId"], user)
    return enrich(asset)


@router.patch("/{asset_id}")
def patch_asset(asset_id: str, payload: AssetPatch, user: dict = Depends(current_user)):
    client = _require_supabase()
    existing_response = _execute(client.table("assets").select("*").eq("id", asset_id).limit(1).execute)
    if not existing_response.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    asset = map_asset_row(existing_response.data[0])
    require_project(asset["projectId"], user)
    before = asset.get("authorized")
    changes = {key: value for key, value in payload.model_dump(exclude_unset=True).items() if value is not None}
    if changes:
        updated_response = _execute(client.table("assets").update(_to_database(changes)).eq("id", asset_id).execute)
        if not updated_response.data:
            raise HTTPException(status_code=503, detail="Supabase did not return the updated asset")
        asset = map_asset_row(updated_response.data[0])
    if asset.get("authorized") and not before:
        store.log("asset_authorized", user["id"], {"assetId": asset_id})
    return enrich(asset)


@router.delete("/{asset_id}")
def delete_asset(asset_id: str, user: dict = Depends(current_user)):
    client = _require_supabase()
    existing_response = _execute(client.table("assets").select("project_id").eq("id", asset_id).limit(1).execute)
    if not existing_response.data:
        raise HTTPException(status_code=404, detail="Asset not found")
    require_project(existing_response.data[0]["project_id"], user)
    _execute(client.table("assets").delete().eq("id", asset_id).execute)
    return {"deleted": True, "id": asset_id}
