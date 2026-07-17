from datetime import date, timedelta

from fastapi import APIRouter

from ..db import get_connection, list_proposals_submitted

router = APIRouter()

WEEKS = 12
MONTHS = 12


def _weekly_buckets(rows: list[dict], weeks: int = WEEKS) -> list[dict]:
    today = date.today()
    this_monday = today - timedelta(days=today.weekday())
    starts = [this_monday - timedelta(weeks=i) for i in range(weeks - 1, -1, -1)]
    counts = {s: 0 for s in starts}
    for r in rows:
        d = date.fromisoformat(r["proposal_submitted_date"])
        week_start = d - timedelta(days=d.weekday())
        if week_start in counts:
            counts[week_start] += 1
    return [
        {
            "week_start": s.isoformat(),
            "week_end": (s + timedelta(days=6)).isoformat(),
            "count": counts[s],
        }
        for s in starts
    ]


def _monthly_buckets(rows: list[dict], months: int = MONTHS) -> list[dict]:
    today = date.today()
    year, month = today.year, today.month
    keys = []
    for _ in range(months):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    keys.reverse()
    counts = {k: 0 for k in keys}
    for r in rows:
        key = r["proposal_submitted_date"][:7]
        if key in counts:
            counts[key] += 1
    return [{"month": k, "count": counts[k]} for k in keys]


@router.get("/api/proposals-submitted")
def proposals_submitted():
    conn = get_connection()
    try:
        rows = [dict(r) for r in list_proposals_submitted(conn)]
    finally:
        conn.close()

    return {
        "total": len(rows),
        "weekly": _weekly_buckets(rows),
        "monthly": _monthly_buckets(rows),
        "opportunities": rows,
    }
