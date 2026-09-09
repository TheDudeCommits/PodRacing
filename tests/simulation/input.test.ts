import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_KEYBOARD_BINDINGS,
  KeyboardInput,
  NEUTRAL_PLAYER_INPUT,
  isEditableKeyboardTarget,
  normalizePlayerInput,
  resolveKeyboardSteer,
} from '../../src/game/input';

class TestKeyboardEvent extends Event {
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;

  constructor(type: string, init: KeyboardEventInit = {}) {
    super(type, { bubbles: true, cancelable: true });
    this.code = init.code ?? '';
    this.ctrlKey = init.ctrlKey ?? false;
    this.metaKey = init.metaKey ?? false;
    this.altKey = init.altKey ?? false;
  }
}

class TestElement extends EventTarget {
  readonly isContentEditable = false;
  readonly tagName: string = 'DIV';

  getAttribute(): null {
    return null;
  }

  matches(_selector: string): boolean {
    return false;
  }
}

class TestInputElement extends TestElement {
  override readonly tagName: string = 'INPUT';

  override matches(selector: string): boolean {
    return selector.includes('input') || selector.includes('[contenteditable]');
  }
}

function installKeyboardDomStubs(): void {
  vi.stubGlobal('KeyboardEvent', TestKeyboardEvent);
  vi.stubGlobal('Element', TestElement);
  vi.stubGlobal('HTMLElement', TestElement);
  vi.stubGlobal('HTMLInputElement', TestInputElement);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('semantic player input', () => {
  it('normalizes analog controls and rejects non-finite values', () => {
    expect(
      normalizePlayerInput({
        throttle: 7,
        brake: -4,
        steer: Number.NaN,
        drift: true,
      }),
    ).toEqual({
      ...NEUTRAL_PLAYER_INPUT,
      throttle: 1,
      steer: 0,
      drift: true,
    });
  });

  it('keeps physical mappings separate from semantic action names', () => {
    expect(DEFAULT_KEYBOARD_BINDINGS.throttle).toContain('KeyW');
    expect(DEFAULT_KEYBOARD_BINDINGS.steerLeft).toContain('KeyA');
    expect(DEFAULT_KEYBOARD_BINDINGS.steerRight).toContain('KeyD');
    expect(DEFAULT_KEYBOARD_BINDINGS.steerLeft).toContain('ArrowLeft');
    expect(DEFAULT_KEYBOARD_BINDINGS.steerRight).toContain('ArrowRight');
    expect(DEFAULT_KEYBOARD_BINDINGS.drift).toContain('Space');
    expect(DEFAULT_KEYBOARD_BINDINGS.boost).toContain('ShiftLeft');
    expect(DEFAULT_KEYBOARD_BINDINGS.fire).toContain('KeyE');
    expect(DEFAULT_KEYBOARD_BINDINGS.mine).toContain('KeyF');
    expect(DEFAULT_KEYBOARD_BINDINGS.reset).toContain('KeyR');
  });

  it('maps A/Left to visual left and D/Right to visual right', () => {
    expect(resolveKeyboardSteer(new Set(['KeyA']))).toBe(1);
    expect(resolveKeyboardSteer(new Set(['ArrowLeft']))).toBe(1);
    expect(resolveKeyboardSteer(new Set(['KeyD']))).toBe(-1);
    expect(resolveKeyboardSteer(new Set(['ArrowRight']))).toBe(-1);
    expect(resolveKeyboardSteer(new Set(['KeyA', 'KeyD']))).toBe(0);
  });

  it('supports validated runtime keyboard remapping without ghost input', () => {
    installKeyboardDomStubs();
    const target = new TestElement();
    const keyboard = new KeyboardInput(target);
    target.dispatchEvent(new TestKeyboardEvent('keydown', { code: 'KeyW' }));
    expect(keyboard.snapshot().throttle).toBe(1);

    const remapped = keyboard.setBindings({
      ...DEFAULT_KEYBOARD_BINDINGS,
      throttle: ['KeyT', 'KeyT'],
      fire: [],
      mine: [42],
    });
    expect(keyboard.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
    expect(remapped.throttle).toEqual(['KeyT']);
    expect(remapped.fire).toEqual([]);
    expect(remapped.mine).toEqual(DEFAULT_KEYBOARD_BINDINGS.mine);

    const oldKey = new TestKeyboardEvent('keydown', { code: 'KeyW' });
    target.dispatchEvent(oldKey);
    expect(oldKey.defaultPrevented).toBe(false);
    expect(keyboard.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);

    const newKey = new TestKeyboardEvent('keydown', { code: 'KeyT' });
    target.dispatchEvent(newKey);
    expect(newKey.defaultPrevented).toBe(true);
    expect(keyboard.snapshot().throttle).toBe(1);
    keyboard.dispose();
  });

  it('leaves bound letter keys native and gameplay-neutral inside an editable input', () => {
    installKeyboardDomStubs();
    const target = new TestInputElement();
    const keyboard = new KeyboardInput(target);

    for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'KeyG']) {
      const event = new TestKeyboardEvent('keydown', { code });
      expect(event).toBeInstanceOf(KeyboardEvent);
      target.dispatchEvent(event);
      expect(event.defaultPrevented, `${code} should remain available to the input`).toBe(false);
    }

    expect(keyboard.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
    keyboard.dispose();
  });

  it('preserves native menu button activation and releases held driving keys on menu focus', () => {
    installKeyboardDomStubs();
    class TestButton extends TestElement { override readonly tagName = 'BUTTON'; }
    const button = new TestButton();
    const input = new KeyboardInput(button);
    for (const code of ['Space', 'Enter', 'ArrowLeft', 'KeyW', 'KeyE']) {
      const event = new TestKeyboardEvent('keydown', { code });
      button.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(input.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
    }
    input.dispose();
  });

  it('does not consume modified browser shortcuts such as Cmd/Ctrl+V', () => {
    installKeyboardDomStubs();
    const target = new TestElement();
    const keyboard = new KeyboardInput(target);

    for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
      const event = new TestKeyboardEvent('keydown', { code: 'KeyV', ...modifier });
      expect(event).toBeInstanceOf(KeyboardEvent);
      target.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }

    expect(keyboard.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
    keyboard.dispose();
  });

  it('does not mistake non-element composed-path targets for editable controls', () => {
    expect(isEditableKeyboardTarget(new EventTarget())).toBe(false);
  });

  it('still prevents and captures unmodified gameplay keys outside editable controls', () => {
    installKeyboardDomStubs();
    const target = new TestElement();
    const keyboard = new KeyboardInput(target);
    const keyDown = new TestKeyboardEvent('keydown', { code: 'KeyW' });
    expect(keyDown).toBeInstanceOf(KeyboardEvent);

    target.dispatchEvent(keyDown);
    expect(keyDown.defaultPrevented).toBe(true);
    expect(keyboard.snapshot()).toEqual({ ...NEUTRAL_PLAYER_INPUT, throttle: 1 });

    const keyUp = new TestKeyboardEvent('keyup', { code: 'KeyW' });
    target.dispatchEvent(keyUp);
    expect(keyUp.defaultPrevented).toBe(true);
    expect(keyboard.snapshot()).toEqual(NEUTRAL_PLAYER_INPUT);
    keyboard.dispose();
  });
});
