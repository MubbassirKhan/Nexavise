import hashlib
import logging

from database import now, store
from services.asset_repository import list_assets
from services.finding_repository import list_findings

logger = logging.getLogger(__name__)

PATH_SEVERITIES = {"critical", "high", "medium", "low"}


def _stable_id(prefix: str, *values: str) -> str:
    digest = hashlib.sha256(":".join(values).encode("utf-8")).hexdigest()[:20]
    return f"{prefix}-{digest}"


def _service_label(asset: dict, finding: dict, services: list[dict]) -> str | None:
    if finding.get("affectedService"):
        return finding["affectedService"]
    open_services = [item for item in services if item.get("state", "open") == "open"]
    if open_services:
        service = open_services[0]
        return f"{service['service']}:{service['port']}" if service.get("port") else service["service"]
    technologies = asset.get("technologies") or asset.get("tags") or []
    if technologies:
        value = technologies[0] if isinstance(technologies[0], str) else technologies[0].get("name")
        if value:
            return value
    if asset.get("url") or asset.get("type") in {"web", "webapp", "application"}:
        return "Web application"
    return None


def build_path(asset: dict, finding: dict, services: list[dict] | None = None) -> dict:
    """Build a deterministic analytical path from persisted asset/finding data."""
    path_id = _stable_id("path", asset["projectId"], asset["id"], finding["id"])
    internet = f"internet-{asset['projectId']}--{path_id}"
    asset_node = f"asset-{asset['id']}--{path_id}"
    finding_node = f"finding-{finding['id']}--{path_id}"
    impact_node = f"impact-{finding['id']}--{path_id}"
    risk_score = int(finding.get("riskScore", 0))
    severity = finding.get("severity", "info").lower()
    service_label = _service_label(asset, finding, services or [])
    
    # Determine impact description based on severity
    severity_impact_map = {
        "critical": "Potential system/application compromise",
        "high": "Potential significant application exposure",
        "medium": "Potential data leakage or service disruption",
        "low": "Potential minor security exposure",
        "info": "Informational exposure",
    }
    impact_label = severity_impact_map.get(severity, "Potential exposure")
    
    nodes = [
        {"id": internet, "type": "internet", "label": "Internet", "x": 20, "y": 120},
        {"id": asset_node, "type": "asset", "label": asset["hostname"], "riskScore": risk_score, "x": 190, "y": 120},
    ]
    edges = [{"id": _stable_id("edge", path_id, internet, asset_node), "source": internet, "target": asset_node, "label": "exposes"}]
    previous = asset_node
    if service_label:
        service_node = _stable_id("service", asset["id"], service_label, path_id)
        nodes.append({"id": service_node, "type": "service", "label": service_label, "riskScore": risk_score, "x": 360, "y": 120})
        edges.append({"id": _stable_id("edge", path_id, previous, service_node), "source": previous, "target": service_node, "label": "hosts"})
        previous = service_node
    nodes.extend([
        {"id": finding_node, "type": "vulnerability", "label": finding["title"], "severity": severity, "riskScore": risk_score, "x": 530, "y": 120},
        {"id": impact_node, "type": "target", "label": impact_label, "riskScore": risk_score, "x": 700, "y": 120},
    ])
    edges.extend([
        {"id": _stable_id("edge", path_id, previous, finding_node), "source": previous, "target": finding_node, "label": "has finding"},
        {"id": _stable_id("edge", path_id, finding_node, impact_node), "source": finding_node, "target": impact_node, "label": "may increase exposure"},
    ])
    return {
        "id": path_id,
        "projectId": asset["projectId"],
        "findingId": finding["id"],
        "assetId": asset["id"],
        "name": f"Internet to {asset['hostname']} via {finding['title']}",
        "description": "Potential attack path identified from an authorized internet-facing asset and a detected security weakness.",
        "riskScore": risk_score,
        "severity": severity,
        "entryPoint": "Internet",
        "target": impact_label,
        "hops": len(edges),
        "nodes": nodes,
        "edges": edges,
        "whyRisky": "This analytical path connects an internet-facing asset to an unresolved finding; it does not establish exploitation or compromise.",
        "mitigations": [finding.get("remediation") or "Remediate the finding", "Review the asset's internet exposure", "Verify with a follow-up scan"],
        "discoveredAt": finding.get("discoveredAt", now()),
    }


def _services_by_asset(project_id: str) -> dict[str, list[dict]]:
    response = store.supabase.table("asset_services").select("asset_id,service,port,protocol,state,version").execute()
    result: dict[str, list[dict]] = {}
    for row in response.data or []:
        result.setdefault(row["asset_id"], []).append(row)
    return result


def _risk_scores_by_finding(project_id: str) -> dict[str, int]:
    response = store.supabase.table("risk_scores").select("finding_id,score,calculated_at").eq("project_id", project_id).order("calculated_at", desc=True).execute()
    scores: dict[str, int] = {}
    for row in response.data or []:
        finding_id = row.get("finding_id")
        if finding_id and finding_id not in scores:
            scores[finding_id] = int(row["score"])
    return scores


def persist_path(path: dict) -> None:
    client = store.supabase
    payload = {
        "id": path["id"], "project_id": path["projectId"], "name": path["name"], "description": path["description"],
        "risk_score": path["riskScore"], "severity": path["severity"], "entry_point": path["entryPoint"],
        "target": path["target"], "hops": path["hops"], "why_risky": path["whyRisky"],
        "mitigations": path["mitigations"], "discovered_at": path["discoveredAt"],
    }
    client.table("attack_paths").upsert(payload, on_conflict="id").execute()
    client.table("attack_path_edges").delete().eq("attack_path_id", path["id"]).execute()
    client.table("attack_path_nodes").delete().eq("attack_path_id", path["id"]).execute()
    client.table("attack_path_nodes").insert([
        {"id": node["id"], "attack_path_id": path["id"], "node_type": node["type"], "label": node["label"], "risk_score": node.get("riskScore"), "severity": node.get("severity"), "x": node["x"], "y": node["y"]}
        for node in path["nodes"]
    ]).execute()
    client.table("attack_path_edges").insert([
        {"id": edge["id"], "attack_path_id": path["id"], "source_node_id": edge["source"], "target_node_id": edge["target"], "label": edge.get("label")}
        for edge in path["edges"]
    ]).execute()


def generate_attack_paths(project_id: str) -> list[dict]:
    if store.supabase is None:
        raise RuntimeError("Supabase is not configured")
    assets = [asset for asset in list_assets(project_id) if asset.get("authorized") and asset.get("exposure") == "internet"]
    assets_by_id = {asset["id"]: asset for asset in assets}
    findings = [finding for finding in list_findings(project_id) if finding.get("status") != "resolved" and finding.get("severity", "").lower() in PATH_SEVERITIES and finding.get("assetId") in assets_by_id]
    
    # Ensure all findings have risk scores
    for finding in findings:
        if "riskScore" not in finding or finding.get("riskScore") is None:
            finding["riskScore"] = 0
    
    risk_scores = _risk_scores_by_finding(project_id)
    for finding in findings:
        if finding["id"] in risk_scores:
            finding["riskScore"] = risk_scores[finding["id"]]
    services = _services_by_asset(project_id)
    paths = []
    for finding in sorted(findings, key=lambda item: (-int(item.get("riskScore", 0)), item["id"])):
        path = build_path(assets_by_id[finding["assetId"]], finding, services.get(finding["assetId"], []))
        persist_path(path)
        paths.append(path)
    logger.info("Generated %d attack paths for project %s", len(paths), project_id)
    return paths
