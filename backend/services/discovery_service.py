from database import new_id, now
from services.security_scanner import ScanTargetError, scan_asset


def discover(asset: dict) -> dict:
    observation, _ = scan_asset(asset)
    return {
        "id": new_id("discovery"),
        "assetId": asset["id"],
        "status": "completed",
        "source": "Nexavise HTTP Discovery",
        "discoveredAt": now(),
        "host": asset["hostname"],
        "ip": asset.get("ip"),
        "services": [{"number": 443 if observation.url.startswith("https://") else 80, "protocol": "tcp", "service": "https" if observation.url.startswith("https://") else "http", "state": "open"}],
        "technologies": [value for key in ("server", "x-powered-by") if (value := observation.headers.get(key))],
        "http": {"url": observation.url, "statusCode": observation.status_code, "title": observation.title, "contentType": observation.headers.get("content-type", "")},
        "links": observation.links,
        "message": "Safe HTTP discovery completed without external scanner binaries.",
    }
