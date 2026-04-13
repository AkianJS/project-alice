use std::path::{Path, PathBuf};

use git2::BranchType;

use crate::error::GitError;

pub fn validate_repo(path: &str) -> Result<PathBuf, GitError> {
    let repo = git2::Repository::open(path)
        .map_err(|_| GitError::NotFound(path.to_string()))?;

    let workdir = repo
        .workdir()
        .ok_or_else(|| GitError::NotFound(format!("{} is a bare repository", path)))?;

    let canonical = workdir
        .canonicalize()
        .map_err(|e| GitError::Io(e.to_string()))?;

    Ok(canonical)
}

/// Check whether a local branch with the given name exists in the repository.
pub fn branch_exists(repo_path: &Path, branch_name: &str) -> Result<bool, GitError> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| GitError::NotFound(e.to_string()))?;

    let result = match repo.find_branch(branch_name, BranchType::Local) {
        Ok(_) => Ok(true),
        Err(e) if e.code() == git2::ErrorCode::NotFound => Ok(false),
        Err(e) => Err(GitError::CommandFailed(e.to_string())),
    };
    result
}

/// Return the OID of the HEAD commit as a hex string.
pub fn get_head_commit(repo_path: &Path) -> Result<String, GitError> {
    let repo = git2::Repository::open(repo_path)
        .map_err(|e| GitError::NotFound(e.to_string()))?;

    let head = repo
        .head()
        .map_err(|e| GitError::CommandFailed(format!("HEAD not found: {}", e)))?;

    let oid = head
        .target()
        .ok_or_else(|| GitError::CommandFailed("HEAD is not a direct reference".to_string()))?;

    Ok(oid.to_string())
}
