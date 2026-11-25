"""add auth_rate_limits table for multi-process auth rate limiting

Revision ID: 0003
Revises: 0002
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS auth_rate_limits (
          bucket_key   VARCHAR(128) PRIMARY KEY,
          window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
          hit_count    INTEGER NOT NULL DEFAULT 1
        );
        CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window ON auth_rate_limits (window_start);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS auth_rate_limits;")
