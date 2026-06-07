@echo off
:: ═══════════════════════════════════════════════════════════════════════════════
:: Agentic OS v2.0.0 — One-Click Launcher
:: Uses the bundled Node.js runtime — no external dependencies required
:: ═══════════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

:: ─── Detect Installation Directory ─────────────────────────────────────────────
set "APP_DIR=%~dp0"
set "NODE_EXE=%APP_DIR%runtime\node.exe"
set "SERVER_DIR=%APP_DIR%server"
set "DB_DIR=%APP_DIR%db"
set "DATA_DIR=%APP_DIR%data"
set "LOGS_DIR=%APP_DIR%logs"

:: ─── Check Node.js Runtime ─────────────────────────────────────────────────────
if not exist "%NODE_EXE%" (
    echo [ERROR] Node.js runtime not found at: %NODE_EXE%
    echo The application may be corrupted. Please reinstall Agentic OS.
    pause
    exit /b 1
)

:: ─── Create Data Directories ───────────────────────────────────────────────────
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"
if not exist "%DB_DIR%" mkdir "%DB_DIR%"

:: ─── Run Database Migrations ───────────────────────────────────────────────────
echo [Agentic OS] Initializing database...
cd /d "%APP_DIR%"
"%NODE_EXE%" "%APP_DIR%\prisma\migrate.js" db push --schema="%APP_DIR%\prisma\schema.prisma" 2>nul
if errorlevel 1 (
    echo [Agentic OS] Running Prisma migrations...
    "%NODE_EXE%" "%SERVER_DIR%\node_modules\prisma\build\index.js" db push --schema="%APP_DIR%\prisma\schema.prisma" 2>nul
)

:: ─── Set Environment ───────────────────────────────────────────────────────────
set "DATABASE_URL=file:%DB_DIR%\agentic.db"
set "PORT=3000"
set "HOSTNAME=127.0.0.1"
set "NODE_ENV=production"
set "NEXT_TELEMETRY_DISABLED=1"

:: ─── Kill Any Existing Instance ────────────────────────────────────────────────
tasklist /FI "WINDOWTITLE eq AgenticOS*" 2>nul | find /i "node" >nul && (
    echo [Agentic OS] Stopping existing instance...
    taskkill /F /FI "WINDOWTITLE eq AgenticOS*" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

:: ─── Launch the Server ─────────────────────────────────────────────────────────
echo.
echo  ══════════════════════════════════════════════
echo   Agentic OS v2.0.0 — Starting...
echo  ══════════════════════════════════════════════
echo.
echo   Server: http://127.0.0.1:3000
echo   Press Ctrl+C to stop
echo.

title AgenticOS Server

:: Start the Next.js server using bundled Node.js
cd /d "%SERVER_DIR%"
"%NODE_EXE%" server.js

:: If server exits unexpectedly, pause to show error
if errorlevel 1 (
    echo.
    echo [Agentic OS] Server exited with error code %errorlevel%
    echo Check logs at: %LOGS_DIR%
    pause
)

endlocal
