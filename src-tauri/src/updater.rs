use crate::commands::UpdateInfo;
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

/// Checks for updates using the Tauri updater plugin.
/// Compares the current version against the latest GitHub release.
pub async fn check_for_updates(app: &tauri::AppHandle) -> Result<bool, String> {
    let update_info = check_update_command(app).await?;
    Ok(update_info.available)
}

/// Checks for an available update and returns detailed information.
#[tauri::command]
pub async fn check_update_command(app: &tauri::AppHandle) -> Result<UpdateInfo, String> {
    let updater = app
        .updater()
        .map_err(|e| format!("Failed to initialize updater: {}", e))?;

    match updater.check().await {
        Ok(update) => {
            if let Some(update) = update {
                Ok(UpdateInfo {
                    available: true,
                    current_version: app.config().version.clone(),
                    latest_version: update.version.clone(),
                    download_url: update.download_url.clone().unwrap_or_default(),
                    release_notes: update.body.clone().unwrap_or_default(),
                    pub_date: update.date.clone(),
                })
            } else {
                Ok(UpdateInfo {
                    available: false,
                    current_version: app.config().version.clone(),
                    latest_version: app.config().version.clone(),
                    download_url: String::new(),
                    release_notes: String::new(),
                    pub_date: None,
                })
            }
        }
        Err(e) => {
            log::warn!("Update check failed: {}", e);
            // Return a graceful "no update" response rather than erroring out
            Ok(UpdateInfo {
                available: false,
                current_version: app.config().version.clone(),
                latest_version: app.config().version.clone(),
                download_url: String::new(),
                release_notes: format!("Update check failed: {}", e),
                pub_date: None,
            })
        }
    }
}

/// Downloads and installs an available update.
/// Performs the following steps:
/// 1. Checks for the latest update
/// 2. Downloads the update package
/// 3. Verifies signature (if pubkey is configured)
/// 4. Backs up current version metadata
/// 5. Installs the update
/// 6. Restarts the app
/// On failure, attempts to log the error for potential rollback.
#[tauri::command]
pub async fn install_update_command(app: &tauri::AppHandle) -> Result<(), String> {
    let updater = app
        .updater()
        .map_err(|e| format!("Failed to initialize updater: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Failed to check for updates: {}", e))?
        .ok_or_else(|| "No update available".to_string())?;

    log::info!(
        "Installing update: v{} -> v{}",
        app.config().version.clone(),
        update.version
    );

    // Write a backup marker with current version info before updating
    let backup_result = write_update_backup(app, &update.version);
    if let Err(e) = &backup_result {
        log::warn!("Failed to write update backup marker: {}", e);
        // Continue anyway — the backup is best-effort
    }

    // Download and install the update
    match update.download_and_install(
        |chunk, content_len| {
            log::info!(
                "Downloaded {} of {} bytes",
                chunk,
                content_len.unwrap_or(0)
            );
        },
        || true, // proceed with the update
    )
    .await
    {
        Ok(()) => {
            log::info!("Update installed successfully. Restarting...");
            // Restart the app to apply the update
            app.restart();
        }
        Err(e) => {
            let error_msg = format!("Update installation failed: {}", e);
            log::error!("{}", error_msg);

            // Attempt rollback
            if let Err(rollback_err) = attempt_rollback(app) {
                log::error!("Rollback also failed: {}", rollback_err);
            }

            return Err(error_msg);
        }
    }

    Ok(())
}

/// Writes a backup marker file before updating, containing the current version
/// and a timestamp for potential rollback.
fn write_update_backup(
    app: &tauri::AppHandle,
    _target_version: &str,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot determine app data dir: {}", e))?;

    let backup_dir = app_data_dir.join("updates");
    std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let current_version = app.config().version.clone();
    let timestamp = chrono::Utc::now().to_rfc3339();

    let backup_info = serde_json::json!({
        "previous_version": current_version,
        "timestamp": timestamp,
        "status": "pre_update"
    });

    let backup_path = backup_dir.join("update_backup.json");
    std::fs::write(
        &backup_path,
        serde_json::to_string_pretty(&backup_info).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;

    log::info!("Update backup marker written to {:?}", backup_path);
    Ok(())
}

/// Attempts to rollback to the previous version after a failed update.
/// In practice, rollback with Tauri's updater requires the user to re-install
/// the previous version. This function logs the failure and provides guidance.
fn attempt_rollback(app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Cannot determine app data dir: {}", e))?;

    let backup_path = app_data_dir.join("updates").join("update_backup.json");

    if backup_path.exists() {
        let content = std::fs::read_to_string(&backup_path).map_err(|e| e.to_string())?;
        let backup_info: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| e.to_string())?;

        log::warn!(
            "Rollback info: previous version was {}",
            backup_info
                .get("previous_version")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown")
        );

        // Update the backup marker to indicate rollback was attempted
        let rollback_info = serde_json::json!({
            "previous_version": backup_info.get("previous_version"),
            "original_timestamp": backup_info.get("timestamp"),
            "rollback_timestamp": chrono::Utc::now().to_rfc3339(),
            "status": "rollback_attempted"
        });

        std::fs::write(
            &backup_path,
            serde_json::to_string_pretty(&rollback_info).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
    }

    log::warn!(
        "Rollback: Automatic rollback is not supported. Please re-install the previous version manually."
    );

    Ok(())
}
