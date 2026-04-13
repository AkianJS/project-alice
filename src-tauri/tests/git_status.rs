mod helpers;
use helpers::TempGitRepo;
use project_alice_lib::git::status::{get_worktree_status, FileStatus};

#[test]
fn status_clean_repo() {
    let repo = TempGitRepo::new();
    let changes = get_worktree_status(&repo.path).unwrap();
    assert!(changes.is_empty(), "expected no changes in fresh repo, got: {:?}", changes);
}

#[test]
fn status_modified_file() {
    let repo = TempGitRepo::new();
    // The initial commit added .gitkeep; modify it.
    repo.write_file(".gitkeep", "modified content");
    let changes = get_worktree_status(&repo.path).unwrap();
    assert!(!changes.is_empty(), "expected changes after modifying .gitkeep");
    let modified = changes.iter().find(|c| c.path == ".gitkeep");
    assert!(modified.is_some(), "expected .gitkeep in changes; got: {:?}", changes);
    assert!(
        matches!(modified.unwrap().status, FileStatus::Modified),
        "expected Modified status, got: {:?}",
        modified.unwrap().status
    );
}

#[test]
fn status_new_untracked_file() {
    let repo = TempGitRepo::new();
    repo.write_file("new_file.txt", "hello");
    let changes = get_worktree_status(&repo.path).unwrap();
    let added = changes.iter().find(|c| c.path == "new_file.txt");
    assert!(added.is_some(), "expected new_file.txt in changes; got: {:?}", changes);
    assert!(
        matches!(added.unwrap().status, FileStatus::Added),
        "expected Added status, got: {:?}",
        added.unwrap().status
    );
}

#[test]
fn status_deleted_file() {
    let repo = TempGitRepo::new();
    // Delete the committed .gitkeep file.
    repo.delete_file(".gitkeep");
    let changes = get_worktree_status(&repo.path).unwrap();
    assert!(!changes.is_empty(), "expected changes after deleting .gitkeep");
    let deleted = changes.iter().find(|c| c.path == ".gitkeep");
    assert!(deleted.is_some(), "expected .gitkeep in changes; got: {:?}", changes);
    assert!(
        matches!(deleted.unwrap().status, FileStatus::Deleted),
        "expected Deleted status, got: {:?}",
        deleted.unwrap().status
    );
}

#[test]
fn status_alphabetical_order() {
    let repo = TempGitRepo::new();
    // Create files out of alphabetical order.
    repo.write_file("z_file.txt", "z");
    repo.write_file("a_file.txt", "a");
    repo.write_file("m_file.txt", "m");
    let changes = get_worktree_status(&repo.path).unwrap();
    // Filter to our test files only (ignore .gitkeep if unchanged).
    let test_files: Vec<&str> = changes
        .iter()
        .map(|c| c.path.as_str())
        .filter(|p| p.ends_with("_file.txt"))
        .collect();
    assert_eq!(test_files.len(), 3, "expected 3 test files; got: {:?}", test_files);
    assert_eq!(test_files[0], "a_file.txt");
    assert_eq!(test_files[1], "m_file.txt");
    assert_eq!(test_files[2], "z_file.txt");
}
