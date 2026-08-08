use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn toggle_overlay_window(app: &AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("overlay") {
        if window.is_visible().unwrap_or(false) {
            window.hide().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            Ok(true)
        }
    } else {
        create_overlay_window(app)?;
        Ok(true)
    }
}

pub fn create_overlay_window(app: &AppHandle) -> Result<(), String> {
    if app.get_webview_window("overlay").is_some() {
        return Ok(());
    }

    let window = WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("overlay.html".into()))
        .title("Moonshine Dictation Overlay")
        .inner_size(380.0, 120.0)
        .always_on_top(true)
        .decorations(false)
        .resizable(true)
        .build()
        .map_err(|e| format!("Failed to create overlay window: {}", e))?;

    let _ = window.show();
    let _ = window.set_focus();

    Ok(())
}
