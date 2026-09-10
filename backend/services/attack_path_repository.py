from database import store


def _map_path(row: dict) -> dict:
    path = dict(row)
    mappings = {
        "project_id": "projectId",
        "risk_score": "riskScore",
        "entry_point": "entryPoint",
        "why_risky": "whyRisky",
        "discovered_at": "discoveredAt",
    }
    for source, target in mappings.items():
        if source in path:
            path[target] = path.pop(source)
    path.setdefault("nodes", [])
    path.setdefault("edges", [])
    path.setdefault("mitigations", [])
    return path


def list_attack_paths(project_id: str | None = None) -> list[dict]:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    query = store.supabase.table("attack_paths").select("*").order("risk_score", desc=True)
    if project_id:
        query = query.eq("project_id", project_id)
    paths = [_map_path(row) for row in (query.execute().data or [])]
    if not paths:
        return paths

    path_ids = [path["id"] for path in paths]
    nodes = store.supabase.table("attack_path_nodes").select("*").in_("attack_path_id", path_ids).execute().data or []
    edges = store.supabase.table("attack_path_edges").select("*").in_("attack_path_id", path_ids).execute().data or []
    nodes_by_path: dict[str, list[dict]] = {}
    for node in nodes:
        nodes_by_path.setdefault(node["attack_path_id"], []).append(node)
    edges_by_path: dict[str, list[dict]] = {}
    for edge in edges:
        edges_by_path.setdefault(edge["attack_path_id"], []).append(edge)

    finding_ids = [node["id"][len("finding-"):].split("--", 1)[0] for node in nodes if node["node_type"] == "vulnerability" and node["id"].startswith("finding-")]
    asset_ids = [node["id"][len("asset-"):].split("--", 1)[0] for node in nodes if node["node_type"] == "asset" and node["id"].startswith("asset-")]
    findings_by_id = {}
    assets_by_id = {}
    if finding_ids:
        findings = store.supabase.table("findings").select("id,title,severity,risk_score,remediation,assigned_to").in_("id", finding_ids).execute().data or []
        findings_by_id = {row["id"]: row for row in findings}
    if asset_ids:
        assets = store.supabase.table("assets").select("id,hostname,exposure,authorized").in_("id", asset_ids).execute().data or []
        assets_by_id = {row["id"]: row for row in assets}

    for path in paths:
        path_nodes = nodes_by_path.get(path["id"], [])
        path_edges = edges_by_path.get(path["id"], [])
        path["nodes"] = [{"id": node["id"], "type": node["node_type"], "label": node["label"], "riskScore": node.get("risk_score"), "severity": node.get("severity"), "x": node["x"], "y": node["y"]} for node in path_nodes]
        path["edges"] = [{"id": edge["id"], "source": edge["source_node_id"], "target": edge["target_node_id"], "label": edge.get("label")} for edge in path_edges]
        finding_node = next((node for node in path_nodes if node["node_type"] == "vulnerability" and node["id"].startswith("finding-")), None)
        asset_node = next((node for node in path_nodes if node["node_type"] == "asset" and node["id"].startswith("asset-")), None)
        if finding_node:
            path["findingId"] = finding_node["id"][len("finding-"):].split("--", 1)[0]
        if asset_node:
            path["assetId"] = asset_node["id"][len("asset-"):].split("--", 1)[0]
        finding = findings_by_id.get(path.get("findingId"))
        if finding:
            path["finding"] = {"id": finding["id"], "title": finding["title"], "severity": finding["severity"], "riskScore": finding["risk_score"], "remediation": finding.get("remediation", ""), "assignedTo": finding.get("assigned_to")}
        asset = assets_by_id.get(path.get("assetId"))
        if asset:
            path["asset"] = asset
    return paths


def get_attack_path(path_id: str) -> dict | None:
    paths = list_attack_paths()
    return next((path for path in paths if path["id"] == path_id), None)
