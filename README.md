# MPK-Revival 🎹⚡️

> Bringing the legendary **Akai MPK49** into the modern music production era.

A modern, zero-install Web MIDI Editor, SysEx Librarian, and open hardware specification for the Akai MPK49 (with architectural compatibility for MPK25, MPK61, and MPK88).

![MPK-Revival Studio Editor](docs/assets/mpk_revival_editor.png)

> [!WARNING]
> **Experimental Status**: This project is currently in an active, experimental development phase. Always back up your keyboard presets before flashing custom SysEx dumps to hardware.
>
> 🤖 **Developed with Google Antigravity 3.8 Flash**: The entire reverse-engineering workflow, SysEx parser, Web MIDI driver, and visual hardware editor are pair-programmed and coded using **Google Antigravity (AGY) with Gemini 3.8 Flash**.

---

## 🌟 Why MPK-Revival?

The Akai MPK49 is one of the most rugged, responsive MIDI controllers ever built—featuring semi-weighted keys with aftertouch, genuine MPC-style velocity-sensitive drum pads, continuous 360° rotary encoders, and long-throw faders.

However, when inMusic acquired Akai Professional, official software support was discontinued. The original **Vyzex MPK49** editor software is an abandoned 32-bit legacy application from the Windows XP / Mac OS X 10.5 era that cannot run on modern 64-bit operating systems (macOS Catalina+, Windows 11 64-bit). Without software, musicians were left with no way to back up or edit presets on their computer.

**MPK-Revival solves this completely:**
- 🌐 **Zero-Install Web MIDI Studio**: Open in Chrome, Edge, Brave, or Opera—no drivers, installations, or legacy software needed.
- 🎯 **Live Hardware Follow**: Touch any slider, knob, switch, pad, or piano key on your desk, and the editor instantly highlights that exact control on screen for immediate custom assignment.
- 💾 **Universal SysEx Librarian**: Back up, inspect, edit, and push presets straight to/from the keyboard memory slots (1–30).
- 📜 **Full Community Hardware Specification**: We reverse-engineered the entire 1,033-byte SysEx memory layout and published it openly for the music and developer community.
- 🎛️ **DAW Integrations**:
  - **Reason 14**: Dedicated Remote Codecs & Remote Maps taking full advantage of Reason Combinators and Mixer.
  - **Ableton Live (MPK49++)**: Modern Python 3 control scripts with session focus ring and mixer control.

---

## 🚀 Quick Start (Running the Editor)

You can run the web editor locally with Python, Node.js, or any static HTTP server:

```bash
cd editor
python3 -m http.server 8080
```

1. Open **`http://localhost:8080`** in your Web MIDI compatible browser.
2. Connect your Akai MPK49 via USB.
3. Click **`[🔌 Connect MIDI]`**.
4. Set **`🎹 MPK on Desk:`** to the slot your keyboard is currently running (e.g. `Slot 02: LiveLite`).
5. Move any physical fader or knob—the visual console will jump directly to that control in real-time!

---

## 🔬 Reverse-Engineered Hardware Specification

Because Akai never released an official SDK or SysEx protocol guide, we dumped all 30 factory memory slots and reverse-engineered the internal 1,033-byte memory layout.

👉 **Read the full community specification**:  
📘 **[Akai MPK49 SysEx & Hardware Architecture Specification](docs/AKAI_MPK49_SYSEX_SPECIFICATION.md)**

### Key Byte Memory Offsets (Summary)

| Block | Byte Range | Size | Record Description |
| :--- | :--- | :--- | :--- |
| **SysEx Header** | `0000..0006` | 7 B | `F0 47 00 6B 10 08 01` (Preset Dump Header) |
| **Slot Number** | `0007` | 1 B | Slot 1 (`0x01`) to Slot 30 (`0x1E`) |
| **Preset Name** | `0008..0015` | 8 B | 8 ASCII characters (**LCD renders mixed/lower case!**) |
| **Global / Arpeggiator** | `0016..0043` | 28 B | Tempo, Clock, Time Division, Swing, Gate, Transport Mode |
| **MPC Drum Pads** | `0044..0555` | 512 B | 4 Banks (A–D) × 12 pads = 48 pads (8 bytes each) |
| **Rotary Knobs (K1–K8)**| `0556..0723` | 168 B | 3 Banks (A–C) × 8 knobs = 24 knobs (7 bytes each) |
| **Sliders / Faders (F1–F8)**| `0724..0843` | 120 B | 3 Banks (A–C) × 8 faders = 24 faders (5 bytes each) |
| **Switches / Buttons (S1–S8)**| `0844..1011` | 168 B | 3 Banks (A–C) × 8 switches = 24 switches (7 bytes each) |
| **Wheels & Pedals** | `1012..1031` | 20 B | Mod Wheel (1013), Expression (1019), Sustain (1024) |
| **SysEx End** | `1032` | 1 B | `0xF7` (End of Exclusive) |

---

## 🛠️ Repository Structure

```
mpk-revival/
├── editor/                  # Web MIDI Visual Studio Application
│   ├── index.html           # 2-Row Topbar, Retro Synth Console, & Gapless 49 Keybed
│   ├── css/                 # Modern styling & hardware-accurate layout
│   └── js/
│       ├── app.js           # Core application logic & Live Hardware Sensing
│       ├── sysex_schema.js  # 1,033-byte encoder, decoder, and data structures
│       ├── midi_engine.js   # Web MIDI API input/output driver
│       └── factory_data.js  # Bundled ROM dumps of all 30 factory presets
├── docs/
│   ├── AKAI_MPK49_SYSEX_SPECIFICATION.md  # Complete community open spec
│   └── assets/              # UI screenshots and diagrams
├── backups/                 # Dumps of all 30 original factory presets (JSON & SYX)
└── AGENTS.md                # Project development rules & constraints
```

---

## 🤝 Community & Contributions

Contributions, bug reports, and pull requests are welcome! If you have additional hardware test dumps from an **MPK25**, **MPK61**, or **MPK88**, please feel free to open a PR.

* **Author**: [@carlomontec](https://github.com/carlomontec)
* **License**: [MIT](LICENSE) © 2026
