"""Bootstraps a dashboard user account. There's no self-serve signup page on purpose - this is
an invite-only internal tool, so accounts are created by whoever administers the deployment.

Run (from backend/, with the venv active):
    py scripts/create_user.py --email pdkulkarni@tce.co.in --name "Pranav Kulkarni"
    py scripts/create_user.py --email pdkulkarni@tce.co.in --name "Pranav Kulkarni" --update-password
"""
import argparse
import getpass
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.auth import hash_password
from app.db import get_connection, get_user_by_email, init_db, insert_user


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True, help="Display name shown in the History timeline")
    parser.add_argument("--update-password", action="store_true", help="Reset the password for an existing account")
    args = parser.parse_args()

    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords don't match.")
        sys.exit(1)
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)

    init_db()
    conn = get_connection()
    try:
        existing = get_user_by_email(conn, args.email)
        now_iso = datetime.now(timezone.utc).isoformat()

        if existing and not args.update_password:
            print(f"A user with email '{args.email}' already exists. Pass --update-password to reset it.")
            sys.exit(1)

        if existing:
            conn.execute(
                "UPDATE users SET password_hash = ?, display_name = ? WHERE email = ?",
                (hash_password(password), args.name, args.email),
            )
            print(f"Password updated for {args.email}.")
        else:
            insert_user(conn, args.email, args.name, hash_password(password), now_iso)
            print(f"Created user {args.email} ({args.name}).")
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
