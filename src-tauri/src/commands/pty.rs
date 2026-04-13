use std::path::Path;

use tauri::State;

use crate::pty::reader::PtyOutputEvent;
use crate::state::AppState;

#[tauri::command]
pub fn open_pty(
    session_id: String,
    tab_id: String,
    cwd: String,
    cols: u16,
    rows: u16,
    on_output: tauri::ipc::Channel<PtyOutputEvent>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut pty = state.pty_manager.lock().map_err(|e| e.to_string())?;
    pty.spawn(&tab_id, &session_id, Path::new(&cwd), cols, rows, on_output)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_pty(
    tab_id: String,
    data: Vec<u8>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut pty = state.pty_manager.lock().map_err(|e| e.to_string())?;
    pty.write(&tab_id, &data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resize_pty(
    tab_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut pty = state.pty_manager.lock().map_err(|e| e.to_string())?;
    pty.resize(&tab_id, cols, rows).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn close_pty(tab_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut pty = state.pty_manager.lock().map_err(|e| e.to_string())?;
    pty.kill(&tab_id).map_err(|e| e.to_string())
}
