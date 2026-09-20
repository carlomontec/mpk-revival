# Akai MPK49 Agent Preset Creation Guide

This document is the definitive guide for AI coding assistants and autonomous agents to design, construct, validate, and compile custom presets for the **Akai MPK49 USB/MIDI Controller**.

---

## 1. Architectural Philosophy: The "Sound Architect AI"

When assisting human music producers with the Akai MPK49:

> 🛡️ **SAFETY DIRECTIVE**:  
> **Never attempt to flash or send SysEx dumps to the physical controller directly in autonomous or batch mode.** Hardware EEPROMs on legacy USB controllers can be corrupted by unmonitored bulk writes.  
> 
> **The Safe Workflow**:  
> 1. The **AI Agent** acts as the **Preset Architect**: researches MIDI implementation charts, designs ergonomic mappings, generates human-readable `.json` presets, and validates them using the compiler.  
> 2. The **Human Producer** loads the generated template into the **MPK-Revival Web Studio**, visually reviews the layout on the virtual controller, tests with virtual instruments, and manually clicks `[⚡️ Send to MPK49]` when ready.

---

## 2. Hardware Physical Topology & Ergonomics

The Akai MPK49 physical control surface is organized into discrete banks:

```
┌────────────────────────────────────────────────────────────────────────┐
│  [Pitch] [Mod]   [Master Blue LCD Display]    [P1] [P2] [P3] [P4]       │
│                  [Rotary Value Encoder]       [P5] [P6] [P7] [P8] (Pads)│
│                                               [P9][P10][P11][P12]       │
│  [K1] [K2] [K3] [K4] [K5] [K6] [K7] [K8]     (Bank A / B / C / D)       │
│  [F1] [F2] [F3] [F4] [F5] [F6] [F7] [F8]     (Faders Bank A / B / C)    │
│  [S1] [S2] [S3] [S4] [S5] [S6] [S7] [S8]     (Switches Bank A / B / C)  │
│  [REW] [FF] [STOP] [PLAY] [REC]               (Transport Buttons)       │
│  [49 Full-Sized Semi-Weighted Keys with Channel Aftertouch]            │
└────────────────────────────────────────────────────────────────────────┘
```

### Physical Control Capabilities:
1. **8 Rotary Knobs (K1–K8)** $\times$ **3 Banks (A, B, C)** = **24 Total Knobs**:
   - $360^\circ$ continuous pots with 270-degree travel indication.
   - Configurable per knob: MIDI Channel, CC Number ($0..127$), Min Range ($0..127$), Max Range ($0..127$).
2. **8 Long-Throw Faders (F1–F8)** $\times$ **3 Banks (A, B, C)** = **24 Total Faders**:
   - Smooth 45mm throw.
   - Configurable per fader: MIDI Channel, CC Number ($0..127$), Min Range ($0..127$), Max Range ($0..127$).
3. **8 Assignable Switches / Buttons (S1–S8)** $\times$ **3 Banks (A, B, C)** = **24 Total Switches**:
   - Tactile rubber pushbuttons with red LED indicator dots.
   - Configurable per switch: MIDI Channel, CC Number ($0..127$), and **Mode**:
     - **Toggle (`TGL`) / `1`**: LED toggles on/off with each press; sends CC 127 on press 1, CC 0 on press 2.
     - **Momentary (`MMT`) / `0`**: LED lights only while depressed; sends CC 127 on press, CC 0 on release.
4. **12 Genuine MPC Drum Pads** $\times$ **4 Banks (A, B, C, D)** = **48 Total Pads**:
   - Velocity-sensitive and pressure-sensitive (Polyphonic or Channel Aftertouch).
   - Configurable per pad: Note Number ($0..127$ or name `C1`), MIDI Channel, Mode, Aftertouch type.
5. **Wheels & Pedals**:
   - Modulation Wheel (Default: CC 1).
   - Expression Pedal input (Default: CC 11).
   - Sustain Foot Switch 1 (Default: CC 64).
   - Foot Switch 2 (Default: CC 65).
6. **Hardware Slot Memory**:
   - **30 Internal Slots** (`01` to `30`).

---

## 3. The Semantic JSON Preset Schema

AI agents must author presets using this clean, human-readable JSON schema (saved in `presets/<preset_name>.json`). The offline compiler and the web editor both ingest this format directly:

```json
{
  "name": "Live12",
  "slot": 2,
  "description": "Ableton Live 12 Studio Template: 8 Macros, 8 Faders, 8 Mutes (Toggle), and 4x3 Drum Rack MPC Pads",
  "global": {
    "keybedChannel": "1A",
    "tempo": 120,
    "transportMode": "MIDI CC",
    "timeDivision": "1/16",
    "arpType": "Up",
    "arpGate": 50,
    "arpSwing": 50
  },
  "knobs": {
    "A": [
      { "index": 1, "name": "Macro 1", "cc": 22, "channel": "1A", "min": 0, "max": 127 },
      { "index": 2, "name": "Macro 2", "cc": 23, "channel": "1A", "min": 0, "max": 127 }
    ],
    "B": [],
    "C": []
  },
  "faders": {
    "A": [
      { "index": 1, "name": "Track 1 Vol", "cc": 12, "channel": "1A", "min": 0, "max": 127 }
    ],
    "B": [],
    "C": []
  },
  "switches": {
    "A": [
      { "index": 1, "name": "Mute 1", "cc": 32, "channel": "1A", "mode": "Toggle" },
      { "index": 2, "name": "Tap Tempo", "cc": 33, "channel": "1A", "mode": "Momentary" }
    ],
    "B": [],
    "C": []
  },
  "pads": {
    "A": [
      { "index": 1, "name": "Kick", "note": "C1", "channel": "1A" },
      { "index": 2, "name": "Snare", "note": "D1", "channel": "1A" }
    ],
    "B": [],
    "C": [],
    "D": []
  }
}
```

### Schema Rules & Validation Criteria:
* **`name`** *(string, required)*: Max **8 ASCII characters** (e.g. `Live12`, `Reason14`, `Kontakt`, `Massive`). The hardware LCD screen supports mixed upper and lower case.
* **`slot`** *(number, required)*: Hardware slot destination, $1 \le \text{slot} \le 30$.
* **`channel`** *(string or number)*:
  * `"Common"` / `0`: Follows the keybed channel dynamically.
  * `"1A"` to `"16A"`: Virtual Output Port A, channels 1 to 16.
  * `"1B"` to `"16B"`: Virtual Output Port B, channels 1 to 16.
* **`mode` (for Switches)**:
  * `"Toggle"` or `1`: Switch button LED toggles On/Off; sends 127 then 0.
  * `"Momentary"` or `0`: Active only while held down; sends 127 on press, 0 on release.
* **`note` (for MPC Pads)**:
  * String name (e.g. `"C1"`, `"F#2"`, `"A#0"`) or integer MIDI note ($0..127$).
  * Any unassigned pads or controls automatically fallback to clean factory defaults.

---

## 4. Proven Ergonomic Design Patterns

When designing presets for specific instruments or DAWs, follow these established studio conventions:

### Pattern A: Ableton Live 12 Control Surface
* **Target DAW**: Ableton Live 11/12
* **Knobs Bank A**: Device Macro Controls 1 to 8 (`CC 22..29`).
* **Knobs Bank B**: Send FX A1 to A8 (`CC 30, 31, 40..45`).
* **Faders Bank A**: Track Volumes 1 to 8 (`CC 12..19`).
* **Switches Bank A**: Track Mutes / Activators 1 to 8 (`CC 32..39`), **Mode: Toggle**.
* **Pads Bank A**: Ableton Drum Rack Bottom 12 Pads (`C1` to `B1`, notes $24..35$).
* **Pads Bank B**: Ableton Drum Rack Upper 12 Pads (`C2` to `B2`, notes $36..47$).

### Pattern B: Reason 14 Mixer & Combinator Rack
* **Target DAW**: Reason Studios 12/13/14
* **Knobs Bank A**: Combinator Rotaries 1 to 4 (`CC 2..5`) + Global Filter/Pan (`CC 6..9`).
* **Faders Bank A**: Mixer Channel Faders 1 to 8 (`CC 12..19`).
* **Switches Bank A**: Combinator Buttons 1 to 4 (`CC 21..24`, **Mode: Toggle**) + Mute Bypasses (`CC 25..26`, **Mode: Toggle**) + Punch/Tap (`CC 27..28`, **Mode: Momentary**).
* **Pads Bank A**: Kong Drum Designer / Redrum 12 Pads (`C1` Bass Drum, `D1` Snare, `D#1` Clap, etc.).

### Pattern C: Native Instruments Kontakt (Cinematic & Orchestral)
* **Target Instrument**: Kontakt 7 / Kontakt 8, Spitfire Audio, Orchestral Tools, Heavyocity
* **Faders Bank A (Performance Envelopes & Expression)**:
  * `F1`: **CC 1** (Dynamics / Modulation Crossfade — vital for orchestral instruments).
  * `F2`: **CC 11** (Expression).
  * `F3`: **CC 7** (Main Instrument Volume).
  * `F4`: **CC 10** (Stereo Pan).
  * `F5`: **CC 21** (Vibrato Intensity).
  * `F6`: **CC 2** (Breath / High-pass filter).
  * `F7`: **CC 67** (Soft / Una Corda tone).
  * `F8`: **CC 84** (Portamento / Legato transition speed).
* **Knobs Bank A**: Kontakt Script Quick Controls 1 to 8 (`CC 14..21`).
* **Switches Bank A**: Key Switch / Articulation triggers (Legato, Staccato, Pizzicato, Spiccato), **Mode: Momentary**.
* **Pads Bank A**: Orchestral Percussion (Gran Cassa, Timpani, Field Snare, Piatti, Tam-Tam).

### Pattern D: Synthesizers (Massive, Monark, Vital, Serum, Diva)
* **Knobs Bank A (Oscillators & Filter)**:
  * `K1`: Cutoff (`CC 74`).
  * `K2`: Resonance (`CC 71`).
  * `K3`: Filter Envelope Amount (`CC 79`).
  * `K4`: Oscillator 1 / Wavetable Position (`CC 76`).
  * `K5`: Oscillator 2 / Sub Level (`CC 77`).
  * `K6`: Drive / Saturation (`CC 78`).
  * `K7`: Chorus / Spread (`CC 93`).
  * `K8`: Reverb Send (`CC 91`).
* **Faders Bank A (Amp Envelope ADSR)**:
  * `F1`: Attack (`CC 73`).
  * `F2`: Decay (`CC 75`).
  * `F3`: Sustain (`CC 70`).
  * `F4`: Release (`CC 72`).
  * `F5..F8`: Filter ADSR Envelope.
* **Switches Bank A**: Filter Bypass (`CC 110`, Toggle), Arp/FX Bypass (`CC 111`, Toggle).

---

## 5. Step-by-Step Agent Workflow to Generate Presets

When a user asks for a preset:

1. **Clarify or Research the Target Tool**:
   - Identify the DAW or virtual instrument's standard CC mapping (or propose the optimal ergonomic layout).
2. **Draft the JSON Template**:
   - Create a clean JSON file in `presets/<target_name>.json`.
   - Ensure the name is $\le 8$ characters (e.g. `Serum`, `Live12`, `Kontakt`).
3. **Compile and Validate**:
   - Run the compiler CLI:
     ```bash
     node tools/compile_preset.js presets/<target_name>.json
     ```
   - Check the output: ensure 0 validation errors and confirm that `presets/<target_name>.syx` is written (exactly 1,033 bytes).
4. **Instruct the User**:
   - Inform the user of the new `.json` and `.syx` files.
   - Instruct them to open or drag and drop `presets/<target_name>.json` into the **MPK-Revival Web Studio** ([http://localhost:8080](http://localhost:8080)) to visually inspect the virtual knobs, faders, and pads.
   - Remind the user that they can test with sound and manually click `[⚡️ Send to MPK49]` when ready.
