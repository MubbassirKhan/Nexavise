from fastapi import Header, HTTPException
from database import store


def current_user(x_user_id: str | None = Header(default=None)) -> dict:
    user_id = x_user_id or "u1"
    user = next((item for item in store.users if item["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=401, detail="Unknown user")
    return {key: value for key, value in user.items() if key != "password"}


def require_project(project_id: str, user: dict) -> dict:
    project = next((item for item in store.projects if item["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
