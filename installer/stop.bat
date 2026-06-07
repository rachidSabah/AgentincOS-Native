@echo off
:: ═══════════════════════════════════════════════════════════════════════════════
:: Agentic OS v2.0.0 — Stop Server
:: ═══════════════════════════════════════════════════════════════════════════════

echo Stopping Agentic OS...

:: Kill the Node.js process running on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Also kill by window title
taskkill /F /FI "WINDOWTITLE eq AgenticOS*" >nul 2>&1

echo Agentic OS has been stopped.
timeout /t 3 /nobreak >nul
