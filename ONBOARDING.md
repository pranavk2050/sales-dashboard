# Opportunity & Lead Tracker Dashboard — Onboarding

## What this is

An internal dashboard for tracking sales opportunities/leads, lost deals, and the Inter BU
monthly cadence calls. It started as a read-only mirror of an Excel workbook
(`Opportunity and lead tracker sheet_Digital.xlsx`) but **Excel has since been retired** — the
dashboard's own database is now the single source of truth. All day-to-day work (adding leads,
updating status, marking things lost, managing Inter BU projects) happens directly in the UI.

Stack: FastAPI + SQLite backend, React (Vite) + Tailwind + Recharts frontend. Per-user login
(email + password) gates the whole app — no self-serve signup; accounts are created via a CLI
script (see **Accounts** below). The signed-in user's name is what's credited in the audit trail.

## Quick start

**Backend** (from repo root):
```
cd backend
py -m venv .venv                                   # first time only
./.venv/Scripts/pip install -r requirements.txt     # first time only
./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal, from repo root):
```
cd frontend
npm install     # first time only
npm run dev
```
Open **http://localhost:5173**. The dev server proxies `/api/*` to port 8000, so both processes
need to be running.

There's no production build/deploy configured yet — this runs as two local dev processes.

## Accounts

No self-serve signup — create each teammate's account from `backend/` with the venv active:
```
./.venv/Scripts/python scripts/create_user.py --email you@example.com --name "Your Name"
```
Prompts for a password (never a CLI arg, so it doesn't land in shell history). Add
`--update-password` to reset an existing account. Sessions are opaque tokens in a `sessions`
table (14-day expiry) validated against an httpOnly cookie — no JWT, no signing secret to manage;
logout/revocation is a real row delete.

## Using the dashboard

- **Live Opportunities** — the main pipeline view. KPI cards, charts, filters, a "This Week"
  panel, and a "Recent changes" audit feed. Click any row to view/edit it, or "Add opportunity"
  to create a new one. Each row has a "Mark as Lost" action (asks for a reason, moves it to the
  Lost tab).
- **Lost** — opportunities that were marked lost, plus a direct "Add lost record" for entries
  that never went through the live pipeline.
- **Inter BU** — monthly cadence view, grouped by BU (Domestic/ISMG/etc). Expand a BU to see its
  projects, edit/add projects, write discussion notes for the month, generate a printable report,
  or open a pre-filled `mailto:` to send it to the team.
- **Alerts (bell icon)** — flags any live opportunity that's 15+ days past its timeline with no
  recorded activity. Dismiss to clear it from the badge.
- **History** — every opportunity's drawer has a History timeline showing who changed what and
  when — the name comes from the authenticated session, not a self-reported label.

## Architecture

```
backend/app/
  main.py            FastAPI app, lifespan, background alert-recompute job (60s interval),
                     auth_router registered unprotected + dependencies=[Depends(get_current_user)]
                     on every other router
  auth.py            Password hashing (bcrypt), session cookie creation/validation, CurrentUser
  db.py              All SQLite schema + queries (single dashboard.db file, see below)
  models.py          Pydantic models used by the (now dormant) ingestion pipeline
  change_tracking.py Field-diff → change_log helper, shared by create/edit endpoints
  alerts.py          Overdue-with-no-activity alert engine
  interbu_report.py  Printable HTML report generator for Inter BU
  email_sender.py    EmailSender interface stub (not wired to anything real yet)
  routers/           auth.py (login/logout/me, unprotected), opportunities.py, changes.py
                     (lost + history), this_week.py, alerts.py, interbu.py
  ingestion/         DORMANT — Excel parsing (WorkbookSource/LocalFileSource + parser.py).
                     Kept in the repo in case a bulk re-import is ever needed again; nothing in
                     main.py calls it anymore.

backend/scripts/
  create_user.py     Bootstraps/resets a login account (getpass-prompted password)
  generate_sample.py Generates a sample workbook for the dormant ingestion pipeline

frontend/src/
  pages/             LiveOpportunities.jsx, LostOpportunities.jsx, InterBU.jsx, Login.jsx
  components/        Tables, drawers/forms (OpportunityDrawer, LostOpportunityDrawer,
                     InterBUProjectDrawer), charts/, AlertsBell
  hooks/             useOpportunities/useLostOpportunities/useInterBU — poll every 20s, expose
                     reload(); useAuth.js — session status + login/logout
  lib/               api.js (all fetch calls, routed through apiFetch.js), apiFetch.js
                     (credentials:'include' + global 401 handling), auth.js, format.js, etc.
```

**Database**: `backend/dashboard.db` (SQLite, gitignored). This is now **the only copy of the
data** — back it up regularly (it's a single file, trivial to copy). Key tables:
`opportunities_snapshot`, `lost_snapshot`, `interbu_snapshot`, `interbu_monthly_notes`,
`change_log` (audit trail), `alerts`, `users`, `sessions`.

## Extension points

- **`WorkbookSource`** (`backend/app/ingestion/base.py`) — swap `LocalFileSource` for a
  SharePoint/Microsoft Graph implementation if Excel import is ever needed again. Currently
  unwired from `main.py`.
- **`EmailSender`** (`backend/app/email_sender.py`) — replace the Inter BU report's `mailto:`
  stub with real SMTP/Graph sending.

## Known limitations (by design, not oversight)

- **Invite-only, no self-serve signup.** Accounts are created via `create_user.py`; there's no
  "forgot password" flow beyond re-running that script with `--update-password`.
- **No hard delete.** Opportunities are "removed" by marking them lost; Inter BU/Lost records
  can be edited but not deleted.
- **`sl_no`** is mostly meaningless — it was a broken/legacy column in the original workbook
  (`#REF!` errors) and isn't used for anything functional.
- **Single SQLite file, single process.** Fine for a small team; would need real infra
  (Postgres, auth, deployment) to scale beyond that.

## History / why some things look the way they do

Built in phases against a real, messy Excel workbook (duplicate IDs, inconsistent columns, blank
lead numbers) — see `dashboard_build_prompt.md` for the original spec if you want the full
history. The parser/synthetic-key logic in `app/ingestion/` reflects real quirks found in that
workbook and is worth reading before ever re-enabling it.
