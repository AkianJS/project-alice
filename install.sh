#!/usr/bin/env bash
set -euo pipefail

REPO="AkianJS/project-alice"
APP_NAME="project-alice"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[info]${NC} $1"; }
ok()    { echo -e "${GREEN}[ok]${NC} $1"; }
fail()  { echo -e "${RED}[error]${NC} $1"; exit 1; }

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux*)  PLATFORM="linux" ;;
  Darwin*) PLATFORM="macos" ;;
  *)       fail "Unsupported OS: $OS. Use install.ps1 for Windows." ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)             fail "Unsupported architecture: $ARCH" ;;
esac

info "Detected: $PLATFORM ($ARCH)"

# Get latest release tag
info "Fetching latest release..."
RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest") \
  || fail "Could not fetch release info. Check your internet connection."

TAG=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*: "//;s/".*//')
[ -z "$TAG" ] && fail "Could not determine latest version."
info "Latest version: $TAG"

# Find the right asset
if [ "$PLATFORM" = "linux" ]; then
  # Prefer AppImage for easy run-anywhere
  ASSET_URL=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep -i '\.AppImage"' | head -1 | sed 's/.*": "//;s/".*//')

  if [ -z "$ASSET_URL" ]; then
    # Fall back to .deb
    ASSET_URL=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep -i '\.deb"' | head -1 | sed 's/.*": "//;s/".*//')
    INSTALL_TYPE="deb"
  else
    INSTALL_TYPE="appimage"
  fi
elif [ "$PLATFORM" = "macos" ]; then
  ASSET_URL=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep -i '\.dmg"' | head -1 | sed 's/.*": "//;s/".*//')
  INSTALL_TYPE="dmg"
fi

[ -z "${ASSET_URL:-}" ] && fail "No compatible binary found for $PLATFORM ($ARCH) in release $TAG."

FILENAME=$(basename "$ASSET_URL")
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

info "Downloading $FILENAME..."
curl -fSL --progress-bar -o "$TMPDIR/$FILENAME" "$ASSET_URL" \
  || fail "Download failed."

ok "Downloaded $FILENAME"

# Install based on type
case "$INSTALL_TYPE" in
  appimage)
    INSTALL_DIR="${HOME}/.local/bin"
    mkdir -p "$INSTALL_DIR"
    mv "$TMPDIR/$FILENAME" "$INSTALL_DIR/$APP_NAME"
    chmod +x "$INSTALL_DIR/$APP_NAME"
    ok "Installed to $INSTALL_DIR/$APP_NAME"
    if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
      echo ""
      info "Add ~/.local/bin to your PATH if it's not already:"
      echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
    ;;
  deb)
    info "Installing .deb package (requires sudo)..."
    sudo dpkg -i "$TMPDIR/$FILENAME" || sudo apt-get install -f -y
    ok "Installed via dpkg"
    ;;
  dmg)
    info "Mounting DMG..."
    HDIUTIL_OUT=$(hdiutil attach "$TMPDIR/$FILENAME" -nobrowse 2>&1)
    MOUNT_POINT=$(echo "$HDIUTIL_OUT" | grep -o '/Volumes/.*' | head -1 | sed 's/[[:space:]]*$//')
    if [ -z "$MOUNT_POINT" ] || [ ! -d "$MOUNT_POINT" ]; then
      echo "$HDIUTIL_OUT"
      fail "Failed to mount DMG."
    fi
    APP_PATH=$(find "$MOUNT_POINT" -name "*.app" -maxdepth 1 | head -1)

    if [ -z "$APP_PATH" ]; then
      hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
      fail "No .app found in DMG."
    fi

    info "Copying to /Applications..."
    cp -R "$APP_PATH" /Applications/
    hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null
    ok "Installed to /Applications/$(basename "$APP_PATH")"
    ;;
esac

echo ""
ok "Project Alice $TAG installed successfully!"
