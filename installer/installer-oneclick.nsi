; ═══════════════════════════════════════════════════════════════════════════════
; Agentic OS v2.0.0 — One-Click Windows Installer (NSIS)
; SELF-CONTAINED: Bundles Node.js runtime — NO external dependencies required
; ═══════════════════════════════════════════════════════════════════════════════

; ─── Application Metadata ─────────────────────────────────────────────────────
!define APP_NAME        "Agentic OS"
!define APP_VERSION     "2.0.0"
!define APP_PUBLISHER   "AgenticOS Team"
!define APP_IDENTIFIER  "com.agentic-os.desktop"
!define APP_URL         "https://github.com/rachidSabah/AgentincOS-Native"
!define APP_ICON        "icon.ico"

; ─── Installer Configuration ─────────────────────────────────────────────────
Name              "${APP_NAME}"
OutFile           "AgenticOS-Setup-${APP_VERSION}.exe"
InstallDir        "$LOCALAPPDATA\${APP_NAME}"
RequestExecutionLevel user
Unicode           true
ManifestDPIAware  true
SetCompressor     /SOLID lzma

CRCCheck          on

; ─── Version Info ─────────────────────────────────────────────────────────────
VIProductVersion  "2.0.0.0"
VIAddVersionKey   "ProductName"     "${APP_NAME}"
VIAddVersionKey   "ProductVersion"  "${APP_VERSION}"
VIAddVersionKey   "CompanyName"     "${APP_PUBLISHER}"
VIAddVersionKey   "FileDescription" "${APP_NAME} One-Click Installer"
VIAddVersionKey   "FileVersion"     "${APP_VERSION}"
VIAddVersionKey   "LegalCopyright"  "Copyright (c) 2024 ${APP_PUBLISHER}"

; ─── Include Standard NSIS Headers ───────────────────────────────────────────
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"

; ─── Variables ────────────────────────────────────────────────────────────────
Var StartMenuFolder

; ─── MUI Settings ─────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"

; ─── Pages ────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY

!define MUI_STARTMENUPAGE_DEFAULTFOLDER "${APP_NAME}"
!insertmacro MUI_PAGE_STARTMENU "Application" $StartMenuFolder

!insertmacro MUI_PAGE_INSTFILES

!define MUI_FINISHPAGE_RUN_TEXT "Launch ${APP_NAME} now"
!define MUI_FINISHPAGE_RUN "$INSTDIR\start.bat"
!define MUI_FINISHPAGE_LINK "Visit ${APP_NAME} on GitHub"
!define MUI_FINISHPAGE_LINK_LOCATION "${APP_URL}"
!insertmacro MUI_PAGE_FINISH

; ─── Uninstaller Pages ───────────────────────────────────────────────────────
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ─── Languages ────────────────────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "English"

; ═══════════════════════════════════════════════════════════════════════════════
; INSTALLER SECTIONS
; ═══════════════════════════════════════════════════════════════════════════════

Section "!${APP_NAME} Core (required)" SecCore
    SectionIn RO

    SetOutPath $INSTDIR

    DetailPrint "Installing ${APP_NAME} v${APP_VERSION}..."

    ; ─── Copy Bundled Node.js Runtime ────────────────────────────────────────
    SetOutPath $INSTDIR\runtime
    DetailPrint "Installing Node.js runtime (bundled)..."
    File "stage\node-runtime-minimal\node.exe"

    ; ─── Copy Next.js Standalone Server ──────────────────────────────────────
    DetailPrint "Installing application server..."
    SetOutPath $INSTDIR\server
    File /r "stage\.next\standalone\*.*"

    ; Copy static files
    SetOutPath $INSTDIR\server\.next\static
    File /r "stage\.next\static\*.*"

    ; ─── Copy Public Assets ──────────────────────────────────────────────────
    SetOutPath $INSTDIR\server\public
    File /r "stage\public\*.*"

    ; ─── Copy Database Files ─────────────────────────────────────────────────
    SetOutPath $INSTDIR\db
    File /r "stage\db\*.*"

    ; ─── Copy Prisma Schema ──────────────────────────────────────────────────
    SetOutPath $INSTDIR\prisma
    File /r "stage\prisma\*.*"

    ; ─── Copy Prisma node_modules ────────────────────────────────────────────
    IfFileExists "stage\node_modules\*.*" 0 skipNodeModules
    SetOutPath $INSTDIR\server\node_modules
    File /r "stage\node_modules\*.*"
    skipNodeModules:

    ; ─── Copy Launcher Scripts ───────────────────────────────────────────────
    SetOutPath $INSTDIR
    File "start.bat"
    File "stop.bat"
    File "${APP_ICON}"

    ; ─── Create Directories ──────────────────────────────────────────────────
    CreateDirectory "$INSTDIR\data"
    CreateDirectory "$INSTDIR\logs"

    ; ─── Create Environment File ─────────────────────────────────────────────
    FileOpen $0 "$INSTDIR\.env" w
    FileWrite $0 "# Agentic OS Environment Configuration$\r$\n"
    FileWrite $0 "DATABASE_URL=file:../db/agentic.db$\r$\n"
    FileWrite $0 "PORT=3000$\r$\n"
    FileWrite $0 "HOSTNAME=127.0.0.1$\r$\n"
    FileWrite $0 "NODE_ENV=production$\r$\n"
    FileWrite $0 "NEXT_TELEMETRY_DISABLED=1$\r$\n"
    FileClose $0

    ; ─── Initialize Database ─────────────────────────────────────────────────
    DetailPrint "Initializing database..."
    nsExec::Exec '"$INSTDIR\runtime\node.exe" "$INSTDIR\server\node_modules\prisma\build\index.js" db push --schema="$INSTDIR\prisma\schema.prisma"'
    Pop $0
    ${If} $0 != 0
        DetailPrint "Database will initialize on first launch."
    ${Else}
        DetailPrint "Database initialized successfully."
    ${EndIf}

SectionEnd

; ─── Start Menu Shortcuts ────────────────────────────────────────────────────
Section "Start Menu Shortcuts" SecStartMenu
    !insertmacro MUI_STARTMENU_WRITE_BEGIN Application

    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\${APP_NAME}.lnk"           "$INSTDIR\start.bat" "" "$INSTDIR\${APP_ICON}" 0
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\Stop ${APP_NAME}.lnk"      "$INSTDIR\stop.bat" "" "$INSTDIR\${APP_ICON}" 0
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\Uninstall ${APP_NAME}.lnk"  "$INSTDIR\uninstall.exe" "" "" 0

    !insertmacro MUI_STARTMENU_WRITE_END
SectionEnd

; ─── Desktop Shortcut ────────────────────────────────────────────────────────
Section "Desktop Shortcut" SecDesktop
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\start.bat" "" "$INSTDIR\${APP_ICON}" 0
SectionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; POST-INSTALL: Register Uninstaller
; ═══════════════════════════════════════════════════════════════════════════════
Section -PostInstall
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"

    ; Register in Add/Remove Programs
    WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName"     "${APP_NAME}"
    WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion"  "${APP_VERSION}"
    WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher"        "${APP_PUBLISHER}"
    WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout"     "${APP_URL}"
    WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString"  "$INSTDIR\uninstall.exe"
    WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation"  "$INSTDIR"
    WriteRegStr   HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon"      "$INSTDIR\${APP_ICON}"
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify"         1
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair"         1

    ; Calculate installed size
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "EstimatedSize" "$0"

    ; Also store install dir
    WriteRegStr HKCU "Software\${APP_NAME}" "InstallDir" $INSTDIR
    WriteRegStr HKCU "Software\${APP_NAME}" "Version" "${APP_VERSION}"

    DetailPrint "${APP_NAME} v${APP_VERSION} installed. No Node.js required!"
SectionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; UNINSTALLER
; ═══════════════════════════════════════════════════════════════════════════════
Section "Uninstall"
    ; Stop the server if running
    nsExec::Exec 'taskkill /F /FI "WINDOWTITLE eq AgenticOS*"'
    Pop $0

    ; Delete Start Menu shortcuts
    !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder
    RMDir /r "$SMPROGRAMS\$StartMenuFolder"

    ; Delete Desktop shortcut
    Delete "$DESKTOP\${APP_NAME}.lnk"

    ; Remove registry entries
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
    DeleteRegKey HKCU "Software\${APP_NAME}"

    ; Remove installation directory
    RMDir /r "$INSTDIR\runtime"
    RMDir /r "$INSTDIR\server"
    RMDir /r "$INSTDIR\db"
    RMDir /r "$INSTDIR\prisma"
    RMDir /r "$INSTDIR\data"
    RMDir /r "$INSTDIR\logs"
    Delete "$INSTDIR\start.bat"
    Delete "$INSTDIR\stop.bat"
    Delete "$INSTDIR\.env"
    Delete "$INSTDIR\${APP_ICON}"
    Delete "$INSTDIR\uninstall.exe"

    RMDir "$INSTDIR"
SectionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; .onInit
; ═══════════════════════════════════════════════════════════════════════════════
Function .onInit
    ; Check for existing installation
    ReadRegStr $0 HKCU "Software\${APP_NAME}" "InstallDir"
    ${If} $0 != ""
        StrCpy $INSTDIR $0
        MessageBox MB_OK|MB_ICONINFORMATION \
            "Upgrading existing ${APP_NAME} at:$\r$\n$0"
    ${EndIf}
FunctionEnd
