/**
 * MPK-Revival | SysEx Schema & Binary Serialization Engine
 * Full 1,033-byte memory layout for Akai MPK49
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiNoteToName(num) {
  const octave = Math.floor(num / 12) - 1;
  const name = NOTE_NAMES[num % 12];
  return `${name}${octave}`;
}

function nameToMidiNote(str) {
  const match = str.trim().match(/^([A-Ga-g][#b]?)(-?\d+)$/);
  if (!match) return 60;
  let [, note, oct] = match;
  note = note.toUpperCase();
  if (note === 'DB') note = 'C#';
  if (note === 'EB') note = 'D#';
  if (note === 'GB') note = 'F#';
  if (note === 'AB') note = 'G#';
  if (note === 'BB') note = 'A#';
  const idx = NOTE_NAMES.indexOf(note);
  if (idx === -1) return 60;
  return (parseInt(oct, 10) + 1) * 12 + idx;
}

class MPK49Preset {
  constructor(rawBytes = null) {
    if (rawBytes) {
      this.decode(rawBytes);
    } else {
      this.initDefault();
    }
  }

  initDefault() {
    this.rawBytes = new Uint8Array(1033);
    this.rawBytes[0] = 0xF0;
    this.rawBytes[1] = 0x47;
    this.rawBytes[2] = 0x00;
    this.rawBytes[3] = 0x6B;
    this.rawBytes[4] = 0x10;
    this.rawBytes[5] = 0x08;
    this.rawBytes[6] = 0x01;
    this.rawBytes[7] = 0x01; // Slot 1
    this.rawBytes[1032] = 0xF7;

    this.slot = 1;
    this.name = "MyPreset";
    this.tempo = 120;
    this.timeDivision = "1/16";

    // 4 Pad Banks (A, B, C, D) x 12 Pads
    this.pads = { A: [], B: [], C: [], D: [] };
    ['A', 'B', 'C', 'D'].forEach((bank, bIdx) => {
      for (let i = 0; i < 12; i++) {
        this.pads[bank].push({
          padIndex: i + 1,
          note: 36 + (bIdx * 12) + i, // C2, C#2...
          channel: 1,
          mode: 3, // Note
          aftertouch: 0
        });
      }
    });

    // 3 Banks (A, B, C) x 8 Controls
    this.faders = { A: [], B: [], C: [] };
    this.knobs = { A: [], B: [], C: [] };
    this.switches = { A: [], B: [], C: [] };

    ['A', 'B', 'C'].forEach((bank, bIdx) => {
      for (let i = 0; i < 8; i++) {
        this.faders[bank].push({
          index: i + 1,
          cc: 22 + i,
          min: 0,
          max: 127,
          channel: bIdx + 1
        });
        this.knobs[bank].push({
          index: i + 1,
          cc: 32 + i,
          min: 0,
          max: 127,
          channel: bIdx + 1
        });
        this.switches[bank].push({
          index: i + 1,
          cc: 12 + i,
          mode: 0, // Toggle
          channel: bIdx + 1
        });
      }
    });
  }

  decode(bytes) {
    if (bytes.length !== 1033) {
      throw new Error(`Invalid MPK49 SysEx length: ${bytes.length} bytes (expected 1033)`);
    }
    this.rawBytes = new Uint8Array(bytes);
    this.slot = bytes[7];

    // Name (bytes 8..15)
    let rawName = "";
    for (let i = 8; i < 16; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) rawName += String.fromCharCode(b);
    }
    this.name = rawName.trim() || `Slot${this.slot}`;

    // Pads
    // Bank A: 44, Bank B: 172, Bank C: 300, Bank D: 428
    const padBankOffsets = { A: 44, B: 172, C: 300, D: 428 };
    this.pads = { A: [], B: [], C: [], D: [] };

    for (const [bank, baseOffset] of Object.entries(padBankOffsets)) {
      for (let i = 0; i < 12; i++) {
        const off = baseOffset + (i * 8);
        this.pads[bank].push({
          padIndex: i + 1,
          mode: bytes[off],
          rawChannel: bytes[off + 1],
          channel: bytes[off + 1] === 16 ? "Common" : (bytes[off + 1] + 1), // 16 = Common channel
          note: bytes[off + 2],
          aftertouch: bytes[off + 3]
        });
      }
    }

    // Faders: offset 556, 24 records of 7 bytes (8 per bank A, B, C)
    this.faders = { A: [], B: [], C: [] };
    const faderBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 556 + (i * 7);
      const bank = faderBanks[Math.floor(i / 8)];
      this.faders[bank].push({
        index: (i % 8) + 1,
        channel: bytes[off + 1] + 1,
        cc: bytes[off + 2],
        min: bytes[off + 3],
        max: bytes[off + 4]
      });
    }

    // Switches: offset 724, 24 records of 5 bytes (8 per bank A, B, C)
    this.switches = { A: [], B: [], C: [] };
    const switchBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 724 + (i * 5);
      const bank = switchBanks[Math.floor(i / 8)];
      this.switches[bank].push({
        index: (i % 8) + 1,
        mode: bytes[off],
        channel: bytes[off + 1] + 1,
        cc: bytes[off + 2]
      });
    }

    // Knobs: offset 844, 24 records of 7 bytes (8 per bank A, B, C)
    this.knobs = { A: [], B: [], C: [] };
    const knobBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 844 + (i * 7);
      const bank = knobBanks[Math.floor(i / 8)];
      this.knobs[bank].push({
        index: (i % 8) + 1,
        channel: bytes[off + 1] + 1,
        cc: bytes[off + 2],
        min: bytes[off + 3],
        max: bytes[off + 4]
      });
    }
  }

  encode() {
    const bytes = new Uint8Array(this.rawBytes);

    // Slot
    bytes[7] = Math.max(1, Math.min(30, this.slot));

    // Name (padded to 8 chars)
    const paddedName = (this.name + "        ").slice(0, 8);
    for (let i = 0; i < 8; i++) {
      bytes[8 + i] = paddedName.charCodeAt(i);
    }

    // Encode Pads
    const padBankOffsets = { A: 44, B: 172, C: 300, D: 428 };
    for (const [bank, baseOffset] of Object.entries(padBankOffsets)) {
      if (!this.pads[bank]) continue;
      for (let i = 0; i < 12; i++) {
        const off = baseOffset + (i * 8);
        const p = this.pads[bank][i];
        if (p) {
          bytes[off] = p.mode ?? 3;
          bytes[off + 1] = Math.max(0, Math.min(16, p.rawChannel !== undefined ? p.rawChannel : ((p.channel || 1) - 1)));
          bytes[off + 2] = Math.max(0, Math.min(127, p.note));
          bytes[off + 3] = p.aftertouch ?? 0;
        }
      }
    }

    // Encode Faders
    const faderBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 556 + (i * 7);
      const bank = faderBanks[Math.floor(i / 8)];
      const f = this.faders[bank] ? this.faders[bank][i % 8] : null;
      if (f) {
        bytes[off + 1] = Math.max(0, Math.min(15, (f.channel || 1) - 1));
        bytes[off + 2] = Math.max(0, Math.min(127, f.cc));
        bytes[off + 3] = Math.max(0, Math.min(127, f.min));
        bytes[off + 4] = Math.max(0, Math.min(127, f.max));
      }
    }

    // Encode Switches
    const switchBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 724 + (i * 5);
      const bank = switchBanks[Math.floor(i / 8)];
      const sw = this.switches[bank] ? this.switches[bank][i % 8] : null;
      if (sw) {
        bytes[off] = sw.mode ?? 0;
        bytes[off + 1] = Math.max(0, Math.min(15, (sw.channel || 1) - 1));
        bytes[off + 2] = Math.max(0, Math.min(127, sw.cc));
      }
    }

    // Encode Knobs
    const knobBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 844 + (i * 7);
      const bank = knobBanks[Math.floor(i / 8)];
      const k = this.knobs[bank] ? this.knobs[bank][i % 8] : null;
      if (k) {
        bytes[off + 1] = Math.max(0, Math.min(15, (k.channel || 1) - 1));
        bytes[off + 2] = Math.max(0, Math.min(127, k.cc));
        bytes[off + 3] = Math.max(0, Math.min(127, k.min));
        bytes[off + 4] = Math.max(0, Math.min(127, k.max));
      }
    }

    this.rawBytes = bytes;
    return bytes;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { MPK49Preset, midiNoteToName, nameToMidiNote };
}
