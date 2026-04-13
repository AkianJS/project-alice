/// Detects the preferred shell on the current platform.
/// Returns `(shell_path, args)`.
///
/// On macOS/Linux we read `$SHELL` (defaulting to `/bin/sh`) and add
/// `--login` for zsh and bash so that `.zprofile` / `.bash_profile` are
/// sourced and PATH is set up correctly.
#[cfg(unix)]
pub fn detect_shell() -> (String, Vec<String>) {
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());

    let args = if shell.ends_with("zsh") || shell.ends_with("bash") {
        vec!["--login".to_string()]
    } else {
        vec![]
    };

    (shell, args)
}

/// Detects the preferred shell on Windows.
///
/// ConPTY is available on Windows 10 build 18362+ and Windows Server 2019+.
/// The `portable-pty` crate uses ConPTY automatically. If ConPTY is
/// unavailable the PTY spawn will fail with a clear error message.
/// Probes `pwsh.exe`, then `powershell.exe`, then `%COMSPEC%`, then `cmd.exe`.
#[cfg(windows)]
pub fn detect_shell() -> (String, Vec<String>) {
    for candidate in &["pwsh.exe", "powershell.exe"] {
        if std::process::Command::new(candidate)
            .arg("--version")
            .output()
            .is_ok()
        {
            return (candidate.to_string(), vec![]);
        }
    }

    if let Ok(comspec) = std::env::var("COMSPEC") {
        if !comspec.is_empty() {
            return (comspec, vec![]);
        }
    }

    ("cmd.exe".to_string(), vec![])
}

/// Returns environment variables that should be set for the PTY session.
///
/// On Unix we set `TERM=xterm-256color` so that terminal-aware applications
/// (editors, pagers, etc.) work correctly.
#[cfg(unix)]
pub fn shell_environment() -> Vec<(String, String)> {
    vec![("TERM".to_string(), "xterm-256color".to_string())]
}

#[cfg(windows)]
pub fn shell_environment() -> Vec<(String, String)> {
    vec![]
}
