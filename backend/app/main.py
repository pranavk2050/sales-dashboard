from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI

from .alerts import run_alert_engine
from .db import get_connection, init_db
from .routers.alerts import router as alerts_router
from .routers.changes import router as changes_router
from .routers.interbu import router as interbu_router
from .routers.opportunities import router as opportunities_router
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.add_job(run_alerts_only, "interval", seconds=60, id="alerts_job")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Opportunity & Lead Tracker", lifespan=lifespan)
app.include_router(opportunities_router)
app.include_router(changes_router)
app.include_router(this_week_router)
app.include_router(alerts_router)
app.include_router(interbu_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
