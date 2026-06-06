use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Manager,
};
use tauri_plugin_notification::NotificationExt;

/// Creates the system tray icon and menu for Agentic OS.
pub fn create_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // Build the tray menu items
    let open_item = MenuItemBuilder::with_id("open", "Open Agentic OS").build(app)?;
    let check_updates_item = MenuItemBuilder::with_id("check_updates", "Check for Updates").build(app)?;
    let settings_item = MenuItemBuilder::with_id("settings", "Settings").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    // Build the menu
    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .separator()
        .item(&check_updates_item)
        .item(&settings_item)
        .separator()
        .item(&quit_item)
        .build()?;

    // Build the tray icon
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().cloned().unwrap_or_else(|| {
            // Fallback: use a 32x32 transparent PNG if no default icon is set
            tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
                .expect("Failed to load tray icon")
        }))
        .tooltip("Agentic OS — Autonomous AI Operating System")
        .menu(&menu)
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "open" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "check_updates" => {
                    let handle = app.handle().clone();
                    tauri::async_runtime::spawn(async move {
                        match crate::updater::check_update_command(&handle).await {
                            Ok(info) => {
                                if info.available {
                                    let _ = handle.notification()
                                        .builder()
                                        .title("Update Available")
                                        .body(&format!(
                                            "Agentic OS v{} is available (current: v{})",
                                            info.latest_version, info.current_version
                                        ))
                                        .show();
                                } else {
                                    let _ = handle.notification()
                                        .builder()
                                        .title("No Updates")
                                        .body("You're running the latest version of Agentic OS.")
                                        .show();
                                }
                            }
                            Err(e) => {
                                log::warn!("Update check failed from tray: {}", e);
                            }
                        }
                    });
                }
                "settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        // Emit event to frontend to navigate to settings
                        let _ = window.emit("navigate-settings", ());
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
