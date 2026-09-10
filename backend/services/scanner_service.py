import logging

from database import now, new_id, store
from services.attack_path_service import generate_attack_paths
from services.asset_repository import get_asset
from services.risk_engine import score_finding
from services.security_scanner import scan_asset
from services.scan_repository import get_scan, update_scan
from services.finding_repository import persist_finding, persist_risk_score, persist_scan_result

logger = logging.getLogger(__name__)


def _normalize(scan: dict, asset: dict, observation: dict, raw: dict) -> dict:
    score, breakdown = score_finding(raw["severity"], asset.get("exposure", "internal"), asset.get("criticality", 3))
    timestamp = now()
    finding = {"id": new_id("finding"), "assignedTo": None, "statusHistory": []}
    finding.update({
        "projectId": asset["projectId"], "assetId": asset["id"], "assetHostname": asset["hostname"], "scanId": scan["id"],
        "title": raw["title"], "description": raw["description"], "severity": raw["severity"], "status": "open",
        "riskScore": score, "riskBreakdown": breakdown, "scanner": raw["scanner"], "evidence": raw["evidence"],
        "technicalDetails": f"Observed at {observation.url} with HTTP status {observation.status_code}.",
        "whyRisky": raw["description"], "remediation": raw["remediation"], "affectedUrl": raw.get("affectedUrl", observation.url),
        "affectedService": None, "affectedPort": None, "discoveredAt": timestamp,
        "updatedAt": timestamp, "tags": ["http", raw["findingType"]],
    })
    finding["statusHistory"].append({"status": "open", "changedBy": "Nexavise HTTP Scanner", "changedAt": timestamp})
    return finding


def complete_scan(scan_id: str) -> None:
    scan = None
    try:
        scan = get_scan(scan_id)
        if not scan:
            raise RuntimeError(f"Scan {scan_id} was not found")
        logger.info("[SCAN START] scan_id=%s asset_id=%s", scan_id, scan.get("assetId"))
        asset = get_asset(scan["assetId"])
        if asset and asset.get("projectId") != scan["projectId"]:
            asset = None
        if not asset or not asset.get("authorized"):
            raise PermissionError("Asset is not authorized for scanning.")
        scan.update({"status": "running", "progress": 10})
        update_scan(scan_id, {"status": "running", "progress": 10})
        store.persist()
        logger.info("[SCAN PROGRESS] scan_id=%s progress=10", scan_id)
        observation, raw_findings = scan_asset(asset, scan.get("targetUrl"))
        scan["progress"] = 75
        update_scan(scan_id, {"progress": 75})
        logger.info("[SCAN PROGRESS] scan_id=%s progress=75", scan_id)
        normalized = []
        for raw in raw_findings:
            finding = _normalize(scan, asset, observation, raw)
            persisted = persist_finding(finding)
            persist_risk_score(persisted)
            normalized.append(persisted)
        logger.info("[SCAN FINDINGS] scan_id=%s count=%s", scan_id, len(normalized))
        persist_scan_result(scan, asset, observation, len(normalized))
        scan.update({"status": "completed", "progress": 100, "completedAt": now(), "findingsCount": len(normalized), "newFindings": len(normalized), "result": {"url": observation.url, "statusCode": observation.status_code, "title": observation.title, "links": observation.links[:25]}})
        update_scan(scan_id, {"status": "completed", "progress": 100, "completedAt": scan["completedAt"], "findingsCount": len(normalized), "newFindings": len(normalized)})
        try:
            generate_attack_paths(scan["projectId"])
        except Exception as exc:
            logger.exception("Attack-path generation failed for completed scan %s", scan_id)
            store.log("attack_path_generation_failed", scan.get("createdById"), {"scanId": scan_id, "error": str(exc)[:500]})
        logger.info("[SCAN COMPLETE] scan_id=%s findings=%s", scan_id, len(normalized))
        store.log("scan_completed", scan.get("createdById"), {"scanId": scan_id, "findings": len(normalized)})
    except Exception as exc:
        error = str(exc)[:1000] or exc.__class__.__name__
        completed_at = now()
        logger.exception("[SCAN FAILED] scan_id=%s error=%s", scan_id, error)
        if scan is not None:
            scan.update({"status": "failed", "progress": 100, "completedAt": completed_at, "error": error})
        try:
            update_scan(scan_id, {"status": "failed", "progress": 100, "completedAt": completed_at, "error": error})
        except Exception:
            logger.exception("[SCAN FAILED] unable to persist terminal state scan_id=%s", scan_id)
        store.log("scan_failed", scan.get("createdById") if scan else None, {"scanId": scan_id, "error": error})
    finally:
        store.persist()
