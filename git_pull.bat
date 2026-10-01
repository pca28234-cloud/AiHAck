@echo off
echo ========================================================
echo   Pulling latest changes from Git (origin/main)...
echo ========================================================
echo.
cd /d "%~dp0"
git pull origin main
echo.
echo Pull complete!
pause
