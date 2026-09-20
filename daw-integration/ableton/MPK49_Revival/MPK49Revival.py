"""
MPK49Revival.py — Ableton Live 12 Control Surface
==================================================
Session ring: F1-F8 track volumes follow an 8-track window.
Device follow: K1-K8 control macros of the currently selected instrument.
Transport:     S5=Play/Pause, S6=Stop.
Ring nav:      S7=ring left, S8=ring right.
Track arm:     S1-S4 arm tracks 1-4 within the ring.

IMPORTANT: requires presets/ableton12_studio.json loaded on the MPK49.
"""
import Live
from _Framework.ControlSurface import ControlSurface
from _Framework.SessionComponent import SessionComponent
from _Framework.MixerComponent import MixerComponent
from _Framework.DeviceComponent import DeviceComponent
from _Framework.TransportComponent import TransportComponent
from _Framework.ButtonElement import ButtonElement
from _Framework.SliderElement import SliderElement
from _Framework.EncoderElement import EncoderElement
from _Framework.InputControlElement import MIDI_CC_TYPE

# MIDI channel 1 (0-indexed)
CHANNEL = 0

# Number of tracks in the session ring
NUM_TRACKS = 8
NUM_SCENES = 1

# ── CC assignments — must match presets/ableton12_studio.json ─────────────────
# F1-F8 Bank A: track volumes (session ring follows these)
FADER_CCS     = [12, 13, 14, 15, 16, 17, 18, 19]
# K1-K8 Bank A: device macro 1-8 (follows selected instrument)
KNOB_CCS      = [22, 23, 24, 25, 26, 27, 28, 29]
# S1-S4 Bank A: track arm (Toggle mode on hardware, framework handles state)
ARM_CCS       = [32, 33, 34, 35]
# S5: Play/Pause toggle | S6: Stop | S7: ring ← | S8: ring →
PLAY_CC       = 36
STOP_CC       = 37
RING_LEFT_CC  = 38
RING_RIGHT_CC = 39


class MPK49Revival(ControlSurface):
    """
    Custom MIDI Remote Script for Akai MPK49 (first-generation).

    Architecture:
      MixerComponent  ← session ring → SessionComponent
      DeviceComponent ← follows selected device (set_device_component)
      TransportComponent ← S5 play, S6 stop
    """

    def __init__(self, c_instance):
        super().__init__(c_instance)
        with self.component_guard():
            self._setup_mixer()
            self._setup_session()
            self._setup_device()
            self._setup_transport()
            self._setup_ring_navigation()
        self.log_message('MPK49 Revival v1.0 — session ring active, device follow active')

    # ── Mixer: F1-F8 volumes + S1-S4 arm ─────────────────────────────────────

    def _setup_mixer(self):
        self._mixer = MixerComponent(NUM_TRACKS)
        # F1-F8 control volumes of the 8 tracks in the ring window
        for i, cc in enumerate(FADER_CCS):
            fader = SliderElement(MIDI_CC_TYPE, CHANNEL, cc)
            self._mixer.channel_strip(i).set_volume_control(fader)
        # S1-S4 arm tracks 1-4 within the ring
        for i, cc in enumerate(ARM_CCS):
            btn = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, cc)
            self._mixer.channel_strip(i).set_arm_button(btn)

    # ── Session ring: links mixer to a moveable 8-track window ───────────────

    def _setup_session(self):
        self._session = SessionComponent(NUM_TRACKS, NUM_SCENES)
        self._session.set_mixer(self._mixer)
        # Start at track 0
        self._session.set_offsets(0, 0)

    # ── Device follow: K1-K8 → macros of the selected instrument ────────────

    def _setup_device(self):
        self._device = DeviceComponent()
        # K1-K8 map to Parameters 1-8 of whatever device is selected
        param_controls = tuple(
            EncoderElement(MIDI_CC_TYPE, CHANNEL, cc, Live.MidiMap.MapMode.absolute)
            for cc in KNOB_CCS
        )
        self._device.set_parameter_controls(param_controls)
        # Register so Live updates the device when the user selects an instrument
        self.set_device_component(self._device)

    # ── Transport: S5=Play/Pause, S6=Stop ────────────────────────────────────

    def _setup_transport(self):
        self._transport = TransportComponent()
        self._transport.set_play_button(
            ButtonElement(True, MIDI_CC_TYPE, CHANNEL, PLAY_CC))
        self._transport.set_stop_button(
            ButtonElement(True, MIDI_CC_TYPE, CHANNEL, STOP_CC))

    # ── Ring navigation: S7=←, S8=→ ─────────────────────────────────────────

    def _setup_ring_navigation(self):
        # set_track_bank_buttons(next_button, prev_button)
        left_btn  = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, RING_LEFT_CC)
        right_btn = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, RING_RIGHT_CC)
        self._session.set_track_bank_buttons(right_btn, left_btn)

    def disconnect(self):
        self.log_message('MPK49 Revival disconnected')
        super().disconnect()
