from fastapi import APIRouter, Depends, HTTPException
from database import store
from deps import current_user
from schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
def login(payload: LoginRequest):
    if store.supabase is not None:
        response = store.supabase.table("users").select("*, roles(name)").eq("email", payload.email.lower()).limit(1).execute()
        user = response.data[0] if response.data else None
        role = (user or {}).get("roles") or {}
        if user and user.get("password_hash") == payload.password:
            safe_user = {"id": user["id"], "name": user.get("name", ""), "email": user.get("email", ""),
                         "role": role.get("name", "analyst"), "organizationId": user.get("organization_id")}
            store.log("login", user["id"])
            return {"accessToken": user["id"], "tokenType": "bearer", "user": safe_user}
        raise HTTPException(status_code=401, detail="Invalid email or password")
    raise HTTPException(status_code=503, detail="Supabase is not configured")


@router.post("/logout")
def logout(user: dict = Depends(current_user)):
    store.log("logout", user["id"])
    return {"loggedOut": True}
