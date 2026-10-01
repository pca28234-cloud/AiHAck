@echo off
title HarvestLink AI Unified Server
echo ========================================================
echo   HarvestLink AI - Single Server Launcher
echo ========================================================
echo.

echo [1/3] Building Frontend...
cd /d "%~dp0frontend"
if not exist "node_modules" call npm install
call npm run build

echo.
echo [2/3] Setting up Backend & Database...
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
python seed_data.py

echo.
echo [3/3] Starting Unified App on http://localhost:8000 ...
start http://localhost:8000/farmer-dashboard

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
