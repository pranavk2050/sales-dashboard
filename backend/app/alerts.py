"""Alert engine: run on every rescan. Flags any live opportunity that's 15+ days past its
timeline with no genuine activity logged since that date - and auto-resolves the alert once
activity (any real field edit) appears, per the stakeholder's "no update for N days" trigger.
"""
from datetime import date

from .db import get_open_alert, has_genuine_activity_since, insert_alert, resolve_alert

OVERDUE_ALERT_THRESHOLD_DAYS = 15


def format_ddmmyyyy(iso_date: str) -> str:
    y, m, d = iso_date.split("-")
    return f"{d}.{m}.{y}"


def run_alert_engine(conn, now_iso: str) -> None:
    today = date.fromisoformat(now_iso[:10])

    rows = conn.execute(
        "SELECT opp_lead_no, customer, timeline FROM opportunities_snapshot WHERE is_lost = 0 AND timeline IS NOT NULL"
    ).fetchall()

    still_overdue_ids = set()
    for row in rows:
        opp_id = row["opp_lead_no"]
        timeline_iso = row["timeline"]
        days_overdue = (today - date.fromisoformat(timeline_iso)).days

        should_alert = days_overdue >= OVERDUE_ALERT_THRESHOLD_DAYS and not has_genuine_activity_since(
            conn, opp_id, timeline_iso
        )

        if should_alert:
            still_overdue_ids.add(opp_id)
            if get_open_alert(conn, opp_id) is None:
                message = (
                    f"Activity for {opp_id} ({row['customer'] or 'Unknown customer'}) "
                    f"was due {format_ddmmyyyy(timeline_iso)}; no update for {days_overdue} days."
                )
                insert_alert(conn, opp_id, message, now_iso)

    # Resolve any open alert whose opportunity no longer meets the overdue-with-no-activity
    # condition (activity happened, timeline moved, or it's no longer live).
    for row in conn.execute("SELECT id, opp_id FROM alerts WHERE resolved_at IS NULL").fetchall():
        if row["opp_id"] not in still_overdue_ids:
            resolve_alert(conn, row["id"], now_iso)
