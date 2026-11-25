"""Create the first HOUSING_ADMIN account (the admin endpoints need an admin to exist).

    python -m app.create_admin --email admin@university.edu --name "Housing Admin"
"""
import argparse
import getpass
import sys

from .db import SessionLocal
from .errors import DomainError
from .services import auth


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a HOUSING_ADMIN account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass.getpass("Password (min 8 characters): ")
    if len(password) < 8 or password != getpass.getpass("Repeat password: "):
        print("Passwords do not match or are shorter than 8 characters.")
        return 1
    with SessionLocal() as db:
        try:
            result = auth.create_staff_account(db, None, email=args.email, full_name=args.name, role="HOUSING_ADMIN", password=password)
        except DomainError as exc:
            print(f"{exc.code}: {exc.message}")
            return 1
    print(f"Created admin {result['email']} ({result['account_id']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
