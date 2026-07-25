use std::ffi::{CStr, CString};
use std::path::Path;
use std::ptr;
use std::sync::Mutex;

pub use moonshine_sys as sys;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Moonshine C API error ({code}): {message}")]
    ApiError { code: i32, message: String },
    #[error("Invalid transcriber handle")]
    InvalidHandle,
    #[error("Null pointer returned from Moonshine API")]
    NullPointer,
    #[error("Nul byte in CString conversion: {0}")]
    NulError(#[from] std::ffi::NulError),
}

pub type Result<T> = std::result::Result<T, Error>;

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

pub fn get_version() -> i32 {
    unsafe { sys::moonshine_get_version() }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ModelArch {
    Tiny = sys::MOONSHINE_MODEL_ARCH_TINY as isize,
    Base = sys::MOONSHINE_MODEL_ARCH_BASE as isize,
    TinyStreaming = sys::MOONSHINE_MODEL_ARCH_TINY_STREAMING as isize,
    BaseStreaming = sys::MOONSHINE_MODEL_ARCH_BASE_STREAMING as isize,
    SmallStreaming = sys::MOONSHINE_MODEL_ARCH_SMALL_STREAMING as isize,
    MediumStreaming = sys::MOONSHINE_MODEL_ARCH_MEDIUM_STREAMING as isize,
}

impl ModelArch {
    pub fn as_u32(self) -> u32 {
        self as u32
    }
}

#[derive(Debug, Default, Clone)]
pub struct TranscriberOptions {
    options: Vec<(String, String)>,
}

impl TranscriberOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn set(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.options.push((key.into(), value.into()));
        self
    }

    pub fn with_ort_providers(self, providers: &str) -> Self {
        self.set("ort_providers", providers)
    }

    pub fn with_identify_speakers(self, enable: bool) -> Self {
        self.set("identify_speakers", if enable { "true" } else { "false" })
    }

    pub fn with_spelling_model(self, path: &str) -> Self {
        self.set("spelling_model_path", path)
    }
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct TranscriptWord {
    pub text: String,
    pub start: f32,
    pub end: f32,
    pub confidence: f32,
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct SpeakerSpan {
    pub start_time: f32,
    pub duration: f32,
    pub speaker_id: u64,
    pub speaker_index: u32,
    pub start_char: u64,
    pub end_char: u64,
}

#[derive(Debug, Clone)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct TranscriptLine {
    pub text: String,
    pub start_time: f32,
    pub duration: f32,
    pub id: u64,
    pub is_complete: bool,
    pub words: Vec<TranscriptWord>,
    pub speaker_spans: Vec<SpeakerSpan>,
}

#[derive(Debug, Clone, Default)]
#[cfg_attr(feature = "serde", derive(serde::Serialize, serde::Deserialize))]
pub struct Transcript {
    pub lines: Vec<TranscriptLine>,
}

impl Transcript {
    pub fn text(&self) -> String {
        self.lines
            .iter()
            .map(|l| l.text.as_str())
            .collect::<Vec<_>>()
            .join("\n")
    }
}

pub struct Transcriber {
    handle: i32,
    _lock: Mutex<()>,
}

unsafe impl Send for Transcriber {}
unsafe impl Sync for Transcriber {}

impl Transcriber {
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

    pub fn handle(&self) -> i32 {
        self.handle
    }

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

pub fn get_stt_dependencies(
    language: &str,
    arch: Option<ModelArch>,
    include_spelling: bool,
) -> Result<String> {
    let c_lang = CString::new(language)?;
    let mut opts = Vec::new();
    let mut strings = Vec::new();

    if let Some(a) = arch {
        let ck = CString::new("model_arch")?;
        let cv = CString::new(a.as_u32().to_string())?;
        opts.push(sys::moonshine_option_t {
            name: ck.as_ptr(),
            value: cv.as_ptr(),
        });
        strings.push(ck);
        strings.push(cv);
    }

    if include_spelling {
        let ck = CString::new("include_spelling")?;
        let cv = CString::new("true")?;
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
    fn test_stt_catalog() {
        let catalog = get_stt_catalog().unwrap();
        assert!(catalog.contains("English"));
    }
}
