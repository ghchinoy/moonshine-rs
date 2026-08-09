use arboard::Clipboard;
use enigo::{Direction, Enigo, Key, Keyboard, Settings};
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::audio_viz::AudioVisualizer;
use moonshine_rs::{
    ModelArch, OwnedTranscriberStream, Transcriber, TranscriberOptions, Transcript,
};

pub struct AppState {
    pub transcriber: Mutex<Option<Arc<Transcriber>>>,
    pub stream: Mutex<Option<OwnedTranscriberStream>>,
    pub last_activity: AtomicU64,
    pub idle_monitor_running: AtomicBool,
    pub auto_paste_enabled: AtomicBool,
    pub visualizer: AudioVisualizer,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            transcriber: Mutex::new(None),
            stream: Mutex::new(None),
            last_activity: AtomicU64::new(current_timestamp_secs()),
            idle_monitor_running: AtomicBool::new(false),
            auto_paste_enabled: AtomicBool::new(true),
            visualizer: AudioVisualizer::new(),
        }
    }
}

impl AppState {
    pub fn lock_transcriber(&self) -> std::sync::MutexGuard<'_, Option<Arc<Transcriber>>> {
        self.transcriber.lock().unwrap_or_else(|p| p.into_inner())
    }

    pub fn lock_stream(&self) -> std::sync::MutexGuard<'_, Option<OwnedTranscriberStream>> {
        self.stream.lock().unwrap_or_else(|p| p.into_inner())
    }

    pub fn touch_activity(&self) {
        self.last_activity
            .store(current_timestamp_secs(), Ordering::SeqCst);
    }
}

fn current_timestamp_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

pub fn ensure_idle_monitor(app: &AppHandle) {
    let state = app.state::<AppState>();
    if !state.idle_monitor_running.swap(true, Ordering::SeqCst) {
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(10)).await;
                let state = app_handle.state::<AppState>();
                let now = current_timestamp_secs();
                let last = state.last_activity.load(Ordering::SeqCst);

                // 300s = 5 minutes idle timeout
                if now.saturating_sub(last) >= 300 {
                    let stream_lock = state.lock_stream();
                    let mut transcriber_lock = state.lock_transcriber();
                    if stream_lock.is_none() && transcriber_lock.is_some() {
                        println!("[Idle Monitor] Unloading transcriber after 5m inactivity");
                        *transcriber_lock = None;
                        let _ = app_handle.emit("model-unloaded", "Unloaded due to 5m inactivity");
                    }
                }
            }
        });
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressPayload {
    pub file_name: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percent: f32,
}

#[derive(Debug, Deserialize)]
struct ManifestFile {
    name: String,
    url: String,
    size: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct ManifestGroup {
    files: Vec<ManifestFile>,
}

#[derive(Debug, Deserialize)]
struct ManifestRoot {
    groups: Vec<ManifestGroup>,
}

#[tauri::command]
pub fn get_stt_catalog() -> Result<String, String> {
    moonshine_rs::get_stt_catalog().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_stt_dependencies(language: String, model_arch: Option<u32>) -> Result<String, String> {
    let arch = match model_arch {
        Some(0) => Some(ModelArch::Tiny),
        Some(1) => Some(ModelArch::Base),
        Some(2) => Some(ModelArch::TinyStreaming),
        Some(3) => Some(ModelArch::BaseStreaming),
        Some(4) => Some(ModelArch::SmallStreaming),
        Some(5) => Some(ModelArch::MediumStreaming),
        _ => None,
    };

    moonshine_rs::get_stt_dependencies(&language, arch, false).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_model_files(
    app: AppHandle,
    manifest_json: String,
    dest_dir: String,
) -> Result<String, String> {
    let manifest: ManifestRoot = serde_json::from_str(&manifest_json)
        .map_err(|e| format!("Invalid manifest JSON: {}", e))?;

    let dest_path = PathBuf::from(&dest_dir);
    tokio::fs::create_dir_all(&dest_path)
        .await
        .map_err(|e| format!("Failed to create destination directory: {}", e))?;

    let client = Client::new();

    for group in manifest.groups {
        for file in group.files {
            let file_dest = dest_path.join(&file.name);
            println!("Downloading {} to {}", file.url, file_dest.display());

            let response = client
                .get(&file.url)
                .send()
                .await
                .map_err(|e| format!("Download request failed for {}: {}", file.url, e))?;

            let total_size = file.size.or_else(|| response.content_length()).unwrap_or(0);

            let mut file_out = tokio::fs::File::create(&file_dest)
                .await
                .map_err(|e| format!("Failed to create file {}: {}", file_dest.display(), e))?;

            let mut stream = response.bytes_stream();
            let mut downloaded: u64 = 0;

            while let Some(chunk_result) = stream.next().await {
                let chunk = chunk_result.map_err(|e| format!("Error downloading chunk: {}", e))?;
                tokio::io::AsyncWriteExt::write_all(&mut file_out, &chunk)
                    .await
                    .map_err(|e| format!("Error writing chunk: {}", e))?;

                downloaded += chunk.len() as u64;

                let percent = if total_size > 0 {
                    (downloaded as f32 / total_size as f32) * 100.0
                } else {
                    0.0
                };

                let _ = app.emit(
                    "download-progress",
                    DownloadProgressPayload {
                        file_name: file.name.clone(),
                        downloaded_bytes: downloaded,
                        total_bytes: total_size,
                        percent,
                    },
                );
            }
        }
    }

    Ok(dest_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn load_transcriber(
    app: AppHandle,
    state: State<'_, AppState>,
    model_dir: String,
    arch_u32: u32,
) -> Result<String, String> {
    let arch = match arch_u32 {
        0 => ModelArch::Tiny,
        1 => ModelArch::Base,
        2 => ModelArch::TinyStreaming,
        3 => ModelArch::BaseStreaming,
        4 => ModelArch::SmallStreaming,
        5 => ModelArch::MediumStreaming,
        _ => ModelArch::Tiny,
    };

    let options = TranscriberOptions::new();
    let transcriber = Transcriber::from_files(Path::new(&model_dir), arch, Some(&options))
        .map_err(|e| e.to_string())?;

    let handle = transcriber.handle();
    let mut lock = state.lock_transcriber();
    *lock = Some(Arc::new(transcriber));
    state.touch_activity();

    ensure_idle_monitor(&app);

    Ok(format!(
        "Successfully loaded transcriber (handle {})",
        handle
    ))
}

#[tauri::command]
pub fn start_stream(state: State<'_, AppState>) -> Result<String, String> {
    let lock = state.lock_transcriber();
    let transcriber = lock
        .as_ref()
        .ok_or_else(|| "Transcriber is not loaded yet.".to_string())?
        .clone();

    let stream = transcriber
        .create_owned_stream()
        .map_err(|e| e.to_string())?;
    let handle = stream.handle();

    let mut stream_lock = state.lock_stream();
    *stream_lock = Some(stream);
    state.touch_activity();

    Ok(format!("Stream started (handle {})", handle))
}

#[tauri::command]
pub async fn feed_stream_pcm(
    app: AppHandle,
    pcm_samples: Vec<f32>,
    sample_rate: u32,
) -> Result<Transcript, String> {
    tokio::task::spawn_blocking(move || -> Result<Transcript, String> {
        let pcm_16k = if sample_rate != 16000 {
            moonshine_rs::audio::resample_pcm(
                &pcm_samples,
                sample_rate,
                16000,
                1,
                moonshine_rs::audio::ResampleQuality::Fast,
            )
            .map_err(|e| format!("Failed to resample mic audio: {}", e))?
        } else {
            pcm_samples
        };

        let state = app.state::<AppState>();
        state.touch_activity();

        // Calculate FFT audio visualizer buckets and emit event to all windows
        let buckets = state.visualizer.compute_buckets(&pcm_16k);
        let _ = app.emit("mic-level", buckets.to_vec());

        let mut lock = state.lock_stream();
        let stream = lock
            .as_mut()
            .ok_or_else(|| "No active stream.".to_string())?;

        stream
            .add_audio(&pcm_16k, 16000)
            .map_err(|e| e.to_string())?;
        let transcript = stream.poll(false).map_err(|e| e.to_string())?;

        // Emit stream update to all windows (main + overlay)
        let _ = app.emit("stream-update", transcript.clone());

        Ok(transcript)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn stop_stream(app: AppHandle) -> Result<Transcript, String> {
    tokio::task::spawn_blocking(move || -> Result<Transcript, String> {
        let state = app.state::<AppState>();
        state.touch_activity();

        let mut lock = state.lock_stream();
        let stream = lock
            .take()
            .ok_or_else(|| "No active stream to stop.".to_string())?;

        let transcript = stream.finalize().map_err(|e| e.to_string())?;
        let full_text = transcript.text();

        // Emit final transcript update
        let _ = app.emit("stream-final", transcript.clone());

        // Auto-paste if enabled and text is non-empty
        if state.auto_paste_enabled.load(Ordering::SeqCst) && !full_text.trim().is_empty() {
            let _ = paste_text_to_active_app(&app, &full_text);
        }

        Ok(transcript)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn transcribe_audio_file(
    app: AppHandle,
    file_path: String,
) -> Result<Transcript, String> {
    tokio::task::spawn_blocking(move || -> Result<Transcript, String> {
        let pcm_data = moonshine_rs::audio::load_audio_for_transcription(file_path)
            .map_err(|e| format!("Failed to decode/resample audio file: {}", e))?;

        let state = app.state::<AppState>();
        state.touch_activity();

        let lock = state.lock_transcriber();
        let transcriber = lock.as_ref().ok_or_else(|| {
            "Transcriber is not loaded yet. Please select or download a model.".to_string()
        })?;

        transcriber
            .transcribe(&pcm_data, 16000)
            .map_err(|e| format!("Transcription error: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub async fn transcribe_pcm_samples(
    app: AppHandle,
    pcm_samples: Vec<f32>,
    sample_rate: u32,
) -> Result<Transcript, String> {
    tokio::task::spawn_blocking(move || -> Result<Transcript, String> {
        let pcm_16k = if sample_rate != 16000 {
            moonshine_rs::audio::resample_pcm(
                &pcm_samples,
                sample_rate,
                16000,
                1,
                moonshine_rs::audio::ResampleQuality::Fast,
            )
            .map_err(|e| format!("Failed to resample mic audio: {}", e))?
        } else {
            pcm_samples
        };

        let state = app.state::<AppState>();
        state.touch_activity();

        let lock = state.lock_transcriber();
        let transcriber = lock.as_ref().ok_or_else(|| {
            "Transcriber is not loaded yet. Please select or download a model.".to_string()
        })?;

        let transcript = transcriber
            .transcribe(&pcm_16k, 16000)
            .map_err(|e| format!("Transcription error: {}", e))?;

        let full_text = transcript.text();
        if state.auto_paste_enabled.load(Ordering::SeqCst) && !full_text.trim().is_empty() {
            let _ = paste_text_to_active_app(&app, &full_text);
        }

        Ok(transcript)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}

#[tauri::command]
pub fn copy_to_clipboard(text: String) -> Result<(), String> {
    copy_text_to_clipboard(&text)
}

#[tauri::command]
pub fn paste_text(app: AppHandle, text: String) -> Result<(), String> {
    paste_text_to_active_app(&app, &text)
}

#[tauri::command]
pub fn toggle_auto_paste(state: State<'_, AppState>, enable: bool) -> bool {
    state.auto_paste_enabled.store(enable, Ordering::SeqCst);
    enable
}

#[tauri::command]
pub fn toggle_overlay(app: AppHandle) -> Result<bool, String> {
    crate::overlay::toggle_overlay_window(&app)
}

pub fn copy_text_to_clipboard(text: &str) -> Result<(), String> {
    let mut cb = Clipboard::new().map_err(|e| format!("Clipboard error: {}", e))?;
    cb.set_text(text)
        .map_err(|e| format!("Clipboard set error: {}", e))
}

pub fn paste_text_to_active_app(app: &AppHandle, text: &str) -> Result<(), String> {
    copy_text_to_clipboard(text)?;

    let app_handle = app.clone();
    app.run_on_main_thread(move || {
        std::thread::sleep(Duration::from_millis(150));

        let res = (|| -> Result<(), String> {
            let mut enigo =
                Enigo::new(&Settings::default()).map_err(|e| format!("Enigo error: {:?}", e))?;

            #[cfg(target_os = "macos")]
            {
                let _ = enigo.key(Key::Meta, Direction::Press);
                let _ = enigo.key(Key::Unicode('v'), Direction::Click);
                let _ = enigo.key(Key::Meta, Direction::Release);
            }

            #[cfg(not(target_os = "macos"))]
            {
                let _ = enigo.key(Key::Control, Direction::Press);
                let _ = enigo.key(Key::Unicode('v'), Direction::Click);
                let _ = enigo.key(Key::Control, Direction::Release);
            }

            Ok(())
        })();

        if let Err(err_msg) = res {
            eprintln!("[Auto-Paste Error] {}", err_msg);
            let _ = app_handle.emit("paste-error", err_msg);
        }
    })
    .map_err(|e| format!("Failed to dispatch paste to main thread: {}", e))
}
