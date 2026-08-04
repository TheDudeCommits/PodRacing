import { describe, expect, it } from 'vitest';
import {
  CompositePlayerInput,
  DEFAULT_GAMEPAD_BINDINGS,
  GamepadInput,
  NEUTRAL_PLAYER_INPUT,
  applyGamepadSteeringResponse,
  mergePlayerInputStates,
  sanitizeGamepadBindings,
  sanitizeInputTuning,
  type GamepadBindings,
} from '../../src/game/input';

function button(value = 0): GamepadButton {
  return { pressed: value >= 0.5, touched: value > 0, value };
}

function createGamepad(
  axes: readonly number[] = [0, 0, 0, 0],
  buttonValues: Readonly<Record<number, number>> = {},
  connected = true,
): Gamepad {
  const buttons = Array.from({ length: 16 }, (_, index) => button(buttonValues[index] ?? 0));
  return {
    axes: [...axes],
    buttons,
    connected,
    id: 'Test Standard Gamepad',
    index: 0,
    mapping: 'standard',
    timestamp: 1,
    vibrationActuator: null,
  } as unknown as Gamepad;
}

describe('semantic gamepad input', () => {
  it('preserves positive-left and negative-right steering handedness', () => {
    let gamepad = createGamepad([-1, 0, 0, 0]);
    const input = new GamepadInput({
      getGamepads: () => [gamepad],
      tuning: { gamepadDeadzone: 0, gamepadSensitivity: 1, steeringAssist: 0 },
    });

    expect(input.snapshot().steer).toBe(1);
    gamepad = createGamepad([1, 0, 0, 0]);
    expect(input.snapshot().steer).toBe(-1);
    gamepad = createGamepad([0, 0, 0, 0], { 14: 1 });
    expect(input.snapshot().steer).toBe(1);
    gamepad = createGamepad([0, 0, 0, 0], { 15: 1 });
    expect(input.snapshot().steer).toBe(-1);
  });

  it('maps analog triggers and standard buttons to semantic actions', () => {
    const gamepad = createGamepad([0, 0, 0, 0], {
      0: 1,
      2: 1,
      3: 1,
      5: 1,
      6: 0.4,
      7: 0.75,
      9: 1,
    });
    const input = new GamepadInput({ getGamepads: () => [gamepad] });

    expect(input.snapshot()).toMatchObject({
      throttle: 0.75,
      brake: 0.4,
      drift: true,
      fire: true,
      mine: true,
      shield: true,
      pause: true,
    });
  });

  it('supports explicit runtime remapping and fixed controller selection', () => {
    const disconnected = createGamepad([], {}, false);
    const active = {
      ...createGamepad([], { 10: 1 }),
      index: 1,
    } as Gamepad;
    const custom = sanitizeGamepadBindings({
      ...DEFAULT_GAMEPAD_BINDINGS,
      fire: [{ type: 'button', index: 10 }],
    });
    const input = new GamepadInput({
      gamepadIndex: 1,
      getGamepads: () => [disconnected, active],
    });
    input.setBindings(custom);

    expect(input.snapshot().fire).toBe(true);
    input.gamepadIndex = 0;
    expect(input.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
  });

  it('applies deadzone, sensitivity and center-stabilizing steering assist safely', () => {
    expect(applyGamepadSteeringResponse(0.1, {
      gamepadDeadzone: 0.15,
      gamepadSensitivity: 1,
      steeringAssist: 0,
    })).toBe(0);
    expect(applyGamepadSteeringResponse(1, {
      gamepadDeadzone: 0.15,
      gamepadSensitivity: 2,
      steeringAssist: 1,
    })).toBe(1);
    expect(applyGamepadSteeringResponse(Number.NaN)).toBe(0);

    expect(sanitizeInputTuning({
      gamepadDeadzone: 5,
      gamepadSensitivity: -2,
      steeringAssist: Number.NaN,
    })).toEqual({
      gamepadDeadzone: 0.14,
      gamepadSensitivity: 1,
      steeringAssist: 0.35,
    });
  });

  it('keeps explicit unbinding but falls back from corrupt binding arrays', () => {
    const unbound = sanitizeGamepadBindings({
      ...DEFAULT_GAMEPAD_BINDINGS,
      mine: [],
    });
    expect(unbound.mine).toEqual([]);

    const corrupt = sanitizeGamepadBindings({
      ...DEFAULT_GAMEPAD_BINDINGS,
      mine: [{ type: 'button', index: 999 }],
    });
    expect(corrupt.mine).toEqual(DEFAULT_GAMEPAD_BINDINGS.mine);
    expect(Object.isFrozen(corrupt.mine)).toBe(true);
  });

  it('returns neutral input when polling is disabled, disconnected or throws', () => {
    const throwing = new GamepadInput({ getGamepads: () => { throw new Error('blocked'); } });
    expect(throwing.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);

    const input = new GamepadInput({ getGamepads: () => [createGamepad()] });
    input.enabled = false;
    expect(input.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
  });
});

describe('merged semantic input', () => {
  it('takes strongest pedals, combines steering safely and ORs digital actions', () => {
    expect(mergePlayerInputStates(
      { throttle: 0.4, steer: 0.8, drift: true },
      { throttle: 0.9, brake: 0.5, steer: -0.25, fire: true },
    )).toEqual({
      ...NEUTRAL_PLAYER_INPUT,
      throttle: 0.9,
      brake: 0.5,
      steer: 0.55,
      drift: true,
      fire: true,
    });
  });

  it('normalizes custom sources through CompositePlayerInput', () => {
    const composite = new CompositePlayerInput([
      { snapshot: () => ({ throttle: 99, steer: 0.75 }) },
      { snapshot: () => ({ steer: 0.75, shield: true }) },
    ]);
    expect(composite.snapshot()).toEqual({
      ...NEUTRAL_PLAYER_INPUT,
      throttle: 1,
      steer: 1,
      shield: true,
    });
    composite.setSources([]);
    expect(composite.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
  });

  it('exposes complete remappable maps as serializable records', () => {
    const roundTripped = JSON.parse(JSON.stringify(DEFAULT_GAMEPAD_BINDINGS)) as GamepadBindings;
    expect(roundTripped).toEqual(DEFAULT_GAMEPAD_BINDINGS);
  });
});
