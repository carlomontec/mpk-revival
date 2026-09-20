--[[
AkaiMPK49_Revival.lua — Reason 14 Remote Codec (v2.0 Full 3-Bank Console)
==========================================================================
Bank A: Knobs 1-8 (CC 2-9), Faders 1-8 (CC 12-19), Switches 1-8 (CC 21-28)
Bank B: Knobs 9-16 (CC 52-59, Pan), Faders 9-16 (CC 42-49, Send 1), Switches 9-16 (CC 62-69, Mute)
Bank C: Knobs 17-24 (CC 82-89, Aux), Faders 17-24 (CC 72-79, Send 2), Switches 17-24 (CC 92-99, Solo)
Transport: MMC SysEx
]]

function remote_init()
	local items = {
		-- Keyboard & performance controls
		{ name="Keyboard",          input="keyboard" },
		{ name="Channel Pressure",  input="value", min=0, max=127 },
		{ name="Pitch Bend",        input="value", min=0, max=16384 },
		{ name="Mod Wheel",         input="value", min=0, max=127 },
		{ name="Expression",        input="value", min=0, max=127 },
		{ name="Damper Pedal",      input="value", min=0, max=127 },

		-- Bank A: Knobs 1-8, Faders 1-8, Switches 1-8
		{ name="Knob 1",  input="value", min=0, max=127 },
		{ name="Knob 2",  input="value", min=0, max=127 },
		{ name="Knob 3",  input="value", min=0, max=127 },
		{ name="Knob 4",  input="value", min=0, max=127 },
		{ name="Knob 5",  input="value", min=0, max=127 },
		{ name="Knob 6",  input="value", min=0, max=127 },
		{ name="Knob 7",  input="value", min=0, max=127 },
		{ name="Knob 8",  input="value", min=0, max=127 },

		{ name="Fader 1", input="value", min=0, max=127 },
		{ name="Fader 2", input="value", min=0, max=127 },
		{ name="Fader 3", input="value", min=0, max=127 },
		{ name="Fader 4", input="value", min=0, max=127 },
		{ name="Fader 5", input="value", min=0, max=127 },
		{ name="Fader 6", input="value", min=0, max=127 },
		{ name="Fader 7", input="value", min=0, max=127 },
		{ name="Fader 8", input="value", min=0, max=127 },

		{ name="Switch 1", input="value", min=0, max=127 },
		{ name="Switch 2", input="value", min=0, max=127 },
		{ name="Switch 3", input="value", min=0, max=127 },
		{ name="Switch 4", input="value", min=0, max=127 },
		{ name="Switch 5", input="value", min=0, max=127 },
		{ name="Switch 6", input="value", min=0, max=127 },
		{ name="Switch 7", input="value", min=0, max=127 },
		{ name="Switch 8", input="value", min=0, max=127 },

		-- Bank B: Knobs 9-16 (Pan), Faders 9-16 (Send 1), Switches 9-16 (Mute)
		{ name="Knob 9",   input="value", min=0, max=127 },
		{ name="Knob 10",  input="value", min=0, max=127 },
		{ name="Knob 11",  input="value", min=0, max=127 },
		{ name="Knob 12",  input="value", min=0, max=127 },
		{ name="Knob 13",  input="value", min=0, max=127 },
		{ name="Knob 14",  input="value", min=0, max=127 },
		{ name="Knob 15",  input="value", min=0, max=127 },
		{ name="Knob 16",  input="value", min=0, max=127 },

		{ name="Fader 9",  input="value", min=0, max=127 },
		{ name="Fader 10", input="value", min=0, max=127 },
		{ name="Fader 11", input="value", min=0, max=127 },
		{ name="Fader 12", input="value", min=0, max=127 },
		{ name="Fader 13", input="value", min=0, max=127 },
		{ name="Fader 14", input="value", min=0, max=127 },
		{ name="Fader 15", input="value", min=0, max=127 },
		{ name="Fader 16", input="value", min=0, max=127 },

		{ name="Switch 9",  input="value", min=0, max=127 },
		{ name="Switch 10", input="value", min=0, max=127 },
		{ name="Switch 11", input="value", min=0, max=127 },
		{ name="Switch 12", input="value", min=0, max=127 },
		{ name="Switch 13", input="value", min=0, max=127 },
		{ name="Switch 14", input="value", min=0, max=127 },
		{ name="Switch 15", input="value", min=0, max=127 },
		{ name="Switch 16", input="value", min=0, max=127 },

		-- Bank C: Knobs 17-24 (Aux), Faders 17-24 (Send 2), Switches 17-24 (Solo)
		{ name="Knob 17",  input="value", min=0, max=127 },
		{ name="Knob 18",  input="value", min=0, max=127 },
		{ name="Knob 19",  input="value", min=0, max=127 },
		{ name="Knob 20",  input="value", min=0, max=127 },
		{ name="Knob 21",  input="value", min=0, max=127 },
		{ name="Knob 22",  input="value", min=0, max=127 },
		{ name="Knob 23",  input="value", min=0, max=127 },
		{ name="Knob 24",  input="value", min=0, max=127 },

		{ name="Fader 17", input="value", min=0, max=127 },
		{ name="Fader 18", input="value", min=0, max=127 },
		{ name="Fader 19", input="value", min=0, max=127 },
		{ name="Fader 20", input="value", min=0, max=127 },
		{ name="Fader 21", input="value", min=0, max=127 },
		{ name="Fader 22", input="value", min=0, max=127 },
		{ name="Fader 23", input="value", min=0, max=127 },
		{ name="Fader 24", input="value", min=0, max=127 },

		{ name="Switch 17", input="value", min=0, max=127 },
		{ name="Switch 18", input="value", min=0, max=127 },
		{ name="Switch 19", input="value", min=0, max=127 },
		{ name="Switch 20", input="value", min=0, max=127 },
		{ name="Switch 21", input="value", min=0, max=127 },
		{ name="Switch 22", input="value", min=0, max=127 },
		{ name="Switch 23", input="value", min=0, max=127 },
		{ name="Switch 24", input="value", min=0, max=127 },

		-- Transport
		{ name="Rewind",       input="button" },
		{ name="Fast Forward", input="button" },
		{ name="Stop",         input="button" },
		{ name="Play",         input="button" },
		{ name="Record",       input="button" },
	}
	remote.define_items(items)

	local inputs = {
		-- Pitch Bend
		{ pattern="e? xx yy", name="Pitch Bend", value="y*128 + x" },

		-- Mod Wheel, Expression, Damper Pedal
		{ pattern="b0 01 xx", name="Mod Wheel" },
		{ pattern="b0 0b xx", name="Expression" },
		{ pattern="b0 40 xx", name="Damper Pedal" },
		{ pattern="d0 xx",    name="Channel Pressure" },

		-- Bank A Knobs (CC 2-9)
		{ pattern="b0 02 xx", name="Knob 1" },
		{ pattern="b0 03 xx", name="Knob 2" },
		{ pattern="b0 04 xx", name="Knob 3" },
		{ pattern="b0 05 xx", name="Knob 4" },
		{ pattern="b0 06 xx", name="Knob 5" },
		{ pattern="b0 07 xx", name="Knob 6" },
		{ pattern="b0 08 xx", name="Knob 7" },
		{ pattern="b0 09 xx", name="Knob 8" },

		-- Bank A Faders (CC 12-19 / 0x0C-0x13)
		{ pattern="b0 0C xx", name="Fader 1" },
		{ pattern="b0 0D xx", name="Fader 2" },
		{ pattern="b0 0E xx", name="Fader 3" },
		{ pattern="b0 0F xx", name="Fader 4" },
		{ pattern="b0 10 xx", name="Fader 5" },
		{ pattern="b0 11 xx", name="Fader 6" },
		{ pattern="b0 12 xx", name="Fader 7" },
		{ pattern="b0 13 xx", name="Fader 8" },

		-- Bank A Switches (CC 21-28 / 0x15-0x1C)
		{ pattern="b0 15 xx", name="Switch 1" },
		{ pattern="b0 16 xx", name="Switch 2" },
		{ pattern="b0 17 xx", name="Switch 3" },
		{ pattern="b0 18 xx", name="Switch 4" },
		{ pattern="b0 19 xx", name="Switch 5" },
		{ pattern="b0 1A xx", name="Switch 6" },
		{ pattern="b0 1B xx", name="Switch 7" },
		{ pattern="b0 1C xx", name="Switch 8" },

		-- Bank B Knobs (CC 52-59 / 0x34-0x3B, Pan)
		{ pattern="b0 34 xx", name="Knob 9" },
		{ pattern="b0 35 xx", name="Knob 10" },
		{ pattern="b0 36 xx", name="Knob 11" },
		{ pattern="b0 37 xx", name="Knob 12" },
		{ pattern="b0 38 xx", name="Knob 13" },
		{ pattern="b0 39 xx", name="Knob 14" },
		{ pattern="b0 3A xx", name="Knob 15" },
		{ pattern="b0 3B xx", name="Knob 16" },

		-- Bank B Faders (CC 42-49 / 0x2A-0x31, Send 1)
		{ pattern="b0 2A xx", name="Fader 9" },
		{ pattern="b0 2B xx", name="Fader 10" },
		{ pattern="b0 2C xx", name="Fader 11" },
		{ pattern="b0 2D xx", name="Fader 12" },
		{ pattern="b0 2E xx", name="Fader 13" },
		{ pattern="b0 2F xx", name="Fader 14" },
		{ pattern="b0 30 xx", name="Fader 15" },
		{ pattern="b0 31 xx", name="Fader 16" },

		-- Bank B Switches (CC 62-69 / 0x3E-0x45, Mute)
		{ pattern="b0 3E xx", name="Switch 9" },
		{ pattern="b0 3F xx", name="Switch 10" },
		{ pattern="b0 40 xx", name="Switch 11" },
		{ pattern="b0 41 xx", name="Switch 12" },
		{ pattern="b0 42 xx", name="Switch 13" },
		{ pattern="b0 43 xx", name="Switch 14" },
		{ pattern="b0 44 xx", name="Switch 15" },
		{ pattern="b0 45 xx", name="Switch 16" },

		-- Bank C Knobs (CC 82-89 / 0x52-0x59, Aux)
		{ pattern="b0 52 xx", name="Knob 17" },
		{ pattern="b0 53 xx", name="Knob 18" },
		{ pattern="b0 54 xx", name="Knob 19" },
		{ pattern="b0 55 xx", name="Knob 20" },
		{ pattern="b0 56 xx", name="Knob 21" },
		{ pattern="b0 57 xx", name="Knob 22" },
		{ pattern="b0 58 xx", name="Knob 23" },
		{ pattern="b0 59 xx", name="Knob 24" },

		-- Bank C Faders (CC 72-79 / 0x48-0x4F, Send 2)
		{ pattern="b0 48 xx", name="Fader 17" },
		{ pattern="b0 49 xx", name="Fader 18" },
		{ pattern="b0 4A xx", name="Fader 19" },
		{ pattern="b0 4B xx", name="Fader 20" },
		{ pattern="b0 4C xx", name="Fader 21" },
		{ pattern="b0 4D xx", name="Fader 22" },
		{ pattern="b0 4E xx", name="Fader 23" },
		{ pattern="b0 4F xx", name="Fader 24" },

		-- Bank C Switches (CC 92-99 / 0x5C-0x63, Solo)
		{ pattern="b0 5C xx", name="Switch 17" },
		{ pattern="b0 5D xx", name="Switch 18" },
		{ pattern="b0 5E xx", name="Switch 19" },
		{ pattern="b0 5F xx", name="Switch 20" },
		{ pattern="b0 60 xx", name="Switch 21" },
		{ pattern="b0 61 xx", name="Switch 22" },
		{ pattern="b0 62 xx", name="Switch 23" },
		{ pattern="b0 63 xx", name="Switch 24" },

		-- Keyboard
		{ pattern="80 xx yy", name="Keyboard", value="0", note="x", velocity="64" },
		{ pattern="90 xx 00", name="Keyboard", value="0", note="x", velocity="64" },
		{ pattern="<100x>0 yy zz", name="Keyboard" },

		-- Transport: MMC SysEx
		{ pattern="F0 7F 7F 06 05 F7", name="Rewind",       value="1" },
		{ pattern="F0 7F 7F 06 04 F7", name="Fast Forward", value="1" },
		{ pattern="F0 7F 7F 06 01 F7", name="Stop",         value="1" },
		{ pattern="F0 7F 7F 06 02 F7", name="Play",         value="1" },
		{ pattern="F0 7F 7F 06 06 F7", name="Record",       value="1" },
	}
	remote.define_auto_inputs(inputs)
end

function remote_probe()
	return {
		request  = "F0 7E 7F 06 01 F7",
		response = "F0 7E 00 06 02 47 6B 00 19 00 ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? F7"
	}
end
