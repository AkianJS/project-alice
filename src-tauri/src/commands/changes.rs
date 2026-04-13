use std::path::Path;

use tauri::State;

use crate::error::GitError;
use crate::git::diff::get_file_diff;
use crate::git::status::{get_worktree_status, FileChange};
use crate::state::AppState;
use crate::watcher::debounce::WatcherEvent;

/// Return all changed files in `worktree_path`.
#[tauri::command]
pub fn get_changes(worktree_path: String) -> Result<Vec<FileChange>, String> {
    get_worktree_status(Path::new(&worktree_path)).map_err(|e| e.to_string())
}

/// Return the unified diff for a single file.
///
/// Validates that `file_path` is inside `worktree_path` to prevent path
/// traversal attacks before delegating to [`get_file_diff`].
#[tauri::command]
pub fn get_diff(worktree_path: String, file_path: String) -> Result<String, String> {
    // Canonicalize both paths for an accurate prefix check.
    let worktree_canonical = std::fs::canonicalize(&worktree_path)
        .map_err(|e| GitError::Io(format!("canonicalize worktree: {}", e)).to_string())?;

    let abs_file = Path::new(&worktree_path).join(&file_path);
    let file_canonical = std::fs::canonicalize(&abs_file)
        .map_err(|e| GitError::Io(format!("canonicalize file: {}", e)).to_string())?;

    if !file_canonical.starts_with(&worktree_canonical) {
        return Err(GitError::PathTraversal(
            "File path is outside the worktree directory".to_string(),
        )
        .to_string());
    }

    get_file_diff(&worktree_canonical, &file_path).map_err(|e| e.to_string())
}

/// Start watching `worktree_path` for filesystem changes.
///
/// Events are pushed via `on_changes` whenever a 300 ms quiet period elapses.
#[tauri::command]
pub fn start_watching(
    session_id: String,
    worktree_path: String,
    on_changes: tauri::ipc::Channel<WatcherEvent>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut watcher = state.watcher_manager.lock().map_err(|e| e.to_string())?;
    watcher
        .start_watching(&session_id, Path::new(&worktree_path), on_changes)
        .map_err(|e| e.to_string())
}

/// Stop watching for `session_id`.
#[tauri::command]
pub fn stop_watching(session_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut watcher = state.watcher_manager.lock().map_err(|e| e.to_string())?;
    // Treat NotFound as a no-op (idempotent stop).
    match watcher.stop_watching(&session_id) {
        Ok(_) => Ok(()),
        Err(crate::error::WatcherError::NotFound(_)) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
