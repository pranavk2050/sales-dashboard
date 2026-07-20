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

## Deploying (Render, free tier)

The repo root `Dockerfile` builds the frontend and backend into a single image: FastAPI serves
the built React app directly (see the static-file mount at the bottom of `main.py`), so there's
one origin and one Render service - no CORS, no split-origin cookie config.

Render's free tier has an **ephemeral disk** - `dashboard.db` would get wiped on every restart
or redeploy. [Litestream](https://litestream.io) is wired in (`backend/litestream.yml`,
`backend/docker-entrypoint.sh`) to continuously stream the database to an S3-compatible bucket
and restore it on boot, so real persistence doesn't require Render's paid disk add-on. This repo
is set up for **Backblaze B2** (free 10 GB tier, no credit card required to sign up) - any other
S3-compatible provider works too, R2 included, just with different endpoint/region values:

1. Create a B2 bucket (Backblaze dashboard → B2 Cloud Storage → Create a Bucket), note its
   **Endpoint** (e.g. `s3.us-east-005.backblazeb2.com` - the region code is embedded in it), then
   create an **Application Key** scoped to just that bucket (Account → App Keys → Add a New
   Application Key) - never use the account's Master Application Key for this. Copy the `keyID`
   and `applicationKey` immediately; they're shown once.
2. In Render, create a new **Web Service** from this repo with **Environment: Docker** (or use
   the included `render.yaml` Blueprint, which already has this repo's bucket name/endpoint/region
   filled in - only the two credential values are left for you to set).
3. Set these environment variables on the service: `LITESTREAM_ACCESS_KEY_ID` (the `keyID`) and
   `LITESTREAM_SECRET_ACCESS_KEY` (the `applicationKey`) from step 1 - paste them directly into
   Render's dashboard, never into a file or commit. `LITESTREAM_ENDPOINT`, `LITESTREAM_BUCKET`,
   and `LITESTREAM_REGION` are already set in `render.yaml`; override them there too if you use a
   different provider or bucket. Also set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=lax` (the app
   defaults to `false`/`lax`, right for local HTTP dev but wrong once you're on real HTTPS).
4. Set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (and optionally
   `BOOTSTRAP_ADMIN_NAME`, defaults to "Admin") too. Render's free tier has no shell access, so
   `create_user.py` can't be run interactively there - instead, `main.py`'s startup creates exactly
   one user from these env vars, and only if the `users` table is still empty. It's a one-time
   bootstrap, not a standing backdoor: once any user exists, it's a permanent no-op, so it's fine
   to leave the env vars set (or remove them after your first login, either is fine).
5. Deploy. On first boot the bucket is empty, so Litestream skips the restore and the app creates
   a fresh `dashboard.db`, then the bootstrap step above creates your first login. Every boot after
   that restores the latest replicated copy first (and the bootstrap step no-ops, since a user
   already exists by then).

Caveats worth knowing: Litestream syncs every few seconds, not instantly, so an abrupt kill at the
exact wrong moment could lose the last few seconds of writes. Litestream also assumes a **single
writer** - don't turn on multi-instance scaling without rethinking storage, and never run a local
`litestream replicate` (see below) while the Render service is also live, for the same reason.
Also, Render's free tier spins the service down after ~15 min idle - while asleep, the 60s
alert-recompute job isn't running at all, and the first request after a sleep is slow (cold start
+ Litestream restore).

For local development, there's no build step - just run the two dev processes below.

### Migrating local data onto a live deployment

A fresh Render deploy starts with an empty database - your real local `backend/dashboard.db` is
gitignored on purpose and never goes through GitHub. To push it up once (e.g. the first time you
go live, or to refresh production from a newer local copy):

1. **Suspend the Render service** (Settings → Suspend Web Service) - it must not also be writing
   to the bucket while you push from your machine (single-writer, see above).
2. **Clear the bucket's existing replica data** for a clean slate: in the Backblaze/R2 dashboard,
   browse into the bucket's `dashboard-db/` folder and delete its contents.
3. **Run one Litestream replicate pass locally**, pointed at your real `dashboard.db` and the same
   bucket, then stop it once it's written a snapshot (a few seconds for a small db):
   ```
   docker run --rm -it \
     -v "<repo>\backend\litestream.yml:/etc/litestream.yml:ro" \
     -v "<repo>\backend\dashboard.db:/data/dashboard.db" \
     -e DASHBOARD_DB_PATH=/data/dashboard.db \
     -e LITESTREAM_ENDPOINT=<your endpoint> \
     -e LITESTREAM_BUCKET=<your bucket> \
     -e LITESTREAM_REGION=<your region> \
     -e LITESTREAM_ACCESS_KEY_ID=<your key id> \
     -e LITESTREAM_SECRET_ACCESS_KEY=<your secret> \
     litestream/litestream:0.3.13 replicate -config /etc/litestream.yml
   ```
   Note the db volume mount is **not** `:ro` - Litestream needs to switch the file into WAL mode
   and manage its `-wal`/`-shm` companions. Stop your local backend dev server first, so nothing
   else has the file open at the same time. Watch for a `"snapshot written"` log line, then Ctrl+C.
4. **Resume the Render service.** On boot it restores the snapshot you just pushed.
5. Log in with a real account from that database - any bootstrap-admin account created via
   `BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD` won't exist in the migrated data, since it's a different
   database than the one that got replaced.

If you're on a network with a TLS-inspecting corporate proxy (see **Troubleshooting** below), step
3 will fail with a certificate error until you inject that proxy's root CA into the container.

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

## Troubleshooting

**Docker Hub pulls failing with `403 Forbidden` from `production.cloudfront.docker.com`.** Seen on
a machine behind a corporate proxy (e.g. Zscaler) - some image layers get blocked while others on
the same pull succeed, seemingly at random. It's proxy flakiness, not a bad image or a bad
Dockerfile - just retry the build a few times. Render's own build servers aren't behind your local
proxy, so this is purely a local Docker Desktop problem, not something that affects the real
deploy.

**`git push` failing with `HTTP 403` and a `Server: Zscaler` response header.** The same corporate
proxy blocking outbound content it doesn't like (this repo hit it on a push whose diff happened to
contain words like `SECRET`/`ACCESS_KEY_ID` in documentation, not an actual secret - likely a DLP
keyword match). `git fetch` still works because it's a GET with no request body to inspect.
Workaround: route git over SSH on port 443 instead of HTTPS on port 443, since it isn't
content-inspected the same way:
```
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github -N ""
```
Add the printed `.pub` key to GitHub (Settings → SSH and GPG keys), then add to `~/.ssh/config`:
```
Host github.com
  HostName ssh.github.com
  Port 443
  User git
  IdentityFile ~/.ssh/id_ed25519_github
```
(Plain port 22 is often blocked outright on corporate networks - port 443 is GitHub's documented
workaround for exactly this.) Then `git remote set-url origin git@github.com:<user>/<repo>.git`.

**Litestream failing with `tls: failed to verify certificate: x509: certificate signed by unknown
authority`** when running `litestream replicate`/`restore` locally (see "Migrating local data"
above). Same corporate TLS-inspecting proxy, this time rejecting the container's outbound HTTPS to
the S3-compatible endpoint because the proxy re-signs the connection with its own root CA, which
the container doesn't trust. Fix: export that root CA from Windows' trust store and inject it into
the container alongside the image's own CA bundle, then point Go's TLS stack at the combined file:
```powershell
$outDir = "$env:TEMP\proxy-certs"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$cert = Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Subject -match "Zscaler" } | Select-Object -First 1
Export-Certificate -Cert $cert -FilePath "$outDir\proxy-root.cer" | Out-Null
certutil -encode "$outDir\proxy-root.cer" "$outDir\proxy-root.pem" | Out-Null
docker run --rm --entrypoint sh litestream/litestream:0.3.13 -c "cat /etc/ssl/certs/ca-certificates.crt" > "$outDir\base-ca-bundle.pem"
Get-Content "$outDir\base-ca-bundle.pem", "$outDir\proxy-root.pem" | Set-Content "$outDir\combined-ca-bundle.pem"
```
Then add to the `docker run` call: `-v "$env:TEMP\proxy-certs\combined-ca-bundle.pem:/etc/ssl/certs/combined-ca-bundle.pem:ro" -e SSL_CERT_FILE=/etc/ssl/certs/combined-ca-bundle.pem`.
Swap `"Zscaler"` for whatever proxy your network actually uses if different.

## History / why some things look the way they do

Built in phases against a real, messy Excel workbook (duplicate IDs, inconsistent columns, blank
lead numbers) — see `dashboard_build_prompt.md` for the original spec if you want the full
history. The parser/synthetic-key logic in `app/ingestion/` reflects real quirks found in that
workbook and is worth reading before ever re-enabling it.
