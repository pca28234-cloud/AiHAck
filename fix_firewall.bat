@echo off
echo ========================================================
echo   HarvestLink AI - Opening Network Access for Hackathon
echo ========================================================
echo.
echo Windows Firewall is currently blocking other laptops from connecting.
echo A Windows security popup will appear in a moment. 
echo Please click "Yes" to allow access.
echo.

powershell -Command "Start-Process netsh -ArgumentList 'advfirewall firewall add rule name=\"Allow Vite 5173\" dir=in action=allow protocol=TCP localport=5173' -Verb RunAs"

echo.
echo Done! Your teammate should now be able to access the site at:
echo http://172.29.16.221:5173
echo.
pause
