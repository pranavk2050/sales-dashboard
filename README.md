# Opportunity & Lead Tracker Dashboard

**Backend:** `cd backend && py -m venv .venv && ./.venv/Scripts/pip install -r requirements.txt`
Then run: `./.venv/Scripts/python -m uvicorn app.main:app --reload --port 8000`

**Frontend:** `cd frontend && npm install && npm run dev` (proxies `/api` to port 8000)

**Data:** the dashboard is the system of record — add/edit opportunities, mark them lost, and
manage Inter BU projects directly in the UI (no Excel round-trip). A background job just
recomputes overdue alerts every 60s; there's no rescan step.

**Accounts:** the app requires login (per-user email + password) — there's no self-serve signup.
Create an account by running, from `backend/` with the venv active:
```
./.venv/Scripts/python scripts/create_user.py --email you@example.com --name "Your Name"
```
It prompts for a password (not passed as an argument, so it never lands in shell history). Add
`--update-password` to the same command to reset an existing account's password. The name you
give becomes the identity shown in the History timeline.

**Extension points:** `WorkbookSource`/the ingestion pipeline (`backend/app/ingestion/`) is kept
in the repo but dormant — no longer wired into `main.py` — in case a bulk Excel re-import is ever
needed again (e.g. `backend/scripts/generate_sample.py` still generates a sample workbook for it).
`EmailSender` (`backend/app/email_sender.py`) — swap the Inter BU report's `mailto:` stub for real
SMTP/Graph sending.

**Deploying:** the root `Dockerfile` builds frontend + backend into one image (FastAPI serves the
built React app, single origin, no CORS needed) and wires in
[Litestream](https://litestream.io) so `dashboard.db` survives Render's free-tier ephemeral disk
by continuously replicating to an S3-compatible bucket (Backblaze B2's free tier, no card
required) and restoring on boot. Since Render's free tier has no shell, the first login is created
from `BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD` env vars instead of running `create_user.py` interactively.
See **ONBOARDING.md → Deploying** for the setup steps and caveats, **→ Migrating local data onto a
live deployment** for pushing a real local `dashboard.db` up once, and **→ Troubleshooting** for
corporate-proxy issues (Docker pull failures, blocked `git push`, Litestream TLS errors) that are
network artifacts, not app bugs. `render.yaml` has the Render Blueprint.
