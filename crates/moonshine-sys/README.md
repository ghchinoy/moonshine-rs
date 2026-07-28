# moonshine-sys

Low-level C FFI bindings to [Moonshine Voice (`libmoonshine`)](https://github.com/moonshine-ai/moonshine).

[![crates.io](https://img.shields.io/crates/v/moonshine-sys.svg)](https://crates.io/crates/moonshine-sys)
[![docs.rs](https://docs.rs/moonshine-sys/badge.svg)](https://docs.rs/moonshine-sys)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)

`moonshine-sys` provides raw `extern "C"` Rust FFI declarations for `libmoonshine`, generated with `bindgen`. It either links official prebuilt release binaries (default) or compiles the C++ core from source via CMake.

> **Note**: This crate exposes unsafe raw FFI bindings. Most Rust developers should use the safe, high-level wrapper crate [**`moonshine-rs`**](https://crates.io/crates/moonshine-rs) instead.

## Building

### Default: prebuilt binaries (no toolchain required)

By default, `build.rs` downloads prebuilt `libmoonshine` binaries from
[moonshine-ai/moonshine GitHub Releases](https://github.com/moonshine-ai/moonshine/releases)
and links them — no CMake, C++ compiler, or source checkout needed:

```bash
cargo build
```

Pin an upstream release tag with `MOONSHINE_VERSION` (e.g. `MOONSHINE_VERSION=v0.1.0`).
Prebuilt linkage is static + self-contained on macOS (arm64), and dynamic
(`.so` / `onnxruntime.dll`) on Linux and Windows.

### Advanced: build from source

Set `MOONSHINE_DIR` to a local checkout to compile from source instead. This
requires CMake ≥ 3.22 and a C++20 compiler. The build script invokes CMake with
`-DMOONSHINE_BUILD_SHARED=OFF` and generates FFI bindings targeting
`moonshine-c-api.h`:

```bash
git clone https://github.com/moonshine-ai/moonshine.git
export MOONSHINE_DIR=/path/to/moonshine
cargo build
```

## License

Dual-licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](https://github.com/ghchinoy/moonshine-rs/blob/main/LICENSE-APACHE) or <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT License ([LICENSE-MIT](https://github.com/ghchinoy/moonshine-rs/blob/main/LICENSE-MIT) or <http://opensource.org/licenses/MIT>)

at your option.
