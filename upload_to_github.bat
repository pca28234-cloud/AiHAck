@echo off
echo ==============================================
echo   Uploading HarvestLink AI to GitHub
echo ==============================================
echo.

echo Pushing code to https://github.com/pca28234-cloud/AiHAck.git...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo SUCCESS! Your code is now on GitHub.
    echo Refresh your browser to see it.
) else (
    echo FAILED! Something went wrong. 
    echo Make sure you log in to GitHub when the window pops up.
)
echo.
pause
