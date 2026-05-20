import os
import psycopg2
import psycopg2.extras
import openpyxl

# Configuration
BATCH_SIZE = 5000

print("Loading workbook...")
wb = openpyxl.load_workbook(r"c:\\Users\\Dell\\Downloads\\7odor\\backend\\convocation_with_matieres.xlsx", read_only=True)
ws = wb.active

print("Connecting to PostgreSQL database...")
DATABASE_URL = os.getenv(
    "DIRECT_URL",
    "postgresql://postgres.ixwoyiahlfwfwycmfddw:J5pTNiCJQEcKzE9q@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
)
conn = psycopg2.connect(DATABASE_URL)
# We will manage transactions ourselves
conn.autocommit = False
cursor = conn.cursor()

# Insert query – matches table columns
INSERT_QUERY = """
    INSERT INTO school_students (
        ID, IANNEXE, IANNEEINS, INSEQ, ORDREC, ICODE, NIVEAU, FILIERE,
        MATIERE, NOM, PRENOM, WILAYA, NCENTRE, NSALLE, status
    ) VALUES %s
"""

def clean_val(val):
    if val is None:
        return None
    s = str(val).strip()
    if s == "":
        return None
    return s

inserted = 0
skipped = 0
batch = []

print("Processing rows...")
for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0:
        continue  # skip header
    # Extract ID, generate fallback if missing
    id_val = clean_val(row[0])
    if not id_val:
        id_val = f"fallback_{i}"
    iannexe = clean_val(row[1])
    ianneeins = clean_val(row[2])
    inseq = clean_val(row[3])
    ordrec = clean_val(row[4])
    icode = clean_val(row[5])
    niveau = clean_val(row[6])
    filiere = clean_val(row[7])
    # MATIERE may be at index 14 (0‑based)
    matiere = clean_val(row[14]) if len(row) > 14 else None
    nom = clean_val(row[8])
    prenom = clean_val(row[9])
    wilaya = clean_val(row[10])
    ncentre = clean_val(row[11]) or "unknown"
    nsalle = clean_val(row[12])
    status_val = "unmarked"
    batch.append((id_val, iannexe, ianneeins, inseq, ordrec, icode, niveau, filiere, matiere, nom, prenom, wilaya, ncentre, nsalle, status_val))

    if len(batch) >= BATCH_SIZE:
        try:
            psycopg2.extras.execute_values(cursor, INSERT_QUERY, batch, page_size=BATCH_SIZE)
            conn.commit()
            inserted += len(batch)
        except Exception as e:
            # Rollback the whole batch and try row‑by‑row insertion to isolate bad rows
            conn.rollback()
            print(f"Batch error at rows {i+1 - len(batch) + 1}-{i+1}: {e}")
            for row_vals in batch:
                try:
                    cursor.execute(
                        "INSERT INTO school_students (ID, IANNEXE, IANNEEINS, INSEQ, ORDREC, ICODE, NIVEAU, FILIERE, MATIERE, NOM, PRENOM, WILAYA, NCENTRE, NSALLE, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                        row_vals,
                    )
                    conn.commit()
                    inserted += 1
                except Exception as e_row:
                    conn.rollback()
                    print(f"Row with ID={row_vals[0]} still failed: {e_row}")
                    skipped += 1
        finally:
            batch.clear()

# Insert any remaining rows after loop
if batch:
    try:
        psycopg2.extras.execute_values(cursor, INSERT_QUERY, batch, page_size=len(batch))
        conn.commit()
        inserted += len(batch)
    except Exception as e:
        conn.rollback()
        print(f"Final batch error: {e}")
        for row_vals in batch:
            try:
                cursor.execute(
                    "INSERT INTO school_students (ID, IANNEXE, IANNEEINS, INSEQ, ORDREC, ICODE, NIVEAU, FILIERE, MATIERE, NOM, PRENOM, WILAYA, NCENTRE, NSALLE, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    row_vals,
                )
                conn.commit()
                inserted += 1
            except Exception as e_row:
                conn.rollback()
                print(f"Row with ID={row_vals[0]} still failed: {e_row}")
                skipped += 1

print(f"Finished! Inserted rows: {inserted}, skipped rows: {skipped}")

cursor.close()
conn.close()
