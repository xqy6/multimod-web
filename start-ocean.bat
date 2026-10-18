@echo off
setlocal
title Ocean Shallows - local preview
cd /d "%~dp0web"

if not exist "node_modules\vite\bin\vite.js" (
  echo [1/2] node_modules not found, running npm install ...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo npm install failed. Check your network or run "npm.cmd install" manually in .\web
    pause
    exit /b 1
  )
)

echo [2/2] starting Vite on http://127.0.0.1:5173/home
start "Ocean Shallows server" cmd /c "node_modules\.bin\vite.cmd --host 0.0.0.0 --port 5173 --strictPort"
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5173/home"

echo.
echo Browser opened. Keep the "Ocean Shallows server" window open while you look around.
echo Close that window (or press Ctrl+C in it) to stop the server.
timeout /t 6 /nobreak >nul
