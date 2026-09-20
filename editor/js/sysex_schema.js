/**
 * MPK-Revival | SysEx Schema & Binary Serialization Engine
 * Full 1,033-byte memory layout for Akai MPK49
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const TIME_DIVISIONS = ['1/4', '1/4T', '1/8', '1/8T', '1/16', '1/16T', '1/32', '1/32T'];
const ARP_TYPES = ['Up', 'Down', 'Incl', 'Excl', 'Rand', 'Order'];
const TRANSPORT_MODES = ['MMC', 'MMC/MIDI', 'MIDI RT', 'MIDI CC'];

function midiChannelToDisplay(rawByte) {
  if (rawByte === 0 || rawByte === undefined || rawByte === null) return 'Common';
  if (rawByte >= 1 && rawByte <= 16) return `${rawByte}A`;
  if (rawByte >= 17 && rawByte <= 32) return `${rawByte - 16}B`;
  return 'Common';
}

function displayToMidiChannel(val) {
  if (val === 'Common' || val === 0 || !val) return 0;
  if (typeof val === 'string') {
    if (val.endsWith('A')) return parseInt(val, 10);
    if (val.endsWith('B')) return parseInt(val, 10) + 16;
  }
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

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

const GENERIC_TEMPLATE_B64 = "8EcAaxAIAR5HZW5lcmljIAB4AQQBMjoBBAI8MgADAQECAAAAAAAAAAAAAAADACQAAQAAAAMAJQABAAAAAwAmAAEAAAADACcAAQAAAAMAKAABAAAAAwApAAEAAAADACoAAQAAAAMAKwABAAAAAwAsAAEAAAADAC0AAQAAAAMALgABAAAAAwAvAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAMAABAAAAAwAxAAEAAAADADIAAQAAAAMAMwABAAAAAwA0AAEAAAADADUAAQAAAAMANgABAAAAAwA3AAEAAAADADgAAQAAAAMAOQABAAAAAwA6AAEAAAADADsAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwA8AAEAAAADAD0AAQAAAAMAPgABAAAAAwA/AAEAAAADAEAAAQAAAAMAQQABAAAAAwBCAAEAAAADAEMAAQAAAAMARAABAAAAAwBFAAEAAAADAEYAAQAAAAMARwABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAEgAAQAAAAMASQABAAAAAwBKAAEAAAADAEsAAQAAAAMATAABAAAAAwBNAAEAAAADAE4AAQAAAAMATwABAAAAAwBQAAEAAAADAFEAAQAAAAMAUgABAAAAAwBTAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwB/f38AAAkAf39/AAAOAH9/fwAADwB/f38AABAAf39/AAARAH9/fwAAEgB/f38AABMAf39/AAA0AH9/fwAANQB/f38AADYAf39/AAA3AH9/fwAAOQB/f38AADoAf39/AAA7AH9/fwAAPAB/f38AAFMAf39/AABVAH9/fwAAVgB/f38AAFcAf39/AABYAH9/fwAAWQB/f38AAFoAf39/AABbAH9/fwAAFAB/AAAVAH8AABYAfwAAFwB/AAAYAH8AABkAfwAAGgB/AAAbAH8AAD0AfwAAPgB/AAA/AH8AAEYAfwAARwB/AABIAH8AAEkAfwAASgB/AABcAH8AAF0AfwAAXgB/AABfAH8AAGYAfwAAZwB/AABoAH8AAGkAfwAAHAEAAAAAAB0BAAAAAAAeAQAAAAAAHwEAAAAAACMBAAAAAAApAQAAAAAALgEAAAAAAC8BAAAAAABLAQAAAAAATAEAAAAAAE0BAAAAAABOAQAAAAAATwEAAAAAAFABAAAAAABRAQAAAAAAUgEAAAAAAGoBAAAAAABrAQAAAAAAbAEAAAAAAG0BAAAAAABuAQAAAAAAbwEAAAAAAHABAAAAAABxAQAAAAABAH8AAAELAH8AAUAAAAABQAAA9w==";

function getGenericTemplateBytes() {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(GENERIC_TEMPLATE_B64, 'base64'));
  }
  const binary = atob(GENERIC_TEMPLATE_B64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

class MPK49Preset {
  constructor(data = null) {
    if (data instanceof Uint8Array || (Array.isArray(data) && typeof data[0] === 'number')) {
      this.decode(data);
    } else if (data && typeof data === 'object') {
      this.initDefault();
      this.fromJSON(data);
    } else {
      this.initDefault();
    }
  }

  fromJSON(json) {
    if (!json || typeof json !== 'object') return this;

    if (json.name) {
      this.name = String(json.name).trim().slice(0, 8);
    }
    if (json.slot !== undefined) {
      this.slot = Math.max(1, Math.min(30, parseInt(json.slot, 10) || 1));
    }
    if (json.description) {
      this.description = String(json.description);
    }

    // Global / Arp
    if (json.global) {
      const g = json.global;
      if (g.keybedChannel !== undefined) {
        this.global.keybedChannel = g.keybedChannel;
      }
      if (g.tempo !== undefined) {
        this.global.tempo = Math.max(30, Math.min(300, parseInt(g.tempo, 10)));
      }
      if (g.transportMode !== undefined) {
        this.global.transportMode = g.transportMode;
        const idx = TRANSPORT_MODES.indexOf(g.transportMode);
        if (idx !== -1) this.global.transportModeIdx = idx;
      }
      if (g.timeDivision !== undefined) {
        this.global.timeDivision = g.timeDivision;
        const idx = TIME_DIVISIONS.indexOf(g.timeDivision);
        if (idx !== -1) this.global.timeDivisionIdx = idx;
      }
      if (g.arpType !== undefined) {
        this.global.arpType = g.arpType;
        const idx = ARP_TYPES.indexOf(g.arpType);
        if (idx !== -1) this.global.arpTypeIdx = idx;
      }
      if (g.arpGate !== undefined) {
        this.global.arpGate = Math.max(0, Math.min(100, parseInt(g.arpGate, 10)));
      }
      if (g.arpSwing !== undefined) {
        this.global.arpSwing = Math.max(50, Math.min(75, parseInt(g.arpSwing, 10)));
      }
    }

    // Wheels & Pedals
    if (json.wheels) {
      ['modWheel', 'expressionPedal', 'sustainPedal', 'footSwitch2'].forEach(w => {
        if (json.wheels[w]) {
          this.wheels[w] = Object.assign({}, this.wheels[w], json.wheels[w]);
        }
      });
    }

    // Knobs (A, B, C)
    if (json.knobs) {
      ['A', 'B', 'C'].forEach(bank => {
        if (Array.isArray(json.knobs[bank])) {
          json.knobs[bank].forEach((item, i) => {
            const idx = (item.index !== undefined ? item.index - 1 : i);
            if (idx >= 0 && idx < 8 && this.knobs[bank][idx]) {
              const k = this.knobs[bank][idx];
              if (item.cc !== undefined) k.cc = Math.max(0, Math.min(127, parseInt(item.cc, 10)));
              if (item.channel !== undefined) k.channel = String(item.channel);
              if (item.min !== undefined) k.min = Math.max(0, Math.min(127, parseInt(item.min, 10)));
              if (item.max !== undefined) k.max = Math.max(0, Math.min(127, parseInt(item.max, 10)));
              if (item.name) k.name = String(item.name);
            }
          });
        }
      });
    }

    // Faders (A, B, C)
    if (json.faders) {
      ['A', 'B', 'C'].forEach(bank => {
        if (Array.isArray(json.faders[bank])) {
          json.faders[bank].forEach((item, i) => {
            const idx = (item.index !== undefined ? item.index - 1 : i);
            if (idx >= 0 && idx < 8 && this.faders[bank][idx]) {
              const f = this.faders[bank][idx];
              if (item.cc !== undefined) f.cc = Math.max(0, Math.min(127, parseInt(item.cc, 10)));
              if (item.channel !== undefined) f.channel = String(item.channel);
              if (item.min !== undefined) f.min = Math.max(0, Math.min(127, parseInt(item.min, 10)));
              if (item.max !== undefined) f.max = Math.max(0, Math.min(127, parseInt(item.max, 10)));
              if (item.name) f.name = String(item.name);
            }
          });
        }
      });
    }

    // Switches (A, B, C)
    if (json.switches) {
      ['A', 'B', 'C'].forEach(bank => {
        if (Array.isArray(json.switches[bank])) {
          json.switches[bank].forEach((item, i) => {
            const idx = (item.index !== undefined ? item.index - 1 : i);
            if (idx >= 0 && idx < 8 && this.switches[bank][idx]) {
              const s = this.switches[bank][idx];
              if (item.cc !== undefined) s.cc = Math.max(0, Math.min(127, parseInt(item.cc, 10)));
              if (item.channel !== undefined) s.channel = String(item.channel);
              if (item.mode !== undefined) {
                if (typeof item.mode === 'string') {
                  s.mode = item.mode.toLowerCase().includes('tog') ? 1 : 0;
                } else {
                  s.mode = item.mode ? 1 : 0;
                }
              }
              if (item.name) s.name = String(item.name);
            }
          });
        }
      });
    }

    // MPC Pads (A, B, C, D)
    if (json.pads) {
      ['A', 'B', 'C', 'D'].forEach(bank => {
        if (Array.isArray(json.pads[bank])) {
          json.pads[bank].forEach((item, i) => {
            const idx = (item.index !== undefined ? item.index - 1 : (item.padIndex !== undefined ? item.padIndex - 1 : i));
            if (idx >= 0 && idx < 12 && this.pads[bank][idx]) {
              const p = this.pads[bank][idx];
              if (item.note !== undefined) {
                if (typeof item.note === 'string') {
                  p.note = nameToMidiNote(item.note);
                  p.noteName = item.note.toUpperCase();
                } else {
                  p.note = Math.max(0, Math.min(127, parseInt(item.note, 10)));
                  p.noteName = midiNoteToName(p.note);
                }
              }
              if (item.channel !== undefined) p.channel = String(item.channel);
              if (item.mode !== undefined) p.mode = item.mode;
              if (item.aftertouch !== undefined) p.aftertouch = item.aftertouch;
              if (item.name) p.name = String(item.name);
            }
          });
        }
      });
    }

    this.encode();
    return this;
  }

  toSemanticJSON() {
    return {
      device: "Akai MPK49",
      name: this.name,
      slot: this.slot,
      description: this.description || "",
      global: this.global,
      wheels: this.wheels,
      knobs: this.knobs,
      faders: this.faders,
      switches: this.switches,
      pads: this.pads
    };
  }

  initDefault() {
    const baseBytes = getGenericTemplateBytes();
    this.decode(baseBytes);
    this.name = "MyPreset";
    this.slot = 1;
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

    // Global & Arpeggiator (bytes 16..43)
    const timeDivIdx = bytes[19] !== undefined ? bytes[19] : 4;
    const arpTypeIdx = bytes[24] !== undefined ? bytes[24] : 0;
    const arpRangeIdx = bytes[25] !== undefined ? bytes[25] : 0;
    const transModeIdx = bytes[32] !== undefined ? bytes[32] : 3;

    this.global = {
      keybedChannel: (bytes[16] || 0) + 1,
      tempo: bytes[17] || 120,
      clockSource: (bytes[18] === 1 ? 'Internal' : 'External'),
      timeDivision: TIME_DIVISIONS[timeDivIdx],
      timeDivisionIdx: timeDivIdx,
      arpGate: bytes[21] || 50,
      arpSwing: bytes[22] || 50,
      arpType: ARP_TYPES[arpTypeIdx],
      arpTypeIdx: arpTypeIdx,
      arpRange: `+${arpRangeIdx}`,
      arpRangeIdx: arpRangeIdx,
      octave: 0,
      transpose: 0,
      transportMode: TRANSPORT_MODES[transModeIdx],
      transportModeIdx: transModeIdx
    };

    // Pads (Bank A: 44, Bank B: 172, Bank C: 300, Bank D: 428)
    const padBankOffsets = { A: 44, B: 172, C: 300, D: 428 };
    this.pads = { A: [], B: [], C: [], D: [] };

    for (const [bank, baseOffset] of Object.entries(padBankOffsets)) {
      for (let i = 0; i < 12; i++) {
        const off = baseOffset + (i * 8);
        this.pads[bank].push({
          padIndex: i + 1,
          mode: bytes[off],
          rawChannel: bytes[off + 1],
          channel: bytes[off + 1] === 16 ? "Common" : (bytes[off + 1] + 1),
          note: bytes[off + 2],
          aftertouch: bytes[off + 3]
        });
      }
    }

    // Knobs (offset 556, 24 records of 7 bytes)
    this.knobs = { A: [], B: [], C: [] };
    const knobBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 556 + (i * 7);
      const bank = knobBanks[Math.floor(i / 8)];
      const rawCh = bytes[off + 1];
      this.knobs[bank].push({
        index: (i % 8) + 1,
        rawChannel: rawCh,
        channel: midiChannelToDisplay(rawCh),
        cc: bytes[off + 2],
        min: bytes[off + 3],
        max: bytes[off + 4]
      });
    }

    // Faders / Sliders (offset 724, 24 records of 5 bytes)
    this.faders = { A: [], B: [], C: [] };
    const faderBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 724 + (i * 5);
      const bank = faderBanks[Math.floor(i / 8)];
      const rawCh = bytes[off + 1];
      this.faders[bank].push({
        index: (i % 8) + 1,
        rawChannel: rawCh,
        channel: midiChannelToDisplay(rawCh),
        cc: bytes[off + 2],
        min: bytes[off + 3],
        max: bytes[off + 4]
      });
    }

    // Switches / Buttons (offset 844, 24 records of 7 bytes)
    this.switches = { A: [], B: [], C: [] };
    const switchBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 844 + (i * 7);
      const bank = switchBanks[Math.floor(i / 8)];
      const rawCh = bytes[off + 1];
      this.switches[bank].push({
        index: (i % 8) + 1,
        mode: bytes[off + 3] ?? 0,
        rawChannel: rawCh,
        channel: midiChannelToDisplay(rawCh),
        cc: bytes[off + 2]
      });
    }

    // Wheels & Pedals (bytes 1012..1031)
    this.wheels = {
      modWheel: {
        channel: (bytes[1012] || 0) + 1,
        cc: bytes[1013] !== undefined ? bytes[1013] : 1,
        min: bytes[1014] !== undefined ? bytes[1014] : 0,
        max: bytes[1015] !== undefined ? bytes[1015] : 127
      },
      expressionPedal: {
        channel: (bytes[1018] || 0) + 1,
        cc: bytes[1019] !== undefined ? bytes[1019] : 11,
        min: bytes[1020] !== undefined ? bytes[1020] : 0,
        max: bytes[1021] !== undefined ? bytes[1021] : 127
      },
      sustainPedal: {
        channel: (bytes[1023] || 0) + 1,
        cc: bytes[1024] !== undefined ? bytes[1024] : 64,
        mode: 'Momentary'
      },
      footSwitch2: {
        channel: (bytes[1028] || 0) + 1,
        cc: bytes[1029] !== undefined ? bytes[1029] : 65,
        mode: 'Momentary'
      }
    };
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

    // Encode Global
    if (this.global) {
      bytes[16] = Math.max(0, Math.min(15, (this.global.keybedChannel || 1) - 1));
      bytes[17] = Math.max(30, Math.min(300, this.global.tempo || 120));
      if (this.global.timeDivisionIdx !== undefined) bytes[19] = this.global.timeDivisionIdx;
      if (this.global.arpGate !== undefined) bytes[21] = this.global.arpGate;
      if (this.global.arpSwing !== undefined) bytes[22] = this.global.arpSwing;
      if (this.global.arpTypeIdx !== undefined) bytes[24] = this.global.arpTypeIdx;
      if (this.global.arpRangeIdx !== undefined) bytes[25] = this.global.arpRangeIdx;
      if (this.global.transportModeIdx !== undefined) bytes[32] = this.global.transportModeIdx;
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
          bytes[off + 1] = p.rawChannel !== undefined ? p.rawChannel : (p.channel === 'Common' ? 16 : Math.max(0, Math.min(32, (p.channel || 1) - 1)));
          bytes[off + 2] = Math.max(0, Math.min(127, p.note));
          bytes[off + 3] = p.aftertouch ?? 0;
        }
      }
    }

    // Encode Knobs (offset 556, 24 records of 7 bytes)
    const knobBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 556 + (i * 7);
      const bank = knobBanks[Math.floor(i / 8)];
      const k = this.knobs[bank] ? this.knobs[bank][i % 8] : null;
      if (k) {
        bytes[off + 1] = k.rawChannel !== undefined ? k.rawChannel : displayToMidiChannel(k.channel);
        bytes[off + 2] = Math.max(0, Math.min(127, k.cc));
        bytes[off + 3] = Math.max(0, Math.min(127, k.min));
        bytes[off + 4] = Math.max(0, Math.min(127, k.max));
      }
    }

    // Encode Faders / Sliders (offset 724, 24 records of 5 bytes)
    const faderBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 724 + (i * 5);
      const bank = faderBanks[Math.floor(i / 8)];
      const f = this.faders[bank] ? this.faders[bank][i % 8] : null;
      if (f) {
        bytes[off + 1] = f.rawChannel !== undefined ? f.rawChannel : displayToMidiChannel(f.channel);
        bytes[off + 2] = Math.max(0, Math.min(127, f.cc));
        bytes[off + 3] = Math.max(0, Math.min(127, f.min));
        bytes[off + 4] = Math.max(0, Math.min(127, f.max));
      }
    }

    // Encode Switches / Buttons (offset 844, 24 records of 7 bytes)
    const switchBanks = ['A', 'B', 'C'];
    for (let i = 0; i < 24; i++) {
      const off = 844 + (i * 7);
      const bank = switchBanks[Math.floor(i / 8)];
      const sw = this.switches[bank] ? this.switches[bank][i % 8] : null;
      if (sw) {
        bytes[off + 1] = sw.rawChannel !== undefined ? sw.rawChannel : displayToMidiChannel(sw.channel);
        bytes[off + 2] = Math.max(0, Math.min(127, sw.cc));
        bytes[off + 3] = sw.mode ?? 0;
      }
    }

    // Encode Wheels & Pedals
    if (this.wheels) {
      if (this.wheels.modWheel) {
        bytes[1012] = Math.max(0, Math.min(15, (this.wheels.modWheel.channel || 1) - 1));
        bytes[1013] = Math.max(0, Math.min(127, this.wheels.modWheel.cc));
        bytes[1014] = Math.max(0, Math.min(127, this.wheels.modWheel.min));
        bytes[1015] = Math.max(0, Math.min(127, this.wheels.modWheel.max));
      }
      if (this.wheels.expressionPedal) {
        bytes[1018] = Math.max(0, Math.min(15, (this.wheels.expressionPedal.channel || 1) - 1));
        bytes[1019] = Math.max(0, Math.min(127, this.wheels.expressionPedal.cc));
        bytes[1020] = Math.max(0, Math.min(127, this.wheels.expressionPedal.min));
        bytes[1021] = Math.max(0, Math.min(127, this.wheels.expressionPedal.max));
      }
      if (this.wheels.sustainPedal) {
        bytes[1023] = Math.max(0, Math.min(15, (this.wheels.sustainPedal.channel || 1) - 1));
        bytes[1024] = Math.max(0, Math.min(127, this.wheels.sustainPedal.cc));
      }
      if (this.wheels.footSwitch2) {
        bytes[1028] = Math.max(0, Math.min(15, (this.wheels.footSwitch2.channel || 1) - 1));
        bytes[1029] = Math.max(0, Math.min(127, this.wheels.footSwitch2.cc));
      }
    }

    this.rawBytes = bytes;
    return bytes;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { MPK49Preset, midiNoteToName, nameToMidiNote, TIME_DIVISIONS, ARP_TYPES, TRANSPORT_MODES };
}
