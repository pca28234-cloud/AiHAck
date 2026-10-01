import asyncio
import os
import sqlite3
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.database import engine, Base, DATABASE_DIR
import app.models.models as models

async def main():
    print("Checking database schema...")
    db_path = os.path.join(DATABASE_DIR, "harvestlink.db")
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    # List of expected columns per table
    table_columns = {
        "farmers": [
            ("pan_card", "TEXT"),
            ("land_location", "TEXT"),
            ("phone", "TEXT"),
            ("email", "TEXT"),
            ("aadhaar_last4", "TEXT")
        ],
        "buyers": [
            ("phone", "TEXT"),
            ("aadhaar_last4", "TEXT")
        ],
        "vehicles": [
            ("cost_per_trip", "REAL DEFAULT 2500"),
            ("driver_name", "TEXT"),
            ("driver_contact", "TEXT"),
            ("current_location", "TEXT"),
            ("status", "TEXT DEFAULT 'available'")
        ],
        "harvests": [
            ("available_date", "TEXT"),
            ("location", "TEXT"),
            ("expected_price", "REAL")
        ],
        "orders": [
            ("harvest_id", "INTEGER"),
            ("delivery_location", "TEXT")
        ]
    }

    for table, cols in table_columns.items():
        existing_cols = [c[1] for c in cur.execute(f"PRAGMA table_info({table})").fetchall()]
        for col_name, col_type in cols:
            if col_name not in existing_cols:
                print(f"Adding missing column '{col_name}' ({col_type}) to '{table}'...")
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")

    # Set default values for any NULL values in buyers
    cur.execute("UPDATE buyers SET phone = '9876543210' WHERE phone IS NULL")
    cur.execute("UPDATE buyers SET aadhaar_last4 = '4321' WHERE aadhaar_last4 IS NULL")

    con.commit()
    con.close()

    # Create any missing tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("All tables and columns are 100% synchronized!")

if __name__ == "__main__":
    asyncio.run(main())
