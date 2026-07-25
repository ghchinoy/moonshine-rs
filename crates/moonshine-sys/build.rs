use std::env;
use std::path::{Path, PathBuf};

fn find_moonshine_dir() -> PathBuf {
    if let Ok(dir) = env::var("MOONSHINE_DIR") {
        let p = PathBuf::from(dir);
        if p.join("core/moonshine-c-api.h").exists() {
            return p;
        }
        if p.join("moonshine-c-api.h").exists() {
            return p;
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
            return candidate.canonicalize().unwrap_or_else(|_| candidate.clone());
        }
    }

    panic!(
        "Could not find moonshine source repository. Please set the MOONSHINE_DIR environment variable to the path of the moonshine source tree."
    );
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

fn main() {
    println!("cargo:rerun-if-env-changed=MOONSHINE_DIR");
    println!("cargo:rerun-if-env-changed=DOCS_RS");
    println!("cargo:rerun-if-changed=wrapper.h");

    // docs.rs builds in a network-isolated sandbox with no sibling `moonshine`
    // checkout and no way to set MOONSHINE_DIR. It only needs bindgen output
    // to render documentation, not a working linked binary, so skip the CMake
    // build and native linking entirely and generate bindings from a small
    // vendored copy of the C API header instead.
    //
    // See: https://docs.rs/about/builds ("Detecting Docs.rs")
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

        let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
        bindings
            .write_to_file(out_path.join("bindings.rs"))
            .expect("Couldn't write bindings!");
        return;
    }

    let moonshine_root = find_moonshine_dir();
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

    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();

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

    // Bindgen
    let bindings = bindgen::Builder::default()
        .header("wrapper.h")
        .clang_arg(format!("-I{}", core_dir.display()))
        .clang_arg(format!("-I{}", core_dir.join("third-party/onnxruntime/include").display()))
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
        .generate()
        .expect("Unable to generate bindings");

    let out_path = PathBuf::from(env::var("OUT_DIR").unwrap());
    bindings
        .write_to_file(out_path.join("bindings.rs"))
        .expect("Couldn't write bindings!");
}
