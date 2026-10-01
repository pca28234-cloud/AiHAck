@echo off
echo ====================================
echo   HarvestLink AI - FULL SETUP
echo ====================================
echo.

set PROJECT=c:\Users\edula\OneDrive\Documents\AgriFlow Ai\harvestlink-ai

echo [1/5] Installing frontend dependencies...
cd /d "%PROJECT%\frontend"
call npm install
if %errorlevel% neq 0 (
    echo FAILED: npm install
    pause
    exit /b 1
)
echo Done.

echo.
echo [2/5] Creating Python virtual environment...
cd /d "%PROJECT%\backend"
python -m venv venv
echo Done.

echo.
echo [3/5] Installing Python dependencies...
call "%PROJECT%\backend\venv\Scripts\activate.bat"
pip install -r "%PROJECT%\backend\requirements.txt"
if %errorlevel% neq 0 (
    echo FAILED: pip install
    pause
    exit /b 1
)
echo Done.

echo.
echo [4/5] Seeding demo data...
cd /d "%PROJECT%\backend"
python seed_data.py
echo Done.

echo.
echo [5/5] Starting Backend Server...
echo.
echo ====================================
echo   BACKEND STARTING ON PORT 8000
echo   Keep this window open!
echo   
echo   Now open a NEW terminal and run:
echo   cd "%PROJECT%\frontend"
echo   npm run dev
echo   
echo   Then open http://localhost:5173
echo ====================================
echo.
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
