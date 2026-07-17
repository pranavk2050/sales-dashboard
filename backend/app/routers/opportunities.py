from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..change_tracking import generate_manual_key, log_opportunity_changes
from ..db import (
    get_connection,
    get_open_alert_opp_ids,
    get_opportunity,
    insert_change_log,
    insert_lost_from_opportunity,
    insert_opportunity_manual,
    mark_opportunity_lost,
    update_opportunity_fields,
)

router = APIRouter()


@router.get("/api/opportunities")
def list_opportunities(
    customer: Optional[str] = None,
    quarter: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    q: Optional[str] = None,
    overdue: Optional[bool] = None,
    sort_by: str = Query("timeline", pattern="^(timeline|value)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
):
    clauses = ["is_lost = 0"]
    params: list = []

    if customer:
        clauses.append("customer LIKE ?")
        params.append(f"%{customer}%")
    if quarter:
        clauses.append("expected_quarter = ?")
        params.append(quarter)
    if min_value is not None:
        clauses.append("tentative_value_cr >= ?")
        params.append(min_value)
    if max_value is not None:
        clauses.append("tentative_value_cr <= ?")
        params.append(max_value)
    if q:
        clauses.append("present_status LIKE ?")
        params.append(f"%{q}%")
    if overdue is True:
        clauses.append("timeline IS NOT NULL AND timeline < ?")
        params.append(date.today().isoformat())

    sort_col = "timeline" if sort_by == "timeline" else "tentative_value_cr"
    sort_dir_sql = "ASC" if sort_dir == "asc" else "DESC"
    sql = f"""
        SELECT * FROM opportunities_snapshot
        WHERE {" AND ".join(clauses)}
        ORDER BY {sort_col} IS NULL, {sort_col} {sort_dir_sql}
    """

    conn = get_connection()
    try:
        rows = [dict(r) for r in conn.execute(sql, params).fetchall()]
        open_alert_ids = get_open_alert_opp_ids(conn)
    finally:
        conn.close()

    today = date.today()
    for row in rows:
        row["is_overdue"] = False
        row["due_within_7_days"] = False
        row["days_overdue"] = None
        if row["timeline"]:
            delta = (today - date.fromisoformat(row["timeline"])).days
            if delta > 0:
                row["is_overdue"] = True
                row["days_overdue"] = delta
            elif -7 <= delta <= 0:
                row["due_within_7_days"] = True
        row["has_open_alert"] = row["opp_lead_no"] in open_alert_ids

    return rows


class OpportunityFields(BaseModel):
    sl_no: Optional[int] = None
    customer: Optional[str] = None
    enquiry_description: Optional[str] = None
    tentative_value_cr: Optional[float] = None
    opportunity_multiplier: Optional[str] = None
    progress: Optional[int] = None
    expected_quarter: Optional[str] = None
    present_status: Optional[str] = None
    timeline: Optional[date] = None
    delivery_team: Optional[str] = None
    sales_team: Optional[str] = None


class OpportunityCreate(OpportunityFields):
    opp_lead_no: Optional[str] = None
    changed_by: str


class OpportunityUpdate(OpportunityFields):
    changed_by: str


class MarkLostBody(BaseModel):
    lost_reason: str
    changed_by: str


def _stringify_dates(fields: dict) -> dict:
    if "timeline" in fields and fields["timeline"] is not None:
        fields["timeline"] = fields["timeline"].isoformat()
    return fields


@router.post("/api/opportunities", status_code=201)
def create_opportunity(body: OpportunityCreate):
    now_iso = datetime.now(timezone.utc).isoformat()
    fields = _stringify_dates(body.model_dump(exclude={"opp_lead_no", "changed_by"}))

    conn = get_connection()
    try:
        if body.opp_lead_no:
            if get_opportunity(conn, body.opp_lead_no) is not None:
                raise HTTPException(status_code=409, detail=f"Opp/Lead No. '{body.opp_lead_no}' already exists")
            opp_id, has_synthetic_id = body.opp_lead_no, False
        else:
            opp_id, has_synthetic_id = generate_manual_key("MANUAL"), True

        insert_opportunity_manual(conn, opp_id, has_synthetic_id, fields, now_iso)
        log_opportunity_changes(conn, opp_id, None, fields, now_iso, body.changed_by)
        conn.commit()
        row = get_opportunity(conn, opp_id)
    finally:
        conn.close()
    return dict(row)


@router.patch("/api/opportunities/{opp_id}")
def update_opportunity(opp_id: str, body: OpportunityUpdate):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        old_row = get_opportunity(conn, opp_id)
        if old_row is None:
            raise HTTPException(status_code=404, detail="Opportunity not found")

        fields = _stringify_dates(body.model_dump(exclude={"changed_by"}, exclude_unset=True))
        log_opportunity_changes(conn, opp_id, old_row, fields, now_iso, body.changed_by)
        update_opportunity_fields(conn, opp_id, fields, now_iso)
        conn.commit()
        row = get_opportunity(conn, opp_id)
    finally:
        conn.close()
    return dict(row)


@router.post("/api/opportunities/{opp_id}/mark-lost")
def mark_lost(opp_id: str, body: MarkLostBody):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        row = get_opportunity(conn, opp_id)
        if row is None:
            raise HTTPException(status_code=404, detail="Opportunity not found")
        mark_opportunity_lost(conn, opp_id, now_iso)
        insert_lost_from_opportunity(conn, row, body.lost_reason, now_iso)
        insert_change_log(conn, opp_id, "marked_lost", "live", "lost", now_iso, body.changed_by)
        conn.commit()
    finally:
        conn.close()
    return {"status": "ok"}
