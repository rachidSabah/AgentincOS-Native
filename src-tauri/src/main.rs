#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;
mod updater;
mod security;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            // Initialize system tray
            tray::create_tray(app)?;

            // Check for updates on startup
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                updater::check_for_updates(&handle).await.ok();
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::open_file_dialog,
            commands::save_file_dialog,
            commands::read_file_content,
            commands::write_file_content,
            commands::check_update,
            commands::install_update,
            commands::encrypt_data,
            commands::decrypt_data,
            commands::get_credential,
            commands::set_credential,
            commands::delete_credential,
            commands::get_audit_log,
            commands::write_audit_log,
            commands::check_permission,
            commands::grant_permission,
            commands::revoke_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agentic OS");
}
