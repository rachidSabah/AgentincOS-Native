; ═══════════════════════════════════════════════════════════════════════════════
; Agentic OS v2.0.0 — Windows Installer (NSIS)
; Nullsoft Scriptable Install System Script
; ═══════════════════════════════════════════════════════════════════════════════

; ─── Application Metadata ─────────────────────────────────────────────────────
!define APP_NAME        "Agentic OS"
!define APP_VERSION     "2.0.0"
!define APP_PUBLISHER   "AgenticOS Team"
!define APP_IDENTIFIER  "com.agentic-os.desktop"
!define APP_EXE         "AgenticOS.exe"
!define APP_URL         "https://github.com/agentic-os/agentic-os-v2"
!define APP_LICENSE     "LICENSE.txt"
!define APP_ICON        "icon.ico"

; ─── Branding Colors ─────────────────────────────────────────────────────────
!define COLOR_BG        "0x1a0a0a"    ; Dark background (#0a0a1a in BGR)
!define COLOR_ACCENT    "0x1A75E8"    ; Accent (#E8751A in BGR)
!define COLOR_SECONDARY "0xdd4e9d"    ; Secondary (#9d4edd in BGR)
!define COLOR_TEXT      "0xFFFFFF"    ; White text
!define COLOR_TEXT_DIM  "0xAAAAAA"    ; Dimmed text

; ─── Installer Configuration ─────────────────────────────────────────────────
Name              "${APP_NAME}"
OutFile           "AgenticOS-Setup-${APP_VERSION}.exe"
InstallDir        "$PROGRAMFILES64\${APP_NAME}"
InstallDirRegKey  HKLM "Software\${APP_NAME}" "InstallDir"
RequestExecutionLevel admin
Unicode           true
ManifestDPIAware  true
SetCompressor     /SOLID lzma
SetCompressorDictSize 64
CRCCheck          on

; Version info for the .exe
VIProductVersion  "2.0.0.0"
VIAddVersionKey   "ProductName"     "${APP_NAME}"
VIAddVersionKey   "ProductVersion"  "${APP_VERSION}"
VIAddVersionKey   "CompanyName"     "${APP_PUBLISHER}"
VIAddVersionKey   "FileDescription" "${APP_NAME} Installer"
VIAddVersionKey   "FileVersion"     "${APP_VERSION}"
VIAddVersionKey   "LegalCopyright"  "Copyright (c) 2024 ${APP_PUBLISHER}"
VIAddVersionKey   "OriginalFilename" "AgenticOS-Setup-${APP_VERSION}.exe"

; ─── Include Standard NSIS Headers ───────────────────────────────────────────
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "FileFunc.nsh"
!include "WordFunc.nsh"
!include "WinVer.nsh"
!include "nsDialogs.nsh"
!include "Sections.nsh"

; ─── Variables ────────────────────────────────────────────────────────────────
Var StartMenuFolder
Var CheckboxLaunch
Var LaunchApp
Var NodeFound
Var Dialog
Var CheckboxNode
Var InstallNode
Var LabelNodeStatus
Var HWND

; ─── Custom Page Declarations ────────────────────────────────────────────────
Page custom PageNodeCheck PageNodeCheckLeave
Page custom PageConfirm

; ─── MUI Interface Settings ──────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Are you sure you want to quit the ${APP_NAME} installation?"
!define MUI_ABORTWARNING_CANCEL_DEFAULT

; ─── Custom Branding ─────────────────────────────────────────────────────────
!define MUI_ICON                       "${NSISDIR}\Contrib\Graphics\Icons\orange-install.ico"
!define MUI_UNICON                     "${NSISDIR}\Contrib\Graphics\Icons\orange-uninstall.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP   "banner.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP         "header.bmp"
!define MUI_BGCOLOR                    ${COLOR_BG}
!define MUI_TEXTCOLOR                  ${COLOR_TEXT}

; ─── MUI Page Definitions ────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${APP_LICENSE}"
!insertmacro MUI_PAGE_DIRECTORY

; Start Menu page
!define MUI_STARTMENUPAGE_DEFAULTFOLDER "${APP_NAME}"
!define MUI_STARTMENUPAGE_REGISTRY_ROOT HKLM
!define MUI_STARTMENUPAGE_REGISTRY_KEY   "Software\${APP_NAME}"
!define MUI_STARTMENUPAGE_REGISTRY_VALUENAME "StartMenuFolder"
!insertmacro MUI_PAGE_STARTMENU Application $StartMenuFolder

!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; ─── Uninstaller Pages ───────────────────────────────────────────────────────
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; ─── Languages ────────────────────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "English"

; ═══════════════════════════════════════════════════════════════════════════════
; CUSTOM PAGE: Node.js Check
; ═══════════════════════════════════════════════════════════════════════════════
Function PageNodeCheck
    !insertmacro MUI_HEADER_TEXT "Prerequisites Check" "Checking for required dependencies"

    nsDialogs::Create 1018
    Pop $Dialog

    ${If} $Dialog == error
        Abort
    ${EndIf}

    ; Check for Node.js
    StrCpy $NodeFound "0"
    nsExec::ExecToStack 'node --version'
    Pop $0  ; return code
    Pop $1  ; output
    ${If} $0 == 0
        StrCpy $NodeFound "1"
    ${EndIf}

    ; Node.js status label
    ${NSD_CreateLabel} 0 0 100% 24u "Node.js Runtime Environment"
    Pop $HWND
    CreateFont $0 "Segoe UI" 12 700
    SendMessage $HWND ${WM_SETFONT} $0 0

    ${If} $NodeFound == "1"
        ${NSD_CreateLabel} 0 30u 100% 16u "Status: Found ($1) \u2713"
        Pop $LabelNodeStatus
        StrCpy $InstallNode "0"
    ${Else}
        ${NSD_CreateLabel} 0 30u 100% 16u "Status: NOT FOUND \u2717"
        Pop $LabelNodeStatus
        StrCpy $InstallNode "1"
    ${EndIf}

    ${NSD_CreateLabel} 0 55u 100% 32u "${APP_NAME} requires Node.js v18+ to run the server. If Node.js is not found on your system, you will need to install it manually from https://nodejs.org before running the application."
    Pop $HWND

    ; Checkbox for "I will install Node.js" or "Skip Node.js check"
    ${If} $NodeFound == "0"
        ${NSD_CreateCheckbox} 0 95u 100% 12u "I understand that Node.js is required and will install it"
        Pop $CheckboxNode
        ${NSD_SetState} $CheckboxNode ${BST_CHECKED}
        StrCpy $InstallNode "1"
    ${Else}
        ${NSD_CreateCheckbox} 0 95u 100% 12u "Node.js detected - no action needed"
        Pop $CheckboxNode
        ${NSD_SetState} $CheckboxNode ${BST_CHECKED}
        EnableWindow $CheckboxNode 0
        StrCpy $InstallNode "0"
    ${EndIf}

    nsDialogs::Show
FunctionEnd

Function PageNodeCheckLeave
    ${If} $NodeFound == "0"
        ${NSD_GetState} $CheckboxNode $0
        ${If} $0 != ${BST_CHECKED}
            MessageBox MB_ICONEXCLAMATION|MB_OK "You must acknowledge that Node.js is required to continue."
            Abort
        ${EndIf}
    ${EndIf}
FunctionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; CUSTOM PAGE: Confirmation
; ═══════════════════════════════════════════════════════════════════════════════
Function PageConfirm
    !insertmacro MUI_HEADER_TEXT "Ready to Install" "Review installation settings"

    nsDialogs::Create 1018
    Pop $Dialog

    ${If} $Dialog == error
        Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 12u "Installation Summary"
    Pop $HWND
    CreateFont $0 "Segoe UI" 12 700
    SendMessage $HWND ${WM_SETFONT} $0 0

    ${NSD_CreateLabel} 0 20u 100% 12u "Application:    ${APP_NAME} v${APP_VERSION}"
    Pop $HWND
    ${NSD_CreateLabel} 0 35u 100% 12u "Install to:       $INSTDIR"
    Pop $HWND
    ${NSD_CreateLabel} 0 50u 100% 12u "Start Menu:     $StartMenuFolder"
    Pop $HWND

    ${NSD_CreateLabel} 0 75u 100% 12u "Components to install:"
    Pop $HWND
    CreateFont $0 "Segoe UI" 9 700
    SendMessage $HWND ${WM_SETFONT} $0 0

    ${NSD_CreateLabel} 0 90u 100% 12u "  \u2022 Next.js standalone server"
    Pop $HWND
    ${NSD_CreateLabel} 0 103u 100% 12u "  \u2022 SQLite database engine"
    Pop $HWND
    ${NSD_CreateLabel} 0 116u 100% 12u "  \u2022 Static assets (public/)"
    Pop $HWND
    ${NSD_CreateLabel} 0 129u 100% 12u "  \u2022 Prisma schema & migrations"
    Pop $HWND
    ${NSD_CreateLabel} 0 142u 100% 12u "  \u2022 Desktop & Start Menu shortcuts"
    Pop $HWND
    ${NSD_CreateLabel} 0 155u 100% 12u "  \u2022 Service management scripts"
    Pop $HWND

    nsDialogs::Show
FunctionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; INSTALLER SECTIONS
; ═══════════════════════════════════════════════════════════════════════════════

Section "!${APP_NAME} Core" SecCore
    SectionIn RO

    SetOutPath $INSTDIR

    ; Write installer info
    WriteRegStr HKLM "Software\${APP_NAME}" "InstallDir" $INSTDIR
    WriteRegStr HKLM "Software\${APP_NAME}" "Version" "${APP_VERSION}"

    ; ─── Copy Next.js Standalone Build ────────────────────────────────────────
    SetOutPath $INSTDIR\server
    File /r "stage\.next\standalone\*.*"

    ; Copy static files to the standalone server location
    SetOutPath $INSTDIR\server\.next\static
    File /r "stage\.next\static\*.*"

    ; ─── Copy Public Assets ───────────────────────────────────────────────────
    SetOutPath $INSTDIR\server\public
    File /r "stage\public\*.*"

    ; ─── Copy Database Files ──────────────────────────────────────────────────
    SetOutPath $INSTDIR\db
    File /r "stage\db\*.*"

    ; ─── Copy Prisma Schema ──────────────────────────────────────────────────
    SetOutPath $INSTDIR\prisma
    File /r "stage\prisma\*.*"

    ; ─── Copy Service Scripts ─────────────────────────────────────────────────
    SetOutPath $INSTDIR
    File "start.bat"
    File "stop.bat"
    File "uninstall.bat"
    File "AgenticOS.service.js"

    ; ─── Copy node_modules for Prisma ─────────────────────────────────────────
    IfFileExists "stage\node_modules\*.*" 0 skipNodeModules
    SetOutPath $INSTDIR\server\node_modules
    File /r "stage\node_modules\*.*"
    skipNodeModules:

    ; ─── Create Data Directory ────────────────────────────────────────────────
    CreateDirectory "$INSTDIR\data"
    CreateDirectory "$INSTDIR\logs"

    ; ─── Create Environment File ──────────────────────────────────────────────
    SetOutPath $INSTDIR
    FileOpen $0 "$INSTDIR\.env" w
    FileWrite $0 "# Agentic OS Environment Configuration$\r$\n"
    FileWrite $0 "DATABASE_URL=file:../db/agentic.db$\r$\n"
    FileWrite $0 "PORT=3000$\r$\n"
    FileWrite $0 "HOSTNAME=0.0.0.0$\r$\n"
    FileWrite $0 "NODE_ENV=production$\r$\n"
    FileClose $0

SectionEnd

Section "Start Menu Shortcuts" SecStartMenu
    !insertmacro MUI_STARTMENU_WRITE_BEGIN Application

    CreateDirectory "$SMPROGRAMS\$StartMenuFolder"
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\${APP_NAME}.lnk"           "$INSTDIR\start.bat" "" "$INSTDIR\${APP_ICON}" 0
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\${APP_NAME} (Debug).lnk"   "cmd.exe" '/k "$INSTDIR\start.bat"' "$INSTDIR\${APP_ICON}" 0
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\Stop ${APP_NAME}.lnk"      "$INSTDIR\stop.bat" "" "" 0
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\Uninstall ${APP_NAME}.lnk"  "$INSTDIR\uninstall.exe" "" "" 0
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\Open Data Folder.lnk"       "$INSTDIR\data" "" "" 0
    CreateShortCut  "$SMPROGRAMS\$StartMenuFolder\Open Logs Folder.lnk"       "$INSTDIR\logs" "" "" 0

    !insertmacro MUI_STARTMENU_WRITE_END
SectionEnd

Section "Desktop Shortcut" SecDesktop
    CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\start.bat" "" "$INSTDIR\${APP_ICON}" 0
SectionEnd

Section "Install as Windows Service" SecService
    ; Register the service using node-windows (via AgenticOS.service.js)
    ; This requires Node.js to be present on the system
    ${If} $NodeFound == "1"
        DetailPrint "Registering ${APP_NAME} as a Windows service..."
        SetOutPath $INSTDIR
        nsExec::Exec 'node "$INSTDIR\AgenticOS.service.js" --install'
        Pop $0
        ${If} $0 != 0
            DetailPrint "Warning: Service installation failed (exit code $0). You can still run manually with start.bat"
        ${Else}
            DetailPrint "Service installed successfully."
        ${EndIf}
    ${Else}
        DetailPrint "Skipping service installation (Node.js not found). Use start.bat to run manually."
    ${EndIf}
SectionEnd

Section "File Associations" SecFileAssoc
    ; Register .aos file type for Agentic OS workspace files
    WriteRegStr HKCR ".aos" "" "${APP_IDENTIFIER}"
    WriteRegStr HKCR "${APP_IDENTIFIER}" "" "${APP_NAME} Workspace"
    WriteRegStr HKCR "${APP_IDENTIFIER}\DefaultIcon" "" "$INSTDIR\${APP_ICON},0"
    WriteRegStr HKCR "${APP_IDENTIFIER}\shell\open\command" "" 'cmd.exe /c "$INSTDIR\start.bat" "%1"'
SectionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; POST-INSTALL: Register Uninstaller & Finish
; ═══════════════════════════════════════════════════════════════════════════════
Section -PostInstall
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"

    ; Register in Add/Remove Programs
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName"     "${APP_NAME}"
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion"  "${APP_VERSION}"
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher"        "${APP_PUBLISHER}"
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout"     "${APP_URL}"
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString"  "$INSTDIR\uninstall.exe"
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation"  "$INSTDIR"
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon"      "$INSTDIR\${APP_ICON}"
    WriteRegStr   HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "HelpLink"         "${APP_URL}/issues"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify"         1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair"         1

    ; Calculate installed size
    ${GetSize} "$INSTDIR" "/S=0K" $0
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "EstimatedSize" "$0"

    ; Run Prisma migrations if Node.js is available
    ${If} $NodeFound == "1"
        DetailPrint "Running database migrations..."
        SetOutPath $INSTDIR
        nsExec::Exec 'node "$INSTDIR\server\node_modules\prisma\build\index.js" db push --schema="$INSTDIR\prisma\schema.prisma"'
        Pop $0
        ${If} $0 != 0
            DetailPrint "Warning: Database migration returned exit code $0. Will run on first start."
        ${EndIf}
    ${EndIf}

    ; Offer to launch the app after install
    ${If} $NodeFound == "1"
        MessageBox MB_YESNO|MB_ICONQUESTION \
            "${APP_NAME} has been installed successfully!$\r$\n$\r$\nWould you like to start ${APP_NAME} now?" \
            /SD IDYES IDNO noLaunch
            Exec '"$INSTDIR\start.bat"'
        noLaunch:
    ${Else}
        MessageBox MB_OK|MB_ICONINFORMATION \
            "${APP_NAME} has been installed, but Node.js was not found.$\r$\n$\r$\nPlease install Node.js v18+ from https://nodejs.org and then run ${APP_NAME} using the Desktop shortcut or Start Menu."
    ${EndIf}
SectionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; SECTION DESCRIPTIONS
; ═══════════════════════════════════════════════════════════════════════════════
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecCore}       "Core application files (required)"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecStartMenu}  "Create Start Menu shortcuts"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop}    "Create a Desktop shortcut"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecService}    "Install as a Windows background service"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecFileAssoc}  "Associate .aos files with ${APP_NAME}"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ═══════════════════════════════════════════════════════════════════════════════
; UNINSTALLER
; ═══════════════════════════════════════════════════════════════════════════════
Section "Uninstall"
    ; Stop the service if running
    nsExec::Exec 'node "$INSTDIR\AgenticOS.service.js" --uninstall'
    Pop $0

    ; Stop any running server processes
    nsExec::Exec 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq AgenticOS*"'
    Pop $0

    ; Delete Start Menu shortcuts
    !insertmacro MUI_STARTMENU_GETFOLDER Application $StartMenuFolder
    RMDir /r "$SMPROGRAMS\$StartMenuFolder"

    ; Delete Desktop shortcut
    Delete "$DESKTOP\${APP_NAME}.lnk"

    ; Remove file associations
    DeleteRegKey HKCR ".aos"
    DeleteRegKey HKCR "${APP_IDENTIFIER}"

    ; Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
    DeleteRegKey HKLM "Software\${APP_NAME}"

    ; Remove installation directory
    RMDir /r "$INSTDIR\server"
    RMDir /r "$INSTDIR\db"
    RMDir /r "$INSTDIR\prisma"
    RMDir /r "$INSTDIR\data"
    RMDir /r "$INSTDIR\logs"
    Delete "$INSTDIR\start.bat"
    Delete "$INSTDIR\stop.bat"
    Delete "$INSTDIR\uninstall.bat"
    Delete "$INSTDIR\AgenticOS.service.js"
    Delete "$INSTDIR\.env"
    Delete "$INSTDIR\${APP_ICON}"
    Delete "$INSTDIR\uninstall.exe"

    ; Remove the install directory if empty
    RMDir "$INSTDIR"

    ; If the parent directory is now empty, remove it too
    RMDir "$INSTDIR\.."
SectionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; .onInit — Initial Setup
; ═══════════════════════════════════════════════════════════════════════════════
Function .onInit
    ; Check Windows version (require Windows 10+)
    ${If} ${AtLeastWin10}
        ; OK
    ${Else}
        ${If} ${AtLeastWin8.1}
            ; Warn but allow
            MessageBox MB_ICONEXCLAMATION|MB_OK "${APP_NAME} is designed for Windows 10+. Some features may not work on this version."
        ${Else}
            MessageBox MB_ICONSTOP|MB_OK "${APP_NAME} requires Windows 10 or later."
            Abort
        ${EndIf}
    ${EndIf}

    ; Adjust install directory for 32-bit systems
    ${If} ${RunningX64}
        StrCpy $INSTDIR "$PROGRAMFILES64\${APP_NAME}"
    ${Else}
        StrCpy $INSTDIR "$PROGRAMFILES\${APP_NAME}"
    ${EndIf}

    ; Check if already installed
    ReadRegStr $0 HKLM "Software\${APP_NAME}" "InstallDir"
    ${If} $0 != ""
        MessageBox MB_YESNO|MB_ICONQUESTION \
            "An existing installation of ${APP_NAME} was found at:$\r$\n$0$\r$\n$\r$\nDo you want to upgrade?" \
            IDYES proceed
            Abort
        proceed:
        ; Uninstall the old version silently
        IfFileExists "$0\uninstall.exe" 0 +3
            ExecWait '"$0\uninstall.exe" /S _?=$0'
            Delete "$0\uninstall.exe"
    ${EndIf}
FunctionEnd

; ═══════════════════════════════════════════════════════════════════════════════
; .onInstSuccess — Post-Install Hook
; ═══════════════════════════════════════════════════════════════════════════════
Function .onInstSuccess
    DetailPrint "${APP_NAME} v${APP_VERSION} installed successfully."
FunctionEnd
