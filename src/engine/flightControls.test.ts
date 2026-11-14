import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDeadzone,
  detectControllerProfile,
  mergeFlightInputs,
  sampleGamepadState,
  type PreviousGamepadButtons,
} from './flightControls';

describe('Flight Controls: Keyboard, Mouse, PS4 DualShock 4 & PS5 DualSense', () => {
  it('identifies PS5 DualSense and PS4 DualShock 4 controller IDs accurately', () => {
    assert.equal(detectControllerProfile('DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)'), 'ps5-dualsense');
    assert.equal(detectControllerProfile('Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)'), 'ps4-dualshock');
    assert.equal(detectControllerProfile('Sony Interactive Entertainment DualShock 4'), 'ps4-dualshock');
    assert.equal(detectControllerProfile('Generic USB Gamepad'), 'gamepad');
  });

  it('filters stick drift within deadzone and scales outside deadzone', () => {
    assert.equal(applyDeadzone(0.05, 0.13), 0);
    assert.equal(applyDeadzone(-0.12, 0.13), 0);
    assert.ok(applyDeadzone(0.565, 0.13) > 0.45 && applyDeadzone(0.565, 0.13) < 0.55);
    assert.equal(applyDeadzone(-1, 0.13), -1);
  });

  it('maps PS5 DualSense sticks, L2/R2 triggers, L1/R1 roll, and edge-triggered Cross/Options buttons', () => {
    const prev: PreviousGamepadButtons = {
      cross: false,
      circle: false,
      triangle: false,
      options: false,
      r3: false,
    };
    const ps5Pad = {
      id: 'DualSense Wireless Controller (Vendor: 054c Product: 0ce6)',
      connected: true,
      axes: [0.8, -0.6, -0.5, 0.25],
      buttons: Array.from({ length: 16 }, (_, idx) => {
        if (idx === 0) return { pressed: true, value: 1 }; // Cross
        if (idx === 5) return { pressed: true, value: 1 }; // R1 roll CW
        if (idx === 7) return { pressed: true, value: 0.75 }; // R2 prograde burn
        if (idx === 12) return { pressed: true, value: 1 }; // D-pad Up inclination+
        return { pressed: false, value: 0 };
      }),
    };

    const sampled = sampleGamepadState(ps5Pad, prev);
    assert.equal(sampled.anyActive, true);
    assert.equal(sampled.input.controllerProfile, 'ps5-dualsense');
    assert.ok((sampled.input.yaw ?? 0) > 0.7);
    assert.ok((sampled.input.pitch ?? 0) > 0.5);
    assert.equal(sampled.input.roll, 1);
    assert.equal(sampled.input.progradeThrust, 0.75);
    assert.equal(sampled.input.inclinationDelta, 1);
    assert.equal(sampled.input.confirmPressed, true);

    // Second frame with Cross still held must not re-fire edge trigger
    const sampled2 = sampleGamepadState(ps5Pad, sampled.nextButtons);
    assert.equal(sampled2.input.confirmPressed, false);
  });

  it('merges keyboard WASD/Shift/Ctrl, mouse drag override, and PS4/PS5 inputs cleanly', () => {
    const keys = new Set<string>(['KeyW', 'KeyE', 'ShiftLeft']);
    const merged = mergeFlightInputs(
      keys,
      { inclinationDelta: -0.5 },
      { input: { controllerProfile: 'none' }, anyActive: false }
    );
    assert.equal(merged.pitch, 1);
    assert.equal(merged.roll, 1);
    assert.equal(merged.progradeThrust, 1);
    assert.equal(merged.inclinationDelta, -0.5);
    assert.equal(merged.activeSource, 'keyboard');
  });
});
