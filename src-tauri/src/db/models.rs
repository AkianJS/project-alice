use rusqlite::Row;
use serde::{Deserialize, Serialize};

use crate::error::DbError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub path: String,
    pub opened_at: i64,
}

impl Project {
    pub fn from_row(row: &Row<'_>) -> Result<Self, DbError> {
        Ok(Project {
            id: row.get(0)?,
            path: row.get(1)?,
            opened_at: row.get(2)?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SessionStatus {
    Running,
    Stopped,
    Finished,
}

impl SessionStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            SessionStatus::Running => "running",
            SessionStatus::Stopped => "stopped",
            SessionStatus::Finished => "finished",
        }
    }

    pub fn parse(s: &str) -> Result<Self, DbError> {
        match s {
            "running" => Ok(SessionStatus::Running),
            "stopped" => Ok(SessionStatus::Stopped),
            "finished" => Ok(SessionStatus::Finished),
            other => Err(DbError::Other(format!("unknown session status: {}", other))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub branch_name: String,
    pub worktree_path: String,
    pub status: SessionStatus,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Session {
    pub fn from_row(row: &Row<'_>) -> Result<Self, DbError> {
        let status_str: String = row.get(3)?;
        Ok(Session {
            id: row.get(0)?,
            branch_name: row.get(1)?,
            worktree_path: row.get(2)?,
            status: SessionStatus::parse(&status_str)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_status_from_str_valid() {
        assert_eq!(SessionStatus::parse("running").unwrap(), SessionStatus::Running);
        assert_eq!(SessionStatus::parse("stopped").unwrap(), SessionStatus::Stopped);
        assert_eq!(SessionStatus::parse("finished").unwrap(), SessionStatus::Finished);
    }

    #[test]
    fn session_status_from_str_invalid() {
        assert!(SessionStatus::parse("invalid").is_err());
        assert!(SessionStatus::parse("").is_err());
        assert!(SessionStatus::parse("RUNNING").is_err());
    }

    #[test]
    fn session_status_as_str_round_trip() {
        for status in [SessionStatus::Running, SessionStatus::Stopped, SessionStatus::Finished] {
            let s = status.as_str();
            let back = SessionStatus::parse(s).unwrap();
            assert_eq!(back, status);
        }
    }

    #[test]
    fn session_status_serde_lowercase() {
        let running = SessionStatus::Running;
        let json = serde_json::to_string(&running).unwrap();
        assert_eq!(json, "\"running\"");

        let stopped = SessionStatus::Stopped;
        let json = serde_json::to_string(&stopped).unwrap();
        assert_eq!(json, "\"stopped\"");

        let finished = SessionStatus::Finished;
        let json = serde_json::to_string(&finished).unwrap();
        assert_eq!(json, "\"finished\"");
    }
}
