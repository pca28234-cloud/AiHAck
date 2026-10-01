@echo off
echo Starting HarvestLink AI Backend...
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
uvicorn app.main:app --reload --port 8000
pause
