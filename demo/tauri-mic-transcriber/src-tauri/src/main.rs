#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_stt_catalog,
            commands::get_stt_dependencies,
            commands::download_model_files,
            commands::load_transcriber,
            commands::transcribe_audio_file,
            commands::transcribe_pcm_samples,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
