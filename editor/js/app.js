/**
 * MPK-Revival | Studio Application Controller
 * Connects GUI components, state management, modal editing, and hardware sync.
 */

class StudioApp {
  constructor() {
    this.currentPreset = null;
    this.currentPadBank = 'A';
    this.currentCtrlBank = 'A';
    this.activeEditTarget = null; // { type: 'pad'|'knob'|'fader'|'switch', bank, index }

    this.midiEngine = new MidiEngine(
      (data, portName) => this.handleHardwareDump(data, portName),
      (msg, type) => this.updateMidiStatus(msg, type)
    );

    this.initElements();
    this.initEvents();
    this.loadDefaultPreset();
  }

  initElements() {
    this.lcdPresetName = document.getElementById('lcd-preset-name');
    this.lcdSlotNum = document.getElementById('lcd-slot-num');
    this.presetTemplateSelect = document.getElementById('preset-template-select');
    this.targetSlotSelect = document.getElementById('target-slot-select');

    this.padsContainer = document.getElementById('mpc-pads-container');
    this.knobsContainer = document.getElementById('knobs-container');
    this.fadersContainer = document.getElementById('faders-container');
    this.switchesContainer = document.getElementById('switches-container');

    this.padBankTabs = document.querySelectorAll('[data-pad-bank]');
    this.ctrlBankTabs = document.querySelectorAll('[data-ctrl-bank]');

    this.btnConnectMidi = document.getElementById('btn-connect-midi');
    this.btnPushMpk = document.getElementById('btn-push-mpk');
    this.btnExportSyx = document.getElementById('btn-export-syx');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.btnLoadFile = document.getElementById('btn-load-file');
    this.fileInputSyx = document.getElementById('file-input-syx');

    // Local library controls
    this.btnNewPreset = document.getElementById('btn-new-preset');
    this.btnSaveLocal = document.getElementById('btn-save-local');
    this.btnDeleteLocal = document.getElementById('btn-delete-local');
    this.optgroupUserPresets = document.getElementById('optgroup-user-presets');
    this.optgroupFactoryPresets = document.getElementById('optgroup-factory-presets');

    // New Preset Modal
    this.newPresetModal = document.getElementById('new-preset-modal');
    this.newPresetNameInput = document.getElementById('new-preset-name');
    this.newPresetSlotSelect = document.getElementById('new-preset-slot');
    this.newPresetTemplateSelect = document.getElementById('new-preset-template');
    this.btnNewModalClose = document.getElementById('btn-new-modal-close');
    this.btnNewModalCancel = document.getElementById('btn-new-modal-cancel');
    this.btnNewModalCreate = document.getElementById('btn-new-modal-create');

    this.midiStatusPill = document.getElementById('midi-status-pill');
    this.midiLed = document.getElementById('midi-led');
    this.midiStatusText = document.getElementById('midi-status-text');

    this.modal = document.getElementById('edit-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBody = document.getElementById('modal-body');
    this.btnModalClose = document.getElementById('btn-modal-close');
    this.btnModalCancel = document.getElementById('btn-modal-cancel');
    this.btnModalSave = document.getElementById('btn-modal-save');
    this.toast = document.getElementById('toast');

    // Populate slot dropdown (1 to 30)
    this.targetSlotSelect.innerHTML = '';
    this.newPresetSlotSelect.innerHTML = '';
    for (let i = 1; i <= 30; i++) {
      const opt1 = document.createElement('option');
      opt1.value = i;
      opt1.textContent = `Slot ${String(i).padStart(2, '0')}`;
      this.targetSlotSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = i;
      opt2.textContent = `Slot ${String(i).padStart(2, '0')}`;
      this.newPresetSlotSelect.appendChild(opt2);
    }

    this.userPresets = this.loadUserPresetsFromStorage();
    this.currentPresetId = null; // ID if active preset is in userPresets
  }

  loadUserPresetsFromStorage() {
    try {
      const raw = localStorage.getItem('mpk_user_presets');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading localStorage:', e);
      return [];
    }
  }

  saveUserPresetsToStorage() {
    try {
      localStorage.setItem('mpk_user_presets', JSON.stringify(this.userPresets));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  updatePresetDropdown() {
    this.optgroupUserPresets.innerHTML = '';
    if (this.userPresets.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = '(No saved presets yet)';
      this.optgroupUserPresets.appendChild(opt);
    } else {
      this.userPresets.forEach(p => {
        const opt = document.createElement('option');
        opt.value = `user:${p.id}`;
        opt.textContent = `★ ${p.name} (Slot ${String(p.slot).padStart(2, '0')})`;
        this.optgroupUserPresets.appendChild(opt);
      });
    }
  }

  initEvents() {
    this.btnConnectMidi.addEventListener('click', () => this.midiEngine.init());
    this.btnPushMpk.addEventListener('click', () => this.pushToHardware());
    this.btnExportSyx.addEventListener('click', () => this.exportSyx());
    this.btnExportJson.addEventListener('click', () => this.exportJson());

    this.btnLoadFile.addEventListener('click', () => this.fileInputSyx.click());
    this.fileInputSyx.addEventListener('change', (e) => this.handleFileSelect(e));

    // Local library events
    this.btnSaveLocal.addEventListener('click', () => this.saveToLocalLibrary());
    this.btnDeleteLocal.addEventListener('click', () => this.deleteCurrentPreset());
    this.btnNewPreset.addEventListener('click', () => this.openNewPresetModal());

    this.btnNewModalClose.addEventListener('click', () => this.closeNewPresetModal());
    this.btnNewModalCancel.addEventListener('click', () => this.closeNewPresetModal());
    this.btnNewModalCreate.addEventListener('click', () => this.createNewPreset());

    this.presetTemplateSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val.startsWith('user:')) {
        const id = val.replace('user:', '');
        this.loadUserPreset(id);
      } else if (val.startsWith('factory:')) {
        const name = val.replace('factory:', '');
        this.currentPresetId = null;
        this.btnDeleteLocal.style.display = 'none';
        this.loadFactoryPreset(name);
      }
    });

    this.targetSlotSelect.addEventListener('change', (e) => {
      this.currentPreset.slot = parseInt(e.target.value, 10);
      this.lcdSlotNum.textContent = `${String(this.currentPreset.slot).padStart(2, '0')}:`;
    });

    this.lcdPresetName.addEventListener('input', (e) => {
      this.currentPreset.name = e.target.value.slice(0, 8);
    });
    this.lcdPresetName.addEventListener('change', (e) => {
      this.currentPreset.name = e.target.value.slice(0, 8);
    });
    this.lcdPresetName.addEventListener('blur', (e) => {
      this.currentPreset.name = e.target.value.slice(0, 8);
    });

    // Bank Tabs
    this.padBankTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.padBankTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentPadBank = tab.getAttribute('data-pad-bank');
        this.renderPads();
      });
    });

    this.ctrlBankTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.ctrlBankTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCtrlBank = tab.getAttribute('data-ctrl-bank');
        this.renderControllers();
      });
    });

    // Modal
    this.btnModalClose.addEventListener('click', () => this.closeModal());
    this.btnModalCancel.addEventListener('click', () => this.closeModal());
    this.btnModalSave.addEventListener('click', () => this.saveModalParameter());
  }

  openNewPresetModal() {
    this.newPresetModal.classList.remove('hidden');
    this.newPresetNameInput.value = 'MyPreset';
    this.newPresetSlotSelect.value = this.targetSlotSelect.value || 30;
    this.newPresetNameInput.focus();
    this.newPresetNameInput.select();
  }

  closeNewPresetModal() {
    this.newPresetModal.classList.add('hidden');
  }

  createNewPreset() {
    const name = (this.newPresetNameInput.value.trim() || 'MyPreset').slice(0, 8);
    const slot = parseInt(this.newPresetSlotSelect.value, 10);
    const templateName = this.newPresetTemplateSelect.value;

    // Load base template bytes
    let baseBytes = null;
    if (FACTORY_PRESETS && FACTORY_PRESETS[templateName]) {
      const b64 = FACTORY_PRESETS[templateName];
      const bin = atob(b64);
      baseBytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) baseBytes[i] = bin.charCodeAt(i);
    }

    this.currentPreset = new MPK49Preset(baseBytes);
    this.currentPreset.name = name;
    this.currentPreset.slot = slot;
    this.currentPresetId = null;

    this.closeNewPresetModal();
    this.saveToLocalLibrary(); // Auto-save to user presets
    this.renderAll();
    this.showToast(`Created new preset "${name}"!`, 'success');
  }

  saveToLocalLibrary() {
    if (!this.currentPreset) return;
    if (this.lcdPresetName && this.lcdPresetName.value) {
      this.currentPreset.name = this.lcdPresetName.value.slice(0, 8);
    }
    if (this.targetSlotSelect && this.targetSlotSelect.value) {
      this.currentPreset.slot = parseInt(this.targetSlotSelect.value, 10);
    }
    const bytes = this.currentPreset.encode();

    // Convert to base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);

    if (this.currentPresetId) {
      // Update existing
      const existing = this.userPresets.find(p => p.id === this.currentPresetId);
      if (existing) {
        existing.name = this.currentPreset.name;
        existing.slot = this.currentPreset.slot;
        existing.updatedAt = new Date().toISOString();
        existing.b64 = b64;
      }
    } else {
      // Create new user preset entry
      const newEntry = {
        id: 'preset_' + Date.now(),
        name: this.currentPreset.name,
        slot: this.currentPreset.slot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        b64: b64
      };
      this.userPresets.push(newEntry);
      this.currentPresetId = newEntry.id;
    }

    this.saveUserPresetsToStorage();
    this.updatePresetDropdown();
    this.presetTemplateSelect.value = `user:${this.currentPresetId}`;
    this.btnDeleteLocal.style.display = 'inline-flex';
    this.showToast(`Saved "${this.currentPreset.name}" to My Presets!`, 'success');
  }

  loadUserPreset(id) {
    const entry = this.userPresets.find(p => p.id === id);
    if (!entry) return;

    const bin = atob(entry.b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    this.currentPreset = new MPK49Preset(bytes);
    this.currentPresetId = entry.id;
    this.btnDeleteLocal.style.display = 'inline-flex';
    this.showToast(`Loaded user preset "${entry.name}"`, 'info');
    this.renderAll();
  }

  deleteCurrentPreset() {
    if (!this.currentPresetId) return;
    const entry = this.userPresets.find(p => p.id === this.currentPresetId);
    if (!entry) return;

    if (!confirm(`Are you sure you want to delete "${entry.name}" from your saved presets?`)) {
      return;
    }

    this.userPresets = this.userPresets.filter(p => p.id !== this.currentPresetId);
    this.saveUserPresetsToStorage();
    this.updatePresetDropdown();
    this.currentPresetId = null;
    this.btnDeleteLocal.style.display = 'none';

    this.showToast(`Deleted "${entry.name}"`, 'info');
    this.loadDefaultPreset();
  }

  loadDefaultPreset() {
    this.updatePresetDropdown();
    if (this.userPresets.length > 0) {
      this.loadUserPreset(this.userPresets[0].id);
      this.presetTemplateSelect.value = `user:${this.userPresets[0].id}`;
    } else if (typeof FACTORY_PRESETS !== 'undefined' && FACTORY_PRESETS['Reason 14 (Factory)']) {
      this.loadFactoryPreset('Reason 14 (Factory)');
      this.presetTemplateSelect.value = 'factory:Reason 14 (Factory)';
    } else {
      this.currentPreset = new MPK49Preset();
      this.renderAll();
    }
  }

  loadFactoryPreset(name) {
    if (!FACTORY_PRESETS || !FACTORY_PRESETS[name]) return;
    const b64 = FACTORY_PRESETS[name];
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    this.currentPreset = new MPK49Preset(bytes);
    this.targetSlotSelect.value = this.currentPreset.slot;
    this.showToast(`Loaded "${name}" preset`, 'info');
    this.renderAll();
  }

  renderAll() {
    if (!this.currentPreset) return;
    this.lcdPresetName.value = this.currentPreset.name;
    this.lcdSlotNum.textContent = `${String(this.currentPreset.slot).padStart(2, '0')}:`;
    this.targetSlotSelect.value = this.currentPreset.slot;

    this.renderPads();
    this.renderControllers();
  }

  renderPads() {
    this.padsContainer.innerHTML = '';
    const pads = this.currentPreset.pads[this.currentPadBank] || [];

    pads.forEach((pad, idx) => {
      const el = document.createElement('div');
      el.className = 'mpc-pad';
      el.innerHTML = `
        <div class="pad-num">PAD ${idx + 1}</div>
        <div class="pad-note">${midiNoteToName(pad.note)}</div>
        <div class="pad-meta">CH ${pad.channel}</div>
      `;

      el.addEventListener('click', () => {
        el.classList.add('active');
        setTimeout(() => el.classList.remove('active'), 150);
        this.openEditModal('pad', this.currentPadBank, idx);
      });

      this.padsContainer.appendChild(el);
    });
  }

  renderControllers() {
    const bank = this.currentCtrlBank;

    // Render Knobs
    this.knobsContainer.innerHTML = '';
    const knobs = this.currentPreset.knobs[bank] || [];
    knobs.forEach((k, idx) => {
      const el = document.createElement('div');
      el.className = 'knob-channel';
      el.innerHTML = `
        <div class="knob-label">K${idx + 1}</div>
        <div class="knob-dial">
          <div class="knob-indicator"></div>
        </div>
        <div class="knob-cc-badge">CC ${k.cc}</div>
      `;
      el.addEventListener('click', () => this.openEditModal('knob', bank, idx));
      this.knobsContainer.appendChild(el);
    });

    // Render Faders
    this.fadersContainer.innerHTML = '';
    const faders = this.currentPreset.faders[bank] || [];
    faders.forEach((f, idx) => {
      const el = document.createElement('div');
      el.className = 'fader-channel';
      el.innerHTML = `
        <div class="fader-label">S${idx + 1}</div>
        <div class="fader-track-container">
          <div class="fader-slot"></div>
          <div class="fader-cap"><div class="fader-cap-line"></div></div>
        </div>
        <div class="fader-cc-badge">CC ${f.cc}</div>
      `;
      el.addEventListener('click', () => this.openEditModal('fader', bank, idx));
      this.fadersContainer.appendChild(el);
    });

    // Render Switches
    this.switchesContainer.innerHTML = '';
    const switches = this.currentPreset.switches[bank] || [];
    switches.forEach((sw, idx) => {
      const el = document.createElement('div');
      el.className = 'switch-channel';
      el.innerHTML = `
        <div class="fader-label">SW${idx + 1}</div>
        <div class="hw-switch"><div class="switch-led"></div></div>
        <div class="switch-cc-badge">CC ${sw.cc}</div>
      `;
      el.addEventListener('click', () => this.openEditModal('switch', bank, idx));
      this.switchesContainer.appendChild(el);
    });
  }

  openEditModal(type, bank, index) {
    this.activeEditTarget = { type, bank, index };
    this.modal.classList.remove('hidden');

    if (type === 'pad') {
      const pad = this.currentPreset.pads[bank][index];
      this.modalTitle.textContent = `Edit Bank ${bank} - Pad ${index + 1}`;
      this.modalBody.innerHTML = `
        <div class="form-group">
          <label>MIDI Note (e.g. C2, D#3, or 0-127):</label>
          <input type="text" id="edit-pad-note" value="${midiNoteToName(pad.note)}">
        </div>
        <div class="form-group">
          <label>MIDI Channel (1-16 or Common):</label>
          <input type="text" id="edit-pad-ch" value="${pad.channel}">
        </div>
      `;
    } else if (type === 'fader' || type === 'knob') {
      const ctrl = type === 'fader' ? this.currentPreset.faders[bank][index] : this.currentPreset.knobs[bank][index];
      const prefix = type === 'fader' ? 'Fader S' : 'Knob K';
      this.modalTitle.textContent = `Edit Bank ${bank} - ${prefix}${index + 1}`;
      this.modalBody.innerHTML = `
        <div class="form-group">
          <label>Assigned MIDI CC # (0-127):</label>
          <input type="number" id="edit-ctrl-cc" min="0" max="127" value="${ctrl.cc}">
        </div>
        <div class="form-group">
          <label>MIDI Channel (1-16):</label>
          <input type="number" id="edit-ctrl-ch" min="1" max="16" value="${ctrl.channel}">
        </div>
        <div class="form-group">
          <label>Min Value (0-127):</label>
          <input type="number" id="edit-ctrl-min" min="0" max="127" value="${ctrl.min}">
        </div>
        <div class="form-group">
          <label>Max Value (0-127):</label>
          <input type="number" id="edit-ctrl-max" min="0" max="127" value="${ctrl.max}">
        </div>
      `;
    } else if (type === 'switch') {
      const sw = this.currentPreset.switches[bank][index];
      this.modalTitle.textContent = `Edit Bank ${bank} - Switch SW${index + 1}`;
      this.modalBody.innerHTML = `
        <div class="form-group">
          <label>Assigned MIDI CC # (0-127):</label>
          <input type="number" id="edit-sw-cc" min="0" max="127" value="${sw.cc}">
        </div>
        <div class="form-group">
          <label>MIDI Channel (1-16):</label>
          <input type="number" id="edit-sw-ch" min="1" max="16" value="${sw.channel}">
        </div>
      `;
    }
  }

  saveModalParameter() {
    if (!this.activeEditTarget) return;
    const { type, bank, index } = this.activeEditTarget;

    if (type === 'pad') {
      const pad = this.currentPreset.pads[bank][index];
      const noteInput = document.getElementById('edit-pad-note').value;
      const chInput = document.getElementById('edit-pad-ch').value;

      pad.note = /^\d+$/.test(noteInput.trim()) ? parseInt(noteInput, 10) : nameToMidiNote(noteInput);
      pad.channel = chInput.toLowerCase() === 'common' ? 'Common' : parseInt(chInput, 10);
      this.renderPads();
    } else if (type === 'fader' || type === 'knob') {
      const ctrl = type === 'fader' ? this.currentPreset.faders[bank][index] : this.currentPreset.knobs[bank][index];
      ctrl.cc = parseInt(document.getElementById('edit-ctrl-cc').value, 10);
      ctrl.channel = parseInt(document.getElementById('edit-ctrl-ch').value, 10);
      ctrl.min = parseInt(document.getElementById('edit-ctrl-min').value, 10);
      ctrl.max = parseInt(document.getElementById('edit-ctrl-max').value, 10);
      this.renderControllers();
    } else if (type === 'switch') {
      const sw = this.currentPreset.switches[bank][index];
      sw.cc = parseInt(document.getElementById('edit-sw-cc').value, 10);
      sw.channel = parseInt(document.getElementById('edit-sw-ch').value, 10);
      this.renderControllers();
    }

    this.closeModal();
    this.showToast('Parameter updated', 'success');
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.activeEditTarget = null;
  }

  pushToHardware() {
    if (!this.midiEngine.isConnected) {
      alert('Please connect Web MIDI first by clicking "Connect Web MIDI".');
      return;
    }

    try {
      if (this.lcdPresetName && this.lcdPresetName.value) {
        this.currentPreset.name = this.lcdPresetName.value.slice(0, 8);
      }
      const targetSlot = parseInt(this.targetSlotSelect.value, 10);
      this.currentPreset.slot = targetSlot;
      const encoded = this.currentPreset.encode();
      const slot = this.midiEngine.sendPreset(encoded, targetSlot);
      this.showToast(`⚡️ Sent "${this.currentPreset.name}" to MPK49 Slot #${slot}!`, 'success');
    } catch (err) {
      this.showToast(`Write Error: ${err.message}`, 'error');
    }
  }

  exportSyx() {
    if (this.lcdPresetName && this.lcdPresetName.value) {
      this.currentPreset.name = this.lcdPresetName.value.slice(0, 8);
    }
    if (this.targetSlotSelect && this.targetSlotSelect.value) {
      this.currentPreset.slot = parseInt(this.targetSlotSelect.value, 10);
    }
    const bytes = this.currentPreset.encode();
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dt = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const filename = `slot${pad(this.currentPreset.slot)}_${this.currentPreset.name}_${dt}.syx`;

    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Saved ${filename}`, 'info');
  }

  exportJson() {
    if (this.lcdPresetName && this.lcdPresetName.value) {
      this.currentPreset.name = this.lcdPresetName.value.slice(0, 8);
    }
    if (this.targetSlotSelect && this.targetSlotSelect.value) {
      this.currentPreset.slot = parseInt(this.targetSlotSelect.value, 10);
    }
    const bytes = this.currentPreset.encode();
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dt = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    const filename = `slot${pad(this.currentPreset.slot)}_${this.currentPreset.name}_${dt}.json`;

    const payload = {
      device: "Akai MPK49",
      name: this.currentPreset.name,
      slot: this.currentPreset.slot,
      timestamp: new Date().toISOString(),
      pads: this.currentPreset.pads,
      knobs: this.currentPreset.knobs,
      faders: this.currentPreset.faders,
      switches: this.currentPreset.switches,
      bytes: Array.from(bytes)
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast(`Saved ${filename}`, 'info');
  }

  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(e.target.result);
          if (json.bytes) {
            this.currentPreset = new MPK49Preset(new Uint8Array(json.bytes));
          } else {
            throw new Error('JSON is missing raw bytes');
          }
        } else {
          // .syx binary
          const buffer = new Uint8Array(e.target.result);
          this.currentPreset = new MPK49Preset(buffer);
        }
        this.renderAll();
        this.showToast(`Opened "${file.name}"`, 'success');
      } catch (err) {
        alert(`Error opening file: ${err.message}`);
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    event.target.value = '';
  }

  handleHardwareDump(data, portName) {
    try {
      this.currentPreset = new MPK49Preset(data);
      this.renderAll();
      this.showToast(`Received dump from ${portName}: "${this.currentPreset.name}" (Slot #${this.currentPreset.slot})`, 'success');
    } catch (err) {
      console.error(err);
    }
  }

  updateMidiStatus(msg, type) {
    this.midiStatusText.textContent = msg;
    if (type === 'success') {
      this.midiLed.style.background = '#10b981';
      this.midiLed.style.boxShadow = '0 0 8px #10b981';
      this.btnConnectMidi.textContent = '✓ MIDI Ready';
      this.btnConnectMidi.disabled = true;
    } else if (type === 'error') {
      this.midiLed.style.background = '#ef4444';
      this.midiLed.style.boxShadow = 'none';
    }
  }

  showToast(message, type = 'info') {
    this.toast.textContent = message;
    this.toast.className = `toast show ${type}`;
    setTimeout(() => {
      this.toast.className = 'toast';
    }, 3500);
  }
}

// Boot Studio App on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  window.studio = new StudioApp();
});
