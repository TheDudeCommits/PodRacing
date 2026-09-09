import {
  normalizePlayerInput,
  type PlayerInputAction,
  type PlayerInputSource,
  type PlayerInputState,
} from './actions';

export type GamepadBindingAction = PlayerInputAction | 'steerLeft' | 'steerRight';
export type GamepadAxisMode = 'signed' | 'positive' | 'negative';

export interface GamepadButtonBinding {
  type: 'button';
  index: number;
  /** Activation threshold for digital actions; analog actions use button value. */
  threshold?: number;
}

export interface GamepadAxisBinding {
  type: 'axis';
  index: number;
  /** Signed passes both directions; positive/negative select one half-axis. */
  mode: GamepadAxisMode;
  /** Applied before mode selection. Use -1 to invert an axis. */
  scale: number;
  /** Activation threshold when an axis is mapped to a digital action. */
  threshold?: number;
}

export type GamepadControlBinding = GamepadButtonBinding | GamepadAxisBinding;
export type GamepadBindings = Readonly<
  Record<GamepadBindingAction, readonly GamepadControlBinding[]>
>;

export interface InputTuningSettings {
  /** Raw stick values inside this radius are ignored. */
  gamepadDeadzone: number;
  /** Steering response curve: 1 is linear, larger values respond sooner. */
  gamepadSensitivity: number;
  /** Stabilizes small steering movements while preserving full lock. */
  steeringAssist: number;
}

export interface GamepadInputOptions {
  bindings?: GamepadBindings;
  tuning?: Partial<InputTuningSettings>;
  /** Fixed browser gamepad index. Omit or use null to follow the first connected pad. */
  gamepadIndex?: number | null;
  /** Injectable for deterministic tests and non-window runtimes. */
  getGamepads?: () => readonly (Gamepad | null)[];
}

export const GAMEPAD_BINDING_ACTIONS = Object.freeze([
  'throttle',
  'brake',
  'steer',
  'steerLeft',
  'steerRight',
  'drift',
  'boost',
  'fire',
  'mine',
  'shield',
  'cycleVehicle',
  'reset',
  'pause',
] as const satisfies readonly GamepadBindingAction[]);

const DEFAULT_BUTTON_THRESHOLD = 0.5;
const MAX_BINDINGS_PER_ACTION = 6;

function freezeGamepadBindings(
  bindings: Record<GamepadBindingAction, GamepadControlBinding[]>,
): GamepadBindings {
  for (const action of GAMEPAD_BINDING_ACTIONS) {
    for (const binding of bindings[action]) Object.freeze(binding);
    Object.freeze(bindings[action]);
  }
  return Object.freeze(bindings);
}

/** Standard-layout defaults. Axis 0 is inverted to preserve positive-is-left semantics. */
export const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = freezeGamepadBindings({
  throttle: [{ type: 'button', index: 7 }],
  brake: [{ type: 'button', index: 6 }],
  steer: [{ type: 'axis', index: 0, mode: 'signed', scale: -1 }],
  steerLeft: [{ type: 'button', index: 14 }],
  steerRight: [{ type: 'button', index: 15 }],
  drift: [{ type: 'button', index: 0 }],
  boost: [{ type: 'button', index: 1 }],
  fire: [{ type: 'button', index: 5 }],
  mine: [{ type: 'button', index: 3 }],
  shield: [{ type: 'button', index: 2 }],
  cycleVehicle: [{ type: 'button', index: 4 }],
  reset: [{ type: 'button', index: 8 }],
  pause: [{ type: 'button', index: 9 }],
});

export const DEFAULT_INPUT_TUNING: Readonly<InputTuningSettings> = Object.freeze({
  gamepadDeadzone: 0.14,
  gamepadSensitivity: 1,
  steeringAssist: 0.35,
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finiteInRange(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns a frozen, safe tuning object from UI or persisted values. */
export function sanitizeInputTuning(
  value: unknown,
  fallback: InputTuningSettings = DEFAULT_INPUT_TUNING,
): Readonly<InputTuningSettings> {
  const source = isRecord(value) ? value : {};
  return Object.freeze({
    gamepadDeadzone: finiteInRange(
      source.gamepadDeadzone,
      0,
      0.95,
      fallback.gamepadDeadzone,
    ),
    gamepadSensitivity: finiteInRange(
      source.gamepadSensitivity,
      0.25,
      2,
      fallback.gamepadSensitivity,
    ),
    steeringAssist: finiteInRange(
      source.steeringAssist,
      0,
      1,
      fallback.steeringAssist,
    ),
  });
}

function sanitizeControlBinding(value: unknown): GamepadControlBinding | null {
  if (!isRecord(value) || !Number.isInteger(value.index)) return null;
  const index = value.index as number;
  if (value.type === 'button') {
    if (index < 0 || index > 63) return null;
    const threshold = value.threshold === undefined
      ? undefined
      : finiteInRange(value.threshold, 0, 1, Number.NaN);
    if (value.threshold !== undefined && Number.isNaN(threshold)) return null;
    return threshold === undefined
      ? { type: 'button', index }
      : { type: 'button', index, threshold };
  }
  if (value.type !== 'axis' || index < 0 || index > 31) return null;
  if (value.mode !== 'signed' && value.mode !== 'positive' && value.mode !== 'negative') {
    return null;
  }
  const scale = finiteInRange(value.scale, -2, 2, Number.NaN);
  if (Number.isNaN(scale) || scale === 0) return null;
  const threshold = value.threshold === undefined
    ? undefined
    : finiteInRange(value.threshold, 0, 1, Number.NaN);
  if (value.threshold !== undefined && Number.isNaN(threshold)) return null;
  return threshold === undefined
    ? { type: 'axis', index, mode: value.mode, scale }
    : { type: 'axis', index, mode: value.mode, scale, threshold };
}

/**
 * Produces a deeply frozen, complete gamepad map from untrusted saved data.
 * Invalid entries are discarded; a missing action falls back independently.
 */
export function sanitizeGamepadBindings(
  value: unknown,
  fallback: GamepadBindings = DEFAULT_GAMEPAD_BINDINGS,
): GamepadBindings {
  const source = isRecord(value) ? value : {};
  const result = {} as Record<GamepadBindingAction, GamepadControlBinding[]>;
  for (const action of GAMEPAD_BINDING_ACTIONS) {
    const candidate = source[action];
    if (!Array.isArray(candidate)) {
      result[action] = fallback[action].map((binding) => ({ ...binding }));
      continue;
    }
    const bindings: GamepadControlBinding[] = [];
    for (const rawBinding of candidate) {
      const binding = sanitizeControlBinding(rawBinding);
      if (binding) bindings.push(binding);
      if (bindings.length >= MAX_BINDINGS_PER_ACTION) break;
    }
    result[action] = candidate.length > 0 && bindings.length === 0
      ? fallback[action].map((binding) => ({ ...binding }))
      : bindings;
  }
  return freezeGamepadBindings(result);
}

/** Applies deadzone, sensitivity and a center-stabilizing assist curve. */
export function applyGamepadSteeringResponse(
  value: number,
  tuning: InputTuningSettings = DEFAULT_INPUT_TUNING,
): number {
  if (!Number.isFinite(value)) return 0;
  const safe = sanitizeInputTuning(tuning);
  const sign = Math.sign(value);
  const magnitude = Math.abs(clamp(value, -1, 1));
  if (magnitude <= safe.gamepadDeadzone) return 0;
  const normalized = (magnitude - safe.gamepadDeadzone) / (1 - safe.gamepadDeadzone);
  const curved = normalized ** (1 / safe.gamepadSensitivity);
  const stabilized = curved * curved * (3 - 2 * curved);
  return clamp(
    sign * (curved + (stabilized - curved) * safe.steeringAssist),
    -1,
    1,
  );
}

function defaultGetGamepads(): readonly (Gamepad | null)[] {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
      ? navigator.getGamepads()
      : [];
  } catch {
    return [];
  }
}

function sampleBinding(gamepad: Gamepad, binding: GamepadControlBinding): number {
  if (binding.type === 'button') {
    const button = gamepad.buttons[binding.index];
    if (!button) return 0;
    const value = Number.isFinite(button.value) ? button.value : 0;
    return clamp(value > 0 ? value : button.pressed ? 1 : 0, 0, 1);
  }
  const raw = gamepad.axes[binding.index];
  if (raw === undefined || !Number.isFinite(raw)) return 0;
  const scaled = clamp(raw * binding.scale, -1, 1);
  if (binding.mode === 'positive') return Math.max(0, scaled);
  if (binding.mode === 'negative') return Math.max(0, -scaled);
  return scaled;
}

function strongestSample(
  gamepad: Gamepad,
  bindings: readonly GamepadControlBinding[],
): number {
  let result = 0;
  for (const binding of bindings) {
    const sample = sampleBinding(gamepad, binding);
    if (Math.abs(sample) > Math.abs(result)) result = sample;
  }
  return result;
}

function anyActive(
  gamepad: Gamepad,
  bindings: readonly GamepadControlBinding[],
): boolean {
  return bindings.some((binding) => (
    Math.abs(sampleBinding(gamepad, binding)) >= (binding.threshold ?? DEFAULT_BUTTON_THRESHOLD)
  ));
}

/** Polling Gamepad API adapter with no frame-rate-dependent internal state. */
export class GamepadInput implements PlayerInputSource {
  #bindings: GamepadBindings;
  #tuning: Readonly<InputTuningSettings>;
  #gamepadIndex: number | null;
  readonly #getGamepads: () => readonly (Gamepad | null)[];
  #enabled = true;

  constructor(options: GamepadInputOptions = {}) {
    this.#bindings = sanitizeGamepadBindings(options.bindings);
    this.#tuning = sanitizeInputTuning(options.tuning);
    this.#gamepadIndex = Number.isInteger(options.gamepadIndex)
      && (options.gamepadIndex as number) >= 0
      ? options.gamepadIndex as number
      : null;
    this.#getGamepads = options.getGamepads ?? defaultGetGamepads;
  }

  set enabled(value: boolean) {
    this.#enabled = value;
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  get bindings(): GamepadBindings {
    return this.#bindings;
  }

  get tuning(): Readonly<InputTuningSettings> {
    return this.#tuning;
  }

  get gamepadIndex(): number | null {
    return this.#gamepadIndex;
  }

  set gamepadIndex(value: number | null) {
    this.#gamepadIndex = Number.isInteger(value) && (value as number) >= 0
      ? value as number
      : null;
  }

  setBindings(bindings: unknown): GamepadBindings {
    this.#bindings = sanitizeGamepadBindings(bindings, this.#bindings);
    return this.#bindings;
  }

  setTuning(tuning: unknown): Readonly<InputTuningSettings> {
    this.#tuning = sanitizeInputTuning(tuning, this.#tuning);
    return this.#tuning;
  }

  snapshot(): PlayerInputState {
    if (!this.#enabled) return normalizePlayerInput();
    let gamepads: readonly (Gamepad | null)[];
    try {
      gamepads = this.#getGamepads();
    } catch {
      return normalizePlayerInput();
    }
    const gamepad = this.#gamepadIndex === null
      ? gamepads.find((candidate) => candidate?.connected !== false) ?? null
      : gamepads[this.#gamepadIndex] ?? null;
    if (!gamepad || gamepad.connected === false) return normalizePlayerInput();

    const analogSteer = applyGamepadSteeringResponse(
      strongestSample(gamepad, this.#bindings.steer),
      this.#tuning,
    );
    const digitalSteer = strongestSample(gamepad, this.#bindings.steerLeft)
      - strongestSample(gamepad, this.#bindings.steerRight);

    return normalizePlayerInput({
      throttle: strongestSample(gamepad, this.#bindings.throttle),
      brake: strongestSample(gamepad, this.#bindings.brake),
      steer: digitalSteer === 0 ? analogSteer : digitalSteer,
      drift: anyActive(gamepad, this.#bindings.drift),
      boost: anyActive(gamepad, this.#bindings.boost),
      fire: anyActive(gamepad, this.#bindings.fire),
      mine: anyActive(gamepad, this.#bindings.mine),
      shield: anyActive(gamepad, this.#bindings.shield),
      cycleVehicle: anyActive(gamepad, this.#bindings.cycleVehicle),
      reset: anyActive(gamepad, this.#bindings.reset),
      pause: anyActive(gamepad, this.#bindings.pause),
    });
  }
}
