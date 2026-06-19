@echo off
title Furniture ERP - Production Server (Cache Refresh Every Hour)
cd /d "%~dp0"

echo ============================================
echo    Furniture ERP - Production Server
echo    Cache refresh every hour (no restart)
echo ============================================
echo.

:: Initial build
echo [%date% %time%] Building project...
call npm run build
if errorlevel 1 (
    echo [%date% %time%] [ERROR] Build failed
    pause
    exit /b 1
)

:: Start server (once)
echo [%date% %time%] Starting server...
start /b "" npm run start

echo [%date% %time%] Server started. Refreshing cache every hour...

:refresh-loop
timeout /t 3600 /nobreak >nul

echo [%date% %time%] Clearing Next.js cache...
if exist ".next\cache" (
    rmdir /s /q ".next\cache"
    echo [%date% %time%] Cache cleared.
)

echo [%date% %time%] Rebuilding with fresh cache...
call npm run build
if errorlevel 1 (
    echo [%date% %time%] [ERROR] Rebuild failed, retrying in 5 minutes...
    timeout /t 300 /nobreak >nul
)

goto refresh-loop
