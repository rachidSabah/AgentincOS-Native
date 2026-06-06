@echo off
:: ═══════════════════════════════════════════════════════════════════════════════
:: Agentic OS v2.0.0 — Uninstaller (runs the NSIS uninstall.exe)
:: ═══════════════════════════════════════════════════════════════════════════════

set "APP_DIR=%~dp0"

:: Stop the server first
call "%APP_DIR%stop.bat" 2>nul

:: Run the official uninstaller
if exist "%APP_DIR%uninstall.exe" (
    "%APP_DIR%uninstall.exe" /S _?=%APP_DIR%
) else (
    echo Uninstaller not found. Please remove the installation directory manually.
    pause
)
