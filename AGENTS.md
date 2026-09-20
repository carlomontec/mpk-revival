# MPK-Revival Project Guidelines

## Git & Version Control Operations
- **Strict Authorization Required**: NEVER run `git commit` or `git push` without explicit authorization from the user.
- Staging, drafting code, running local tests, and inspecting `git diff` / `git status` are permitted, but creating commits or pushing to remote remotes requires user approval.

## Hardware Safety Protocol
- **Non-Destructive First**: Prioritize read-only port discovery, SysEx dump capture, and offline byte analysis.
- **Zero Premature Write-Back**: Do not send experimental or unverified SysEx parameter writes to physical hardware without explicit verification and user confirmation.
- **Local Preset Management First**: Users should create, edit, and safely store presets locally in the browser/file system before transmitting to hardware.

## Akai MPK49 Hardware & SysEx Specifications
- **Packet Size**: Exactly 1,033 bytes per preset (`F0 47 00 6B 10 08 01 [Slot 01..1E] ... F7`).
- **Port Routing**: Akai MPK49 has 3 USB MIDI ports on macOS/Windows. Port 1 is the keyboard & SysEx port. Port 3 is the external 5-pin DIN port. Always send and listen on Port 1.
- **Preset Names**: Bytes 8..15 (8 ASCII characters). The physical LCD screen supports mixed case (upper and lower case, e.g. `LiveLite`, `Reason`, `TestRev`). Never force uppercase.
- **Control Layout (Empirically Verified & Reverse-Engineered from Hardware)**:
  - **MPC Drum Pads**: 4 Banks (A–D) × 12 pads = 48 pads (8 bytes each, bytes 44..555).
  - **Rotary Knobs (K1–K8)**: 3 Banks (A–C) × 8 knobs = 24 knobs (7 bytes each, **Offset 556..723**).
  - **Long-Throw Sliders / Faders (F1–F8)**: 3 Banks (A–C) × 8 faders = 24 faders (5 bytes each, **Offset 724..843**).
  - **Assignable Switches / Buttons (S1–S8)**: 3 Banks (A–C) × 8 switches = 24 switches (7 bytes each, **Offset 844..1011**). Byte 3: **`1` = Toggle (`TGL`)**, **`0` = Momentary (`MMT`)**.
  - **MIDI Channels (33-value encoding)**: `0` = Common, `1..16` = `1A..16A` (Port A), `17..32` = `1B..16B` (Port B).
  - **Byte 32**: Transport mode (0=MMC, 1=MMC/MIDI, 2=MIDI CC, 3=LiveLite/Cubase, 4=PTEX). Transport buttons send SysEx MMC in mode 0, or MIDI CC in mode 2.
  - **Arpeggio & Clock Buttons**: Internal hardware switches only; they toggle internal clock/arp and do not transmit CC over MIDI.
  - **Wheels & Pedals**: Mod Wheel (CC 1, byte 1013), Expression Pedal (CC 11, byte 1019), Sustain Pedal (CC 64, byte 1024).

## Project Attribution & Repository
- **Author**: Created and maintained by `@carlomontec`.
- **Repository**: [https://github.com/carlomontec/mpk-revival](https://github.com/carlomontec/mpk-revival)
