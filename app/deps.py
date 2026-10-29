from fastapi import Header, HTTPException
from sqlalchemy import select
from .db import Session, User, Brand, Setting


def user_dep(x_user_id: str = Header(default="")):
    with Session() as s:
        u = s.get(User, x_user_id)
        if not u:
            raise HTTPException(401, "Choose a user first (X-User-Id header).")
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
