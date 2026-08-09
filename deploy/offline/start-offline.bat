@echo off
setlocal
cd /d "%~dp0"

set "NODE=%~dp0node\node.exe"
if not exist "%NODE%" (
  echo [ERROR] node.exe not found.
  echo Please copy the whole offline-package folder to USB.
  pause
  exit /b 1
)
if not exist "server\src\index.js" (
  echo [ERROR] server files not found.
  echo Please copy the whole offline-package folder to USB.
  pause
  exit /b 1
)

set "PORT=4100"
start "MODULO Offline Server" "%~dp0start-server.bat"

echo Waiting for the offline server...
for /l %%i in (1,1,15) do (
  "%NODE%" -e "fetch('http://127.0.0.1:4100/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >nul 2>&1
  if not errorlevel 1 goto ready
  timeout /t 1 /nobreak >nul
)

echo [ERROR] The offline server did not start. Check server\offline.log
if exist "%~dp0server\offline.log" type "%~dp0server\offline.log"
pause
exit /b 1

:ready
start "" "http://127.0.0.1:4100"
echo Offline site is ready at http://127.0.0.1:4100
echo Keep the MODULO Offline Server window open. Close it to stop.
pause
