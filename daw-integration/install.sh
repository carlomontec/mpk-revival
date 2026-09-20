#!/bin/bash
# MPK49 Revival — DAW Integration Installer
# Run from the mpk-revival repo root:
#   bash daw-integration/install.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

ABLETON_SCRIPTS="$HOME/Music/Ableton/User Library/Remote Scripts"
REASON_CODECS="$HOME/Library/Application Support/Propellerhead Software/Remote/Codecs/Lua Codecs/Akai"
REASON_MAPS="$HOME/Library/Application Support/Propellerhead Software/Remote/Maps/Akai"

echo ""
echo "🎹 MPK49 Revival — DAW Integration Installer"
echo "============================================="
echo ""

# ── Ableton Live 12 ──────────────────────────────────────────────────────────
echo "📦  Installing Ableton Live 12 Remote Script..."
mkdir -p "$ABLETON_SCRIPTS/MPK49_Revival"
cp "$REPO_ROOT/daw-integration/ableton/MPK49_Revival/__init__.py"   "$ABLETON_SCRIPTS/MPK49_Revival/"
cp "$REPO_ROOT/daw-integration/ableton/MPK49_Revival/MPK49Revival.py" "$ABLETON_SCRIPTS/MPK49_Revival/"
echo "    ✓ Installed → $ABLETON_SCRIPTS/MPK49_Revival/"
echo "    → Ableton: Preferences → MIDI → Control Surfaces → MPK49 Revival"
echo "      Input + Output: Akai MPK49 Port 1"
echo ""

# ── Reason 14 ────────────────────────────────────────────────────────────────
echo "📦  Installing Reason 14 Remote Codec..."
mkdir -p "$REASON_CODECS"
cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.lua"       "$REASON_CODECS/"
cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.luacodec"  "$REASON_CODECS/"
echo "    ✓ Codec installed → $REASON_CODECS/"

echo "📦  Installing Reason 14 Remote Map..."
mkdir -p "$REASON_MAPS"
cp "$REPO_ROOT/daw-integration/reason/AkaiMPK49_Revival.remotemap" "$REASON_MAPS/"
echo "    ✓ Map installed   → $REASON_MAPS/"
echo "    → Reason: Preferences → Control Surfaces → Add Surface"
echo "      Manufacturer: Akai | Model: MPK49 Revival"
echo "      Input: Akai MPK49 Port 1 | Output: Akai MPK49 Port 1"
echo ""

# ── Next steps ───────────────────────────────────────────────────────────────
echo "✅  Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Open the MPK-Revival Web Studio (http://localhost:8080)"
echo "  2. Load presets/ableton12_studio.json onto MPK49 Slot 02"
echo "  3. Load presets/reason14_rack.json   onto MPK49 Slot 03"
echo "  4. Restart Ableton Live 12 and Reason 14"
echo "  5. In Ableton: select 'MPK49 Revival' as control surface"
echo "  6. In Reason: Add Surface → Akai → MPK49 Revival"
echo ""
