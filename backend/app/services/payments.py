"""Payment gateway adapter.

MockPaymentGateway stands in for the INR gateway reused from the Transportation service.
Replace it with the real adapter that implements the same two methods.
A payment_token that starts with "tok_fail" is declined, which makes failure paths easy to test.
"""
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol


@dataclass
class GatewayResult:
    success: bool
    reference: str | None = None
    error: str | None = None


class PaymentGateway(Protocol):
    def charge(self, amount: Decimal, currency: str, token: str) -> GatewayResult: ...
    def refund(self, reference: str, amount: Decimal) -> GatewayResult: ...


class MockPaymentGateway:
    def charge(self, amount: Decimal, currency: str, token: str) -> GatewayResult:
        if currency != "INR":
            return GatewayResult(False, error="Only INR is supported")
        if token.startswith("tok_fail"):
            return GatewayResult(False, error="Card declined (mock)")
        return GatewayResult(True, reference=f"MOCK-{uuid.uuid4().hex[:12].upper()}")

    def refund(self, reference: str, amount: Decimal) -> GatewayResult:
        return GatewayResult(True, reference=f"REF-{uuid.uuid4().hex[:12].upper()}")
