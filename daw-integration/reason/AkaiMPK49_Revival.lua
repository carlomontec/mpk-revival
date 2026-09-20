"""
AkaiMPK49_Revival.lua — Reason 14 Remote Codec
================================================
Codec for the Akai MPK49 using the preset CC map from reason14_rack.json.

Bank A (MIDI Channel 1):
  Knob  1-8: CC 2-9   (Combinator Rotary 1-4, Filter/Reso/Pan/Level)
  Fader 1-8: CC 12-19 (Mixer 14:2 Channel 1-8 Volume)
  Switch 1-8: CC 21-28 (Combinator Buttons 1-4, Mixer Mute 1-2, Punch, Tap)

Transport: MMC SysEx (F0 7F 7F 06 .. F7)
  Requires MPK49 transportMode = MMC (set in reason14_rack.json).

Installation:
  Copy this file and AkaiMPK49_Revival.luacodec to:
  ~/Library/Application Support/Propellerhead Software/Remote/Codecs/Lua Codecs/Akai/
"""

function remote_init()
	local items = {
		-- Keyboard & wheels
		{ name="Keyboard",          input="keyboard" },
		{ name="Channel Pressure",  input="value",  min=0, max=127 },
		{ name="Pitch Bend",        input="value",  min=0, max=16384 },
		{ name="Mod Wheel",         input="value",  min=0, max=127 },
		{ name="Expression",        input="value",  min=0, max=127 },
		{ name="Damper Pedal",      input="value",  min=0, max=127 },

		-- Knobs K1-K8 (Bank A, CC 2-9)
		{ name="Knob 1",  input="value", min=0, max=127 },
		{ name="Knob 2",  input="value", min=0, max=127 },
		{ name="Knob 3",  input="value", min=0, max=127 },
		{ name="Knob 4",  input="value", min=0, max=127 },
		{ name="Knob 5",  input="value", min=0, max=127 },
		{ name="Knob 6",  input="value", min=0, max=127 },
		{ name="Knob 7",  input="value", min=0, max=127 },
		{ name="Knob 8",  input="value", min=0, max=127 },

		-- Faders F1-F8 (Bank A, CC 12-19)
		{ name="Fader 1", input="value", min=0, max=127 },
		{ name="Fader 2", input="value", min=0, max=127 },
		{ name="Fader 3", input="value", min=0, max=127 },
		{ name="Fader 4", input="value", min=0, max=127 },
		{ name="Fader 5", input="value", min=0, max=127 },
		{ name="Fader 6", input="value", min=0, max=127 },
		{ name="Fader 7", input="value", min=0, max=127 },
		{ name="Fader 8", input="value", min=0, max=127 },

		-- Switches S1-S8 (Bank A, CC 21-28)
		{ name="Switch 1", input="value", min=0, max=127 },
		{ name="Switch 2", input="value", min=0, max=127 },
		{ name="Switch 3", input="value", min=0, max=127 },
		{ name="Switch 4", input="value", min=0, max=127 },
		{ name="Switch 5", input="value", min=0, max=127 },
		{ name="Switch 6", input="value", min=0, max=127 },
		{ name="Switch 7", input="value", min=0, max=127 },
		{ name="Switch 8", input="value", min=0, max=127 },

		-- Transport (via MMC SysEx)
		{ name="Rewind",       input="button" },
		{ name="Fast Forward", input="button" },
		{ name="Stop",         input="button" },
		{ name="Play",         input="button" },
		{ name="Record",       input="button" },
	}
	remote.define_items(items)

	local inputs = {
		-- Pitch Bend (any channel)
		{ pattern="e? xx yy", name="Pitch Bend", value="y*128 + x" },

		-- Mod Wheel, Expression, Damper Pedal (channel 1)
		{ pattern="b0 01 xx", name="Mod Wheel" },
		{ pattern="b0 0b xx", name="Expression" },
		{ pattern="b0 40 xx", name="Damper Pedal" },

		-- Channel Pressure (channel 1)
		{ pattern="d0 xx", name="Channel Pressure" },

		-- Knobs K1-K8: CC 2-9, channel 1 (b0 = status byte: CC on ch 1)
		{ pattern="b0 02 xx", name="Knob 1" },
		{ pattern="b0 03 xx", name="Knob 2" },
		{ pattern="b0 04 xx", name="Knob 3" },
		{ pattern="b0 05 xx", name="Knob 4" },
		{ pattern="b0 06 xx", name="Knob 5" },
		{ pattern="b0 07 xx", name="Knob 6" },
		{ pattern="b0 08 xx", name="Knob 7" },
		{ pattern="b0 09 xx", name="Knob 8" },

		-- Faders F1-F8: CC 12-19 (0x0C-0x13), channel 1
		{ pattern="b0 0C xx", name="Fader 1" },
		{ pattern="b0 0D xx", name="Fader 2" },
		{ pattern="b0 0E xx", name="Fader 3" },
		{ pattern="b0 0F xx", name="Fader 4" },
		{ pattern="b0 10 xx", name="Fader 5" },
		{ pattern="b0 11 xx", name="Fader 6" },
		{ pattern="b0 12 xx", name="Fader 7" },
		{ pattern="b0 13 xx", name="Fader 8" },

		-- Switches S1-S8: CC 21-28 (0x15-0x1C), channel 1
		{ pattern="b0 15 xx", name="Switch 1" },
		{ pattern="b0 16 xx", name="Switch 2" },
		{ pattern="b0 17 xx", name="Switch 3" },
		{ pattern="b0 18 xx", name="Switch 4" },
		{ pattern="b0 19 xx", name="Switch 5" },
		{ pattern="b0 1A xx", name="Switch 6" },
		{ pattern="b0 1B xx", name="Switch 7" },
		{ pattern="b0 1C xx", name="Switch 8" },

		-- Keyboard Note On / Note Off (channel 1)
		{ pattern="80 xx yy", name="Keyboard", value="0",  note="x", velocity="64" },
		{ pattern="90 xx 00", name="Keyboard", value="0",  note="x", velocity="64" },
		{ pattern="<100x>0 yy zz", name="Keyboard" },

		-- Transport: MMC SysEx (MPK49 transportMode = MMC)
		{ pattern="F0 7F 7F 06 05 F7", name="Rewind",       value="1" },
		{ pattern="F0 7F 7F 06 04 F7", name="Fast Forward", value="1" },
		{ pattern="F0 7F 7F 06 01 F7", name="Stop",         value="1" },
		{ pattern="F0 7F 7F 06 02 F7", name="Play",         value="1" },
		{ pattern="F0 7F 7F 06 06 F7", name="Record",       value="1" },
	}
	remote.define_auto_inputs(inputs)
end


-- Device identity probe: send Universal Device Inquiry, match MPK49 response
function remote_probe()
	return {
		request  = "F0 7E 7F 06 01 F7",
		response = "F0 7E 00 06 02 47 6B 00 19 00 ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? F7"
	}
end
