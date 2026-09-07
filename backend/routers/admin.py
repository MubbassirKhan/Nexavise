from fastapi import APIRouter, Depends
from database import store
from deps import current_user

router = APIRouter(prefix="/api", tags=["Administration"])


@router.get("/users")
def users(user: dict = Depends(current_user)):
    return [{key: value for key, value in item.items() if key != "password"} for item in store.users]


@router.get("/audit-logs")
def audit_logs(user: dict = Depends(current_user)):
    return list(reversed(store.audit_logs))
