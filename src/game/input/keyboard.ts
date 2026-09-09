import {
  normalizePlayerInput,
  type PlayerInputAction,
  type PlayerInputState,
} from './actions';

export type KeyboardBindings = Readonly<
  Record<PlayerInputAction | 'steerLeft' | 'steerRight', readonly string[]>
>;

export type KeyboardBindingAction = keyof KeyboardBindings;

export const KEYBOARD_BINDING_ACTIONS = Object.freeze([
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
] as const satisfies readonly KeyboardBindingAction[]);

const MAX_KEYS_PER_ACTION = 6;
const MAX_KEY_CODE_LENGTH = 48;

function freezeKeyboardBindings(bindings: Record<KeyboardBindingAction, string[]>): KeyboardBindings {
  for (const action of KEYBOARD_BINDING_ACTIONS) Object.freeze(bindings[action]);
  return Object.freeze(bindings);
}

/** Keyboard defaults are expressed in `KeyboardEvent.code`, not layout text. */
export const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = freezeKeyboardBindings({
  throttle: ['KeyW', 'ArrowUp'],
  brake: ['KeyS', 'ArrowDown'],
  steer: [],
  steerLeft: ['KeyA', 'ArrowLeft'],
  steerRight: ['KeyD', 'ArrowRight'],
  drift: ['Space'],
  boost: ['ShiftLeft', 'ShiftRight'],
  fire: ['KeyE'],
  mine: ['KeyF'],
  shield: ['KeyQ'],
  cycleVehicle: ['KeyV'],
  reset: ['KeyR'],
  pause: ['Escape', 'KeyP'],
});

function isBindingRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeKeyCodes(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const codes: string[] = [];
  for (const candidate of value) {
    if (
      typeof candidate !== 'string'
      || candidate.length === 0
      || candidate.length > MAX_KEY_CODE_LENGTH
    ) continue;
    if (!codes.includes(candidate)) codes.push(candidate);
    if (codes.length >= MAX_KEYS_PER_ACTION) break;
  }
  return value.length > 0 && codes.length === 0 ? [...fallback] : codes;
}

/**
 * Produces a deeply frozen, complete keyboard map from untrusted saved data.
 * An explicit empty array remains a valid way to unbind an action.
 */
export function sanitizeKeyboardBindings(
  value: unknown,
  fallback: KeyboardBindings = DEFAULT_KEYBOARD_BINDINGS,
): KeyboardBindings {
  const source = isBindingRecord(value) ? value : {};
  const bindings = {} as Record<KeyboardBindingAction, string[]>;
  for (const action of KEYBOARD_BINDING_ACTIONS) {
    bindings[action] = sanitizeKeyCodes(source[action], fallback[action]);
  }
  return freezeKeyboardBindings(bindings);
}

function anyPressed(pressed: ReadonlySet<string>, codes: readonly string[]): boolean {
  return codes.some((code) => pressed.has(code));
}

/**
 * Text-entry surfaces own their keystrokes. This deliberately avoids
 * `instanceof HTMLElement` so the boundary also works through shadow DOM and
 * in lightweight input tests without a browser document.
 */
export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  let node = target as {
    tagName?: unknown;
    isContentEditable?: unknown;
    parentElement?: EventTarget | null;
    getAttribute?: (name: string) => string | null;
  } | null;
  while (node) {
    const tagName = typeof node.tagName === 'string' ? node.tagName.toUpperCase() : '';
    const role = node.getAttribute?.('role')?.toLowerCase() ?? '';
    const contentEditable = typeof node.getAttribute === 'function'
      ? node.getAttribute('contenteditable')
      : null;
    if (
      tagName === 'INPUT'
      || tagName === 'TEXTAREA'
      || tagName === 'SELECT'
      || node.isContentEditable === true
      || (contentEditable !== null && contentEditable !== 'false')
      || role === 'textbox'
      || role === 'searchbox'
      || role === 'combobox'
      || role === 'spinbutton'
    ) {
      return true;
    }
    node = (node.parentElement ?? null) as typeof node;
  }
  return false;
}

/** Browser/system shortcuts and editable controls must bypass gameplay input. */
export function shouldIgnoreGameplayKey(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return true;
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  if (path.some((target) => isKeyboardUiTarget(target))) return true;
  return isKeyboardUiTarget(event.target);
}

/** Native menu activation/inspection keys never double as driving input. */
export function isKeyboardUiTarget(target: EventTarget | null): boolean {
  if (isEditableKeyboardTarget(target)) return true;
  let node = target as { tagName?: string; parentElement?: EventTarget | null;
    getAttribute?: (name: string) => string | null } | null;
  while (node) {
    const role = node.getAttribute?.('role')?.toLowerCase();
    if (node.tagName?.toUpperCase() === 'BUTTON' || role === 'button' || role === 'tab'
      || node.getAttribute?.('data-pod-inspection') != null) return true;
    node = (node.parentElement ?? null) as typeof node;
  }
  return false;
}

/**
 * Converts physical left/right keys into the simulation's yaw axis.
 *
 * The procedural racer faces +Z, where positive yaw turns toward chase-camera
 * left. Keeping that handedness explicit here makes A/Left steer visually left
 * and D/Right steer visually right without changing AI or replay inputs.
 */
export function resolveKeyboardSteer(
  pressed: ReadonlySet<string>,
  bindings: KeyboardBindings = DEFAULT_KEYBOARD_BINDINGS,
): number {
  const left = anyPressed(pressed, bindings.steerLeft);
  const right = anyPressed(pressed, bindings.steerRight);
  return Number(left) - Number(right);
}

/**
 * Browser keyboard adapter. It owns physical key state but never gameplay
 * state, which makes it safe to replace with replay or AI input sources.
 */
export class KeyboardInput {
  readonly #target: EventTarget;
  #bindings: KeyboardBindings;
  readonly #pressed = new Set<string>();
  #handledCodes: ReadonlySet<string>;
  #enabled = true;

  constructor(
    target: EventTarget,
    bindings: KeyboardBindings = DEFAULT_KEYBOARD_BINDINGS,
  ) {
    this.#target = target;
    this.#bindings = sanitizeKeyboardBindings(bindings);
    this.#handledCodes = new Set(Object.values(this.#bindings).flat());
    target.addEventListener('keydown', this.#onKeyDown);
    target.addEventListener('keyup', this.#onKeyUp);
    target.addEventListener('focusin', this.#onFocusIn);
    target.addEventListener('blur', this.#onBlur);
  }

  set enabled(value: boolean) {
    this.#enabled = value;
    if (!value) this.#pressed.clear();
  }

  get enabled(): boolean {
    return this.#enabled;
  }

  get bindings(): KeyboardBindings {
    return this.#bindings;
  }

  /** Applies a remap atomically and clears held keys to prevent ghost input. */
  setBindings(bindings: unknown): KeyboardBindings {
    this.#bindings = sanitizeKeyboardBindings(bindings, this.#bindings);
    this.#handledCodes = new Set(Object.values(this.#bindings).flat());
    this.#pressed.clear();
    return this.#bindings;
  }

  snapshot(): PlayerInputState {
    if (!this.#enabled) return normalizePlayerInput();

    return normalizePlayerInput({
      throttle: anyPressed(this.#pressed, this.#bindings.throttle) ? 1 : 0,
      brake: anyPressed(this.#pressed, this.#bindings.brake) ? 1 : 0,
      steer: resolveKeyboardSteer(this.#pressed, this.#bindings),
      drift: anyPressed(this.#pressed, this.#bindings.drift),
      boost: anyPressed(this.#pressed, this.#bindings.boost),
      fire: anyPressed(this.#pressed, this.#bindings.fire),
      mine: anyPressed(this.#pressed, this.#bindings.mine),
      shield: anyPressed(this.#pressed, this.#bindings.shield),
      cycleVehicle: anyPressed(this.#pressed, this.#bindings.cycleVehicle),
      reset: anyPressed(this.#pressed, this.#bindings.reset),
      pause: anyPressed(this.#pressed, this.#bindings.pause),
    });
  }

  dispose(): void {
    this.#pressed.clear();
    this.#target.removeEventListener('keydown', this.#onKeyDown);
    this.#target.removeEventListener('keyup', this.#onKeyUp);
    this.#target.removeEventListener('focusin', this.#onFocusIn);
    this.#target.removeEventListener('blur', this.#onBlur);
  }

  readonly #onKeyDown = (event: Event): void => {
    if (!this.#enabled || !(event instanceof KeyboardEvent)) return;
    if (shouldIgnoreGameplayKey(event)) {
      this.#pressed.delete(event.code);
      return;
    }
    if (this.#handledCodes.has(event.code)) event.preventDefault();
    this.#pressed.add(event.code);
  };

  readonly #onKeyUp = (event: Event): void => {
    if (!(event instanceof KeyboardEvent)) return;
    if (!shouldIgnoreGameplayKey(event) && this.#handledCodes.has(event.code)) event.preventDefault();
    this.#pressed.delete(event.code);
  };

  readonly #onFocusIn = (event: Event): void => {
    if (isKeyboardUiTarget(event.target)) this.#pressed.clear();
  };

  readonly #onBlur = (): void => {
    this.#pressed.clear();
  };
}
