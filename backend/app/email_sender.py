"""Extension point for real email delivery. v1 uses a mailto: compose stub on the frontend
instead (see Inter BU report UI) - no email is sent by the backend yet.

TODO: implement an SMTPEmailSender or GraphEmailSender and wire it into the Inter BU report
endpoint (or a dedicated /api/interbu/report/send endpoint) once real sending is needed.
"""
from abc import ABC, abstractmethod


class EmailSender(ABC):
    @abstractmethod
    def send(self, to: list[str], subject: str, html_body: str) -> None: ...
