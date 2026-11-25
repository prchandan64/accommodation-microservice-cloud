import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # PostgreSQL Database URL (Local Docker or AWS RDS PostgreSQL)
    # AWS RDS Example: postgresql+psycopg://postgres:<PASSWORD>@<DB_IDENTIFIER>.<REGION>.rds.amazonaws.com:5432/campus_mobility_accommodation?sslmode=require
    database_url: str = "postgresql+psycopg://accommodation:accommodation@localhost:5432/campus_mobility_accommodation"
    
    # AWS RDS Parameters (Optional override)
    aws_rds_endpoint: str = ""
    aws_rds_user: str = ""
    aws_rds_password: str = ""
    aws_rds_db: str = "campus_mobility_accommodation"
    aws_rds_port: int = 5432
    aws_rds_sslmode: str = "require"

    def get_effective_database_url(self) -> str:
        """Returns the AWS RDS URL if RDS parameters are provided, otherwise database_url."""
        if self.aws_rds_endpoint and self.aws_rds_user and self.aws_rds_password:
            return (
                f"postgresql+psycopg://{self.aws_rds_user}:{self.aws_rds_password}@"
                f"{self.aws_rds_endpoint}:{self.aws_rds_port}/{self.aws_rds_db}"
                f"?sslmode={self.aws_rds_sslmode}"
            )
        return self.database_url

    hold_minutes: int = 30            # how long an unpaid bed is held
    expiry_job_seconds: int = 60      # how often old holds are released
    api_prefix: str = "/api/v1/accommodation"

    environment: str = "dev"
    jwt_secret: str = "change-me-in-production"
    jwt_expire_minutes: int = 60
    otp_ttl_seconds: int = 300        # a 6-digit code works for 5 minutes
    otp_max_attempts: int = 5         # wrong guesses allowed per code
    otp_resend_cooldown_seconds: int = 30

    email_backend: str = "console"    # "console" prints code in server log, "smtp" sends it
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@example.test"

    # CORS allowlist (comma-separated origins)
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174"
    )

    # PostgreSQL-backed auth rate limiting
    auth_rate_limit_enabled: bool = True
    auth_rate_limit_window_seconds: int = 60
    auth_rate_limit_max_requests: int = 10
    trust_proxy_headers: bool = False

    def get_cors_origins(self) -> list[str]:
        origins = [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]
        return [o for o in origins if o != "*"]


settings = Settings()
