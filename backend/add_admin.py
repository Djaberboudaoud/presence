import mysql.connector
import bcrypt

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='esisba',
    database='hudur',
    autocommit=True
)
cur = conn.cursor(dictionary=True)

# check if admin already exists
cur.execute("SELECT * FROM users WHERE role='admin'")
admin = cur.fetchone()

if not admin:
    # create default admin
    password = "admin"
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    cur.execute("INSERT INTO users (username, password, role, NCENTRE, NOMCENTRE) VALUES (%s, %s, %s, %s, %s)", 
                ("admin", hashed, "admin", "ADMIN", "لوحة التحكم الرئيسية"))
    print("Admin user created (username: admin, password: admin)")
else:
    print(f"Admin already exists: {admin['username']}")

cur.close()
conn.close()
