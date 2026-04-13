use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;
use std::time::Instant;

/// Payload emitted on the Tauri IPC channel for every batch of PTY output.
#[derive(Clone, serde::Serialize)]
pub struct PtyOutputEvent {
    pub tab_id: String,
    pub data: Vec<u8>,
}

const FLUSH_BYTES: usize = 8192; // flush when accumulator reaches 8 KB
const FLUSH_MS: u128 = 16; // flush at most every 16 ms

/// Spawns a dedicated OS thread that reads raw bytes from `reader`, batches
/// them, and forwards each batch to the frontend via `channel`.
///
/// The thread exits when:
/// - `shutdown` is set to `true` (by the kill path), or
/// - `reader.read()` returns `Ok(0)` (EOF — the shell exited), or
/// - `reader.read()` returns an `Err`.
pub fn spawn_reader_thread(
    tab_id: String,
    mut reader: Box<dyn Read + Send>,
    channel: tauri::ipc::Channel<PtyOutputEvent>,
    shutdown: Arc<AtomicBool>,
) -> JoinHandle<()> {
    std::thread::spawn(move || {
        let tab_id_panic = tab_id.clone();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let mut accumulator: Vec<u8> = Vec::with_capacity(FLUSH_BYTES * 2);
            let mut read_buf = [0u8; 4096];
            let mut last_flush = Instant::now();

            loop {
                if shutdown.load(Ordering::Relaxed) {
                    break;
                }

                match reader.read(&mut read_buf) {
                    Ok(0) => {
                        // EOF — shell has exited
                        break;
                    }
                    Ok(n) => {
                        accumulator.extend_from_slice(&read_buf[..n]);

                        let should_flush = accumulator.len() >= FLUSH_BYTES
                            || last_flush.elapsed().as_millis() >= FLUSH_MS;

                        if should_flush && !accumulator.is_empty() {
                            let payload = PtyOutputEvent {
                                tab_id: tab_id.clone(),
                                data: accumulator.split_off(0),
                            };
                            let _ = channel.send(payload);
                            last_flush = Instant::now();
                        }
                    }
                    Err(e) => {
                        use std::io::ErrorKind;
                        match e.kind() {
                            ErrorKind::WouldBlock | ErrorKind::TimedOut => {
                                if !accumulator.is_empty()
                                    && last_flush.elapsed().as_millis() >= FLUSH_MS
                                {
                                    let payload = PtyOutputEvent {
                                        tab_id: tab_id.clone(),
                                        data: accumulator.split_off(0),
                                    };
                                    let _ = channel.send(payload);
                                    last_flush = Instant::now();
                                }
                                continue;
                            }
                            ErrorKind::Interrupted => continue,
                            _ => {
                                log::warn!("PTY reader error for tab {}: {}", tab_id, e);
                                break;
                            }
                        }
                    }
                }
            }

            // Flush any remaining bytes before the thread exits.
            if !accumulator.is_empty() {
                let payload = PtyOutputEvent {
                    tab_id: tab_id.clone(),
                    data: accumulator,
                };
                let _ = channel.send(payload);
            }

            log::debug!("PTY reader thread exiting for tab {}", tab_id);
        }));

        if let Err(panic_info) = result {
            let msg = if let Some(s) = panic_info.downcast_ref::<&str>() {
                s.to_string()
            } else if let Some(s) = panic_info.downcast_ref::<String>() {
                s.clone()
            } else {
                "unknown panic".to_string()
            };
            log::error!("PTY reader thread panicked for tab {}: {}", tab_id_panic, msg);
        }
    })
}
