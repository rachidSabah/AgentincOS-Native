@echo off
:: ═══════════════════════════════════════════════════════════════════════════════
:: Agentic OS v2.0.0 — Start Script
:: Starts the Next.js server and opens the browser
:: ═══════════════════════════════════════════════════════════════════════════════

title Agentic OS - Starting...
color 0A

:: ─── Configuration ───────────────────────────────────────────────────────────
set APP_NAME=Agentic OS
set APP_VERSION=2.0.0
set PORT=3000
set HOST=0.0.0.0
set BROWSER_URL=http://localhost:%PORT%

:: ─── Resolve Install Directory ──────────────────────────────────────────────
set "INSTALL_DIR=%~dp0"
set "SERVER_DIR=%INSTALL_DIR%server"
set "DB_DIR=%INSTALL_DIR%db"
set "LOGS_DIR=%INSTALL_DIR%logs"
set "PID_FILE=%INSTALL_DIR%agentic-os.pid"

:: ─── Check if Already Running ───────────────────────────────────────────────
if exist "%PID_FILE%" (
    set /p EXISTING_PID=<"%PID_FILE%"
    tasklist /FI "PID eq %EXISTING_PID%" 2>NUL | find "%EXISTING_PID%" >NUL
    if %ERRORLEVEL%==0 (
        echo.
        echo   [!] %APP_NAME% is already running (PID: %EXISTING_PID%)
        echo       Open your browser: %BROWSER_URL%
        echo       To stop, run: stop.bat
        echo.
        start "" "%BROWSER_URL%"
        timeout /t 3 >NUL
        exit /b 0
    ) else (
        del "%PID_FILE%" 2>NUL
    )
)

:: ─── Check for Node.js ──────────────────────────────────────────────────────
echo.
echo   %APP_NAME% v%APP_VERSION% — Starting...
echo   ─────────────────────────────────────────────────────
echo.

where node >NUL 2>NUL
if %ERRORLEVEL% neq 0 (
    echo   [ERROR] Node.js is not installed or not in PATH!
    echo.
    echo   Please install Node.js v18+ from https://nodejs.org
    echo   After installing, restart your terminal and try again.
    echo.
    pause
    exit /b 1
)

:: Show Node.js version
for /f "tokens=*" %%v in ('node --version') do set NODE_VERSION=%%v
echo   [OK] Node.js %NODE_VERSION% detected

:: ─── Create Required Directories ────────────────────────────────────────────
if not exist "%DB_DIR%" mkdir "%DB_DIR%"
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

:: ─── Set Environment Variables ──────────────────────────────────────────────
set DATABASE_URL=file:%DB_DIR%\agentic.db
set NODE_ENV=production
set PORT=%PORT%
set HOSTNAME=%HOST%

:: ─── Run Database Migrations ────────────────────────────────────────────────
echo   [..] Running database migrations...
if exist "%INSTALL_DIR%prisma\schema.prisma" (
    if exist "%SERVER_DIR%\node_modules\prisma\build\index.js" (
        node "%SERVER_DIR%\node_modules\prisma\build\index.js" db push --schema="%INSTALL_DIR%prisma\schema.prisma" 2>NUL
        if %ERRORLEVEL%==0 (
            echo   [OK] Database migrations complete
        ) else (
            echo   [WARN] Database migration failed, will retry on first access
        )
    ) else if exist "%INSTALL_DIR%node_modules\prisma\build\index.js" (
        node "%INSTALL_DIR%node_modules\prisma\build\index.js" db push --schema="%INSTALL_DIR%prisma\schema.prisma" 2>NUL
        if %ERRORLEVEL%==0 (
            echo   [OK] Database migrations complete
        ) else (
            echo   [WARN] Database migration failed, will retry on first access
        )
    ) else (
        echo   [WARN] Prisma CLI not found, skipping migrations
    )
) else (
    echo   [WARN] No Prisma schema found, skipping migrations
)

:: ─── Start the Server ───────────────────────────────────────────────────────
echo   [..] Starting %APP_NAME% server on port %PORT%...
echo.

cd /d "%SERVER_DIR%"

:: Start the server in a new process with a unique window title
start "AgenticOS-Server" /MIN cmd /c "node server.js >> "%LOGS_DIR%\server.log" 2>&1 & echo %%%%processid%%%% > "%PID_FILE%""

:: Wait a moment for the server to start
timeout /t 3 /nobreak >NUL

:: Try to find the PID of the node process
for /f "tokens=2" %%p in ('tasklist /FI "WINDOWTITLE eq AgenticOS-Server" /NH 2^>NUL ^| find "cmd"') do (
    echo %%p > "%PID_FILE%"
)

:: Also find the node.exe child process
for /f "tokens=2" %%p in ('tasklist /FI "IMAGENAME eq node.exe" /NH 2^>NUL ^| find "node"') do (
    echo %%p >> "%PID_FILE%"
)

echo.
echo   ─────────────────────────────────────────────────────
echo   [OK] %APP_NAME% is now running!
echo.
echo   URL:     %BROWSER_URL%
echo   Logs:    %LOGS_DIR%\server.log
echo   PID:     %PID_FILE%
echo.
echo   To stop:  Run stop.bat or close this window
echo   ─────────────────────────────────────────────────────
echo.

:: ─── Open Browser ───────────────────────────────────────────────────────────
echo   [..] Opening browser...
start "" "%BROWSER_URL%"

:: Keep the window open to show status
echo.
echo   Press Ctrl+C to stop the server, or close this window.
echo.
echo   [Tip] The server runs in the background. You can safely
echo         close this window - the server will keep running.
echo.

:: Wait indefinitely (user can close the window)
timeout /t 999999 >NUL
