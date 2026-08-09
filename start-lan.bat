@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Please install Node.js first.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  set PM=npm
) else (
  set PM=pnpm
)

if "%PM%"=="npm" (
  set BUILD=run build
) else (
  set BUILD=build
)

if not exist "web\node_modules" (
  echo Installing frontend dependencies...
  cd web
  call %PM% install
  if errorlevel 1 (
    echo Frontend install failed.
    pause
    exit /b 1
  )
  cd ..
)

echo Building frontend...
cd web
call %PM% %BUILD%
if errorlevel 1 (
  echo Frontend build failed.
  pause
  exit /b 1
)
cd ..

if not exist "server\node_modules" (
  echo Installing server dependencies...
  cd server
  call %PM% install
  if errorlevel 1 (
    echo Server install failed.
    pause
    exit /b 1
  )
  cd ..
)

echo Starting LAN chat server...
cd server
node scripts\lan.mjs
pause
