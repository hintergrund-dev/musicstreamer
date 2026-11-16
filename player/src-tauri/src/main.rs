// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_deep_link::DeepLinkExt;

fn main() {
    tauri::Builder::default()
        // Must be registered first. A second launch (Windows and Linux deliver the sign-in
        // return link this way) is forwarded to the running instance and focuses its window.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Installed Windows and Linux builds register the scheme at install time; this covers dev runs.
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            app.deep_link().register_all()?;
            #[cfg(not(any(target_os = "linux", all(debug_assertions, windows))))]
            let _ = app.deep_link();
            // Not fatal: the placeholder key in tauri.conf.json is not a valid updater key.
            if let Err(e) = app.handle().plugin(tauri_plugin_updater::Builder::new().build()) {
                eprintln!("updater disabled: {e}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running musicstreamer");
}
