---
name: akai-mpk49-sysex
description: >-
  Inspect, encode, decode, and safely transfer presets and SysEx dumps to and from the Akai MPK49 MIDI keyboard controller.
---

# Akai MPK49 SysEx Knowledge & Protocol Guide

Use this skill when working with Akai MPK49 preset dumps, SysEx transfers, Web MIDI communication, or hardware mapping.

## Hardware Specifications & Port Routing

- **Model ID**: `0x6B` (Akai MPK49). Manufacturer ID: `0x47` (Akai).
- **USB Virtual Ports**: macOS/Windows exposes 3 virtual ports for the MPK49:
  - **Port 1**: MPK49 Keyboard, Controllers, and bidirectional SysEx transfers. **Always send to and listen on Port 1.**
  - **Port 2**: Internal control / DAW sync.
  - **Port 3**: Hardware 5-pin DIN MIDI IN/OUT jacks on the rear panel.

## 1,033-Byte Memory Layout

Each preset binary dump (.syx) is exactly 1,033 bytes:

| Byte Range | Field | Details |
| :--- | :--- | :--- |
| `0..6` | Header | `F0 47 00 6B 10 08 01` (SysEx Start, Akai, MPK49, Preset Dump) |
| `7` | Slot Number | `0x01` to `0x1E` (Slot 1 to 30) |
| `8..15` | Preset Name | Exactly 8 ASCII bytes. **Mixed/lower case is fully supported by the LCD!** |
| `16..43` | Global / Arp | Arp tempo, time division, swing, gate |
| `44..555` | MPC Drum Pads | 4 Banks (A, B, C, D) × 12 pads = 48 pads (8 bytes each: Mode, Ch, Note, AT) |
| `556..723` | Rotary Knobs (K1..K8) | 3 Banks (A, B, C) × 8 knobs = 24 knobs (7 bytes each: Flag, Ch, CC, Min, Max) |
| `724..843` | Sliders / Faders (F1..F8) | 3 Banks (A, B, C) × 8 faders = 24 faders (5 bytes each: Flag, Ch, CC, Min, Max) |
| `844..1011` | Switches / Buttons (S1..S8) | 3 Banks (A, B, C) × 8 switches = 24 switches (7 bytes each: Flag, Ch, CC, Mode). **Mode: `1` = Toggle (`TGL`), `0` = Momentary (`MMT`)** |
| `1012..1031`| Pedals / Wheels | Mod Wheel (1013), Expression (1019), Sustain (1024), FootSW2 (1029) |
| `1032` | End of Exclusive | `0xF7` |

## MIDI Channel & Switch Mode Specifications

1. **MIDI Channel Scheme (33-value encoding)**:
   - `0` = `COMMON` (Follows global keybed channel).
   - `1..16` = `1A..16A` (Port A, channels 1 to 16. Raw byte 1 = 1A).
   - `17..32` = `1B..16B` (Port B, channels 1 to 16).
   - *Pitfall*: Do NOT add +1 to Port A bytes, raw `1` displays as `1A` on hardware!

2. **Switch Operating Mode**:
   - `0x01` (`1`) = **TOGGLE (`TGL`)**: Physical button LED toggles on/off. Sends CC 127 on press 1, CC 0 on press 2.
   - `0x00` (`0`) = **MOMENTARY (`MMT`)**: Physical button LED is lit only while held down. Sends CC 127 on press, CC 0 on release.
   - *Pitfall*: Older drafts had this inverted. Empirical hardware testing confirms `1` = Toggle, `0` = Momentary.

## Hardware Control Special Behaviors

1. **Transport Buttons (REW, FF, STOP, PLAY, REC)**:
   - Configured via **Byte 32 (Transport Format)**:
     - `0` = MMC (MIDI Machine Control): sends SysEx MMC (`F0 7F ... 06 01..06 F7`), not CC!
     - `2` = MIDI CC: sends standard transport CCs (e.g. CC 114–118).
     - `3` / `4` = LiveLite / PTEX: host DAW control script mode.

2. **Arpeggiator & Clock Hardware Controls**:
   - `[ARPEGGIATOR ON/OFF]`, `[LATCH]`, `[TAP TEMPO]`, `[TIME DIVISION]` are internal hardware state toggles. They do not send CC over MIDI. Their preset defaults (tempo, division, swing, gate, type) are stored in bytes 16..25 of the SysEx preset dump.

3. **Live Hardware Follow Resolution**:
   - To match incoming CC to physical controls reliably on screen, always resolve against an active Hardware Profile (e.g., LiveLite Slot 02, Reason Slot 03), because different hardware presets assign the same CC numbers to different physical controls.

## Safety Rules

1. **Never commit or push without explicit user authorization.**
2. **Local Editing First**: Allow users to configure presets and save to local library/JSON/SYX before hardware flashing.
3. **Safe Writes**: Always target Slot 30 (or user-chosen slot) with verified 1,033-byte frames.
