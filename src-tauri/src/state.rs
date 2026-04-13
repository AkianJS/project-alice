use std::path::PathBuf;
use std::sync::Mutex;

use crate::db::Database;
use crate::pty::PtyManager;
use crate::watcher::WatcherManager;

pub struct AppState {
    pub db: Mutex<Database>,
    pub project_path: Mutex<Option<PathBuf>>,
    pub pty_manager: Mutex<PtyManager>,
    pub watcher_manager: Mutex<WatcherManager>,
    /// Set at startup on Linux when `inotify max_user_watches` is too low.
    pub inotify_warning: Option<String>,
}

impl AppState {
    pub fn new(
        db: Database,
        pty_manager: PtyManager,
        watcher_manager: WatcherManager,
        inotify_warning: Option<String>,
    ) -> Self {
        Self {
            db: Mutex::new(db),
            project_path: Mutex::new(None),
            pty_manager: Mutex::new(pty_manager),
            watcher_manager: Mutex::new(watcher_manager),
            inotify_warning,
        }
    }
}
