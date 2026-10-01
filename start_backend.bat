@echo off
title HarvestLink AI Backend
echo Starting Backend Server...
cd /d "%~dp0backend"
if exist "%~dp0backend\venv\Scripts\python.exe" (
    set PYEXEC="%~dp0backend\venv\Scripts\python.exe"
) else (
    set PYEXEC=python
)
%PYEXEC% seed_data.py
%PYEXEC% -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
