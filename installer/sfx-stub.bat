@echo off
setlocal enabledelayedexpansion
:: Agentic OS v2.0.0 — Self-Extracting Installer
:: This .exe extracts its payload and runs the installer

set "TEMP_DIR=%TEMP%\AgenticOS-Setup-2.0.0"
set "INSTALL_DIR=%LOCALAPPDATA%\Agentic OS"

echo.
echo   ========================================================
echo    Agentic OS v2.0.0 — One-Click Installer
echo   ========================================================
echo.
echo   Extracting files...
echo.

:: Create temp directory
if exist "%TEMP_DIR%" rd /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

:: Use PowerShell to extract the ZIP payload from this .exe
:: The ZIP data starts after the batch stub
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $exePath = '%~f0'; $zipPath = '%TEMP%\AgenticOS-payload.zip'; $stream = [System.IO.File]::OpenRead($exePath); $reader = New-Object System.IO.BinaryReader($stream); $reader.BaseStream.Seek(-4, 'End') | Out-Null; $marker = [System.Text.Encoding]::ASCII.GetString($reader.ReadBytes(4)); if ($marker -eq 'AGOS') { $reader.BaseStream.Seek(-8, 'End') | Out-Null; $zipSize = $reader.ReadInt32(); $reader.BaseStream.Seek(-($zipSize + 8), 'End') | Out-Null; $zipData = $reader.ReadBytes($zipSize); [System.IO.File]::WriteAllBytes($zipPath, $zipData); } $reader.Close(); $stream.Close(); if (Test-Path $zipPath) { Expand-Archive -Path $zipPath -DestinationPath '%TEMP_DIR%' -Force; Remove-Item $zipPath; Write-Host 'Extraction complete.'; } else { Write-Host 'Error: Could not extract payload.'; exit 1; } }"

if errorlevel 1 (
    echo   Error: Extraction failed.
    pause
    exit /b 1
)

:: Run the PowerShell installer
echo   Running installer...
powershell -NoProfile -ExecutionPolicy Bypass -File "%TEMP_DIR%\install.ps1"

:: Cleanup
rd /s /q "%TEMP_DIR%" 2>nul

endlocal
exit /b 0
