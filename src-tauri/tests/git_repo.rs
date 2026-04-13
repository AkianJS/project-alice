mod helpers;
use helpers::TempGitRepo;
use project_alice_lib::git::repo;
use tempfile::TempDir;

fn detect_default_branch(path: &std::path::Path) -> String {
    let output = std::process::Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(path)
        .output()
        .expect("failed to run git rev-parse");
    String::from_utf8(output.stdout)
        .unwrap()
        .trim()
        .to_string()
}

#[test]
fn validate_repo_valid() {
    let repo = TempGitRepo::new();
    let result = repo::validate_repo(repo.path.to_str().unwrap());
    assert!(result.is_ok(), "expected Ok, got: {:?}", result);
}

#[test]
fn validate_repo_not_a_repo() {
    let dir = TempDir::new().unwrap();
    let path = dir.path().to_str().unwrap().to_string();
    let result = repo::validate_repo(&path);
    assert!(result.is_err(), "expected Err for non-repo dir");
}

#[test]
fn validate_repo_nonexistent() {
    let result = repo::validate_repo("/nonexistent/path/does/not/exist/xyz");
    assert!(result.is_err(), "expected Err for nonexistent path");
}

#[test]
fn branch_exists_default() {
    let git_repo = TempGitRepo::new();
    let default_branch = detect_default_branch(&git_repo.path);
    let result = repo::branch_exists(&git_repo.path, &default_branch);
    assert!(result.is_ok(), "branch_exists returned Err: {:?}", result);
    assert!(result.unwrap(), "expected default branch '{}' to exist", default_branch);
}

#[test]
fn branch_exists_missing() {
    let git_repo = TempGitRepo::new();
    let result = repo::branch_exists(&git_repo.path, "nonexistent-branch-xyz");
    assert!(result.is_ok(), "branch_exists returned Err: {:?}", result);
    assert!(!result.unwrap(), "expected nonexistent branch to return false");
}

#[test]
fn get_head_commit_valid() {
    let git_repo = TempGitRepo::new();
    let result = repo::get_head_commit(&git_repo.path);
    assert!(result.is_ok(), "get_head_commit returned Err: {:?}", result);
    let oid = result.unwrap();
    assert_eq!(oid.len(), 40, "expected 40-char hex, got: {}", oid);
    assert!(
        oid.chars().all(|c| c.is_ascii_hexdigit()),
        "OID is not all hex: {}",
        oid
    );
}
