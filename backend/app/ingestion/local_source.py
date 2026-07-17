from pathlib import Path

import openpyxl

from .base import WorkbookRef, WorkbookSource


class LocalFileSource(WorkbookSource):
    """Reads workbooks from a local directory (manual sync or OneDrive-synced folder)."""

    def __init__(self, directory: Path):
        self.directory = directory

    def list_workbooks(self) -> list[WorkbookRef]:
        refs = []
        for path in sorted(self.directory.glob("*.xlsx")):
            if path.name.startswith("~$"):  # Excel lock file
                continue
            stat = path.stat()
            refs.append(WorkbookRef(id=str(path), display_name=path.name, mtime=stat.st_mtime))
        return refs

    def load_workbook(self, ref: WorkbookRef):
        return openpyxl.load_workbook(ref.id, data_only=True)
