import mysql.connector
import openpyxl

print("Loading workbook...")
wb = openpyxl.load_workbook(r"c:\Users\Dell\Downloads\7odor\backend\convocation_with_matieres.xlsx", read_only=True)
ws = wb.active

print("Connecting to database...")
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="esisba",
    database="hudur",
    autocommit=False
)
cursor = conn.cursor()

# ['ID', 'IANNEXE', 'IANNEEINS', 'INSEQ', 'ORDREC', 'ICODE', 'NIVEAU', 'FILIERE', 'NOM', 'PRENOM', 'WILAYA', 'NCENTRE', 'NSALLE', 'status', 'MATIERE']

insert_query = """
    INSERT IGNORE INTO school_students 
    (ID, IANNEXE, IANNEEINS, INSEQ, ORDREC, ICODE, NIVEAU, FILIERE, MATIERE, NOM, PRENOM, WILAYA, NCENTRE, NSALLE, status)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

print("Processing rows...")
inserted = 0
skipped_or_duplicate = 0

batch_size = 1000
batch = []

def clean_val(val):
    if val is None:
        return None
    return str(val).strip()

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0:
        continue # skip header
    
    # Extract based on column order
    # ['ID', 'IANNEXE', 'IANNEEINS', 'INSEQ', 'ORDREC', 'ICODE', 'NIVEAU', 'FILIERE', 'NOM', 'PRENOM', 'WILAYA', 'NCENTRE', 'NSALLE', 'status', 'MATIERE']
    id_val = clean_val(row[0])
    if not id_val:
        continue
        
    iannexe = clean_val(row[1])
    ianneeins = clean_val(row[2])
    inseq = clean_val(row[3])
    ordrec = clean_val(row[4])
    icode = clean_val(row[5])
    niveau = clean_val(row[6])
    filiere = clean_val(row[7])
    nom = clean_val(row[8])
    prenom = clean_val(row[9])
    wilaya = clean_val(row[10])
    ncentre = clean_val(row[11])
    nsalle = clean_val(row[12])
    status_val = "unmarked"
    matiere = clean_val(row[14]) if len(row) > 14 else None

    batch.append((
        id_val, iannexe, ianneeins, inseq, ordrec, icode, niveau, filiere, matiere,
        nom, prenom, wilaya, ncentre, nsalle, status_val
    ))

    if len(batch) >= batch_size:
        try:
            cursor.executemany(insert_query, batch)
            conn.commit()
            inserted += cursor.rowcount
        except mysql.connector.Error as e:
            # If executemany fails on duplicates even with IGNORE, process one by one
            conn.rollback()
            for b_row in batch:
                try:
                    cursor.execute(insert_query, b_row)
                    inserted += cursor.rowcount
                except mysql.connector.Error:
                    skipped_or_duplicate += 1
            conn.commit()
        batch.clear()

# Last batch
if batch:
    try:
        cursor.executemany(insert_query, batch)
        conn.commit()
        inserted += cursor.rowcount
    except mysql.connector.Error as e:
        conn.rollback()
        for b_row in batch:
            try:
                cursor.execute(insert_query, b_row)
                inserted += cursor.rowcount
            except mysql.connector.Error:
                skipped_or_duplicate += 1
        conn.commit()

print(f"Finished! Inserted new rows: {inserted}")

cursor.close()
conn.close()
