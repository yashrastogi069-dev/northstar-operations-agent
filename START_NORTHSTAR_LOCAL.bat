@echo off
setlocal EnableExtensions
 title Northstar Operations Agent - Local

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the current Node.js LTS release, then run this file again.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  echo pnpm was not found. Install it with: npm install --global pnpm
  pause
  exit /b 1
)

if not exist package.json (
  echo package.json was not found. Keep this .bat file in the Northstar repository root.
  pause
  exit /b 1
)

if not exist .env (
  echo No .env file was found.
  copy /Y .env.example .env >nul
  echo Created .env from .env.example.
  echo Edit .env with your authorized local values, then run this file again.
  echo The .env file is ignored by Git and must never be committed.
  pause
  exit /b 0
)

if not exist node_modules (
  echo Installing Northstar dependencies...
  call pnpm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

if "%PORT%"=="" set PORT=3004
set NODE_ENV=development

echo Starting Northstar Operations Agent on http://localhost:%PORT%
echo Keep this window open while using Northstar.
echo Press Ctrl+C to stop the local server.
call pnpm dev

if errorlevel 1 (
  echo Northstar stopped with an error. Review the output above.
  pause
)
endlocal
