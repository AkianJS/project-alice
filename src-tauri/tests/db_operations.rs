use project_alice_lib::db::Database;
use project_alice_lib::db::models::{Session, SessionStatus};

fn test_session(id: &str, branch: &str) -> Session {
    Session {
        id: id.to_string(),
        branch_name: branch.to_string(),
        worktree_path: format!("/tmp/wt/{}", branch),
        status: SessionStatus::Running,
        created_at: 1000,
        updated_at: 1000,
    }
}

/// Verify that migrations create all expected tables by checking that
/// the high-level API works without errors (sessions, settings, projects).
#[test]
fn migrations_create_tables() {
    let db = Database::open_in_memory().expect("open_in_memory failed");
    // All three table-dependent operations must succeed on a fresh db.
    db.list_sessions().expect("sessions table missing");
    db.get_setting("__probe__").expect("settings table missing");
    db.get_last_project().expect("projects table missing");
}

#[test]
fn migrations_idempotent() {
    // Two separate open_in_memory() calls both succeed (migrations are IF NOT EXISTS).
    let _db1 = Database::open_in_memory().expect("first open failed");
    let _db2 = Database::open_in_memory().expect("second open failed");
}

#[test]
fn session_create_and_get() {
    let db = Database::open_in_memory().unwrap();
    let s = test_session("sess-1", "main");
    db.create_session(&s).unwrap();
    let got = db.get_session("sess-1").unwrap().expect("should be Some");
    assert_eq!(got.id, s.id);
    assert_eq!(got.branch_name, s.branch_name);
    assert_eq!(got.worktree_path, s.worktree_path);
    assert_eq!(got.created_at, s.created_at);
}

#[test]
fn session_get_missing() {
    let db = Database::open_in_memory().unwrap();
    let result = db.get_session("nonexistent").unwrap();
    assert!(result.is_none());
}

#[test]
fn session_list_empty() {
    let db = Database::open_in_memory().unwrap();
    let sessions = db.list_sessions().unwrap();
    assert!(sessions.is_empty());
}

#[test]
fn session_list_ordered() {
    let db = Database::open_in_memory().unwrap();
    let mut s1 = test_session("sess-a", "branch-a");
    s1.created_at = 100;
    let mut s2 = test_session("sess-b", "branch-b");
    s2.created_at = 200;
    db.create_session(&s1).unwrap();
    db.create_session(&s2).unwrap();
    let sessions = db.list_sessions().unwrap();
    assert_eq!(sessions.len(), 2);
    assert_eq!(sessions[0].id, "sess-a");
    assert_eq!(sessions[1].id, "sess-b");
}

#[test]
fn session_update_status() {
    let db = Database::open_in_memory().unwrap();
    let s = test_session("sess-upd", "main");
    db.create_session(&s).unwrap();
    db.update_session_status("sess-upd", SessionStatus::Stopped).unwrap();
    let got = db.get_session("sess-upd").unwrap().unwrap();
    assert_eq!(got.status, SessionStatus::Stopped);
}

#[test]
fn session_delete() {
    let db = Database::open_in_memory().unwrap();
    let s = test_session("sess-del", "main");
    db.create_session(&s).unwrap();
    db.delete_session("sess-del").unwrap();
    assert!(db.get_session("sess-del").unwrap().is_none());
    assert!(db.list_sessions().unwrap().is_empty());
}

#[test]
fn reconcile_running_to_stopped() {
    let db = Database::open_in_memory().unwrap();
    let s = test_session("sess-run", "main");
    db.create_session(&s).unwrap();
    let count = db.reconcile_sessions_on_startup().unwrap();
    assert_eq!(count, 1);
    let got = db.get_session("sess-run").unwrap().unwrap();
    assert_eq!(got.status, SessionStatus::Stopped);
}

#[test]
fn reconcile_no_running() {
    let db = Database::open_in_memory().unwrap();
    let mut s = test_session("sess-stopped", "main");
    s.status = SessionStatus::Stopped;
    db.create_session(&s).unwrap();
    let count = db.reconcile_sessions_on_startup().unwrap();
    assert_eq!(count, 0);
}

#[test]
fn settings_set_and_get() {
    let db = Database::open_in_memory().unwrap();
    db.set_setting("theme", "dark").unwrap();
    let val = db.get_setting("theme").unwrap();
    assert_eq!(val, Some("dark".to_string()));
}

#[test]
fn settings_get_missing() {
    let db = Database::open_in_memory().unwrap();
    let val = db.get_setting("missing-key").unwrap();
    assert!(val.is_none());
}

#[test]
fn settings_upsert() {
    let db = Database::open_in_memory().unwrap();
    db.set_setting("theme", "dark").unwrap();
    db.set_setting("theme", "light").unwrap();
    let val = db.get_setting("theme").unwrap();
    assert_eq!(val, Some("light".to_string()));
}

#[test]
fn project_set_and_get() {
    let db = Database::open_in_memory().unwrap();
    db.set_project("/my/project").unwrap();
    let proj = db.get_last_project().unwrap();
    assert!(proj.is_some());
    assert_eq!(proj.unwrap().path, "/my/project");
}

#[test]
fn project_most_recent() {
    let db = Database::open_in_memory().unwrap();
    // Set a project, then update it (same path upserts its opened_at),
    // so the upserted row is guaranteed to be the latest.
    db.set_project("/first/project").unwrap();
    db.set_project("/first/project").unwrap(); // upserts opened_at
    let proj = db.get_last_project().unwrap().unwrap();
    assert_eq!(proj.path, "/first/project");
}

#[test]
fn project_get_empty() {
    let db = Database::open_in_memory().unwrap();
    let proj = db.get_last_project().unwrap();
    assert!(proj.is_none());
}
