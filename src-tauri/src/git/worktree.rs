use std::fs;
use std::io::{self, BufRead};
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::error::GitError;
use crate::git::repo::branch_exists;

// ── Directory convention ─────────────────────────────────────────────────────

/// Sanitize a branch name to be safe as a filesystem directory component.
///
/// Rules:
/// - Replace `/` with `__`
/// - Remove characters invalid on common filesystems: `: * ? " < > |`
/// - Truncate to 100 characters
pub fn sanitize_branch_name(name: &str) -> String {
    const INVALID_CHARS: &[char] = &[':', '*', '?', '"', '<', '>', '|'];

    let replaced = name.replace('/', "__");
    let cleaned: String = replaced
        .chars()
        .filter(|c| !INVALID_CHARS.contains(c))
        .collect();

    if cleaned.len() > 100 {
        cleaned[..100].to_string()
    } else {
        cleaned
    }
}

/// Return the worktree directory for a branch inside a repository.
///
/// Path: `{repo_path}/.alice-worktrees/{sanitized_branch_name}/`
pub fn worktree_dir(repo_path: &Path, branch_name: &str) -> PathBuf {
    repo_path
        .join(".alice-worktrees")
        .join(sanitize_branch_name(branch_name))
}

/// Ensure `.alice-worktrees/` is listed in `.gitignore` at the repository root.
///
/// The entry is appended only when it is not already present.
pub fn ensure_gitignore_entry(repo_path: &Path) -> Result<(), GitError> {
    let gitignore_path = repo_path.join(".gitignore");

    const ENTRY: &str = ".alice-worktrees/";

    // Check if the entry already exists.
    if gitignore_path.exists() {
        let file = fs::File::open(&gitignore_path)
            .map_err(|e| GitError::Io(format!("open .gitignore: {}", e)))?;

        let already_present = io::BufReader::new(file)
            .lines()
            .any(|line| line.map(|l| l.trim() == ENTRY).unwrap_or(false));

        if already_present {
            return Ok(());
        }
    }

    // Append the entry.  Prepend a newline in case the file doesn't end with one.
    let content_to_append = format!("\n{}\n", ENTRY);
    fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&gitignore_path)
        .and_then(|mut f| {
            use std::io::Write;
            f.write_all(content_to_append.as_bytes())
        })
        .map_err(|e| GitError::Io(format!("write .gitignore: {}", e)))?;

    Ok(())
}

// ── create_worktree ──────────────────────────────────────────────────────────

/// Create a new local branch and a linked worktree for it.
///
/// Steps:
/// 1. Guard against an existing branch with the same name.
/// 2. Compute the worktree path.
/// 3. Guard against an existing worktree directory.
/// 4. `git branch {name}` — create the branch at HEAD.
/// 5. `git worktree add {path} {name}` — create the linked worktree.
/// 6. Ensure `.alice-worktrees/` is in `.gitignore`.
/// 7. Return the worktree path.
///
/// On failure after the branch was created, the branch is removed automatically.
pub fn create_worktree(repo_path: &Path, branch_name: &str) -> Result<PathBuf, GitError> {
    // 1. Duplicate-branch guard.
    if branch_exists(repo_path, branch_name)? {
        return Err(GitError::BranchExists(branch_name.to_string()));
    }

    // 2. Compute target path.
    let wt_path = worktree_dir(repo_path, branch_name);

    // 3. Duplicate-worktree guard.
    if wt_path.exists() {
        return Err(GitError::WorktreeOp(format!(
            "Worktree directory already exists: {}",
            wt_path.display()
        )));
    }

    // 4. Create the branch.
    run_git(repo_path, &["branch", branch_name])?;

    // 5. Create the linked worktree — roll back branch on error.
    let add_result = run_git(
        repo_path,
        &[
            "worktree",
            "add",
            &wt_path.to_string_lossy(),
            branch_name,
        ],
    );

    if let Err(e) = add_result {
        // Best-effort cleanup: delete the branch we just created.
        let _ = run_git(repo_path, &["branch", "-D", branch_name]);
        return Err(e);
    }

    // 6. Gitignore entry.
    ensure_gitignore_entry(repo_path)?;

    // 7. Return path.
    Ok(wt_path)
}

// ── remove_worktree ──────────────────────────────────────────────────────────

/// Remove a linked worktree and, optionally, delete the backing branch.
///
/// Both the worktree removal and branch deletion tolerate "not found" failures
/// so that partial-state cleanup is always attempted fully.
pub fn remove_worktree(
    repo_path: &Path,
    worktree_path: &Path,
    branch_name: &str,
    delete_branch: bool,
) -> Result<(), GitError> {
    // 1. Remove the worktree — ignore "not found" errors.
    let remove_result = run_git(
        repo_path,
        &[
            "worktree",
            "remove",
            "--force",
            &worktree_path.to_string_lossy(),
        ],
    );

    if let Err(e) = remove_result {
        // Only propagate the error if the worktree path actually exists
        // (i.e., it wasn't a "not found" situation).
        if worktree_path.exists() {
            return Err(e);
        }
    }

    // 2. Optionally delete the branch.
    if delete_branch {
        let branch_result = run_git(repo_path, &["branch", "-D", branch_name]);

        if let Err(e) = branch_result {
            // Ignore "branch not found" errors; propagate others.
            match &e {
                GitError::CommandFailed(msg) if msg.contains("not found") => {}
                _ => return Err(e),
            }
        }
    }

    Ok(())
}

// ── helpers ──────────────────────────────────────────────────────────────────

/// Run a git sub-command in `cwd`, capturing stderr for error messages.
fn run_git(cwd: &Path, args: &[&str]) -> Result<(), GitError> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| GitError::CommandFailed(format!("git {}: {}", args.join(" "), e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(GitError::CommandFailed(stderr));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn sanitize_slash_replaced_with_double_underscore() {
        assert_eq!(sanitize_branch_name("feature/auth"), "feature__auth");
    }

    #[test]
    fn sanitize_invalid_chars_stripped() {
        // Chars in INVALID_CHARS: : * ? " < > |
        assert_eq!(sanitize_branch_name("bad:name"), "badname");
        assert_eq!(sanitize_branch_name("bad*name"), "badname");
        assert_eq!(sanitize_branch_name("bad?name"), "badname");
    }

    #[test]
    fn sanitize_at_sign_kept() {
        // @ is NOT in INVALID_CHARS, so it passes through
        assert_eq!(sanitize_branch_name("hello@world"), "hello@world");
    }

    #[test]
    fn sanitize_truncated_to_100() {
        let long = "a".repeat(150);
        let result = sanitize_branch_name(&long);
        assert_eq!(result.len(), 100);
    }

    #[test]
    fn sanitize_empty_string() {
        assert_eq!(sanitize_branch_name(""), "");
    }

    #[test]
    fn sanitize_simple_name_unchanged() {
        assert_eq!(sanitize_branch_name("simple-name"), "simple-name");
    }

    #[test]
    fn worktree_dir_path_construction() {
        let repo = Path::new("/some/repo");
        let dir = worktree_dir(repo, "feature/auth");
        assert_eq!(dir, Path::new("/some/repo/.alice-worktrees/feature__auth"));
    }
}
