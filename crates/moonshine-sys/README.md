# moonshine-sys

Low-level C FFI bindings to [Moonshine Voice (`libmoonshine`)](https://github.com/moonshine-ai/moonshine).

[![crates.io](https://img.shields.io/crates/v/moonshine-sys.svg)](https://crates.io/crates/moonshine-sys)
[![docs.rs](https://docs.rs/moonshine-sys/badge.svg)](https://docs.rs/moonshine-sys)
[![License: MIT OR Apache-2.0](https://img.shields.io/badge/License-MIT%20OR%20Apache--2.0-blue.svg)](#license)

`moonshine-sys` compiles `libmoonshine` C++ core via CMake and generates raw `extern "C"` Rust FFI declarations using `bindgen`. It statically links ONNX Runtime.

> **Note**: This crate exposes unsafe raw FFI bindings. Most Rust developers should use the safe, high-level wrapper crate [**`moonshine-rs`**](https://crates.io/crates/moonshine-rs) instead.

## Build Prerequisites

Building `moonshine-sys` requires a local clone of the [moonshine-ai/moonshine](https://github.com/moonshine-ai/moonshine) repository:

```bash
git clone https://github.com/moonshine-ai/moonshine.git
export MOONSHINE_DIR=/path/to/moonshine
cargo build
```

The build script (`build.rs`) invokes CMake to compile `libmoonshine` with `-DMOONSHINE_BUILD_SHARED=OFF` and generates Rust FFI bindings targeting `moonshine-c-api.h`.

## License

Dual-licensed under either of:

- Apache License, Version 2.0 ([LICENSE-APACHE](https://github.com/ghchinoy/moonshine-rs/blob/main/LICENSE-APACHE) or <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT License ([LICENSE-MIT](https://github.com/ghchinoy/moonshine-rs/blob/main/LICENSE-MIT) or <http://opensource.org/licenses/MIT>)

at your option.
