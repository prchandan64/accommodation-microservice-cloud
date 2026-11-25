"""Run a .sql script statement by statement (used by Alembic and the tests)."""
from pathlib import Path

SCHEMA_FILE = (
    Path(__file__).resolve().parent.parent / "sql" / "schema.sql"
    if (Path(__file__).resolve().parent.parent / "sql" / "schema.sql").exists()
    else Path(__file__).resolve().parent.parent.parent / "database" / "schema.sql"
)


def split_statements(sql: str) -> list[str]:
    """Split on ';' at the end of a line, but not inside $$ ... $$ blocks."""
    statements, current, in_dollar = [], [], False
    for line in sql.splitlines():
        stripped = line.strip()
        if not current and (not stripped or stripped.startswith("--")):
            continue
        current.append(line)
        if line.count("$$") % 2 == 1:
            in_dollar = not in_dollar
        code = line.split("--", 1)[0].rstrip()   # ignore a trailing comment
        if not in_dollar and code.endswith(";"):
            statements.append("\n".join(current))
            current = []
    if current and "\n".join(current).strip():
        statements.append("\n".join(current))
    return statements


def run_script(connection, sql: str) -> None:
    """Execute every statement on a SQLAlchemy connection.

    '%' is doubled because the driver treats it as a parameter marker.
    """
    for statement in split_statements(sql):
        connection.exec_driver_sql(statement.replace("%", "%%"))
