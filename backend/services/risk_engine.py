SEVERITY_WEIGHT = {"critical": 40, "high": 30, "medium": 20, "low": 10, "info": 2}
EXPOSURE_WEIGHT = {"internet": 35, "dmz": 20, "internal": 8}


def score_finding(severity: str, exposure: str, criticality: int) -> tuple[int, dict]:
    base = SEVERITY_WEIGHT.get(severity, 2)
    exposure_score = EXPOSURE_WEIGHT.get(exposure, 8)
    criticality_score = round(max(1, min(5, criticality)) * 5)
    total = min(100, base + exposure_score + criticality_score)
    return total, {"baseSeverity": base, "internetExposure": exposure_score, "assetCriticality": criticality_score, "total": total}


def risk_overview(assets: list[dict], findings: list[dict]) -> dict:
    active = [finding for finding in findings if finding["status"] != "resolved"]
    scores = [finding["riskScore"] for finding in active]
    return {"score": round(sum(scores) / len(scores)) if scores else 0, "explanation": "Average of unresolved finding scores weighted by severity, exposure, and asset criticality.", "totalAssets": len(assets), "activeAssets": sum(asset["status"] == "active" for asset in assets), "totalFindings": len(findings), "openFindings": len(active), "breakdown": {severity: sum(f["severity"] == severity for f in active) for severity in SEVERITY_WEIGHT}}
