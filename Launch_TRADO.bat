@echo off
title TRADO - One Click Launch
color 0A
echo.
echo  ======================================================
echo            TRADO TRADING PLATFORM - STARTING...
echo  ======================================================
echo.

:: Kill any old processes on port 4000 and 5173
echo  [1/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :4000') do ( if %%a neq 0 taskkill /F /PID %%a >nul 2>&1 )
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :5173') do ( if %%a neq 0 taskkill /F /PID %%a >nul 2>&1 )
timeout /t 1 >nul

:: Start Backend (hidden window)
echo  [2/3] Starting Backend Server...
start "" /min cmd /c "cd /d %~dp0backend && npm start"
timeout /t 3 >nul

:: Start Frontend (hidden window)
echo  [3/3] Starting Frontend...
start "" /min cmd /c "cd /d %~dp0frontend && npm run dev"
timeout /t 3 >nul

echo.
echo  ======================================================
echo               ALL SYSTEMS ONLINE
echo  ======================================================
echo.
echo   Local:   http://localhost:5173
echo   Public:  https://kindhearted-zaire-overflorid.ngrok-free.dev
echo.
echo   DO NOT CLOSE THIS WINDOW!
echo   Press Ctrl+C to stop everything.
echo  ======================================================
echo.

:: Start ngrok (this keeps the window open)
ngrok http --url=kindhearted-zaire-overflorid.ngrok-free.dev 5173
