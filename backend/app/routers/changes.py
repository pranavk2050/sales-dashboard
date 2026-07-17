from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..change_tracking import generate_manual_key
from ..db import get_connection, get_lost, insert_lost_manual, update_lost_fields

router = APIRouter()


@router.get("/api/opportunities/{opp_id}/history")
def opportunity_history(opp_id: str):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT id, opp_id, field, old_value, new_value, detected_at, changed_by
            FROM change_log WHERE opp_id = ? ORDER BY detected_at DESC
            """,
            (opp_id,),
        ).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


@router.get("/api/changes/recent")
def recent_changes(limit: int = Query(20, ge=1, le=200)):
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT change_log.id, opp_id, field, old_value, new_value, detected_at, changed_by,
                   opportunities_snapshot.customer AS customer
            FROM change_log
            LEFT JOIN opportunities_snapshot ON opportunities_snapshot.opp_lead_no = change_log.opp_id
            ORDER BY detected_at DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


@router.get("/api/lost")
def list_lost():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM lost_snapshot ORDER BY date_lost DESC").fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


class LostFields(BaseModel):
    sl_no: Optional[int] = None
    customer: Optional[str] = None
    description: Optional[str] = None
    tentative_value_cr: Optional[float] = None
    opportunity_multiplier: Optional[str] = None
    expected_quarter: Optional[str] = None
    lost_reason: Optional[str] = None
    date_lost: Optional[date] = None
    team_member_1: Optional[str] = None
    team_member_2: Optional[str] = None
    notes: Optional[str] = None


class LostCreate(LostFields):
    opp_lead_no: Optional[str] = None
    changed_by: str


class LostUpdate(LostFields):
    changed_by: str


def _stringify_date_lost(fields: dict) -> dict:
    if "date_lost" in fields and fields["date_lost"] is not None:
        fields["date_lost"] = fields["date_lost"].isoformat()
    return fields


@router.post("/api/lost", status_code=201)
def create_lost(body: LostCreate):
    now_iso = datetime.now(timezone.utc).isoformat()
    fields = _stringify_date_lost(body.model_dump(exclude={"opp_lead_no", "changed_by"}))

    conn = get_connection()
    try:
        if body.opp_lead_no:
            if get_lost(conn, body.opp_lead_no) is not None:
                raise HTTPException(status_code=409, detail=f"Opp/Lead No. '{body.opp_lead_no}' already exists")
            opp_id, has_synthetic_id = body.opp_lead_no, False
        else:
            opp_id, has_synthetic_id = generate_manual_key("MANUAL-LOST"), True

        insert_lost_manual(conn, opp_id, has_synthetic_id, fields, now_iso)
        conn.commit()
        row = get_lost(conn, opp_id)
    finally:
        conn.close()
    return dict(row)


@router.patch("/api/lost/{opp_id}")
def update_lost(opp_id: str, body: LostUpdate):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        if get_lost(conn, opp_id) is None:
            raise HTTPException(status_code=404, detail="Lost record not found")
        fields = _stringify_date_lost(body.model_dump(exclude={"changed_by"}, exclude_unset=True))
        update_lost_fields(conn, opp_id, fields, now_iso)
        conn.commit()
        row = get_lost(conn, opp_id)
    finally:
        conn.close()
    return dict(row)
