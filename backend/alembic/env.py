from alembic import context
from sqlalchemy import create_engine

from app.config import settings

# The schema is applied from sql/schema.sql by the first migration, so there is no autogenerate target.
target_metadata = None


def run_migrations_online() -> None:
    engine = create_engine(settings.get_effective_database_url())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
