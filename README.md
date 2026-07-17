# Opportunity & Lead Tracker Dashboard

**Backend:** `cd backend && py -m venv .venv && ./.venv/Scripts/pip install -r requirements.txt`
Then run: `./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000`

**Frontend:** `cd frontend && npm install && npm run dev` (proxies `/api` to port 8000)

**Data:** the dashboard is the system of record — add/edit opportunities, mark them lost, and
manage Inter BU projects directly in the UI (no Excel round-trip). A background job just
recomputes overdue alerts every 60s; there's no rescan step. The first time you use the app it
asks for your name once (stored in the browser) so edits are credited in the History timeline.

**Extension points:** `WorkbookSource`/the ingestion pipeline (`backend/app/ingestion/`) is kept
in the repo but dormant — no longer wired into `main.py` — in case a bulk Excel re-import is ever
needed again (e.g. `backend/scripts/generate_sample.py` still generates a sample workbook for it).
`EmailSender` (`backend/app/email_sender.py`) — swap the Inter BU report's `mailto:` stub for real
SMTP/Graph sending.
