# -*- coding: utf-8 -*-
"""
import_centres.py
Reads centres.xlsx and bulk-inserts 88 school accounts into the `users` table.

Convention used:
  username  = NCENTRE  (e.g.  "C001")
  password  = NCENTRE  (plain → will be bcrypt-hashed)
  role      = "school"
  NCENTRE   = value from column A
  NOMCENTRE = value from column B

Run:
  python import_centres.py
"""

import sys
import openpyxl
import bcrypt
import mysql.connector
from mysql.connector import Error as MySQLError

# ── DB credentials ────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",
    "password": "esisba",
    "database": "hudur",
    "charset":  "utf8mb4",
}

XLSX_PATH = r"c:\Users\Dell\Downloads\7odor\backend\centres.xlsx"

# ─────────────────────────────────────────────────────────────────────────────

def hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def main():
    # 1. Load workbook
    wb = openpyxl.load_workbook(XLSX_PATH)
    ws = wb.active

    rows = list(ws.iter_rows(min_row=2, values_only=True))   # skip header
    print(f"[info] Found {len(rows)} centres in Excel file.")

    # 2. Connect to MySQL
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
    except MySQLError as e:
        print(f"[error] Cannot connect to database: {e}")
        sys.exit(1)

    inserted = 0
    skipped  = 0
    errors   = []

    for row in rows:
        ncentre   = str(row[0]).strip() if row[0] is not None else None
        nomcentre = str(row[1]).strip() if row[1] is not None else None

        if not ncentre or not nomcentre:
            skipped += 1
            continue

        username  = ncentre          # login name = NCENTRE code
        password  = hash_pw(ncentre) # default password = NCENTRE code (hashed)
        role      = "school"

        try:
            cursor.execute(
                """INSERT INTO users (username, password, role, NCENTRE, NOMCENTRE)
                   VALUES (%s, %s, %s, %s, %s)""",
                (username, password, role, ncentre, nomcentre),
            )
            inserted += 1
            safe_nom = nomcentre[:50].encode("ascii", "replace").decode("ascii")
            print(f"  [+] {ncentre:15s}  {safe_nom}")
        except MySQLError as e:
            if e.errno == 1062:   # duplicate key
                print(f"  [~] SKIP (already exists): {ncentre}")
                skipped += 1
            else:
                print(f"  [!] ERROR for {ncentre}: {e}")
                errors.append((ncentre, str(e)))

    conn.commit()
    cursor.close()
    conn.close()

    # 3. Summary
    print()
    print("═" * 50)
    print(f"  Inserted : {inserted}")
    print(f"  Skipped  : {skipped}")
    print(f"  Errors   : {len(errors)}")
    print("═" * 50)
    if errors:
        print("Errors detail:")
        for nc, msg in errors:
            print(f"  {nc}: {msg}")

    print("\n[done] Default password for each account = its NCENTRE code.")
    print("       Example: NCENTRE=C001  →  username=C001  password=C001")


if __name__ == "__main__":
    main()
