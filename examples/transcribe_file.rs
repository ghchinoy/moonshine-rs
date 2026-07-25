use std::env;
use std::path::PathBuf;

use hound::WavReader;
use moonshine_rs::{ModelArch, Transcriber, TranscriberOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());

    let default_model = PathBuf::from(&home).join(
        "Library/Caches/moonshine_voice/download.moonshine.ai/model/tiny-en/quantized/tiny-en",
    );
    let default_audio = PathBuf::from(&home).join("projects/github/moonshine/test-assets/two_cities_16k.wav");

    let args: Vec<String> = env::args().collect();
    let model_dir = if args.len() > 1 {
        PathBuf::from(&args[1])
    } else {
        default_model
    };

    let audio_file = if args.len() > 2 {
        PathBuf::from(&args[2])
    } else {
        default_audio
    };

    println!("Moonshine version: {}", moonshine_rs::get_version());
    println!("Loading model from: {}", model_dir.display());
    println!("Loading audio from: {}", audio_file.display());

    if !model_dir.exists() {
        eprintln!(
            "Model directory does not exist: {}\nPlease download tiny-en or specify path.",
            model_dir.display()
        );
        std::process::exit(1);
    }

    if !audio_file.exists() {
        eprintln!("Audio file does not exist: {}", audio_file.display());
        std::process::exit(1);
    }

    // Read WAV audio samples using hound
    let mut reader = WavReader::open(&audio_file)?;
    let spec = reader.spec();
    println!(
        "Audio spec: {} Hz, {} channels, {} bits/sample",
        spec.sample_rate, spec.channels, spec.bits_per_sample
    );

    let pcm_data: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Float => reader.samples::<f32>().map(|s| s.unwrap_or(0.0)).collect(),
        hound::SampleFormat::Int => {
            let max_val = (1 << (spec.bits_per_sample - 1)) as f32;
            reader
                .samples::<i32>()
                .map(|s| (s.unwrap_or(0) as f32) / max_val)
                .collect()
        }
    };

    println!("Loaded {} audio samples ({:.2}s)", pcm_data.len(), pcm_data.len() as f32 / spec.sample_rate as f32);

    let options = TranscriberOptions::new();
    let transcriber = Transcriber::from_files(&model_dir, ModelArch::Tiny, Some(&options))?;

    println!("Transcriber loaded successfully (handle: {})", transcriber.handle());

    let start_time = std::time::Instant::now();
    let transcript = transcriber.transcribe(&pcm_data, spec.sample_rate)?;
    let duration = start_time.elapsed();

    println!("\n--- TRANSCRIPT (took {:?}) ---", duration);
    for (i, line) in transcript.lines.iter().enumerate() {
        println!(
            "Line {}: [{:.2}s - {:.2}s] {}",
            i + 1,
            line.start_time,
            line.start_time + line.duration,
            line.text
        );
    }
    println!("----------------------------");

    Ok(())
}
