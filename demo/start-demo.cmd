@echo off
setlocal
cd /d "%~dp0\.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo YellowVSL needs Node.js to start the local HTTP server.
  echo Install Node.js from https://nodejs.org/ and run this file again.
  echo.
  pause
  exit /b 1
)

echo Starting YellowVSL demo...
node demo\server.mjs
if errorlevel 1 pause
