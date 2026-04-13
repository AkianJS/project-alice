# Project Alice — Product Requirements Document

**Version:** 1.0.0
**Date:** 2026-04-12
**Status:** Draft

---

## 1. Overview

Project Alice is a cross-platform desktop application that provides developers with a mission control interface for running AI coding agents (Claude Code, Codex, Aider, etc.) in isolated git worktrees. It enables parallel development workflows by letting users spawn multiple agents across separate branches simultaneously, each working in its own worktree without conflicts.

### 1.1 Problem Statement

Developers using AI coding agents face friction when trying to run multiple agents in parallel:

- Manually creating and managing git worktrees is tedious and error-prone.
- Switching between terminals to monitor different agents breaks focus.
- Tracking what each agent has changed across branches requires constant context switching.
- There is no unified interface to manage agent sessions, view live changes, and coordinate parallel workstreams.

### 1.2 Solution

A three-panel desktop application that automates worktree lifecycle management, embeds interactive terminals for running any CLI-based coding agent, and provides real-time diff visualization — all in a single window per project.

### 1.3 Target Users

Software engineers, developers, and technical leads who use CLI-based AI coding agents and want to parallelize their development workflow across multiple branches.

---

## 2. Core Concepts

### 2.1 Session

A session represents one isolated workstream. Each session is tied to:

- A **branch** (created from the current HEAD or a specified base).
- A **git worktree** (created automatically in a managed directory).
- One or more **terminal tabs** (all sharing the same worktree path as their working directory).
- A **status**: `running`, `stopped`, or `finished`.

Sessions persist across application restarts.

### 2.2 Project

A project is a single git repository. The user selects a git repository folder when launching the app. Each app instance is bound to one project. To work on a different repository, the user opens a new instance of the application.

---

## 3. User Interface

### 3.1 Layout

```
┌──────────────┬────────────────────────────────┬──────────────────┐
│              │                                │                  │
│   Sessions   │         Terminal Area          │    Worktree      │
│    Panel     │                                │    Changes       │
│              │  ┌─ tab1 ─┬─ tab2 ─┬─ + ─┐   │    Panel         │
│  ● feat/auth │  │                        │   │                  │
│    fix/login │  │  $ claude                   │  M src/auth.ts   │
│    refactor  │  │  > Analyzing codebase...    │  A src/guard.ts  │
│              │  │  > Creating files...        │  M package.json  │
│              │  │                        │   │                  │
│              │  │                        │   │  ┌────────────┐  │
│  [+ New]     │  └────────────────────────┘   │  │ Diff View  │  │
│              │                                │  └────────────┘  │
└──────────────┴────────────────────────────────┴──────────────────┘
```

### 3.2 Sessions Panel (Left)

- Displays a list of all sessions, each showing:
  - Branch name.
  - Session status indicator (running / stopped / finished).
- **"+ New Session"** button at the bottom:
  - Opens a dialog asking for a branch name.
  - Creates the branch and worktree automatically.
  - Opens a terminal tab in the new worktree.
- Clicking a session switches the terminal area and changes panel to that session.
- Right-click or context menu to:
  - Stop / resume a session.
  - Mark a session as finished.
  - Delete a session (prompts: "Delete worktree and branch, or keep them?").

### 3.3 Terminal Area (Center)

- Full interactive PTY terminal emulator (not a log viewer).
- Supports colors, cursor movement, interactive programs (vim, less, etc.).
- **Tab bar** at the top of the terminal area:
  - Each tab is an independent terminal instance sharing the session's worktree as the working directory.
  - **"+"** button to open a new terminal tab within the current session.
  - Tabs can be closed individually.
- Users type commands directly — `claude`, `codex`, `aider`, or any CLI tool.
- The application does not manage API keys or agent configuration; it relies on the user's shell environment.

### 3.4 Worktree Changes Panel (Right)

- Shows the file change list for the active session's worktree:
  - Modified (M), Added (A), Deleted (D), Renamed (R) indicators.
- Updates in **real-time** as the agent makes changes.
- Clicking a file opens a **diff view** showing the changes (unified or split view).
- Read-only — no staging, committing, or pushing. The user handles git operations through the agent or terminal.

### 3.5 Panel Behavior

- All three panels are **collapsible** (can be hidden to give more space to other panels).
- All three panels are **resizable** (drag borders to adjust width).
- Panel state (collapsed/expanded, sizes) persists across restarts.

### 3.6 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New session |
| `Ctrl+T` | New terminal tab in current session |

---

## 4. Functional Requirements

### 4.1 Project Selection

| ID | Requirement |
|----|-------------|
| F-PS-01 | On launch, if no project is configured, show a folder picker dialog for the user to select a git repository. |
| F-PS-02 | Validate that the selected folder is a valid git repository (contains `.git`). Show an error if not. |
| F-PS-03 | Remember the last opened project and reopen it automatically on subsequent launches. |
| F-PS-04 | Provide a menu option to open a different project (closes current instance, opens new one). |

### 4.2 Session Management

| ID | Requirement |
|----|-------------|
| F-SM-01 | Creating a new session requires a branch name input from the user. |
| F-SM-02 | On session creation, the app creates a new git branch and a corresponding worktree in a managed directory (e.g., `.alice-worktrees/` adjacent to the repo or within the repo's parent). |
| F-SM-03 | On session creation, a terminal tab is automatically opened with the working directory set to the new worktree. |
| F-SM-04 | Sessions persist in a local SQLite database. On app restart, all sessions are restored with their status and metadata. |
| F-SM-05 | Session statuses: `running` (terminals are active), `stopped` (terminals closed, worktree still exists), `finished` (user marked complete). |
| F-SM-06 | Deleting a session prompts the user: "Delete worktree and branch?" with options to delete both, keep both, or cancel. |
| F-SM-07 | If the user deletes the worktree and branch, the app runs `git worktree remove` and `git branch -D` for cleanup. |
| F-SM-08 | Selecting a session in the left panel switches the terminal area and changes panel to reflect that session. |

### 4.3 Terminal

| ID | Requirement |
|----|-------------|
| F-TM-01 | Each terminal tab runs a full PTY shell (user's default shell). |
| F-TM-02 | The terminal supports interactive programs, ANSI colors, cursor positioning, and resizing. |
| F-TM-03 | Multiple terminal tabs can exist per session, each running independently. |
| F-TM-04 | New terminal tabs inherit the session's worktree as their working directory. |
| F-TM-05 | Terminal state (running processes) does not persist across app restarts. On restart, terminals reopen as fresh shells in their session's worktree. |
| F-TM-06 | Closing a terminal tab kills the associated PTY process. If it's the last tab, the session status changes to `stopped`. |

### 4.4 Worktree Changes

| ID | Requirement |
|----|-------------|
| F-WC-01 | The changes panel shows all modified, added, deleted, and renamed files in the active session's worktree relative to the branch point. |
| F-WC-02 | File changes update in real-time using filesystem watching (debounced at 300-500ms). |
| F-WC-03 | Clicking a file shows a diff view with syntax highlighting. |
| F-WC-04 | The diff view supports unified and split (side-by-side) display modes. |
| F-WC-05 | The changes panel is read-only — no git operations (staging, committing, pushing) are exposed. |

### 4.5 Data Persistence

| ID | Requirement |
|----|-------------|
| F-DP-01 | Application data (sessions, panel layout, project path) is stored in a local SQLite database. |
| F-DP-02 | Database location: platform-appropriate app data directory (e.g., `~/.local/share/project-alice/` on Linux, `~/Library/Application Support/project-alice/` on macOS, `%APPDATA%/project-alice/` on Windows). |
| F-DP-03 | Panel sizes and collapsed states persist across restarts. |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement |
|----|-------------|
| NF-P-01 | App startup time under 2 seconds (cold start). |
| NF-P-02 | Terminal input latency under 16ms (60fps feel). |
| NF-P-03 | Diff panel updates within 1 second of file changes. |
| NF-P-04 | Support at least 10 concurrent sessions with 2-3 terminal tabs each without degradation. |

### 5.2 Compatibility

| ID | Requirement |
|----|-------------|
| NF-C-01 | macOS 12+ (Monterey and later). |
| NF-C-02 | Linux: Ubuntu 22.04+, Fedora 38+, Arch (current). |
| NF-C-03 | Windows 10 version 1903+ (ConPTY support required). |

### 5.3 User Interface

| ID | Requirement |
|----|-------------|
| NF-U-01 | Dark theme by default. |
| NF-U-02 | Theming architecture allows adding light theme or custom themes in future versions without major refactoring. |
| NF-U-03 | Responsive layout — panels resize gracefully at any window size. |
| NF-U-04 | Minimum window size: 800x600 pixels. |

---

## 6. Technical Architecture

### 6.1 Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| App framework | Tauri 2 | Cross-platform desktop shell, IPC, native APIs |
| Backend language | Rust | PTY management, git operations, file watching, SQLite |
| Frontend framework | SolidJS | Reactive UI with fine-grained updates |
| Terminal emulator | xterm.js + @xterm/addon-webgl | GPU-accelerated terminal rendering |
| PTY backend | portable-pty | Cross-platform PTY spawning (Linux/macOS/Windows ConPTY) |
| Diff rendering | git-diff-view | GitHub-style diff UI with syntax highlighting |
| Git operations | git2 crate + git CLI | Worktree/branch management (git2), diff generation (CLI) |
| File watching | notify crate | OS-native filesystem events, debounced |
| Database | SQLite (via rusqlite or sqlx) | Session persistence, app state |

### 6.2 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   SolidJS Frontend                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Sessions │  │  xterm.js    │  │ git-diff-view│  │
│  │  Panel   │  │  Terminals   │  │  Changes     │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│       │               │                 │           │
│       └───────────┬───┴────────┬────────┘           │
│                   │  Tauri IPC │                     │
├───────────────────┴────────────┴────────────────────┤
│                   Rust Backend                      │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────┐  │
│  │ Session  │  │   PTY    │  │  Git   │  │ File │  │
│  │ Manager  │  │ Manager  │  │  Ops   │  │Watch │  │
│  └────┬─────┘  └──────────┘  └────────┘  └──────┘  │
│       │                                             │
│  ┌────┴─────┐                                       │
│  │  SQLite  │                                       │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
```

### 6.3 Key Technical Considerations

1. **WebGL context limits**: Browsers cap WebGL contexts at ~8-16. Only apply the WebGL renderer to visible terminals. Fall back to canvas for hidden ones.
2. **PTY resize propagation**: xterm.js resize events must be forwarded through Tauri IPC to the PTY backend to call `resize_pty()`.
3. **IPC data batching**: Buffer PTY output reads and flush to the frontend on a timer/threshold rather than per-byte, to avoid IPC overhead.
4. **Worktree directory**: Store worktrees in a predictable location (e.g., `{repo_parent}/.alice-worktrees/{branch-name}/`) to avoid polluting the main repo.
5. **File watcher filtering**: Ignore `.git/objects/`, build artifacts, and `node_modules/` to reduce noise in the changes panel.
6. **Shell detection**: Detect the user's default shell (`$SHELL` on Unix, PowerShell/cmd on Windows) for terminal spawning.

---

## 7. Out of Scope (v1.0.0)

The following are explicitly **not** included in this version:

- Light theme / theme switching UI.
- Built-in git operations (staging, committing, pushing, PR creation).
- Agent marketplace or agent configuration.
- API key management.
- Remote/cloud sessions.
- Collaboration / multi-user features.
- Plugin or extension system.
- Built-in AI agent (the app is agent-agnostic — users bring their own).
- Auto-update mechanism.

---

## 8. Success Criteria

| Criteria | Measurement |
|----------|-------------|
| A user can create a session, run Claude Code in it, and see live file changes | End-to-end smoke test |
| Multiple sessions can run agents simultaneously without interference | Parallel session test with 5+ sessions |
| Sessions survive app restart with correct status and metadata | Restart persistence test |
| App runs on macOS, Linux, and Windows | CI builds + manual verification on all three |
| Terminal feels native (no perceptible input lag, colors work, interactive programs work) | Manual QA with vim, htop, and coding agents |
| Diff panel updates within 1 second of file changes | Timed file-watch test |
