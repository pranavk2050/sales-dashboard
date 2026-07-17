"""Builds change_log entries for opportunity edits - the audit trail the stakeholder asked for
("timeline was 10.07, Saikat changed it on <date>"). Used by the create/edit mutation endpoints
(app/routers/opportunities.py); no longer tied to Excel scanning.
"""
from uuid import uuid4

from .db import insert_change_log

TRACKED_FIELDS = [
    "customer",
    "enquiry_description",
    "tentative_value_cr",
    "opportunity_multiplier",
    "progress",
    "expected_quarter",
    "present_status",
    "timeline",
    "delivery_team",
    "sales_team",
]


def stringify(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def generate_manual_key(tag: str) -> str:
    """Stable-looking synthetic Opp/Lead No. for a dashboard-created record with no real ID,
    formatted like the ingestion parser's own synthetic keys (LEAD-<TAG>-<hash>) for consistency."""
    return f"LEAD-{tag}-{uuid4().hex[:10]}"


def log_opportunity_changes(conn, opp_id: str, old_row, new_values: dict, now_iso: str, changed_by: str) -> None:
    """old_row: sqlite3.Row or None (brand-new record). new_values: dict of field_name -> new
    value, for whichever TRACKED_FIELDS are present in this create/edit payload."""
    if old_row is None:
        insert_change_log(conn, opp_id, "created", None, new_values.get("customer"), now_iso, changed_by)
        return
    for field_name in TRACKED_FIELDS:
        if field_name not in new_values:
            continue
        new_val = stringify(new_values[field_name])
        old_val = stringify(old_row[field_name])
        if new_val != old_val:
            insert_change_log(conn, opp_id, field_name, old_val, new_val, now_iso, changed_by)
