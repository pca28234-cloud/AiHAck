@echo off
title HarvestLink AI All-In-One
cd /d "%~dp0"
if exist "backend\venv\Scripts\python.exe" (
    "backend\venv\Scripts\python.exe" run_unified.py
) else (
    python run_unified.py
)
pause
