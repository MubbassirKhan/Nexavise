from fastapi import APIRouter, Depends
from database import store
from deps import require_admin

router = APIRouter(prefix="/api", tags=["Administration"])


@router.get("/users")
def users(user: dict = Depends(require_admin)):
    return [{key: value for key, value in item.items() if key != "password"} for item in store.users]


@router.get("/audit-logs")
def audit_logs(user: dict = Depends(require_admin)):
    return list(reversed(store.audit_logs))
