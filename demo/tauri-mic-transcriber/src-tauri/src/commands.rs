use std::path::{Path, PathBuf};
use std::sync::Mutex;
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

use moonshine_rs::{ModelArch, Transcriber, TranscriberOptions, Transcript};

#[derive(Default)]
pub struct AppState {
    pub transcriber: Mutex<Option<Transcriber>>,
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
    let manifest: ManifestRoot =
        serde_json::from_str(&manifest_json).map_err(|e| format!("Invalid manifest JSON: {}", e))?;

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
    state: State<'_, AppState>,
    model_dir: String,
    arch_u32: u32,
) -> Result<String, String> {
    let arch = match arch_u32 {
        0 => ModelArch::Tiny,
        1 => ModelArch::Base,
        2 => ModelArch::TinyStreaming,
        3 => ModelArch::BaseStreaming,
        _ => ModelArch::Tiny,
    };

    let options = TranscriberOptions::new();
    let transcriber =
        Transcriber::from_files(Path::new(&model_dir), arch, Some(&options)).map_err(|e| e.to_string())?;

    let handle = transcriber.handle();
    let mut lock = state.transcriber.lock().unwrap();
    *lock = Some(transcriber);

    Ok(format!("Successfully loaded transcriber (handle {})", handle))
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
        let lock = state.transcriber.lock().unwrap();
        let transcriber = lock
            .as_ref()
            .ok_or_else(|| "Transcriber is not loaded yet. Please select or download a model.".to_string())?;

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
        let lock = state.transcriber.lock().unwrap();
        let transcriber = lock
            .as_ref()
            .ok_or_else(|| "Transcriber is not loaded yet. Please select or download a model.".to_string())?;

        transcriber
            .transcribe(&pcm_16k, 16000)
            .map_err(|e| format!("Transcription error: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
