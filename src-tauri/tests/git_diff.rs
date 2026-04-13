mod helpers;
use helpers::TempGitRepo;
use project_alice_lib::git::diff::get_file_diff;

#[test]
fn diff_modified_tracked() {
    let repo = TempGitRepo::new();
    // .gitkeep was committed in initial commit; modify it.
    repo.write_file(".gitkeep", "new content after modification");
    let diff = get_file_diff(&repo.path, ".gitkeep").unwrap();
    assert!(!diff.is_empty(), "expected non-empty diff for modified file");
    assert!(
        diff.contains("@@") || diff.contains("+++") || diff.contains("---"),
        "expected unified diff markers; got: {}",
        &diff[..diff.len().min(300)]
    );
}

#[test]
fn diff_new_untracked() {
    let repo = TempGitRepo::new();
    repo.write_file("new_file.txt", "brand new file content");
    let diff = get_file_diff(&repo.path, "new_file.txt").unwrap();
    assert!(!diff.is_empty(), "expected non-empty diff for untracked file");
    assert!(
        diff.contains("new_file.txt") || diff.contains("+brand new file content") || diff.contains("@@"),
        "expected diff to reference the new file; got: {}",
        &diff[..diff.len().min(500)]
    );
}

#[test]
fn diff_unmodified() {
    let repo = TempGitRepo::new();
    // .gitkeep is committed and not changed.
    let diff = get_file_diff(&repo.path, ".gitkeep").unwrap();
    // An unmodified tracked file produces no diff output (empty string).
    // `git diff HEAD -- <file>` outputs nothing when file is unchanged.
    assert!(
        diff.is_empty() || !diff.contains("@@"),
        "expected empty or no-hunk diff for unmodified file; got: {}",
        &diff[..diff.len().min(300)]
    );
}
