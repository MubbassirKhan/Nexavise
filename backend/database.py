from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from uuid import uuid4

from config import settings

try:
    from supabase import Client, create_client
except ImportError:  # pragma: no cover
    Client = object
    create_client = None


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10]}"


class PersistentStore:
    """Dictionary-compatible persistent repository for local development."""

    COLLECTIONS = ("users", "projects", "assets", "scans", "findings", "attack_paths", "reports", "audit_logs")

    def __init__(self) -> None:
        self.supabase: Client | None = self._connect_supabase()
        self.db_path = os.getenv("NEXAVISE_DB_PATH", os.path.join(os.path.dirname(__file__), "nexavise.sqlite3"))
        self.discovery: dict[str, dict] = {}
        self._initialize()
        self._load()

    def _connect_supabase(self):
        config = settings()
        if create_client and config["supabase_url"].startswith("http") and config["supabase_key"] not in ("", "your_supabase_key"):
            return create_client(config["supabase_url"], config["supabase_key"])
        return None

    def _connection(self):
        connection = sqlite3.connect(self.db_path)
        connection.execute("create table if not exists collections (name text primary key, data text not null)")
        return connection

    def _initialize(self) -> None:
        seed = {
            "users": [
                {"id": "u1", "name": "Alex Mercer", "email": "alex@nexavise.io", "role": "admin", "password": "demo", "organizationId": "org-1"},
                {"id": "u2", "name": "Priya Nair", "email": "priya@nexavise.io", "role": "analyst", "password": "demo", "organizationId": "org-1"},
            ],
            "projects": [{"id": "proj-1", "name": "Nexavise Workspace", "description": "Authorized security assessment workspace", "organizationId": "org-1", "createdAt": now()}],
            "assets": [],
            "scans": [],
            "findings": [],
            "attack_paths": [],
            "reports": [],
            "audit_logs": [],
        }
        with self._connection() as connection:
            existing = {row[0] for row in connection.execute("select name from collections")}
            for name, value in seed.items():
                if name not in existing:
                    connection.execute("insert into collections(name, data) values (?, ?)", (name, json.dumps(value)))

    def _load(self) -> None:
        with self._connection() as connection:
            values = {row[0]: json.loads(row[1]) for row in connection.execute("select name, data from collections")}
        for name in self.COLLECTIONS:
            setattr(self, name, values.get(name, []))

    def persist(self) -> None:
        with self._connection() as connection:
            for name in self.COLLECTIONS:
                connection.execute("insert or replace into collections(name, data) values (?, ?)", (name, json.dumps(getattr(self, name))))

    def log(self, action: str, user_id: str | None = None, details: dict | None = None) -> None:
        self.audit_logs.append({"id": new_id("audit"), "action": action, "userId": user_id, "details": details or {}, "createdAt": now()})
        self.persist()


store = PersistentStore()
