#!/bin/bash
# MPK49 Revival — User-Level Reason 14 Installer (No sudo needed!)
# Copies all codec, map, and image files to ~/Library/Application Support/Propellerhead Software/Remote/

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

USER_CODECS="$HOME/Library/Application Support/Propellerhead Software/Remote/Codecs/Lua Codecs/Akai"
USER_MAPS="$HOME/Library/Application Support/Propellerhead Software/Remote/Maps/Akai"

echo ""
echo "🎹 Installing MPK49 Revival into Reason 14 (User Library)..."
echo "============================================================"

# Ensure directories exist
mkdir -p "$USER_CODECS"
mkdir -p "$USER_MAPS"

# 1. Copy Codec, Lua script, and PNG
cp -v "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.lua"       "$USER_CODECS/"
cp -v "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.luacodec"  "$USER_CODECS/"
cp -v "$REPO_ROOT/daw-integration/reason/MPK49_reason.png"            "$USER_CODECS/"

# 2. Copy clean RemoteMap
cp -v "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.remotemap" "$USER_MAPS/"

echo ""
echo "✅ Successfully installed to user library!"
echo "   Codec:     $USER_CODECS"
echo "   RemoteMap: $USER_MAPS"
echo ""

# Check if old system files exist and prompt to clean them
SYS_MAP="/Library/Application Support/Propellerhead Software/Remote/Maps/Akai/AkaiMPK49_Revival.remotemap"
if [ -f "$SYS_MAP" ]; then
  echo "ℹ️  Found old root/system files in /Library/Application Support/..."
  echo "   To remove them and keep only User Library, run:"
  echo "   sudo rm -rf \"/Library/Application Support/Propellerhead Software/Remote/Codecs/Lua Codecs/Akai/AkaiMPK49_Revival\"* \"$SYS_MAP\""
  echo ""
fi
