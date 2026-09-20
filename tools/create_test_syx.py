#!/usr/bin/env python3
"""
MPK-Revival | Safe Test Preset Generator
Creates a surgical test preset for Slot 30 by only changing the name to 'TESTREV '
and keeping all other 1,025 bytes identical to the original factory backup.
"""

import os
import sys

def main():
    source_path = "backups/raw/slot30_Generic_2026-09-20_11-32-06.syx"
    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found")
        sys.exit(1)

    with open(source_path, "rb") as f:
        data = bytearray(f.read())

    if len(data) != 1033:
        print(f"Error: Unexpected size {len(data)} (expected 1033)")
        sys.exit(1)

    # Verify original name
    orig_name = "".join(chr(b) for b in data[8:16])
    print(f"Original Slot 30 Name: '{orig_name}'")

    # Modify ONLY bytes 8 to 15 (Name: 'TESTREV ')
    new_name = "TESTREV " # exactly 8 characters
    for i, ch in enumerate(new_name):
        data[8 + i] = ord(ch)

    os.makedirs("backups/test", exist_ok=True)
    out_path = "backups/test/slot30_TESTREV.syx"
    with open(out_path, "wb") as f:
        f.write(data)

    print(f"✓ Created surgical test file: {out_path} ({len(data)} bytes)")
    print(f"Target Slot : #{data[7]}")
    print(f"New Name    : '{new_name}'")

if __name__ == "__main__":
    main()
