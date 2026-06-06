@echo off
:: ═══════════════════════════════════════════════════════════════════════════════
:: Agentic OS v2.0.0 — Manual Uninstall Script
:: Removes Agentic OS from the system
:: ═══════════════════════════════════════════════════════════════════════════════

title Agentic OS - Uninstalling...
color 0E

:: ─── Configuration ───────────────────────────────────────────────────────────
set APP_NAME=Agentic OS
set APP_IDENTIFIER=com.agentic-os.desktop
set "INSTALL_DIR=%~dp0"

echo.
echo   ═══════════════════════════════════════════════════════
echo   %APP_NAME% — Uninstaller
echo   ═══════════════════════════════════════════════════════
echo.
echo   This will remove %APP_NAME% from your system.
echo   All data, including the database and logs, will be deleted.
echo.

:: ─── Confirmation ────────────────────────────────────────────────────────────
set /p CONFIRM="   Are you sure? Type 'yes' to continue: "
if /i not "%CONFIRM%"=="yes" (
    echo.
    echo   Uninstall cancelled.
    pause
    exit /b 0
)

echo.
echo   ─────────────────────────────────────────────────────
echo.

:: ─── Step 1: Stop the Server ────────────────────────────────────────────────
echo   [1/6] Stopping %APP_NAME% server...
if exist "%INSTALL_DIR%stop.bat" (
    call "%INSTALL_DIR%stop.bat" >NUL 2>NUL
) else (
    :: Manual stop
    for /f "tokens=5" %%p in ('netstat -aon ^| find ":3000 " ^| find "LISTENING" 2^>NUL') do (
        taskkill /PID %%p /T /F >NUL 2>NUL
    )
)
echo   [OK] Server stopped

:: ─── Step 2: Unregister Windows Service ─────────────────────────────────────
echo   [2/6] Unregistering Windows service...
if exist "%INSTALL_DIR%AgenticOS.service.js" (
    where node >NUL 2>NUL
    if %ERRORLEVEL%==0 (
        node "%INSTALL_DIR%AgenticOS.service.js" --uninstall >NUL 2>NUL
    )
)
echo   [OK] Service unregistered

:: ─── Step 3: Remove Start Menu Shortcuts ────────────────────────────────────
echo   [3/6] Removing Start Menu shortcuts...
if exist "%SMPROGRAMS%\%APP_NAME%" (
    rmdir /s /q "%SMPROGRAMS%\%APP_NAME%" 2>NUL
)
if exist "%SMPROGRAMS%\Agentic OS" (
    rmdir /s /q "%SMPROGRAMS%\Agentic OS" 2>NUL
)
echo   [OK] Start Menu shortcuts removed

:: ─── Step 4: Remove Desktop Shortcut ────────────────────────────────────────
echo   [4/6] Removing Desktop shortcut...
if exist "%DESKTOP%\%APP_NAME%.lnk" del "%DESKTOP%\%APP_NAME%.lnk" 2>NUL
if exist "%DESKTOP%\Agentic OS.lnk" del "%DESKTOP%\Agentic OS.lnk" 2>NUL
if exist "%PUBLICDESKTOP%\%APP_NAME%.lnk" del "%PUBLICDESKTOP%\%APP_NAME%.lnk" 2>NUL
if exist "%PUBLICDESKTOP%\Agentic OS.lnk" del "%PUBLICDESKTOP%\Agentic OS.lnk" 2>NUL
echo   [OK] Desktop shortcut removed

:: ─── Step 5: Remove Registry Entries ────────────────────────────────────────
echo   [5/6] Removing registry entries...
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\%APP_NAME%" /f >NUL 2>NUL
reg delete "HKLM\Software\%APP_NAME%" /f >NUL 2>NUL
reg delete "HKCR\.aos" /f >NUL 2>NUL
reg delete "HKCR\%APP_IDENTIFIER%" /f >NUL 2>NUL
echo   [OK] Registry entries removed

:: ─── Step 6: Remove Installation Directory ──────────────────────────────────
echo   [6/6] Removing installation directory...

:: Ask about data preservation
echo.
echo   Do you want to keep your database and logs?
set /p KEEP_DATA="   Type 'yes' to keep data, or press Enter to delete everything: "

if /i "%KEEP_DATA%"=="yes" (
    echo   [..] Preserving data directory...
    :: Remove everything except db/ and logs/
    rmdir /s /q "%INSTALL_DIR%server" 2>NUL
    rmdir /s /q "%INSTALL_DIR%prisma" 2>NUL
    rmdir /s /q "%INSTALL_DIR%node_modules" 2>NUL
    del /q "%INSTALL_DIR%start.bat" 2>NUL
    del /q "%INSTALL_DIR%stop.bat" 2>NUL
    del /q "%INSTALL_DIR%uninstall.bat" 2>NUL
    del /q "%INSTALL_DIR%AgenticOS.service.js" 2>NUL
    del /q "%INSTALL_DIR%.env" 2>NUL
    del /q "%INSTALL_DIR%icon.ico" 2>NUL
    del /q "%INSTALL_DIR%uninstall.exe" 2>NUL
    echo   [OK] Files removed, data preserved in:
    echo        %INSTALL_DIR%db\
    echo        %INSTALL_DIR%logs\
) else (
    :: Full removal - we need to do this from a temp script
    :: since we can't delete the directory we're running from
    echo   [..] Scheduling complete directory removal...
    (
        echo @echo off
        echo timeout /t 2 /nobreak ^>NUL
        echo rmdir /s /q "%INSTALL_DIR%" 2^>NUL
        echo del "%%~f0" 2^>NUL
    ) > "%TEMP%\agentic-cleanup.bat"
    start "" /MIN "%TEMP%\agentic-cleanup.bat"
    echo   [OK] Directory removal scheduled
)

echo.
echo   ═══════════════════════════════════════════════════════
echo   %APP_NAME% has been uninstalled successfully.
echo   ═══════════════════════════════════════════════════════
echo.
echo   Thank you for using %APP_NAME%!
echo.
pause
