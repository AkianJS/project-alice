pub mod commands;
pub mod db;
pub mod error;
pub mod git;
pub mod pty;
pub mod state;
pub mod watcher;

use commands::changes::{get_changes, get_diff, start_watching, stop_watching};
use commands::project::{get_last_project, open_project, validate_project};
use commands::pty::{close_pty, open_pty, resize_pty, write_pty};
use commands::session::{
    create_session, delete_session, get_inotify_warning, list_sessions, update_session_status,
};
use commands::settings::{get_setting, set_setting};
use db::Database;
use pty::PtyManager;
use state::AppState;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::{Emitter, Manager};
use watcher::WatcherManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = data_dir.join("alice.db");
            let db = Database::open(db_path).map_err(|e| e.to_string())?;
            let count = db
                .reconcile_sessions_on_startup()
                .map_err(|e| e.to_string())?;
            if count > 0 {
                log::info!("Reconciled {} sessions from running to stopped", count);
            }

            // Check inotify limits on Linux; store warning in AppState so the
            // frontend can surface it via the `get_inotify_warning` command.
            let inotify_warning = watcher::check_inotify_limit();
            if let Some(ref warning) = inotify_warning {
                log::warn!("{}", warning);
            }

            // Build the application menu (File → Open Project).
            let open_project_item =
                MenuItem::with_id(app, "open-project", "Open Project", true, None::<&str>)?;
            let file_menu = Submenu::with_items(app, "File", true, &[&open_project_item])?;
            let menu = Menu::with_items(app, &[&file_menu])?;
            app.set_menu(menu)?;

            // Forward menu events to the frontend as Tauri events.
            app.on_menu_event(|app, event| {
                if event.id() == "open-project" {
                    let _ = app.emit("menu-open-project", ());
                }
            });

            let pty_manager = PtyManager::new();
            let watcher_manager = WatcherManager::new();
            app.manage(AppState::new(db, pty_manager, watcher_manager, inotify_warning));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app = window.app_handle();
                let state = app.state::<AppState>();
                if let Ok(mut pty) = state.pty_manager.lock() {
                    let _ = pty.kill_all();
                };
                if let Ok(mut watcher) = state.watcher_manager.lock() {
                    let _ = watcher.stop_all();
                };
            }
        })
        .invoke_handler(tauri::generate_handler![
            validate_project,
            open_project,
            get_last_project,
            get_setting,
            set_setting,
            create_session,
            list_sessions,
            update_session_status,
            delete_session,
            get_inotify_warning,
            open_pty,
            write_pty,
            resize_pty,
            close_pty,
            get_changes,
            get_diff,
            start_watching,
            stop_watching,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
