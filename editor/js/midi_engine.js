/**
 * MPK-Revival | Web MIDI Hardware Engine
 * Handles bi-directional communication, port auto-selection, and SysEx transfers.
 */

class MidiEngine {
  constructor(onPresetReceived, onStatusChange) {
    this.midiAccess = null;
    this.activeOutput = null;
    this.onPresetReceived = onPresetReceived;
    this.onStatusChange = onStatusChange;
    this.isConnected = false;
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      this.updateStatus('Web MIDI not supported in this browser. Please use Chrome/Edge.', 'error');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.midiAccess.onstatechange = () => this.scanPorts();
      this.isConnected = true;
      this.scanPorts();
      this.updateStatus('Hardware Connected & Ready', 'success');
      return true;
    } catch (err) {
      this.isConnected = false;
      this.updateStatus(`MIDI Init Failed: ${err.message}`, 'error');
      return false;
    }
  }

  scanPorts() {
    if (!this.midiAccess) return;

    // Listen to ALL inputs
    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = (e) => this.handleMidiMessage(e, input.name);
    }

    // Auto-select preferred output (Port 1 preferred for Akai MPK49)
    let bestOutput = null;
    for (const output of this.midiAccess.outputs.values()) {
      const lower = output.name.toLowerCase();
      if ((lower.includes('mpk') || lower.includes('akai')) && (lower.includes('port 1') || !lower.includes('port'))) {
        bestOutput = output;
        break;
      } else if (!bestOutput && (lower.includes('mpk') || lower.includes('akai'))) {
        bestOutput = output;
      }
    }

    if (bestOutput) {
      this.activeOutput = bestOutput;
      this.updateStatus(`Connected to ${bestOutput.name}`, 'success');
    }
  }

  handleMidiMessage(event, portName) {
    const data = event.data;
    if (data[0] !== 0xF0) return; // SysEx only

    if (data.length === 1033 && data[1] === 0x47 && data[3] === 0x6B) {
      if (this.onPresetReceived) {
        this.onPresetReceived(data, portName);
      }
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
