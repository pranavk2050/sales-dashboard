import os

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

from ..auth import SESSION_COOKIE_NAME, SESSION_TTL, CurrentUser, create_session, get_current_user, verify_password
from ..db import delete_session, get_connection, get_user_by_email

router = APIRouter()

COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax")


class LoginBody(BaseModel):
    email: str
    password: str


@router.post("/api/auth/login")
def login(body: LoginBody, response: Response):
    conn = get_connection()
    try:
        user = get_user_by_email(conn, body.email)
        if user is None or not user["is_active"] or not verify_password(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        session_id = create_session(conn, user["id"])
        conn.commit()
        display_name = user["display_name"]
    finally:
        conn.close()

    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_id,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=int(SESSION_TTL.total_seconds()),
    )
    return {"id": user["id"], "email": body.email, "display_name": display_name}


@router.post("/api/auth/logout")
def logout(request: Request, response: Response):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if session_id:
        conn = get_connection()
        try:
            delete_session(conn, session_id)
            conn.commit()
        finally:
            conn.close()
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"status": "ok"}


@router.get("/api/auth/me")
def me(current_user: CurrentUser = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "display_name": current_user.display_name}
