/**
 * MPK-Revival | Web MIDI Diagnostic & SysEx Capture Engine
 * Phase 1 POC: Safe Read & Backup
 */

class SysExCaptureEngine {
  constructor() {
    this.midiAccess = null;
    this.activeInput = null;
    this.activeOutput = null;
    this.capturedPackets = [];
    this.lastPacket = null;

    // DOM Elements
    this.elStatusIndicator = document.getElementById('midi-status-indicator');
    this.elStatusText = document.getElementById('midi-status-text');
    this.btnInitMidi = document.getElementById('btn-init-midi');
    this.btnRescanMidi = document.getElementById('btn-rescan-midi');
    this.selectInput = document.getElementById('midi-input-select');
    this.selectOutput = document.getElementById('midi-output-select');
    this.boxDeviceInfo = document.getElementById('device-info');
    this.devName = document.getElementById('dev-name');
    this.devManuf = document.getElementById('dev-manuf');

    this.statPackets = document.getElementById('stat-packets');
    this.statBytes = document.getElementById('stat-bytes');
    this.statAkaiValid = document.getElementById('stat-akai-valid');

    this.btnDownloadSyx = document.getElementById('btn-download-syx');
    this.btnDownloadJson = document.getElementById('btn-download-json');
    this.btnClearLog = document.getElementById('btn-clear-log');

    this.inspectorSummary = document.getElementById('inspector-summary');
    this.hexDisplay = document.getElementById('hex-display');
    this.eventLog = document.getElementById('event-log');

    this.setupListeners();
  }

  setupListeners() {
    this.btnInitMidi.addEventListener('click', () => this.initWebMIDI());
    this.btnRescanMidi.addEventListener('click', () => this.scanPorts());
    this.selectInput.addEventListener('change', (e) => this.selectInputPort(e.target.value));
    this.selectOutput.addEventListener('change', (e) => this.selectOutputPort(e.target.value));

    this.btnDownloadSyx.addEventListener('click', () => this.downloadLastSyx());
    this.btnDownloadJson.addEventListener('click', () => this.downloadLastJson());
    this.btnClearLog.addEventListener('click', () => this.clearLogs());
  }

  log(message, type = 'normal') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${time}]</span><span class="log-msg ${type}">${this.escapeHtml(message)}</span>`;
    this.eventLog.appendChild(entry);
    this.eventLog.scrollTop = this.eventLog.scrollHeight;
  }

  escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  async initWebMIDI() {
    if (!navigator.requestMIDIAccess) {
      this.log('Web MIDI API is not supported in this browser. Please use Chrome, Edge, Brave, or Opera.', 'error');
      alert('Web MIDI is not supported in this browser. Please use Google Chrome, Edge, or Opera.');
      return;
    }

    try {
      this.log('Requesting Web MIDI access with SysEx permission...', 'info');
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.midiAccess.onstatechange = (e) => this.handleStateChange(e);

      this.elStatusIndicator.className = 'status-indicator connected';
      this.elStatusText.textContent = 'Web MIDI Ready (SysEx Enabled)';
      this.btnInitMidi.disabled = true;
      this.btnRescanMidi.disabled = false;
      this.selectInput.disabled = false;
      this.selectOutput.disabled = false;

      this.log('Web MIDI SysEx permission granted!', 'success');
      this.scanPorts();
    } catch (err) {
      this.elStatusIndicator.className = 'status-indicator disconnected';
      this.elStatusText.textContent = 'SysEx Permission Denied / Error';
      this.log(`Web MIDI initialization failed: ${err.message}`, 'error');
    }
  }

  handleStateChange(event) {
    const port = event.port;
    this.log(`MIDI Port state change: "${port.name}" (${port.type}) is now ${port.state}`, 'info');
    this.scanPorts();
  }

  scanPorts() {
    if (!this.midiAccess) return;

    // Populate inputs
    this.selectInput.innerHTML = '<option value="">-- Select MIDI Input Port --</option>';
    let detectedAkaiInput = null;

    for (const input of this.midiAccess.inputs.values()) {
      const opt = document.createElement('option');
      opt.value = input.id;
      opt.textContent = `${input.name} (${input.manufacturer || 'Generic'})`;
      this.selectInput.appendChild(opt);

      const lower = input.name.toLowerCase();
      if (lower.includes('mpk') || lower.includes('akai')) {
        detectedAkaiInput = input.id;
      }
    }

    // Populate outputs
    this.selectOutput.innerHTML = '<option value="">-- Select MIDI Output Port --</option>';
    let detectedAkaiOutput = null;

    for (const output of this.midiAccess.outputs.values()) {
      const opt = document.createElement('option');
      opt.value = output.id;
      opt.textContent = `${output.name} (${output.manufacturer || 'Generic'})`;
      this.selectOutput.appendChild(opt);

      const lower = output.name.toLowerCase();
      if (lower.includes('mpk') || lower.includes('akai')) {
        detectedAkaiOutput = output.id;
      }
    }

    // Auto-select Akai device if detected
    if (detectedAkaiInput) {
      this.selectInput.value = detectedAkaiInput;
      this.selectInputPort(detectedAkaiInput);
      this.log(`Auto-selected Akai input: "${this.activeInput.name}"`, 'success');
    }

    if (detectedAkaiOutput) {
      this.selectOutput.value = detectedAkaiOutput;
      this.selectOutputPort(detectedAkaiOutput);
    }
  }

  selectInputPort(portId) {
    if (this.activeInput) {
      this.activeInput.onmidimessage = null;
    }

    if (!portId) {
      this.activeInput = null;
      this.boxDeviceInfo.classList.add('hidden');
      return;
    }

    this.activeInput = this.midiAccess.inputs.get(portId);
    if (this.activeInput) {
      this.activeInput.onmidimessage = (e) => this.handleMidiMessage(e);
      this.boxDeviceInfo.classList.remove('hidden');
      this.devName.textContent = this.activeInput.name;
      this.devManuf.textContent = this.activeInput.manufacturer || 'Akai Professional / Generic';
      this.log(`Now listening on input: "${this.activeInput.name}"`, 'info');
    }
  }

  selectOutputPort(portId) {
    if (!portId) {
      this.activeOutput = null;
      return;
    }
    this.activeOutput = this.midiAccess.outputs.get(portId);
    if (this.activeOutput) {
      this.log(`Output assigned: "${this.activeOutput.name}"`, 'info');
    }
  }

  handleMidiMessage(event) {
    const data = event.data;

    // Check if it is a SysEx message (starts with 0xF0, ends with 0xF7)
    if (data[0] !== 0xF0) {
      // Normal channel voice message (Note, CC, PitchBend, etc.)
      return;
    }

    const timestamp = new Date().toISOString();
    const length = data.length;
    const isAkai = (data[1] === 0x47); // 0x47 = Akai ID

    // Pulse indicator
    this.elStatusIndicator.classList.add('active');
    setTimeout(() => this.elStatusIndicator.classList.remove('active'), 800);

    const packet = {
      timestamp: timestamp,
      rawBytes: Array.from(data),
      uint8: data,
      length: length,
      isAkai: isAkai,
      header: {
        status: '0x' + data[0].toString(16).toUpperCase(),
        manufacturerId: '0x' + data[1].toString(16).toUpperCase(),
        deviceId: data.length > 2 ? '0x' + data[2].toString(16).toUpperCase() : null,
        modelId: data.length > 3 ? '0x' + data[3].toString(16).toUpperCase() : null
      }
    };

    // Attempt to extract ASCII name from byte payload
    packet.extractedText = this.extractPrintableStrings(data);

    this.capturedPackets.push(packet);
    this.lastPacket = packet;

    // Update stats
    this.statPackets.textContent = this.capturedPackets.length;
    this.statBytes.textContent = `${length} bytes`;
    if (isAkai) {
      this.statAkaiValid.textContent = 'VALID (0x47)';
      this.statAkaiValid.className = 'stat-value text-success';
    } else {
      this.statAkaiValid.textContent = `Other (0x${data[1].toString(16).toUpperCase()})`;
      this.statAkaiValid.className = 'stat-value text-danger';
    }

    this.btnDownloadSyx.disabled = false;
    this.btnDownloadJson.disabled = false;

    // Display Hex dump
    this.renderHexDump(data);
    this.inspectorSummary.textContent = `Captured: ${length} bytes @ ${new Date().toLocaleTimeString()} (Akai SysEx: ${isAkai ? 'Yes' : 'No'})`;

    this.log(`SysEx Captured! ${length} bytes received from "${this.activeInput.name}". Akai ID: ${isAkai ? 'Verified' : 'Mismatch'}`, 'success');
    if (packet.extractedText.length > 0) {
      this.log(`Detected ASCII text in dump: "${packet.extractedText.join('", "')}"`, 'info');
    }
  }

  extractPrintableStrings(bytes) {
    const strings = [];
    let current = '';

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) {
        current += String.fromCharCode(b);
      } else {
        if (current.trim().length >= 3) {
          strings.push(current.trim());
        }
        current = '';
      }
    }
    if (current.trim().length >= 3) {
      strings.push(current.trim());
    }
    return strings;
  }

  renderHexDump(bytes) {
    const lines = [];
    const bytesPerLine = 16;

    for (let i = 0; i < bytes.length; i += bytesPerLine) {
      const chunk = bytes.slice(i, i + bytesPerLine);
      const offsetHex = i.toString(16).padStart(4, '0').toUpperCase();

      // Hex string
      let hexParts = [];
      let asciiParts = '';

      for (let j = 0; j < bytesPerLine; j++) {
        if (j < chunk.length) {
          const val = chunk[j];
          hexParts.push(val.toString(16).padStart(2, '0').toUpperCase());
          asciiParts += (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
        } else {
          hexParts.push('  ');
        }
      }

      // Group in 8s for readability
      const hexGroup1 = hexParts.slice(0, 8).join(' ');
      const hexGroup2 = hexParts.slice(8, 16).join(' ');
      const formattedHex = `${hexGroup1}  ${hexGroup2}`;

      lines.push(`${offsetHex}:  ${formattedHex.padEnd(49, ' ')}  |${asciiParts}|`);
    }

    this.hexDisplay.textContent = lines.join('\n');
  }

  downloadLastSyx() {
    if (!this.lastPacket) return;

    const blob = new Blob([this.lastPacket.uint8], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `mpk49_dump_${timestamp}.syx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log(`Downloaded raw dump: mpk49_dump_${timestamp}.syx`, 'info');
  }

  downloadLastJson() {
    if (!this.lastPacket) return;

    const payload = {
      device: "Akai MPK49",
      source_port: this.activeInput ? this.activeInput.name : "Unknown",
      timestamp: this.lastPacket.timestamp,
      total_bytes: this.lastPacket.length,
      is_akai_sysex: this.lastPacket.isAkai,
      header: this.lastPacket.header,
      extracted_strings: this.lastPacket.extractedText,
      hex_dump: Array.from(this.lastPacket.uint8).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
      bytes: Array.from(this.lastPacket.uint8)
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `mpk49_dump_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.log(`Downloaded structured JSON: mpk49_dump_${timestamp}.json`, 'info');
  }

  clearLogs() {
    this.eventLog.innerHTML = '';
    this.log('Event logs cleared.', 'info');
  }
}

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.captureEngine = new SysExCaptureEngine();
});
