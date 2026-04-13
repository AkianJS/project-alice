use serde::Serialize;
use tauri::State;

use crate::db::models::{Session, SessionStatus};
use crate::state::AppState;
use crate::{git, git::worktree};

/// A session with an additional computed field indicating whether the worktree
/// directory still exists on disk.  This lets the frontend warn the user about
/// orphaned sessions whose worktree was deleted externally.
#[derive(Serialize)]
pub struct SessionResponse {
    #[serde(flatten)]
    pub session: Session,
    pub worktree_exists: bool,
}

fn validate_branch_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Branch name is required".to_string());
    }
    let valid = name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '.' | '-'));
    if !valid {
        return Err("Branch name contains invalid characters".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_branch_name_feature_slash() {
        assert!(validate_branch_name("feature/auth").is_ok());
    }

    #[test]
    fn validate_branch_name_fix_dash() {
        assert!(validate_branch_name("fix-bug").is_ok());
    }

    #[test]
    fn validate_branch_name_with_dot() {
        assert!(validate_branch_name("my.branch").is_ok());
    }

    #[test]
    fn validate_branch_name_empty_err() {
        assert!(validate_branch_name("").is_err());
    }

    #[test]
    fn validate_branch_name_spaces_err() {
        assert!(validate_branch_name("has spaces").is_err());
    }

    #[test]
    fn validate_branch_name_at_sign_err() {
        assert!(validate_branch_name("bad@char").is_err());
    }
}

fn now_unix() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[tauri::command]
pub fn create_session(branch_name: String, state: State<'_, AppState>) -> Result<Session, String> {
    validate_branch_name(&branch_name)?;

    let repo_path = {
        let guard = state.project_path.lock().map_err(|e| e.to_string())?;
        guard
            .clone()
            .ok_or_else(|| "No project is open".to_string())?
    };

    let wt_path = worktree::create_worktree(&repo_path, &branch_name)
        .map_err(|e| e.to_string())?;

    let now = now_unix();
    let session = Session {
        id: uuid::Uuid::new_v4().to_string(),
        branch_name,
        worktree_path: wt_path.to_string_lossy().to_string(),
        status: SessionStatus::Running,
        created_at: now,
        updated_at: now,
    };

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.create_session(&session).map_err(|e| e.to_string())?;
    }

    Ok(session)
}

#[tauri::command]
pub fn list_sessions(state: State<'_, AppState>) -> Result<Vec<SessionResponse>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let sessions = db.list_sessions().map_err(|e| e.to_string())?;
    let responses = sessions
        .into_iter()
        .map(|session| {
            let worktree_exists = std::path::Path::new(&session.worktree_path).exists();
            SessionResponse {
                session,
                worktree_exists,
            }
        })
        .collect();
    Ok(responses)
}

/// Return the inotify warning message recorded at startup, if any (Linux only).
#[tauri::command]
pub fn get_inotify_warning(state: State<'_, AppState>) -> Option<String> {
    state.inotify_warning.clone()
}

#[tauri::command]
pub fn update_session_status(
    session_id: String,
    status: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let session_status = SessionStatus::parse(&status).map_err(|e| e.to_string())?;
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_session_status(&session_id, session_status)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_session(
    session_id: String,
    delete_worktree: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let (worktree_path, branch_name) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        let session = db
            .get_session(&session_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Session not found: {}", session_id))?;
        (session.worktree_path, session.branch_name)
    };

    // Stop PTY processes and file watcher before removing from DB to prevent
    // leaked threads and watcher handles.
    if let Ok(mut pty) = state.pty_manager.lock() {
        let _ = pty.kill_session(&session_id);
    }
    if let Ok(mut watcher) = state.watcher_manager.lock() {
        let _ = watcher.stop_watching(&session_id);
    }

    if delete_worktree {
        let repo_path = {
            let guard = state.project_path.lock().map_err(|e| e.to_string())?;
            guard
                .clone()
                .ok_or_else(|| "No project is open".to_string())?
        };
        let wt = std::path::PathBuf::from(&worktree_path);
        git::worktree::remove_worktree(&repo_path, &wt, &branch_name, true)
            .map_err(|e| e.to_string())?;
    }

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_session(&session_id).map_err(|e| e.to_string())
}
