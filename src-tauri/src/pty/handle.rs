use std::io::Write;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::thread::JoinHandle;

use portable_pty::MasterPty;

/// Owns all resources for a single running PTY session (one terminal tab).
///
/// `master` is kept alive so that `resize` operations can be issued after
/// the slave has been dropped and the shell has started.
pub struct PtyHandle {
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
    pub child: Box<dyn portable_pty::Child + Send>,
    pub reader_handle: Option<JoinHandle<()>>,
    pub shutdown: Arc<AtomicBool>,
    pub session_id: String,
}
