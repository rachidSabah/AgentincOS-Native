@echo off
title Gemini Desktop - Infohas Engine
cd /d "C:\Users\piopi\Documents\gemini-projects\gemini-desktop"

echo Starting Gemini Desktop Dashboard...
echo Database: SQLite (Prisma)
echo UI: http://localhost:3000

:: Start the Next.js development server in a new minimized window
start /min "Gemini Dashboard Server" cmd /c "npm run dev"

:: Wait for server to initialize
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

:: Open the browser automatically
echo Opening dashboard in browser...
start http://localhost:3000

:: Return to root and keep terminal open for CLI commands
cd /d "C:\Users\piopi\Documents\gemini-projects"
echo.
echo Gemini CLI is ready.
echo Type 'gemini' to start the terminal version, or use the browser dashboard.
echo.
cmd /k
