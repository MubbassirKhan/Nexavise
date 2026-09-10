import logging

from database import now, new_id, store
from services.attack_path_service import generate_attack_paths
from services.asset_repository import get_asset
from services.risk_engine import score_finding
from services.security_scanner import scan_asset
from services.scan_repository import update_scan
from services.finding_repository import persist_finding, persist_risk_score, persist_scan_result

logger = logging.getLogger(__name__)


def _normalize(scan: dict, asset: dict, observation: dict, raw: dict) -> dict:
    score, breakdown = score_finding(raw["severity"], asset.get("exposure", "internal"), asset.get("criticality", 3))
    timestamp = now()
    fingerprint = f"{asset['id']}:{raw['findingType']}:{raw.get('affectedUrl', observation.url)}"
    existing = next((item for item in store.findings if item.get("fingerprint") == fingerprint), None)
    finding = existing or {"id": new_id("finding"), "assignedTo": None, "statusHistory": []}
    finding.update({
        "projectId": asset["projectId"], "assetId": asset["id"], "assetHostname": asset["hostname"], "scanId": scan["id"],
        "title": raw["title"], "description": raw["description"], "severity": raw["severity"], "status": existing.get("status", "open") if existing else "open",
        "riskScore": score, "riskBreakdown": breakdown, "scanner": raw["scanner"], "evidence": raw["evidence"],
        "technicalDetails": f"Observed at {observation.url} with HTTP status {observation.status_code}.",
        "whyRisky": raw["description"], "remediation": raw["remediation"], "affectedUrl": raw.get("affectedUrl", observation.url),
        "affectedService": None, "affectedPort": None, "discoveredAt": existing.get("discoveredAt", timestamp) if existing else timestamp,
        "updatedAt": timestamp, "tags": ["http", raw["findingType"]], "fingerprint": fingerprint,
    })
    if not existing:
        finding["statusHistory"].append({"status": "open", "changedBy": "Nexavise HTTP Scanner", "changedAt": timestamp})
        store.findings.append(finding)
        store.log("finding_created", None, {"findingId": finding["id"], "scanId": scan["id"]})
    return finding


def complete_scan(scan_id: str) -> None:
    scan = next((item for item in store.scans if item["id"] == scan_id), None)
    if not scan:
        return
    try:
        asset = get_asset(scan["assetId"])
    except Exception as exc:
        scan.update({"status": "failed", "error": "Unable to access asset data in Supabase", "completedAt": now()})
        store.persist()
        return
    if asset and asset.get("projectId") != scan["projectId"]:
        asset = None
    if not asset or not asset.get("authorized"):
        scan.update({"status": "failed", "error": "Asset is not authorized for scanning.", "completedAt": now()})
        store.persist()
        return
    try:
        scan.update({"status": "running", "progress": 10})
        update_scan(scan_id, {"status": "running", "progress": 10})
        store.persist()
        observation, raw_findings = scan_asset(asset, scan.get("targetUrl"))
        scan["progress"] = 75
        normalized = []
        for raw in raw_findings:
            finding = _normalize(scan, asset, observation, raw)
            persisted = persist_finding(finding)
            persist_risk_score(persisted)
            normalized.append(persisted)
        persist_scan_result(scan, asset, observation, len(normalized))
        scan.update({"status": "completed", "progress": 100, "completedAt": now(), "findingsCount": len(normalized), "newFindings": len(normalized), "result": {"url": observation.url, "statusCode": observation.status_code, "title": observation.title, "links": observation.links[:25]}})
        update_scan(scan_id, {"status": "completed", "progress": 100, "completedAt": scan["completedAt"], "findingsCount": len(normalized), "newFindings": len(normalized)})
        try:
            generate_attack_paths(scan["projectId"])
        except Exception as exc:
            logger.exception("Attack-path generation failed for completed scan %s", scan_id)
            store.log("attack_path_generation_failed", scan.get("createdById"), {"scanId": scan_id, "error": str(exc)[:500]})
        store.log("scan_completed", scan.get("createdById"), {"scanId": scan_id, "findings": len(normalized)})
    except Exception as exc:
        scan.update({"status": "failed", "progress": 100, "completedAt": now(), "error": str(exc)[:300]})
        store.log("scan_failed", scan.get("createdById"), {"scanId": scan_id, "error": str(exc)[:300]})
    finally:
        store.persist()
