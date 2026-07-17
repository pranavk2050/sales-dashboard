from datetime import date, timedelta

from fastapi import APIRouter

from ..db import get_connection

router = APIRouter()


@router.get("/api/this-week")
def this_week():
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)

    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM opportunities_snapshot
            WHERE is_lost = 0 AND timeline IS NOT NULL AND timeline BETWEEN ? AND ?
            ORDER BY timeline ASC
            """,
            (monday.isoformat(), sunday.isoformat()),
        ).fetchall()
    finally:
        conn.close()

    opportunities = [dict(r) for r in rows]
    return {
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "count": len(opportunities),
        "opportunities": opportunities,
    }
