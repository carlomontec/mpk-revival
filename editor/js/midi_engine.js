/**
 * MPK-Revival | Web MIDI Hardware Engine
 * Handles bi-directional communication, port auto-selection, SysEx transfers,
 * and live hardware input sensing (Notes & CCs).
 */

class MidiEngine {
  constructor(onPresetReceived, onStatusChange, onNoteMessage = null, onCcMessage = null, onActivity = null) {
    this.midiAccess = null;
    this.activeOutput = null;
    this.onPresetReceived = onPresetReceived;
    this.onStatusChange = onStatusChange;
    this.onNoteMessage = onNoteMessage;
    this.onCcMessage = onCcMessage;
    this.onActivity = onActivity;
    this.isConnected = false;
    this.connectedDeviceName = null;
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      this.updateStatus('Web MIDI not supported in this browser. Please use Chrome, Edge, or Firefox 108+ (dom.webmidi.enabled).', 'error');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.midiAccess.onstatechange = () => this.scanPorts();
      this.isConnected = true;
      this.scanPorts();
      return true;
    } catch (err) {
      // If SysEx was blocked, try basic MIDI without sysex so Live Follow still works
      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        this.midiAccess.onstatechange = () => this.scanPorts();
        this.isConnected = true;
        this.scanPorts();
        this.updateStatus('Connected (Basic MIDI - No SysEx permission)', 'warning');
        return true;
      } catch (err2) {
        this.isConnected = false;
        this.isMpkConnected = false;
        this.updateStatus(`MIDI Init Failed: ${err.message}`, 'error');
        return false;
      }
    }
  }

  scanPorts() {
    if (!this.midiAccess) return;

    let mpkOutput = null;
    let mpkInput = null;
    const allDeviceNames = new Set();
    const inputsList = [];
    const outputsList = [];

    // Scan all Inputs
    for (const input of this.midiAccess.inputs.values()) {
      if (typeof input.open === 'function') {
        input.open().catch(() => {});
      }
      input.onmidimessage = (e) => this.handleMidiMessage(e, input.name);

      const name = input.name || '';
      const mfg = input.manufacturer || '';
      const full = `${name} ${mfg}`.toLowerCase();
      allDeviceNames.add(name);
      inputsList.push({ name, manufacturer: mfg });

      if (full.includes('mpk') || full.includes('akai')) {
        mpkInput = input;
      }
    }

    // Scan all Outputs — prioritize Akai MPK49 Port 1
    for (const output of this.midiAccess.outputs.values()) {
      if (typeof output.open === 'function') {
        output.open().catch(() => {});
      }
      const name = output.name || '';
      const mfg = output.manufacturer || '';
      const full = `${name} ${mfg}`.toLowerCase();
      allDeviceNames.add(name);
      outputsList.push({ name, manufacturer: mfg });

      if (full.includes('mpk') || full.includes('akai')) {
        if (full.includes('port 1') || !full.includes('port')) {
          mpkOutput = output;
          break; // Found preferred Port 1
        } else if (!mpkOutput) {
          mpkOutput = output;
        }
      }
    }

    console.log('[WebMIDI] Scan completed:', { inputs: inputsList, outputs: outputsList, mpkFound: !!mpkOutput });

    if (mpkOutput) {
      this.activeOutput = mpkOutput;
      this.isMpkConnected = true;
      this.isConnected = true;
      this.connectedDeviceName = mpkOutput.name;
      this.updateStatus(`Connected: ${mpkOutput.name}`, 'success');
    } else if (mpkInput) {
      this.activeOutput = null;
      this.isMpkConnected = true;
      this.isConnected = true;
      this.connectedDeviceName = mpkInput.name;
      this.updateStatus(`Connected (In only): ${mpkInput.name}`, 'warning');
    } else {
      this.activeOutput = null;
      this.isMpkConnected = false;
      this.connectedDeviceName = null;
      if (allDeviceNames.size > 0) {
        const list = Array.from(allDeviceNames).slice(0, 2).join(', ');
        this.updateStatus(`MPK49 Not Found (Detected: ${list})`, 'warning');
      } else {
        this.updateStatus('No MIDI Devices (Connect MPK49 via USB)', 'warning');
      }
    }
  }

  handleMidiMessage(event, portName) {
    const data = event.data;
    if (!data || data.length === 0) return;

    // 1. SysEx Preset Dump (F0 ... F7)
    if (data[0] === 0xF0) {
      if (data.length === 1033 && data[1] === 0x47 && data[3] === 0x6B) {
        if (this.onPresetReceived) {
          this.onPresetReceived(data, portName);
        }
      }
      return;
    }

    // 2. Standard Channel Voice Messages (Live Hardware Sensing)
    const status = data[0] & 0xF0;
    const channel = (data[0] & 0x0F) + 1;

    // Note On / Note Off
    if (status === 0x90) {
      const note = data[1];
      const vel = data[2];
      if (vel > 0) {
        if (this.onActivity) this.onActivity('note_on', { channel, note, vel });
        if (this.onNoteMessage) this.onNoteMessage('on', channel, note, vel);
      } else {
        if (this.onActivity) this.onActivity('note_off', { channel, note, vel: 0 });
        if (this.onNoteMessage) this.onNoteMessage('off', channel, note, 0);
      }
    } else if (status === 0x80) {
      const note = data[1];
      if (this.onActivity) this.onActivity('note_off', { channel, note, vel: 0 });
      if (this.onNoteMessage) this.onNoteMessage('off', channel, note, 0);
    }
    // Control Change (CC)
    else if (status === 0xB0) {
      const cc = data[1];
      const val = data[2];
      if (this.onActivity) this.onActivity('cc', { channel, cc, val });
      if (this.onCcMessage) this.onCcMessage(channel, cc, val);
    }
    // Pitch Bend
    else if (status === 0xE0) {
      const bendVal = ((data[2] << 7) | data[1]) - 8192;
      if (this.onActivity) this.onActivity('pitch_bend', { channel, val: bendVal });
    }
  }

  sendPreset(uint8Data, slotOverride = null) {
    if (!this.activeOutput) {
      throw new Error('No MIDI Output port connected. Make sure your MPK49 is plugged in via USB.');
    }

    const payload = new Uint8Array(uint8Data);
    if (slotOverride !== null && slotOverride >= 1 && slotOverride <= 30) {
      payload[7] = slotOverride;
    }

    if (payload.length !== 1033 || payload[0] !== 0xF0 || payload[1032] !== 0xF7) {
      throw new Error(`Invalid SysEx payload (length ${payload.length}, expected 1033)`);
    }

    this.activeOutput.send(payload);
    return payload[7]; // Returns targeted slot
  }

  updateStatus(msg, type = 'info') {
    if (this.onStatusChange) {
      this.onStatusChange(msg, type);
    }
  }
}
