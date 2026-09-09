import type { HudMasteryViewModel } from '../game/mastery/types';
import { RACE_EVENT_ATLAS_CSS } from './raceEventAtlasStyles';

type AtlasEvent = HudMasteryViewModel['events'][number];
export interface RaceEventAtlasModel {
  events: AtlasEvent[];
  selectedId: string | null;
  title: string;
  subtitle: string;
  canStart: boolean;
}
/** Selection remains simulation-owned; a stale/missing selected ID cannot launch. */
export function createRaceEventAtlasModel(mastery: HudMasteryViewModel | undefined, canStart = true): RaceEventAtlasModel {
  const seen = new Set<string>();
  const events = (mastery?.events ?? []).filter(event => {
    if (!event.id || seen.has(event.id)) return false;
    seen.add(event.id); return true;
  }).map(event => ({ ...event }));
  const selected = events.find(event => event.id === mastery?.eventId);
  return { events, selectedId: selected?.id ?? null, title: selected?.title ?? 'Choose an event',
    subtitle: selected?.subtitle ?? (events.length ? 'Select a flight from the atlas.' : 'Your event calendar will appear here.'),
    canStart: Boolean(selected && canStart) };
}
/** Keyboard ordering uses the current calendar, including its changing daily ID. */
export function raceEventAtlasKeyIndex(key: string, current: number, count: number): number | null {
  if (count < 1) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowRight' || key === 'ArrowDown') return (Math.max(-1, current) + 1) % count;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return ((current < 0 ? 0 : current) + count - 1) % count;
  return null;
}
const TONES = ['#d29a6d', '#6faaa3', '#b75c3d', '#4c8991', '#ded5a6', '#bc8260', '#8ca995'];
/** Original etched surfaces distinguish destinations without external image assets. */
function atlasSurface(index: number): string {
  const formations = [
    '<path d="M-8 23 16 17 31 29 42 20 55 28 75 12 106 25V46L82 34 60 49 37 39 16 50-8 40Z" fill="#e9b383"/><path d="M-8 71 18 59 35 66 58 51 84 64 108 55V79L80 84 56 71 31 89 7 80Z" fill="#71342a"/>',
    '<path d="M-10 33Q24 8 55 28T110 27V43Q72 70 38 45T-10 53Z" fill="#e5ede1"/><path d="M-10 73Q23 52 59 72T110 65" fill="none" stroke="#39666a" stroke-width="14"/>',
    '<path d="M0 20 19 29 30 15 37 36 59 23 74 44 100 28V58L77 60 58 44 36 59 17 46 0 60Z" fill="#e2aa79"/><path d="M0 77 29 65 48 80 75 63 100 76V100H0Z" fill="#7d3b30"/>',
    '<path d="M0 24H25V14H39V38H64V21H79V47H100V67H73V53H51V75H26V53H0Z" fill="#b4c6b8"/><path d="M0 84H43V94H58V76H100M12 0V11H53V0" fill="none" stroke="#d68660" stroke-width="5"/>',
    '<path d="M-5 68 17 23 32 55 52 7 64 39 84 16 108 75 83 59 69 93 48 66 27 92Z" fill="#f2eed7"/><path d="M17 23 27 59 32 55 45 73 52 7 60 53 64 39 73 67 84 16" fill="none" stroke="#799b98" stroke-width="3"/>',
    '<path d="M-6 24Q17 53 47 26T106 29V44Q75 19 43 57T-6 39Z" fill="#e4b07f"/><path d="M-6 76Q20 49 44 72T106 68V90Q70 64 39 91T-6 83Z" fill="#773c34"/>',
    '<path d="M6 15Q46 36 28 51T62 89L83 75Q41 58 64 39T81 8Z" fill="#d4dec3"/><path d="M-9 75Q26 49 55 69T109 54" fill="none" stroke="#40676b" stroke-width="10"/>',
  ];
  return `<svg class="race-event-atlas__surface" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${formations[index % formations.length]}<path d="M8 40Q35 21 65 39T110 30M-9 64Q28 47 60 62T110 51" fill="none" stroke="#f3dfb5" stroke-width=".8" opacity=".65"/></svg>`;
}
const ORBITS = `<svg class="race-event-atlas__orbits" viewBox="0 0 1200 450" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <ellipse cx="470" cy="286" rx="490" ry="195" class="atlas-orbit-main"/>
  <ellipse cx="470" cy="286" rx="400" ry="170" class="atlas-orbit-dash"/>
  <circle cx="470" cy="286" r="77"/>
  <ellipse cx="733" cy="245" rx="285" ry="325" class="atlas-orbit-secondary"/><ellipse cx="733" cy="245" rx="310" ry="350" class="atlas-orbit-dash"/>
  <path d="M8 403h150q24 0 24 24v23 M8 410h144q24 0 24 24v16" class="atlas-orbit-accent"/>
  <path d="M30 100h70m-35-35v70 M1090 330h70m-35-35v70"/>
</svg>`;

/** DOM-only race calendar. Native button clicks bubble to the owning RaceHud. */
export class RaceEventAtlas {
  private readonly root: HTMLElement;
  private readonly eventLayer: HTMLElement;
  private readonly viewport: HTMLElement;
  private readonly title: HTMLElement;
  private readonly subtitle: HTMLElement;
  private readonly count: HTMLElement;
  private readonly empty: HTMLElement;
  private readonly start: HTMLButtonElement;
  private readonly close: HTMLButtonElement;
  private readonly buttons = new Map<string, HTMLButtonElement>();
  private model: RaceEventAtlasModel = createRaceEventAtlasModel(undefined);
  private visible = false;
  private disposed = false;
  private returnFocus: HTMLElement | null = null;

  constructor(mount: HTMLElement) {
    const document = mount.ownerDocument;
    this.root = document.createElement('section');
    this.root.className = 'race-event-atlas';
    this.root.hidden = true;
    this.root.tabIndex = -1;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Race event atlas');
    this.root.innerHTML = `<header class="race-event-atlas__header"><div><h2 class="race-event-atlas__heading">Event atlas</h2><span class="race-event-atlas__edition">Inkstorm racing / <span data-atlas="count">0 events</span></span></div><button type="button" class="race-event-atlas__close" data-action="close-event-atlas" aria-label="Close race event atlas">Back to garage <span aria-hidden="true">↗</span></button></header>
      <div class="race-event-atlas__band" aria-hidden="true"></div>
      <div class="race-event-atlas__viewport"><div class="race-event-atlas__map">${ORBITS}<div data-atlas="events" role="group" aria-label="Race events"></div><p class="race-event-atlas__empty" data-atlas="empty">Your event calendar will appear here.</p></div></div>
      <footer class="race-event-atlas__footer"><div class="race-event-atlas__details" aria-live="polite" aria-atomic="true"><span class="race-event-atlas__eyebrow">Selected flight</span><h3 class="race-event-atlas__title" data-atlas="title">Choose an event</h3><p class="race-event-atlas__description" data-atlas="subtitle">Your event calendar will appear here.</p></div><div class="race-event-atlas__launch"><button type="button" class="race-event-atlas__start" data-action="start-race" disabled>Race this event <b aria-hidden="true">↗</b></button><span class="race-event-atlas__help">← → Browse &nbsp; / &nbsp; Enter select &nbsp; / &nbsp; Esc back</span></div></footer>`;
    const element = <T extends HTMLElement>(selector: string): T => {
      const found = this.root.querySelector<T>(selector);
      if (!found) throw new Error(`Missing event atlas element: ${selector}`);
      return found;
    };
    this.eventLayer = element('[data-atlas="events"]');
    this.viewport = element('.race-event-atlas__viewport');
    this.title = element('[data-atlas="title"]'); this.subtitle = element('[data-atlas="subtitle"]');
    this.count = element('[data-atlas="count"]'); this.empty = element('[data-atlas="empty"]');
    this.start = element('.race-event-atlas__start');
    this.start.dataset.action = 'launch-atlas-event';
    this.close = element('[data-action="close-event-atlas"]');
    const style = document.createElement('style'); style.textContent = RACE_EVENT_ATLAS_CSS; this.root.prepend(style);
    this.root.addEventListener('keydown', this.handleKeyDown);
    mount.append(this.root);
  }

  update(mastery: HudMasteryViewModel | undefined, canStart = true): void {
    if (this.disposed) return;
    const model = createRaceEventAtlasModel(mastery, canStart), previousId = this.model.selectedId;
    if (model.selectedId === this.model.selectedId && model.title === this.model.title && model.subtitle === this.model.subtitle
      && model.canStart === this.model.canStart && model.events.length === this.model.events.length
      && model.events.every((event, index) => { const old = this.model.events[index]!; return event.id === old.id && event.title === old.title && event.subtitle === old.subtitle; })) return;
    const ids = new Set(model.events.map(event => event.id));
    const removedFocus = [...this.buttons].some(([id, button]) => !ids.has(id) && this.root.ownerDocument.activeElement === button);
    for (const [id, button] of this.buttons) if (!ids.has(id)) { button.remove(); this.buttons.delete(id); }
    model.events.forEach((event, index) => {
      let button = this.buttons.get(event.id);
      if (!button) {
        button = this.root.ownerDocument.createElement('button');
        button.type = 'button'; button.className = 'race-event-atlas__event';
        button.dataset.action = 'select-atlas-event'; button.dataset.eventId = event.id;
        button.innerHTML = `<span class="race-event-atlas__disc" aria-hidden="true">${atlasSurface(index)}<span class="race-event-atlas__number"></span></span><span class="race-event-atlas__name"></span><span class="race-event-atlas__marker" aria-hidden="true">Selected</span>`;
        this.buttons.set(event.id, button);
      }
      const selected = event.id === model.selectedId;
      button.classList.toggle('is-selected', selected); button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${event.title}. ${event.subtitle}`);
      button.querySelector<HTMLElement>('.race-event-atlas__name')!.textContent = event.title;
      button.querySelector<HTMLElement>('.race-event-atlas__number')!.textContent = String(index + 1).padStart(2, '0');
      const selectedIndex = model.events.findIndex(item => item.id === model.selectedId);
      const satellite = index < selectedIndex ? index : index - 1;
      const positions = [[8, 32], [24, 64], [39, 28], [14, 82], [82, 27], [93, 76]] as const;
      const position = selected ? [61, 49] : positions[Math.max(0, satellite) % positions.length]!;
      button.style.setProperty('--atlas-x', `${position[0]}%`);
      button.style.setProperty('--atlas-y', `${position[1]}%`);
      button.style.setProperty('--atlas-tone', TONES[index % TONES.length]!);
      button.style.setProperty('--atlas-angle', `${18 + index * 23}deg`);
      // Keep DOM order synchronized without detaching the focused selection on every HUD tick.
      if (this.eventLayer.children[index] !== button) this.eventLayer.insertBefore(button, this.eventLayer.children[index] ?? null);
    });
    this.model = model;
    if (this.title.textContent !== model.title) this.title.textContent = model.title;
    if (this.subtitle.textContent !== model.subtitle) this.subtitle.textContent = model.subtitle;
    this.count.textContent = `${model.events.length} ${model.events.length === 1 ? 'event' : 'events'}`;
    this.empty.hidden = model.events.length > 0;
    this.start.disabled = !model.canStart;
    if (this.visible && removedFocus) (this.selectedButton() ?? this.close).focus({ preventScroll: true });
    if (this.visible && (previousId !== model.selectedId || removedFocus)) this.revealSelection();
  }

  setVisible(visible: boolean): void {
    if (this.disposed || this.visible === visible) return;
    this.visible = visible; this.root.hidden = !visible;
    if (visible) {
      const active = this.root.ownerDocument.activeElement;
      this.returnFocus = active && !this.root.contains(active) ? active as HTMLElement : null;
      (this.selectedButton() ?? this.close).focus({ preventScroll: true }); this.revealSelection();
    } else {
      if (this.root.contains(this.root.ownerDocument.activeElement)) this.returnFocus?.focus?.({ preventScroll: true });
      this.returnFocus = null;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.setVisible(false); this.disposed = true;
    this.root.removeEventListener('keydown', this.handleKeyDown);
    this.root.remove(); this.buttons.clear();
  }

  private selectedButton(): HTMLButtonElement | undefined { return this.model.selectedId ? this.buttons.get(this.model.selectedId) : undefined; }
  private revealSelection(): void {
    const button = this.selectedButton(); if (!button) return;
    const target = Number.parseFloat(button.style.getPropertyValue('--atlas-x')) / 100
      * (button.offsetParent as HTMLElement).clientWidth - this.viewport.clientWidth / 2;
    // Deliberately immediate: the disc owns the motion; scrolling never animates the whole map.
    this.viewport.scrollLeft = Math.max(0, target);
  }
  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.visible) event.stopPropagation();
    if (!this.visible || this.disposed || event.altKey || event.ctrlKey || event.metaKey) return;
    // Own modal navigation keys so Enter cannot also reach the garage's
    // global start shortcut. Do not prevent native button activation: its
    // resulting click still bubbles to RaceHud.
    if (event.key === 'Escape') { event.preventDefault(); this.close.click(); return; }
    const ordered = this.model.events.map(item => this.buttons.get(item.id)!);
    const current = ordered.indexOf(this.root.ownerDocument.activeElement as HTMLButtonElement);
    const next = current >= 0 ? raceEventAtlasKeyIndex(event.key, current, ordered.length) : null;
    if (next !== null) { event.preventDefault(); const button = ordered[next]!; button.focus({ preventScroll: true }); button.click(); return; }
    if (event.key === 'Tab') {
      const focusable = [this.close, ...ordered, ...(this.start.disabled ? [] : [this.start])];
      const active = this.root.ownerDocument.activeElement;
      if (event.shiftKey && (active === focusable[0] || active === this.root)) { event.preventDefault(); focusable.at(-1)!.focus(); }
      else if (!event.shiftKey && active === focusable.at(-1)) { event.preventDefault(); focusable[0]!.focus(); }
    }
  };
}
