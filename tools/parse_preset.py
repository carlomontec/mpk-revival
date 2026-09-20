#!/usr/bin/env python3
"""
MPK-Revival | Preset Parser & Schema Inspector
Decodes an Akai MPK49 1033-byte SysEx preset dump into structured parameters.
"""

import sys
import os

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def midi_note_to_name(note_num):
    octave = (note_num // 12) - 1
    name = NOTE_NAMES[note_num % 12]
    return f"{name}{octave} ({note_num})"

def parse_mpk49_preset(data):
    if len(data) != 1033:
        print(f"Warning: Expected 1033 bytes, got {len(data)} bytes")

    header = {
        'status': hex(data[0]),
        'manufacturer': hex(data[1]),
        'device_id': hex(data[2]),
        'model_id': hex(data[3]), # 0x6B = MPK49
        'cmd': f"0x{data[4]:02X} 0x{data[5]:02X}",
        'slot': data[7]
    }

    # Preset Name: bytes 8 to 15 (8 ASCII chars)
    raw_name_bytes = data[8:16]
    preset_name = "".join(chr(b) for b in raw_name_bytes if 32 <= b <= 126).strip()

    print("=" * 60)
    print(f"AKAI MPK49 PRESET DUMP ANALYSIS")
    print("=" * 60)
    print(f"Model ID       : {header['model_id']} (MPK49)")
    print(f"Preset Slot    : #{header['slot']}")
    print(f"Preset Name    : \"{preset_name}\"")
    print(f"Total Length   : {len(data)} bytes")
    print(f"Framing Check  : Start={hex(data[0])}, End={hex(data[-1])}")
    print("-" * 60)

    # Decode Pad Banks (A, B, C, D)
    # Each bank has 12 pads. Let's inspect the offsets.
    print("\n--- PAD ASSIGNMENTS (Bank A) ---")
    pad_base = 44  # Offset for Pad 1 Bank A
    for i in range(12):
        offset = pad_base + (i * 8)
        chunk = data[offset:offset+8]
        msg_type, midi_ch, note_num = chunk[0], chunk[1], chunk[2]
        print(f"  Pad {i+1:02d}: Note = {midi_note_to_name(note_num):<10} Channel = {midi_ch:<2} Raw: {' '.join(f'{b:02X}' for b in chunk)}")

    print("\n" + "=" * 60)

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "backups/raw/preset01_dump.syx"
    if not os.path.exists(path):
        print(f"Error: File {path} not found")
        sys.exit(1)

    with open(path, "rb") as f:
        data = f.read()

    parse_mpk49_preset(data)

if __name__ == "__main__":
    main()
