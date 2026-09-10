from fastapi import Depends, Header, HTTPException
from database import store


def current_user(x_user_id: str | None = Header(default=None)) -> dict:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-Id header is required")
    user_id = x_user_id
    if store.supabase is not None:
        response = store.supabase.table("users").select("*, roles(name)").eq("id", user_id).limit(1).execute()
        if not response.data:
            raise HTTPException(status_code=401, detail="Unknown user")
        row = response.data[0]
        role = row.get("roles") or {}
        return {"id": row["id"], "name": row.get("name", ""), "email": row.get("email", ""),
                "role": role.get("name") if isinstance(role, dict) else "analyst",
                "organizationId": row.get("organization_id")}
    raise HTTPException(status_code=503, detail="Supabase is not configured")


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_analyst_or_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") not in {"analyst", "admin"}:
        raise HTTPException(status_code=403, detail="Analyst or admin access required")
    return user


def require_project(project_id: str, user: dict) -> dict:
    if store.supabase is not None:
        response = store.supabase.table("projects").select("*").eq("id", project_id).limit(1).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Project not found")
        row = response.data[0]
        if row.get("organization_id") and row["organization_id"] != user.get("organizationId"):
            raise HTTPException(status_code=403, detail="Project is outside the user's organization")
        return {"id": row["id"], "name": row.get("name", ""), "description": row.get("description", ""),
                "organizationId": row.get("organization_id"), "createdAt": row.get("created_at")}
    raise HTTPException(status_code=503, detail="Supabase is not configured")


def accessible_project_ids(user: dict) -> list[str]:
    if store.supabase is None:
        raise HTTPException(status_code=503, detail="Supabase is not configured")
    response = store.supabase.table("projects").select("id").eq("organization_id", user.get("organizationId")).execute()
    return [row["id"] for row in (response.data or [])]
