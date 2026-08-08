#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod audio_viz;
mod commands;
mod overlay;

use commands::AppState;
use tauri::menu::{AboutMetadata, Menu, PredefinedMenuItem, Submenu};
use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let about_metadata = AboutMetadata {
                name: Some("Moonshine Voice STT".to_string()),
                version: Some("0.1.0".to_string()),
                authors: Some(vec!["Moonshine AI Team".to_string()]),
                comments: Some(
                    "Fast, on-device speech-to-text powered by Moonshine Voice (https://moonshine.ai)"
                        .to_string(),
                ),
                copyright: Some("Thanks to Moonshine AI Team (https://moonshine.ai)".to_string()),
                license: Some("MIT / Apache-2.0".to_string()),
                website: Some("https://moonshine.ai".to_string()),
                website_label: Some("Moonshine AI Website".to_string()),
                ..Default::default()
            };

            let app_menu = Submenu::with_items(
                app,
                "Moonshine Voice",
                true,
                &[
                    &PredefinedMenuItem::about(
                        app,
                        Some("About Moonshine Voice STT"),
                        Some(about_metadata),
                    )?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, Some("Hide"))?,
                    &PredefinedMenuItem::hide_others(app, Some("Hide Others"))?,
                    &PredefinedMenuItem::show_all(app, Some("Show All"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, Some("Quit"))?,
                ],
            )?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;

            let menu = Menu::with_items(app, &[&app_menu, &edit_menu])?;
            app.set_menu(menu)?;

            // Register global hotkey: Alt+Space / Option+Space (or Cmd+Shift+Space) for Push-to-Talk / Toggle Dictation
            let hotkey = Shortcut::new(Some(Modifiers::ALT), Code::Space);
            let app_handle = app.handle().clone();

            if let Err(e) = app.global_shortcut().on_shortcut(hotkey, move |_app, _shortcut, event| {
                match event.state() {
                    ShortcutState::Pressed => {
                        let _ = app_handle.emit("global-shortcut-pressed", "Alt+Space");
                    }
                    ShortcutState::Released => {
                        let _ = app_handle.emit("global-shortcut-released", "Alt+Space");
                    }
                }
            }) {
                eprintln!("Warning: Failed to register global shortcut Alt+Space: {}", e);
            }

            Ok(())
        })
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_stt_catalog,
            commands::get_stt_dependencies,
            commands::download_model_files,
            commands::load_transcriber,
            commands::transcribe_audio_file,
            commands::transcribe_pcm_samples,
            commands::start_stream,
            commands::feed_stream_pcm,
            commands::stop_stream,
            commands::copy_to_clipboard,
            commands::paste_text,
            commands::toggle_auto_paste,
            commands::toggle_overlay,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
