from datetime import date, datetime, timedelta
from typing import Optional

EXCEL_EPOCH = datetime(1899, 12, 30)  # openpyxl serial-date origin
ERROR_STRINGS = {"#REF!", "#N/A", "#VALUE!", "#DIV/0!", "#NULL!", "#NAME?", "#NUM!"}
DATE_FORMATS = ("%d.%m.%Y", "%d.%m.%y", "%Y-%m-%d", "%d/%m/%Y")


def clean_value(value):
    """Treat blank strings and Excel error strings as None; strip whitespace."""
    if value is None:
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text or text.upper() in ERROR_STRINGS:
            return None
        return text
    return value


def safe_int(value) -> Optional[int]:
    value = clean_value(value)
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def safe_float(value) -> Optional[float]:
    value = clean_value(value)
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_date(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)):
        try:
            return (EXCEL_EPOCH + timedelta(days=float(value))).date()
        except (OverflowError, ValueError):
            return None
    if isinstance(value, str):
        text = value.strip()
        if not text or text.upper() in ERROR_STRINGS:
            return None
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(text, fmt).date()
            except ValueError:
                continue
        return None
    return None
