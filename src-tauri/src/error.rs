use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    DbError(#[from] DbError),

    #[error("Git error: {0}")]
    GitError(#[from] GitError),

    #[error("PTY error: {0}")]
    PtyError(#[from] PtyError),

    #[error("Watcher error: {0}")]
    WatcherError(#[from] WatcherError),
}

#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Rusqlite(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

impl Serialize for DbError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Error, Serialize)]
pub enum GitError {
    #[error("Repository not found: {0}")]
    NotFound(String),

    #[error("Branch already exists: {0}")]
    BranchExists(String),

    #[error("Worktree operation failed: {0}")]
    WorktreeOp(String),

    #[error("Command failed: {0}")]
    CommandFailed(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("Path traversal detected: {0}")]
    PathTraversal(String),
}

#[derive(Debug, Error, Serialize)]
pub enum PtyError {
    #[error("Failed to open PTY: {0}")]
    Open(String),

    #[error("PTY not found: {0}")]
    NotFound(String),

    #[error("Write failed: {0}")]
    Write(String),

    #[error("Resize failed: {0}")]
    Resize(String),
}

#[derive(Debug, Error, Serialize)]
pub enum WatcherError {
    #[error("Failed to start watcher: {0}")]
    Start(String),

    #[error("Watcher not found: {0}")]
    NotFound(String),

    #[error("IO error: {0}")]
    Io(String),
}

impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}

impl From<DbError> for String {
    fn from(e: DbError) -> Self {
        e.to_string()
    }
}

impl From<GitError> for String {
    fn from(e: GitError) -> Self {
        e.to_string()
    }
}

impl From<PtyError> for String {
    fn from(e: PtyError) -> Self {
        e.to_string()
    }
}

impl From<WatcherError> for String {
    fn from(e: WatcherError) -> Self {
        e.to_string()
    }
}
