@echo off
echo ========================================================
echo   Pulling latest changes from Git (origin/main)...
echo ========================================================
echo.
cd /d "%~dp0"
git pull origin main
echo.
if exist "harvestlink-ai\.git" (
    echo Pulling inside harvestlink-ai...
    cd /d "%~dp0harvestlink-ai"
    git pull origin main
)
echo.
echo Pull complete!
pause
