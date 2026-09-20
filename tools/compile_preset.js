#!/usr/bin/env node

/**
 * Akai MPK49 Preset Compiler & Validator CLI
 * 
 * Compiles high-level semantic JSON preset files into verified 1,033-byte .syx files.
 * Validates hardware constraints (name length, CC ranges, channel routing, switch modes).
 * 
 * Usage:
 *   node tools/compile_preset.js <input.json> [output.syx]
 *   node tools/compile_preset.js --validate <input.json>
 */

const fs = require('fs');
const path = require('path');

// Load schema module
const schemaPath = path.resolve(__dirname, '../editor/js/sysex_schema.js');
if (!fs.existsSync(schemaPath)) {
  console.error(`Error: Cannot find schema at ${schemaPath}`);
  process.exit(1);
}

const schemaCode = fs.readFileSync(schemaPath, 'utf8');
const fn = new Function(schemaCode + '; return { MPK49Preset, midiNoteToName, nameToMidiNote, midiChannelToDisplay };');
const { MPK49Preset, midiNoteToName, nameToMidiNote, midiChannelToDisplay } = fn();

function printHelp() {
  console.log(`
Akai MPK49 Preset Compiler & Validator
---------------------------------------
Usage:
  node tools/compile_preset.js <input.json> [output.syx]
  node tools/compile_preset.js --validate <input.json>

Options:
  --validate      Check constraints and report mapping without writing a .syx file
  --help          Show this help message
`);
}

// Parse args
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  printHelp();
  process.exit(0);
}

let isValidateOnly = false;
let inputJsonPath = null;
let outputSyxPath = null;

for (const arg of args) {
  if (arg === '--validate') {
    isValidateOnly = true;
  } else if (!inputJsonPath) {
    inputJsonPath = arg;
  } else if (!outputSyxPath) {
    outputSyxPath = arg;
  }
}

if (!inputJsonPath) {
  console.error('Error: Missing input JSON file path.');
  printHelp();
  process.exit(1);
}

const resolvedInput = path.resolve(process.cwd(), inputJsonPath);
if (!fs.existsSync(resolvedInput)) {
  console.error(`Error: File not found: ${resolvedInput}`);
  process.exit(1);
}

let jsonRaw;
try {
  jsonRaw = fs.readFileSync(resolvedInput, 'utf8');
} catch (err) {
  console.error(`Error reading file: ${err.message}`);
  process.exit(1);
}

let presetData;
try {
  presetData = JSON.parse(jsonRaw);
} catch (err) {
  console.error(`Error parsing JSON: ${err.message}`);
  process.exit(1);
}

// Validation rules
const errors = [];
const warnings = [];

// 1. Name Check
if (!presetData.name) {
  errors.push('Missing preset "name".');
} else if (typeof presetData.name !== 'string') {
  errors.push('"name" must be a string.');
} else if (presetData.name.length > 8) {
  warnings.push(`Preset name "${presetData.name}" exceeds 8 characters; will be truncated to "${presetData.name.slice(0, 8)}".`);
}

// 2. Slot Check
const slot = presetData.slot !== undefined ? parseInt(presetData.slot, 10) : 1;
if (isNaN(slot) || slot < 1 || slot > 30) {
  errors.push(`Target slot ${presetData.slot} is out of range (must be 1..30).`);
}

// 3. Channel Check Helper
function validateChannel(ch, label) {
  if (ch === undefined || ch === null) return;
  const str = String(ch).trim();
  if (str === '0' || str === 'Common' || str === 'COMMON') return;
  const match = str.match(/^(\d+)([ABab]?)$/);
  if (!match) {
    errors.push(`Invalid MIDI Channel "${ch}" in ${label}. Expected Common, 1A..16A, or 1B..16B.`);
    return;
  }
  const num = parseInt(match[1], 10);
  if (num < 1 || num > 16) {
    errors.push(`Invalid MIDI Channel number ${num} in ${label} (must be 1..16).`);
  }
}

// 4. CC Range Check Helper
function validateCc(cc, label) {
  if (cc === undefined || cc === null) return;
  const num = parseInt(cc, 10);
  if (isNaN(num) || num < 0 || num > 127) {
    errors.push(`Invalid CC ${cc} in ${label} (must be 0..127).`);
  }
}

// Validate Knobs
['A', 'B', 'C'].forEach(b => {
  const bankKnobs = presetData.knobs ? presetData.knobs[b] : null;
  if (Array.isArray(bankKnobs)) {
    bankKnobs.forEach((k, i) => {
      const idx = k.index || i + 1;
      validateChannel(k.channel, `Knob K${idx} [Bank ${b}]`);
      validateCc(k.cc, `Knob K${idx} [Bank ${b}]`);
    });
  }
});

// Validate Faders
['A', 'B', 'C'].forEach(b => {
  const bankFaders = presetData.faders ? presetData.faders[b] : null;
  if (Array.isArray(bankFaders)) {
    bankFaders.forEach((f, i) => {
      const idx = f.index || i + 1;
      validateChannel(f.channel, `Fader F${idx} [Bank ${b}]`);
      validateCc(f.cc, `Fader F${idx} [Bank ${b}]`);
    });
  }
});

// Validate Switches
['A', 'B', 'C'].forEach(b => {
  const bankSwitches = presetData.switches ? presetData.switches[b] : null;
  if (Array.isArray(bankSwitches)) {
    bankSwitches.forEach((s, i) => {
      const idx = s.index || i + 1;
      validateChannel(s.channel, `Switch S${idx} [Bank ${b}]`);
      validateCc(s.cc, `Switch S${idx} [Bank ${b}]`);
      if (s.mode !== undefined) {
        const modeStr = String(s.mode).toLowerCase();
        if (!['0', '1', 'toggle', 'momentary', 'tgl', 'mmt'].includes(modeStr)) {
          warnings.push(`Switch S${idx} [Bank ${b}] mode "${s.mode}" unrecognised; defaulting to Toggle (1).`);
        }
      }
    });
  }
});

// Validate Pads
['A', 'B', 'C', 'D'].forEach(b => {
  const bankPads = presetData.pads ? presetData.pads[b] : null;
  if (Array.isArray(bankPads)) {
    bankPads.forEach((p, i) => {
      const idx = p.index || p.padIndex || i + 1;
      validateChannel(p.channel, `Pad P${idx} [Bank ${b}]`);
      if (p.note !== undefined) {
        if (typeof p.note === 'number') {
          if (p.note < 0 || p.note > 127) errors.push(`Pad P${idx} [Bank ${b}] note ${p.note} out of MIDI range (0..127).`);
        } else if (typeof p.note === 'string') {
          const parsed = nameToMidiNote(p.note);
          if (parsed === 60 && !p.note.toUpperCase().startsWith('C4')) {
            warnings.push(`Pad P${idx} [Bank ${b}] note string "${p.note}" parsed as ${midiNoteToName(parsed)} (${parsed}).`);
          }
        }
      }
    });
  }
});

// Report Results
console.log('====================================================');
console.log(` Akai MPK49 Preset Validator: "${presetData.name || 'Untitled'}"`);
console.log('====================================================');

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  warnings.forEach(w => console.log(`   - ${w}`));
}

if (errors.length > 0) {
  console.log('\n❌ Validation Errors:');
  errors.forEach(e => console.log(`   - ${e}`));
  console.log('\nCompilation aborted due to validation errors.');
  process.exit(1);
}

// Compile preset
let preset;
try {
  preset = new MPK49Preset();
  preset.fromJSON(presetData);
} catch (err) {
  console.error(`Error during compilation: ${err.message}`);
  process.exit(1);
}

const syxBytes = preset.rawBytes;

// Sanity checks on compiled buffer
if (syxBytes.length !== 1033) {
  console.error(`Fatal: Compiled binary is ${syxBytes.length} bytes (expected 1033).`);
  process.exit(1);
}

if (syxBytes[0] !== 0xF0 || syxBytes[6] !== 0x01 || syxBytes[1032] !== 0xF7) {
  console.error('Fatal: Compiled binary has invalid SysEx framing.');
  process.exit(1);
}

console.log(`\n✅ Validated successfully!`);
console.log(`   • Target Hardware Slot:  Slot ${String(preset.slot).padStart(2, '0')}`);
console.log(`   • Preset LCD Name:       "${preset.name}" (${preset.name.length} chars)`);
console.log(`   • SysEx Frame Size:      ${syxBytes.length} bytes (exact match)`);
console.log(`   • Header Checksum:       ${Array.from(syxBytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

// Print Control Summary
console.log('\n--- Mappings Summary ---');
console.log('Bank A Knobs:');
preset.knobs.A.forEach((k, i) => {
  const lbl = k.name ? ` (${k.name})` : '';
  console.log(`   K${i+1}: CC ${String(k.cc).padStart(3, ' ')} · Ch ${k.channel.padEnd(6, ' ')} · Range [${k.min}..${k.max}]${lbl}`);
});

console.log('Bank A Faders:');
preset.faders.A.forEach((f, i) => {
  const lbl = f.name ? ` (${f.name})` : '';
  console.log(`   F${i+1}: CC ${String(f.cc).padStart(3, ' ')} · Ch ${f.channel.padEnd(6, ' ')} · Range [${f.min}..${f.max}]${lbl}`);
});

console.log('Bank A Switches:');
preset.switches.A.forEach((s, i) => {
  const modeStr = s.mode === 1 ? 'TOGGLE   ' : 'MOMENTARY';
  const lbl = s.name ? ` (${s.name})` : '';
  console.log(`   S${i+1}: CC ${String(s.cc).padStart(3, ' ')} · Ch ${s.channel.padEnd(6, ' ')} · Mode [${modeStr}]${lbl}`);
});

console.log('Bank A MPC Drum Pads:');
preset.pads.A.forEach((p, i) => {
  const lbl = p.name ? ` (${p.name})` : '';
  console.log(`   Pad ${String(i+1).padStart(2, ' ')}: Note ${String(p.note).padStart(3, ' ')} (${p.noteName.padEnd(4, ' ')}) · Ch ${p.channel}${lbl}`);
});

if (isValidateOnly) {
  console.log('\n[--validate] Validation complete. No output file written.');
  process.exit(0);
}

// Determine output path
if (!outputSyxPath) {
  const dir = path.dirname(resolvedInput);
  const base = path.basename(resolvedInput, path.extname(resolvedInput));
  outputSyxPath = path.join(dir, `${base}.syx`);
}

const resolvedOutput = path.resolve(process.cwd(), outputSyxPath);
try {
  fs.writeFileSync(resolvedOutput, Buffer.from(syxBytes));
  console.log(`\n🎉 Compiled .syx written to:`);
  console.log(`   ${resolvedOutput}`);
} catch (err) {
  console.error(`Error writing .syx output file: ${err.message}`);
  process.exit(1);
}
