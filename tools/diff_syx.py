#!/usr/bin/env python3
"""
MPK-Revival | SysEx Diff Tool
Compares two Akai SysEx (.syx) dump files byte-by-byte to reverse-engineer parameter offsets.

Usage:
    python3 diff_syx.py file1.syx file2.syx
"""

import sys
import os

def load_syx(path):
    if not os.path.exists(path):
        print(f"Error: File not found: {path}", file=sys.stderr)
        sys.exit(1)
    with open(path, "rb") as f:
        return f.read()

def diff_dumps(data1, data2, name1, name2):
    len1, len2 = len(data1), len(data2)
    print(f"=== SysEx Dump Comparison ===")
    print(f"File 1: {name1} ({len1} bytes)")
    print(f"File 2: {name2} ({len2} bytes)")
    print("-" * 65)

    if len1 != len2:
        print(f"⚠️  WARNING: File sizes differ! ({len1} vs {len2} bytes)")

    min_len = min(len1, len2)
    differences = []

    for i in range(min_len):
        b1, b2 = data1[i], data2[i]
        if b1 != b2:
            differences.append((i, b1, b2))

    if not differences and len1 == len2:
        print("✓ Files are 100% IDENTICAL.")
        return

    print(f"Found {len(differences)} byte differences:\n")
    print(f"{'OFFSET (Dec)':<12} {'OFFSET (Hex)':<12} {'FILE 1 (Hex/Dec)':<18} {'FILE 2 (Hex/Dec)':<18}")
    print("-" * 65)

    for offset, b1, b2 in differences:
        f1_str = f"0x{b1:02X} ({b1:3d})"
        f2_str = f"0x{b2:02X} ({b2:3d})"
        print(f"{offset:<12d} 0x{offset:04X}     {f1_str:<18} {f2_str:<18}")

    print("-" * 65)
    print(f"Total differences: {len(differences)}")

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 diff_syx.py <file1.syx> <file2.syx>")
        sys.exit(1)

    path1, path2 = sys.argv[1], sys.argv[2]
    data1 = load_syx(path1)
    data2 = load_syx(path2)
    diff_dumps(data1, data2, os.path.basename(path1), os.path.basename(path2))

if __name__ == "__main__":
    main()
