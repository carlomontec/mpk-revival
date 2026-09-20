# MPK-Revival Project Guidelines

## Git & Version Control Operations
- **Strict Authorization Required**: NEVER run `git commit` or `git push` without explicit authorization from the user.
- Staging, drafting code, running local tests, and inspecting `git diff` / `git status` are permitted, but creating commits or pushing to remote remotes requires user approval.

## Hardware Safety Protocol
- **No Autonomous Hardware Flashing**: NEVER attempt to write or send SysEx dumps to physical hardware directly in autonomous or batch mode. Hardware EEPROMs must only be updated when initiated manually by the user from the web studio.
- **Non-Destructive First**: Prioritize read-only port discovery, SysEx dump capture, and offline byte analysis.
- **Zero Premature Write-Back**: Do not send experimental or unverified SysEx parameter writes to physical hardware without explicit verification and user confirmation.
- **Local Preset Management First**: Users should create, edit, and safely store presets locally in the browser/file system before transmitting to hardware.

## AI Preset Authoring & Compiler Protocol
- AI agents act as **Sound & Preset Architects**. Presets must be authored as semantic JSON in `presets/<name>.json`.
- Presets must be validated and compiled offline using `node tools/compile_preset.js <path>` into verified 1,033-byte `.syx` files.
- Consult [`docs/AGENT_PRESET_CREATION_GUIDE.md`](file:///Users/carlo/code/code_music/mpk-revival/docs/AGENT_PRESET_CREATION_GUIDE.md) for full schema specifications and ergonomic design patterns (Ableton, Reason, Kontakt, Synths).

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

## DAW Integration Protocols

### Ableton Live 12 Remote Scripts (`_Framework`)
- **Location**: `~/Music/Ableton/User Library/Remote Scripts/MPK49_Revival/`
- **Transport CCs**: Rewind `<<` = 115, Fast Forward `>>` = 116, Stop = 117, Play = 118, Rec = 119.
- **Session Banking**: Use `<<` (CC 115) and `>>` (CC 116) for `set_track_bank_buttons` so that switches S1–S8 stay aligned 1:1 with tracks 1–8.
- **Device Follow**: Always initialize `DeviceComponent(device_selection_follows_track_selection=True)`.

### Reason 14 Remote Engine (Codecs & Maps)
- **User Library Priority**: Install to `~/Library/Application Support/Propellerhead Software/Remote/` (requires zero sudo). Reason prioritizes User Library over `/Library/` and app bundles; files in `/Library/` are shadowed if a copy exists in user library.
- **SSL Main Mixer Scope**: The Reason SSL desk is `Scope Propellerheads Reason Master Section` (`Channel 1 Level`..`Channel 8 Level`, `Channel 1 Pan`..`Channel 8 Pan`, `Channel 1 Mute`, `Channel 1 Solo`, `Previous 8 Remote Base Channel`, `Next 8 Remote Base Channel`). The vintage `Mixer 14:2` is only the 1990s rack mixer.
- **Individual Strips**: Mapped under `Scope Propellerheads Mix Channel` and `Scope Propellerheads Audio Track`.
- **Surface Locking**: Control surfaces follow active tracks by default. To permanently lock MPK49 faders/mutes to the SSL desk, users can right-click the Master Section in the rack and choose "Lock to this Device".
- **PNG Requirement**: In `.luacodec`, any file declared in `picture` MUST physically exist in the same directory, or Reason silently drops the codec during discovery.
- **Strict ASCII Tabs**: `.remotemap` files must be strictly tab-separated (`\t`) and pure ASCII. Multibyte UTF-8 characters crash Reason's `RSText::FromASCII` parser.
- **No Duplicate Remotables**: Mapping multiple hardware controls to the same Remotable Item within the same Scope is forbidden without shortcut variations.

## Project Attribution & Repository
- **Author**: Created and maintained by `@carlomontec`.
- **Repository**: [https://github.com/carlomontec/mpk-revival](https://github.com/carlomontec/mpk-revival)
