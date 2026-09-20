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

    this.chkAutoSave = document.getElementById('chk-auto-save');
    this.btnDownloadSyx = document.getElementById('btn-download-syx');
    this.btnDownloadJson = document.getElementById('btn-download-json');
    this.btnRequestDump = document.getElementById('btn-request-dump');
    this.btnClearLog = document.getElementById('btn-clear-log');

    // Section 3: Write Test controls
    this.btnWriteTestRev = document.getElementById('btn-write-testrev');
    this.btnRestoreSlot30 = document.getElementById('btn-restore-slot30');
    this.btnBrowseSyx = document.getElementById('btn-browse-syx');
    this.fileUploadSyx = document.getElementById('file-upload-syx');

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
    if (this.btnRequestDump) {
      this.btnRequestDump.addEventListener('click', () => this.requestSoftwareDump());
    }
    if (this.btnWriteTestRev) {
      this.btnWriteTestRev.addEventListener('click', () => this.sendTestRev());
    }
    if (this.btnRestoreSlot30) {
      this.btnRestoreSlot30.addEventListener('click', () => this.restoreSlot30());
    }
    if (this.btnBrowseSyx && this.fileUploadSyx) {
      this.btnBrowseSyx.addEventListener('click', () => this.fileUploadSyx.click());
      this.fileUploadSyx.addEventListener('change', (e) => this.handleCustomSyxUpload(e));
    }
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
    this.selectInput.innerHTML = '<option value="all">-- Listen to ALL Connected Ports (Recommended) --</option>';
    let preferredInput = 'all';

    for (const input of this.midiAccess.inputs.values()) {
      const opt = document.createElement('option');
      opt.value = input.id;
      opt.textContent = `${input.name} (${input.manufacturer || 'Generic'})`;
      this.selectInput.appendChild(opt);

      // Attach listener to ALL inputs so nothing is missed
      input.onmidimessage = (e) => this.handleMidiMessage(e, input.name);
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
      if ((lower.includes('mpk') || lower.includes('akai')) && (lower.includes('port 1') || !lower.includes('port'))) {
        detectedAkaiOutput = output.id;
      } else if (!detectedAkaiOutput && (lower.includes('mpk') || lower.includes('akai'))) {
        detectedAkaiOutput = output.id;
      }
    }

    this.selectInput.value = 'all';
    this.log(`Listening on ALL MIDI input ports (including Port 1, Port 2, Port 3)`, 'success');
    this.boxDeviceInfo.classList.remove('hidden');
    this.devName.textContent = 'All Connected MPK Ports';
    this.devManuf.textContent = 'Akai Professional';

    if (detectedAkaiOutput) {
      this.selectOutput.value = detectedAkaiOutput;
      this.selectOutputPort(detectedAkaiOutput);
    }
  }

  selectInputPort(portId) {
    if (!portId) {
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = null;
      }
      this.boxDeviceInfo.classList.add('hidden');
      return;
    }

    if (portId === 'all') {
      for (const input of this.midiAccess.inputs.values()) {
        input.onmidimessage = (e) => this.handleMidiMessage(e, input.name);
      }
      this.boxDeviceInfo.classList.remove('hidden');
      this.devName.textContent = 'All Connected Ports';
      this.log('Now listening on ALL input ports', 'info');
      return;
    }

    // Reset others and listen only to selected
    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = null;
    }

    this.activeInput = this.midiAccess.inputs.get(portId);
    if (this.activeInput) {
      this.activeInput.onmidimessage = (e) => this.handleMidiMessage(e, this.activeInput.name);
      this.boxDeviceInfo.classList.remove('hidden');
      this.devName.textContent = this.activeInput.name;
      this.devManuf.textContent = this.activeInput.manufacturer || 'Akai Professional';
      this.log(`Now listening specifically on: "${this.activeInput.name}"`, 'info');
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

  handleMidiMessage(event, portName = "Unknown") {
    const data = event.data;

    // Check if it is a SysEx message (starts with 0xF0, ends with 0xF7)
    if (data[0] !== 0xF0) {
      // Normal channel voice message (Note, CC, PitchBend, etc.)
      const statusNibble = data[0] & 0xF0;
      let msgType = "MIDI Event";
      if (statusNibble === 0x90) msgType = `Note On (Key ${data[1]}, Vel ${data[2]})`;
      else if (statusNibble === 0x80) msgType = `Note Off (Key ${data[1]})`;
      else if (statusNibble === 0xB0) msgType = `CC #${data[1]} = ${data[2]}`;

      this.elStatusIndicator.classList.add('active');
      setTimeout(() => this.elStatusIndicator.classList.remove('active'), 200);

      // Throttled log of normal MIDI activity
      if (!this._lastActivityLog || (Date.now() - this._lastActivityLog > 1500)) {
        this.log(`Live activity on [${portName}]: ${msgType}`, 'info');
        this._lastActivityLog = Date.now();
      }
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

    const info = this.parsePresetInfo(data);
    packet.presetName = info.name;
    packet.slot = info.slot;

    this.log(`SysEx Captured! ${length} bytes received from "${portName}". Preset #${info.slot} ["${info.name}"]. Akai ID: ${isAkai ? 'Verified' : 'Mismatch'}`, 'success');
    if (packet.extractedText.length > 0) {
      this.log(`Detected ASCII text in dump: "${packet.extractedText.join('", "')}"`, 'info');
    }

    // Auto-Save if enabled
    if (this.chkAutoSave && this.chkAutoSave.checked) {
      const syxName = this.getFilename(info.name, info.slot, 'syx');
      const jsonName = this.getFilename(info.name, info.slot, 'json');
      this.saveBlob(data, 'application/octet-stream', syxName);

      const payload = {
        device: "Akai MPK49",
        source_port: portName,
        timestamp: packet.timestamp,
        preset_name: info.name,
        preset_slot: info.slot,
        total_bytes: packet.length,
        is_akai_sysex: isAkai,
        header: packet.header,
        extracted_strings: packet.extractedText,
        hex_dump: Array.from(packet.uint8).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
        bytes: Array.from(packet.uint8)
      };
      this.saveBlob(JSON.stringify(payload, null, 2), 'application/json', jsonName);
      this.log(`⚡️ Auto-saved: ${syxName} & ${jsonName}`, 'success');
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

  parsePresetInfo(bytes) {
    if (bytes.length < 16) return { name: "Preset", slot: 1 };
    const slot = bytes[7];
    let rawName = "";
    for (let i = 8; i < 16; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) rawName += String.fromCharCode(b);
    }
    const name = rawName.trim().replace(/[^a-zA-Z0-9_-]/g, '') || `Preset${slot}`;
    return { name, slot };
  }

  getFilename(presetName, slot, ext) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dt = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    return `slot${pad(slot)}_${presetName}_${dt}.${ext}`;
  }

  saveBlob(data, mimeType, filename) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  downloadLastSyx() {
    if (!this.lastPacket) return;
    const info = this.parsePresetInfo(this.lastPacket.uint8);
    const filename = this.getFilename(info.name, info.slot, 'syx');
    this.saveBlob(this.lastPacket.uint8, 'application/octet-stream', filename);
    this.log(`Downloaded raw dump: ${filename}`, 'info');
  }

  downloadLastJson() {
    if (!this.lastPacket) return;
    const info = this.parsePresetInfo(this.lastPacket.uint8);
    const filename = this.getFilename(info.name, info.slot, 'json');

    const payload = {
      device: "Akai MPK49",
      source_port: this.activeInput ? this.activeInput.name : "Unknown",
      timestamp: this.lastPacket.timestamp,
      preset_name: info.name,
      preset_slot: info.slot,
      total_bytes: this.lastPacket.length,
      is_akai_sysex: this.lastPacket.isAkai,
      header: this.lastPacket.header,
      extracted_strings: this.lastPacket.extractedText,
      hex_dump: Array.from(this.lastPacket.uint8).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
      bytes: Array.from(this.lastPacket.uint8)
    };

    this.saveBlob(JSON.stringify(payload, null, 2), 'application/json', filename);
    this.log(`Downloaded structured JSON: ${filename}`, 'info');
  }

  requestSoftwareDump() {
    if (!this.activeOutput) {
      this.log('Cannot request dump: No MIDI Output port assigned. Please select an output port.', 'warn');
      return;
    }
    try {
      // Akai MPK49 Request Preset Dump Command
      // F0 47 00 6B 10 00 [Slot 0x01] F7
      const requestPacket = [0xF0, 0x47, 0x00, 0x6B, 0x10, 0x00, 0x01, 0xF7];
      this.activeOutput.send(requestPacket);
      this.log(`Sent software dump request to "${this.activeOutput.name}": [F0 47 00 6B 10 00 01 F7]`, 'info');
    } catch (err) {
      this.log(`Error sending software dump request: ${err.message}`, 'error');
    }
  }

  b64ToUint8(b64) {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  sendRawSyx(uint8Data, description) {
    if (!this.activeOutput) {
      this.log(`Cannot send: No MIDI Output port assigned. Please select an output port.`, 'error');
      alert('Please select an active MIDI Output Port first.');
      return false;
    }
    if (uint8Data.length !== 1033) {
      this.log(`Error: Payload size is ${uint8Data.length} bytes (expected 1033 bytes for MPK49 preset). Aborting.`, 'error');
      alert(`Invalid SysEx size (${uint8Data.length} bytes, expected 1033). Aborting.`);
      return false;
    }
    if (uint8Data[0] !== 0xF0 || uint8Data[uint8Data.length - 1] !== 0xF7) {
      this.log('Error: Malformed SysEx (missing F0 or F7 framing). Aborting.', 'error');
      alert('Error: Malformed SysEx framing.');
      return false;
    }
    try {
      this.activeOutput.send(uint8Data);
      this.log(`🚀 TRANSMITTED: ${description} (1033 bytes) to "${this.activeOutput.name}"`, 'success');
      return true;
    } catch (err) {
      this.log(`Transmission error: ${err.message}`, 'error');
      return false;
    }
  }

  sendTestRev() {
    this.log('Preparing to write surgical test preset "TESTREV" to Slot 30...', 'info');
    const data = this.b64ToUint8(TEST_SLOT30_B64);
    this.sendRawSyx(data, 'Test Preset "TESTREV" -> Slot 30');
  }

  restoreSlot30() {
    this.log('Preparing to restore factory preset "Generic" to Slot 30...', 'info');
    const data = this.b64ToUint8(FACTORY_SLOT30_B64);
    this.sendRawSyx(data, 'Factory Backup "Generic" -> Slot 30');
  }

  handleCustomSyxUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = new Uint8Array(event.target.result);
      this.log(`Loaded custom file: "${file.name}" (${buffer.length} bytes)`, 'info');
      const confirmed = confirm(`Are you sure you want to send "${file.name}" (${buffer.length} bytes) to your MPK49?`);
      if (confirmed) {
        this.sendRawSyx(buffer, `File "${file.name}"`);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  clearLogs() {
    this.eventLog.innerHTML = '';
    this.log('Event logs cleared.', 'info');
  }
}

// Slot 30 Embedded Payloads (1,033 bytes each)
const TEST_SLOT30_B64 = "8EcAaxAIAR5URVNUUkVWIAB4AQQBMjoBBAI8MgADAQECAAAAAAAAAAAAAAADACQAAQAAAAMAJQABAAAAAwAmAAEAAAADACcAAQAAAAMAKAABAAAAAwApAAEAAAADACoAAQAAAAMAKwABAAAAAwAsAAEAAAADAC0AAQAAAAMALgABAAAAAwAvAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAMAABAAAAAwAxAAEAAAADADIAAQAAAAMAMwABAAAAAwA0AAEAAAADADUAAQAAAAMANgABAAAAAwA3AAEAAAADADgAAQAAAAMAOQABAAAAAwA6AAEAAAADADsAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwA8AAEAAAADAD0AAQAAAAMAPgABAAAAAwA/AAEAAAADAEAAAQAAAAMAQQABAAAAAwBCAAEAAAADAEMAAQAAAAMARAABAAAAAwBFAAEAAAADAEYAAQAAAAMARwABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAEgAAQAAAAMASQABAAAAAwBKAAEAAAADAEsAAQAAAAMATAABAAAAAwBNAAEAAAADAE4AAQAAAAMATwABAAAAAwBQAAEAAAADAFEAAQAAAAMAUgABAAAAAwBTAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwB/f38AAAkAf39/AAAOAH9/fwAADwB/f38AABAAf39/AAARAH9/fwAAEgB/f38AABMAf39/AAA0AH9/fwAANQB/f38AADYAf39/AAA3AH9/fwAAOQB/f38AADoAf39/AAA7AH9/fwAAPAB/f38AAFMAf39/AABVAH9/fwAAVgB/f38AAFcAf39/AABYAH9/fwAAWQB/f38AAFoAf39/AABbAH9/fwAAFAB/AAAVAH8AABYAfwAAFwB/AAAYAH8AABkAfwAAGgB/AAAbAH8AAD0AfwAAPgB/AAA/AH8AAEYAfwAARwB/AABIAH8AAEkAfwAASgB/AABcAH8AAF0AfwAAXgB/AABfAH8AAGYAfwAAZwB/AABoAH8AAGkAfwAAHAEAAAAAAB0BAAAAAAAeAQAAAAAAHwEAAAAAACMBAAAAAAApAQAAAAAALgEAAAAAAC8BAAAAAABLAQAAAAAATAEAAAAAAE0BAAAAAABOAQAAAAAATwEAAAAAAFABAAAAAABRAQAAAAAAUgEAAAAAAGoBAAAAAABrAQAAAAAAbAEAAAAAAG0BAAAAAABuAQAAAAAAbwEAAAAAAHABAAAAAABxAQAAAAABAH8AAAELAH8AAUAAAAABQAAA9w==";
const FACTORY_SLOT30_B64 = "8EcAaxAIAR5HZW5lcmljIAB4AQQBMjoBBAI8MgADAQECAAAAAAAAAAAAAAADACQAAQAAAAMAJQABAAAAAwAmAAEAAAADACcAAQAAAAMAKAABAAAAAwApAAEAAAADACoAAQAAAAMAKwABAAAAAwAsAAEAAAADAC0AAQAAAAMALgABAAAAAwAvAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAMAABAAAAAwAxAAEAAAADADIAAQAAAAMAMwABAAAAAwA0AAEAAAADADUAAQAAAAMANgABAAAAAwA3AAEAAAADADgAAQAAAAMAOQABAAAAAwA6AAEAAAADADsAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwA8AAEAAAADAD0AAQAAAAMAPgABAAAAAwA/AAEAAAADAEAAAQAAAAMAQQABAAAAAwBCAAEAAAADAEMAAQAAAAMARAABAAAAAwBFAAEAAAADAEYAAQAAAAMARwABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAEgAAQAAAAMASQABAAAAAwBKAAEAAAADAEsAAQAAAAMATAABAAAAAwBNAAEAAAADAE4AAQAAAAMATwABAAAAAwBQAAEAAAADAFEAAQAAAAMAUgABAAAAAwBTAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwB/f38AAAkAf39/AAAOAH9/fwAADwB/f38AABAAf39/AAARAH9/fwAAEgB/f38AABMAf39/AAA0AH9/fwAANQB/f38AADYAf39/AAA3AH9/fwAAOQB/f38AADoAf39/AAA7AH9/fwAAPAB/f38AAFMAf39/AABVAH9/fwAAVgB/f38AAFcAf39/AABYAH9/fwAAWQB/f38AAFoAf39/AABbAH9/fwAAFAB/AAAVAH8AABYAfwAAFwB/AAAYAH8AABkAfwAAGgB/AAAbAH8AAD0AfwAAPgB/AAA/AH8AAEYAfwAARwB/AABIAH8AAEkAfwAASgB/AABcAH8AAF0AfwAAXgB/AABfAH8AAGYAfwAAZwB/AABoAH8AAGkAfwAAHAEAAAAAAB0BAAAAAAAeAQAAAAAAHwEAAAAAACMBAAAAAAApAQAAAAAALgEAAAAAAC8BAAAAAABLAQAAAAAATAEAAAAAAE0BAAAAAABOAQAAAAAATwEAAAAAAFABAAAAAABRAQAAAAAAUgEAAAAAAGoBAAAAAABrAQAAAAAAbAEAAAAAAG0BAAAAAABuAQAAAAAAbwEAAAAAAHABAAAAAABxAQAAAAABAH8AAAELAH8AAUAAAAABQAAA9w==";

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.captureEngine = new SysExCaptureEngine();
});
