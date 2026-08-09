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
"%NODE%" "%~dp0server\scripts\lan.mjs"
pause
