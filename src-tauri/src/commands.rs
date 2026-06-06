use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

use crate::security;

// ─── Response types ────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub arch: String,
    pub cpu_count: usize,
    pub total_memory_gb: f64,
    pub available_memory_gb: f64,
    pub hostname: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct FileInfo {
    pub path: String,
    pub content: String,
    pub size_bytes: u64,
    pub is_text: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: String,
    pub download_url: String,
    pub release_notes: String,
    pub pub_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuditEntry {
    pub timestamp: String,
    pub action: String,
    pub subject: String,
    pub details: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PermissionEntry {
    pub scope: String,
    pub granted: bool,
    pub granted_at: Option<String>,
}

// ─── Commands ──────────────────────────────────────────────────────

/// Returns information about the host system.
#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    let cpu_count = num_cpus::get();
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string());

    // Get OS version
    let os_version = get_os_version();

    // Memory info (platform-specific, simplified)
    let (total_memory_gb, available_memory_gb) = get_memory_info();

    Ok(SystemInfo {
        os,
        os_version,
        arch,
        cpu_count,
        total_memory_gb,
        available_memory_gb,
        hostname,
    })
}

/// Opens a native file dialog and returns the selected file path(s).
#[tauri::command]
pub async fn open_file_dialog(
    app: tauri::AppHandle,
    title: Option<String>,
    filters: Option<Vec<FileDialogFilter>>,
    multiple: Option<bool>,
) -> Result<Vec<String>, String> {
    let title = title.unwrap_or_else(|| "Open File".to_string());

    let mut dialog = tauri_plugin_dialog::FileDialogBuilder::new(&app).set_title(&title);

    if let Some(filters) = filters {
        for filter in filters {
            dialog = dialog.add_filter(&filter.name, &filter.extensions);
        }
    }

    if multiple.unwrap_or(false) {
        let paths = dialog
            .blocking_pick_files()
            .map(|paths| {
                paths
                    .into_iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect()
            })
            .unwrap_or_default();
        Ok(paths)
    } else {
        let path = dialog
            .blocking_pick_file()
            .map(|p| vec![p.to_string_lossy().to_string()])
            .unwrap_or_default();
        Ok(path)
    }
}

/// Opens a native save dialog and returns the chosen path.
#[tauri::command]
pub async fn save_file_dialog(
    app: tauri::AppHandle,
    title: Option<String>,
    file_name: Option<String>,
    filters: Option<Vec<FileDialogFilter>>,
) -> Result<Option<String>, String> {
    let title = title.unwrap_or_else(|| "Save File".to_string());

    let mut dialog = tauri_plugin_dialog::FileDialogBuilder::new(&app).set_title(&title);

    if let Some(name) = file_name {
        dialog = dialog.set_file_name(&name);
    }

    if let Some(filters) = filters {
        for filter in filters {
            dialog = dialog.add_filter(&filter.name, &filter.extensions);
        }
    }

    let path = dialog
        .blocking_save_file()
        .map(|p| p.to_string_lossy().to_string());

    Ok(path)
}

/// Reads a file from disk and returns its content (base64 for binary, utf-8 for text).
#[tauri::command]
pub async fn read_file_content(path: String, as_base64: Option<bool>) -> Result<FileInfo, String> {
    let file_path = PathBuf::from(&path);

    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let metadata = std::fs::metadata(&file_path).map_err(|e| e.to_string())?;
    let size_bytes = metadata.len();

    let bytes = std::fs::read(&file_path).map_err(|e| e.to_string())?;

    // Try to detect if file is text by checking for null bytes in first 8KB
    let check_len = std::cmp::min(bytes.len(), 8192);
    let is_text = !bytes[..check_len].iter().any(|&b| b == 0);

    let (content, final_is_text) = if as_base64.unwrap_or(false) || !is_text {
        (base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes), false)
    } else {
        (
            String::from_utf8(bytes).map_err(|e| format!("UTF-8 decode error: {}", e))?,
            true,
        )
    };

    Ok(FileInfo {
        path,
        content,
        size_bytes,
        is_text: final_is_text,
    })
}

/// Writes content to a file on disk. If `as_base64` is true, content is decoded first.
#[tauri::command]
pub async fn write_file_content(
    path: String,
    content: String,
    as_base64: Option<bool>,
) -> Result<(), String> {
    // Validate path — prevent directory traversal
    security::validate_path(&path)?;

    let file_path = PathBuf::from(&path);

    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let bytes = if as_base64.unwrap_or(false) {
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &content)
            .map_err(|e| format!("Base64 decode error: {}", e))?
    } else {
        content.into_bytes()
    };

    std::fs::write(&file_path, bytes).map_err(|e| e.to_string())?;

    Ok(())
}

/// Checks for app updates via the configured update endpoint.
#[tauri::command]
pub async fn check_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    crate::updater::check_update_command(&app).await
}

/// Downloads and installs an available update.
#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    crate::updater::install_update_command(&app).await
}

/// Encrypts data using AES-256-GCM with a provided or derived key.
#[tauri::command]
pub async fn encrypt_data(
    data: String,
    password: String,
) -> Result<String, String> {
    security::encrypt_data(&data, &password)
}

/// Decrypts data using AES-256-GCM with a provided or derived key.
#[tauri::command]
pub async fn decrypt_data(
    encrypted: String,
    password: String,
) -> Result<String, String> {
    security::decrypt_data(&encrypted, &password)
}

/// Retrieves a credential from the OS keychain.
#[tauri::command]
pub async fn get_credential(service: String, account: String) -> Result<String, String> {
    security::get_credential(&service, &account)
}

/// Stores a credential in the OS keychain.
#[tauri::command]
pub async fn set_credential(
    service: String,
    account: String,
    password: String,
) -> Result<(), String> {
    security::set_credential(&service, &account, &password)
}

/// Removes a credential from the OS keychain.
#[tauri::command]
pub async fn delete_credential(service: String, account: String) -> Result<(), String> {
    security::delete_credential(&service, &account)
}

/// Reads audit log entries.
#[tauri::command]
pub async fn get_audit_log(limit: Option<usize>) -> Result<Vec<AuditEntry>, String> {
    security::get_audit_log(limit.unwrap_or(100))
}

/// Writes an audit log entry.
#[tauri::command]
pub async fn write_audit_log(action: String, subject: String, details: String) -> Result<(), String> {
    security::write_audit_log(&action, &subject, &details)
}

/// Checks if a permission is granted for a given scope.
#[tauri::command]
pub async fn check_permission(app: tauri::AppHandle, scope: String) -> Result<bool, String> {
    security::check_permission(&app, &scope).await
}

/// Grants a permission for a given scope.
#[tauri::command]
pub async fn grant_permission(app: tauri::AppHandle, scope: String) -> Result<(), String> {
    security::grant_permission(&app, &scope).await
}

/// Revokes a permission for a given scope.
#[tauri::command]
pub async fn revoke_permission(app: tauri::AppHandle, scope: String) -> Result<(), String> {
    security::revoke_permission(&app, &scope).await
}

// ─── Helper types ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct FileDialogFilter {
    name: String,
    extensions: Vec<String>,
}

// ─── Internal helpers ──────────────────────────────────────────────

fn get_os_version() -> String {
    #[cfg(target_os = "windows")]
    {
        // Try reading from registry or use env var
        std::env::var("OS")
            .unwrap_or_else(|_| "Windows".to_string())
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_else(|| "macOS (unknown version)".to_string())
    }
    #[cfg(target_os = "linux")]
    {
        // Try to read /etc/os-release
        std::fs::read_to_string("/etc/os-release")
            .ok()
            .and_then(|content| {
                content
                    .lines()
                    .find(|l| l.starts_with("PRETTY_NAME="))
                    .map(|l| {
                        l.trim_start_matches("PRETTY_NAME=")
                            .trim_matches('"')
                            .to_string()
                    })
            })
            .unwrap_or_else(|| "Linux (unknown distro)".to_string())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        "Unknown".to_string()
    }
}

fn get_memory_info() -> (f64, f64) {
    // Simplified memory info — returns (total_gb, available_gb)
    // For production, use platform-specific sysinfo crate
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/meminfo") {
            let mut total_kb: f64 = 0.0;
            let mut available_kb: f64 = 0.0;
            for line in content.lines() {
                if line.starts_with("MemTotal:") {
                    total_kb = line
                        .split_whitespace()
                        .nth(1)
                        .and_then(|v| v.parse::<f64>().ok())
                        .unwrap_or(0.0);
                } else if line.starts_with("MemAvailable:") {
                    available_kb = line
                        .split_whitespace()
                        .nth(1)
                        .and_then(|v| v.parse::<f64>().ok())
                        .unwrap_or(0.0);
                }
            }
            return (total_kb / 1024.0 / 1024.0, available_kb / 1024.0 / 1024.0);
        }
    }
    // Fallback: return zeros (use sysinfo crate for real values)
    (0.0, 0.0)
}
