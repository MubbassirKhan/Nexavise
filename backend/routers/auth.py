from fastapi import APIRouter, Depends, HTTPException
from database import store
from deps import current_user
from schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
def login(payload: LoginRequest):
    user = next((item for item in store.users if item["email"].lower() == payload.email.lower() and item["password"] == payload.password), None)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    store.log("login", user["id"])
    safe_user = {key: value for key, value in user.items() if key != "password"}
    return {"accessToken": user["id"], "tokenType": "bearer", "user": safe_user}


@router.post("/logout")
def logout(user: dict = Depends(current_user)):
    store.log("logout", user["id"])
    return {"loggedOut": True}
