use tauri::State;

use crate::git::repo::validate_repo;
use crate::state::AppState;

#[tauri::command]
pub fn validate_project(path: String) -> Result<String, String> {
    let canonical = validate_repo(&path).map_err(|e| e.to_string())?;
    Ok(canonical.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_project(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let canonical = validate_repo(&path).map_err(|e| e.to_string())?;
    let canonical_str = canonical.to_string_lossy().to_string();

    {
        let db = state.db.lock().map_err(|e| e.to_string())?;
        db.set_project(&canonical_str).map_err(|e| e.to_string())?;
    }

    {
        let mut project_path = state.project_path.lock().map_err(|e| e.to_string())?;
        *project_path = Some(canonical);
    }

    Ok(())
}

#[tauri::command]
pub fn get_last_project(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let project = db.get_last_project().map_err(|e| e.to_string())?;

    match project {
        None => Ok(None),
        Some(p) => match validate_repo(&p.path) {
            Ok(canonical) => Ok(Some(canonical.to_string_lossy().to_string())),
            Err(_) => Ok(None),
        },
    }
}
