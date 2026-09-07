from database import now


def discover(asset: dict) -> dict:
    services = asset.get("ports", []) or [{"number": 443, "protocol": "tcp", "service": "https", "state": "open"}]
    return {"id": asset["id"], "assetId": asset["id"], "status": "completed", "source": "mock", "discoveredAt": now(), "host": asset["hostname"], "ip": asset.get("ip"), "services": services, "technologies": asset.get("technologies", []), "message": "Demo discovery completed; no external discovery binary was required."}
