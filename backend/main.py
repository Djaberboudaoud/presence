"""
FastAPI Backend for منصة حاضر (Hudur)
Connects to PostgreSQL database via Supabase
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
from psycopg2 import Error as PostgreSQLError
import psycopg2.extras
import bcrypt
import jwt
try:
    from mangum import Mangum
except ImportError:  # pragma: no cover
    Mangum = None
import os
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from contextlib import contextmanager

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
DATABASE_URL = os.getenv("DIRECT_URL", "postgresql://postgres.ixwoyiahlfwfwycmfddw:J5pTNiCJQEcKzE9q@aws-0-eu-west-1.pooler.supabase.com:5432/postgres")

JWT_SECRET = os.getenv("JWT_SECRET", "hudur-secret-key-2026-change-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

app = FastAPI(
    title="Hudur API",
    description="Backend for منصة حاضر — Exam Attendance Management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# ─────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────
def get_connection():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except PostgreSQLError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {e}",
        )


@contextmanager
def db_cursor(commit: bool = False):
    conn = get_connection()
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield cursor
        if commit:
            conn.commit()
    except PostgreSQLError as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        cursor.close()
        conn.close()


# ─────────────────────────────────────────────
# JWT helpers
# ─────────────────────────────────────────────
def create_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(credentials.credentials)


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ─────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str          # "admin" | "school"
    NCENTRE: str
    NOMCENTRE: str


class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    NOMCENTRE: Optional[str] = None


class StudentCreate(BaseModel):
    ID: str
    IANNEXE: Optional[str] = None
    IANNEEINS: Optional[str] = None
    INSEQ: Optional[str] = None
    ORDREC: Optional[str] = None
    ICODE: Optional[str] = None
    NIVEAU: Optional[str] = None
    FILIERE: Optional[str] = None
    MATIERE: Optional[str] = None
    NOM: str
    PRENOM: str
    WILAYA: Optional[str] = None
    NSALLE: Optional[str] = None
    NCENTRE: str
    status: Optional[str] = "absent"


class BulkImportRequest(BaseModel):
    students: List[StudentCreate]


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    try:
        with db_cursor() as cur:
            cur.execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────
@app.post("/api/auth/login", response_model=LoginResponse, tags=["Auth"])
def login(body: LoginRequest):
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, username, password, role, COALESCE(ncentre, '') AS \"NCENTRE\", COALESCE(nomcentre, '') AS \"NOMCENTRE\", created_at "
            "FROM users WHERE username = %s",
            (body.username,),
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")

    stored_pw = user["password"]
    # Support plain passwords (legacy) and bcrypt hashed passwords
    try:
        valid = bcrypt.checkpw(body.password.encode(), stored_pw.encode())
    except Exception:
        # plain text comparison for legacy rows
        valid = body.password == stored_pw

    if not valid:
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")

    token = create_token({"sub": str(user["id"]), "username": user["username"], "role": user["role"], "NCENTRE": user.get("NCENTRE") or "", "NOMCENTRE": user.get("NOMCENTRE") or ""})

    return {
        "access_token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "NCENTRE": user.get("NCENTRE") or "",
            "NOMCENTRE": user.get("NOMCENTRE") or "",
            "created_at": str(user.get("created_at", "")),
        },
    }


@app.get("/api/auth/me", tags=["Auth"])
def me(current_user: dict = Depends(get_current_user)):
    user_id = current_user["sub"]
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, username, role, COALESCE(ncentre, '') AS \"NCENTRE\", COALESCE(nomcentre, '') AS \"NOMCENTRE\", created_at FROM users WHERE id = %s",
            (user_id,),
        )
        user = cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "NCENTRE": user["NCENTRE"],
        "NOMCENTRE": user["NOMCENTRE"],
        "created_at": str(user.get("created_at", "")),
    }


# ─────────────────────────────────────────────
# USERS (admin only)
# ─────────────────────────────────────────────
@app.get("/api/users", tags=["Users"])
def list_users(admin=Depends(require_admin)):
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, username, role, COALESCE(ncentre, '') AS \"NCENTRE\", COALESCE(nomcentre, '') AS \"NOMCENTRE\", created_at FROM users ORDER BY created_at DESC"
        )
        return cur.fetchall()


@app.post("/api/users", status_code=201, tags=["Users"])
def create_user(body: CreateUserRequest, admin=Depends(require_admin)):
    if body.role not in ("admin", "school"):
        raise HTTPException(status_code=422, detail="role must be 'admin' or 'school'")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    with db_cursor(commit=True) as cur:
        try:
            cur.execute(
                "INSERT INTO users (username, password, role, NCENTRE, NOMCENTRE) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (body.username, hashed, body.role, body.NCENTRE, body.NOMCENTRE),
            )
            user_id = cur.fetchone()["id"]
            return {"id": user_id, "message": "User created successfully"}
        except PostgreSQLError as e:
            if e.pgcode == "23505":  # unique_violation
                raise HTTPException(status_code=409, detail="Username or NCENTRE already exists")
            raise


@app.delete("/api/users/{user_id}", tags=["Users"])
def delete_user(user_id: int, admin=Depends(require_admin)):
    with db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}


@app.patch("/api/users/{user_id}", tags=["Users"])
def update_user(user_id: int, body: UpdateUserRequest, admin=Depends(require_admin)):
    fields, values = [], []
    if body.username:
        fields.append("username = %s"); values.append(body.username)
    if body.password:
        hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
        fields.append("password = %s"); values.append(hashed)
    if body.NOMCENTRE:
        fields.append("NOMCENTRE = %s"); values.append(body.NOMCENTRE)

    if not fields:
        raise HTTPException(status_code=422, detail="Nothing to update")

    values.append(user_id)
    with db_cursor(commit=True) as cur:
        cur.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", values)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}


# ─────────────────────────────────────────────
# STUDENTS
# ─────────────────────────────────────────────
@app.get("/api/students", tags=["Students"])
def list_students(
    ncentre: Optional[str] = None,
    niveau: Optional[str] = None,
    filiere: Optional[str] = None,
    matiere: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Admins can query any NCENTRE; school users are restricted to their own.
    """
    effective_ncentre = ncentre

    if current_user["role"] == "school":
        effective_ncentre = current_user["NCENTRE"]

    conditions = []
    params = []

    if effective_ncentre:
        conditions.append("NCENTRE = %s"); params.append(effective_ncentre)
    if niveau:
        conditions.append("NIVEAU = %s"); params.append(niveau)
    if filiere:
        conditions.append("FILIERE = %s"); params.append(filiere)
    if matiere:
        conditions.append("MATIERE = %s"); params.append(matiere)
    if search:
        conditions.append("(NOM LIKE %s OR PRENOM LIKE %s OR ID LIKE %s)")
        like = f"%{search}%"
        params.extend([like, like, like])

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"""
        SELECT ID, 
               MAX(IANNEXE) AS "IANNEXE", MAX(IANNEEINS) AS "IANNEEINS", MAX(INSEQ) AS "INSEQ", 
               MAX(ORDREC) AS "ORDREC", MAX(ICODE) AS "ICODE", MAX(NIVEAU) AS "NIVEAU", 
               MAX(FILIERE) AS "FILIERE", 
               STRING_AGG(DISTINCT MATIERE, ' - ') AS "MATIERE", 
               MAX(NOM) AS "NOM", MAX(PRENOM) AS "PRENOM", MAX(WILAYA) AS "WILAYA", 
               MAX(NSALLE) AS "NSALLE", MAX(NCENTRE) AS "NCENTRE", MAX(status) AS status, MAX(created_at) AS created_at
        FROM school_students
        {where}
        GROUP BY ID
        ORDER BY MAX(NOM), MAX(PRENOM)
    """

    with db_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


@app.post("/api/students", status_code=201, tags=["Students"])
def create_student(body: StudentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "school" and body.NCENTRE != current_user["NCENTRE"]:
        raise HTTPException(status_code=403, detail="Cannot add student to another centre")

    with db_cursor(commit=True) as cur:
        cur.execute(
            """INSERT INTO school_students
               (ID, IANNEXE, IANNEEINS, INSEQ, ORDREC, ICODE, NIVEAU, FILIERE, MATIERE,
                NOM, PRENOM, WILAYA, NSALLE, NCENTRE, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                body.ID, body.IANNEXE, body.IANNEEINS, body.INSEQ,
                body.ORDREC, body.ICODE, body.NIVEAU, body.FILIERE, body.MATIERE,
                body.NOM, body.PRENOM, body.WILAYA, body.NSALLE, body.NCENTRE, body.status,
            ),
        )
    return {"message": "Student added"}


@app.post("/api/students/bulk", status_code=201, tags=["Students"])
def bulk_import_students(body: BulkImportRequest, current_user: dict = Depends(get_current_user)):
    """Bulk import students — skips duplicates via INSERT IGNORE."""
    if not body.students:
        raise HTTPException(status_code=422, detail="Empty student list")

    inserted = 0
    skipped = 0

    with db_cursor(commit=True) as cur:
        for s in body.students:
            if current_user["role"] == "school" and s.NCENTRE != current_user["NCENTRE"]:
                skipped += 1
                continue
            try:
                cur.execute(
                    """INSERT IGNORE INTO school_students
                       (ID, IANNEXE, IANNEEINS, INSEQ, ORDREC, ICODE, NIVEAU, FILIERE, MATIERE,
                        NOM, PRENOM, WILAYA, NSALLE, NCENTRE, status)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (
                        s.ID, s.IANNEXE, s.IANNEEINS, s.INSEQ,
                        s.ORDREC, s.ICODE, s.NIVEAU, s.FILIERE, s.MATIERE,
                        s.NOM, s.PRENOM, s.WILAYA, s.NSALLE, s.NCENTRE, s.status,
                    ),
                )
                inserted += cur.rowcount
            except PostgreSQLError:
                skipped += 1

    return {"inserted": inserted, "skipped": skipped}


@app.delete("/api/students/{student_id}", tags=["Students"])
def delete_student(student_id: str, current_user: dict = Depends(get_current_user)):
    with db_cursor(commit=True) as cur:
        if current_user["role"] == "school":
            cur.execute(
                "DELETE FROM school_students WHERE ID = %s AND NCENTRE = %s",
                (student_id, current_user["NCENTRE"]),
            )
        else:
            cur.execute("DELETE FROM school_students WHERE ID = %s", (student_id,))

        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted"}


class UpdateStatusRequest(BaseModel):
    status: str
    niveau: Optional[str] = None
    filiere: Optional[str] = None
    matiere: Optional[str] = None

@app.patch("/api/students/{student_id}/status", tags=["Students"])
def update_student_status(student_id: str, body: UpdateStatusRequest, current_user: dict = Depends(get_current_user)):
    conditions = ["ID = %s"]
    params = [student_id]

    if current_user["role"] == "school":
        conditions.append("NCENTRE = %s")
        params.append(current_user["NCENTRE"])
    if body.niveau:
        conditions.append("NIVEAU = %s")
        params.append(body.niveau)
    if body.filiere:
        conditions.append("FILIERE = %s")
        params.append(body.filiere)
    if body.matiere:
        conditions.append("MATIERE = %s")
        params.append(body.matiere)

    where = " AND ".join(conditions)
    params.insert(0, body.status)  # SET status = %s
    
    with db_cursor(commit=True) as cur:
        cur.execute(f"UPDATE school_students SET status = %s WHERE {where}", params)
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student row not found to update")
    return {"message": "Status updated"}

@app.post("/api/students/reset-status", tags=["Students"])
def reset_all_attendance(admin=Depends(require_admin)):
    with db_cursor(commit=True) as cur:
        cur.execute("UPDATE school_students SET status = 'unmarked'")
    return {"message": "All attendance records have been reset."}

# ─────────────────────────────────────────────
# STATISTICS
# ─────────────────────────────────────────────
@app.get("/api/stats", tags=["Statistics"])
def stats(current_user: dict = Depends(get_current_user)):
    with db_cursor() as cur:
        if current_user["role"] == "admin":
            cur.execute("SELECT COUNT(*) AS total_schools FROM users WHERE role='school'")
            schools = cur.fetchone()["total_schools"]
            cur.execute("SELECT COUNT(DISTINCT ID) AS total_students FROM school_students")
            students = cur.fetchone()["total_students"]
            
            cur.execute("SELECT COUNT(*) AS total_rows FROM school_students")
            total_rows = cur.fetchone()["total_rows"]
            
            cur.execute("SELECT COUNT(*) AS marked_rows FROM school_students WHERE status != 'unmarked'")
            marked_rows = cur.fetchone()["marked_rows"]
            completion_rate = round((marked_rows / total_rows * 100)) if total_rows > 0 else 0

            cur.execute(
                "SELECT ss.NCENTRE AS \"NCENTRE\", MAX(COALESCE(u.NOMCENTRE, ss.NCENTRE)) AS \"NOMCENTRE\", "
                "COUNT(DISTINCT ss.ID) AS student_count, "
                "COUNT(*) AS total_rows, "
                "COUNT(CASE WHEN ss.status != 'unmarked' THEN 1 END) AS marked_rows, "
                "COUNT(DISTINCT CASE WHEN ss.status = 'حاضر' THEN ss.ID END) AS present_count, "
                "COUNT(DISTINCT CASE WHEN ss.status = 'غائب' THEN ss.ID END) AS absent_count "
                "FROM school_students ss "
                "LEFT JOIN users u ON ss.NCENTRE = u.NCENTRE "
                "GROUP BY ss.NCENTRE ORDER BY student_count DESC"
            )
            by_school = cur.fetchall()
            cur.execute(
                "SELECT NIVEAU AS \"NIVEAU\", FILIERE AS \"FILIERE\", COUNT(DISTINCT ID) AS cnt, "
                "COUNT(DISTINCT CASE WHEN status = 'حاضر' THEN ID END) AS present_count, "
                "COUNT(DISTINCT CASE WHEN status = 'غائب' THEN ID END) AS absent_count "
                "FROM school_students GROUP BY NIVEAU, FILIERE ORDER BY NIVEAU, cnt DESC"
            )
            by_level = cur.fetchall()
            return {
                "total_schools": schools,
                "total_students": students,
                "completion_rate": completion_rate,
                "by_school": by_school,
                "by_level": by_level,
            }
        else:
            ncentre = current_user["NCENTRE"]
            cur.execute(
                "SELECT COUNT(DISTINCT ID) AS total_students FROM school_students WHERE NCENTRE = %s",
                (ncentre,),
            )
            students = cur.fetchone()["total_students"]
            cur.execute(
                "SELECT NIVEAU AS \"NIVEAU\", COUNT(DISTINCT ID) AS cnt FROM school_students WHERE NCENTRE = %s GROUP BY NIVEAU ORDER BY cnt DESC",
                (ncentre,),
            )
            by_level = cur.fetchall()
            cur.execute(
                "SELECT FILIERE AS \"FILIERE\", COUNT(DISTINCT ID) AS cnt FROM school_students WHERE NCENTRE = %s GROUP BY FILIERE ORDER BY cnt DESC",
                (ncentre,),
            )
            by_filiere = cur.fetchall()
            cur.execute(
                "SELECT NSALLE AS \"NSALLE\", COUNT(DISTINCT ID) AS cnt FROM school_students WHERE NCENTRE = %s AND NSALLE IS NOT NULL GROUP BY NSALLE ORDER BY NSALLE",
                (ncentre,),
            )
            by_salle = cur.fetchall()
            return {
                "total_students": students,
                "by_level": by_level,
                "by_filiere": by_filiere,
                "by_salle": by_salle,
            }


# ─────────────────────────────────────────────
# LEVELS, FILIERES, MATIERES (Multi-way filtering)
# ─────────────────────────────────────────────
@app.get("/api/levels", tags=["Levels"])
def list_levels(filiere: Optional[str] = None, matiere: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    with db_cursor() as cur:
        conditions, params = [], []
        if current_user["role"] == "school":
            conditions.append("NCENTRE = %s"); params.append(current_user["NCENTRE"])
        if filiere:
            conditions.append("FILIERE = %s"); params.append(filiere)
        if matiere:
            conditions.append("MATIERE = %s"); params.append(matiere)
        conditions.append("NIVEAU IS NOT NULL")
        
        where = "WHERE " + " AND ".join(conditions)
        cur.execute(f"SELECT DISTINCT NIVEAU AS \"NIVEAU\" FROM school_students {where} ORDER BY NIVEAU", params)
        rows = cur.fetchall()
    return [r["NIVEAU"] for r in rows]


@app.get("/api/filieres", tags=["Levels"])
def list_filieres(niveau: Optional[str] = None, matiere: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    with db_cursor() as cur:
        conditions, params = [], []
        if current_user["role"] == "school":
            conditions.append("NCENTRE = %s"); params.append(current_user["NCENTRE"])
        if niveau:
            conditions.append("NIVEAU = %s"); params.append(niveau)
        if matiere:
            conditions.append("MATIERE = %s"); params.append(matiere)
        conditions.append("FILIERE IS NOT NULL")
        
        where = "WHERE " + " AND ".join(conditions)
        cur.execute(f"SELECT DISTINCT FILIERE AS \"FILIERE\" FROM school_students {where} ORDER BY FILIERE", params)
        rows = cur.fetchall()
    return [r["FILIERE"] for r in rows]

@app.get("/api/matieres", tags=["Levels"])
def list_matieres(niveau: Optional[str] = None, filiere: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    with db_cursor() as cur:
        conditions, params = [], []
        if current_user["role"] == "school":
            conditions.append("NCENTRE = %s"); params.append(current_user["NCENTRE"])
        if niveau:
            conditions.append("NIVEAU = %s"); params.append(niveau)
        if filiere:
            conditions.append("FILIERE = %s"); params.append(filiere)
        conditions.append("MATIERE IS NOT NULL")
        where = "WHERE " + " AND ".join(conditions)
        cur.execute(f"SELECT DISTINCT MATIERE AS \"MATIERE\" FROM school_students {where} ORDER BY MATIERE", params)
        rows = cur.fetchall()
    return [r["MATIERE"] for r in rows]

# ─────────────────────────────────────────────
# EXCEL EXPORT
# ─────────────────────────────────────────────
from fastapi.responses import StreamingResponse
import io
import openpyxl

@app.get("/api/export/excel", tags=["Export"])
def export_excel(
    niveau: Optional[str] = None, 
    filiere: Optional[str] = None, 
    matiere: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    conditions, params = [], []
    if current_user["role"] == "school":
        conditions.append("NCENTRE = %s"); params.append(current_user["NCENTRE"])
    if niveau:
        conditions.append("NIVEAU = %s"); params.append(niveau)
    if filiere:
        conditions.append("FILIERE = %s"); params.append(filiere)
    if matiere:
        conditions.append("MATIERE = %s"); params.append(matiere)

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    
    query = f"""
        SELECT ID AS "ID", NIVEAU AS "NIVEAU", FILIERE AS "FILIERE", MATIERE AS "MATIERE", NOM AS "NOM", PRENOM AS "PRENOM", WILAYA AS "WILAYA", NSALLE AS "NSALLE", NCENTRE AS "NCENTRE", status 
        FROM school_students
        {where}
        ORDER BY NOM, PRENOM
    """
    
    with db_cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
        
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Students Export"
    
    # Headers
    headers = ["ID", "NIVEAU", "FILIERE", "MATIERE", "NOM", "PRENOM", "WILAYA", "NSALLE", "NCENTRE", "status"]
    ws.append(headers)
    
    # Data rows
    for row in rows:
        ws.append([
            row["ID"], row["NIVEAU"], row["FILIERE"], row["MATIERE"], 
            row["NOM"], row["PRENOM"], row["WILAYA"], row["NSALLE"], 
            row["NCENTRE"], row["status"]
        ])
        
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    
    filename = "students_export.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(iter([stream.getvalue()]), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)


if Mangum:
    handler = Mangum(app)
    application = app  # for ASGI servers
else:
    handler = None
    application = app  # fallback for environments without Mangum
