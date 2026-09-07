from database import now, new_id, store
from services.risk_engine import score_finding


def mock_findings(scan: dict, asset: dict) -> list[dict]:
    findings = []
    for port in asset.get("ports", []):
        if port["state"] != "open" or port["number"] not in (22, 3306, 5432):
            continue
        severity = "critical" if port["number"] in (3306, 5432) else "high"
        title = f'{port["service"].title()} service exposed to the internet'
        score, breakdown = score_finding(severity, asset["exposure"], asset["criticality"])
        # Stable deduplication key makes repeated demo scans idempotent.
        existing = next((item for item in store.findings if item["assetId"] == asset["id"] and item["title"] == title), None)
        if existing:
            existing["updatedAt"] = now()
            findings.append(existing)
            continue
        findings.append({"id": new_id("finding"), "projectId": asset["projectId"], "assetId": asset["id"], "assetHostname": asset["hostname"], "scanId": scan["id"], "title": title, "description": f"The {port['service']} service is reachable on port {port['number']}.", "severity": severity, "status": "open", "riskScore": score, "riskBreakdown": breakdown, "scanner": scan["scanner"], "evidence": f"[mock-{scan['scanner']}] {asset['hostname']}:{port['number']} open {port['service']}", "technicalDetails": "Safe demonstration result generated without exploitation.", "whyRisky": "Internet-facing services increase attack surface and should be restricted to trusted networks.", "remediation": "Restrict the service with firewall rules, require strong authentication, and patch the service.", "affectedService": port["service"], "affectedPort": port["number"], "assignedTo": None, "discoveredAt": now(), "updatedAt": now(), "statusHistory": [{"status": "open", "changedBy": "System", "changedAt": now()}], "tags": ["demo", "exposure"]})
    return findings


def complete_scan(scan_id: str) -> None:
    scan = next(item for item in store.scans if item["id"] == scan_id)
    asset = next(item for item in store.assets if item["id"] == scan["assetId"])
    if scan["status"] == "cancelled":
        return
    scan.update({"status": "running", "progress": 50})
    results = mock_findings(scan, asset)
    for finding in results:
        if finding not in store.findings:
            store.findings.append(finding)
    scan.update({"status": "completed", "progress": 100, "completedAt": now(), "findingsCount": len(results), "newFindings": len(results)})
