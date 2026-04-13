pub mod handle;
pub mod platform;
pub mod reader;

use std::collections::HashMap;
use std::io::Write;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};

use crate::error::PtyError;

use self::handle::PtyHandle;
use self::reader::{spawn_reader_thread, PtyOutputEvent};

/// Central registry of all live PTY sessions.
///
/// One `PtyHandle` per terminal tab.  Keyed by `tab_id`.
pub struct PtyManager {
    handles: HashMap<String, PtyHandle>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            handles: HashMap::new(),
        }
    }

    /// Spawn a new PTY shell and start streaming its output to `output_channel`.
    ///
    /// # Arguments
    /// - `tab_id`       — unique ID for the terminal tab (must be unique across all open tabs)
    /// - `session_id`   — parent session ID (used by `kill_session`)
    /// - `cwd`          — working directory for the shell process
    /// - `cols` / `rows`— initial terminal dimensions
    /// - `output_channel` — Tauri IPC channel that receives `PtyOutputEvent` batches
    pub fn spawn(
        &mut self,
        tab_id: &str,
        session_id: &str,
        cwd: &Path,
        cols: u16,
        rows: u16,
        output_channel: tauri::ipc::Channel<PtyOutputEvent>,
    ) -> Result<(), PtyError> {
        let (shell_path, shell_args) = platform::detect_shell();
        let env_vars = platform::shell_environment();

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| PtyError::Open(e.to_string()))?;

        let mut cmd = CommandBuilder::new(&shell_path);
        cmd.args(&shell_args);
        cmd.cwd(cwd);
        for (k, v) in &env_vars {
            cmd.env(k, v);
        }

        // Spawn the shell inside the slave PTY.
        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| PtyError::Open(e.to_string()))?;

        // The slave end must be dropped after spawning so that EOF propagates
        // correctly when the child exits.
        drop(pair.slave);

        #[allow(unused_mut)]
        let mut writer = pair
            .master
            .take_writer()
            .map_err(|e| PtyError::Open(e.to_string()))?;

        // On Windows, configure the shell for UTF-8 output so that all
        // terminal content is decoded correctly on the frontend.
        #[cfg(windows)]
        {
            let shell_lower = shell_path.to_lowercase();
            if shell_lower.contains("powershell") || shell_lower.contains("pwsh") {
                // PowerShell: redirect chcp output and set encoding objects.
                let _ = writer.write_all(b"chcp 65001 | Out-Null\r\n");
                let _ = writer.write_all(
                    b"$OutputEncoding = [System.Text.Encoding]::UTF8\r\n",
                );
            } else {
                // cmd.exe: suppress chcp output with "> nul".
                let _ = writer.write_all(b"chcp 65001 > nul\r\n");
            }
        }

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| PtyError::Open(e.to_string()))?;

        let shutdown = Arc::new(AtomicBool::new(false));
        let reader_handle =
            spawn_reader_thread(tab_id.to_string(), reader, output_channel, Arc::clone(&shutdown));

        let handle = PtyHandle {
            master: pair.master,
            writer,
            child,
            reader_handle: Some(reader_handle),
            shutdown,
            session_id: session_id.to_string(),
        };

        self.handles.insert(tab_id.to_string(), handle);
        log::info!("Spawned PTY for tab {} (session {})", tab_id, session_id);
        Ok(())
    }

    /// Write raw bytes to the shell's stdin (e.g. key presses from the frontend).
    pub fn write(&mut self, tab_id: &str, data: &[u8]) -> Result<(), PtyError> {
        let handle = self
            .handles
            .get_mut(tab_id)
            .ok_or_else(|| PtyError::NotFound(tab_id.to_string()))?;

        handle
            .writer
            .write_all(data)
            .map_err(|e| PtyError::Write(e.to_string()))?;

        Ok(())
    }

    /// Notify the kernel of a terminal resize (SIGWINCH on Unix).
    pub fn resize(&mut self, tab_id: &str, cols: u16, rows: u16) -> Result<(), PtyError> {
        let handle = self
            .handles
            .get_mut(tab_id)
            .ok_or_else(|| PtyError::NotFound(tab_id.to_string()))?;

        handle
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| PtyError::Resize(e.to_string()))?;

        Ok(())
    }

    /// Kill the PTY session for a single tab.
    pub fn kill(&mut self, tab_id: &str) -> Result<(), PtyError> {
        let mut handle = self
            .handles
            .remove(tab_id)
            .ok_or_else(|| PtyError::NotFound(tab_id.to_string()))?;

        handle.shutdown.store(true, Ordering::Relaxed);

        // Best-effort child kill — ignore the result; the process may have
        // already exited.
        let _ = handle.child.kill();

        // Wait for the reader thread to finish, with a 2-second timeout so
        // that we never block the caller indefinitely.
        if let Some(reader_handle) = handle.reader_handle.take() {
            let (tx, rx) = std::sync::mpsc::channel::<()>();
            let tab_id_owned = tab_id.to_string();
            std::thread::spawn(move || {
                let _ = reader_handle.join();
                let _ = tx.send(());
            });
            match rx.recv_timeout(std::time::Duration::from_secs(2)) {
                Ok(_) => {}
                Err(_) => {
                    log::warn!(
                        "Reader thread for tab {} did not join within 2s",
                        tab_id_owned
                    );
                }
            }
        }

        log::info!("Killed PTY for tab {}", tab_id);
        Ok(())
    }

    /// Kill all PTY sessions that belong to `session_id`.
    pub fn kill_session(&mut self, session_id: &str) -> Result<(), PtyError> {
        let tab_ids: Vec<String> = self
            .handles
            .iter()
            .filter(|(_, h)| h.session_id == session_id)
            .map(|(id, _)| id.clone())
            .collect();

        for tab_id in tab_ids {
            self.kill(&tab_id)?;
        }

        Ok(())
    }

    /// Kill every PTY session managed by this instance.
    pub fn kill_all(&mut self) -> Result<(), PtyError> {
        let tab_ids: Vec<String> = self.handles.keys().cloned().collect();
        for tab_id in tab_ids {
            self.kill(&tab_id)?;
        }
        Ok(())
    }

    /// Returns `true` if the child process for `tab_id` is still running.
    pub fn is_alive(&mut self, tab_id: &str) -> bool {
        if let Some(handle) = self.handles.get_mut(tab_id) {
            // `try_wait` returns `Ok(None)` when still running.
            matches!(handle.child.try_wait(), Ok(None))
        } else {
            false
        }
    }

    /// Number of currently registered PTY sessions.
    pub fn active_count(&self) -> usize {
        self.handles.len()
    }
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}
