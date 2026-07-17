"""Parses Main sheet, Lost opportunities, and Inter BU tabs. Ignores all other tabs.

Column layouts below are taken from the real "Opportunity and lead tracker sheet_Digital.xlsx"
workbook, not the original written spec - Lost opportunities in particular uses a completely
different column order than Main sheet, and Inter BU has two extra columns (Present Status,
Designation) that shift everything after "Meeting status" by one position.
"""
import hashlib

from ..models import InterBURow, LostOpportunityRow, MainSheetRow, ParseResult, ParseWarning
from .dates import clean_value, parse_date, safe_float, safe_int

NON_ID_PLACEHOLDERS = {"ytr"}  # "Yet To Raise" - not a real Opp/Lead No., must not be used as a key


def _merged_grid(ws) -> dict[tuple[int, int], object]:
    """Resolve merged cell ranges so every cell in a merge carries the top-left value."""
    grid = {}
    for row in ws.iter_rows():
        for cell in row:
            grid[(cell.row, cell.column)] = cell.value
    for merged_range in ws.merged_cells.ranges:
        min_col, min_row, max_col, max_row = merged_range.bounds
        top_value = grid.get((min_row, min_col))
        for r in range(min_row, max_row + 1):
            for c in range(min_col, max_col + 1):
                grid[(r, c)] = top_value
    return grid


def _find_header_row(grid: dict, key_col: int, needle: str, default: int, search_rows: int = 6) -> int:
    for r in range(1, search_rows + 1):
        value = grid.get((r, key_col))
        if value and needle in str(value).lower():
            return r
    return default


def _resolve_opp_lead_no(raw, sheet_tag: str, row: int, *identity_parts: object) -> tuple[str, bool]:
    """Returns (key, is_synthetic). Blank or placeholder ("YTR") Opp/Lead No. values get a
    stable synthetic key so the row still surfaces as a "Lead" instead of being dropped.

    The synthetic key is derived from stable row content (e.g. customer + description), NOT
    row number - row number shifts whenever an unrelated row elsewhere in the sheet is added
    or deleted, which would otherwise make one lead's history look like a totally different
    lead's, or silently merge two unrelated leads together across scans.
    """
    cleaned = clean_value(raw)
    if cleaned and str(cleaned).strip().lower() not in NON_ID_PLACEHOLDERS:
        return str(cleaned), False
    basis = "|".join(str(clean_value(p)) for p in identity_parts if clean_value(p) is not None)
    if basis:
        digest = hashlib.sha1(basis.strip().lower().encode()).hexdigest()[:10]
        return f"LEAD-{sheet_tag}-{digest}", True
    return f"LEAD-{sheet_tag}-ROW{row}", True  # last resort: row has no identifying content at all


def _row_has_content(grid: dict, row: int, cols: list[int]) -> bool:
    return any(clean_value(grid.get((row, c))) is not None for c in cols)


def _dedupe_key(key: str, is_synthetic: bool, seen: dict[str, int]) -> tuple[str, bool, bool]:
    """Two real rows can share a literal Opp/Lead No. (a data-entry typo in the source sheet).
    Returns (key, is_synthetic, was_duplicate) - a duplicate real key gets a disambiguating
    suffix so both rows still surface, and is treated the same as a synthetic id in the UI."""
    seen[key] = seen.get(key, 0) + 1
    if seen[key] == 1:
        return key, is_synthetic, False
    return f"{key}#{seen[key]}", True, True


def parse_main_sheet(ws) -> tuple[list[MainSheetRow], list[ParseWarning]]:
    grid = _merged_grid(ws)
    header_row = _find_header_row(grid, key_col=2, needle="opp", default=3)
    data_start = header_row + 1
    content_cols = [3, 4, 5, 6, 8, 9, 10, 11, 12]  # everything except SL No. and Opp/Lead No.

    rows: list[MainSheetRow] = []
    warnings: list[ParseWarning] = []
    seen_keys: dict[str, int] = {}

    for r in range(data_start, ws.max_row + 1):
        if not _row_has_content(grid, r, [2] + content_cols):
            continue  # truly blank spacer row

        opp_no, is_synthetic = _resolve_opp_lead_no(
            grid.get((r, 2)), "MAIN", r, grid.get((r, 3)), grid.get((r, 4))
        )
        opp_no, is_synthetic, was_duplicate = _dedupe_key(opp_no, is_synthetic, seen_keys)
        if was_duplicate:
            warnings.append(
                ParseWarning(sheet="Main sheet", row=r, message=f"Duplicate Opp/Lead No. in source sheet, disambiguated as {opp_no}")
            )
        try:
            rows.append(
                MainSheetRow(
                    sl_no=safe_int(grid.get((r, 1))),
                    opp_lead_no=opp_no,
                    has_synthetic_id=is_synthetic,
                    customer=clean_value(grid.get((r, 3))),
                    enquiry_description=clean_value(grid.get((r, 4))),
                    tentative_value_cr=safe_float(grid.get((r, 5))),
                    opportunity_multiplier=clean_value(grid.get((r, 6))),
                    progress=safe_int(grid.get((r, 7))),
                    expected_quarter=clean_value(grid.get((r, 8))),
                    present_status=clean_value(grid.get((r, 9))),
                    timeline=parse_date(grid.get((r, 10))),
                    delivery_team=clean_value(grid.get((r, 11))),
                    sales_team=clean_value(grid.get((r, 12))),
                )
            )
        except Exception as exc:  # malformed row: log, don't fail the whole scan
            warnings.append(ParseWarning(sheet="Main sheet", row=r, message=str(exc)))

    return rows, warnings


def parse_lost_opportunities(ws) -> tuple[list[LostOpportunityRow], list[ParseWarning]]:
    """Real layout: SL NO | Opportunity no. | Customer | Services | Value | Status(*multiplier*) |
    qaurter(*expected quarter*) | Lost reason | date lost | team member | team member | notes."""
    grid = _merged_grid(ws)
    header_row = _find_header_row(grid, key_col=2, needle="opportunity", default=1)
    data_start = header_row + 1
    content_cols = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

    rows: list[LostOpportunityRow] = []
    warnings: list[ParseWarning] = []
    seen_keys: dict[str, int] = {}

    for r in range(data_start, ws.max_row + 1):
        if not _row_has_content(grid, r, [2] + content_cols):
            continue

        # From roughly row 12 on, the real sheet has a stray extra 0/1 flag inserted right
        # after the multiplier column, shifting quarter/lost-reason/date/names one column
        # right for the rest of that row. A real quarter value is always a "Qn" string, so a
        # bare numeric 0/1 in that slot is the tell that this row is shifted.
        maybe_quarter = clean_value(grid.get((r, 7)))
        shifted = isinstance(maybe_quarter, (int, float)) and maybe_quarter in (0, 1)
        quarter_col, reason_col, date_col, t1_col, t2_col, notes_col = (
            (8, 9, 10, 11, 12, 13) if shifted else (7, 8, 9, 10, 11, 12)
        )

        opp_no, is_synthetic = _resolve_opp_lead_no(
            grid.get((r, 2)), "LOST", r, grid.get((r, 3)), grid.get((r, 4))
        )
        opp_no, is_synthetic, was_duplicate = _dedupe_key(opp_no, is_synthetic, seen_keys)
        if was_duplicate:
            warnings.append(
                ParseWarning(sheet="Lost opportunities", row=r, message=f"Duplicate Opp/Lead No. in source sheet, disambiguated as {opp_no}")
            )
        try:
            quarter_val = clean_value(grid.get((r, quarter_col)))
            rows.append(
                LostOpportunityRow(
                    sl_no=safe_int(grid.get((r, 1))),
                    opp_lead_no=opp_no,
                    has_synthetic_id=is_synthetic,
                    customer=clean_value(grid.get((r, 3))),
                    description=clean_value(grid.get((r, 4))),
                    tentative_value_cr=safe_float(grid.get((r, 5))),
                    opportunity_multiplier=clean_value(grid.get((r, 6))),
                    expected_quarter=str(quarter_val) if quarter_val is not None else None,
                    lost_reason=clean_value(grid.get((r, reason_col))),
                    date_lost=parse_date(grid.get((r, date_col))),
                    team_member_1=clean_value(grid.get((r, t1_col))),
                    team_member_2=clean_value(grid.get((r, t2_col))),
                    notes=clean_value(grid.get((r, notes_col))),
                )
            )
        except Exception as exc:
            warnings.append(ParseWarning(sheet="Lost opportunities", row=r, message=str(exc)))

    return rows, warnings


def parse_interbu(ws) -> tuple[list[InterBURow], list[ParseWarning]]:
    """Real layout: SL No. | BUs | Team members | Meeting status | Present Status(*discussion
    notes*) | Projects | Service Lines | Status | Stage | Responsibility | Target date |
    Tentative value | Name | Designation."""
    grid = _merged_grid(ws)
    header_row = _find_header_row(grid, key_col=1, needle="sl", default=1)
    data_start = header_row + 1
    all_cols = list(range(1, 15))

    rows: list[InterBURow] = []
    warnings: list[ParseWarning] = []
    current_group: str | None = None
    current_bu: str | None = None

    for r in range(data_start, ws.max_row + 1):
        if not _row_has_content(grid, r, all_cols):
            continue  # fully blank row

        bu_val = clean_value(grid.get((r, 2)))
        other_cols = [c for c in all_cols if c != 2]
        row_is_group_header = bu_val and not _row_has_content(grid, r, other_cols)
        if row_is_group_header:
            current_group = bu_val
            continue

        if bu_val:
            current_bu = bu_val

        team_members = clean_value(grid.get((r, 3)))
        meeting_status = clean_value(grid.get((r, 4)))
        present_status = clean_value(grid.get((r, 5)))
        project_val = clean_value(grid.get((r, 6)))

        if not project_val:
            # A BU/team status update with no specific project attached (e.g. a regional lead's
            # own meeting note) - still surface it, keyed under a placeholder project so it
            # doesn't collide with a same-BU row that does have a real project.
            label = team_members or meeting_status or "status update"
            project_val = f"(General - {label})"

        try:
            rows.append(
                InterBURow(
                    sl_no=safe_int(grid.get((r, 1))),
                    group_label=current_group,
                    bu=current_bu,
                    team_members=team_members,
                    meeting_status=meeting_status,
                    present_status=present_status,
                    project=project_val,
                    service_lines=clean_value(grid.get((r, 7))),
                    status=clean_value(grid.get((r, 8))),
                    stage=clean_value(grid.get((r, 9))),
                    responsible=clean_value(grid.get((r, 10))),
                    target_date=parse_date(grid.get((r, 11))),
                    tentative_value_cr=safe_float(grid.get((r, 12))),
                    name=clean_value(grid.get((r, 13))),
                    designation=clean_value(grid.get((r, 14))),
                )
            )
        except Exception as exc:
            warnings.append(ParseWarning(sheet="Inter BU", row=r, message=str(exc)))

    return rows, warnings


def parse_workbook(wb) -> ParseResult:
    result = ParseResult()

    if "Main sheet" in wb.sheetnames:
        rows, warns = parse_main_sheet(wb["Main sheet"])
        result.main_sheet_rows = rows
        result.warnings += warns

    if "Lost opportunities" in wb.sheetnames:
        rows, warns = parse_lost_opportunities(wb["Lost opportunities"])
        result.lost_rows = rows
        result.warnings += warns

    if "Inter BU" in wb.sheetnames:
        rows, warns = parse_interbu(wb["Inter BU"])
        result.interbu_rows = rows
        result.warnings += warns

    return result
