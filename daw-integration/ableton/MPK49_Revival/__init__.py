"""
MPK49 Revival — Ableton Live 12 MIDI Remote Script
===================================================
Drop the MPK49_Revival/ folder in:
  ~/Music/Ableton/User Library/Remote Scripts/

Then in Ableton: Preferences → MIDI → Control Surfaces → MPK49 Revival
Set Input + Output to "Akai MPK49 Port 1".

Requires MPK49 loaded with presets/ableton12_studio.json (Slot 02).

CC map (must match ableton12_studio.json):
  F1-F8  (CC12-19): Track volume (follows session ring)
  K1-K8  (CC22-29): Device macro 1-8 (follows selected instrument)
  S1-S4  (CC32-35): Track arm 1-4 (Toggle on hardware)
  S5     (CC36):    Play / Pause toggle (Momentary on hardware)
  S6     (CC37):    Stop (Momentary on hardware)
  S7     (CC38):    Session ring ← (Momentary on hardware)
  S8     (CC39):    Session ring → (Momentary on hardware)
  Pads A (C1-B1):   Clip launch / Drum Rack (direct MIDI notes)
"""
from .MPK49Revival import MPK49Revival


def create_instance(c_instance):
    return MPK49Revival(c_instance)
