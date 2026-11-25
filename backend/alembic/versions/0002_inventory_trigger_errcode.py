"""use check_violation (23514) in bed_inventory consistency trigger

Revision ID: 0002
Revises: 0001
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION trg_check_bed_inventory_consistency()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.beds_total <> (NEW.beds_available + NEW.beds_held + NEW.beds_allocated) THEN
            RAISE EXCEPTION 'Inventory integrity violated: beds_total (%) must equal available (%) + held (%) + allocated (%)',
              NEW.beds_total, NEW.beds_available, NEW.beds_held, NEW.beds_allocated
              USING ERRCODE = '23514';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION trg_check_bed_inventory_consistency()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.beds_total <> (NEW.beds_available + NEW.beds_held + NEW.beds_allocated) THEN
            RAISE EXCEPTION 'Inventory integrity violated: beds_total (%) must equal available (%) + held (%) + allocated (%)',
              NEW.beds_total, NEW.beds_available, NEW.beds_held, NEW.beds_allocated;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
