@echo off
echo =========================================
echo  Hudur FastAPI Backend
echo =========================================

:: Install dependencies if needed
pip install -r requirements.txt

echo.
echo Starting server on http://localhost:8000
echo API docs: http://localhost:8000/docs
echo.

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
