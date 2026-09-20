# Akai MPK49 SysEx & Hardware Architecture Specification 🎹🔍

> **Community Open Specification**  
> Reverse-engineered by [@carlomontec](https://github.com/carlomontec) for the **[MPK-Revival](https://github.com/carlomontec/mpk-revival)** project.  
> *Dedicated to all musicians, sound designers, and developers keeping legendary hardware alive.*

---

## 1. Executive Summary

When inMusic acquired Akai Professional, official software support for older MIDI controllers—most notably the **Akai MPK49**, **MPK25**, **MPK61**, and **MPK88**—was discontinued. The original **Vyzex MPK49** editor is a 32-bit legacy utility that cannot run on modern 64-bit operating systems (macOS Catalina+, Windows 11 64-bit). Furthermore, no official SDK, byte specification, or memory map was ever publicly released by the manufacturer.

This document details the **exact 1,033-byte SysEx memory format**, controller offsets, and hardware quirks reverse-engineered from physical hardware dumps and empirical validation.

---

## 2. USB Port Architecture & Communication Routing

On modern macOS and Windows operating systems, connecting an Akai MPK49 via USB exposes **three virtual MIDI ports**:

```
[ Computer / Web Browser (Web MIDI API) ]
           │
           ├─── Port 1: "Akai MPK49 Port 1" ◄─── PRIMARY (Bidirectional SysEx & Keyboard / CC)
           ├─── Port 2: "Akai MPK49 Port 2" ◄─── Internal DAW Remote Sync
           └─── Port 3: "Akai MPK49 Port 3" ◄─── Hardware 5-Pin DIN IN/OUT (Rear Panel)
```

> ⚠️ **CRITICAL FOR DEVELOPERS**:  
> Always transmit SysEx dumps and listen for incoming messages on **Port 1**. Port 3 bridges directly to the rear 5-pin DIN jack and will not communicate with the keyboard's internal microprocessor.

---

## 3. SysEx Frame Structure (1,033 Bytes)

Every preset dump sent from or received by an Akai MPK49 is a fixed-length single System Exclusive frame consisting of exactly **1,033 bytes**.

### Frame Header & Trailer
* **SysEx Start**: `0xF0`
* **Manufacturer ID**: `0x47` (Akai Professional)
* **Device ID**: `0x00`
* **Model ID**: `0x6B` (Akai MPK49)
* **Command ID**: `0x10` (Preset Dump / Load)
* **Payload Length Header**: `0x08 0x01`
* **Slot ID**: `0x01` through `0x1E` (Preset Slot 1 to 30)
* **Trailer**: `0xF7` (End of Exclusive, at index `1032`)

```
Byte Offset | Value / Range     | Description
──────────────────────────────────────────────────────────────────
0000        | 0xF0              | SysEx Start
0001        | 0x47              | Manufacturer ID (Akai)
0002        | 0x00              | Device ID
0003        | 0x6B              | Model ID (MPK49)
0004        | 0x10              | Command (Preset Dump)
0005..0006  | 0x08 0x01         | Block header bytes
0007        | 0x01 .. 0x1E      | Memory Slot (1 to 30)
0008..0015  | 8 ASCII Bytes     | Preset Name (Supports Mixed Case!)
0016..0043  | 28 Bytes          | Global Settings & Arpeggiator Config
0044..0555  | 512 Bytes         | MPC Drum Pads (Banks A, B, C, D)
0556..0723  | 168 Bytes         | 360° Rotary Encoders / Knobs (K1..K8)
0724..0843  | 120 Bytes         | Long-Throw Faders / Sliders (F1..F8)
0844..1011  | 168 Bytes         | Assignable Switches / Buttons (S1..S8)
1012..1031  | 20 Bytes          | Modulation Wheel, Pedals, Footswitches
1032        | 0xF7              | End of Exclusive (EOX)
```

---

## 4. Reverse-Engineered Memory Blocks

### 4.1. Preset Name (Bytes `8..15`)
* 8 ASCII characters, padded with spaces (`0x20`).
* **Hardware Quirk**: Contrary to popular belief, the physical 16-character 2-line MPK49 backlit LCD screen **fully renders lowercase letters** (e.g. `LiveLite`, `Reason`, `Cubase`). You do not need to convert names to uppercase.

### 4.2. Global & Arpeggiator (Bytes `16..43`)
* **Byte 16**: Global MIDI Channel (`0..15` = Ch 1..16).
* **Byte 17**: Internal Tempo (`30..300` BPM).
* **Byte 18**: Clock Source (`1` = Internal, `0` = External MIDI Clock).
* **Byte 19**: Time Division (`0`=1/4, `1`=1/4T, `2`=1/8, `3`=1/8T, `4`=1/16, `5`=1/16T, `6`=1/32, `7`=1/32T).
* **Byte 21**: Arpeggiator Gate (`0..99`%).
* **Byte 22**: Arpeggiator Swing (`50..75`%).
* **Byte 24**: Arp Type (`0`=Up, `1`=Down, `2`=Inclusive, `3`=Exclusive, `4`=Random).
* **Byte 25**: Arp Range (`0`=0 octaves, `1`=+1 oct, `2`=+2 oct, `3`=+3 oct).
* **Byte 32**: **DAW Transport Mode**:
  - `0` = **MMC (MIDI Machine Control)**: Rewind, FF, Stop, Play, Rec transmit SysEx MMC (`F0 7F ... 06 01..06 F7`), NOT CC!
  - `1` = **MMC / MIDI**
  - `2` = **MIDI CC**: Transports transmit standard MIDI CCs.
  - `3` = **LiveLite / Cubase** DAW Surface Protocol.
  - `4` = **PTEX** (Pro Tools Controller Protocol).

### 4.3. MPC Drum Pads (Bytes `44..555`)
* 4 Banks (`A`, `B`, `C`, `D`) × 12 Pads = **48 total pad records**.
* Each pad record is **8 bytes**:
  - `+0`: Mode (`0`=Momentary, `1`=Toggle).
  - `+1`: MIDI Channel (`0..15` = Ch 1..16; `16` or `32` = Common).
  - `+2`: MIDI Note Number (`0..127`).
  - `+3`: Aftertouch Mode (`0`=Off, `1`=Channel Pressure, `2`=Polyphonic Key Pressure).

### 4.4. Rotary Knobs / Encoders K1–K8 (Bytes `556..723`)
* 3 Banks (`A`, `B`, `C`) × 8 Knobs = **24 total knob records**.
* Each knob record is **7 bytes**:
  - `+0`: Control Flag / Mode (`0x00`).
  - `+1`: MIDI Channel (`0..15`, or `32` = Common).
  - `+2`: **MIDI Continuous Controller (CC) Number** (`0..127`).
  - `+3`: Minimum Range (`0..127`).
  - `+4`: Maximum Range (`0..127`).
  - `+5..+6`: Reserved / Internal state.

### 4.5. Sliders / Faders F1–F8 (Bytes `724..843`)
* 3 Banks (`A`, `B`, `C`) × 8 Faders = **24 total fader records**.
* Each fader record is **5 bytes**:
  - `+0`: Control Flag (`0x00`).
  - `+1`: MIDI Channel (`0..15`, or `32` = Common).
  - `+2`: **MIDI Continuous Controller (CC) Number** (`0..127`).
  - `+3`: Minimum Range (`0..127`).
  - `+4`: Maximum Range (`0..127`).

### 4.6. Assignable Switches / Buttons S1–S8 (Bytes `844..1011`)
* 3 Banks (`A`, `B`, `C`) × 8 Switches = **24 total switch records**.
* Offset: `844 + (bankIndex * 8 + switchIndex) * 7`.
* Each switch record is **7 bytes**:
  - `+0`: Control Flag (`0x00`).
  - `+1`: **MIDI Channel** (Follows the 33-value encoding in Section 4.8: `0` = Common, `1..16` = `1A..16A`, `17..32` = `1B..16B`).
  - `+2`: **MIDI Continuous Controller (CC) Number** (`0..127`).
  - `+3`: **Switch Operating Mode**:
    - **`0x01` (`1`) = TOGGLE (`TGL`)**: The physical button LED toggles On/Off with each press. Sends CC `127` on press 1 (LED On), and CC `0` on press 2 (LED Off). Used for track mutes, solos, and plugin bypass switches (e.g. Bank A in *LiveLite*).
    - **`0x00` (`0`) = MOMENTARY (`MMT`)**: The physical button LED lights only while held down. Sends CC `127` on press and CC `0` on release. Used for momentary triggers, tap tempo, and DAW automation punches (e.g. *PTEX* template).
  - `+4..+6`: Reserved / Internal hardware state (`0x00, 0x00, 0x00`).

> ⚠️ **DEVELOPER PITFALL**:  
> Many older forum threads and reverse-engineering drafts guessed that `0` would default to Toggle and `1` to Momentary. Empirical testing on the physical MPK49 hardware and all 30 factory ROM presets proves the exact opposite: **`1` is Toggle** and **`0` is Momentary**. Inverting this byte causes buttons to behave as momentary triggers when intended as toggles, or vice versa.

### 4.7. Pedals & Modulation Wheels (Bytes `1012..1031`)
* **Modulation Wheel**:
  - Byte `1012`: MIDI Channel
  - Byte `1013`: CC Number (Default: `1`)
  - Byte `1014`: Minimum (Default: `0`)
  - Byte `1015`: Maximum (Default: `127`)
* **Expression Pedal**:
  - Byte `1018`: MIDI Channel
  - Byte `1019`: CC Number (Default: `11`)
  - Byte `1020`: Minimum (Default: `0`)
  - Byte `1021`: Maximum (Default: `127`)
* **Sustain Pedal (Foot Switch 1)**:
  - Byte `1023`: MIDI Channel
  - Byte `1024`: CC Number (Default: `64`)
  - Byte `1025`: Switch Mode (`0` = Momentary)

### 4.8. MIDI Channel Encoding Specification (Port A & Port B)

The Akai MPK49 hardware operates across two virtual output ports (**Port A** and **Port B**) to control up to 32 discrete MIDI channels, plus a dynamic `COMMON` channel. In the preset memory, MIDI channel fields for Sliders, Knobs, Switches, and Pads use a **1-byte 33-value encoding scheme (`0..32`)**:

| Raw Byte (Hex / Dec) | Display on MPK49 LCD | Target Routing & Port | Notes |
| :--- | :--- | :--- | :--- |
| `0x00` (`0`) | **`COMMON`** | Global Keybed Channel | Follows the global keybed channel dynamically |
| `0x01` (`1`) | **`1A`** | Port A · Channel 1 | Physical default for Bank A in LiveLite / Reason |
| `0x02` (`2`) | **`2A`** | Port A · Channel 2 | Bank B default in factory templates |
| `0x03` (`3`) | **`3A`** | Port A · Channel 3 | Bank C default in factory templates |
| `0x04 .. 0x10` (`4..16`) | **`4A .. 16A`** | Port A · Channels 4 to 16 | |
| `0x11` (`17`) | **`1B`** | Port B · Channel 1 | Secondary USB output port |
| `0x12 .. 0x20` (`18..32`) | **`2B .. 16B`** | Port B · Channels 2 to 16 | |

> ⚠️ **DEVELOPER PITFALL**:  
> Standard MIDI message status bytes represent Channel 1 as nibble `0x0` (0-indexed). However, in the Akai MPK49 preset memory, channel bytes are **1-indexed for Port A (`1 = 1A`)** because `0` is reserved for `COMMON`! Do not add `+1` to raw byte `1`, or your software will incorrectly display `2A` when the hardware screen actually reads `1A`.

---

## 5. The "Live Hardware Sensing" Solution

When building a software editor for the MPK49, incoming CCs are ambiguous unless you know what template the physical keyboard is currently booted into. For example:
* In **Slot 02 (LiveLite)**: Fader 1 is `CC 12`, Knob 1 is `CC 22`, Switch 1 is `CC 32`.
* In **Slot 03 (Reason)**: Knob 1 is `CC 2`, Fader 1 is `CC 12`, Switch 1 is `CC 21`.

**The Architectural Solution**:
The **MPK-Revival Studio** introduces a **Hardware Reference Profile** (`🎹 MPK on Desk:`). By referencing the 30 factory memory maps, incoming CCs are resolved directly to physical control indices before highlighting them in the GUI, allowing users to touch any control and immediately customize its assignments without friction.

---

## 6. Open Source Implementation

A clean, modern JavaScript implementation of this SysEx decoder, encoder, and Web MIDI engine is available in the **[MPK-Revival Repository](https://github.com/carlomontec/mpk-revival)**:

* Encoder/Decoder: [`editor/js/sysex_schema.js`](https://github.com/carlomontec/mpk-revival/blob/main/editor/js/sysex_schema.js)
* Web MIDI Engine: [`editor/js/midi_engine.js`](https://github.com/carlomontec/mpk-revival/blob/main/editor/js/midi_engine.js)
* Factory Preset Dumps (JSON + SYX): [`backups/`](https://github.com/carlomontec/mpk-revival/tree/main/backups)
