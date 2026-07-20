import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .alerts import run_alert_engine
from .auth import get_current_user, hash_password
from .db import count_users, get_connection, init_db, insert_user
from .routers.alerts import router as alerts_router
from .routers.auth import router as auth_router
from .routers.changes import router as changes_router
from .routers.interbu import router as interbu_router
from .routers.opportunities import router as opportunities_router
from .routers.proposals import router as proposals_router
from .routers.this_week import router as this_week_router

scheduler = BackgroundScheduler()


def run_alerts_only() -> None:
    """The dashboard is now the system of record (no more Excel scan) - this just keeps the
    overdue-alert engine ticking against whatever is currently in opportunities_snapshot."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        run_alert_engine(conn, now_iso)
        conn.commit()
    finally:
        conn.close()


def maybe_bootstrap_admin() -> None:
    """Render's free tier has no shell access, so create_user.py can't be run interactively
    there. If BOOTSTRAP_ADMIN_EMAIL/PASSWORD are set and no user exists yet, create one from
    them - a one-time bootstrap, not a standing backdoor, since it never runs again once any
    user exists."""
    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL")
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD")
    if not email or not password:
        return
    conn = get_connection()
    try:
        if count_users(conn) > 0:
            return
        name = os.environ.get("BOOTSTRAP_ADMIN_NAME", "Admin")
        now_iso = datetime.now(timezone.utc).isoformat()
        insert_user(conn, email, name, hash_password(password), now_iso)
        conn.commit()
    finally:
        conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    maybe_bootstrap_admin()
    scheduler.add_job(run_alerts_only, "interval", seconds=60, id="alerts_job")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Opportunity & Lead Tracker", lifespan=lifespan)
app.include_router(auth_router)  # unprotected - this IS the login mechanism

_auth_dep = [Depends(get_current_user)]
app.include_router(opportunities_router, dependencies=_auth_dep)
app.include_router(changes_router, dependencies=_auth_dep)
app.include_router(this_week_router, dependencies=_auth_dep)
app.include_router(alerts_router, dependencies=_auth_dep)
app.include_router(interbu_router, dependencies=_auth_dep)
app.include_router(proposals_router, dependencies=_auth_dep)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# In local dev the frontend is served by its own Vite dev server (proxying /api here), so this
# directory won't exist and the block below is skipped entirely. In the production Docker image,
# the frontend build output is copied to backend/static - mounted last so it can never shadow an
# /api/* route registered above.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

if STATIC_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
