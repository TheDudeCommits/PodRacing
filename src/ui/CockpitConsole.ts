export type CockpitCue = 'press' | 'select' | 'open' | 'launch';

/** Presentation only: DOM depth and the existing mesh inspector, never race state. */
export class CockpitConsole {
  private frame = 0;
  private last = 0;
  private lastInspect = 0;
  private touched = 0;
  private x = 0;
  private y = 0;
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly abort = new AbortController();

  constructor(private readonly root: HTMLElement, private readonly rotate: (delta: number) => void,
    private readonly sound?: (cue: CockpitCue) => void) {
    const options = { signal: this.abort.signal };
    root.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const bounds = root.getBoundingClientRect();
      this.x = (e.clientX - bounds.left) / bounds.width - .5;
      this.y = (e.clientY - bounds.top) / bounds.height - .5;
    }, options);
    root.addEventListener('pointerleave', () => { this.x = this.y = 0; }, options);
    for (const type of ['pointerdown', 'keydown']) root.addEventListener(type, () => { this.touched = performance.now(); }, options);
    // Capture runs before the action can hide the console. Native click also
    // covers keyboard activation; disabled controls never emit a cue.
    root.addEventListener('click', e => {
      const control = (e.target as Element).closest<HTMLElement>('button,summary');
      if (!control || control.matches(':disabled')) return;
      const action = control.dataset.action ?? '';
      this.sound?.(action === 'start-race' ? 'launch' : action.startsWith('select-') || action === 'step-pod' ? 'select' : control.tagName === 'SUMMARY' || action === 'toggle-settings' ? 'open' : 'press');
      if (control.matches('.setup-racer,.setup-map,.setup-mode')) {
        root.classList.remove('cockpit-switching');
        void root.offsetWidth;
        root.classList.add('cockpit-switching');
      }
    }, { ...options, capture: true });
    this.frame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number): void => {
    this.frame = requestAnimationFrame(this.tick);
    const visible = this.root.classList.contains('is-visible') && !document.hidden;
    const reduced = this.motion.matches || this.root.closest('.is-reduced-motion');
    if (!visible || reduced) { this.last = now; this.root.style.setProperty('--cockpit-x', '0deg'); this.root.style.setProperty('--cockpit-y', '0deg'); return; }
    this.root.style.setProperty('--cockpit-x', `${(-this.y * 1.6).toFixed(3)}deg`);
    this.root.style.setProperty('--cockpit-y', `${(this.x * 2).toFixed(3)}deg`);
    const dt = Math.min(.08, (now - (this.last || now)) / 1000);
    this.last = now;
    // 20 Hz is ample for the slow inspection turn and avoids a second full-rate
    // WebGL scene. Pause as soon as a person touches the console or opens tools.
    if (now - this.lastInspect >= 50 && now - this.touched > 1800 && !this.root.querySelector('.is-inspecting,details[open]') && !this.root.closest('.is-paused,.has-workshop,.has-event-atlas')) {
      this.rotate(dt * 3 * Math.cos(now / 8000));
      this.lastInspect = now;
    }
  };

  dispose(): void { this.abort.abort(); cancelAnimationFrame(this.frame); }
}
