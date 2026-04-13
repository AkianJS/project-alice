pub mod migrations;
pub mod models;

use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};

use crate::error::DbError;
use migrations::MIGRATIONS;
use models::{Project, Session, SessionStatus};

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn open_in_memory() -> Result<Self, DbError> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Database { conn };
        db.run_migrations()?;
        Ok(db)
    }

    pub fn open(path: PathBuf) -> Result<Self, DbError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&path)?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

        let db = Database { conn };
        db.run_migrations()?;

        Ok(db)
    }

    fn run_migrations(&self) -> Result<(), DbError> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS _meta (
                version INTEGER NOT NULL,
                applied_at INTEGER NOT NULL
            );",
        )?;

        let applied_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM _meta",
            [],
            |row| row.get(0),
        )?;

        let applied = applied_count as usize;

        for (i, migration_sql) in MIGRATIONS.iter().enumerate() {
            let version = i + 1;
            if version <= applied {
                continue;
            }

            let now = now_unix();
            self.conn.execute_batch(migration_sql)?;
            self.conn.execute(
                "INSERT INTO _meta (version, applied_at) VALUES (?1, ?2)",
                params![version as i64, now],
            )?;
        }

        Ok(())
    }

    pub fn get_last_project(&self) -> Result<Option<Project>, DbError> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, path, opened_at FROM projects ORDER BY opened_at DESC LIMIT 1")?;

        let mut rows = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                path: row.get(1)?,
                opened_at: row.get(2)?,
            })
        })?;

        match rows.next() {
            Some(r) => Ok(Some(r?)),
            None => Ok(None),
        }
    }

    pub fn set_project(&self, path: &str) -> Result<(), DbError> {
        let now = now_unix();
        self.conn.execute(
            "INSERT OR REPLACE INTO projects (path, opened_at) VALUES (?1, ?2)",
            params![path, now],
        )?;
        Ok(())
    }

    pub fn create_session(&self, session: &Session) -> Result<(), DbError> {
        self.conn.execute(
            "INSERT INTO sessions (id, branch_name, worktree_path, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                session.id,
                session.branch_name,
                session.worktree_path,
                session.status.as_str(),
                session.created_at,
                session.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn list_sessions(&self) -> Result<Vec<Session>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, branch_name, worktree_path, status, created_at, updated_at
             FROM sessions
             ORDER BY created_at ASC",
        )?;

        let rows = stmt.query_map([], |row| {
            let status_str: String = row.get(3)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                status_str,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })?;

        let mut sessions = Vec::new();
        for row in rows {
            let (id, branch_name, worktree_path, status_str, created_at, updated_at) = row?;
            sessions.push(Session {
                id,
                branch_name,
                worktree_path,
                status: SessionStatus::parse(&status_str)?,
                created_at,
                updated_at,
            });
        }
        Ok(sessions)
    }

    pub fn get_session(&self, id: &str) -> Result<Option<Session>, DbError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, branch_name, worktree_path, status, created_at, updated_at
             FROM sessions WHERE id = ?1",
        )?;

        let mut rows = stmt.query_map(params![id], |row| {
            let status_str: String = row.get(3)?;
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                status_str,
                row.get::<_, i64>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })?;

        match rows.next() {
            Some(r) => {
                let (id, branch_name, worktree_path, status_str, created_at, updated_at) = r?;
                Ok(Some(Session {
                    id,
                    branch_name,
                    worktree_path,
                    status: SessionStatus::parse(&status_str)?,
                    created_at,
                    updated_at,
                }))
            }
            None => Ok(None),
        }
    }

    pub fn update_session_status(&self, id: &str, status: SessionStatus) -> Result<(), DbError> {
        let now = now_unix();
        self.conn.execute(
            "UPDATE sessions SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status.as_str(), now, id],
        )?;
        Ok(())
    }

    pub fn delete_session(&self, id: &str) -> Result<(), DbError> {
        self.conn
            .execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn reconcile_sessions_on_startup(&self) -> Result<u64, DbError> {
        let count = self.conn.execute(
            "UPDATE sessions SET status = 'stopped', updated_at = ?1 WHERE status = 'running'",
            params![now_unix()],
        )?;
        Ok(count as u64)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, DbError> {
        let mut stmt = self
            .conn
            .prepare("SELECT value FROM settings WHERE key = ?1")?;

        let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;

        match rows.next() {
            Some(r) => Ok(Some(r?)),
            None => Ok(None),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), DbError> {
        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
