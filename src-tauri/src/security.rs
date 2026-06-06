use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use chrono::Utc;
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

use crate::commands::{AuditEntry, PermissionEntry};

// ─── Encryption / Decryption (AES-256-GCM) ────────────────────────

/// Derives a 256-bit key from a password using SHA-256.
fn derive_key(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    // Add a salt derived from the password for additional security
    hasher.update(b"::agentic-os-v2-salt::");
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Encrypts plaintext data using AES-256-GCM with a password-derived key.
/// Returns a base64-encoded string containing: nonce (12 bytes) + ciphertext + tag.
pub fn encrypt_data(data: &str, password: &str) -> Result<String, String> {
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Cipher init error: {}", e))?;

    // Generate a random 96-bit nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption error: {}", e))?;

    // Concatenate nonce + ciphertext and base64-encode
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&combined))
}

/// Decrypts base64-encoded AES-256-GCM encrypted data using a password-derived key.
pub fn decrypt_data(encrypted: &str, password: &str) -> Result<String, String> {
    let key = derive_key(password);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Cipher init error: {}", e))?;

    let combined = BASE64
        .decode(encrypted)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    if combined.len() < 12 {
        return Err("Invalid encrypted data: too short".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption error: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 decode error: {}", e))
}

// ─── Credential Management (OS Keychain) ───────────────────────────

/// Retrieves a credential from the OS keychain.
pub fn get_credential(service: &str, account: &str) -> Result<String, String> {
    let entry = keyring::Entry::new(service, account)
        .map_err(|e| format!("Keyring entry creation error: {}", e))?;

    let password = entry
        .get_password()
        .map_err(|e| format!("Credential retrieval error: {}", e))?;

    Ok(password)
}

/// Stores a credential in the OS keychain.
pub fn set_credential(service: &str, account: &str, password: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(service, account)
        .map_err(|e| format!("Keyring entry creation error: {}", e))?;

    entry
        .set_password(password)
        .map_err(|e| format!("Credential storage error: {}", e))?;

    // Audit log the credential change
    let _ = write_audit_log(
        "credential_set",
        &format!("{}:{}", service, account),
        "Credential stored in OS keychain",
    );

    Ok(())
}

/// Removes a credential from the OS keychain.
pub fn delete_credential(service: &str, account: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(service, account)
        .map_err(|e| format!("Keyring entry creation error: {}", e))?;

    entry
        .delete_credential()
        .map_err(|e| format!("Credential deletion error: {}", e))?;

    // Audit log the credential deletion
    let _ = write_audit_log(
        "credential_delete",
        &format!("{}:{}", service, account),
        "Credential removed from OS keychain",
    );

    Ok(())
}

// ─── Audit Logging ─────────────────────────────────────────────────

/// Returns the path to the audit log file.
fn audit_log_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Cannot determine data directory")?;
    let log_dir = data_dir.join("agentic-os").join("logs");
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    Ok(log_dir.join("audit.jsonl"))
}

/// Writes an append-only audit log entry.
pub fn write_audit_log(action: &str, subject: &str, details: &str) -> Result<(), String> {
    // Sanitize inputs
    let action = sanitize_input(action, 128)?;
    let subject = sanitize_input(subject, 256)?;
    let details = sanitize_input(details, 1024)?;

    let entry = AuditEntry {
        timestamp: Utc::now().to_rfc3339(),
        action,
        subject,
        details,
    };

    let log_path = audit_log_path()?;
    let mut line = serde_json::to_string(&entry).map_err(|e| e.to_string())?;
    line.push('\n');

    // Append to the file (atomic append)
    use std::io::Write;
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;

    file.write_all(line.as_bytes()).map_err(|e| e.to_string())?;
    file.flush().map_err(|e| e.to_string())?;

    Ok(())
}

/// Reads audit log entries (most recent first), up to `limit` entries.
pub fn get_audit_log(limit: usize) -> Result<Vec<AuditEntry>, String> {
    let log_path = audit_log_path()?;

    if !log_path.exists() {
        return Ok(Vec::new());
    }

    let content = std::fs::read_to_string(&log_path).map_err(|e| e.to_string())?;

    let entries: Vec<AuditEntry> = content
        .lines()
        .filter(|l| !l.trim().is_empty())
        .filter_map(|line| serde_json::from_str(line).ok())
        .collect();

    // Return most recent entries first, up to limit
    let mut entries = entries;
    entries.reverse();
    entries.truncate(limit);

    Ok(entries)
}

// ─── Permission System ─────────────────────────────────────────────

const PERMISSIONS_STORE_KEY: &str = "permissions";

/// Gets the permissions store file path.
fn permissions_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Cannot determine data directory")?;
    let perm_dir = data_dir.join("agentic-os").join("permissions");
    std::fs::create_dir_all(&perm_dir).map_err(|e| e.to_string())?;
    Ok(perm_dir.join("permissions.json"))
}

/// Loads all permissions from the persistent store.
fn load_permissions() -> Result<Vec<PermissionEntry>, String> {
    let path = permissions_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

/// Saves all permissions to the persistent store.
fn save_permissions(permissions: &[PermissionEntry]) -> Result<(), String> {
    let path = permissions_path()?;
    let content = serde_json::to_string_pretty(permissions).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

/// Checks if a permission is granted for a given scope.
pub async fn check_permission(app: &tauri::AppHandle, scope: &str) -> Result<bool, String> {
    let scope = sanitize_input(scope, 256)?;

    // First, check the Tauri plugin store
    if let Ok(store) = app.store(PERMISSIONS_STORE_KEY) {
        let store = store.lock().map_err(|e| e.to_string())?;
        if let Some(value) = store.get(&scope) {
            if let Some(granted) = value.as_bool() {
                return Ok(granted);
            }
        }
    }

    // Fallback to file-based permissions
    let permissions = load_permissions()?;
    Ok(permissions
        .iter()
        .find(|p| p.scope == scope)
        .map(|p| p.granted)
        .unwrap_or(false))
}

/// Grants a permission for a given scope.
pub async fn grant_permission(app: &tauri::AppHandle, scope: &str) -> Result<(), String> {
    let scope = sanitize_input(scope, 256)?;

    // Update the Tauri plugin store
    if let Ok(store) = app.store(PERMISSIONS_STORE_KEY) {
        let mut store = store.lock().map_err(|e| e.to_string())?;
        store.set(&scope, serde_json::Value::Bool(true));
    }

    // Also update the file-based store
    let mut permissions = load_permissions()?;
    let now = Utc::now().to_rfc3339();

    if let Some(entry) = permissions.iter_mut().find(|p| p.scope == scope) {
        entry.granted = true;
        entry.granted_at = Some(now.clone());
    } else {
        permissions.push(PermissionEntry {
            scope: scope.clone(),
            granted: true,
            granted_at: Some(now),
        });
    }

    save_permissions(&permissions)?;

    // Audit log
    let _ = write_audit_log(
        "permission_grant",
        &scope,
        "Permission granted",
    );

    Ok(())
}

/// Revokes a permission for a given scope.
pub async fn revoke_permission(app: &tauri::AppHandle, scope: &str) -> Result<(), String> {
    let scope = sanitize_input(scope, 256)?;

    // Update the Tauri plugin store
    if let Ok(store) = app.store(PERMISSIONS_STORE_KEY) {
        let mut store = store.lock().map_err(|e| e.to_string())?;
        store.set(&scope, serde_json::Value::Bool(false));
    }

    // Also update the file-based store
    let mut permissions = load_permissions()?;

    if let Some(entry) = permissions.iter_mut().find(|p| p.scope == scope) {
        entry.granted = false;
        entry.granted_at = None;
    } else {
        permissions.push(PermissionEntry {
            scope: scope.clone(),
            granted: false,
            granted_at: None,
        });
    }

    save_permissions(&permissions)?;

    // Audit log
    let _ = write_audit_log(
        "permission_revoke",
        &scope,
        "Permission revoked",
    );

    Ok(())
}

// ─── Input Validation ──────────────────────────────────────────────

/// Validates and sanitizes a string input.
/// - Trims whitespace
/// - Enforces max length
/// - Rejects control characters (except common whitespace)
/// - Rejects null bytes
pub fn sanitize_input(input: &str, max_len: usize) -> Result<String, String> {
    let trimmed = input.trim();

    if trimmed.is_empty() {
        return Err("Input cannot be empty".to_string());
    }

    if trimmed.len() > max_len {
        return Err(format!(
            "Input exceeds maximum length of {} characters",
            max_len
        ));
    }

    // Check for null bytes
    if trimmed.contains('\0') {
        return Err("Input contains null bytes".to_string());
    }

    // Check for control characters (except tab, newline, carriage return)
    if trimmed.chars().any(|c| c.is_control() && c != '\t' && c != '\n' && c != '\r') {
        return Err("Input contains invalid control characters".to_string());
    }

    Ok(trimmed.to_string())
}

/// Validates a file path to prevent directory traversal attacks.
pub fn validate_path(path: &str) -> Result<(), String> {
    let path = PathBuf::from(path);

    // Check for directory traversal patterns
    let path_str = path.to_string_lossy();

    if path_str.contains("..") {
        return Err("Path contains directory traversal pattern (..)".to_string());
    }

    // On Windows, check for drive letter injection
    #[cfg(target_os = "windows")]
    {
        // Allow normal absolute paths like C:\...
        // But reject UNC paths that could be malicious
        if path_str.starts_with("\\\\") {
            return Err("UNC paths are not allowed".to_string());
        }
    }

    // Check for null bytes in path
    if path_str.contains('\0') {
        return Err("Path contains null bytes".to_string());
    }

    Ok(())
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let data = "Hello, Agentic OS!";
        let password = "super-secret-key";
        let encrypted = encrypt_data(data, password).unwrap();
        let decrypted = decrypt_data(&encrypted, password).unwrap();
        assert_eq!(data, decrypted);
    }

    #[test]
    fn test_encrypt_decrypt_wrong_password() {
        let data = "Hello, Agentic OS!";
        let encrypted = encrypt_data(data, "correct-password").unwrap();
        let result = decrypt_data(&encrypted, "wrong-password");
        assert!(result.is_err());
    }

    #[test]
    fn test_sanitize_input_valid() {
        assert_eq!(sanitize_input("hello world", 256).unwrap(), "hello world");
    }

    #[test]
    fn test_sanitize_input_empty() {
        assert!(sanitize_input("   ", 256).is_err());
    }

    #[test]
    fn test_sanitize_input_too_long() {
        let long_input = "a".repeat(300);
        assert!(sanitize_input(&long_input, 256).is_err());
    }

    #[test]
    fn test_sanitize_input_null_bytes() {
        assert!(sanitize_input("hello\0world", 256).is_err());
    }

    #[test]
    fn test_validate_path_traversal() {
        assert!(validate_path("../../etc/passwd").is_err());
        assert!(validate_path("/home/user/file.txt").is_ok());
    }
}
