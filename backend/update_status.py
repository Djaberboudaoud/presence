import mysql.connector
conn = mysql.connector.connect(host='localhost',user='root',password='esisba',database='hudur')
cur = conn.cursor()
cur.execute("UPDATE school_students SET status='unmarked'")
conn.commit()
print(f'{cur.rowcount} rows updated.')
