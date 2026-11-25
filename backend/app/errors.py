class DomainError(Exception):
    """An expected business error. The API turns it into {"error": {"code", "message", "details"}}."""

    def __init__(self, status_code: int, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}
