use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;

use crate::git::status::{get_worktree_status, FileChange};

/// Event sent over the Tauri IPC channel for every debounced filesystem quiet period.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WatcherEvent {
    pub session_id: String,
    pub changes: Vec<FileChange>,
}

/// Returns `true` when all paths in the event belong to directories we never
/// want to trigger a rescan for (.git/, node_modules/, target/, dist/,
/// .alice-worktrees/).
pub(crate) fn is_noise_event(event: &notify::Event) -> bool {
    event.paths.iter().all(|p| {
        let s = p.to_string_lossy();
        s.contains("/.git/")
            || s.contains("\\.git\\")
            || s.contains("/node_modules/")
            || s.contains("\\node_modules\\")
            || s.contains("/target/")
            || s.contains("\\target\\")
            || s.contains("/dist/")
            || s.contains("\\dist\\")
            || s.contains("/.alice-worktrees/")
            || s.contains("\\.alice-worktrees\\")
    })
}

/// Runs on a dedicated OS thread.
///
/// Drains `rx` until a 300 ms quiet period elapses, then calls
/// [`get_worktree_status`] and pushes the result to `channel`.
/// Exits when `shutdown` is set or the sender side of `rx` is dropped.
pub fn debounce_loop(
    session_id: String,
    worktree_path: PathBuf,
    rx: std::sync::mpsc::Receiver<notify::Result<notify::Event>>,
    channel: tauri::ipc::Channel<WatcherEvent>,
    shutdown: Arc<AtomicBool>,
) {
    const QUIET_MS: Duration = Duration::from_millis(300);

    // Whether we received at least one event and need to re-scan.
    let mut pending = false;

    loop {
        if shutdown.load(Ordering::Relaxed) {
            break;
        }

        match rx.recv_timeout(QUIET_MS) {
            Ok(Ok(event)) => {
                // Skip events from paths we never want to trigger a rescan.
                if is_noise_event(&event) {
                    continue;
                }
                // Event received — mark pending and keep draining (the
                // timeout reset happens naturally on the next iteration).
                pending = true;
            }
            Ok(Err(e)) => {
                log::warn!("Watcher error for session {}: {}", session_id, e);
                // Don't set pending — the error isn't actionable.
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                // Quiet period elapsed — emit status if there was activity.
                if pending {
                    pending = false;
                    match get_worktree_status(&worktree_path) {
                        Ok(changes) => {
                            let event = WatcherEvent {
                                session_id: session_id.clone(),
                                changes,
                            };
                            let _ = channel.send(event);
                        }
                        Err(e) => {
                            log::warn!(
                                "Failed to get worktree status for {}: {}",
                                worktree_path.display(),
                                e
                            );
                        }
                    }
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                // The notify watcher was dropped — time to exit.
                log::debug!("Debounce loop exiting (rx disconnected) for session {}", session_id);
                break;
            }
        }
    }

    log::debug!("Debounce loop exited for session {}", session_id);
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn make_event(paths: Vec<&str>) -> notify::Event {
        notify::Event {
            kind: notify::EventKind::Modify(notify::event::ModifyKind::Any),
            paths: paths.into_iter().map(PathBuf::from).collect(),
            attrs: Default::default(),
        }
    }

    #[test]
    fn noise_event_git_path() {
        let event = make_event(vec!["/repo/.git/index"]);
        assert!(is_noise_event(&event));
    }

    #[test]
    fn noise_event_node_modules_path() {
        let event = make_event(vec!["/repo/node_modules/lodash/index.js"]);
        assert!(is_noise_event(&event));
    }

    #[test]
    fn noise_event_target_path() {
        let event = make_event(vec!["/repo/target/debug/foo"]);
        assert!(is_noise_event(&event));
    }

    #[test]
    fn noise_event_dist_path() {
        let event = make_event(vec!["/repo/dist/bundle.js"]);
        assert!(is_noise_event(&event));
    }

    #[test]
    fn noise_event_alice_worktrees_path() {
        let event = make_event(vec!["/repo/.alice-worktrees/branch/src/main.rs"]);
        assert!(is_noise_event(&event));
    }

    #[test]
    fn noise_event_normal_source_file_is_not_noise() {
        let event = make_event(vec!["/repo/src/main.rs"]);
        assert!(!is_noise_event(&event));
    }

    #[test]
    fn noise_event_mixed_paths_is_not_noise() {
        // One noise path + one real path → NOT all noise → returns false
        let event = make_event(vec!["/repo/.git/index", "/repo/src/main.rs"]);
        assert!(!is_noise_event(&event));
    }
}
