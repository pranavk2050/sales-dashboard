# PROMPT FOR CLAUDE CODE — Opportunity & Lead Tracker Dashboard

Copy everything below this line into Claude Code. Build one phase at a time; do not start a phase until the previous phase's acceptance criteria pass.

---

## ROLE
You are a senior full-stack engineer. Build a web dashboard on top of an existing Excel workbook named **"Opportunity and lead tracker sheet.xlsx"** (currently maintained on SharePoint/OneDrive). Work strictly phase by phase. After each phase: run it, verify acceptance criteria, print a 3-line summary, then STOP and wait for my confirmation before the next phase. Do not refactor earlier phases unless asked. Keep code minimal — no speculative features, no extra libraries beyond those listed.

## TECH STACK (fixed — do not deviate)
- Backend: Python 3.11, FastAPI, `openpyxl` (Excel parsing), SQLite (snapshots + change log), APScheduler (periodic re-scan).
- Frontend: React (Vite) + Tailwind CSS + Recharts. Single-page app, no auth in v1.
- Excel access v1: workbook file placed in `./data/` (manual sync or OneDrive-synced local folder). Design the ingestion layer behind an interface `WorkbookSource` so SharePoint/Microsoft Graph API can replace it later without touching other code.

## SOURCE DATA (exact schema — parse these, ignore other tabs in v1)
Workbook tabs: `Main sheet`, `Sheet1`, `Long term opportunities`, `Inter BU`, `Lost opportunities`, `Qtr basis`, `Cross BU opportunities`.

**Tab 1 — `Main sheet`** ("Live opportunities / Leads"). Header row ~row 3; data starts row 4. Columns A→L:
| Col | Field | Type / Notes |
|---|---|---|
| A | SL No. | int |
| B | Opp/Lead No. | string, e.g. `O-ATBU-022026-0015` (unique key) |
| C | Customer | string, e.g. Tata Steel-TSK, IOCL, BPCL Mumbai refinery, Indorama, KNPC, KBL |
| D | Enquiry description | string |
| E | Tentative value (INR in Cr) | float, e.g. 4, 17, 0.5, 0.25 |
| F | Opportunity | string multiplier: `5X`, `7X`, `10X`, `15X` |
| G | Progress | int (0/1) |
| H | Expected | quarter: `Q1`–`Q4` |
| I | Present status | free text, e.g. "Price submitted, awaiting client's feedback" |
| J | Timeline | date `dd.mm.yyyy`, e.g. 10.07.2026 |
| K | Delivery team involved | string |
| L | Sales team involved | string |
Rows may have colored cells (red/green highlights) and `#REF!` errors — handle gracefully (skip blank Opp/Lead No. rows; treat `#REF!` as null). Dashboard displays columns **A through J** per row; K/L available in a row-detail view.

**Tab 2 — `Inter BU`** (monthly cadence meetings with BUs, PMs, SMG members). Columns:
`SL No. | BUs | Team members involved | Meeting status | Projects | Service Lines | Status | Stage | Responsible | Target date | Tentative value (INR in Cr) | Name`
- Grouping row `Domestic` under BUs; BU values e.g. `HCBU` (Satyajit and team), `PBU` (Ganga). Multiple projects per BU (Chambal Fertilizer, Asian Paints, Matix Fertilizer, DCM Shriram, ISW Power, Adani Power, Tata Power…). `Meeting status` = e.g. "Meeting done" (green cell). `Stage` values like `20X`. Status = free text ("Customer contacted, first meeting to be conducted").

**Tab `Lost opportunities`**: same shape as Main sheet; rows tagged Lost land here.

---

## PHASE 0 — Scaffold & ingestion
1. Repo layout: `/backend` (FastAPI), `/frontend` (Vite React), `/data` (drop-in xlsx), `README.md` (run instructions ≤15 lines).
2. `WorkbookSource` interface + `LocalFileSource` implementation. Parser that reads `Main sheet`, `Inter BU`, `Lost opportunities` into typed Pydantic models per the schema above. Tolerate: merged cells, blank rows, `#REF!`, `dd.mm.yyyy` and Excel-serial dates.
3. SQLite tables: `opportunities_snapshot`, `interbu_snapshot`, `change_log`, `alerts`. On each scan, upsert current rows keyed by `Opp/Lead No.` (Main) and `BU+Project` (Inter BU).
4. Endpoint `GET /api/health` and `POST /api/rescan` (manual re-parse). APScheduler job re-scans `./data/*.xlsx` every 60s (mtime check first; skip if unchanged).
**Accept when:** dropping a sample xlsx in `./data` and calling `/api/rescan` returns parsed row counts for all 3 tabs; malformed rows logged, not fatal. Generate `./data/sample.xlsx` with 12 realistic Main-sheet rows + 8 Inter BU rows matching the schema for testing.

## PHASE 1 — Live Opportunities dashboard (read-only)
1. `GET /api/opportunities` (filters: customer, expected quarter, value range, status text search, overdue flag; sort by timeline/value).
2. Frontend page **"Live Opportunities"**: KPI cards (total count, total tentative value ₹Cr, count due this week, overdue count) + table of columns A→J. Row click → drawer with all fields incl. Delivery/Sales team. Color coding: timeline past due = red badge; due within 7 days = amber; else neutral.
3. Charts: value by Customer (bar), count by Expected quarter (bar), pipeline by Opportunity multiple (5X/7X/10X/15X donut).
**Accept when:** editing sample.xlsx (change a value, save) is reflected in UI within one rescan cycle without restart.

## PHASE 2 — Change log (audit trail)
Requirement (verbatim from stakeholder): *"Suppose the timeline was 10.07.2026 and I extended it to 16.07 — the moment I open the dashboard, it should show: this was supposed to be done on 10.07, Saikat changed it on <date>. A log for every opportunity."*
1. On each rescan, diff new snapshot vs stored snapshot per `Opp/Lead No.`; for every changed field write `change_log(opp_id, field, old_value, new_value, detected_at, changed_by)`. `changed_by` = Excel `lastModifiedBy` metadata if available, else "workbook edit" (leave a TODO hook for SharePoint version history later).
2. New rows → log "created"; rows whose `Present status`/tag becomes `Lost` OR that move to the `Lost opportunities` tab → log "marked lost", exclude from live view, show under a **Lost** tab in UI (with date lost).
3. UI: per-opportunity "History" timeline in the row drawer + a global "Recent changes" feed on the dashboard home (last 20 changes: "Timeline for O-ATBU-022026-0015 moved 10.07.2026 → 16.07.2026").
**Accept when:** changing one timeline + marking one row lost in sample.xlsx produces exactly those two log entries and the lost row disappears from live view.

## PHASE 3 — "This Week" panel + overdue triggers
Requirements (verbatim): *"This week what are my activities — e.g. 5 activities this week — those 5 priority opportunities and what we need to do should be reflected, and update when I change a timeline."* And: *"If an opportunity is 15 days beyond the due date and nothing has been done, it should give me a trigger/notification: your activity was supposed to be done on 30.06 and you have not done anything."*
1. `GET /api/this-week`: opportunities with Timeline within current Mon–Sun week → panel at top of dashboard listing customer, enquiry, present status (the "what we need to do"), timeline. Auto-recomputes on rescan. Show week range and count ("5 activities this week").
2. Alert engine on each rescan: for each live opportunity where `today - Timeline >= 15 days` AND no change_log entry for that opp since Timeline date → insert into `alerts` (idempotent, one open alert per opp). Alert text: "Activity for <Opp/Lead No.> (<Customer>) was due <Timeline>; no update for <N> days."
3. UI: bell icon with unread count; alerts panel; dismiss/acknowledge. Also flag alerted rows in the table.
**Accept when:** a sample row dated 16+ days ago with no changes produces exactly one alert; updating that row's status in xlsx closes it (log entry exists → alert auto-resolves on next rescan).

## PHASE 4 — Inter BU monthly cadence module
Requirements (verbatim): *"Every month we do a cadence call with all BUs and SMG members. When I click a BU, I should see for that particular meeting/month: what meeting was done, the discussions/action points, and the target date — three things: Meeting status, Discussions, Target date. It should come out as a report of that month's meeting which I will send to the team."*
1. Page **"Inter BU"**: cards or accordion per BU (HCBU, PBU, …) grouped Domestic/International, listing that BU's projects with Meeting status (green if "Meeting done"), Status, Stage, Responsible, Target date.
2. Month selector (default current month). Clicking a BU opens its monthly meeting view with the three sections: **Meeting status**, **Discussions / action points** (editable text stored in SQLite per BU+month, since the sheet holds only status), **Target date**.
3. **Report generation**: button "Generate monthly report" → `GET /api/interbu/report?bu=&month=` returns a clean printable HTML report (BU, month, meetings done, per-project: discussion points, actions, target dates, responsible). Provide "Download PDF" (render via headless print CSS or `weasyprint`) and a `mailto:` compose stub prefilled with subject "Inter BU cadence – <BU> – <Month>" (real SMTP/Graph email = later phase; leave `EmailSender` interface + TODO).
**Accept when:** selecting HCBU + a month shows its projects, edited discussion notes persist across restarts, and the report renders with all three required sections.

## PHASE 5 — Polish & handover
1. Empty/error states, loading skeletons, mobile-usable layout, ₹ Cr number formatting, `dd.mm.yyyy` display everywhere.
2. `README.md`: how to run backend+frontend, where to drop the xlsx, how the rescan works, and the two extension points (`WorkbookSource` → SharePoint Graph API; `EmailSender` → SMTP/Graph).
3. Quick smoke test script that seeds sample.xlsx, triggers rescan, and asserts: row counts, one change-log diff, one alert, one report render.
**Accept when:** smoke test passes clean on a fresh clone.

## GLOBAL RULES
- Never invent columns; use the schema above verbatim. Unknown/extra columns → ignore.
- Dates are `dd.mm.yyyy`; the workbook is the single source of truth for opportunity data — the app writes only logs, alerts, and meeting notes to SQLite, never back to Excel.
- Keep every response concise: code + one-line explanations only. No long prose.
- If a real workbook is provided later, re-run the parser against it before continuing and report any schema mismatches instead of silently coercing.

## OPEN ITEMS TO CONFIRM WITH ME BEFORE PHASE 4 COMPLETION (ask, don't assume)
1. Email sending: mailto stub OK for v1, or wire SMTP/Microsoft Graph now?
2. "Changed by" attribution: is SharePoint version history access available, or is file-level author metadata acceptable?
3. Should the Qtr basis / Cross BU / Long term tabs be added as read-only views in a later phase?
