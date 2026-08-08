//! Live microphone streaming transcription terminal demo using `cpal` and `moonshine-rs`.
//!
//! Captures audio from default input device (microphone) and transcribes in real time
//! with partial/final line updates in the terminal.
//!
//! Run:
//!
//! ```bash
//! cargo run -p stream-cli -- /path/to/tiny-streaming
//! ```

use std::env;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use moonshine_rs::{ModelArch, Transcriber, TranscriberOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <STREAMING_MODEL_DIR>", args[0]);
        eprintln!();
        eprintln!(
            "  STREAMING_MODEL_DIR  Path to streaming model directory (e.g. tiny-streaming)."
        );
        std::process::exit(2);
    }

    let model_dir = PathBuf::from(&args[1]);

    println!("Loading streaming model from {}...", model_dir.display());
    let options = TranscriberOptions::new();
    let transcriber = Arc::new(Transcriber::from_files(
        &model_dir,
        ModelArch::TinyStreaming,
        Some(&options),
    )?);

    println!("Starting live microphone stream...");
    let stream_session = Arc::new(Mutex::new(transcriber.create_owned_stream()?));

    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or("No default input audio device (microphone) found")?;

    let device_name = device.to_string();
    println!("Using input device: {}", device_name);

    let supported_config = device.default_input_config()?;
    let sample_rate = supported_config.sample_rate();
    let channels = supported_config.channels() as usize;

    println!("Audio format: {} Hz, {} channel(s)", sample_rate, channels);

    let stream_clone = Arc::clone(&stream_session);
    let sample_format = supported_config.sample_format();
    let stream_config: cpal::StreamConfig = supported_config.into();

    let stream = match sample_format {
        cpal::SampleFormat::F32 => device.build_input_stream(
            stream_config,
            move |data: &[f32], _: &_| {
                let mono_pcm: Vec<f32> = if channels > 1 {
                    data.chunks(channels)
                        .map(|chunk| chunk.iter().sum::<f32>() / channels as f32)
                        .collect()
                } else {
                    data.to_vec()
                };

                if let Ok(mut s) = stream_clone.lock() {
                    let _ = s.add_audio(&mono_pcm, sample_rate);
                }
            },
            |err| eprintln!("Audio stream error: {}", err),
            None,
        )?,
        format => return Err(format!("Unsupported audio sample format: {:?}", format).into()),
    };

    stream.play()?;

    println!("\n=== LIVE STREAMING ACTIVE (Press Ctrl+C to stop) ===");
    println!("Speak into your microphone...\n");

    let poller_stream = Arc::clone(&stream_session);
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    ctrlc::set_handler(move || {
        r.store(false, Ordering::SeqCst);
    })
    .ok();

    while running.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(200));

        if let Ok(mut s) = poller_stream.lock() {
            if let Ok(transcript) = s.poll(false) {
                for line in &transcript.lines {
                    if line.is_updated || line.is_new {
                        let tag = if line.is_complete { "FINAL" } else { "LIVE " };
                        println!(
                            "[{tag}] line {}: [{:.2}s - {:.2}s] {}",
                            line.id,
                            line.start_time,
                            line.start_time + line.duration,
                            line.text
                        );
                    }
                }
            }
        }
    }

    println!("\nFinalizing stream...");
    if let Ok(mut s) = stream_session.lock() {
        if let Ok(final_transcript) = s.poll(true) {
            for line in &final_transcript.lines {
                println!(
                    "[FINAL] line {}: [{:.2}s - {:.2}s] {}",
                    line.id,
                    line.start_time,
                    line.start_time + line.duration,
                    line.text
                );
            }
        }
    }

    Ok(())
}
