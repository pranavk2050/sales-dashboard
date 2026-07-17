"""WorkbookSource: abstraction so SharePoint/Graph API can replace local files later."""
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class WorkbookRef:
    id: str  # opaque identifier the source understands (e.g. file path, or Graph item id)
    display_name: str
    mtime: float  # unix timestamp, used for change detection


class WorkbookSource(ABC):
    @abstractmethod
    def list_workbooks(self) -> list[WorkbookRef]:
        """Return all workbooks this source currently exposes."""

    @abstractmethod
    def load_workbook(self, ref: WorkbookRef):
        """Return an openpyxl Workbook (data_only=True) for the given ref."""
