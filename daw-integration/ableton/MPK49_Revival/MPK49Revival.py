"""
MPK49Revival.py — Ableton Live 12 Control Surface
==================================================
Multi-Bank Studio Console Integration for Akai MPK49:

  Bank A (Performance / Play):
    - F1-F8  (CC 12-19): Track Volume 1-8
    - K1-K8  (CC 22-29): Device Macro 1-8 (follows selected device)
    - S1-S8  (CC 32-39): Track Arm 1-8 (ready to play from keys)

  Bank B (Mixer & Space):
    - F1-F8  (CC 42-49): Send A Level 1-8 (Reverb Send)
    - K1-K8  (CC 52-59): Track Pan 1-8 (Stereo L/R)
    - S1-S8  (CC 62-69): Track Mute 1-8

  Bank C (Isolation & Deep Control):
    - F1-F8  (CC 72-79): Send B Level 1-8 (Delay Send)
    - K1-K8  (CC 82-89): Device Macro 9-16
    - S1-S8  (CC 92-99): Track Solo 1-8

  Physical Transport & Navigation:
    - << (CC 115): Shift 8-Track Session Ring Left
    - >> (CC 116): Shift 8-Track Session Ring Right
    - Stop (CC 117), Play (CC 118), Rec (CC 119)
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

CHANNEL = 0
NUM_TRACKS = 8
NUM_SCENES = 1

# Transport & Navigation
NAV_LEFT_CC   = 115  # << (Rewind)
NAV_RIGHT_CC  = 116  # >> (Fast Forward)
STOP_CC       = 117
PLAY_CC       = 118
REC_CC        = 119

# Bank A
VOL_CCS       = [12, 13, 14, 15, 16, 17, 18, 19]
MACRO_1_8_CCS = [22, 23, 24, 25, 26, 27, 28, 29]
ARM_CCS       = [32, 33, 34, 35, 36, 37, 38, 39]

# Bank B
SEND_A_CCS    = [42, 43, 44, 45, 46, 47, 48, 49]
PAN_CCS       = [52, 53, 54, 55, 56, 57, 58, 59]
MUTE_CCS      = [62, 63, 64, 65, 66, 67, 68, 69]

# Bank C
SEND_B_CCS    = [72, 73, 74, 75, 76, 77, 78, 79]
MACRO_9_16_CCS= [82, 83, 84, 85, 86, 87, 88, 89]
SOLO_CCS      = [92, 93, 94, 95, 96, 97, 98, 99]


class MPK49Revival(ControlSurface):
    def __init__(self, c_instance):
        super().__init__(c_instance)
        with self.component_guard():
            self._setup_mixer()
            self._setup_session()
            self._setup_device()
            self._setup_transport()
        self.log_message("MPK49 Revival v2.0: 3-Bank Console (Vol, Pan, Sends A/B, Arm, Mute, Solo, 16 Macros) active.")

    def _setup_mixer(self):
        self._mixer = MixerComponent(NUM_TRACKS, num_returns=2)

        for i in range(NUM_TRACKS):
            strip = self._mixer.channel_strip(i)

            # Bank A: Volume & Arm
            vol_fader = SliderElement(MIDI_CC_TYPE, CHANNEL, VOL_CCS[i])
            strip.set_volume_control(vol_fader)
            arm_btn = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, ARM_CCS[i])
            strip.set_arm_button(arm_btn)

            # Bank B: Pan & Mute
            pan_knob = SliderElement(MIDI_CC_TYPE, CHANNEL, PAN_CCS[i])
            strip.set_pan_control(pan_knob)
            mute_btn = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, MUTE_CCS[i])
            strip.set_mute_button(mute_btn)

            # Bank C: Solo
            solo_btn = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, SOLO_CCS[i])
            strip.set_solo_button(solo_btn)

            # Sends: Faders in Bank B (Send A) and Bank C (Send B)
            send_a = SliderElement(MIDI_CC_TYPE, CHANNEL, SEND_A_CCS[i])
            send_b = SliderElement(MIDI_CC_TYPE, CHANNEL, SEND_B_CCS[i])
            strip.set_send_controls((send_a, send_b))

    def _setup_session(self):
        self._session = SessionComponent(NUM_TRACKS, NUM_SCENES)
        self._session.set_mixer(self._mixer)
        self._session.set_offsets(0, 0)

        # Use << (Rewind) and >> (Fast Forward) to bank the 8-track window
        bank_prev = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, NAV_LEFT_CC)
        bank_next = ButtonElement(True, MIDI_CC_TYPE, CHANNEL, NAV_RIGHT_CC)
        self._session.set_track_bank_buttons(bank_next, bank_prev)

    def _setup_device(self):
        self._device = DeviceComponent(device_selection_follows_track_selection=True)
        # Combine Bank A (Macros 1-8) and Bank C (Macros 9-16) into 16 device parameter controls
        all_macro_ccs = MACRO_1_8_CCS + MACRO_9_16_CCS
        param_controls = tuple(
            EncoderElement(MIDI_CC_TYPE, CHANNEL, cc, Live.MidiMap.MapMode.absolute)
            for cc in all_macro_ccs
        )
        self._device.set_parameter_controls(param_controls)
        self.set_device_component(self._device)

    def _setup_transport(self):
        self._transport = TransportComponent()
        self._transport.set_play_button(ButtonElement(True, MIDI_CC_TYPE, CHANNEL, PLAY_CC))
        self._transport.set_stop_button(ButtonElement(True, MIDI_CC_TYPE, CHANNEL, STOP_CC))
        self._transport.set_record_button(ButtonElement(True, MIDI_CC_TYPE, CHANNEL, REC_CC))

    def disconnect(self):
        self.log_message("MPK49 Revival disconnected.")
        super().disconnect()
