@echo off
title TRADO Backend
echo =======================================================
echo              Starting TRADO Backend...                 
echo =======================================================
echo.

echo Cleaning up any old backend instances...
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :4000') do (
    if %%a neq 0 (
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo.
:: Navigate to the backend directory relative to where this script is located
cd /d "%~dp0backend"

:: Start the backend
call npm start

:: If it crashes or stops, pause so the user can read the error
echo.
echo Backend process has stopped.
pause
