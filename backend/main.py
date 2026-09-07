from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import admin, assets, attack_paths, auth, discovery, findings, projects, reports, risk, scans

app = FastAPI(title="Nexavise Sentinel API", version="0.1.0", description="MVP security asset discovery, scanning, findings, risk, and reporting API.")

app.add_middleware(CORSMiddleware, allow_origins=settings()["cors_origins"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for router in (auth.router, projects.router, assets.router, discovery.router, scans.router, findings.router, risk.router, attack_paths.router, reports.router, admin.router):
    app.include_router(router)


@app.get("/", tags=["Health"])
def health():
    return {"name": "Nexavise Sentinel API", "status": "ok", "docs": "/docs"}


@app.get("/api/health", tags=["Health"])
def api_health():
    return {"status": "ok", "mode": "supabase" if __import__("database").store.supabase else "demo"}
