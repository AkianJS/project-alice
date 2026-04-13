# Project Alice

Mission control for AI coding agents. Run multiple agents in parallel across isolated git worktrees, all from a single window.

![License](https://img.shields.io/github/license/AkianJS/project-alice)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)

## What it does

Project Alice is a desktop app that lets you spawn multiple AI coding agents (Claude Code, Codex, Aider, or any CLI tool) in separate git worktrees simultaneously. Each agent works on its own branch without conflicts, and you monitor everything from one place.

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
│  [+ New]     │  └────────────────────────┘   │  Diff View       │
│              │                                │                  │
└──────────────┴────────────────────────────────┴──────────────────┘
```

**Sessions panel** — create and switch between agent workstreams, each tied to a branch and worktree.

**Terminal area** — full PTY terminals (colors, vim, interactive programs). Multiple tabs per session.

**Changes panel** — real-time file diffs as the agent works. Click any file to see the unified or side-by-side diff.

## Install

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/AkianJS/project-alice/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/AkianJS/project-alice/main/install.ps1 | iex
```

### Manual download

Grab the latest `.msi`, `.dmg`, `.deb`, or `.AppImage` from [Releases](https://github.com/AkianJS/project-alice/releases).

## Build from source

**Prerequisites:** [Node.js 20+](https://nodejs.org/), [Rust](https://rustup.rs/), and the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```bash
git clone https://github.com/AkianJS/project-alice.git
cd project-alice
npm install
npm run tauri build
```

The built installer will be in `src-tauri/target/release/bundle/`.

## Development

```bash
npm install
npm run tauri dev
```

This starts the Vite dev server and the Tauri window with hot reload.

## How it works

1. **Open a git repository** — Alice asks you to pick a folder on first launch.
2. **Create a session** — give it a branch name. Alice creates the branch and a git worktree automatically.
3. **Run your agent** — type `claude`, `codex`, `aider`, or any command in the terminal. Alice doesn't manage agents or API keys; it uses your shell environment.
4. **Watch changes live** — the right panel updates in real-time as files change in the worktree.
5. **Run many at once** — create more sessions. Each gets its own branch, worktree, and terminals. No conflicts.

## Tech stack

| Layer | Technology |
|-------|------------|
| App framework | Tauri 2 (Rust) |
| Frontend | SolidJS + TypeScript |
| Terminal | xterm.js + WebGL renderer |
| PTY | portable-pty (ConPTY on Windows) |
| Git | git2 (libgit2) |
| File watching | notify crate |
| Database | SQLite (rusqlite) |
| Bundler | Vite |

## Platform support

- Windows 10+ (1903+)
- macOS 12+ (Monterey)
- Linux: Ubuntu 22.04+, Fedora 38+, Arch

## License

[MIT](LICENSE)
