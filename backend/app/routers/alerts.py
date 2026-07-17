from fastapi import APIRouter, HTTPException

from ..db import acknowledge_alert, count_unacknowledged_open_alerts, get_connection, get_open_alerts

router = APIRouter()


@router.get("/api/alerts")
def list_alerts():
    conn = get_connection()
    try:
        alerts = [dict(r) for r in get_open_alerts(conn)]
        unread_count = count_unacknowledged_open_alerts(conn)
    finally:
        conn.close()
    return {"unread_count": unread_count, "alerts": alerts}


@router.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge(alert_id: int):
    conn = get_connection()
    try:
        row = conn.execute("SELECT id FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Alert not found")
        acknowledge_alert(conn, alert_id)
        conn.commit()
    finally:
        conn.close()
    return {"status": "ok"}
