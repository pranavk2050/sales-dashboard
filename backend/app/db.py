import os
import sqlite3
from pathlib import Path

from .models import InterBURow, LostOpportunityRow, MainSheetRow

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "dashboard.db"
DB_PATH = Path(os.environ.get("DASHBOARD_DB_PATH", DEFAULT_DB_PATH))

SCHEMA = """
CREATE TABLE IF NOT EXISTS opportunities_snapshot (
  opp_lead_no TEXT PRIMARY KEY,
  sl_no INTEGER,
  has_synthetic_id INTEGER NOT NULL DEFAULT 0,
  customer TEXT,
  enquiry_description TEXT,
  tentative_value_cr REAL,
  opportunity_multiplier TEXT,
  progress INTEGER,
  expected_quarter TEXT,
  present_status TEXT,
  timeline TEXT,
  delivery_team TEXT,
  sales_team TEXT,
  is_lost INTEGER NOT NULL DEFAULT 0,
  lost_date TEXT,
  proposal_submitted_date TEXT,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lost_snapshot (
  opp_lead_no TEXT PRIMARY KEY,
  sl_no INTEGER,
  has_synthetic_id INTEGER NOT NULL DEFAULT 0,
  customer TEXT,
  description TEXT,
  tentative_value_cr REAL,
  opportunity_multiplier TEXT,
  expected_quarter TEXT,
  lost_reason TEXT,
  date_lost TEXT,
  team_member_1 TEXT,
  team_member_2 TEXT,
  notes TEXT,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interbu_snapshot (
  bu TEXT NOT NULL,
  project TEXT NOT NULL,
  group_label TEXT,
  sl_no INTEGER,
  team_members TEXT,
  meeting_status TEXT,
  present_status TEXT,
  service_lines TEXT,
  status TEXT,
  stage TEXT,
  responsible TEXT,
  target_date TEXT,
  tentative_value_cr REAL,
  name TEXT,
  designation TEXT,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (bu, project)
);

CREATE TABLE IF NOT EXISTS change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opp_id TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  detected_at TEXT NOT NULL,
  changed_by TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opp_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scan_state (
  file_path TEXT PRIMARY KEY,
  mtime REAL NOT NULL,
  last_scanned_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interbu_monthly_notes (
  bu TEXT NOT NULL,
  month TEXT NOT NULL,
  discussion_notes TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (bu, month)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, coltype: str) -> None:
    """CREATE TABLE IF NOT EXISTS is a no-op on a table that already exists, so a new column
    added to SCHEMA never reaches an existing on-disk database - this adds it if missing."""
    cols = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coltype}")


def init_db() -> None:
    conn = get_connection()
    try:
        conn.executescript(SCHEMA)
        _ensure_column(conn, "opportunities_snapshot", "proposal_submitted_date", "TEXT")
        conn.commit()
    finally:
        conn.close()


def upsert_opportunity(conn: sqlite3.Connection, row: MainSheetRow, now_iso: str) -> None:
    conn.execute(
        """
        INSERT INTO opportunities_snapshot
        (opp_lead_no, sl_no, has_synthetic_id, customer, enquiry_description, tentative_value_cr,
         opportunity_multiplier, progress, expected_quarter, present_status, timeline, delivery_team,
         sales_team, is_lost, lost_date, last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(opp_lead_no) DO UPDATE SET
          sl_no=excluded.sl_no, has_synthetic_id=excluded.has_synthetic_id, customer=excluded.customer,
          enquiry_description=excluded.enquiry_description, tentative_value_cr=excluded.tentative_value_cr,
          opportunity_multiplier=excluded.opportunity_multiplier, progress=excluded.progress,
          expected_quarter=excluded.expected_quarter, present_status=excluded.present_status,
          timeline=excluded.timeline, delivery_team=excluded.delivery_team, sales_team=excluded.sales_team,
          is_lost=excluded.is_lost,
          lost_date=CASE WHEN excluded.is_lost=1 THEN COALESCE(opportunities_snapshot.lost_date, excluded.lost_date) ELSE NULL END,
          last_seen_at=excluded.last_seen_at
        """,
        (
            row.opp_lead_no,
            row.sl_no,
            int(row.has_synthetic_id),
            row.customer,
            row.enquiry_description,
            row.tentative_value_cr,
            row.opportunity_multiplier,
            row.progress,
            row.expected_quarter,
            row.present_status,
            row.timeline.isoformat() if row.timeline else None,
            row.delivery_team,
            row.sales_team,
            int(row.is_lost),
            now_iso if row.is_lost else None,
            now_iso,
        ),
    )


def upsert_lost(conn: sqlite3.Connection, row: LostOpportunityRow, now_iso: str) -> None:
    conn.execute(
        """
        INSERT INTO lost_snapshot
        (opp_lead_no, sl_no, has_synthetic_id, customer, description, tentative_value_cr,
         opportunity_multiplier, expected_quarter, lost_reason, date_lost, team_member_1, team_member_2,
         notes, last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(opp_lead_no) DO UPDATE SET
          sl_no=excluded.sl_no, has_synthetic_id=excluded.has_synthetic_id, customer=excluded.customer,
          description=excluded.description, tentative_value_cr=excluded.tentative_value_cr,
          opportunity_multiplier=excluded.opportunity_multiplier, expected_quarter=excluded.expected_quarter,
          lost_reason=excluded.lost_reason, date_lost=excluded.date_lost, team_member_1=excluded.team_member_1,
          team_member_2=excluded.team_member_2, notes=excluded.notes, last_seen_at=excluded.last_seen_at
        """,
        (
            row.opp_lead_no,
            row.sl_no,
            int(row.has_synthetic_id),
            row.customer,
            row.description,
            row.tentative_value_cr,
            row.opportunity_multiplier,
            row.expected_quarter,
            row.lost_reason,
            row.date_lost.isoformat() if row.date_lost else None,
            row.team_member_1,
            row.team_member_2,
            row.notes,
            now_iso,
        ),
    )


def upsert_interbu(conn: sqlite3.Connection, row: InterBURow, now_iso: str) -> None:
    conn.execute(
        """
        INSERT INTO interbu_snapshot
        (bu, project, group_label, sl_no, team_members, meeting_status, present_status, service_lines,
         status, stage, responsible, target_date, tentative_value_cr, name, designation, last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(bu, project) DO UPDATE SET
          group_label=excluded.group_label, sl_no=excluded.sl_no, team_members=excluded.team_members,
          meeting_status=excluded.meeting_status, present_status=excluded.present_status,
          service_lines=excluded.service_lines, status=excluded.status, stage=excluded.stage,
          responsible=excluded.responsible, target_date=excluded.target_date,
          tentative_value_cr=excluded.tentative_value_cr, name=excluded.name, designation=excluded.designation,
          last_seen_at=excluded.last_seen_at
        """,
        (
            row.bu or "Unknown",
            row.project,
            row.group_label,
            row.sl_no,
            row.team_members,
            row.meeting_status,
            row.present_status,
            row.service_lines,
            row.status,
            row.stage,
            row.responsible,
            row.target_date.isoformat() if row.target_date else None,
            row.tentative_value_cr,
            row.name,
            row.designation,
            now_iso,
        ),
    )


def get_opportunities_by_key(conn: sqlite3.Connection) -> dict[str, sqlite3.Row]:
    """Snapshot of opportunities_snapshot keyed by opp_lead_no, read BEFORE this scan's
    upserts so the caller can diff old vs new."""
    return {r["opp_lead_no"]: r for r in conn.execute("SELECT * FROM opportunities_snapshot").fetchall()}


def get_opportunity(conn: sqlite3.Connection, opp_lead_no: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM opportunities_snapshot WHERE opp_lead_no = ?", (opp_lead_no,)
    ).fetchone()


def insert_opportunity_manual(
    conn: sqlite3.Connection, opp_lead_no: str, has_synthetic_id: bool, fields: dict, now_iso: str
) -> None:
    conn.execute(
        """
        INSERT INTO opportunities_snapshot
        (opp_lead_no, sl_no, has_synthetic_id, customer, enquiry_description, tentative_value_cr,
         opportunity_multiplier, progress, expected_quarter, present_status, timeline, delivery_team,
         sales_team, is_lost, lost_date, last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL,?)
        """,
        (
            opp_lead_no,
            fields.get("sl_no"),
            int(has_synthetic_id),
            fields.get("customer"),
            fields.get("enquiry_description"),
            fields.get("tentative_value_cr"),
            fields.get("opportunity_multiplier"),
            fields.get("progress"),
            fields.get("expected_quarter"),
            fields.get("present_status"),
            fields.get("timeline"),
            fields.get("delivery_team"),
            fields.get("sales_team"),
            now_iso,
        ),
    )


def update_opportunity_fields(conn: sqlite3.Connection, opp_lead_no: str, fields: dict, now_iso: str) -> None:
    if not fields:
        return
    columns = ", ".join(f"{col} = ?" for col in fields)
    conn.execute(
        f"UPDATE opportunities_snapshot SET {columns}, last_seen_at = ? WHERE opp_lead_no = ?",
        (*fields.values(), now_iso, opp_lead_no),
    )


def insert_lost_from_opportunity(
    conn: sqlite3.Connection, opportunity_row: sqlite3.Row, lost_reason: str, now_iso: str
) -> None:
    """Maps a live opportunity's fields onto the (differently-shaped) lost_snapshot table when
    the user marks it lost from the dashboard - lost_snapshot otherwise only gets rows imported
    straight from a Lost tab, which manual mark-lost never had until now."""
    conn.execute(
        """
        INSERT INTO lost_snapshot
        (opp_lead_no, sl_no, has_synthetic_id, customer, description, tentative_value_cr,
         opportunity_multiplier, expected_quarter, lost_reason, date_lost, team_member_1, team_member_2,
         notes, last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(opp_lead_no) DO UPDATE SET
          lost_reason=excluded.lost_reason, date_lost=excluded.date_lost, last_seen_at=excluded.last_seen_at
        """,
        (
            opportunity_row["opp_lead_no"],
            opportunity_row["sl_no"],
            opportunity_row["has_synthetic_id"],
            opportunity_row["customer"],
            opportunity_row["enquiry_description"],
            opportunity_row["tentative_value_cr"],
            opportunity_row["opportunity_multiplier"],
            opportunity_row["expected_quarter"],
            lost_reason,
            now_iso[:10],
            opportunity_row["delivery_team"],
            opportunity_row["sales_team"],
            None,
            now_iso,
        ),
    )


def get_lost(conn: sqlite3.Connection, opp_lead_no: str) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM lost_snapshot WHERE opp_lead_no = ?", (opp_lead_no,)).fetchone()


def insert_lost_manual(
    conn: sqlite3.Connection, opp_lead_no: str, has_synthetic_id: bool, fields: dict, now_iso: str
) -> None:
    conn.execute(
        """
        INSERT INTO lost_snapshot
        (opp_lead_no, sl_no, has_synthetic_id, customer, description, tentative_value_cr,
         opportunity_multiplier, expected_quarter, lost_reason, date_lost, team_member_1, team_member_2,
         notes, last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            opp_lead_no,
            fields.get("sl_no"),
            int(has_synthetic_id),
            fields.get("customer"),
            fields.get("description"),
            fields.get("tentative_value_cr"),
            fields.get("opportunity_multiplier"),
            fields.get("expected_quarter"),
            fields.get("lost_reason"),
            fields.get("date_lost"),
            fields.get("team_member_1"),
            fields.get("team_member_2"),
            fields.get("notes"),
            now_iso,
        ),
    )


def update_lost_fields(conn: sqlite3.Connection, opp_lead_no: str, fields: dict, now_iso: str) -> None:
    if not fields:
        return
    columns = ", ".join(f"{col} = ?" for col in fields)
    conn.execute(
        f"UPDATE lost_snapshot SET {columns}, last_seen_at = ? WHERE opp_lead_no = ?",
        (*fields.values(), now_iso, opp_lead_no),
    )


def get_interbu_project(conn: sqlite3.Connection, bu: str, project: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM interbu_snapshot WHERE bu = ? AND project = ?", (bu, project)
    ).fetchone()


def insert_interbu_project(conn: sqlite3.Connection, fields: dict, now_iso: str) -> None:
    conn.execute(
        """
        INSERT INTO interbu_snapshot
        (bu, project, group_label, sl_no, team_members, meeting_status, present_status, service_lines,
         status, stage, responsible, target_date, tentative_value_cr, name, designation, last_seen_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            fields.get("bu"),
            fields.get("project"),
            fields.get("group_label"),
            fields.get("sl_no"),
            fields.get("team_members"),
            fields.get("meeting_status"),
            fields.get("present_status"),
            fields.get("service_lines"),
            fields.get("status"),
            fields.get("stage"),
            fields.get("responsible"),
            fields.get("target_date"),
            fields.get("tentative_value_cr"),
            fields.get("name"),
            fields.get("designation"),
            now_iso,
        ),
    )


def update_interbu_project(conn: sqlite3.Connection, bu: str, project: str, fields: dict, now_iso: str) -> None:
    if not fields:
        return
    columns = ", ".join(f"{col} = ?" for col in fields)
    conn.execute(
        f"UPDATE interbu_snapshot SET {columns}, last_seen_at = ? WHERE bu = ? AND project = ?",
        (*fields.values(), now_iso, bu, project),
    )


def insert_change_log(
    conn: sqlite3.Connection,
    opp_id: str,
    field: str,
    old_value: str | None,
    new_value: str | None,
    detected_at: str,
    changed_by: str | None,
) -> None:
    conn.execute(
        """
        INSERT INTO change_log (opp_id, field, old_value, new_value, detected_at, changed_by)
        VALUES (?,?,?,?,?,?)
        """,
        (opp_id, field, old_value, new_value, detected_at, changed_by),
    )


def mark_opportunity_lost(conn: sqlite3.Connection, opp_lead_no: str, now_iso: str) -> None:
    conn.execute(
        """
        UPDATE opportunities_snapshot
        SET is_lost = 1, lost_date = COALESCE(lost_date, ?)
        WHERE opp_lead_no = ?
        """,
        (now_iso, opp_lead_no),
    )


def mark_opportunity_proposal_submitted(conn: sqlite3.Connection, opp_lead_no: str, now_iso: str) -> None:
    conn.execute(
        """
        UPDATE opportunities_snapshot
        SET proposal_submitted_date = COALESCE(proposal_submitted_date, ?)
        WHERE opp_lead_no = ?
        """,
        (now_iso[:10], opp_lead_no),
    )


def list_proposals_submitted(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    """All opportunities that ever had a proposal submitted, regardless of current live/lost
    status - deliberately no is_lost filter."""
    return conn.execute(
        """
        SELECT * FROM opportunities_snapshot
        WHERE proposal_submitted_date IS NOT NULL
        ORDER BY proposal_submitted_date DESC
        """
    ).fetchall()


def has_genuine_activity_since(conn: sqlite3.Connection, opp_id: str, since_date_iso: str) -> bool:
    """True if a real field edit (not the bookkeeping "created"/"marked_lost" events) was
    logged for this opportunity on or after the given date."""
    row = conn.execute(
        """
        SELECT COUNT(*) c FROM change_log
        WHERE opp_id = ? AND detected_at >= ? AND field NOT IN ('created', 'marked_lost')
        """,
        (opp_id, since_date_iso),
    ).fetchone()
    return row["c"] > 0


def get_open_alert(conn: sqlite3.Connection, opp_id: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM alerts WHERE opp_id = ? AND resolved_at IS NULL", (opp_id,)
    ).fetchone()


def insert_alert(conn: sqlite3.Connection, opp_id: str, message: str, now_iso: str) -> None:
    conn.execute(
        "INSERT INTO alerts (opp_id, message, created_at) VALUES (?,?,?)",
        (opp_id, message, now_iso),
    )


def resolve_alert(conn: sqlite3.Connection, alert_id: int, now_iso: str) -> None:
    conn.execute("UPDATE alerts SET resolved_at = ? WHERE id = ?", (now_iso, alert_id))


def acknowledge_alert(conn: sqlite3.Connection, alert_id: int) -> None:
    conn.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))


def get_open_alerts(conn: sqlite3.Connection, unacknowledged_only: bool = True) -> list[sqlite3.Row]:
    ack_clause = "AND alerts.acknowledged = 0" if unacknowledged_only else ""
    return conn.execute(
        f"""
        SELECT alerts.*, opportunities_snapshot.customer AS customer
        FROM alerts
        LEFT JOIN opportunities_snapshot ON opportunities_snapshot.opp_lead_no = alerts.opp_id
        WHERE alerts.resolved_at IS NULL {ack_clause}
        ORDER BY alerts.created_at DESC
        """
    ).fetchall()


def count_unacknowledged_open_alerts(conn: sqlite3.Connection) -> int:
    row = conn.execute(
        "SELECT COUNT(*) c FROM alerts WHERE resolved_at IS NULL AND acknowledged = 0"
    ).fetchone()
    return row["c"]


def get_open_alert_opp_ids(conn: sqlite3.Connection) -> set[str]:
    return {r["opp_id"] for r in conn.execute("SELECT opp_id FROM alerts WHERE resolved_at IS NULL").fetchall()}


def get_interbu_notes(conn: sqlite3.Connection, bu: str, month: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM interbu_monthly_notes WHERE bu = ? AND month = ?", (bu, month)
    ).fetchone()


def upsert_interbu_notes(conn: sqlite3.Connection, bu: str, month: str, discussion_notes: str, now_iso: str) -> None:
    conn.execute(
        """
        INSERT INTO interbu_monthly_notes (bu, month, discussion_notes, updated_at)
        VALUES (?,?,?,?)
        ON CONFLICT(bu, month) DO UPDATE SET
          discussion_notes = excluded.discussion_notes, updated_at = excluded.updated_at
        """,
        (bu, month, discussion_notes, now_iso),
    )


def get_user_by_email(conn: sqlite3.Connection, email: str) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()


def count_users(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]


def insert_user(conn: sqlite3.Connection, email: str, display_name: str, password_hash: str, now_iso: str) -> None:
    conn.execute(
        "INSERT INTO users (email, display_name, password_hash, created_at) VALUES (?,?,?,?)",
        (email, display_name, password_hash, now_iso),
    )


def insert_session(conn: sqlite3.Connection, session_id: str, user_id: int, now_iso: str, expires_at_iso: str) -> None:
    conn.execute(
        "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?,?,?,?)",
        (session_id, user_id, now_iso, expires_at_iso),
    )


def get_session_with_user(conn: sqlite3.Connection, session_id: str) -> sqlite3.Row | None:
    return conn.execute(
        """
        SELECT sessions.id AS session_id, sessions.expires_at,
               users.id AS user_id, users.email, users.display_name, users.is_active
        FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.id = ?
        """,
        (session_id,),
    ).fetchone()


def delete_session(conn: sqlite3.Connection, session_id: str) -> None:
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
