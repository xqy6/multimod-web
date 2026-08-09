@echo off
setlocal
cd /d "%~dp0"

set "NODE=%~dp0node\node.exe"
set "PORT=4100"
"%NODE%" "%~dp0server\scripts\lan.mjs" > "%~dp0server\offline.log" 2>&1
echo.
echo The offline server has stopped. Close this window.
pause
