"""Builds the printable Inter BU monthly cadence report - plain HTML with print CSS so
"Download PDF" is just the browser's native print-to-PDF, no extra rendering dependency.
"""
from datetime import datetime
from html import escape

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def format_month(month: str) -> str:
    year, mon = month.split("-")
    return f"{MONTH_NAMES[int(mon) - 1]} {year}"


def format_date(iso: str | None) -> str:
    if not iso:
        return "—"
    y, m, d = iso.split("-")
    return f"{d}.{m}.{y}"


def render_report_html(bu: str, month: str, group_label: str | None, projects: list[dict], notes: str | None) -> str:
    meetings_done = sum(1 for p in projects if (p.get("meeting_status") or "").strip().lower() == "meeting done")
    total = len(projects)
    generated_at = datetime.now().strftime("%d.%m.%Y %H:%M")

    rows_html = "".join(
        f"""
        <tr>
          <td>{escape(p.get('project') or '—')}</td>
          <td>{escape(p.get('meeting_status') or '—')}</td>
          <td>{escape(p.get('status') or p.get('present_status') or '—')}</td>
          <td>{escape(p.get('stage') or '—')}</td>
          <td>{escape(p.get('responsible') or '—')}</td>
          <td>{format_date(p.get('target_date'))}</td>
        </tr>
        """
        for p in projects
    ) or "<tr><td colspan='6' class='empty'>No projects recorded for this BU.</td></tr>"

    notes_html = escape(notes).replace("\n", "<br>") if notes else "<span class='empty'>No discussion notes recorded for this month yet.</span>"

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Inter BU cadence — {escape(bu)} — {escape(format_month(month))}</title>
<style>
  body {{ font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0b0b0b; max-width: 800px; margin: 40px auto; padding: 0 20px; }}
  h1 {{ font-size: 22px; margin-bottom: 4px; }}
  .subtitle {{ color: #52514e; font-size: 14px; margin-bottom: 24px; }}
  h2 {{ font-size: 15px; text-transform: uppercase; letter-spacing: 0.04em; color: #52514e; margin: 28px 0 8px; border-bottom: 1px solid #e1e0d9; padding-bottom: 4px; }}
  .summary {{ font-size: 14px; margin-bottom: 4px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }}
  th, td {{ text-align: left; padding: 6px 8px; border-bottom: 1px solid #e1e0d9; vertical-align: top; }}
  th {{ color: #52514e; font-weight: 600; font-size: 11px; text-transform: uppercase; }}
  .empty {{ color: #898781; font-style: italic; }}
  .notes {{ font-size: 14px; white-space: pre-wrap; line-height: 1.5; }}
  .print-bar {{ margin-bottom: 24px; }}
  .print-bar button {{ font-size: 13px; padding: 6px 14px; border: 1px solid #c3c2b7; border-radius: 6px; background: #fff; cursor: pointer; }}
  .generated {{ margin-top: 40px; font-size: 11px; color: #898781; }}
  @media print {{
    .print-bar {{ display: none; }}
  }}
</style>
</head>
<body>
  <div class="print-bar"><button onclick="window.print()">Print / Save as PDF</button></div>

  <h1>Inter BU cadence — {escape(bu)}</h1>
  <div class="subtitle">{escape(group_label or "")} · {escape(format_month(month))}</div>

  <h2>Meeting status</h2>
  <div class="summary">{meetings_done} of {total} projects show "Meeting done" this cadence.</div>

  <h2>Discussions / action points</h2>
  <div class="notes">{notes_html}</div>

  <h2>Target dates &amp; projects</h2>
  <table>
    <thead>
      <tr><th>Project</th><th>Meeting status</th><th>Status</th><th>Stage</th><th>Responsible</th><th>Target date</th></tr>
    </thead>
    <tbody>
      {rows_html}
    </tbody>
  </table>

  <div class="generated">Generated {generated_at}</div>
</body>
</html>"""
