"""Per-user authentication: opaque, DB-backed session cookies (not JWT, not signed/stateless
tokens). Revocation is a real DELETE on the sessions table; there's no signing secret to
provision or rotate because the cookie value is just an unguessable lookup key.
"""
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import HTTPException, Request

from .db import get_connection, get_session_with_user, insert_session

SESSION_COOKIE_NAME = "session_id"
SESSION_TTL = timedelta(days=14)


@dataclass
class CurrentUser:
    id: int
    email: str
    display_name: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_session(conn, user_id: int) -> str:
    session_id = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    insert_session(conn, session_id, user_id, now.isoformat(), (now + SESSION_TTL).isoformat())
    return session_id


def get_current_user(request: Request) -> CurrentUser:
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    conn = get_connection()
    try:
        row = get_session_with_user(conn, session_id)
    finally:
        conn.close()

    if row is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not row["is_active"]:
        raise HTTPException(status_code=401, detail="Account disabled")
    if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    return CurrentUser(id=row["user_id"], email=row["email"], display_name=row["display_name"])
