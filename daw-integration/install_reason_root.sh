#!/bin/bash
# MPK49 Revival — System-Wide Reason 14 Installer (Requires sudo)
# Run with:
#   sudo ./daw-integration/install_reason_root.sh

set -e

if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script with sudo:"
  echo "   sudo ./daw-integration/install_reason_root.sh"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

SYS_CODECS="/Library/Application Support/Propellerhead Software/Remote/Codecs/Lua Codecs/Akai"
SYS_MAPS="/Library/Application Support/Propellerhead Software/Remote/Maps/Akai"

APP_CODECS="/Applications/Reason 14.app/Contents/Resources/Remote/DefaultCodecs/Lua Codecs/Akai"
APP_MAPS="/Applications/Reason 14.app/Contents/Resources/Remote/DefaultMaps/Akai"

echo ""
echo "🎹 Installing MPK49 Revival into Reason 14 System & App Directories..."
echo "======================================================================="

# 1. System Library
mkdir -p "$SYS_CODECS"
mkdir -p "$SYS_MAPS"

cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.lua"       "$SYS_CODECS/"
cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.luacodec"  "$SYS_CODECS/"
cp "$REPO_ROOT/daw-integration/reason/MPK49_reason.png"            "$SYS_CODECS/"
echo "  ✓ Codec + Image installed → $SYS_CODECS/"

cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.remotemap" "$SYS_MAPS/"
echo "  ✓ RemoteMap installed     → $SYS_MAPS/"

# 2. Reason 14.app Bundle (Guarantees discovery by Reason 14 engine)
if [ -d "$APP_CODECS" ]; then
  cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.lua"       "$APP_CODECS/"
  cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.luacodec"  "$APP_CODECS/"
  cp "$REPO_ROOT/daw-integration/reason/MPK49_reason.png"            "$APP_CODECS/"
  echo "  ✓ Codec + Image copied to Reason 14.app DefaultCodecs"
fi

if [ -d "$APP_MAPS" ]; then
  cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.remotemap" "$APP_MAPS/"
  echo "  ✓ RemoteMap copied to Reason 14.app DefaultMaps"
fi

echo ""
echo "✅ Installation complete! Restart Reason 14, then go to:"
echo "   Preferences → Control Surfaces → Add Surface"
echo "   Manufacturer: Akai  |  Model: MPK49 Revival"
echo ""
