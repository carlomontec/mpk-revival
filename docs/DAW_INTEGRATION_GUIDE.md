# Akai MPK49 Revival — DAW Integration & Console Manual
**Comprehensive Control Surface Guide for Ableton Live 12 & Reason 14**

---

## 1. The Unified 3-Bank Console Concept

The **MPK49 Revival** integration is built on an ergonomic 3-Bank architecture inspired by flagship professional hardware controllers (Akai APC40 mkII, Push 2, Mackie MCU). 

Instead of treating the MPK49's 8 faders, 8 knobs, and 8 switches as disconnected controls, each channel forms a unified vertical **Channel Strip**:

$$\text{Channel Strip } n = \text{Fader } n + \text{Knob } n + \text{Switch } n$$

Pressing the hardware **[BANK A]**, **[BANK B]**, or **[BANK C]** buttons instantaneously morphs all 24 controls between three production workflows:

```
+-----------------------------------------------------------------------------------+
| BANK A: Performance & Levels   | Faders: Volume 1-8   | Knobs: Macros 1-8 / Desk  | Switches: Arm / EQ   |
| BANK B: Mixer & Space          | Faders: Send A (Rev) | Knobs: Pan 1-8            | Switches: Mute 1-8   |
| BANK C: Isolation & Depth      | Faders: Send B (Dly) | Knobs: Macros 9-16 / Aux  | Switches: Solo 1-8   |
+-----------------------------------------------------------------------------------+
| TRANSPORT: Dedicated Buttons   | << Rewind (Bank Left) | >> Fast Fwd (Bank Right) | Stop, Play, Record   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Ableton Live 12 Integration

### Installation
* **Source in Repo**: `daw-integration/ableton/MPK49_Revival/`
* **Destination**:
  ```bash
  ~/Music/Ableton/User Library/Remote Scripts/MPK49_Revival/
  ```
* In Ableton Live: **Settings $\rightarrow$ Link, Tempo & MIDI $\rightarrow$ Control Surfaces**:
  - Control Surface: **`MPK49_Revival`**
  - Input: **`Akai MPK49 Port 1`**
  - Output: **`Akai MPK49 Port 1`**

### Hardware Preset
* **Preset File**: `presets/ableton12_studio.json` (`Live12`, Slot 02)
* **Transport Mode**: `MIDI CC`

### Mapping Grid

| Hardware Bank | Faders 1–8 | Knobs 1–8 | Switches 1–8 (Toggle) |
| :--- | :--- | :--- | :--- |
| **Bank A** *(Play & Balance)* | **Track Volume 1–8** | **Device Macros 1–8** *(Blue Hand)* | **Track Arm 1–8** |
| **Bank B** *(Mix & Space)* | **Send A (Reverb) 1–8** | **Track Pan 1–8** | **Track Mute 1–8** |
| **Bank C** *(Isolation & Depth)*| **Send B (Delay) 1–8** | **Device Macros 9–16** | **Track Solo 1–8** |

### Navigation & Transport
* **`<<` (Rewind / CC 115)**: Shifts the 8-track red/blue session ring **Left** by 8 tracks (e.g., Tracks 9–16 $\rightarrow$ 1–8).
* **`>>` (Fast Forward / CC 116)**: Shifts the 8-track session ring **Right** by 8 tracks (e.g., Tracks 1–8 $\rightarrow$ 9–16).
* **STOP (CC 117), PLAY (CC 118), REC (CC 119)**: Standard Ableton transport control.
* **Auto-Appointed Device ("Blue Hand")**: Initialized with `device_selection_follows_track_selection=True`. Whenever you select a track, Knobs 1–8 instantly latch onto that track's focused instrument or effect rack.

---

## 3. Reason 14 Integration

### Installation
* **Source in Repo**: `daw-integration/reason/`
* **Installer**:
  ```bash
  cd /Users/carlo/code/code_music/mpk-revival && ./daw-integration/install_reason_user.sh
  ```
* **Destination (User Library — zero sudo needed)**:
  - Codec & Image: `~/Library/Application Support/Propellerhead Software/Remote/Codecs/Lua Codecs/Akai/`
  - RemoteMap: `~/Library/Application Support/Propellerhead Software/Remote/Maps/Akai/`
* In Reason 14: **Settings $\rightarrow$ Control Surfaces**:
  - Manufacturer: **`Akai`**  |  Model: **`MPK49 Revival`**
  - In Port: **`Akai MPK49 Port 1`**
  - Out Port: **`Akai MPK49 Port 1`**

### Hardware Preset
* **Preset File**: `presets/reason14_rack_slot30.json` (`Reason14`, Slot 30)
* **Transport Mode**: `MMC`

---

### Understanding Reason's Surface Targeting Modes

Reason manages control surface focus differently from other DAWs. There are two distinct operating modes:

#### Mode 1: Follow Master Keyboard (Instrument Focus)
* By default, the MPK49 follows the active track in the sequencer.
* When an instrument is selected (e.g., **Europa**, **Monotone**, **Thor**, **Mimic**, **Radical Piano**), your keys play notes, Knobs 1–8 control synth filters/envelopes, and Faders 1–8 control amp envelopes or macros.

#### Mode 2: Locked Desk (SSL Main Mixer Desk)
* To turn your MPK49 into a dedicated SSL mixing console:
  1. Open top menu: **Options $\rightarrow$ Surface Locking...**
  2. Select **`Akai MPK49 Revival`** $\rightarrow$ Lock to: **`Master Section`** $\rightarrow$ OK.
* The 8 faders, knobs, and switches permanently lock to the SSL mixer desk, even while you audition instruments with your mouse!

---

### SSL Main Mixer (`Reason Master Section`) Mapping Grid

| Hardware Bank | Faders 1–8 | Knobs 1–8 | Switches 1–8 (Toggle) |
| :--- | :--- | :--- | :--- |
| **Bank A** *(Desk Levels)* | **Channel 1–8 Levels (Faders)** | **K1–K5: Master Bus Comp (K6–K8 Free)** | **Channel 1–8 EQ On (Bypass)** |
| **Bank B** *(Mix & Pan)* | **Channel 1–8 FX1 Send (Reverb)** | **Channel 1–8 Pan (L/R)** | **Channel 1–8 Mute** |
| **Bank C** *(Aux & Returns)* | **Channel 1–8 FX2 Send (Delay)** | **FX1–FX8 Return Levels** | **Channel 1–8 Solo** |

#### Knob Allocations in Master Section:
* **Bank A (Master Bus Compressor)**:
  * **K1**: Master Bus Compressor **Threshold**
  * **K2**: Master Bus Compressor **Ratio**
  * **K3**: Master Bus Compressor **Attack**
  * **K4**: Master Bus Compressor **Release**
  * **K5**: Master Bus Compressor **Make-Up Gain**
  * **K6–K8**: **Free / Unassigned** (Ready for custom Remote Overrides or global macros)
* **Bank B (Stereo Field)**:
  * **K1–K8**: **Channel 1–8 Pan** (Left $\leftrightarrow$ Right)
* **Bank C (FX Returns Desk)**:
  * **K1–K8**: **FX1 Return Level** through **FX8 Return Level** (All 8 master effect returns)

#### Channel Banking & Transport in Reason:
* **`<<` (Rewind)**: `Previous 8 Remote Base Channel` (shifts 8-fader mixer window left).
* **`>>` (Fast Forward)**: `Next 8 Remote Base Channel` (shifts 8-fader mixer window right).
* **Stop, Play, Record**: Transport control (MMC).

---

### Supported Reason 14 Synths & Instruments (Auto-Mapped)

When the controller follows an instrument in the rack:

| Device | Primary Knob Controls (K1–K8) | Primary Fader Controls (F1–F8) | Switches (S1–S4) |
| :--- | :--- | :--- | :--- |
| **Combinator** | Rotaries 1–4, Master Controls | Unassigned / Macro Levels | Buttons 1–4 |
| **Europa** | Wave Shape, Harmonics, Filter Cutoff/Res, Env Rates | Filter Env ADSR, Amp Env ADSR | Filter On/Off, Harmonics State |
| **Grain** | Grain Position, Jitter, Length, Speed, Filter Cutoff | Amp Env ADSR, Master Level | Filter On/Off, Freeze |
| **Mimic** | Filter Cutoff/Reso, Sample Start, End, Pitch | Amp Env ADSR, Master Volume | Playback Mode |
| **Monotone** | Filter Cutoff, Reso, Drive, Glide, Sub Level | Filter Env Attack/Decay, Amp Env Attack/Rel | Filter On |
| **Processed Pianos (Radical)** | Mic A Dry Level, Attack, LowCut, HiCut, Pan, Reverb | Hammer Noise, Release Resonance, FX Level | Mic A On/Off, Mic B On/Off |
| **Complex-1** | Osc 1/2 Shapes & FM, Comb/LP12 Filters | Envelope ADSR | Mod State |
| **Klang** | Filter Cutoff, Reso, Env Amt, Semitune | Filter Env ADSR | Filter On/Off |
| **Kong** | Drum 1–8 Pans | Drum 1–8 Levels | Drum Mutes |
| **Redrum** | Channel Pitch / Pan | Channel 1–8 Levels | Channel 1–8 Mutes |
| **Thor** | Filter 1 Cutoff, Reso, Mod Amt, LFO Rates | Filter Env ADSR, Amp Env ADSR | Osc 1–3 State |
| **SubTractor** | Filter 1 Cutoff, Reso, Filter 2 Freq/Res | Filter Env ADSR, Amp Env ADSR | Filter Links |
| **NN-XT** | Filter Cutoff, Reso, Ext Mod, LFO 1 Rate | Amp Env ADSR, Mod Env ADSR | Key Track |
| **Master Bus Compressor** | Threshold, Ratio, Attack, Release, Make-Up | — | Compressor On/Off |

---

## 4. Hardware Preset Storage & Slots

The Akai MPK49 stores up to **30 presets** in internal EEPROM memory:

* **Slot 01**: `LiveLite` (Factory Default)
* **Slot 02**: `Live12` (MPK Revival Studio Console for Ableton Live 12)
* **Slot 03**: `Reason` (Factory Default — preserved!)
* **Slot 04**: `MassiveX` (Native Instruments Massive X Performance Map)
* **Slot 05**: `Monark` (Native Instruments Monark Minimoog Map)
* **Slot 06**: `Battery4` (Native Instruments Battery 4 Drum Matrix)
* **Slot 30**: `Reason14` (MPK Revival SSL Mixer & Synth Console for Reason 14)

### Web Studio Management
Open [http://localhost:8080](http://localhost:8080) in Chrome/Edge to load, inspect, edit, and transmit presets over Web MIDI with live hardware sensing.
