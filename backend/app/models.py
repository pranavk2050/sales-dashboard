from datetime import date
from typing import Optional

from pydantic import BaseModel


class MainSheetRow(BaseModel):
    """Main sheet tab ("Live opportunities/Leads"), columns A-L."""

    sl_no: Optional[int] = None
    opp_lead_no: str
    has_synthetic_id: bool = False  # True when the sheet had no real Opp/Lead No. (blank or "YTR")
    customer: Optional[str] = None
    enquiry_description: Optional[str] = None
    tentative_value_cr: Optional[float] = None
    opportunity_multiplier: Optional[str] = None
    progress: Optional[int] = None
    expected_quarter: Optional[str] = None
    present_status: Optional[str] = None
    timeline: Optional[date] = None
    delivery_team: Optional[str] = None
    sales_team: Optional[str] = None
    is_lost: bool = False


class LostOpportunityRow(BaseModel):
    """Lost opportunities tab - a genuinely different column layout from Main sheet."""

    sl_no: Optional[int] = None
    opp_lead_no: str
    has_synthetic_id: bool = False
    customer: Optional[str] = None
    description: Optional[str] = None  # "Services" column
    tentative_value_cr: Optional[float] = None
    opportunity_multiplier: Optional[str] = None  # mislabeled "Status" column in the sheet
    expected_quarter: Optional[str] = None  # "qaurter" column
    lost_reason: Optional[str] = None
    date_lost: Optional[date] = None
    team_member_1: Optional[str] = None
    team_member_2: Optional[str] = None
    notes: Optional[str] = None


class InterBURow(BaseModel):
    """Inter BU monthly cadence tab, one row per BU+Project."""

    sl_no: Optional[int] = None
    group_label: Optional[str] = None  # e.g. Domestic / ISMG
    bu: Optional[str] = None
    team_members: Optional[str] = None
    meeting_status: Optional[str] = None
    present_status: Optional[str] = None  # discussion / action-point notes
    project: str  # "(General - <team>)" placeholder when the sheet has no project for this row
    service_lines: Optional[str] = None
    status: Optional[str] = None
    stage: Optional[str] = None
    responsible: Optional[str] = None
    target_date: Optional[date] = None
    tentative_value_cr: Optional[float] = None
    name: Optional[str] = None
    designation: Optional[str] = None


class ParseWarning(BaseModel):
    sheet: str
    row: int
    message: str


class ParseResult(BaseModel):
    main_sheet_rows: list[MainSheetRow] = []
    lost_rows: list[LostOpportunityRow] = []
    interbu_rows: list[InterBURow] = []
    warnings: list[ParseWarning] = []
