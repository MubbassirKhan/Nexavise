from datetime import datetime, timezone
from uuid import uuid4

from config import settings

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover - dependency is installed in normal use
    Client = object
    create_client = None


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10]}"


class DemoStore:
    """Small repository used for the demo and as a local fallback for Supabase."""

    def __init__(self) -> None:
        self.users = [
            {"id": "u1", "name": "Alex Mercer", "email": "alex@nexavise.io", "role": "admin", "password": "demo"},
            {"id": "u2", "name": "Priya Nair", "email": "priya@nexavise.io", "role": "analyst", "password": "demo"},
        ]
        self.projects = [{"id": "proj-1", "name": "Acme Corp - External Perimeter", "description": "Full external attack surface assessment", "organizationId": "org-1", "createdAt": now()}]
        self.assets = [
            {"id": "a1", "projectId": "proj-1", "hostname": "api.acmecorp.com", "ip": "52.18.43.201", "type": "api", "url": "https://api.acmecorp.com", "status": "active", "exposure": "internet", "technologies": ["Nginx", "Node.js"], "ports": [{"number": 443, "protocol": "tcp", "service": "https", "state": "open"}], "authorized": True, "criticality": 4, "lastSeen": now(), "tags": ["production", "api"]},
            {"id": "a2", "projectId": "proj-1", "hostname": "portal.acmecorp.com", "ip": "52.18.43.210", "type": "webapp", "url": "https://portal.acmecorp.com", "status": "active", "exposure": "internet", "technologies": ["Apache", "PHP 7.4"], "ports": [{"number": 443, "protocol": "tcp", "service": "https", "state": "open"}], "authorized": True, "criticality": 5, "lastSeen": now(), "tags": ["production"]},
            {"id": "a3", "projectId": "proj-1", "hostname": "dev-server.acmecorp.com", "ip": "52.18.43.230", "type": "host", "url": None, "status": "active", "exposure": "internet", "technologies": ["OpenSSH 7.9", "PostgreSQL 12"], "ports": [{"number": 22, "protocol": "tcp", "service": "ssh", "state": "open"}, {"number": 5432, "protocol": "tcp", "service": "postgresql", "state": "open"}], "authorized": True, "criticality": 5, "lastSeen": now(), "tags": ["dev"]},
            {"id": "a4", "projectId": "proj-1", "hostname": "unknown-52.18.43.240", "ip": "52.18.43.240", "type": "ip", "url": None, "status": "unknown", "exposure": "internet", "technologies": [], "ports": [{"number": 3306, "protocol": "tcp", "service": "mysql", "state": "open"}], "authorized": False, "criticality": 5, "lastSeen": now(), "tags": ["unauthorized"]},
        ]
        self.scans: list[dict] = []
        self.discovery: dict[str, dict] = {}
        self.findings: list[dict] = []
        self.attack_paths: list[dict] = []
        self.reports: list[dict] = []
        self.audit_logs: list[dict] = []
        self.supabase: Client | None = self._connect_supabase()

    def _connect_supabase(self):
        config = settings()
        if create_client and config["supabase_url"].startswith("http") and config["supabase_key"] not in ("", "your_supabase_key"):
            return create_client(config["supabase_url"], config["supabase_key"])
        return None

    def log(self, action: str, user_id: str | None = None, details: dict | None = None) -> None:
        self.audit_logs.append({"id": new_id("audit"), "action": action, "userId": user_id, "details": details or {}, "createdAt": now()})


store = DemoStore()
