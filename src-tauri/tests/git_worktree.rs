mod helpers;
use helpers::TempGitRepo;
use project_alice_lib::git::worktree;

#[test]
fn ensure_gitignore_creates_file() {
    let repo = TempGitRepo::new();
    // No .gitignore exists after init (only .gitkeep in helper).
    let gitignore_path = repo.path.join(".gitignore");
    if gitignore_path.exists() {
        std::fs::remove_file(&gitignore_path).unwrap();
    }
    worktree::ensure_gitignore_entry(&repo.path).unwrap();
    assert!(gitignore_path.exists(), ".gitignore should have been created");
    let contents = std::fs::read_to_string(&gitignore_path).unwrap();
    assert!(
        contents.contains(".alice-worktrees/"),
        ".gitignore missing entry; contents: {}",
        contents
    );
}

#[test]
fn ensure_gitignore_appends() {
    let repo = TempGitRepo::new();
    let gitignore_path = repo.path.join(".gitignore");
    std::fs::write(&gitignore_path, "foo\n").unwrap();
    worktree::ensure_gitignore_entry(&repo.path).unwrap();
    let contents = std::fs::read_to_string(&gitignore_path).unwrap();
    assert!(contents.contains("foo"), "original entry missing");
    assert!(
        contents.contains(".alice-worktrees/"),
        ".alice-worktrees/ not appended"
    );
}

#[test]
fn ensure_gitignore_idempotent() {
    let repo = TempGitRepo::new();
    worktree::ensure_gitignore_entry(&repo.path).unwrap();
    worktree::ensure_gitignore_entry(&repo.path).unwrap(); // second call
    let contents = std::fs::read_to_string(repo.path.join(".gitignore")).unwrap();
    let count = contents.matches(".alice-worktrees/").count();
    assert_eq!(count, 1, "entry should appear exactly once, found {} times", count);
}

#[test]
fn create_worktree_happy_path() {
    let repo = TempGitRepo::new();
    let wt_path = worktree::create_worktree(&repo.path, "test-branch").unwrap();
    assert!(wt_path.exists(), "worktree dir should exist");
}

#[test]
fn create_worktree_duplicate_branch() {
    let repo = TempGitRepo::new();
    // Create worktree once (creates branch too).
    worktree::create_worktree(&repo.path, "dup-branch").unwrap();
    // Second attempt with same branch name should error.
    let result = worktree::create_worktree(&repo.path, "dup-branch");
    assert!(result.is_err(), "expected error for duplicate branch");
    let err_str = format!("{:?}", result.unwrap_err());
    assert!(
        err_str.contains("dup-branch"),
        "error should mention branch name: {}",
        err_str
    );
}

#[test]
fn create_worktree_slash_sanitized() {
    let repo = TempGitRepo::new();
    let wt_path = worktree::create_worktree(&repo.path, "feat/thing").unwrap();
    assert!(wt_path.exists(), "sanitized worktree dir should exist");
    let dir_name = wt_path.file_name().unwrap().to_string_lossy();
    assert_eq!(dir_name, "feat__thing", "slash should be sanitized to __");
}

#[test]
fn remove_worktree_deletes() {
    let repo = TempGitRepo::new();
    let wt_path = worktree::create_worktree(&repo.path, "rm-branch").unwrap();
    assert!(wt_path.exists(), "worktree should exist before removal");
    worktree::remove_worktree(&repo.path, &wt_path, "rm-branch", true).unwrap();
    assert!(!wt_path.exists(), "worktree dir should be gone after removal");
}

#[test]
fn remove_worktree_keeps_branch() {
    let repo = TempGitRepo::new();
    let wt_path = worktree::create_worktree(&repo.path, "keep-branch").unwrap();
    worktree::remove_worktree(&repo.path, &wt_path, "keep-branch", false).unwrap();
    assert!(!wt_path.exists(), "worktree dir should be gone");
    // Branch should still exist.
    let branch_exists = project_alice_lib::git::repo::branch_exists(&repo.path, "keep-branch").unwrap();
    assert!(branch_exists, "branch should still exist when delete_branch=false");
}
