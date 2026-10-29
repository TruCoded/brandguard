import os, time
import jwt
from fastapi import Header, HTTPException
from sqlalchemy import select
from .db import Session, User, Brand, Setting

JWT_SECRET = os.getenv("JWT_SECRET", "brandguard-secret-key-2026-secure-jwt-token")
JWT_ALGORITHM = "HS256"


def create_token(user_dict: dict, expires_in_seconds: int = 86400 * 7) -> str:
    payload = {
        "sub": user_dict["id"],
        "name": user_dict["name"],
        "role": user_dict["role"],
        "team": user_dict.get("team", ""),
        "exp": int(time.time()) + expires_in_seconds,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token has expired. Please sign in again.")
    except Exception:
        raise HTTPException(401, "Invalid authentication token.")


def user_dep(authorization: str = Header(default=""), x_user_id: str = Header(default="")):
    token = ""
    if authorization:
        parts = authorization.split(" ")
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    user_id = ""
    if token:
        payload = decode_token(token)
        user_id = payload.get("sub", "")
    elif x_user_id:
        user_id = x_user_id

    if not user_id:
        raise HTTPException(401, "Authentication required. Please sign in.")

    with Session() as s:
        u = s.get(User, user_id)
        if not u:
            raise HTTPException(401, "User not found or session invalid.")
        return {"id": u.id, "name": u.name, "role": u.role, "team": u.team}


def need(user, *roles):
    if user["role"] not in roles and user["role"] != "admin":
        raise HTTPException(403, f"Requires role: {', '.join(roles)}. You are {user['role']}.")


def brand_cfg(s, brand_id):
    b = s.get(Brand, brand_id)
    if not b:
        raise HTTPException(404, "Unknown brand")
    return b


def get_setting(s, key, default=None):
    r = s.get(Setting, key)
    return r.value.get("v", default) if r else default


def set_setting(s, key, value):
    s.merge(Setting(key=key, value={"v": value}))
