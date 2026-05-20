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

if "MATIERE" not in cols:
    print("Adding MATIERE column...")
    cursor.execute("ALTER TABLE school_students ADD COLUMN MATIERE VARCHAR(255) AFTER FILIERE")
    conn.commit()
    print("Added MATIERE column.")
else:
    print("MATIERE column already exists.")
    
cursor.close()
conn.close()
