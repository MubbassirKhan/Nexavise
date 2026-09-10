from fastapi import APIRouter, Depends
from database import store
from deps import require_admin

router = APIRouter(prefix="/api", tags=["Administration"])


@router.get("/users")
def users(user: dict = Depends(require_admin)):
    if store.supabase is not None:
        response = store.supabase.table("users").select("id,name,email,organization_id,roles(name)").eq("organization_id", user.get("organizationId")).execute()
        return [{"id": row["id"], "name": row.get("name", ""), "email": row.get("email", ""),
                 "organizationId": row.get("organization_id"), "role": (row.get("roles") or {}).get("name")}
                for row in (response.data or [])]
    return [{key: value for key, value in item.items() if key != "password"} for item in store.users]


@router.get("/audit-logs")
def audit_logs(user: dict = Depends(require_admin)):
    return list(reversed(store.audit_logs))
