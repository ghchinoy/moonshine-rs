use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn find_moonshine_dir_optional() -> Option<PathBuf> {
    if let Ok(dir) = env::var("MOONSHINE_DIR") {
        let p = PathBuf::from(dir);
        if p.join("core/moonshine-c-api.h").exists() || p.join("moonshine-c-api.h").exists() {
            return Some(p);
        }
    }

    let candidates = [
        PathBuf::from("../../moonshine"),
        PathBuf::from("../moonshine"),
        PathBuf::from("../../../github/moonshine"),
        PathBuf::from("../../github/moonshine"),
        PathBuf::from("../github/moonshine"),
    ];

    for candidate in &candidates {
        if candidate.join("core/moonshine-c-api.h").exists() {
            return candidate.canonicalize().ok();
        }
    }

    None
}

fn get_onnxruntime_dir(core_dir: &Path) -> PathBuf {
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();

    let os_sub = match target_os.as_str() {
        "macos" => "macos",
        "linux" => "linux",
        "windows" => "windows",
        "android" => "android",
        "ios" => "ios",
        _ => target_os.as_str(),
    };

    let arch_sub = match target_arch.as_str() {
        "aarch64" | "arm64" => "arm64",
        "x86_64" => "x86_64",
        _ => target_arch.as_str(),
    };

    let ort_path = core_dir.join(format!("third-party/onnxruntime/lib/{}/{}", os_sub, arch_sub));
    if ort_path.exists() {
        ort_path
    } else {
        panic!(
            "ONNX Runtime library directory does not exist at {}. Check target OS ({}) and architecture ({})",
            ort_path.display(),
            os_sub,
            arch_sub
        );
    }
}

fn download_prebuilt_release(out_dir: &Path) -> Result<(PathBuf, PathBuf), String> {
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();

    let asset_name = match (target_os.as_str(), target_arch.as_str()) {
        ("macos", _) => "moonshine-voice-macos-arm64.tar.gz",
        ("linux", "x86_64") => "moonshine-voice-linux-x86_64.tar.gz",
        ("linux", "aarch64") | ("linux", "arm64") => "moonshine-voice-linux-arm64.tar.gz",
        ("windows", "x86_64") => "moonshine-voice-windows-x86_64.tar.gz",
        _ => {
            return Err(format!(
                "Prebuilt binaries are not available for target {}-{}. Please set MOONSHINE_DIR to build from source.",
                target_os, target_arch
            ));
        }
    };

    let version_tag = env::var("MOONSHINE_VERSION").unwrap_or_else(|_| "v0.0.73".to_string());
    let folder_name = asset_name.trim_end_matches(".tar.gz");

    let prebuilt_root = out_dir.join("moonshine-prebuilt");
    let extract_dir = prebuilt_root.join(folder_name);
    let include_dir = extract_dir.join("include");
    let lib_dir = extract_dir.join("lib");

    if !include_dir.exists() || !lib_dir.exists() {
        let url = format!(
            "https://github.com/moonshine-ai/moonshine/releases/download/{}/{}",
            version_tag, asset_name
        );
        println!("cargo:warning=Downloading prebuilt libmoonshine release ({}) from {}", version_tag, url);

        fs::create_dir_all(&prebuilt_root)
            .map_err(|e| format!("Failed to create prebuilt directory: {}", e))?;

        let response = ureq::get(&url)
            .call()
            .map_err(|e| format!("Failed to download prebuilt libmoonshine from {}: {}", url, e))?;

        let gz = flate2::read::GzDecoder::new(response.into_reader());
        let mut archive = tar::Archive::new(gz);

        archive
            .unpack(&prebuilt_root)
            .map_err(|e| format!("Failed to extract prebuilt libmoonshine archive: {}", e))?;
    }

    if !include_dir.exists() || !lib_dir.exists() {
        return Err(format!(
            "Extracted archive at {} does not contain expected include or lib directory.",
            extract_dir.display()
        ));
    }

    Ok((include_dir, lib_dir))
}

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());

    println!("cargo:rerun-if-env-changed=MOONSHINE_DIR");
    println!("cargo:rerun-if-env-changed=MOONSHINE_VERSION");
    println!("cargo:rerun-if-env-changed=DOCS_RS");
    println!("cargo:rerun-if-changed=wrapper.h");

    // docs.rs builds in a network-isolated sandbox with no sibling `moonshine`
    // checkout and no way to set MOONSHINE_DIR. It only needs bindgen output
    // to render documentation, not a working linked binary, so skip the CMake
    // build and native linking entirely and generate bindings from a small
    // vendored copy of the C API header instead.
    if env::var("DOCS_RS").is_ok() {
        let vendor_dir = PathBuf::from("vendor");
        println!(
            "cargo:rerun-if-changed={}",
            vendor_dir.join("moonshine-c-api.h").display()
        );

        let bindings = bindgen::Builder::default()
            .header("wrapper.h")
            .clang_arg(format!("-I{}", vendor_dir.display()))
            .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
            .generate()
            .expect("Unable to generate bindings (docs.rs mode)");

        bindings
            .write_to_file(out_dir.join("bindings.rs"))
            .expect("Couldn't write bindings!");
        return;
    }

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();

    // Check if local moonshine C++ source repository is available
    if let Some(moonshine_root) = find_moonshine_dir_optional() {
        let core_dir = if moonshine_root.join("core").exists() {
            moonshine_root.join("core")
        } else {
            moonshine_root.clone()
        };

        println!("cargo:rerun-if-changed={}", core_dir.join("moonshine-c-api.h").display());

        let mut config = cmake::Config::new(&core_dir);
        config.define("MOONSHINE_BUILD_SHARED", "OFF");
        config.define("MOONSHINE_BUILD_SWIFT", "ON");
        config.define("CMAKE_CXX_STANDARD", "20");
        config.build_target("moonshine");

        let dst = config.build();

        let build_dir = dst.join("build");
        println!("cargo:rustc-link-search=native={}", build_dir.display());
        println!("cargo:rustc-link-search=framework={}", build_dir.display());

        if target_os == "macos" || target_os == "ios" {
            // Linked via macOS framework
            println!("cargo:rustc-link-lib=framework=moonshine");
            println!("cargo:rustc-link-lib=framework=CoreFoundation");
            println!("cargo:rustc-link-lib=framework=Foundation");
            println!("cargo:rustc-link-lib=dylib=c++");
        } else {
            // ONNX Runtime prebuilt static archive
            let ort_dir = get_onnxruntime_dir(&core_dir);
            println!("cargo:rustc-link-search=native={}", ort_dir.display());

            println!("cargo:rustc-link-lib=static=moonshine");
            println!("cargo:rustc-link-lib=static=bin-tokenizer");
            println!("cargo:rustc-link-lib=static=ort-utils");
            println!("cargo:rustc-link-lib=static=moonshine-utils");
            println!("cargo:rustc-link-lib=static=onnxruntime");

            if target_os == "linux" {
                println!("cargo:rustc-link-lib=dylib=stdc++");
                println!("cargo:rustc-link-lib=dylib=pthread");
            }
        }

        // Bindgen against source core_dir
        let bindings = bindgen::Builder::default()
            .header("wrapper.h")
            .clang_arg(format!("-I{}", core_dir.display()))
            .clang_arg(format!("-I{}", core_dir.join("third-party/onnxruntime/include").display()))
            .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
            .generate()
            .expect("Unable to generate bindings");

        bindings
            .write_to_file(out_dir.join("bindings.rs"))
            .expect("Couldn't write bindings!");
    } else {
        // Fallback: Download prebuilt release assets from GitHub Releases
        println!("cargo:warning=No local moonshine source repository found. Falling back to prebuilt release binary download.");

        let (include_dir, lib_dir) = download_prebuilt_release(&out_dir)
            .expect("Failed to download prebuilt libmoonshine release");

        println!("cargo:rustc-link-search=native={}", lib_dir.display());

        if target_os == "macos" || target_os == "ios" {
            println!("cargo:rustc-link-lib=static=moonshine");
            println!("cargo:rustc-link-lib=framework=CoreFoundation");
            println!("cargo:rustc-link-lib=framework=Foundation");
            println!("cargo:rustc-link-lib=dylib=c++");
        } else if target_os == "linux" {
            println!("cargo:rustc-link-lib=dylib=moonshine");
            println!("cargo:rustc-link-lib=dylib=onnxruntime");
            println!("cargo:rustc-link-lib=dylib=stdc++");
            println!("cargo:rustc-link-lib=dylib=pthread");
            println!("cargo:rustc-link-arg=-Wl,-rpath,{}", lib_dir.display());
        } else if target_os == "windows" {
            println!("cargo:rustc-link-lib=static=moonshine");
            println!("cargo:rustc-link-lib=static=bin-tokenizer");
            println!("cargo:rustc-link-lib=static=ort-utils");
            println!("cargo:rustc-link-lib=static=moonshine-utils");
            println!("cargo:rustc-link-lib=dylib=onnxruntime");
        } else {
            println!("cargo:rustc-link-lib=static=moonshine");
        }

        // Bindgen against downloaded prebuilt include_dir
        let bindings = bindgen::Builder::default()
            .header("wrapper.h")
            .clang_arg(format!("-I{}", include_dir.display()))
            .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
            .generate()
            .expect("Unable to generate bindings against prebuilt headers");

        bindings
            .write_to_file(out_dir.join("bindings.rs"))
            .expect("Couldn't write bindings!");
    }
}
