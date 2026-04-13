pub mod debounce;

use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};

use crate::error::WatcherError;

use self::debounce::{debounce_loop, WatcherEvent};

// ── Internal state ────────────────────────────────────────────────────────────

struct ActiveWatcher {
    /// Holds the watcher alive; dropping it closes the mpsc sender which
    /// causes the debounce loop to exit on the Disconnected arm.
    _watcher: RecommendedWatcher,
    debounce_handle: JoinHandle<()>,
    shutdown: Arc<AtomicBool>,
}

// ── WatcherManager ────────────────────────────────────────────────────────────

/// Central registry of all active filesystem watchers.
///
/// One watcher per worktree session.  Thread-safe to own behind a `Mutex`.
pub struct WatcherManager {
    watchers: HashMap<String, ActiveWatcher>,
}

impl WatcherManager {
    pub fn new() -> Self {
        Self {
            watchers: HashMap::new(),
        }
    }

    /// Start watching `worktree_path` for filesystem changes.
    ///
    /// Each quiet period of 300 ms will trigger a git status scan and push the
    /// result to `channel`.  Calling this with the same `session_id` while a
    /// watcher is already active is a no-op (returns `Ok`).
    pub fn start_watching(
        &mut self,
        session_id: &str,
        worktree_path: &Path,
        channel: tauri::ipc::Channel<WatcherEvent>,
    ) -> Result<(), WatcherError> {
        if self.watchers.contains_key(session_id) {
            log::debug!("Watcher already active for session {}", session_id);
            return Ok(());
        }

        // mpsc channel: notify → debounce thread
        let (tx, rx) = std::sync::mpsc::channel();

        // Build the notify watcher.
        let mut watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default(),
        )
        .map_err(|e| WatcherError::Start(e.to_string()))?;

        watcher
            .watch(worktree_path, RecursiveMode::Recursive)
            .map_err(|e| WatcherError::Start(e.to_string()))?;

        let shutdown = Arc::new(AtomicBool::new(false));
        let shutdown_clone = Arc::clone(&shutdown);
        let path_owned = worktree_path.to_path_buf();
        let sid = session_id.to_string();

        let debounce_handle = std::thread::spawn(move || {
            debounce_loop(sid, path_owned, rx, channel, shutdown_clone);
        });

        self.watchers.insert(
            session_id.to_string(),
            ActiveWatcher {
                _watcher: watcher,
                debounce_handle,
                shutdown,
            },
        );

        log::info!("Started watcher for session {} at {}", session_id, worktree_path.display());
        Ok(())
    }

    /// Stop watching for `session_id`.
    ///
    /// Sets the shutdown flag, drops the notify watcher (which disconnects the
    /// mpsc sender), and joins the debounce thread.
    pub fn stop_watching(&mut self, session_id: &str) -> Result<(), WatcherError> {
        let active = self
            .watchers
            .remove(session_id)
            .ok_or_else(|| WatcherError::NotFound(session_id.to_string()))?;

        // Signal the debounce loop to exit.
        active.shutdown.store(true, Ordering::Relaxed);

        // _watcher is dropped here, disconnecting the mpsc sender so the
        // debounce loop receives Disconnected and exits even without the flag.

        // Join — best effort with a 2-second deadline.
        let sid = session_id.to_string();
        let (done_tx, done_rx) = std::sync::mpsc::channel::<()>();
        std::thread::spawn(move || {
            let _ = active.debounce_handle.join();
            let _ = done_tx.send(());
        });
        match done_rx.recv_timeout(std::time::Duration::from_secs(2)) {
            Ok(_) => {}
            Err(_) => {
                log::warn!("Debounce thread for session {} did not join within 2 s", sid);
            }
        }

        log::info!("Stopped watcher for session {}", sid);
        Ok(())
    }

    /// Stop all active watchers.
    pub fn stop_all(&mut self) -> Result<(), WatcherError> {
        let session_ids: Vec<String> = self.watchers.keys().cloned().collect();
        for sid in session_ids {
            // Ignore NotFound — can't happen since we got the key from the map.
            let _ = self.stop_watching(&sid);
        }
        Ok(())
    }
}

impl Default for WatcherManager {
    fn default() -> Self {
        Self::new()
    }
}

// ── inotify limit check ───────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
pub fn check_inotify_limit() -> Option<String> {
    use std::fs;

    let content = fs::read_to_string("/proc/sys/fs/inotify/max_user_watches").ok()?;
    let limit: u64 = content.trim().parse().ok()?;

    if limit < 65_536 {
        Some(format!(
            "inotify max_user_watches is {} (< 65536). File watching may fail in large repos. \
             Run: echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p",
            limit
        ))
    } else {
        None
    }
}

#[cfg(not(target_os = "linux"))]
pub fn check_inotify_limit() -> Option<String> {
    None
}
