use std::path::{Path, PathBuf};
use std::process::Command;
use tempfile::TempDir;

#[allow(dead_code)]
pub struct TempGitRepo {
    _dir: TempDir, // prevent early cleanup
    pub path: PathBuf,
}

#[allow(dead_code)]
impl TempGitRepo {
    pub fn new() -> Self {
        let dir = TempDir::new().expect("Failed to create temp dir");
        let path = dir.path().to_path_buf(); // do NOT canonicalize (Windows UNC issue)
        Self::run_git(&path, &["init"]);
        Self::run_git(&path, &["config", "user.email", "test@test.com"]);
        Self::run_git(&path, &["config", "user.name", "Test"]);
        // Create initial commit so HEAD exists
        let placeholder = path.join(".gitkeep");
        std::fs::write(&placeholder, "").unwrap();
        Self::run_git(&path, &["add", "."]);
        Self::run_git(&path, &["commit", "-m", "initial"]);
        Self { _dir: dir, path }
    }

    pub fn write_file(&self, name: &str, content: &str) {
        let file_path = self.path.join(name);
        if let Some(parent) = file_path.parent() {
            std::fs::create_dir_all(parent).unwrap();
        }
        std::fs::write(file_path, content).unwrap();
    }

    pub fn delete_file(&self, name: &str) {
        std::fs::remove_file(self.path.join(name)).unwrap();
    }

    pub fn stage_all(&self) {
        Self::run_git(&self.path, &["add", "-A"]);
    }

    pub fn commit(&self, msg: &str) {
        Self::run_git(&self.path, &["commit", "-m", msg]);
    }

    fn run_git(cwd: &Path, args: &[&str]) {
        let output = Command::new("git")
            .args(args)
            .current_dir(cwd)
            .output()
            .expect("Failed to run git");
        if !output.status.success() {
            panic!(
                "git {} failed: {}",
                args.join(" "),
                String::from_utf8_lossy(&output.stderr)
            );
        }
    }
}
