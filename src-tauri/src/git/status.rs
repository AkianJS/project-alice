use std::path::Path;

use git2::{Repository, Status, StatusOptions};
use serde::{Deserialize, Serialize};

use crate::error::GitError;

// ── Public types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChange {
    pub path: String,
    pub status: FileStatus,
    pub old_path: Option<String>,
}

// ── Paths to filter out ───────────────────────────────────────────────────────

const IGNORED_PREFIXES: &[&str] = &[
    ".alice-worktrees/",
    "node_modules/",
    "target/",
    ".git/",
];

fn is_ignored(path: &str) -> bool {
    IGNORED_PREFIXES.iter().any(|prefix| path.starts_with(prefix))
}

// ── get_worktree_status ───────────────────────────────────────────────────────

/// Return the list of changed files in a linked (or regular) worktree.
///
/// Uses `git2` to enumerate working-directory and index changes, maps each
/// entry's status flags to a [`FileChange`], filters noise paths, and returns
/// the result sorted alphabetically by path.
pub fn get_worktree_status(worktree_path: &Path) -> Result<Vec<FileChange>, GitError> {
    let repo = Repository::open(worktree_path)
        .map_err(|e| GitError::NotFound(format!("cannot open repo at {}: {}", worktree_path.display(), e)))?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| GitError::CommandFailed(format!("git status: {}", e)))?;

    let mut changes: Vec<FileChange> = statuses
        .iter()
        .filter_map(|entry| {
            let path = entry.path().unwrap_or_default().to_string();

            // Skip noise directories.
            if is_ignored(&path) {
                return None;
            }

            let flags = entry.status();

            // Renamed entries carry the old path in the diff delta.
            let (file_status, old_path) = classify_status(flags, &entry)?;

            Some(FileChange {
                path,
                status: file_status,
                old_path,
            })
        })
        .collect();

    changes.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(changes)
}

// ── Status classification ─────────────────────────────────────────────────────

/// Map a git2 `Status` bitmask to our simplified `FileStatus`.
///
/// Returns `None` when the entry is in a state we don't surface (e.g. ignored,
/// unmodified, or a submodule summary).
fn classify_status(
    flags: Status,
    entry: &git2::StatusEntry<'_>,
) -> Option<(FileStatus, Option<String>)> {
    // Index renames (staged).
    if flags.contains(Status::INDEX_RENAMED) {
        let old_path = entry
            .head_to_index()
            .and_then(|d| d.old_file().path())
            .map(|p| p.to_string_lossy().into_owned());
        return Some((FileStatus::Renamed, old_path));
    }

    // Working-tree renames (unstaged — git2 rarely reports these directly).
    if flags.contains(Status::WT_RENAMED) {
        let old_path = entry
            .index_to_workdir()
            .and_then(|d| d.old_file().path())
            .map(|p| p.to_string_lossy().into_owned());
        return Some((FileStatus::Renamed, old_path));
    }

    // Index changes.
    if flags.intersects(Status::INDEX_MODIFIED) {
        return Some((FileStatus::Modified, None));
    }
    if flags.intersects(Status::INDEX_NEW) {
        return Some((FileStatus::Added, None));
    }
    if flags.intersects(Status::INDEX_DELETED) {
        return Some((FileStatus::Deleted, None));
    }

    // Working-tree changes.
    if flags.intersects(Status::WT_MODIFIED) {
        return Some((FileStatus::Modified, None));
    }
    if flags.intersects(Status::WT_NEW) {
        return Some((FileStatus::Added, None));
    }
    if flags.intersects(Status::WT_DELETED) {
        return Some((FileStatus::Deleted, None));
    }

    None
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_ignored_dot_git_prefix() {
        assert!(is_ignored(".git/config"));
        assert!(is_ignored(".git/HEAD"));
    }

    #[test]
    fn is_ignored_node_modules_prefix() {
        assert!(is_ignored("node_modules/lodash/index.js"));
    }

    #[test]
    fn is_ignored_target_prefix() {
        assert!(is_ignored("target/debug/build/foo"));
    }

    #[test]
    fn is_ignored_alice_worktrees_prefix() {
        assert!(is_ignored(".alice-worktrees/my-branch/src/main.rs"));
    }

    #[test]
    fn is_ignored_normal_path_not_ignored() {
        assert!(!is_ignored("src/main.rs"));
        assert!(!is_ignored("Cargo.toml"));
        assert!(!is_ignored("README.md"));
    }

    #[test]
    fn is_ignored_partial_match_not_ignored() {
        // "target" without trailing slash should not match "target/" prefix
        assert!(!is_ignored("my_target/foo"));
        assert!(!is_ignored("not_node_modules/foo"));
    }
}
