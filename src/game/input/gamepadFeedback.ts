/** Browser-only comfort adapter. Neither navigation nor rumble mutates race state. */
export class GamepadFeedback {
  private heldConfirm = false;
  private heldCancel = false;
  private nextMove = 0;
  private lastDirection = '';
  private nextRumble = 0;
  private pad(): Gamepad | undefined { return [...(navigator.getGamepads?.() ?? [])].find((p): p is Gamepad => !!p?.connected); }
  navigate(root: HTMLElement, now: number, active: boolean): void {
    const pad = this.pad(); if (!pad) return;
    const confirm = !!pad.buttons[0]?.pressed, cancel = !!pad.buttons[1]?.pressed;
    if (active) {
      const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')]
        .filter(el => el.getClientRects().length > 0 && !el.closest('[hidden],[aria-hidden="true"]'));
      const focused = controls.includes(document.activeElement as HTMLElement) ? document.activeElement as HTMLElement : null;
      const x = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0) || (Math.abs(pad.axes[0] ?? 0) > .55 ? Math.sign(pad.axes[0]!) : 0);
      const y = (pad.buttons[13]?.pressed ? 1 : 0) - (pad.buttons[12]?.pressed ? 1 : 0) || (Math.abs(pad.axes[1] ?? 0) > .55 ? Math.sign(pad.axes[1]!) : 0);
      const direction = `${x},${y}`;
      if ((x || y) && (now >= this.nextMove || direction !== this.lastDirection)) {
        this.nextMove = now + (direction === this.lastDirection ? 160 : 320);
        if (!focused) controls[0]?.focus();
        else if (focused instanceof HTMLInputElement && focused.type === 'range' && x) {
          focused.value = String(Math.max(Number(focused.min), Math.min(Number(focused.max), Number(focused.value) + x * Number(focused.step || 1))));
          focused.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          const from = focused.getBoundingClientRect(), cx = from.x + from.width / 2, cy = from.y + from.height / 2;
          let best: HTMLElement | undefined, score = Infinity;
          for (const el of controls) {
            if (el === focused) continue; const to = el.getBoundingClientRect();
            const dx = to.x + to.width / 2 - cx, dy = to.y + to.height / 2 - cy;
            const along = dx * x + dy * y, across = Math.abs(dx * y - dy * x);
            if (along <= 2) continue; const cost = along + across * 2.5;
            if (cost < score) { best = el; score = cost; }
          }
          best?.focus();
        }
      }
      this.lastDirection = direction;
      if (confirm && !this.heldConfirm) (focused ?? controls[0])?.click();
      if (cancel && !this.heldCancel) root.querySelector<HTMLElement>('[data-action="resume-race"]:not([hidden])')?.click();
    }
    this.heldConfirm = confirm; this.heldCancel = cancel;
  }
  pulse(strength: number, duration = 110): void {
    const now = performance.now(); if (now < this.nextRumble) return;
    this.nextRumble = now + 100;
    const actuator = this.pad()?.vibrationActuator;
    if (!actuator) return;
    void actuator.playEffect('dual-rumble', { duration: Math.min(250, duration), startDelay: 0,
      strongMagnitude: Math.min(.7, Math.max(0, strength)), weakMagnitude: Math.min(.8, Math.max(0, strength * 1.3)) }).catch(() => undefined);
  }
  dispose(): void { void this.pad()?.vibrationActuator?.reset().catch(() => undefined); }
}
