import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="esisba",
    database="hudur"
)
cursor = conn.cursor()

# Check existing columns
cursor.execute("SHOW COLUMNS FROM school_students")
cols = [c[0] for c in cursor.fetchall()]
print(cols)

# If status is not there, add it
if "status" not in cols:
    print("Adding status column...")
    cursor.execute("ALTER TABLE school_students ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'absent'")
    conn.commit()
    print("Added status column.")
    
cursor.close()
conn.close()
