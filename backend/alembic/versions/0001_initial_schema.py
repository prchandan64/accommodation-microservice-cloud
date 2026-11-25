"""initial schema: the 23 tables of the Accommodation Service

Revision ID: 0001
Revises:
"""
from alembic import op

from app.sqlutil import SCHEMA_FILE, run_script

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    run_script(op.get_bind(), SCHEMA_FILE.read_text())


def downgrade() -> None:
    op.execute("DROP SCHEMA public CASCADE")
    op.execute("CREATE SCHEMA public")
