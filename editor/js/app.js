/**
 * MPK-Revival | Studio Application Controller
 * Inspired by Akai MPK49 console architecture & Vyzex layout.
 * Controls real-time LCD inspector, skeuomorphic surface switching,
 * warm analog synth preview, and Live Hardware Sensing (Notes & CCs).
 */

class StudioApp {
  constructor() {
    this.currentPreset = null;
    this.currentBlock = 'pads'; // 'pads' | 'controls' | 'misc'
    this.currentPadBank = 'A';
    this.currentCtrlBank = 'A';
    this.activeSelection = { type: 'pad', bank: 'A', index: 0 };
    this.audioCtx = null;
    this.soundEnabled = true;
    this.liveFollowEnabled = true;
    this.keyElements = {};
    this.activityTimer = null;

    this.midiEngine = new MidiEngine(
      (data, portName) => this.handleHardwareDump(data, portName),
      (msg, type) => this.updateMidiStatus(msg, type),
      (status, channel, note, velocity) => this.handleIncomingNote(status, channel, note, velocity),
      (channel, cc, value) => this.handleIncomingCc(channel, cc, value),
      (type, detail) => this.handleMidiActivity(type, detail)
    );

    this.initElements();
    this.initEvents();
    this.renderKeybed();
    this.loadDefaultPreset();

    // Auto-connect Web MIDI on boot
    this.midiEngine.init();

    // Unlock audio and ensure MIDI connection on first user interaction
    const unlockFn = () => {
      this.initAudio();
      if (!this.midiEngine.isConnected) {
        this.midiEngine.init();
      }
      window.removeEventListener('pointerdown', unlockFn);
      window.removeEventListener('keydown', unlockFn);
    };
    window.addEventListener('pointerdown', unlockFn);
    window.addEventListener('keydown', unlockFn);
  }

  initAudio() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /* Warm musical synth tone (Rhodes/analog pluck) instead of harsh beep */
  playNoteSound(midiNote) {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      // 1. Primary warm triangle wave
      const osc1 = this.audioCtx.createOscillator();
      osc1.type = 'triangle';
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      osc1.frequency.setValueAtTime(freq, now);

      // 2. Warm sub-sine oscillator
      const osc2 = this.audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq, now);

      // 3. Low-pass filter for smooth vintage roll-off
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.4);

      // 4. Smooth Amp envelope
      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.015); // gentle 15ms attack
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45); // smooth decay

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.46);
      osc2.stop(now + 0.46);
    } catch (e) {
      // Audio policy catch
    }
  }

  initElements() {
    // Topbar elements
    this.lcdPresetName = document.getElementById('lcd-preset-name');
    this.lcdSlotNum = document.getElementById('lcd-slot-num');
    this.presetTemplateSelect = document.getElementById('preset-template-select');
    this.targetSlotSelect = document.getElementById('target-slot-select');
    this.btnSaveLocal = document.getElementById('btn-save-local');
    this.btnNewPreset = document.getElementById('btn-new-preset');
    this.btnDeleteLocal = document.getElementById('btn-delete-local');
    this.btnPushMpk = document.getElementById('btn-push-mpk');
    this.btnLoadFile = document.getElementById('btn-load-file');
    this.fileInputSyx = document.getElementById('file-input-syx');
    this.btnExportSyx = document.getElementById('btn-export-syx');
    this.btnExportJson = document.getElementById('btn-export-json');
    this.midiStatusPill = document.getElementById('midi-status-pill');
    this.midiLed = document.getElementById('midi-led');
    this.midiStatusText = document.getElementById('midi-status-text');
    this.midiActivityPill = document.getElementById('midi-activity-pill');
    this.midiActivityText = document.getElementById('midi-activity-text');
    this.btnConnectMidi = document.getElementById('btn-connect-midi');
    this.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.btnToggleFollow = document.getElementById('btn-toggle-follow');
    this.hwProfileSelect = document.getElementById('hw-profile-select');

    this.optgroupUserPresets = document.getElementById('optgroup-user-presets');
    this.optgroupFactoryPresets = document.getElementById('optgroup-factory-presets');

    // Surface Views
    this.surfacePadsView = document.getElementById('surface-pads-view');
    this.surfaceControlsView = document.getElementById('surface-controls-view');
    this.surfaceGlobalView = document.getElementById('surface-global-view');
    this.mpcPadsGrid = document.getElementById('mpc-pads-grid');
    this.controlsChannelsGrid = document.getElementById('controls-channels-grid');

    // Block Select Buttons
    this.btnBlockPads = document.getElementById('btn-block-pads');
    this.btnBlockControls = document.getElementById('btn-block-controls');
    this.btnBlockMisc = document.getElementById('btn-block-misc');
    this.blockButtons = [this.btnBlockPads, this.btnBlockControls, this.btnBlockMisc];

    // Master LCD Elements
    this.lcdSelectionHeader = document.getElementById('lcd-selection-header');
    this.lcdInspectorBody = document.getElementById('lcd-inspector-body');

    // Lower Status Matrix
    this.valOctave = document.getElementById('val-octave');
    this.valTranspose = document.getElementById('val-transpose');
    this.valTempo = document.getElementById('val-tempo');
    this.valTimediv = document.getElementById('val-timediv');
    this.valArptype = document.getElementById('val-arptype');
    this.valArprange = document.getElementById('val-arprange');
    this.valArpgate = document.getElementById('val-arpgate');
    this.valArpswing = document.getElementById('val-arpswing');

    // Performance Strip Bank Buttons
    this.padBankButtons = document.querySelectorAll('[data-pad-bank]');
    this.ctrlBankButtons = document.querySelectorAll('[data-ctrl-bank]');
    this.currentPadBankLabel = document.getElementById('current-pad-bank-label');
    this.currentCtrlBankLabel = document.getElementById('current-ctrl-bank-label');

    // Piano Keybed
    this.pianoKeybed = document.getElementById('piano-keybed');

    // Rear Sockets
    this.btnSocketExp = document.getElementById('btn-socket-exp');
    this.btnSocketSus = document.getElementById('btn-socket-sus');

    // New Preset Modal
    this.newPresetModal = document.getElementById('new-preset-modal');
    this.newPresetNameInput = document.getElementById('new-preset-name');
    this.newPresetSlotSelect = document.getElementById('new-preset-slot');
    this.newPresetTemplateSelect = document.getElementById('new-preset-template');
    this.btnNewModalClose = document.getElementById('btn-new-modal-close');
    this.btnNewModalCancel = document.getElementById('btn-new-modal-cancel');
    this.btnNewModalCreate = document.getElementById('btn-new-modal-create');

    this.toast = document.getElementById('toast');

    // Populate Slot Selects (1 to 30)
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
    this.currentPresetId = null;
  }

  loadUserPresetsFromStorage() {
    try {
      const raw = localStorage.getItem('mpk_user_presets');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveUserPresetsToStorage() {
    try {
      localStorage.setItem('mpk_user_presets', JSON.stringify(this.userPresets));
    } catch (e) {
      console.error(e);
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

    // Drag & Drop preset files (.json / .syx) anywhere onto editor window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadFileObject(e.dataTransfer.files[0]);
      }
    });

    this.btnSaveLocal.addEventListener('click', () => this.saveToLocalLibrary());
    this.btnDeleteLocal.addEventListener('click', () => this.deleteCurrentPreset());
    this.btnNewPreset.addEventListener('click', () => this.openNewPresetModal());

    this.btnNewModalClose.addEventListener('click', () => this.closeNewPresetModal());
    this.btnNewModalCancel.addEventListener('click', () => this.closeNewPresetModal());
    this.btnNewModalCreate.addEventListener('click', () => this.createNewPreset());

    // Sound toggle
    if (this.btnToggleSound) {
      this.btnToggleSound.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        this.btnToggleSound.textContent = this.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        this.btnToggleSound.style.opacity = this.soundEnabled ? '1' : '0.6';
        this.showToast(this.soundEnabled ? 'Audio preview enabled' : 'Audio preview muted', 'info');
      });
    }

    // Live Follow toggle
    if (this.btnToggleFollow) {
      this.btnToggleFollow.addEventListener('click', () => {
        this.liveFollowEnabled = !this.liveFollowEnabled;
        this.btnToggleFollow.textContent = this.liveFollowEnabled ? '🎯 Live Follow: ON' : '🎯 Live Follow: OFF';
        this.btnToggleFollow.style.color = this.liveFollowEnabled ? '#4ade80' : '#94a3b8';
        this.btnToggleFollow.style.borderColor = this.liveFollowEnabled ? 'rgba(74, 222, 128, 0.4)' : '#475569';
        this.showToast(this.liveFollowEnabled ? 'Live Hardware Follow ON: Touched controls will auto-focus' : 'Live Hardware Follow OFF', 'info');
      });
    }

    if (this.hwProfileSelect) {
      this.hwProfileSelect.addEventListener('change', (e) => {
        this.updateActiveHardwareProfile(e.target.value);
      });
    }

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
      this.lcdSlotNum.textContent = String(this.currentPreset.slot).padStart(2, '0');
    });

    this.lcdPresetName.addEventListener('input', (e) => {
      this.currentPreset.name = e.target.value.slice(0, 8);
    });
    this.lcdPresetName.addEventListener('change', (e) => {
      this.currentPreset.name = e.target.value.slice(0, 8);
    });

    // Block Select: PADS | CONTROLS | MISC
    this.btnBlockPads.addEventListener('click', () => this.setBlock('pads'));
    this.btnBlockControls.addEventListener('click', () => this.setBlock('controls'));
    this.btnBlockMisc.addEventListener('click', () => this.setBlock('misc'));

    // Pad Bank Buttons
    this.padBankButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const bank = btn.getAttribute('data-pad-bank');
        this.setPadBank(bank);
      });
    });

    // Control Bank Buttons
    this.ctrlBankButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const bank = btn.getAttribute('data-ctrl-bank');
        this.setCtrlBank(bank);
      });
    });

    // Rear Sockets
    this.btnSocketExp.addEventListener('click', () => {
      this.setBlock('misc');
      this.selectElement('pedal', null, 'expressionPedal');
    });
    this.btnSocketSus.addEventListener('click', () => {
      this.setBlock('misc');
      this.selectElement('pedal', null, 'sustainPedal');
    });

    // Global Cards click
    document.getElementById('card-mod-wheel').addEventListener('click', () => {
      this.selectElement('wheel', null, 'modWheel');
    });
    document.getElementById('card-exp-pedal').addEventListener('click', () => {
      this.selectElement('pedal', null, 'expressionPedal');
    });
    document.getElementById('card-sus-pedal').addEventListener('click', () => {
      this.selectElement('pedal', null, 'sustainPedal');
    });
    document.getElementById('card-transport-cfg').addEventListener('click', () => {
      this.selectElement('global', null, 'transportMode');
    });

    // Lower Matrix click to edit
    ['octave', 'transpose', 'tempo', 'timediv', 'arptype', 'arprange', 'arpgate', 'arpswing'].forEach(id => {
      const el = document.getElementById(`cell-${id}`);
      if (el) {
        el.addEventListener('click', () => {
          this.selectElement('global', null, id);
        });
      }
    });

    // Wheels Click
    document.getElementById('wheel-pitch').addEventListener('click', () => {
      this.showToast('Pitch Bend Wheel: Center-sprung pitch modulation', 'info');
    });
    document.getElementById('wheel-mod').addEventListener('click', () => {
      this.selectElement('wheel', null, 'modWheel');
    });
  }

  /* Visual MIDI Activity Monitor (Top Bar) */
  handleMidiActivity(type, detail) {
    if (!this.midiActivityPill || !this.midiActivityText) return;

    let text = 'MIDI IN';
    if (type === 'cc') {
      text = `🎛️ CC ${detail.cc}: ${detail.val} (Ch ${detail.channel})`;
    } else if (type === 'note_on') {
      text = `🎹 ${midiNoteToName(detail.note)} (${detail.note}) Vel ${detail.vel}`;
    } else if (type === 'note_off') {
      text = `🎹 ${midiNoteToName(detail.note)} Off`;
    } else if (type === 'pitch_bend') {
      text = `〰️ Bend ${detail.val}`;
    }

    this.midiActivityText.textContent = text;
    this.midiActivityPill.classList.add('flash-active');
    clearTimeout(this.activityTimer);
    this.activityTimer = setTimeout(() => {
      if (this.midiActivityPill) this.midiActivityPill.classList.remove('flash-active');
    }, 280);
  }

  /* Live Hardware Sensing: Note On / Off */
  handleIncomingNote(status, channel, note, velocity) {
    if (status === 'on') {
      // 1. Highlight on virtual keybed
      if (this.keyElements && this.keyElements[note]) {
        this.keyElements[note].classList.add('active');
      }

      // 2. Warm musical synth preview
      if (this.soundEnabled) {
        this.playNoteSound(note);
      }

      // 3. Live Navigation: Point to the key or pad in the GUI
      if (this.liveFollowEnabled && this.currentPreset) {
        // First check if this note is mapped to any MPC Pad (search active bank first)
        const padBanks = [this.currentPadBank, ...['A', 'B', 'C', 'D'].filter(b => b !== this.currentPadBank)];
        let matchedBank = null;
        let matchedIdx = -1;

        for (const b of padBanks) {
          const pads = this.currentPreset.pads[b] || [];
          const idx = pads.findIndex(p => p.note === note);
          if (idx !== -1) {
            matchedBank = b;
            matchedIdx = idx;
            break;
          }
        }

        if (matchedBank !== null) {
          this.setBlock('pads');
          if (matchedBank !== this.currentPadBank) {
            this.setPadBank(matchedBank);
          }
          this.selectElement('pad', matchedBank, matchedIdx);
          this.showToast(`🎯 Pointed to Pad ${matchedIdx + 1} [Bank ${matchedBank}] (${midiNoteToName(note)})`, 'info');
        } else {
          // Point directly to this piano key on the keybed
          this.selectElement('key', null, note);
          this.showToast(`🎯 Pointed to Key ${midiNoteToName(note)} (${note})`, 'info');
        }
      }
    } else if (status === 'off') {
      if (this.keyElements && this.keyElements[note]) {
        this.keyElements[note].classList.remove('active');
      }
    }
  }

  /* Live Hardware Sensing: Control Change */
  handleIncomingCc(channel, cc, value) {
    if (!this.liveFollowEnabled || !this.currentPreset) return;

    // 1. Mod Wheel (CC 1)
    if (cc === 1 || (this.currentPreset.wheels?.modWheel?.cc === cc)) {
      this.setBlock('misc');
      this.selectElement('wheel', null, 'modWheel');
      this.showToast(`🎯 Pointed to Mod Wheel (CC 1 = ${value})`, 'info');
      return;
    }

    // 2. Expression Pedal (CC 11)
    if (cc === 11 || (this.currentPreset.wheels?.expressionPedal?.cc === cc)) {
      this.setBlock('misc');
      this.selectElement('pedal', null, 'expressionPedal');
      this.showToast(`🎯 Pointed to Expression Pedal (CC 11 = ${value})`, 'info');
      return;
    }

    // 3. Sustain Pedal (CC 64)
    if (cc === 64 || (this.currentPreset.wheels?.sustainPedal?.cc === cc)) {
      this.setBlock('misc');
      this.selectElement('pedal', null, 'sustainPedal');
      this.showToast(`🎯 Pointed to Sustain Pedal (CC 64 = ${value})`, 'info');
      return;
    }

    // 4. Search Knobs, Faders, Switches using Active Hardware Profile (fallback to current edited preset)
    const resolver = this.activeHardwareProfile || this.currentPreset;
    const ctrlBanks = [this.currentCtrlBank, ...['A', 'B', 'C'].filter(b => b !== this.currentCtrlBank)];

    // Check sliders / faders first (often moved intentionally)
    for (const b of ctrlBanks) {
      const faders = resolver.faders ? resolver.faders[b] : [];
      const idx = faders ? faders.findIndex(f => f.cc === cc) : -1;
      if (idx !== -1) {
        this.setBlock('controls');
        if (b !== this.currentCtrlBank) this.setCtrlBank(b);
        this.selectElement('fader', b, idx);
        this.showToast(`🎯 Pointed to Slider F${idx + 1} [Bank ${b}] (CC ${cc} = ${value})`, 'info');
        return;
      }
    }

    // Check knobs
    for (const b of ctrlBanks) {
      const knobs = resolver.knobs ? resolver.knobs[b] : [];
      const idx = knobs ? knobs.findIndex(k => k.cc === cc) : -1;
      if (idx !== -1) {
        this.setBlock('controls');
        if (b !== this.currentCtrlBank) this.setCtrlBank(b);
        this.selectElement('knob', b, idx);
        this.showToast(`🎯 Pointed to Knob K${idx + 1} [Bank ${b}] (CC ${cc} = ${value})`, 'info');
        return;
      }
    }

    // Check switches
    for (const b of ctrlBanks) {
      const switches = resolver.switches ? resolver.switches[b] : [];
      const idx = switches ? switches.findIndex(s => s.cc === cc) : -1;
      if (idx !== -1) {
        this.setBlock('controls');
        if (b !== this.currentCtrlBank) this.setCtrlBank(b);
        this.selectElement('switch', b, idx);

        // Update active LED state
        if (!this.switchActiveStates) this.switchActiveStates = {};
        const swKey = `${b}_${idx}`;
        this.switchActiveStates[swKey] = (value > 0);

        const swEl = this.controlsChannelsGrid.querySelector(`[data-type="switch"][data-idx="${idx}"]`);
        if (swEl && b === this.currentCtrlBank) {
          swEl.classList.toggle('active', value > 0);
        }

        const swMode = (resolver.switches && resolver.switches[b] && resolver.switches[b][idx]?.mode === 1) ? 'Toggle' : 'Momentary';
        this.showToast(`🎯 Switch S${idx + 1} [Bank ${b}] (${swMode}, CC ${cc} = ${value})`, 'info');
        return;
      }
    }
  }

  updateActiveHardwareProfile(val) {
    try {
      if (val.startsWith('factory:')) {
        const name = val.replace('factory:', '');
        if (FACTORY_PRESETS && FACTORY_PRESETS[name]) {
          const bin = atob(FACTORY_PRESETS[name]);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          this.activeHardwareProfile = new MPK49Preset(bytes);
          this.showToast(`🎹 Hardware reference set to "${name}"`, 'info');
          return;
        }
      }
      this.activeHardwareProfile = null;
    } catch (e) {
      console.error('Failed to update hardware profile:', e);
      this.activeHardwareProfile = null;
    }
  }

  setBlock(block) {
    this.currentBlock = block;
    this.blockButtons.forEach(b => {
      b.classList.remove('active');
      const led = b.querySelector('.capsule-led');
      if (led) led.classList.remove('led-cyan');
    });

    const activeBtn = document.querySelector(`[data-block="${block}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      const led = activeBtn.querySelector('.capsule-led');
      if (led) led.classList.add('led-cyan');
    }

    this.surfacePadsView.classList.remove('active');
    this.surfaceControlsView.classList.remove('active');
    this.surfaceGlobalView.classList.remove('active');

    if (block === 'pads') {
      this.surfacePadsView.classList.add('active');
      this.renderPads();
    } else if (block === 'controls') {
      this.surfaceControlsView.classList.add('active');
      this.renderControllers();
    } else {
      this.surfaceGlobalView.classList.add('active');
    }
  }

  setPadBank(bank) {
    this.currentPadBank = bank;
    this.padBankButtons.forEach(b => {
      b.classList.remove('active-green');
      const led = b.querySelector('.btn-led');
      if (led) led.classList.remove('led-green');
    });

    const activeBtn = document.querySelector(`[data-pad-bank="${bank}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active-green');
      const led = activeBtn.querySelector('.btn-led');
      if (led) led.classList.add('led-green');
    }

    if (this.currentPadBankLabel) this.currentPadBankLabel.textContent = bank;
    this.renderPads();
  }

  setCtrlBank(bank) {
    this.currentCtrlBank = bank;
    this.ctrlBankButtons.forEach(b => {
      b.classList.remove('active-green');
      const led = b.querySelector('.btn-led');
      if (led) led.classList.remove('led-green');
    });

    const activeBtn = document.querySelector(`[data-ctrl-bank="${bank}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active-green');
      const led = activeBtn.querySelector('.btn-led');
      if (led) led.classList.add('led-green');
    }

    if (this.currentCtrlBankLabel) this.currentCtrlBankLabel.textContent = bank;
    this.renderControllers();
  }

  loadDefaultPreset() {
    this.updatePresetDropdown();
    if (this.userPresets.length > 0) {
      this.loadUserPreset(this.userPresets[0].id);
      this.presetTemplateSelect.value = `user:${this.userPresets[0].id}`;
    } else if (typeof FACTORY_PRESETS !== 'undefined' && FACTORY_PRESETS['Slot 02: LiveLite']) {
      this.loadFactoryPreset('Slot 02: LiveLite');
      this.presetTemplateSelect.value = 'factory:Slot 02: LiveLite';
    } else {
      this.currentPreset = new MPK49Preset();
      this.renderAll();
    }

    // Default hardware on desk reference to Slot 02: LiveLite (or whatever is selected)
    const initialHw = this.hwProfileSelect ? this.hwProfileSelect.value : 'factory:Slot 02: LiveLite';
    this.updateActiveHardwareProfile(initialHw);
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

  renderAll() {
    if (!this.currentPreset) return;
    this.lcdPresetName.value = this.currentPreset.name;
    this.lcdSlotNum.textContent = String(this.currentPreset.slot).padStart(2, '0');
    this.targetSlotSelect.value = this.currentPreset.slot;

    this.renderPads();
    this.renderControllers();
    this.renderLowerMatrix();
    this.renderInspector();
  }

  renderLowerMatrix() {
    if (!this.currentPreset || !this.currentPreset.global) return;
    const g = this.currentPreset.global;
    this.valOctave.textContent = g.octave ?? 0;
    this.valTranspose.textContent = g.transpose ?? 0;
    this.valTempo.textContent = g.tempo ?? 120;
    this.valTimediv.textContent = g.timeDivision ?? '1/16';
    this.valArptype.textContent = g.arpType ?? 'Up';
    this.valArprange.textContent = g.arpRange ?? '+0';
    this.valArpgate.textContent = g.arpGate ?? 50;
    this.valArpswing.textContent = g.arpSwing ?? 50;

    const tr = document.getElementById('lbl-transport-mode-indicator');
    if (tr) tr.textContent = g.transportMode || 'CC';

    const lblTrMode = document.getElementById('lbl-trans-mode');
    if (lblTrMode) lblTrMode.textContent = g.transportMode || 'MIDI CC';

    const lblClk = document.getElementById('lbl-clock-src');
    if (lblClk) lblClk.textContent = g.clockSource || 'Internal';
  }

  /* Render 12 MPC Pads: Pad 10,11,12 top row down to Pad 1,2,3 bottom row */
  renderPads() {
    this.mpcPadsGrid.innerHTML = '';
    const bank = this.currentPadBank;
    const pads = this.currentPreset.pads[bank] || [];

    const padVisualOrder = [
      9, 10, 11, // Pads 10, 11, 12
      6, 7, 8,   // Pads 7, 8, 9
      3, 4, 5,   // Pads 4, 5, 6
      0, 1, 2    // Pads 1, 2, 3
    ];

    padVisualOrder.forEach(idx => {
      const pad = pads[idx];
      if (!pad) return;

      const isSelected = this.activeSelection.type === 'pad' && 
                         this.activeSelection.bank === bank && 
                         this.activeSelection.index === idx;

      const el = document.createElement('div');
      el.className = `mpc-pad-unit ${isSelected ? 'selected' : ''}`;
      el.innerHTML = `
        <div class="pad-top-tag">PAD ${pad.padIndex}</div>
        <div class="pad-center-ch">${pad.channel === 'Common' ? 'COMMON' : `CH ${pad.channel}`}</div>
        <div class="pad-bottom-note">${midiNoteToName(pad.note)}</div>
      `;

      el.addEventListener('click', () => {
        this.playNoteSound(pad.note);
        this.selectElement('pad', bank, idx);
      });

      this.mpcPadsGrid.appendChild(el);
    });
  }

  /* Render 8 Controller Channels (K1..K8, F1..F8, S1..S8) */
  renderControllers() {
    this.controlsChannelsGrid.innerHTML = '';
    const bank = this.currentCtrlBank;
    const knobs = this.currentPreset.knobs[bank] || [];
    const faders = this.currentPreset.faders[bank] || [];
    const switches = this.currentPreset.switches[bank] || [];

    for (let i = 0; i < 8; i++) {
      const k = knobs[i] || { cc: 32 + i, channel: '1A', min: 0, max: 127 };
      const f = faders[i] || { cc: 22 + i, channel: '1A', min: 0, max: 127 };
      const sw = switches[i] || { cc: 12 + i, channel: '1A', mode: 1 };

      const isKnobSel = this.activeSelection.type === 'knob' && this.activeSelection.bank === bank && this.activeSelection.index === i;
      const isFaderSel = this.activeSelection.type === 'fader' && this.activeSelection.bank === bank && this.activeSelection.index === i;
      const isSwitchSel = this.activeSelection.type === 'switch' && this.activeSelection.bank === bank && this.activeSelection.index === i;
      const isSwitchActive = Boolean(this.switchActiveStates && this.switchActiveStates[`${bank}_${i}`]);

      const angle = -135 + ((k.cc / 127) * 270);
      const faderBottomPct = (f.max / 127) * 80;

      const col = document.createElement('div');
      col.className = 'channel-strip';
      col.innerHTML = `
        <!-- Knob -->
        <div class="knob-unit ${isKnobSel ? 'selected' : ''}" data-type="knob" data-idx="${i}">
          <div class="knob-readout">${k.channel === 'Common' ? 'COMMON' : k.channel} · CC ${k.cc}</div>
          <div class="knob-rotary-dial">
            <div class="knob-needle" style="transform: translateX(-50%) rotate(${angle}deg);"></div>
          </div>
          <div class="knob-tag">K${i + 1}</div>
        </div>

        <!-- Fader -->
        <div class="fader-unit ${isFaderSel ? 'selected' : ''}" data-type="fader" data-idx="${i}">
          <div class="knob-readout">${f.channel === 'Common' ? 'COMMON' : f.channel} · CC ${f.cc}</div>
          <div class="fader-track-rail">
            <div class="fader-cap-thumb" style="bottom: ${Math.max(10, Math.min(85, faderBottomPct))}%;"></div>
          </div>
          <div class="fader-tag">F${i + 1}</div>
        </div>

        <!-- Switch -->
        <div class="switch-unit ${isSwitchSel ? 'selected' : ''} ${isSwitchActive ? 'active' : ''}" data-type="switch" data-idx="${i}">
          <div class="knob-readout">${sw.channel === 'Common' ? 'COMMON' : sw.channel} · CC ${sw.cc}</div>
          <div class="switch-btn-hw" title="Click to test switch LED">
            <div class="switch-led-dot"></div>
          </div>
          <div class="switch-tag">
            <span>S${i + 1}</span>
            <span class="switch-mode-badge ${sw.mode === 1 ? 'tgl' : 'mmt'}" title="${sw.mode === 1 ? 'Toggle Mode (0/127)' : 'Momentary Mode'}">${sw.mode === 1 ? 'TGL' : 'MMT'}</span>
          </div>
        </div>
      `;

      col.querySelector('[data-type="knob"]').addEventListener('click', () => {
        this.selectElement('knob', bank, i);
      });
      col.querySelector('[data-type="fader"]').addEventListener('click', () => {
        this.selectElement('fader', bank, i);
      });
      
      const swUnit = col.querySelector('[data-type="switch"]');
      swUnit.addEventListener('click', (e) => {
        this.selectElement('switch', bank, i);
        // If clicking directly on or inside the hardware button, toggle or pulse virtual LED
        if (e.target.closest('.switch-btn-hw')) {
          if (!this.switchActiveStates) this.switchActiveStates = {};
          const swKey = `${bank}_${i}`;
          if (sw.mode === 1) {
            this.switchActiveStates[swKey] = !this.switchActiveStates[swKey];
            swUnit.classList.toggle('active', this.switchActiveStates[swKey]);
          } else {
            this.switchActiveStates[swKey] = true;
            swUnit.classList.add('active');
            setTimeout(() => {
              this.switchActiveStates[swKey] = false;
              swUnit.classList.remove('active');
            }, 250);
          }
        }
      });

      this.controlsChannelsGrid.appendChild(col);
    }
  }

  selectElement(type, bank, index) {
    this.activeSelection = { type, bank, index };
    
    // Clear key selection highlight on keybed, or highlight selected key
    if (this.keyElements) {
      Object.values(this.keyElements).forEach(el => el.classList.remove('selected'));
      if (type === 'key' && this.keyElements[index]) {
        this.keyElements[index].classList.add('selected');
      }
    }

    if (type === 'pad') {
      this.renderPads();
    } else if (type === 'knob' || type === 'fader' || type === 'switch') {
      this.renderControllers();
    }

    this.renderInspector();
  }

  /* Render Master LCD Inspector Form */
  renderInspector() {
    const { type, bank, index } = this.activeSelection;
    if (!this.currentPreset) return;

    if (type === 'pad') {
      const pad = this.currentPreset.pads[bank][index];
      this.lcdSelectionHeader.textContent = `Select: Pad ${pad.padIndex}, Bank ${bank}`;
      this.lcdInspectorBody.innerHTML = `
        <div class="lcd-tabs-row">
          <button class="lcd-tab-pill ${pad.mode === 3 ? 'active' : ''}" id="tab-pad-note">Note</button>
          <button class="lcd-tab-pill ${pad.mode === 1 ? 'active' : ''}" id="tab-pad-cc">Control Change</button>
          <button class="lcd-tab-pill ${pad.mode === 2 ? 'active' : ''}" id="tab-pad-pc">Program Change</button>
        </div>
        <div class="lcd-form-row">
          <div class="lcd-field-box">
            <label>MIDI CH</label>
            <select id="inp-pad-ch">
              <option value="Common" ${pad.channel === 'Common' ? 'selected' : ''}>Common</option>
              ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${pad.channel === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}
            </select>
          </div>
          <div class="lcd-field-box">
            <label>NOTE #</label>
            <input type="text" id="inp-pad-note" value="${midiNoteToName(pad.note)}" title="Type note name (e.g. C3, F#2) or MIDI number">
          </div>
          <div class="lcd-field-box">
            <label>PLAY MODE</label>
            <select id="inp-pad-playmode">
              <option value="MTY">MTY (Momentary)</option>
              <option value="TGL">TGL (Toggle)</option>
            </select>
          </div>
          <div class="lcd-field-box">
            <label>PRESSURE</label>
            <select id="inp-pad-pressure">
              <option value="0" ${pad.aftertouch === 0 ? 'selected' : ''}>Off</option>
              <option value="1" ${pad.aftertouch === 1 ? 'selected' : ''}>Channel</option>
              <option value="2" ${pad.aftertouch === 2 ? 'selected' : ''}>Poly</option>
            </select>
          </div>
        </div>
      `;

      document.getElementById('inp-pad-ch').addEventListener('change', (e) => {
        pad.channel = e.target.value === 'Common' ? 'Common' : parseInt(e.target.value, 10);
        this.renderPads();
      });

      const inpPadNote = document.getElementById('inp-pad-note');
      inpPadNote.addEventListener('change', (e) => {
        const val = e.target.value.trim();
        pad.note = /^\d+$/.test(val) ? parseInt(val, 10) : nameToMidiNote(val);
        e.target.value = midiNoteToName(pad.note);
        this.renderPads();
        this.showToast(`Set Pad ${pad.padIndex} to ${midiNoteToName(pad.note)} (${pad.note})`, 'info');
      });

      document.getElementById('inp-pad-pressure').addEventListener('change', (e) => {
        pad.aftertouch = parseInt(e.target.value, 10);
      });

      document.getElementById('tab-pad-note').addEventListener('click', () => {
        pad.mode = 3;
        this.renderInspector();
      });
      document.getElementById('tab-pad-cc').addEventListener('click', () => {
        pad.mode = 1;
        this.renderInspector();
      });
      document.getElementById('tab-pad-pc').addEventListener('click', () => {
        pad.mode = 2;
        this.renderInspector();
      });

    } else if (type === 'knob' || type === 'fader') {
      const ctrl = type === 'knob' ? this.currentPreset.knobs[bank][index] : this.currentPreset.faders[bank][index];
      const prefix = type === 'knob' ? 'Knob' : 'Fader';
      const num = index + 1;

      this.lcdSelectionHeader.textContent = `Select: ${prefix} ${num}, Bank ${bank}`;
      this.lcdInspectorBody.innerHTML = `
        <div class="lcd-tabs-row">
          <button class="lcd-tab-pill active">Control Change</button>
          <button class="lcd-tab-pill">Aftertouch</button>
        </div>
        <div class="lcd-form-row">
          <div class="lcd-field-box">
            <label>MIDI CH</label>
            <select id="inp-ctrl-ch">
              <option value="Common" ${ctrl.channel === 'Common' ? 'selected' : ''}>Common</option>
              <optgroup label="Port A">
                ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}A" ${ctrl.channel === `${i + 1}A` ? 'selected' : ''}>${i + 1}A</option>`).join('')}
              </optgroup>
              <optgroup label="Port B">
                ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}B" ${ctrl.channel === `${i + 1}B` ? 'selected' : ''}>${i + 1}B</option>`).join('')}
              </optgroup>
            </select>
          </div>
          <div class="lcd-field-box">
            <label>CONTROL # (CC)</label>
            <input type="number" id="inp-ctrl-cc" min="0" max="127" value="${ctrl.cc}">
          </div>
          <div class="lcd-field-box">
            <label>MINIMUM</label>
            <input type="number" id="inp-ctrl-min" min="0" max="127" value="${ctrl.min}">
          </div>
          <div class="lcd-field-box">
            <label>MAXIMUM</label>
            <input type="number" id="inp-ctrl-max" min="0" max="127" value="${ctrl.max}">
          </div>
        </div>
      `;

      document.getElementById('inp-ctrl-ch').addEventListener('change', (e) => {
        ctrl.channel = e.target.value;
        this.renderControllers();
      });

      const inpCtrlCc = document.getElementById('inp-ctrl-cc');
      inpCtrlCc.addEventListener('change', (e) => {
        ctrl.cc = parseInt(e.target.value, 10);
        this.renderControllers();
        this.showToast(`Set ${prefix} ${num} to CC ${ctrl.cc}`, 'info');
      });

      document.getElementById('inp-ctrl-min').addEventListener('change', (e) => {
        ctrl.min = parseInt(e.target.value, 10);
      });
      document.getElementById('inp-ctrl-max').addEventListener('change', (e) => {
        ctrl.max = parseInt(e.target.value, 10);
        this.renderControllers();
      });

    } else if (type === 'switch') {
      const sw = this.currentPreset.switches[bank][index];
      this.lcdSelectionHeader.textContent = `Select: Switch SW${index + 1}, Bank ${bank}`;
      this.lcdInspectorBody.innerHTML = `
        <div class="lcd-tabs-row">
          <button class="lcd-tab-pill ${sw.mode === 1 ? 'active' : ''}" id="tab-sw-toggle">CC Toggle</button>
          <button class="lcd-tab-pill ${sw.mode === 0 ? 'active' : ''}" id="tab-sw-mom">CC Momentary</button>
        </div>
        <div class="lcd-form-row">
          <div class="lcd-field-box">
            <label>MIDI CH</label>
            <select id="inp-sw-ch">
              <option value="Common" ${sw.channel === 'Common' ? 'selected' : ''}>Common</option>
              <optgroup label="Port A">
                ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}A" ${sw.channel === `${i + 1}A` ? 'selected' : ''}>${i + 1}A</option>`).join('')}
              </optgroup>
              <optgroup label="Port B">
                ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}B" ${sw.channel === `${i + 1}B` ? 'selected' : ''}>${i + 1}B</option>`).join('')}
              </optgroup>
            </select>
          </div>
          <div class="lcd-field-box">
            <label>CONTROL # (CC)</label>
            <input type="number" id="inp-sw-cc" min="0" max="127" value="${sw.cc}">
          </div>
          <div class="lcd-field-box">
            <label>MODE</label>
            <select id="inp-sw-mode">
              <option value="1" ${sw.mode === 1 ? 'selected' : ''}>Toggle (TGL)</option>
              <option value="0" ${sw.mode === 0 ? 'selected' : ''}>Momentary (MMT)</option>
            </select>
          </div>
        </div>
      `;

      document.getElementById('inp-sw-ch').addEventListener('change', (e) => {
        sw.channel = e.target.value;
        this.renderControllers();
      });

      const inpSwCc = document.getElementById('inp-sw-cc');
      inpSwCc.addEventListener('change', (e) => {
        sw.cc = parseInt(e.target.value, 10);
        this.renderControllers();
        this.showToast(`Set Switch SW${index + 1} to CC ${sw.cc}`, 'info');
      });

      const tabToggle = document.getElementById('tab-sw-toggle');
      const tabMom = document.getElementById('tab-sw-mom');
      const selMode = document.getElementById('inp-sw-mode');

      if (tabToggle) {
        tabToggle.addEventListener('click', () => {
          sw.mode = 1;
          this.renderControllers();
          this.renderInspector();
          this.showToast(`Set Switch SW${index + 1} to Toggle mode (0/127)`, 'info');
        });
      }

      if (tabMom) {
        tabMom.addEventListener('click', () => {
          sw.mode = 0;
          this.renderControllers();
          this.renderInspector();
          this.showToast(`Set Switch SW${index + 1} to Momentary mode`, 'info');
        });
      }

      if (selMode) {
        selMode.addEventListener('change', (e) => {
          sw.mode = parseInt(e.target.value, 10);
          this.renderControllers();
          this.renderInspector();
          this.showToast(`Set Switch SW${index + 1} to ${sw.mode === 1 ? 'Toggle' : 'Momentary'}`, 'info');
        });
      }

    } else if (type === 'key') {
      const note = index;
      const noteName = midiNoteToName(note);
      const octave = Math.floor(note / 12) - 1;
      const freq = Math.round(440 * Math.pow(2, (note - 69) / 12));

      // Find if any MPC pads use this note
      let usedInPads = [];
      if (this.currentPreset) {
        ['A', 'B', 'C', 'D'].forEach(b => {
          (this.currentPreset.pads[b] || []).forEach(p => {
            if (p.note === note) usedInPads.push(`Pad ${p.padIndex} [Bank ${b}]`);
          });
        });
      }

      this.lcdSelectionHeader.textContent = `Select: Piano Key ${noteName} (Note ${note})`;
      this.lcdInspectorBody.innerHTML = `
        <div class="lcd-form-row">
          <div class="lcd-field-box">
            <label>NOTE NAME</label>
            <input type="text" value="${noteName}" readonly style="color: #38bdf8; font-weight: bold;">
          </div>
          <div class="lcd-field-box">
            <label>MIDI NOTE #</label>
            <input type="number" value="${note}" readonly style="color: #38bdf8; font-weight: bold;">
          </div>
          <div class="lcd-field-box">
            <label>OCTAVE</label>
            <input type="text" value="Octave ${octave}" readonly>
          </div>
          <div class="lcd-field-box">
            <label>FREQUENCY</label>
            <input type="text" value="${freq} Hz" readonly>
          </div>
        </div>
        <div class="lcd-form-row" style="margin-top: 10px; justify-content: space-between; align-items: center; border-top: 1px solid rgba(56, 189, 248, 0.15); padding-top: 8px;">
          <div style="font-size: 0.74rem; color: #94a3b8; font-family: var(--font-mono);">
            ${usedInPads.length > 0 ? `🔥 Mapped to: ${usedInPads.join(', ')}` : 'MPC Pads: Not mapped to any active pad'}
          </div>
          <button type="button" class="btn-tool" id="btn-manual-assign-to-pad" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); font-size: 0.75rem;">
            🎹 Set Active Pad to ${noteName} (${note})
          </button>
        </div>
      `;

      document.getElementById('btn-manual-assign-to-pad')?.addEventListener('click', () => {
        const curBank = this.currentPadBank;
        const curPad = this.currentPreset.pads[curBank]?.[0];
        if (curPad) {
          curPad.note = note;
          this.renderPads();
          this.showToast(`Manually set Pad ${curPad.padIndex} [Bank ${curBank}] to ${noteName} (${note})`, 'success');
        }
      });

    } else if (type === 'global') {
      const g = this.currentPreset.global;
      this.lcdSelectionHeader.textContent = `Select: Global Synth & Arpeggiator Settings`;
      this.lcdInspectorBody.innerHTML = `
        <div class="lcd-form-row">
          <div class="lcd-field-box">
            <label>TEMPO BPM</label>
            <input type="number" id="inp-g-tempo" min="30" max="300" value="${g.tempo}">
          </div>
          <div class="lcd-field-box">
            <label>TIME DIV</label>
            <select id="inp-g-div">
              ${TIME_DIVISIONS.map((d, i) => `<option value="${i}" ${g.timeDivision === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>
          <div class="lcd-field-box">
            <label>ARP TYPE</label>
            <select id="inp-g-type">
              ${ARP_TYPES.map((t, i) => `<option value="${i}" ${g.arpType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="lcd-field-box">
            <label>GATE (%)</label>
            <input type="number" id="inp-g-gate" min="0" max="99" value="${g.arpGate}">
          </div>
        </div>
        <div class="lcd-form-row" style="margin-top: 8px;">
          <div class="lcd-field-box">
            <label>SWING (%)</label>
            <input type="number" id="inp-g-swing" min="50" max="75" value="${g.arpSwing}">
          </div>
          <div class="lcd-field-box">
            <label>CLOCK</label>
            <select id="inp-g-clock">
              <option value="Internal" ${g.clockSource === 'Internal' ? 'selected' : ''}>Internal</option>
              <option value="External" ${g.clockSource === 'External' ? 'selected' : ''}>External</option>
            </select>
          </div>
          <div class="lcd-field-box">
            <label>TRANSPORT</label>
            <select id="inp-g-transport">
              ${TRANSPORT_MODES.map((m, i) => `<option value="${i}" ${g.transportMode === m ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>
        </div>
      `;

      document.getElementById('inp-g-tempo').addEventListener('change', (e) => {
        g.tempo = parseInt(e.target.value, 10);
        this.renderLowerMatrix();
      });
      document.getElementById('inp-g-div').addEventListener('change', (e) => {
        g.timeDivisionIdx = parseInt(e.target.value, 10);
        g.timeDivision = TIME_DIVISIONS[g.timeDivisionIdx];
        this.renderLowerMatrix();
      });
      document.getElementById('inp-g-type').addEventListener('change', (e) => {
        g.arpTypeIdx = parseInt(e.target.value, 10);
        g.arpType = ARP_TYPES[g.arpTypeIdx];
        this.renderLowerMatrix();
      });
      document.getElementById('inp-g-gate').addEventListener('change', (e) => {
        g.arpGate = parseInt(e.target.value, 10);
        this.renderLowerMatrix();
      });
      document.getElementById('inp-g-swing').addEventListener('change', (e) => {
        g.arpSwing = parseInt(e.target.value, 10);
        this.renderLowerMatrix();
      });
      document.getElementById('inp-g-transport').addEventListener('change', (e) => {
        g.transportModeIdx = parseInt(e.target.value, 10);
        g.transportMode = TRANSPORT_MODES[g.transportModeIdx];
        this.renderLowerMatrix();
      });

    } else if (type === 'wheel' || type === 'pedal') {
      const target = index === 'modWheel' ? this.currentPreset.wheels.modWheel : this.currentPreset.wheels[index];
      const title = index === 'modWheel' ? 'Modulation Wheel' : (index === 'expressionPedal' ? 'Expression Pedal' : 'Sustain Pedal');

      this.lcdSelectionHeader.textContent = `Select: ${title}`;
      this.lcdInspectorBody.innerHTML = `
        <div class="lcd-form-row">
          <div class="lcd-field-box">
            <label>MIDI CH</label>
            <select id="inp-wh-ch">
              ${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${target.channel === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}
            </select>
          </div>
          <div class="lcd-field-box">
            <label>CONTROL # (CC)</label>
            <input type="number" id="inp-wh-cc" min="0" max="127" value="${target.cc}">
          </div>
          <div class="lcd-field-box">
            <label>MINIMUM</label>
            <input type="number" id="inp-wh-min" min="0" max="127" value="${target.min ?? 0}">
          </div>
          <div class="lcd-field-box">
            <label>MAXIMUM</label>
            <input type="number" id="inp-wh-max" min="0" max="127" value="${target.max ?? 127}">
          </div>
        </div>
      `;

      document.getElementById('inp-wh-ch').addEventListener('change', (e) => {
        target.channel = parseInt(e.target.value, 10);
      });

      const inpWhCc = document.getElementById('inp-wh-cc');
      inpWhCc.addEventListener('change', (e) => {
        target.cc = parseInt(e.target.value, 10);
        this.showToast(`Set ${title} to CC ${target.cc}`, 'info');
      });

      document.getElementById('inp-wh-min').addEventListener('change', (e) => {
        target.min = parseInt(e.target.value, 10);
      });
      document.getElementById('inp-wh-max').addEventListener('change', (e) => {
        target.max = parseInt(e.target.value, 10);
      });
    }
  }

  /* Render 49-Key Synthesizer Piano Keybed (C1 to C5, 49 keys, gapless flex & responsive) */
  renderKeybed() {
    this.pianoKeybed.innerHTML = '';
    const startNote = 36; // C1
    const endNote = 84;   // C5
    this.keyElements = {};

    const whiteRow = document.createElement('div');
    whiteRow.className = 'white-keys-row';

    const blackLayer = document.createElement('div');
    blackLayer.className = 'black-keys-layer';

    let whiteCount = 0;

    for (let note = startNote; note <= endNote; note++) {
      const semitone = (note - startNote) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(semitone);
      const key = document.createElement('div');
      key.setAttribute('data-note', note);
      this.keyElements[note] = key;

      key.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        key.classList.add('active');
        this.playNoteSound(note);
        // Select key in GUI and open in Master LCD Inspector
        this.selectElement('key', null, note);
      });

      const releaseKey = () => key.classList.remove('active');
      key.addEventListener('mouseup', releaseKey);
      key.addEventListener('mouseleave', releaseKey);

      if (!isBlack) {
        key.className = 'piano-key white-key';
        whiteRow.appendChild(key);
        whiteCount++;
      } else {
        key.className = 'piano-key black-key';
        // Center black key over boundary seam between previous and next white key
        key.style.left = `calc((${whiteCount} * (100% / 29)) - ((100% / 29) * 0.32))`;
        blackLayer.appendChild(key);
      }
    }

    this.pianoKeybed.appendChild(whiteRow);
    this.pianoKeybed.appendChild(blackLayer);
  }

  pushToHardware() {
    if (!this.midiEngine.isConnected) {
      alert('Please connect Web MIDI first by clicking "Connect MIDI".');
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

  saveToLocalLibrary() {
    if (!this.currentPreset) return;
    if (this.lcdPresetName && this.lcdPresetName.value) {
      this.currentPreset.name = this.lcdPresetName.value.slice(0, 8);
    }
    if (this.targetSlotSelect && this.targetSlotSelect.value) {
      this.currentPreset.slot = parseInt(this.targetSlotSelect.value, 10);
    }
    const bytes = this.currentPreset.encode();

    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);

    if (this.currentPresetId) {
      const existing = this.userPresets.find(p => p.id === this.currentPresetId);
      if (existing) {
        existing.name = this.currentPreset.name;
        existing.slot = this.currentPreset.slot;
        existing.updatedAt = new Date().toISOString();
        existing.b64 = b64;
      }
    } else {
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
    this.saveToLocalLibrary();
    this.renderAll();
    this.showToast(`Created new preset "${name}"!`, 'success');
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
      global: this.currentPreset.global,
      wheels: this.currentPreset.wheels,
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
    if (file) this.loadFileObject(file);
    event.target.value = '';
  }

  loadFileObject(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(e.target.result);
          if (json.bytes) {
            this.currentPreset = new MPK49Preset(new Uint8Array(json.bytes));
          } else {
            // High-level semantic JSON template from an AI agent or user
            const preset = new MPK49Preset();
            preset.fromJSON(json);
            this.currentPreset = preset;
          }
        } else {
          const buffer = new Uint8Array(e.target.result);
          this.currentPreset = new MPK49Preset(buffer);
        }
        this.renderAll();
        this.showToast(`Opened "${file.name}" (Slot ${this.currentPreset.slot}: ${this.currentPreset.name})`, 'success');
      } catch (err) {
        console.error(err);
        alert(`Error opening file: ${err.message}`);
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  handleHardwareDump(data, portName) {
    try {
      this.currentPreset = new MPK49Preset(data);
      this.renderAll();
      this.showToast(`Received dump for "${this.currentPreset.name}" from ${portName}!`, 'success');
    } catch (e) {
      console.error(e);
    }
  }

  updateMidiStatus(msg, type) {
    if (this.midiStatusText) this.midiStatusText.textContent = msg;
    if (this.midiLed) {
      this.midiLed.className = type === 'success' ? 'led-green' : (type === 'error' ? 'led-red' : 'led-orange');
    }
    if (this.btnConnectMidi) {
      this.btnConnectMidi.textContent = this.midiEngine && this.midiEngine.isConnected ? '🔌 Reconnect' : '🔌 Connect MIDI';
    }
  }

  showToast(msg, type = 'info') {
    if (!this.toast) return;
    this.toast.textContent = msg;
    this.toast.className = `toast show ${type}`;
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toast.className = 'toast';
    }, 3200);
  }
}

// Initialize on DOM load or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new StudioApp();
  });
} else {
  window.app = new StudioApp();
}
