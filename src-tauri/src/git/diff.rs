use std::path::Path;
use std::process::Command;

use crate::error::GitError;

/// Return the unified diff for `file_path` relative to `worktree_path`.
///
/// For tracked/modified files: `git diff HEAD -- <relative_path>`
/// For untracked (new) files:  `git diff --no-index /dev/null <file_path>`
///
/// The caller is responsible for path-traversal validation before calling
/// this function (see [`crate::commands::changes::get_diff`]).
pub fn get_file_diff(worktree_path: &Path, file_path: &str) -> Result<String, GitError> {
    // Compute the relative path from the worktree root.
    let abs_file = worktree_path.join(file_path);

    // Check whether the file is tracked by git.
    let ls_files = Command::new("git")
        .args(["ls-files", "--error-unmatch", "--", file_path])
        .current_dir(worktree_path)
        .output()
        .map_err(|e| GitError::Io(format!("git ls-files: {}", e)))?;

    let is_tracked = ls_files.status.success();

    let output = if is_tracked {
        // Tracked file — diff against HEAD (includes staged + unstaged changes).
        Command::new("git")
            .args(["diff", "HEAD", "--", file_path])
            .current_dir(worktree_path)
            .output()
            .map_err(|e| GitError::Io(format!("git diff: {}", e)))?
    } else {
        // Untracked (new) file — diff against /dev/null.
        // On Windows /dev/null is not available, so we use git's NUL equivalent
        // by relying on `--no-index` with an empty source.
        #[cfg(not(target_os = "windows"))]
        let null_src = "/dev/null";

        #[cfg(target_os = "windows")]
        let null_src = "NUL";

        Command::new("git")
            .args(["diff", "--no-index", "--", null_src, &abs_file.to_string_lossy()])
            .current_dir(worktree_path)
            .output()
            .map_err(|e| GitError::Io(format!("git diff --no-index: {}", e)))?
    };

    // `git diff` exits with 1 when there are differences (which is the normal case).
    // Only treat higher exit codes as actual errors.
    let code = output.status.code().unwrap_or(0);
    if code > 1 {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(GitError::CommandFailed(format!(
            "git diff exited with code {}: {}",
            code, stderr
        )));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}
