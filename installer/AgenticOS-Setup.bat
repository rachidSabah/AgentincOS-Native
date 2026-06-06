@echo off
setlocal enabledelayedexpansion
title Agentic OS Installer
color 0A

echo.
echo   ========================================================
echo    Agentic OS v2.0.0 — One-Click Installer
echo   ========================================================
echo.
echo   Installing to: %LOCALAPPDATA%\Agentic OS
echo.

:: Set paths
set "INSTALL_DIR=%LOCALAPPDATA%\Agentic OS"
set "TEMP_DIR=%TEMP%\AgenticOS-Install"

:: Create install directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%INSTALL_DIR%\runtime" mkdir "%INSTALL_DIR%\runtime"
if not exist "%INSTALL_DIR%\server" mkdir "%INSTALL_DIR%\server"
if not exist "%INSTALL_DIR%\db" mkdir "%INSTALL_DIR%\db"
if not exist "%INSTALL_DIR%\prisma" mkdir "%INSTALL_DIR%\prisma"
if not exist "%INSTALL_DIR%\data" mkdir "%INSTALL_DIR%\data"
if not exist "%INSTALL_DIR%\logs" mkdir "%INSTALL_DIR%\logs"

:: Extract from temp
if exist "%TEMP_DIR%" (
    echo   [1/5] Extracting application files...
    xcopy /E /Y /Q "%TEMP_DIR%\server\*" "%INSTALL_DIR%\server\" >nul 2>&1
    xcopy /E /Y /Q "%TEMP_DIR%\db\*" "%INSTALL_DIR%\db\" >nul 2>&1
    xcopy /E /Y /Q "%TEMP_DIR%\prisma\*" "%INSTALL_DIR%\prisma\" >nul 2>&1
    xcopy /E /Y /Q "%TEMP_DIR%\runtime\*" "%INSTALL_DIR%\runtime\" >nul 2>&1
    xcopy /E /Y /Q "%TEMP_DIR%\node_modules\*" "%INSTALL_DIR%\server\node_modules\" >nul 2>&1
    
    echo   [2/5] Setting up launcher...
    copy /Y "%TEMP_DIR%\start.bat" "%INSTALL_DIR%\start.bat" >nul
    copy /Y "%TEMP_DIR%\stop.bat" "%INSTALL_DIR%\stop.bat" >nul
    copy /Y "%TEMP_DIR%\icon.ico" "%INSTALL_DIR%\icon.ico" >nul
) else (
    echo   [1/5] Copying from current directory...
    xcopy /E /Y /Q "%~dp0server\*" "%INSTALL_DIR%\server\" >nul 2>&1
    xcopy /E /Y /Q "%~dp0db\*" "%INSTALL_DIR%\db\" >nul 2>&1
    xcopy /E /Y /Q "%~dp0prisma\*" "%INSTALL_DIR%\prisma\" >nul 2>&1
    xcopy /E /Y /Q "%~dp0runtime\*" "%INSTALL_DIR%\runtime\" >nul 2>&1
    copy /Y "%~dp0start.bat" "%INSTALL_DIR%\start.bat" >nul
    copy /Y "%~dp0stop.bat" "%INSTALL_DIR%\stop.bat" >nul
    copy /Y "%~dp0icon.ico" "%INSTALL_DIR%\icon.ico" >nul
)

echo   [3/5] Creating shortcuts...
:: Create desktop shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Agentic OS.lnk'); $sc.TargetPath = '%INSTALL_DIR%\start.bat'; $sc.WorkingDirectory = '%INSTALL_DIR%'; $sc.IconLocation = '%INSTALL_DIR%\icon.ico'; $sc.Description = 'Agentic OS — Autonomous AI Operating System'; $sc.Save()" 2>nul

:: Create start menu shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut([Environment]::GetFolderPath('StartMenu') + '\Programs\Agentic OS.lnk'); $sc.TargetPath = '%INSTALL_DIR%\start.bat'; $sc.WorkingDirectory = '%INSTALL_DIR%'; $sc.IconLocation = '%INSTALL_DIR%\icon.ico'; $sc.Description = 'Agentic OS — Autonomous AI Operating System'; $sc.Save()" 2>nul

echo   [4/5] Initializing database...
"%INSTALL_DIR%\runtime\node.exe" "%INSTALL_DIR%\server\node_modules\prisma\build\index.js" db push --schema="%INSTALL_DIR%\prisma\schema.prisma" 2>nul

echo   [5/5] Registering uninstaller...
:: Register in Add/Remove Programs
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "DisplayName" /t REG_SZ /d "Agentic OS" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "DisplayVersion" /t REG_SZ /d "2.0.0" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "Publisher" /t REG_SZ /d "AgenticOS Team" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "UninstallString" /t REG_SZ /d "%INSTALL_DIR%\uninstall.bat" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1

:: Create uninstaller
echo @echo off > "%INSTALL_DIR%\uninstall.bat"
echo title Uninstall Agentic OS >> "%INSTALL_DIR%\uninstall.bat"
echo echo Uninstalling Agentic OS... >> "%INSTALL_DIR%\uninstall.bat"
echo call "%INSTALL_DIR%\stop.bat" 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Agentic OS" /f 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo del "%%USERPROFILE%%\Desktop\Agentic OS.lnk" 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo rd /s /q "%INSTALL_DIR%" 2^>nul >> "%INSTALL_DIR%\uninstall.bat"
echo echo Agentic OS has been uninstalled. >> "%INSTALL_DIR%\uninstall.bat"
echo pause >> "%INSTALL_DIR%\uninstall.bat"

:: Create environment file
echo # Agentic OS Environment > "%INSTALL_DIR%\.env"
echo DATABASE_URL=file:../db/agentic.db >> "%INSTALL_DIR%\.env"
echo PORT=3000 >> "%INSTALL_DIR%\.env"
echo HOSTNAME=127.0.0.1 >> "%INSTALL_DIR%\.env"
echo NODE_ENV=production >> "%INSTALL_DIR%\.env"
echo NEXT_TELEMETRY_DISABLED=1 >> "%INSTALL_DIR%\.env"

echo.
echo   ========================================================
echo    Installation Complete!
echo   ========================================================
echo.
echo   Agentic OS has been installed to:
echo   %INSTALL_DIR%
echo.
echo   You can launch it from:
echo     - Desktop shortcut
echo     - Start Menu
echo     - Or run: %INSTALL_DIR%\start.bat
echo.

:: Ask to launch
choice /C YN /M "   Launch Agentic OS now"
if errorlevel 2 goto :done
if errorlevel 1 goto :launch

:launch
echo.
echo   Starting Agentic OS...
start "" "%INSTALL_DIR%\start.bat"
timeout /t 3 /nobreak >nul
start http://127.0.0.1:3000

:done
echo.
echo   Thank you for installing Agentic OS!
timeout /t 3 /nobreak >nul
endlocal
