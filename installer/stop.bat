@echo off
:: ═══════════════════════════════════════════════════════════════════════════════
:: Agentic OS v2.0.0 — Stop Script
:: Stops the running Next.js server process
:: ═══════════════════════════════════════════════════════════════════════════════

title Agentic OS - Stopping...
color 0C

:: ─── Configuration ───────────────────────────────────────────────────────────
set APP_NAME=Agentic OS
set PORT=3000
set "INSTALL_DIR=%~dp0"
set "PID_FILE=%INSTALL_DIR%agentic-os.pid"

echo.
echo   %APP_NAME% — Stopping...
echo   ─────────────────────────────────────────────────────
echo.

:: ─── Method 1: Kill by PID file ─────────────────────────────────────────────
if exist "%PID_FILE%" (
    echo   [..] Found PID file, attempting graceful shutdown...
    for /f "tokens=*" %%p in (%PID_FILE%) do (
        tasklist /FI "PID eq %%p" 2>NUL | find "%%p" >NUL
        if !ERRORLEVEL!==0 (
            taskkill /PID %%p /T /F >NUL 2>NUL
            echo   [OK] Process %%p terminated
        )
    )
    del "%PID_FILE%" 2>NUL
    echo   [OK] PID file removed
) else (
    echo   [..] No PID file found, searching for running processes...
)

:: ─── Method 2: Kill by window title ─────────────────────────────────────────
tasklist /FI "WINDOWTITLE eq AgenticOS-Server" /NH 2>NUL | find "cmd" >NUL
if %ERRORLEVEL%==0 (
    echo   [..] Stopping AgenticOS-Server window...
    taskkill /FI "WINDOWTITLE eq AgenticOS-Server" /T /F >NUL 2>NUL
    echo   [OK] Server window closed
)

:: ─── Method 3: Kill node processes on port 3000 ─────────────────────────────
echo   [..] Checking for Node.js processes on port %PORT%...

:: Use netstat to find PIDs listening on port 3000
for /f "tokens=5" %%p in ('netstat -aon ^| find ":%PORT% " ^| find "LISTENING" 2^>NUL') do (
    if not "%%p"=="0" (
        echo   [..] Found process %%p on port %PORT%, terminating...
        taskkill /PID %%p /T /F >NUL 2>NUL
        if !ERRORLEVEL!==0 (
            echo   [OK] Process %%p terminated
        ) else (
            echo   [WARN] Could not terminate process %%p (may need admin rights)
        )
    )
)

:: ─── Method 4: Fallback - kill all node processes with AgenticOS in title ───
:: (Only as last resort - we don't want to kill other Node.js apps)
wmic process where "name='node.exe' and CommandLine like '%%server.js%%'" get ProcessId 2>NUL | find "[0-9]" >NUL
if %ERRORLEVEL%==0 (
    for /f "tokens=*" %%p in ('wmic process where "name='node.exe' and CommandLine like '%%server.js%%'" get ProcessId 2^>NUL ^| find "[0-9]"') do (
        echo   [..] Found node process %%p (server.js), terminating...
        taskkill /PID %%p /F >NUL 2>NUL
    )
)

:: ─── Verify ──────────────────────────────────────────────────────────────────
netstat -aon | find ":%PORT% " | find "LISTENING" >NUL 2>NUL
if %ERRORLEVEL%==0 (
    echo.
    echo   [WARN] Port %PORT% is still in use. Some processes may not have been stopped.
    echo          Try running this script as Administrator.
) else (
    echo.
    echo   [OK] %APP_NAME% has been stopped successfully.
)

:: ─── Cleanup ─────────────────────────────────────────────────────────────────
if exist "%PID_FILE%" del "%PID_FILE%" 2>NUL

echo.
echo   ─────────────────────────────────────────────────────
echo.
pause
