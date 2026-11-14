export type ControllerProfile = 'none' | 'ps5-dualsense' | 'ps4-dualshock' | 'gamepad';

export interface FlightControlInput {
  pitch: number; // -1..1 (nose down/up)
  yaw: number; // -1..1 (left/right)
  roll: number; // -1..1 (CCW/CW)
  progradeThrust: number; // 0..1 (raise orbit / accelerate)
  retrogradeThrust: number; // 0..1 (lower orbit / brake)
  inclinationDelta: number; // -1..1 (tilt orbital plane)
  cameraYaw: number; // -1..1
  cameraPitch: number; // -1..1
  cameraZoom: number; // -1..1
  togglePausePressed: boolean;
  toggleCameraPressed: boolean;
  confirmPressed: boolean;
  secondaryPressed: boolean;
  toggleAutopilotPressed: boolean;
  activeSource: 'idle' | 'keyboard' | 'mouse' | 'ps4' | 'ps5' | 'gamepad';
  controllerProfile: ControllerProfile;
  controllerName: string | null;
}

export interface GamepadLike {
  id: string;
  connected: boolean;
  mapping?: string;
  axes: readonly number[];
  buttons: ReadonlyArray<{ pressed: boolean; value: number }>;
  vibrationActuator?: {
    playEffect?: (
      type: string,
      params: { duration: number; weakMagnitude: number; strongMagnitude: number }
    ) => Promise<unknown>;
  };
}

export function detectControllerProfile(id: string): ControllerProfile {
  const lower = id.toLowerCase();
  if (lower.includes('dualsense') || lower.includes('0ce6') || lower.includes('ps5')) {
    return 'ps5-dualsense';
  }
  if (
    lower.includes('dualshock') ||
    lower.includes('05c4') ||
    lower.includes('09cc') ||
    lower.includes('054c') ||
    lower.includes('ps4') ||
    lower.includes('wireless controller')
  ) {
    return 'ps4-dualshock';
  }
  return 'gamepad';
}

export function applyDeadzone(value: number, deadzone = 0.13): number {
  if (!Number.isFinite(value)) return 0;
  const abs = Math.abs(value);
  if (abs <= deadzone) return 0;
  const scaled = (abs - deadzone) / (1 - deadzone);
  return Math.sign(value) * Math.min(1, scaled);
}

export function createEmptyFlightInput(): FlightControlInput {
  return {
    pitch: 0,
    yaw: 0,
    roll: 0,
    progradeThrust: 0,
    retrogradeThrust: 0,
    inclinationDelta: 0,
    cameraYaw: 0,
    cameraPitch: 0,
    cameraZoom: 0,
    togglePausePressed: false,
    toggleCameraPressed: false,
    confirmPressed: false,
    secondaryPressed: false,
    toggleAutopilotPressed: false,
    activeSource: 'idle',
    controllerProfile: 'none',
    controllerName: null,
  };
}

export interface PreviousGamepadButtons {
  cross: boolean;
  circle: boolean;
  triangle: boolean;
  options: boolean;
  r3: boolean;
}

export function sampleGamepadState(
  gamepad: GamepadLike | null | undefined,
  prevButtons: PreviousGamepadButtons
): {
  input: Partial<FlightControlInput>;
  nextButtons: PreviousGamepadButtons;
  anyActive: boolean;
} {
  if (!gamepad || !gamepad.connected) {
    return {
      input: { controllerProfile: 'none', controllerName: null },
      nextButtons: { cross: false, circle: false, triangle: false, options: false, r3: false },
      anyActive: false,
    };
  }

  const profile = detectControllerProfile(gamepad.id);
  const axes = gamepad.axes ?? [];
  const btns = gamepad.buttons ?? [];

  const btnPressed = (idx: number) => Boolean(btns[idx]?.pressed || (btns[idx]?.value ?? 0) > 0.5);
  const btnAnalog = (idx: number) => {
    const b = btns[idx];
    if (!b) return 0;
    if (typeof b.value === 'number' && b.value > 0.05) return Math.min(1, b.value);
    return b.pressed ? 1 : 0;
  };

  // Standard PS4/PS5 DualShock & DualSense mapping
  const yaw = applyDeadzone(axes[0] ?? 0);
  const pitch = applyDeadzone(-(axes[1] ?? 0));
  const cameraYaw = applyDeadzone(axes[2] ?? 0);
  const cameraPitch = applyDeadzone(axes[3] ?? 0);

  // L1 (4) / R1 (5) roll, L2 (6) retrograde, R2 (7) prograde
  const l1 = btnPressed(4) ? 1 : 0;
  const r1 = btnPressed(5) ? 1 : 0;
  const roll = r1 - l1;

  // Handle browsers that expose L2/R2 as buttons[6/7] or fallback axes[4/5]
  const l2Btn = btnAnalog(6);
  const r2Btn = btnAnalog(7);
  const l2Axis = axes.length > 4 ? Math.max(0, ((axes[4] ?? -1) + 1) / 2) : 0;
  const r2Axis = axes.length > 5 ? Math.max(0, ((axes[5] ?? -1) + 1) / 2) : 0;
  const retrogradeThrust = l2Btn > 0.08 ? l2Btn : l2Axis > 0.15 ? l2Axis : 0;
  const progradeThrust = r2Btn > 0.08 ? r2Btn : r2Axis > 0.15 ? r2Axis : 0;

  // D-pad Up (12) / Down (13) control orbital inclination trim
  const dpadUp = btnPressed(12) ? 1 : 0;
  const dpadDown = btnPressed(13) ? 1 : 0;
  const inclinationDelta = dpadUp - dpadDown;

  // D-pad Left (14) / Right (15) camera zoom
  const dpadLeft = btnPressed(14) ? 1 : 0;
  const dpadRight = btnPressed(15) ? 1 : 0;
  const cameraZoom = dpadRight - dpadLeft;

  const cross = btnPressed(0);
  const circle = btnPressed(1);
  const triangle = btnPressed(3);
  const options = btnPressed(9);
  const r3 = btnPressed(11);

  const anyActive =
    Math.abs(pitch) > 0 ||
    Math.abs(yaw) > 0 ||
    Math.abs(roll) > 0 ||
    progradeThrust > 0.05 ||
    retrogradeThrust > 0.05 ||
    inclinationDelta !== 0 ||
    Math.abs(cameraYaw) > 0 ||
    Math.abs(cameraPitch) > 0 ||
    cross ||
    circle ||
    triangle ||
    options;

  return {
    input: {
      pitch,
      yaw,
      roll,
      progradeThrust,
      retrogradeThrust,
      inclinationDelta,
      cameraYaw,
      cameraPitch,
      cameraZoom,
      confirmPressed: cross && !prevButtons.cross,
      secondaryPressed: circle && !prevButtons.circle,
      toggleAutopilotPressed: triangle && !prevButtons.triangle,
      togglePausePressed: options && !prevButtons.options,
      toggleCameraPressed: r3 && !prevButtons.r3,
      controllerProfile: profile,
      controllerName: gamepad.id,
    },
    nextButtons: { cross, circle, triangle, options, r3 },
    anyActive,
  };
}

export function mergeFlightInputs(
  heldKeys: Set<string>,
  mouseOverride: Partial<FlightControlInput>,
  gamepadSample: { input: Partial<FlightControlInput>; anyActive: boolean }
): FlightControlInput {
  const gp = gamepadSample.input;

  const keyPitch =
    (heldKeys.has('KeyW') || heldKeys.has('ArrowUp') ? 1 : 0) -
    (heldKeys.has('KeyS') || heldKeys.has('ArrowDown') ? 1 : 0);
  const keyYaw =
    (heldKeys.has('KeyD') || heldKeys.has('ArrowRight') ? 1 : 0) -
    (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft') ? 1 : 0);
  const keyRoll = (heldKeys.has('KeyE') ? 1 : 0) - (heldKeys.has('KeyQ') ? 1 : 0);
  const keyPrograde = heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight') || heldKeys.has('KeyR') ? 1 : 0;
  const keyRetro = heldKeys.has('ControlLeft') || heldKeys.has('KeyX') || heldKeys.has('KeyF') ? 1 : 0;
  const keyInc = (heldKeys.has('KeyI') ? 1 : 0) - (heldKeys.has('KeyK') ? 1 : 0);
  const keyCamZoom = (heldKeys.has('Equal') || heldKeys.has('BracketRight') ? 1 : 0) - (heldKeys.has('Minus') || heldKeys.has('BracketLeft') ? 1 : 0);

  const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const pitch = clamp1(keyPitch + (gp.pitch ?? 0) + (mouseOverride.pitch ?? 0));
  const yaw = clamp1(keyYaw + (gp.yaw ?? 0) + (mouseOverride.yaw ?? 0));
  const roll = clamp1(keyRoll + (gp.roll ?? 0) + (mouseOverride.roll ?? 0));
  const progradeThrust = clamp01(Math.max(keyPrograde, gp.progradeThrust ?? 0, mouseOverride.progradeThrust ?? 0));
  const retrogradeThrust = clamp01(Math.max(keyRetro, gp.retrogradeThrust ?? 0, mouseOverride.retrogradeThrust ?? 0));
  const inclinationDelta = clamp1(keyInc + (gp.inclinationDelta ?? 0) + (mouseOverride.inclinationDelta ?? 0));
  const cameraYaw = clamp1((gp.cameraYaw ?? 0) + (mouseOverride.cameraYaw ?? 0));
  const cameraPitch = clamp1((gp.cameraPitch ?? 0) + (mouseOverride.cameraPitch ?? 0));
  const cameraZoom = clamp1(keyCamZoom + (gp.cameraZoom ?? 0) + (mouseOverride.cameraZoom ?? 0));

  const hasKey =
    keyPitch !== 0 ||
    keyYaw !== 0 ||
    keyRoll !== 0 ||
    keyPrograde > 0 ||
    keyRetro > 0 ||
    keyInc !== 0 ||
    keyCamZoom !== 0;

  const hasMouse =
    Math.abs(mouseOverride.pitch ?? 0) > 0.01 ||
    Math.abs(mouseOverride.yaw ?? 0) > 0.01 ||
    (mouseOverride.progradeThrust ?? 0) > 0.01 ||
    (mouseOverride.retrogradeThrust ?? 0) > 0.01 ||
    Math.abs(mouseOverride.inclinationDelta ?? 0) > 0.01;

  let activeSource: FlightControlInput['activeSource'] = 'idle';
  if (gamepadSample.anyActive) {
    activeSource =
      gp.controllerProfile === 'ps5-dualsense'
        ? 'ps5'
        : gp.controllerProfile === 'ps4-dualshock'
          ? 'ps4'
          : 'gamepad';
  } else if (hasKey) {
    activeSource = 'keyboard';
  } else if (hasMouse) {
    activeSource = 'mouse';
  }

  return {
    pitch,
    yaw,
    roll,
    progradeThrust,
    retrogradeThrust,
    inclinationDelta,
    cameraYaw,
    cameraPitch,
    cameraZoom,
    togglePausePressed: Boolean(gp.togglePausePressed),
    toggleCameraPressed: Boolean(gp.toggleCameraPressed),
    confirmPressed: Boolean(gp.confirmPressed),
    secondaryPressed: Boolean(gp.secondaryPressed),
    toggleAutopilotPressed: Boolean(gp.toggleAutopilotPressed),
    activeSource,
    controllerProfile: gp.controllerProfile ?? 'none',
    controllerName: gp.controllerName ?? null,
  };
}
