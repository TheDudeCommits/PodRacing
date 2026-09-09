/**
 * Semantic controls consumed by the fixed-step simulation.
 *
 * Analog values are deliberately plain numbers so keyboard, gamepad, replay,
 * AI and deterministic capture inputs all share the same boundary.
 */
export interface PlayerInputState {
  /** Requested engine power in [0, 1]. */
  throttle: number;
  /** Requested braking force in [0, 1]. */
  brake: number;
  /** Steering yaw axis in [-1, 1]. Positive yaw appears racer-left in chase view. */
  steer: number;
  /** Hold to powerslide; releasing a charged slide grants a boost. */
  drift: boolean;
  /** Hold to spend the stored boost meter. */
  boost: boolean;
  /** Fires the forward Heat Lance. */
  fire: boolean;
  /** Deploys a Scrap Mine behind the racer. */
  mine: boolean;
  /** Activates the timed Pulse Shell when its cooldown is ready. */
  shield: boolean;
  /** Cycles the player's vehicle class while the race is on the grid. */
  cycleVehicle: boolean;
  /** Reset to the most recent safe/respawn pose. */
  reset: boolean;
  /** Pause is owned by the game loop, but belongs in the action snapshot. */
  pause: boolean;
}

export type PlayerInputAction = keyof PlayerInputState;

/** Any input adapter that can provide a semantic player-action snapshot. */
export interface PlayerInputSource {
  snapshot(): Partial<PlayerInputState>;
}

export const NEUTRAL_PLAYER_INPUT: Readonly<PlayerInputState> = Object.freeze({
  throttle: 0,
  brake: 0,
  steer: 0,
  drift: false,
  boost: false,
  fire: false,
  mine: false,
  shield: false,
  cycleVehicle: false,
  reset: false,
  pause: false,
});

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Returns a fresh, JSON-serializable input snapshot with safe ranges. */
export function normalizePlayerInput(
  input: Partial<PlayerInputState> = {},
): PlayerInputState {
  return {
    throttle: clamp(finiteOrZero(input.throttle ?? 0), 0, 1),
    brake: clamp(finiteOrZero(input.brake ?? 0), 0, 1),
    steer: clamp(finiteOrZero(input.steer ?? 0), -1, 1),
    drift: input.drift === true,
    boost: input.boost === true,
    fire: input.fire === true,
    mine: input.mine === true,
    shield: input.shield === true,
    cycleVehicle: input.cycleVehicle === true,
    reset: input.reset === true,
    pause: input.pause === true,
  };
}

/**
 * Merges semantic action snapshots from independent devices.
 *
 * Analog engine controls use the strongest request, steering requests add and
 * clamp (so opposite devices cancel), and digital actions use logical OR. The
 * result is normalized even when a custom adapter supplies invalid values.
 */
export function mergePlayerInputStates(
  ...inputs: readonly Partial<PlayerInputState>[]
): PlayerInputState {
  let throttle = 0;
  let brake = 0;
  let steer = 0;
  let drift = false;
  let boost = false;
  let fire = false;
  let mine = false;
  let shield = false;
  let cycleVehicle = false;
  let reset = false;
  let pause = false;

  for (const candidate of inputs) {
    const input = normalizePlayerInput(candidate);
    throttle = Math.max(throttle, input.throttle);
    brake = Math.max(brake, input.brake);
    steer += input.steer;
    drift ||= input.drift;
    boost ||= input.boost;
    fire ||= input.fire;
    mine ||= input.mine;
    shield ||= input.shield;
    cycleVehicle ||= input.cycleVehicle;
    reset ||= input.reset;
    pause ||= input.pause;
  }

  return normalizePlayerInput({
    throttle,
    brake,
    steer,
    drift,
    boost,
    fire,
    mine,
    shield,
    cycleVehicle,
    reset,
    pause,
  });
}

/**
 * Mutable source collection used to combine keyboard, gamepad and future
 * accessibility adapters without coupling any one device to the game loop.
 */
export class CompositePlayerInput implements PlayerInputSource {
  #sources: readonly PlayerInputSource[];

  constructor(sources: readonly PlayerInputSource[] = []) {
    this.#sources = [...sources];
  }

  get sources(): readonly PlayerInputSource[] {
    return this.#sources;
  }

  setSources(sources: readonly PlayerInputSource[]): void {
    this.#sources = [...sources];
  }

  snapshot(): PlayerInputState {
    return mergePlayerInputStates(...this.#sources.map((source) => source.snapshot()));
  }
}
