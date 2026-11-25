"""Sending the 6-digit login code."""
import logging
import smtplib
from email.message import EmailMessage
from functools import lru_cache
from typing import Protocol

from ..config import settings

log = logging.getLogger("accommodation.email")


class EmailSender(Protocol):
    def send_otp(self, to_email: str, code: str, ttl_minutes: int) -> None: ...


class ConsoleEmailSender:
    """Development only: writes the code to the server log instead of sending an email."""

    def send_otp(self, to_email: str, code: str, ttl_minutes: int) -> None:
        log.warning("LOGIN CODE for %s: %s (valid %s minutes)", to_email, code, ttl_minutes)


class SmtpEmailSender:
    def send_otp(self, to_email: str, code: str, ttl_minutes: int) -> None:
        msg = EmailMessage()
        msg["Subject"] = "Your Accommodation login code"
        msg["From"] = settings.smtp_from
        msg["To"] = to_email
        msg.set_content(f"Your login code is {code}. It is valid for {ttl_minutes} minutes. If you did not try to log in, ignore this email.")
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(msg)


@lru_cache
def build_email_sender() -> EmailSender:
    return SmtpEmailSender() if settings.email_backend == "smtp" else ConsoleEmailSender()
