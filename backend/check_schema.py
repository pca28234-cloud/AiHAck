import sqlite3

conn = sqlite3.connect('harvestlink-ai/database/harvestlink.db')
cursor = conn.cursor()

def add_col_if_missing(table, col, col_type):
    cursor.execute(f"PRAGMA table_info({table});")
    cols = [r[1] for r in cursor.fetchall()]
    if col not in cols:
        print(f"Adding {col} to {table}")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type};")
    else:
        print(f"{col} already in {table}")

add_col_if_missing('harvests', 'reserved_quantity', 'FLOAT DEFAULT 0.0')
add_col_if_missing('harvests', 'cancelled_at', 'VARCHAR(30)')
add_col_if_missing('harvests', 'cancellation_reason', 'TEXT')

add_col_if_missing('orders', 'cancelled_at', 'VARCHAR(30)')
add_col_if_missing('orders', 'cancelled_by', 'VARCHAR(100)')
add_col_if_missing('orders', 'cancellation_reason', 'TEXT')

add_col_if_missing('buyer_requests', 'cancelled_at', 'VARCHAR(30)')
add_col_if_missing('buyer_requests', 'cancelled_by', 'VARCHAR(100)')
add_col_if_missing('buyer_requests', 'cancellation_reason', 'TEXT')

# Check cancellation_history table
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='cancellation_history';")
if not cursor.fetchone():
    print("cancellation_history table will be created by init_db")
else:
    print("cancellation_history table already exists")

conn.commit()
conn.close()
print("Schema check completed successfully.")
