pub const MIGRATIONS: &[&str] = &[
    // Migration 001: initial schema
    "CREATE TABLE IF NOT EXISTS _meta (
        version INTEGER NOT NULL,
        applied_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        opened_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        branch_name TEXT NOT NULL,
        worktree_path TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'stopped',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );",
];
