import os
import psycopg2

print("Connecting to PostgreSQL database...")
DATABASE_URL = os.getenv("DIRECT_URL", "postgresql://postgres.ixwoyiahlfwfwycmfddw:J5pTNiCJQEcKzE9q@aws-0-eu-west-1.pooler.supabase.com:5432/postgres")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cursor = conn.cursor()

# Drop primary key / unique constraints on ID if they exist
try:
    cursor.execute("ALTER TABLE school_students DROP CONSTRAINT IF EXISTS school_students_pkey")
except Exception as e:
    print("Primary key drop error:", e)
try:
    cursor.execute("ALTER TABLE school_students DROP CONSTRAINT IF EXISTS school_students_id_key")
except Exception as e:
    print("Unique constraint drop error:", e)

# Truncate the table to remove all existing rows
print("Truncating school_students table...")
cursor.execute("TRUNCATE TABLE school_students RESTART IDENTITY CASCADE")
print("Table truncated.")

cursor.close()
conn.close()
