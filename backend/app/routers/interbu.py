from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from ..db import (
    get_connection,
    get_interbu_notes,
    get_interbu_project,
    insert_interbu_project,
    update_interbu_project,
    upsert_interbu_notes,
)
from ..interbu_report import render_report_html

router = APIRouter()


@router.get("/api/interbu")
def list_interbu():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM interbu_snapshot ORDER BY group_label, bu, project").fetchall()
    finally:
        conn.close()
    return [dict(r) for r in rows]


@router.get("/api/interbu/notes")
def get_notes(bu: str, month: str = Query(pattern=r"^\d{4}-\d{2}$")):
    conn = get_connection()
    try:
        row = get_interbu_notes(conn, bu, month)
    finally:
        conn.close()
    if row is None:
        return {"bu": bu, "month": month, "discussion_notes": "", "updated_at": None}
    return dict(row)


class NotesBody(BaseModel):
    bu: str
    month: str
    discussion_notes: str


@router.put("/api/interbu/notes")
def put_notes(body: NotesBody):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        upsert_interbu_notes(conn, body.bu, body.month, body.discussion_notes, now_iso)
        conn.commit()
        row = get_interbu_notes(conn, body.bu, body.month)
    finally:
        conn.close()
    return dict(row)


class InterBUProjectFields(BaseModel):
    group_label: Optional[str] = None
    sl_no: Optional[int] = None
    team_members: Optional[str] = None
    meeting_status: Optional[str] = None
    present_status: Optional[str] = None
    service_lines: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    responsible: Optional[str] = None
    target_date: Optional[date] = None
    tentative_value_cr: Optional[float] = None
    name: Optional[str] = None
    designation: Optional[str] = None


class InterBUProjectCreate(InterBUProjectFields):
    bu: str
    project: str


def _stringify_target_date(fields: dict) -> dict:
    if "target_date" in fields and fields["target_date"] is not None:
        fields["target_date"] = fields["target_date"].isoformat()
    return fields


@router.post("/api/interbu", status_code=201)
def create_interbu_project(body: InterBUProjectCreate):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        if get_interbu_project(conn, body.bu, body.project) is not None:
            raise HTTPException(
                status_code=409, detail=f"Project '{body.project}' already exists under BU '{body.bu}'"
            )
        fields = _stringify_target_date(body.model_dump())
        insert_interbu_project(conn, fields, now_iso)
        conn.commit()
        row = get_interbu_project(conn, body.bu, body.project)
    finally:
        conn.close()
    return dict(row)


@router.patch("/api/interbu/{bu}/{project}")
def update_interbu_project_endpoint(bu: str, project: str, body: InterBUProjectFields):
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    try:
        if get_interbu_project(conn, bu, project) is None:
            raise HTTPException(status_code=404, detail="Inter BU project not found")
        fields = _stringify_target_date(body.model_dump(exclude_unset=True))
        update_interbu_project(conn, bu, project, fields, now_iso)
        conn.commit()
        row = get_interbu_project(conn, bu, project)
    finally:
        conn.close()
    return dict(row)


@router.get("/api/interbu/report", response_class=HTMLResponse)
def get_report(bu: str, month: str = Query(pattern=r"^\d{4}-\d{2}$")):
    conn = get_connection()
    try:
        projects = [dict(r) for r in conn.execute(
            "SELECT * FROM interbu_snapshot WHERE bu = ? ORDER BY project", (bu,)
        ).fetchall()]
        if not projects:
            raise HTTPException(status_code=404, detail=f"No Inter BU data found for BU '{bu}'")
        notes_row = get_interbu_notes(conn, bu, month)
    finally:
        conn.close()

    group_label = projects[0].get("group_label") if projects else None
    notes = notes_row["discussion_notes"] if notes_row else None
    html = render_report_html(bu, month, group_label, projects, notes)
    return HTMLResponse(content=html)
