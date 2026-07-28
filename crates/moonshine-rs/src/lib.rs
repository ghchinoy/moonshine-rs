//! Idiomatic, memory-safe Rust bindings for [Moonshine Voice] — fast, on-device
//! speech-to-text powered by ONNX Runtime.
//!
//! `moonshine-rs` wraps the official `libmoonshine` C API with safe types:
//! typed [`Error`]s, automatic resource cleanup via [`Drop`], and a
//! `Send + Sync` [`Transcriber`] suitable for long-running host applications.
//!
//! # Quick start
//!
//! ```no_run
//! use moonshine_rs::audio::load_audio_for_transcription;
//! use moonshine_rs::{ModelArch, Transcriber};
//!
//! // Decode + resample any supported file (WAV/MP3/AAC/FLAC/OGG/M4A) to 16kHz mono.
//! let pcm = load_audio_for_transcription("speech.wav")?;
//!
//! // Load a model directory (see the `download_model` example to fetch one).
//! let transcriber = Transcriber::from_files("./models/tiny-en", ModelArch::Tiny, None)?;
//!
//! let transcript = transcriber.transcribe(&pcm, 16_000)?;
//! println!("{}", transcript.text());
//! # Ok::<(), Box<dyn std::error::Error>>(())
//! ```
//!
//! # Features
//!
//! - `audio` *(default)* — multi-format decoding ([`symphonia`]) and 16kHz
//!   resampling ([`rubato`]) via the [`audio`] module.
//! - `serde` — derive `Serialize`/`Deserialize` on the transcript types.
//!
//! # Getting a model
//!
//! Transcription needs a model directory containing `encoder_model.ort`,
//! `decoder_model_merged.ort`, and `tokenizer.bin`. Resolve download URLs
//! natively with [`get_stt_dependencies`], or run the `download_model` example.
//!
//! [Moonshine Voice]: https://github.com/moonshine-ai/moonshine
//! [`symphonia`]: https://docs.rs/symphonia
//! [`rubato`]: https://docs.rs/rubato

use std::ffi::{CStr, CString};
use std::path::Path;
use std::ptr;
use std::sync::Mutex;

pub use moonshine_sys as sys;

#[cfg(feature = "audio")]
pub mod audio;

/// Errors returned by `moonshine-rs`.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The underlying C API returned a non-zero status `code`. `message` is the
    /// human-readable string from [`error_string`].
    #[error("Moonshine C API error ({code}): {message}")]
    ApiError { code: i32, message: String },
    /// A transcriber handle was invalid (e.g. already freed).
    #[error("Invalid transcriber handle")]
    InvalidHandle,
    /// The C API returned a null pointer where data was expected.
    #[error("Null pointer returned from Moonshine API")]
    NullPointer,
    /// A Rust string could not be converted to a C string because it contained
    /// an interior NUL byte.
    #[error("Nul byte in CString conversion: {0}")]
    NulError(#[from] std::ffi::NulError),
}

/// Convenience alias for `Result<T, moonshine_rs::Error>`.
pub type Result<T> = std::result::Result<T, Error>;

/// Returns the human-readable message for a Moonshine error `code`.
pub fn error_string(code: i32) -> String {
    unsafe {
        let ptr = sys::moonshine_error_to_string(code);
        if ptr.is_null() {
            format!("Unknown error {}", code)
        } else {
            CStr::from_ptr(ptr).to_string_lossy().into_owned()
        }
    }
}

/// Returns the linked `libmoonshine` version as an integer (e.g. `20000`).
pub fn get_version() -> i32 {
    unsafe { sys::moonshine_get_version() }
}

/// The model architecture to load. Must match the model files on disk.
///
/// Batch (non-streaming) transcription uses [`Tiny`](ModelArch::Tiny) or
/// [`Base`](ModelArch::Base); the `*Streaming` variants target the (not yet
/// wrapped) streaming API.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModelArch {
    /// Smallest, fastest English model (`tiny-en`, ~71 MB).
    Tiny = sys::MOONSHINE_MODEL_ARCH_TINY as isize,
    /// Higher-accuracy English model (`base-en`, ~238 MB).
    Base = sys::MOONSHINE_MODEL_ARCH_BASE as isize,
    /// Streaming tiny model.
    TinyStreaming = sys::MOONSHINE_MODEL_ARCH_TINY_STREAMING as isize,
    /// Streaming base model.
    BaseStreaming = sys::MOONSHINE_MODEL_ARCH_BASE_STREAMING as isize,
    /// Streaming small model.
    SmallStreaming = sys::MOONSHINE_MODEL_ARCH_SMALL_STREAMING as isize,
    /// Streaming medium model.
    MediumStreaming = sys::MOONSHINE_MODEL_ARCH_MEDIUM_STREAMING as isize,
}

impl ModelArch {
    /// Returns the raw C enum value for this architecture.
    pub fn as_u32(self) -> u32 {
        self as u32
    }
}

/// Configuration passed to [`Transcriber::from_files`].
///
/// Options are forwarded to the C API as key/value string pairs. Use the
/// builder methods for common settings, or [`set`](TranscriberOptions::set) for
/// arbitrary keys.
///
/// ```
/// use moonshine_rs::TranscriberOptions;
/// let options = TranscriberOptions::new()
///     .with_ort_providers("CPU")
///     .with_identify_speakers(true);
/// ```
#[derive(Debug, Default, Clone)]
pub struct TranscriberOptions {
    options: Vec<(String, String)>,
}

impl TranscriberOptions {
    /// Creates an empty option set.
    pub fn new() -> Self {
        Self::default()
    }

    /// Sets an arbitrary option key/value pair, returning `self` for chaining.
    pub fn set(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.options.push((key.into(), value.into()));
        self
    }

    /// Selects the ONNX Runtime execution providers (e.g. `"CPU"`).
    pub fn with_ort_providers(self, providers: &str) -> Self {
        self.set("ort_providers", providers)
    }

    /// Enables speaker identification (diarization). See the
    /// `speaker_diarization` example.
    pub fn with_identify_speakers(self, enable: bool) -> Self {
        self.set("identify_speakers", if enable { "true" } else { "false" })
    }

    /// Sets the path to an optional spelling model.
    pub fn with_spelling_model(self, path: &str) -> Self {
        self.set("spelling_model_path", path)
    }
}

/// A single recognized word with timing and confidence.
///
/// Populated only when the model ships the attention decoder (see the
/// `word_timestamps` example); otherwise [`TranscriptLine::words`] is empty.
#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct TranscriptWord {
    /// The word text.
    pub text: String,
    /// Start time in seconds from the beginning of the audio.
    pub start: f32,
    /// End time in seconds from the beginning of the audio.
    pub end: f32,
    /// Model confidence in `[0.0, 1.0]`.
    pub confidence: f32,
}

/// A span of a line attributed to a single speaker (diarization output).
///
/// Populated when [`TranscriberOptions::with_identify_speakers`] is enabled.
#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct SpeakerSpan {
    /// Start time in seconds from the beginning of the audio.
    pub start_time: f32,
    /// Span duration in seconds.
    pub duration: f32,
    /// Stable speaker identifier.
    pub speaker_id: u64,
    /// Zero-based speaker index within this transcript.
    pub speaker_index: u32,
    /// Start character offset of the span.
    pub start_char: u64,
    /// End character offset of the span.
    pub end_char: u64,
}

/// One line of a [`Transcript`], with timing and optional word/speaker detail.
#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct TranscriptLine {
    /// The recognized text for this line.
    pub text: String,
    /// Start time in seconds from the beginning of the audio.
    pub start_time: f32,
    /// Line duration in seconds.
    pub duration: f32,
    /// Stable line identifier.
    pub id: u64,
    /// Whether the line is finalized (relevant for streaming).
    pub is_complete: bool,
    /// Per-word timing/confidence, if available. See [`TranscriptWord`].
    pub words: Vec<TranscriptWord>,
    /// Speaker attribution spans, if diarization was enabled.
    pub speaker_spans: Vec<SpeakerSpan>,
}

/// The full result of a transcription: an ordered list of [`TranscriptLine`]s.
#[derive(Debug, Clone, Default)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Transcript {
    /// The recognized lines, in order.
    pub lines: Vec<TranscriptLine>,
}

impl Transcript {
    /// Joins all line texts with newlines into a single string.
    pub fn text(&self) -> String {
        self.lines
            .iter()
            .map(|l| l.text.as_str())
            .collect::<Vec<_>>()
            .join("\n")
    }
}

/// A loaded Moonshine model ready to transcribe audio.
///
/// `Transcriber` is `Send + Sync` and manages the native handle, freeing it on
/// [`Drop`]. Load once and reuse across many `transcribe` calls; wrap in
/// [`std::sync::Arc`] to share across threads/tasks (see the `async_transcribe`
/// example). Concurrent calls are serialized internally by a mutex.
///
/// ```no_run
/// use moonshine_rs::{ModelArch, Transcriber};
/// let t = Transcriber::from_files("./models/tiny-en", ModelArch::Tiny, None)?;
/// let pcm = vec![0.0f32; 16_000]; // 1s of silence at 16kHz mono
/// let transcript = t.transcribe(&pcm, 16_000)?;
/// # Ok::<(), Box<dyn std::error::Error>>(())
/// ```
pub struct Transcriber {
    handle: i32,
    _lock: Mutex<()>,
}

unsafe impl Send for Transcriber {}
unsafe impl Sync for Transcriber {}

impl Transcriber {
    /// Loads a transcriber from a model directory containing
    /// `encoder_model.ort`, `decoder_model_merged.ort`, and `tokenizer.bin`.
    ///
    /// `arch` must match the model files. Pass `None` for default options.
    ///
    /// # Errors
    /// Returns [`Error::ApiError`] if the model cannot be loaded (e.g. missing
    /// files, LFS pointer files, or an architecture mismatch).
    pub fn from_files(
        path: impl AsRef<Path>,
        arch: ModelArch,
        options: Option<&TranscriberOptions>,
    ) -> Result<Self> {
        let path_str = path
            .as_ref()
            .to_str()
            .ok_or_else(|| Error::ApiError {
                code: -1,
                message: "Path contains invalid UTF-8".to_string(),
            })?;

        let c_path = CString::new(path_str)?;

        let (c_options, _c_strings) = if let Some(opts) = options {
            let mut raw_opts = Vec::with_capacity(opts.options.len());
            let mut strings = Vec::with_capacity(opts.options.len() * 2);

            for (k, v) in &opts.options {
                let ck = CString::new(k.as_str())?;
                let cv = CString::new(v.as_str())?;
                raw_opts.push(sys::moonshine_option_t {
                    name: ck.as_ptr(),
                    value: cv.as_ptr(),
                });
                strings.push(ck);
                strings.push(cv);
            }

            (raw_opts, strings)
        } else {
            (Vec::new(), Vec::new())
        };

        let opts_ptr = if c_options.is_empty() {
            ptr::null()
        } else {
            c_options.as_ptr()
        };

        let handle = unsafe {
            sys::moonshine_load_transcriber_from_files(
                c_path.as_ptr(),
                arch.as_u32(),
                opts_ptr,
                c_options.len() as u64,
                sys::MOONSHINE_HEADER_VERSION as i32,
            )
        };

        if handle < 0 {
            return Err(Error::ApiError {
                code: handle,
                message: error_string(handle),
            });
        }

        Ok(Self {
            handle,
            _lock: Mutex::new(()),
        })
    }

    /// Returns the raw native handle. Primarily useful for logging/debugging.
    pub fn handle(&self) -> i32 {
        self.handle
    }

    /// Transcribes mono `f32` PCM samples in `[-1.0, 1.0]`.
    ///
    /// Moonshine expects 16 kHz mono audio; use
    /// [`audio::load_audio_for_transcription`] to decode and resample files.
    /// This call is synchronous and CPU-bound — offload it with
    /// [`tokio::task::spawn_blocking`](https://docs.rs/tokio) inside async code.
    ///
    /// # Errors
    /// Returns [`Error::ApiError`] if the C API reports a transcription failure.
    pub fn transcribe(&self, pcm_data: &[f32], sample_rate: u32) -> Result<Transcript> {
        let _guard = self._lock.lock().unwrap();

        let mut out_transcript: *mut sys::transcript_t = ptr::null_mut();

        let mut audio_vec = pcm_data.to_vec();
        let audio_ptr = audio_vec.as_mut_ptr();

        let ret = unsafe {
            sys::moonshine_transcribe_without_streaming(
                self.handle,
                audio_ptr,
                pcm_data.len() as u64,
                sample_rate as i32,
                0,
                &mut out_transcript,
            )
        };

        if ret != 0 {
            return Err(Error::ApiError {
                code: ret,
                message: error_string(ret),
            });
        }

        if out_transcript.is_null() {
            return Ok(Transcript::default());
        }

        let mut lines = Vec::new();
        unsafe {
            let t = &*out_transcript;
            if t.line_count > 0 && !t.lines.is_null() {
                let raw_lines = std::slice::from_raw_parts(t.lines, t.line_count as usize);
                for raw_line in raw_lines {
                    let text = if raw_line.text.is_null() {
                        String::new()
                    } else {
                        CStr::from_ptr(raw_line.text).to_string_lossy().into_owned()
                    };

                    let mut words = Vec::new();
                    if raw_line.word_count > 0 && !raw_line.words.is_null() {
                        let raw_words = std::slice::from_raw_parts(
                            raw_line.words,
                            raw_line.word_count as usize,
                        );
                        for rw in raw_words {
                            let w_text = if rw.text.is_null() {
                                String::new()
                            } else {
                                CStr::from_ptr(rw.text).to_string_lossy().into_owned()
                            };
                            words.push(TranscriptWord {
                                text: w_text,
                                start: rw.start,
                                end: rw.end,
                                confidence: rw.confidence,
                            });
                        }
                    }

                    let mut speaker_spans = Vec::new();
                    if raw_line.speaker_span_count > 0 && !raw_line.speaker_spans.is_null() {
                        let raw_spans = std::slice::from_raw_parts(
                            raw_line.speaker_spans,
                            raw_line.speaker_span_count as usize,
                        );
                        for rs in raw_spans {
                            speaker_spans.push(SpeakerSpan {
                                start_time: rs.start_time,
                                duration: rs.duration,
                                speaker_id: rs.speaker_id,
                                speaker_index: rs.speaker_index,
                                start_char: rs.start_char,
                                end_char: rs.end_char,
                            });
                        }
                    }

                    lines.push(TranscriptLine {
                        text,
                        start_time: raw_line.start_time,
                        duration: raw_line.duration,
                        id: raw_line.id,
                        is_complete: raw_line.is_complete != 0,
                        words,
                        speaker_spans,
                    });
                }
            }
        }

        Ok(Transcript { lines })
    }
}

impl Drop for Transcriber {
    fn drop(&mut self) {
        if self.handle >= 0 {
            unsafe {
                sys::moonshine_free_transcriber(self.handle);
            }
        }
    }
}

/// Resolves the download manifest (CDN URLs, file sizes, CRC32C checksums) for
/// an STT model as a JSON string.
///
/// See the `download_model` example for parsing and fetching the listed files.
/// For extra knobs (word timestamps, spelling model path) use
/// [`get_stt_dependencies_with_options`].
pub fn get_stt_dependencies(
    language: &str,
    arch: Option<ModelArch>,
    include_spelling: bool,
) -> Result<String> {
    get_stt_dependencies_with_options(
        language,
        &SttDependenciesOptions {
            arch,
            include_spelling,
            ..Default::default()
        },
    )
}

/// Extended options for [`get_stt_dependencies_with_options`], covering the
/// full set of dependency-resolution knobs supported by
/// `moonshine_get_stt_dependencies` (added upstream alongside
/// `word_timestamps` and the `spelling` / `spelling_model_path` aliases).
#[derive(Debug, Default, Clone)]
pub struct SttDependenciesOptions {
    pub arch: Option<ModelArch>,
    /// Include the spelling model's files as an extra dependency group.
    /// Equivalent to passing `include_spelling` (alias: `spelling`) to the C
    /// API.
    pub include_spelling: bool,
    /// Include the optional attention decoder needed to produce word-level
    /// timestamps. This roughly doubles the download size for models that
    /// publish it, so it defaults to `false`.
    pub word_timestamps: bool,
    /// Resolve dependencies for a specific spelling model path instead of
    /// the language's default spelling model. Implies `include_spelling`.
    pub spelling_model_path: Option<String>,
}

impl SttDependenciesOptions {
    /// Creates a default option set.
    pub fn new() -> Self {
        Self::default()
    }

    /// Resolves dependencies for a specific model architecture.
    pub fn with_arch(mut self, arch: ModelArch) -> Self {
        self.arch = Some(arch);
        self
    }

    /// Includes the spelling model's files as an extra dependency group.
    pub fn with_include_spelling(mut self, include_spelling: bool) -> Self {
        self.include_spelling = include_spelling;
        self
    }

    /// Includes the attention decoder needed for word-level timestamps.
    pub fn with_word_timestamps(mut self, word_timestamps: bool) -> Self {
        self.word_timestamps = word_timestamps;
        self
    }

    /// Resolves dependencies for a specific spelling model path (implies
    /// `include_spelling`).
    pub fn with_spelling_model_path(mut self, path: impl Into<String>) -> Self {
        self.spelling_model_path = Some(path.into());
        self
    }
}

/// Like [`get_stt_dependencies`], but exposes the full set of options
/// recognized by `moonshine_get_stt_dependencies`, including
/// `word_timestamps` and `spelling_model_path`.
pub fn get_stt_dependencies_with_options(
    language: &str,
    options: &SttDependenciesOptions,
) -> Result<String> {
    let c_lang = CString::new(language)?;
    let mut opts = Vec::new();
    let mut strings = Vec::new();

    if let Some(a) = options.arch {
        let ck = CString::new("model_arch")?;
        let cv = CString::new(a.as_u32().to_string())?;
        opts.push(sys::moonshine_option_t {
            name: ck.as_ptr(),
            value: cv.as_ptr(),
        });
        strings.push(ck);
        strings.push(cv);
    }

    if options.include_spelling {
        let ck = CString::new("include_spelling")?;
        let cv = CString::new("true")?;
        opts.push(sys::moonshine_option_t {
            name: ck.as_ptr(),
            value: cv.as_ptr(),
        });
        strings.push(ck);
        strings.push(cv);
    }

    if options.word_timestamps {
        let ck = CString::new("word_timestamps")?;
        let cv = CString::new("true")?;
        opts.push(sys::moonshine_option_t {
            name: ck.as_ptr(),
            value: cv.as_ptr(),
        });
        strings.push(ck);
        strings.push(cv);
    }

    if let Some(path) = &options.spelling_model_path {
        let ck = CString::new("spelling_model_path")?;
        let cv = CString::new(path.as_str())?;
        opts.push(sys::moonshine_option_t {
            name: ck.as_ptr(),
            value: cv.as_ptr(),
        });
        strings.push(ck);
        strings.push(cv);
    }

    let mut out_json: *mut std::os::raw::c_char = ptr::null_mut();

    let ret = unsafe {
        sys::moonshine_get_stt_dependencies(
            c_lang.as_ptr(),
            if opts.is_empty() { ptr::null() } else { opts.as_ptr() },
            opts.len() as u64,
            &mut out_json,
        )
    };

    if ret != 0 {
        return Err(Error::ApiError {
            code: ret,
            message: error_string(ret),
        });
    }

    if out_json.is_null() {
        return Err(Error::NullPointer);
    }

    let json_str = unsafe {
        let str_slice = CStr::from_ptr(out_json).to_string_lossy().into_owned();
        sys::moonshine_free_buffer(out_json as *mut std::ffi::c_void);
        str_slice
    };

    Ok(json_str)
}

/// Returns the full STT catalog (languages and available model architectures)
/// as a JSON string. See the `browse_catalog` example.
pub fn get_stt_catalog() -> Result<String> {
    let mut out_json: *mut std::os::raw::c_char = ptr::null_mut();

    let ret = unsafe { sys::moonshine_get_stt_catalog(&mut out_json) };

    if ret != 0 {
        return Err(Error::ApiError {
            code: ret,
            message: error_string(ret),
        });
    }

    if out_json.is_null() {
        return Err(Error::NullPointer);
    }

    let json_str = unsafe {
        let str_slice = CStr::from_ptr(out_json).to_string_lossy().into_owned();
        sys::moonshine_free_buffer(out_json as *mut std::ffi::c_void);
        str_slice
    };

    Ok(json_str)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        let ver = get_version();
        assert!(ver >= 20000, "Version should be at least 20000");
    }

    #[test]
    fn test_error_string() {
        let msg = error_string(sys::MOONSHINE_ERROR_NONE as i32);
        assert!(!msg.is_empty());
    }

    #[test]
    fn test_stt_dependencies() {
        let deps = get_stt_dependencies("en", Some(ModelArch::Tiny), false).unwrap();
        assert!(deps.contains("encoder_model.ort"));
        assert!(deps.contains("decoder_model_merged.ort"));
    }

    #[test]
    fn test_stt_dependencies_with_options_word_timestamps() {
        let opts = SttDependenciesOptions::new()
            .with_arch(ModelArch::Tiny)
            .with_word_timestamps(true);
        let deps = get_stt_dependencies_with_options("en", &opts).unwrap();
        assert!(deps.contains("encoder_model.ort"));
    }

    #[test]
    fn test_stt_catalog() {
        let catalog = get_stt_catalog().unwrap();
        assert!(catalog.contains("English"));
    }
}
