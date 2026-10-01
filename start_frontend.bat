@echo off
title HarvestLink AI Frontend
echo ========================================================
echo   Starting HarvestLink AI Frontend on http://localhost:5173
echo ========================================================
echo.
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo Installing npm packages...
    call npm install
)
npm run dev
pause
