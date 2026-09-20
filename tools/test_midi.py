#!/usr/bin/env python3
"""
MPK-Revival | MIDI Port Diagnostic & Terminal Sniffer
Checks for available MIDI devices and receives SysEx dumps via python-rtmidi or mido if installed.
"""

import sys
import time

def check_dependencies():
    available = {}
    try:
        import mido
        available['mido'] = mido
    except ImportError:
        available['mido'] = None

    try:
        import rtmidi
        available['rtmidi'] = rtmidi
    except ImportError:
        available['rtmidi'] = None

    return available

def main():
    print("=== MPK-Revival | MIDI Hardware Probe ===")
    deps = check_dependencies()

    if not deps['mido'] and not deps['rtmidi']:
        print("\nNote: Optional Python MIDI libraries (mido, python-rtmidi) are not installed in this Python environment.")
        print("💡 The recommended zero-install capture tool is the Web MIDI Diagnostic Bench:")
        print("   Run: cd editor/poc && python3 -m http.server 8000")
        print("   Then open: http://localhost:8000 in Chrome or Edge.\n")
        print("If you prefer terminal-based capture, install mido:")
        print("   pip install mido python-rtmidi")
        return

    if deps['mido']:
        import mido
        inputs = mido.get_input_names()
        outputs = mido.get_output_names()
        print(f"\n[mido backend: {mido.backend.name}]")
        print("Available MIDI Inputs:")
        for idx, name in enumerate(inputs):
            marker = " <-- (AKAI MPK DETECTED)" if "mpk" in name.lower() or "akai" in name.lower() else ""
            print(f"  [{idx}] {name}{marker}")

        print("\nAvailable MIDI Outputs:")
        for idx, name in enumerate(outputs):
            marker = " <-- (AKAI MPK DETECTED)" if "mpk" in name.lower() or "akai" in name.lower() else ""
            print(f"  [{idx}] {name}{marker}")

if __name__ == "__main__":
    main()
