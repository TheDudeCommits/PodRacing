import { DRIFT_COLORS, DRIFT_LABELS, driftStage } from '../game/simulation/drift';
import type { HudMasteryViewModel } from '../game/mastery/types';
import { CHAMPIONSHIP_EVENT_IDS } from '../game/mastery/events';
import { LANCE_RELOAD_SECONDS as RELOAD_SECONDS } from '../game/galactic/system';
import { MinimapCanvas } from './MinimapCanvas';
import { RaceEventAtlas } from './RaceEventAtlas';
import { workshopSymbol } from './workshopSymbols';
import { VehicleCardPreviewRenderer } from './VehicleCardPreview';
import { ART_APPEARANCES, isVehicleAppearanceId, SELECTABLE_POD_APPEARANCES } from '../game/vehicleAppearance';
import type { VehicleArtLibrary } from '../render/vehicles';
import { installPodracingHudStyles } from './hudStyles';
import {
  cornerGlyph,
  createSessionHudViewModel,
  formatOrdinal,
  formatRaceTimeHundredths,
  formatRaceTime,
  formatSpeed,
  formatSplitDelta,
  HUD_AI_DIFFICULTIES,
  HUD_RACE_MODES,
} from './model';
import type {
  HudAiDifficulty,
  HudGalacticWreckPhase,
  HudLaunchViewModel,
  HudResultViewModel,
  HudResultsPresentationViewModel,
  HudPreRaceViewModel,
  HudRaceMode,
  HudRaceModeStatusViewModel,
  HudSettingsTab,
  HudSettingPath,
  HudSettingsViewModel,
  HudVehicleCardViewModel,
  HudWorkshopSlot,
  HudWorkshopViewModel,
  RaceHudAction,
  RaceHudViewModel,
} from './types';

export const SETUP_PODS = SELECTABLE_POD_APPEARANCES;
export function nextSetupPod(current: string | undefined, direction: number): typeof SETUP_PODS[number] {
  const index = SETUP_PODS.findIndex(id => id === current);
  return SETUP_PODS[(Math.max(0, index) + (direction < 0 ? -1 : 1) + SETUP_PODS.length) % SETUP_PODS.length]!;
}

export interface RaceHudOptions {
  vehicleArtLibrary?: VehicleArtLibrary;
  installStyles?: boolean;
  initiallyMuted?: boolean;
  onMuteChange?: (muted: boolean) => void;
  /** Strongly typed menu actions; the same payload is also dispatched as `pod-hud-action`. */
  onAction?: (action: RaceHudAction) => void;
}

/** Presentation events arrive per display frame, independent of the simulation HUD cadence. */
export interface CombatHudFrame {
  cue: { kind: 'hit' | 'shield-hit' | 'takedown' | 'wreck' | 'emp' | 'repair' | 'revenge' | 'ordnance'; title: string; detail: string; progress: number } | null;
  cinematic: { active: boolean; progress: number; letterbox: boolean };
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Race HUD template is missing ${selector}.`);
  return element;
}

function write(element: Element, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

function setVisible(element: Element, visible: boolean): void {
  element.classList.toggle('is-visible', visible);
  element.setAttribute('aria-hidden', String(!visible));
}

export function normalizeRoomCodeEntry(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

const HUD_WORKSHOP_SLOTS: readonly HudWorkshopSlot[] = [
  'engine',
  'cooling',
  'armour',
  'steering',
  'gadget',
];

const HUD_SETTINGS_TABS: readonly HudSettingsTab[] = ['controls', 'comfort', 'audio'];

export class RaceHud {
  readonly root: HTMLDivElement;

  private readonly minimap: MinimapCanvas;
  private readonly eventAtlas: RaceEventAtlas;
  private eventAtlasOpen = false;
  private readonly systemMotionPreference: MediaQueryList | null;
  private readonly lap: HTMLElement;
  private readonly lapTotal: HTMLElement;
  private readonly position: HTMLElement;
  private readonly racerCount: HTMLElement;
  private readonly clock: HTMLElement;
  private readonly split: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly speedRing: HTMLElement;
  private readonly cornerArrow: HTMLElement;
  private readonly cornerDistance: HTMLElement;
  private readonly cornerTag: HTMLElement;
  private readonly telemetry: HTMLElement;
  private readonly boostFill: HTMLElement;
  private readonly boostValue: HTMLElement;
  private readonly heatFill: HTMLElement;
  private readonly heatValue: HTMLElement;
  private readonly damageFill: HTMLElement;
  private readonly damageValue: HTMLElement;
  private readonly driftFill: HTMLElement;
  private readonly driftValue: HTMLElement;
  private readonly galactic: HTMLElement;
  private readonly primarySlot: HTMLElement;
  private readonly shieldSlot: HTMLElement;
  private readonly mineSlot: HTMLElement;
  private readonly redlineInstrument: HTMLElement;
  private readonly contextAction: HTMLElement;
  private readonly shieldFill: HTMLElement;
  private readonly shieldValue: HTMLElement;
  private readonly weaponName: HTMLElement;
  private readonly weaponFill: HTMLElement;
  private readonly weaponValue: HTMLElement;
  private readonly weaponTarget: HTMLElement;
  private readonly mineCount: HTMLElement;
  private readonly mineLabel: HTMLElement;
  private readonly redlineFill: HTMLElement;
  private readonly redlineValue: HTMLElement;
  private readonly upgradeList: HTMLElement;
  private readonly countdown: HTMLElement;
  private readonly launch: HTMLElement;
  private readonly launchLabel: HTMLElement;
  private readonly launchValue: HTMLElement;
  private readonly launchSweetSpot: HTMLElement;
  private readonly launchNeedle: HTMLElement;
  private readonly launchHeat: HTMLElement;
  private readonly raceModeStatus: HTMLElement;
  private readonly raceModeName: HTMLElement;
  private readonly raceModeObjective: HTMLElement;
  private readonly raceModeScoreLabel: HTMLElement;
  private readonly raceModeScoreValue: HTMLElement;
  private readonly raceModeProgress: HTMLElement;
  private readonly pause: HTMLElement;
  private readonly settingsPanel: HTMLElement;
  private readonly settingsBindings: HTMLElement;
  private readonly settingsCapture: HTMLElement;
  private readonly results: HTMLElement;
  private readonly resultTitle: HTMLElement;
  private readonly resultCallout: HTMLElement;
  private readonly resultList: HTMLElement;
  private readonly resultHighlight: HTMLElement;
  private readonly resultMoments: HTMLElement;
  private readonly vehicleSelection: HTMLElement;
  private readonly vehicleCards: HTMLElement;
  private readonly startPrompt: HTMLElement;
  private readonly raceModeSelect: HTMLSelectElement;
  private readonly workshopPanel: HTMLElement;
  private readonly workshopSlots: HTMLElement;
  private readonly workshopParts: HTMLElement;
  private readonly workshopBonuses: HTMLElement;
  private readonly workshopPenalties: HTMLElement;
  private readonly workshopSynergies: HTMLElement;
  private readonly workshopToggle: HTMLButtonElement;
  private readonly roomPanel: HTMLElement;
  private readonly roomCodeInput: HTMLInputElement;
  private readonly roomMemberCount: HTMLElement;
  private readonly roomMemberList: HTMLElement;
  private readonly roomStatus: HTMLElement;
  private readonly createRoomButton: HTMLButtonElement;
  private readonly joinRoomButton: HTMLButtonElement;
  private readonly copyRoomButton: HTMLButtonElement;
  private readonly leaveRoomButton: HTMLButtonElement;
  private readonly vehiclePreviews: VehicleCardPreviewRenderer;
  private readonly courseMarkers: HTMLElement;
  private readonly courseCorner: HTMLElement;
  private readonly onMuteChange: ((muted: boolean) => void) | undefined;
  private readonly onAction: ((action: RaceHudAction) => void) | undefined;
  private muted: boolean;
  private countdownKey = '';
  private resultsKey = '';
  private upgradesKey = '';
  private vehicleCardsKey = '';
  private courseRacersKey = '';
  private lobbyMembersKey = '__unset__';
  private startPromptKey = '';
  private workshopKey = '';
  private settingsBindingsKey = '';
  private resultPresentationKey = '';
  private garageVehicleKey = '';
  private vehicleSelectionModel: HudPreRaceViewModel | undefined;
  private inspectionAngle = 0;
  private inspectionPointer: { id: number; x: number; angle: number } | null = null;
  private combatBindings = { fire: 'E', shield: 'Q', mine: 'F' };
  private masteryEventsKey = '';
  private masteryResultKey = '';
  private cupStandingsKey = '';

  constructor(mount: HTMLElement, options: RaceHudOptions = {}) {
    if (options.installStyles !== false) installPodracingHudStyles(mount.ownerDocument);
    this.onMuteChange = options.onMuteChange;
    this.onAction = options.onAction;
    this.muted = options.initiallyMuted ?? false;
    this.root = mount.ownerDocument.createElement('div');
    this.systemMotionPreference = mount.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    this.root.className = 'pod-hud';
    // Avoid a one-frame flash of every instrument before the first model tick.
    this.root.dataset.phase = 'countdown';
    this.root.setAttribute('aria-label', 'Podrace instruments');
    this.root.innerHTML = /* html */ `
      <section class="pod-hud__vehicle-select simple-setup" data-hud="vehicle-selection" aria-label="Race setup" aria-hidden="true">
        <div class="pod-hud__vehicle-select-frame setup-frame">
          <header class="setup-header">
            <nav class="setup-types" aria-label="Race type">
              ${[
                ['inkstorm-battle', 'battle', 'Battle', 'Weapons hot', '01'],
                ['inkstorm-race', 'race', 'Race', 'Pure racing', '02'],
                ['inkstorm-trial', 'trial', 'Time Trial', 'Beat the clock', '03'],
                ['cup-canyon', 'cup', 'World Cup', 'Four destinations', '04'],
              ].map(([event, art, label, detail, number]) => `<button class="setup-mode" type="button" data-action="select-event" data-event-id="${event}" data-mode="${art}" aria-label="${label}" aria-pressed="false">
                <span class="setup-mode-art"><img src="/assets/inkstorm/home/mode-${art}-chrome.webp" alt="" width="640" height="360" draggable="false"><span class="setup-mode-number" aria-hidden="true">${number}</span><span class="setup-mode-check" aria-hidden="true">✓</span></span>
                <span class="setup-mode-caption"><strong>${label}</strong><small>${detail}</small></span>
              </button>`).join('')}
            </nav>
          </header>
          <section class="setup-roster-stage" aria-label="Choose your pod">
            <div class="setup-roster-heading"><h2>Select your racer</h2><span aria-hidden="true"></span></div>
            <div class="setup-roster setup-roster--left" role="group" aria-label="Racers 1 to 4">${this.createPodRoster(SETUP_PODS.slice(0, 4))}</div>
            <section class="pod-hud__garage-hero" aria-label="Selected racer">
              <span class="setup-hero-number" data-hud="setup-pod-index" aria-hidden="true">01 / 08</span>
              <div class="setup-hero-orbit" aria-hidden="true"></div>
              <div class="pod-hud__garage-model" data-hud="garage-model" data-vehicle-preview="hero" data-vehicle-id="podracer" data-pod-inspection role="group" tabindex="0" aria-label="Inspect Teemto" aria-description="Use Left and Right arrow keys to inspect. Home resets the view."></div>
              <button class="setup-pod-arrow setup-pod-arrow--previous" type="button" data-action="step-pod" data-direction="-1" aria-label="Previous pod">‹</button>
              <button class="setup-pod-arrow setup-pod-arrow--next" type="button" data-action="step-pod" data-direction="1" aria-label="Next pod">›</button>
              <div class="pod-hud__garage-name" aria-live="polite"><span data-hud="garage-class"></span><h1 data-hud="garage-name">Teemto</h1></div>
              <div class="setup-hero-stats" data-hud="garage-stats" aria-label="Racer ratings"></div>
              <div class="pod-hud__garage-inspect"><button type="button" data-action="inspect-vehicle" data-direction="-1" aria-label="Rotate pod left">↶</button><button type="button" data-action="inspect-vehicle" data-direction="1" aria-label="Rotate pod right">↷</button></div>
              <div class="setup-preview-status"><p data-hud="appearance-status" role="status" aria-live="polite"></p><button type="button" data-action="retry-appearance" hidden>Retry preview</button></div>
            </section>
            <div class="setup-roster setup-roster--right" role="group" aria-label="Racers 5 to 8">${this.createPodRoster(SETUP_PODS.slice(4))}</div>
          </section>
          <section class="setup-maps" aria-label="Choose your destination">
            <div class="setup-map-heading"><h2>Destination</h2><span data-hud="setup-destination">Dune Sea</span></div>
            <nav class="setup-map-grid" aria-label="Race destination">
              ${[
                ['desert', 'inkstorm-battle', 'Dune Sea', 'Sun-scorched canyon'],
                ['frozen', 'biome-frozen-battle', 'Frostline', 'Ice & snow'],
                ['volcanic', 'biome-volcanic-battle', 'Ember Rift', 'Volcanic highlands'],
                ['jungle', 'biome-jungle-battle', 'Verdant Run', 'Deep jungle'],
              ].map(([destination, event, name, detail]) => `<button class="setup-map" type="button" data-action="select-event" data-destination="${destination}" data-event-id="${event}" aria-label="${name}" aria-pressed="false"><img src="/assets/inkstorm/home/map-${destination}-chrome.webp" alt="" width="800" height="450" draggable="false"><span class="setup-map-caption"><strong>${name}</strong><small>${detail}</small></span><span class="setup-map-check" aria-hidden="true">✓</span></button>`).join('')}
            </nav>
          </section>
          <footer class="setup-bottom">
            <nav class="setup-tools" aria-label="Race options and tools">
              <details class="setup-drawer setup-more" name="setup-panel" data-hud="setup-more"><summary>Race rules <span aria-hidden="true">+</span></summary><div class="setup-drawer-body">
                <header><strong>Race rules</strong><button type="button" data-action="close-setup-drawer" aria-label="Close race rules">×</button></header>
                <p class="setup-rule-summary" data-hud="setup-rule-summary">Choose your challenge.</p>
                <div class="setup-options">
                  <div class="pod-hud__difficulty-selector" role="group" aria-label="AI difficulty"><span>Rivals</span><button type="button" data-action="select-ai-difficulty" data-difficulty="easy" aria-pressed="false">Easy</button><button type="button" data-action="select-ai-difficulty" data-difficulty="medium" aria-pressed="true">Medium</button><button type="button" data-action="select-ai-difficulty" data-difficulty="hard" aria-pressed="false">Hard</button></div>
                  <div class="pod-hud__lap-selector" role="group" aria-label="Number of laps"><span>Laps</span><button type="button" data-action="select-laps" data-laps="1" aria-pressed="false">1</button><button type="button" data-action="select-laps" data-laps="2" aria-pressed="false">2</button><button type="button" data-action="select-laps" data-laps="3" aria-pressed="true">3</button></div>
                </div>
                <section data-hud="mastery" aria-label="Race records">
                  <div data-hud="cup-context" hidden><strong></strong><p></p><div data-hud="cup-standings"></div></div>
                  <div class="pod-hud__event-list" data-hud="event-list" hidden></div>
                  <div class="pod-hud__mastery-controls" data-hud="mastery-controls"><button type="button" data-action="toggle-ghost" aria-pressed="false">Ghost <b data-hud="ghost-state">OFF</b></button><button type="button" data-action="save-course" aria-pressed="false">☆ Save course</button></div>
                </section>
              </div></details>
            <details class="pod-hud__room setup-drawer setup-online" name="setup-panel" data-hud="room-panel" aria-label="Online room">
              <summary>Online <span aria-hidden="true">↗</span></summary><div class="setup-drawer-body"><header><strong>Race together</strong><button type="button" data-action="close-setup-drawer" aria-label="Close online room">×</button></header>
              <div class="pod-hud__selector-section-head">
                <strong>Online room</strong>
                <span data-hud="room-member-count">1/4</span>
              </div>
              <div class="pod-hud__room-actions">
                <button type="button" data-action="create-room">Create room</button>
                <label class="pod-hud__room-code">
                  <span class="pod-hud__sr-only">Six-character room code</span>
                  <input data-hud="room-code-input" type="text" maxlength="6" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CODE" aria-label="Six-character room code">
                </label>
                <button type="button" data-action="join-room">Join</button>
                <button type="button" data-action="copy-room" disabled>Copy code</button>
                <button type="button" data-action="leave-room" disabled>Leave</button>
              </div>
              <div class="pod-hud__room-status" data-hud="room-status" role="status" aria-live="polite">Solo race ready</div>
              <ul class="pod-hud__room-members" data-hud="room-member-list" aria-label="Room members"></ul>
            </div></details>
              <button type="button" data-action="open-workshop">Build</button>
              <button type="button" data-action="open-event-atlas" aria-expanded="false">Courses</button>
              <button type="button" data-action="toggle-settings" aria-expanded="false">Options</button>
            </nav>
            <button type="button" class="pod-hud__start-button" data-action="start-race" data-hud="start-button"><span>Play</span><b aria-hidden="true">↗</b></button>
          </footer>
          <div class="setup-legacy" hidden aria-hidden="true">
            <div data-hud="vehicle-cards"></div><div data-hud="appearance"></div>
            <p data-hud="garage-description"></p>
            <h2 data-hud="event-title"></h2><p data-hud="event-description"></p>
            <span data-hud="calendar-title"></span><strong data-hud="personal-best"></strong><small data-hud="mastery-objective"></small><small data-hud="archive-notice" hidden></small>
            <div data-hud="event-launch-summary"><strong data-hud="event-launch-title"></strong><span data-hud="event-launch-detail"></span></div>
            <select data-action="select-race-mode" data-hud="race-mode-select" aria-label="Legacy race mode">${HUD_RACE_MODES.map(mode => `<option value="${mode.id}">${mode.label}</option>`).join('')}</select>
            <button class="pod-hud__workshop-toggle" type="button" data-action="toggle-workshop" aria-expanded="false">Build</button><strong data-hud="start-prompt"></strong>
          </div>
          <section class="pod-hud__workshop" data-hud="workshop" aria-label="Podracer workshop" aria-hidden="true">
            <header class="pod-hud__workshop-head">
              <div><span>INKSTORM / ENGINEERING</span><strong>BUILD</strong></div>
              <button type="button" data-action="toggle-workshop" aria-label="Close workshop">×</button>
            </header>
            <div class="pod-hud__workshop-slots" data-hud="workshop-slots" role="tablist" aria-label="Loadout slots"></div>
            <div class="pod-hud__workshop-body">
              <div class="pod-hud__workshop-parts" data-hud="workshop-parts" aria-label="Available parts"></div>
              <aside class="pod-hud__workshop-summary" aria-label="Build summary">
                <div class="pod-hud__workshop-effective"><strong>Total build <small>ALL INSTALLED PARTS · VS STOCK</small></strong><ul data-hud="workshop-totals"></ul></div>
                <details class="pod-hud__workshop-contributors"><summary>Contributing modifiers</summary><strong>Bonuses</strong><ul data-hud="workshop-bonuses"></ul><strong>Tradeoffs</strong><ul data-hud="workshop-penalties"></ul></details>
                <div><strong>Active synergies</strong><ul data-hud="workshop-synergies"></ul></div>
              </aside>
            </div>
            <footer class="pod-hud__workshop-footer"><span>✓ Changes apply immediately and save on this device.<small class="pod-hud__workshop-reading-hint"><span>Full notes: focus or hover a part. </span>Scroll for more details ↓</small></span><button type="button" data-action="toggle-workshop">DONE / BACK TO HANGAR →</button></footer>
          </section>
        </div>
      </section>

      <section class="pod-hud__race" aria-label="Race status">
        <button class="pod-hud__detail-toggle" type="button" data-action="toggle-hud-detail" aria-pressed="false">MAP +</button>
        <div class="pod-hud__race-rail" aria-hidden="true"><svg viewBox="0 0 1000 76" preserveAspectRatio="none" focusable="false"><path class="race-glass" d="M0 0H1000V46H920L900 72H760L740 46H604C558 83 442 83 396 46H260L240 72H100L80 46H0Z"/><path class="race-contour" d="M0 46H80L100 72H240L260 46H396C442 83 558 83 604 46H740L760 72H900L920 46H1000" vector-effect="non-scaling-stroke"/></svg></div>
        <div class="pod-hud__race-stat pod-hud__race-stat--lap">
          <div class="pod-hud__race-value"><span data-hud="lap">1</span><small>/ <span data-hud="lap-total">3</span></small></div>
          <div class="pod-hud__label">Lap</div>
        </div>
        <div class="pod-hud__race-time">
          <span class="pod-hud__record-target" data-hud="record-target"></span>
          <span class="pod-hud__clock" data-hud="clock">0:00.00</span>
          <span class="pod-hud__label">Time</span>
          <span class="pod-hud__split" data-hud="split">—</span>
        </div>
        <div class="pod-hud__race-stat pod-hud__race-stat--position">
          <div class="pod-hud__race-value"><span data-hud="position">1</span><small>/ <span data-hud="racer-count">4</span></small></div>
          <div class="pod-hud__label">Position</div>
        </div>

      </section>

      <aside class="pod-hud__mode-status" data-hud="race-mode-status" aria-label="Race objective" aria-hidden="true">
        <span data-hud="race-mode-name">Circuit</span>
        <strong data-hud="race-mode-objective">Finish first when the final lap closes</strong>
        <div><small data-hud="race-mode-score-label">Race order</small><b data-hud="race-mode-score-value">1 / 4</b></div>
        <i class="pod-hud__mode-progress" aria-hidden="true"><i data-hud="race-mode-progress"></i></i>
      </aside>

      <section class="pod-hud__map" aria-label="Course minimap">
        <canvas class="pod-hud__minimap" data-hud="minimap" role="img" aria-label="Course route and racer positions"></canvas>
      </section>

      <section class="pod-hud__course-progress" data-hud="course-progress" aria-label="Course progress">
        <div class="pod-hud__course-progress-rail" data-course-progress-rail>
          <i data-course-checkpoint="finish"></i>
          <i data-course-checkpoint="75"></i>
          <i data-course-checkpoint="50"></i>
          <i data-course-checkpoint="25"></i>
          <i data-course-checkpoint="start"></i>
          <span class="pod-hud__course-finish-flag" data-course-finish-flag aria-hidden="true"></span>
          <div class="pod-hud__course-racers" data-hud="course-progress-markers"></div>
        </div>
        <section class="pod-hud__corner" data-hud="course-corner" aria-label="Upcoming corner">
          <span class="pod-hud__corner-arrow" data-hud="corner-arrow">↑</span>
          <div class="pod-hud__corner-distance" data-hud="corner-distance">0 M</div>
          <div class="pod-hud__corner-tag" data-hud="corner-tag">Straight</div>
        </section>
      </section>

      <section class="pod-hud__galactic" data-hud="galactic" aria-label="Combat systems" aria-hidden="true">
        <div class="pod-hud__systems-cluster">
          <div class="pod-hud__combat-grid">
            <div class="pod-hud__combat-slot pod-hud__combat-slot--weapon" data-hud="system-primary" aria-label="Primary weapon E">
              <b class="pod-hud__combat-key" data-key-binding="fire">E</b>
              <i class="pod-hud__system-gauge" aria-hidden="true"><i class="pod-hud__system-icon"></i></i>
              <span class="pod-hud__system-label">Primary</span>
              <span class="pod-hud__sr-only" data-hud="weapon-name">Heat Lance</span>
              <strong class="pod-hud__sr-only" data-hud="weapon-value">Ready</strong>
              <i class="pod-hud__combat-charge" aria-hidden="true"><i data-hud="weapon-fill"></i></i>
            </div>
            <div class="pod-hud__combat-slot pod-hud__combat-slot--shield" data-hud="system-shield" aria-label="Shield Q">
              <b class="pod-hud__combat-key" data-key-binding="shield">Q</b>
              <i class="pod-hud__system-gauge" aria-hidden="true"><i class="pod-hud__system-icon"></i></i>
              <span class="pod-hud__system-label">Shield</span>
              <strong class="pod-hud__sr-only" data-hud="shield-value">Ready</strong>
              <i class="pod-hud__combat-charge" aria-hidden="true"><i data-hud="shield-fill"></i></i>
            </div>
            <div class="pod-hud__combat-slot pod-hud__combat-slot--mine" data-hud="system-mine" aria-label="Mine F">
              <b class="pod-hud__combat-key" data-key-binding="mine">F</b>
              <i class="pod-hud__system-gauge" aria-hidden="true"><i class="pod-hud__system-icon"></i></i>
              <span class="pod-hud__system-label" data-hud="mine-label">Mine</span>
              <strong class="pod-hud__system-ammo">×<span data-hud="mine-count">0</span></strong>
            </div>
          </div>
          <div class="pod-hud__upgrades" data-hud="upgrade-list" aria-label="Installed upgrades"></div>
        </div>
        <div class="pod-hud__context-action" data-hud="context-action" role="status" aria-label="Target scanner: no target">
          <i class="pod-hud__target-reticle" aria-hidden="true"></i>
          <div class="pod-hud__galactic-target pod-hud__sr-only" data-hud="weapon-target">No target</div>
        </div>
      </section>



      <div class="pod-hud__pod-ability" data-hud="pod-ability"><kbd data-key-binding="ability">C</kbd><span data-hud="ability-name">Pod ability</span><b data-hud="ability-state">READY</b></div>
      <section class="pod-hud__driving-instruments" aria-label="Driving instruments">
        <div class="pod-hud__redline-heat" data-hud="redline-instrument" aria-label="Redline heat" aria-hidden="true">
          <span>SHIFT / REDLINE</span>
          <i class="pod-hud__redline-track" aria-hidden="true"><i data-hud="redline-fill"></i></i>
          <strong class="pod-hud__sr-only"><span data-hud="redline-value">0</span>%</strong>
        </div>
      <section class="pod-hud__speed" aria-label="Speed">
        <div class="pod-hud__speed-ring" data-hud="speed-ring"><svg class="pod-hud__speed-dial" viewBox="0 0 185 210" aria-hidden="true"><path class="dial-glass" d="M38 2H115C150 2 178 30 178 65V182C178 196 176 202 162 202H18C8 202 2 196 2 186V119C2 109 8 101 18 97C8 89 2 82 2 75V64C2 45 18 30 38 30Z"/><path class="dial-outline" d="M38 30H115C136 30 151 45 151 66C151 87 136 103 115 103H38C18 103 2 89 2 67C2 46 18 30 38 30Z"/><path class="dial-track" pathLength="100" d="M38 2H115C150 2 178 30 178 65C178 82 172 97 161 109"/><path class="dial-charge" pathLength="100" d="M38 2H115C150 2 178 30 178 65C178 82 172 97 161 109"/><path class="dial-heat-edge" d="M178 65C178 82 172 97 161 109"/><circle class="dial-key-socket" cx="36" cy="12" r="10"/></svg></div>
        <div class="pod-hud__speed-readout">
          <span class="pod-hud__speed-number" data-hud="speed">000</span>
          <span class="pod-hud__speed-unit">KPH</span>
        </div>
        <div class="pod-hud__meter pod-hud__meter--boost">
          <div class="pod-hud__meter-head"><span class="pod-hud__label">Boost</span><span class="pod-hud__meter-value pod-hud__sr-only" data-hud="boost-value">100</span></div>
          <div class="pod-hud__meter-track"><span class="pod-hud__meter-fill" data-hud="boost-fill"></span></div>
        </div>
      </section>

      <section class="pod-hud__telemetry" data-hud="telemetry" aria-label="Heat and damage telemetry">
        <div class="pod-hud__meter pod-hud__meter--heat">
          <div class="pod-hud__meter-head"><span class="pod-hud__label">Heat</span><span class="pod-hud__meter-value pod-hud__sr-only" data-hud="heat-value">0</span></div>
          <div class="pod-hud__meter-track"><span class="pod-hud__meter-fill" data-hud="heat-fill"></span></div>
        </div>
        <div class="pod-hud__meter pod-hud__meter--damage">
          <div class="pod-hud__meter-head"><span class="pod-hud__label">Damage</span><span class="pod-hud__meter-value pod-hud__sr-only" data-hud="damage-value">0</span></div>
          <div class="pod-hud__meter-track"><span class="pod-hud__meter-fill" data-hud="damage-fill"></span></div>
        </div>
      </section>

      </section>

      <div class="pod-hud__countdown" data-hud="countdown" aria-live="assertive" aria-hidden="true"></div>
      <div class="pod-hud__cinematic-matte" aria-hidden="true"></div>
      <section class="pod-hud__driving-feedback" aria-label="Driving feedback">
        <div class="pod-hud__meter pod-hud__meter--drift">
          <div class="pod-hud__meter-head"><span class="pod-hud__label">Drift</span><span class="pod-hud__meter-value" data-hud="drift-value">0</span></div>
          <div class="pod-hud__meter-track"><span class="pod-hud__meter-fill" data-hud="drift-fill"></span></div>
        </div>
      <div class="pod-hud__launch" data-hud="launch" role="status" aria-live="off" aria-atomic="true" aria-hidden="true">
        <header><span>Perfect launch</span><strong data-hud="launch-label">Match the sweet spot</strong></header>
        <div class="pod-hud__launch-track" aria-hidden="true">
          <i class="pod-hud__launch-sweet" data-hud="launch-sweet"></i>
          <b class="pod-hud__launch-needle" data-hud="launch-needle"></b>
        </div>
        <footer>
          <span data-hud="launch-value">REV 000 // TARGET 000</span>
          <i aria-hidden="true"><i data-hud="launch-heat"></i></i>
        </footer>
      </div>
      </section>
      <aside class="pod-hud__pause" data-hud="pause" role="dialog" aria-label="Race paused" aria-hidden="true">
        <div class="pod-hud__pause-home">
          <span data-hud="paused-event">Engines holding</span>
          <strong>Paused</strong>
          <small>Press P or Escape to rejoin the circuit</small>
          <div class="pod-hud__pause-actions">
            <button type="button" data-action="resume-race">Resume</button>
            <button type="button" data-action="toggle-settings" aria-expanded="false">Settings</button>
            <button type="button" data-action="retry-race" data-solo-pause hidden disabled>Retry event</button>
            <button type="button" data-action="return-to-garage" data-solo-pause hidden disabled>Back to Hangar</button>
          </div>
          <p data-hud="pause-navigation-hint"></p>
          <aside class="pod-hud__pause-tutorial" data-hud="tutorial" hidden><span data-hud="tutorial-step"></span><strong data-hud="tutorial-title"></strong><p data-hud="tutorial-instruction"></p><i aria-hidden="true"><i data-hud="tutorial-progress"></i></i></aside>
        </div>
        <section class="pod-hud__settings" data-hud="settings" aria-label="Game settings" aria-hidden="true">
          <header>
            <div><span>Race systems</span><strong>Settings</strong></div>
            <button type="button" data-action="toggle-settings" aria-label="Close settings">×</button>
          </header>
          <nav class="pod-hud__settings-tabs" aria-label="Settings sections">
            <button type="button" data-action="select-settings-tab" data-settings-tab="controls" aria-pressed="true">Controls</button>
            <button type="button" data-action="select-settings-tab" data-settings-tab="comfort" aria-pressed="false">Comfort</button>
            <button type="button" data-action="select-settings-tab" data-settings-tab="audio" aria-pressed="false">Audio</button>
          </nav>
          <div class="pod-hud__settings-page" data-settings-page="controls">
            <div class="pod-hud__settings-sliders">
              <label>Deadzone <output data-setting-output="controls.gamepadDeadzone">12%</output><input type="range" min="0" max="0.95" step="0.01" data-setting="controls.gamepadDeadzone"></label>
              <label>Sensitivity <output data-setting-output="controls.gamepadSensitivity">100%</output><input type="range" min="0.25" max="2" step="0.05" data-setting="controls.gamepadSensitivity"></label>
              <label>Steering assist <output data-setting-output="controls.steeringAssist">35%</output><input type="range" min="0" max="1" step="0.05" data-setting="controls.steeringAssist"></label>
            </div>
            <div class="pod-hud__binding-list" data-hud="settings-bindings"></div>
            <div class="pod-hud__capture-status" data-hud="settings-capture" role="status"></div>
          </div>
          <div class="pod-hud__settings-page" data-settings-page="comfort" hidden>
            <div class="pod-hud__settings-sliders">
              <label>Camera shake <output data-setting-output="comfort.cameraShake">100%</output><input type="range" min="0" max="1" step="0.05" data-setting="comfort.cameraShake"></label>
              <label>FOV effects <output data-setting-output="comfort.fovEffects">100%</output><input type="range" min="0" max="1" step="0.05" data-setting="comfort.fovEffects"></label>
              <label>Motion intensity <output data-setting-output="comfort.motionIntensity">100%</output><input type="range" min="0" max="1" step="0.05" data-setting="comfort.motionIntensity"></label>
            </div>
            <div class="pod-hud__settings-toggles">
              <label><input type="checkbox" data-setting="comfort.reducedMotion"><span>Reduced motion</span></label>
              <label><input type="checkbox" data-setting="comfort.highContrast"><span>High contrast</span></label>
            </div>
          </div>
          <div class="pod-hud__settings-page" data-settings-page="audio" hidden>
            <div class="pod-hud__settings-sliders pod-hud__settings-sliders--audio">
              <label>Master <output data-setting-output="audio.master">100%</output><input type="range" min="0" max="1" step="0.05" data-setting="audio.master"></label>
              <label>Music <output data-setting-output="audio.music">80%</output><input type="range" min="0" max="1" step="0.05" data-setting="audio.music"></label>
              <label>Engine <output data-setting-output="audio.engine">100%</output><input type="range" min="0" max="1" step="0.05" data-setting="audio.engine"></label>
              <label>Effects <output data-setting-output="audio.effects">100%</output><input type="range" min="0" max="1" step="0.05" data-setting="audio.effects"></label>
              <label>Voice <output data-setting-output="audio.voice">100%</output><input type="range" min="0" max="1" step="0.05" data-setting="audio.voice"></label>
            </div>
            <a class="pod-hud__audio-credits" href="/audio/salt-dusk-v2/CREDITS.html" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:#bad3e3">Audio credits ↗</a>
          </div>
        </section>
      </aside>

      <section class="pod-hud__results" data-hud="results" role="dialog" aria-label="Race results" aria-hidden="true">
        <h1 class="pod-hud__results-title" data-hud="result-title">Race complete</h1>
        <div class="pod-hud__results-callout" data-hud="result-callout">Pod one // Circuit conquered</div>
        <div class="pod-hud__results-actions"><button type="button" class="pod-hud__start-button" data-action="retry-race">RACE AGAIN <b>↗</b></button><button type="button" data-action="return-to-garage">BACK TO HANGAR</button></div>
        <div class="pod-hud__mastery-result" data-hud="mastery-result" hidden></div>
        <div class="pod-hud__result-highlight" data-hud="result-highlight" aria-hidden="true"></div>
        <div class="pod-hud__results-list" data-hud="result-list"></div>
        <div class="pod-hud__result-moments" data-hud="result-moments" aria-label="Race highlights"></div>
        <div class="pod-hud__results-footer">R to retry · Select a highlight to relive the race</div>
      </section>
    `;
    mount.append(this.root);
    this.eventAtlas = new RaceEventAtlas(requireElement(this.root, '[data-hud="vehicle-selection"]'));

    this.lap = requireElement(this.root, '[data-hud="lap"]');
    this.lapTotal = requireElement(this.root, '[data-hud="lap-total"]');
    this.position = requireElement(this.root, '[data-hud="position"]');
    this.racerCount = requireElement(this.root, '[data-hud="racer-count"]');
    this.clock = requireElement(this.root, '[data-hud="clock"]');
    this.split = requireElement(this.root, '[data-hud="split"]');
    this.speed = requireElement(this.root, '[data-hud="speed"]');
    this.speedRing = requireElement(this.root, '[data-hud="speed-ring"]');
    this.cornerArrow = requireElement(this.root, '[data-hud="corner-arrow"]');
    this.cornerDistance = requireElement(this.root, '[data-hud="corner-distance"]');
    this.cornerTag = requireElement(this.root, '[data-hud="corner-tag"]');
    this.telemetry = requireElement(this.root, '[data-hud="telemetry"]');
    this.boostFill = requireElement(this.root, '[data-hud="boost-fill"]');
    this.boostValue = requireElement(this.root, '[data-hud="boost-value"]');
    this.heatFill = requireElement(this.root, '[data-hud="heat-fill"]');
    this.heatValue = requireElement(this.root, '[data-hud="heat-value"]');
    this.damageFill = requireElement(this.root, '[data-hud="damage-fill"]');
    this.damageValue = requireElement(this.root, '[data-hud="damage-value"]');
    this.driftFill = requireElement(this.root, '[data-hud="drift-fill"]');
    this.driftValue = requireElement(this.root, '[data-hud="drift-value"]');
    this.galactic = requireElement(this.root, '[data-hud="galactic"]');
    this.primarySlot = requireElement(this.root, '[data-hud="system-primary"]');
    this.shieldSlot = requireElement(this.root, '[data-hud="system-shield"]');
    this.mineSlot = requireElement(this.root, '[data-hud="system-mine"]');
    this.redlineInstrument = requireElement(this.root, '[data-hud="redline-instrument"]');
    this.contextAction = requireElement(this.root, '[data-hud="context-action"]');
    this.shieldFill = requireElement(this.root, '[data-hud="shield-fill"]');
    this.shieldValue = requireElement(this.root, '[data-hud="shield-value"]');
    this.weaponName = requireElement(this.root, '[data-hud="weapon-name"]');
    this.weaponFill = requireElement(this.root, '[data-hud="weapon-fill"]');
    this.weaponValue = requireElement(this.root, '[data-hud="weapon-value"]');
    this.weaponTarget = requireElement(this.root, '[data-hud="weapon-target"]');
    this.mineCount = requireElement(this.root, '[data-hud="mine-count"]');
    this.mineLabel = requireElement(this.root, '[data-hud="mine-label"]');
    this.redlineFill = requireElement(this.root, '[data-hud="redline-fill"]');
    this.redlineValue = requireElement(this.root, '[data-hud="redline-value"]');
    this.upgradeList = requireElement(this.root, '[data-hud="upgrade-list"]');
    this.countdown = requireElement(this.root, '[data-hud="countdown"]');
    this.launch = requireElement(this.root, '[data-hud="launch"]');
    this.launchLabel = requireElement(this.root, '[data-hud="launch-label"]');
    this.launchValue = requireElement(this.root, '[data-hud="launch-value"]');
    this.launchSweetSpot = requireElement(this.root, '[data-hud="launch-sweet"]');
    this.launchNeedle = requireElement(this.root, '[data-hud="launch-needle"]');
    this.launchHeat = requireElement(this.root, '[data-hud="launch-heat"]');
    this.raceModeStatus = requireElement(this.root, '[data-hud="race-mode-status"]');
    this.raceModeName = requireElement(this.root, '[data-hud="race-mode-name"]');
    this.raceModeObjective = requireElement(this.root, '[data-hud="race-mode-objective"]');
    this.raceModeScoreLabel = requireElement(this.root, '[data-hud="race-mode-score-label"]');
    this.raceModeScoreValue = requireElement(this.root, '[data-hud="race-mode-score-value"]');
    this.raceModeProgress = requireElement(this.root, '[data-hud="race-mode-progress"]');
    this.pause = requireElement(this.root, '[data-hud="pause"]');
    this.settingsPanel = requireElement(this.root, '[data-hud="settings"]');
    this.settingsBindings = requireElement(this.root, '[data-hud="settings-bindings"]');
    this.settingsCapture = requireElement(this.root, '[data-hud="settings-capture"]');
    this.results = requireElement(this.root, '[data-hud="results"]');
    this.resultTitle = requireElement(this.root, '[data-hud="result-title"]');
    this.resultCallout = requireElement(this.root, '[data-hud="result-callout"]');
    this.resultList = requireElement(this.root, '[data-hud="result-list"]');
    this.resultHighlight = requireElement(this.root, '[data-hud="result-highlight"]');
    this.resultMoments = requireElement(this.root, '[data-hud="result-moments"]');
    this.vehicleSelection = requireElement(this.root, '[data-hud="vehicle-selection"]');
    this.vehicleCards = requireElement(this.root, '[data-hud="vehicle-cards"]');
    this.startPrompt = requireElement(this.root, '[data-hud="start-prompt"]');
    this.raceModeSelect = requireElement(this.root, '[data-hud="race-mode-select"]');
    this.workshopPanel = requireElement(this.root, '[data-hud="workshop"]');
    this.workshopSlots = requireElement(this.root, '[data-hud="workshop-slots"]');
    this.workshopParts = requireElement(this.root, '[data-hud="workshop-parts"]');
    this.workshopBonuses = requireElement(this.root, '[data-hud="workshop-bonuses"]');
    this.workshopPenalties = requireElement(this.root, '[data-hud="workshop-penalties"]');
    this.workshopSynergies = requireElement(this.root, '[data-hud="workshop-synergies"]');
    this.workshopToggle = requireElement(this.root, '.pod-hud__workshop-toggle');
    this.roomPanel = requireElement(this.root, '[data-hud="room-panel"]');
    this.roomCodeInput = requireElement(this.root, '[data-hud="room-code-input"]');
    this.roomCodeInput.addEventListener('input', this.handleRoomCodeInput);
    this.roomCodeInput.addEventListener('paste', this.handleRoomCodePaste);
    this.roomMemberCount = requireElement(this.root, '[data-hud="room-member-count"]');
    this.roomMemberList = requireElement(this.root, '[data-hud="room-member-list"]');
    this.roomStatus = requireElement(this.root, '[data-hud="room-status"]');
    this.createRoomButton = requireElement(this.root, '[data-action="create-room"]');
    this.joinRoomButton = requireElement(this.root, '[data-action="join-room"]');
    this.copyRoomButton = requireElement(this.root, '[data-action="copy-room"]');
    this.leaveRoomButton = requireElement(this.root, '[data-action="leave-room"]');
    this.vehiclePreviews = new VehicleCardPreviewRenderer({
      root: this.root, limits: { maxWidth: 1200, maxHeight: 600 }, library: options.vehicleArtLibrary,
      onAppearanceStatusChange: () => this.updateAppearanceStatus(),
    });
    this.courseMarkers = requireElement(this.root, '[data-hud="course-progress-markers"]');
    this.courseCorner = requireElement(this.root, '[data-hud="course-corner"]');
    this.minimap = new MinimapCanvas(requireElement<HTMLCanvasElement>(this.root, '[data-hud="minimap"]'));
    this.root.addEventListener('click', this.handleActionClick);
    this.root.addEventListener('change', this.handleControlChange);
    this.root.addEventListener('input', this.handleControlInput);
    this.root.addEventListener('keydown', this.handleInterfaceKey);
    const inspection = requireElement<HTMLElement>(this.root, '[data-hud="garage-model"]');
    this.vehicleSelection.addEventListener('toggle', this.handleSetupDrawerToggle, true);
    inspection.addEventListener('pointerdown', this.handleInspectionStart);
    inspection.addEventListener('pointermove', this.handleInspectionMove);
    inspection.addEventListener('pointerup', this.handleInspectionEnd);
    inspection.addEventListener('pointercancel', this.handleInspectionEnd);
    inspection.addEventListener('lostpointercapture', this.handleInspectionEnd);
  }

  update(model: RaceHudViewModel): void {
    this.root.dataset.phase = model.phase;
    this.root.classList.toggle('has-context-danger', model.wrongWay || model.galactic?.wreckPhase != null);
    this.root.classList.toggle('has-wreck-state', model.galactic?.wreckPhase != null);
    this.root.classList.toggle('has-ordinary-circuit', model.raceModeStatus?.mode === 'circuit' && model.raceTime > 7);
    this.updateVehicleSelection(model.preRace);
    const selectorActive = model.preRace?.active === true;
    this.root.classList.toggle('has-launch-cue', model.phase === 'countdown' && model.launch?.stage === 'charging' && !selectorActive);
    this.updateSettings(model.settings);
    const session = createSessionHudViewModel(model);
    this.pause.dataset.session = session.solo ? 'solo' : 'online';
    write(requireElement(this.pause, '[data-hud="paused-event"]'), session.eventTitle);
    write(requireElement(this.pause, '[data-hud="pause-navigation-hint"]'), session.pauseHint);
    for (const button of this.pause.querySelectorAll<HTMLButtonElement>('[data-solo-pause]')) {
      button.hidden = !session.canRestart;
      button.disabled = !session.canRestart;
    }
    this.updatePerfectLaunch(model.phase === 'countdown' ? model.launch : undefined, selectorActive);
    this.updateRaceModeStatus(model.raceModeStatus, model.phase, selectorActive);
    write(this.lap, String(Math.max(1, Math.floor(model.lap))));
    write(this.lapTotal, String(Math.max(1, Math.floor(model.totalLaps))));
    write(this.position, String(Math.max(1, Math.floor(model.position))));
    write(this.racerCount, String(Math.max(1, Math.floor(model.racerCount))));
    write(this.clock, formatRaceTimeHundredths(model.raceTime));
    write(this.speed, formatSpeed(model.speedMps));
    this.speedRing.style.setProperty('--pod-speed-angle', `${Math.round(Math.min(1, Math.max(0, model.normalizedSpeed)) * 268)}deg`);
    this.speedRing.style.setProperty('--pod-speed-ratio', String(Math.min(1, Math.max(0, model.normalizedSpeed))));
    write(requireElement(this.root, '[data-hud="record-target"]'), model.mastery?.bestTime != null ? `PERSONAL BEST  ${formatRaceTimeHundredths(model.mastery.bestTime)}` : '');

    const delta = formatSplitDelta(model.splitDelta);
    const splitText = model.splitDelta === null && model.lastSplit !== null
      ? `SPLIT ${formatRaceTime(model.lastSplit)}`
      : delta;
    write(this.split, splitText);
    this.split.hidden = splitText === '—' || splitText === '';
    this.split.classList.toggle('is-slow', model.splitDelta !== null && model.splitDelta > 0);

    write(this.cornerArrow, cornerGlyph(model.corner.direction, model.corner.severity));
    write(this.cornerDistance, `${Math.round(Math.max(0, model.corner.distance))} M`);
    write(this.cornerTag, model.corner.label ?? model.corner.direction);
    this.cornerArrow.dataset.direction = model.corner.direction;
    this.cornerArrow.style.transform = `skewX(-5deg) scale(${(0.92 + model.corner.severity * 0.16).toFixed(3)})`;

    this.updateMeter(this.boostFill, this.boostValue, model.boost);
    const abilityPanel = requireElement<HTMLElement>(this.root, '[data-hud="pod-ability"]');
    abilityPanel.hidden = model.phase !== 'racing' || !model.ability || model.ability.unavailable;
    if (model.ability) {
      requireElement(abilityPanel, '[data-hud="ability-name"]').textContent = model.ability.label;
      requireElement(abilityPanel, '[data-hud="ability-state"]').textContent = model.ability.windup ? 'ARMING' : model.ability.active ? 'ACTIVE' : model.ability.cooldown > 0 ? `${Math.ceil(model.ability.cooldown)}s` : model.ability.blocked ?? 'READY';
      abilityPanel.title = model.ability.hint;
      abilityPanel.dataset.ready = String(model.ability.cooldown <= 0 && !model.ability.blocked);
    }
    this.updateMeter(this.driftFill, this.driftValue, model.driftCharge);
    const chargeStage = driftStage(model.driftCharge);
    this.driftFill.style.background = `#${DRIFT_COLORS[chargeStage].toString(16).padStart(6, '0')}`;
    this.driftFill.style.boxShadow = chargeStage ? `0 0 12px ${this.driftFill.style.background}` : 'none';
    this.driftValue.textContent = model.driftCharge > .01 ? DRIFT_LABELS[chargeStage] : 'HOLD + STEER';
    this.root.dataset.driftStage = String(chargeStage);
    this.root.classList.toggle('has-drift-charge', model.driftCharge > 0.01);
    // A live slide lights the meter, so the driver can see the drift is holding
    // even before it has banked a boost.
    this.root.classList.toggle('is-drifting', model.driftSlide > 0.15);
    this.root.style.setProperty('--pod-drift-slide', model.driftSlide.toFixed(3));
    this.updateMeter(this.heatFill, this.heatValue, model.heat);
    this.updateMeter(this.damageFill, this.damageValue, model.damage);
    this.speedRing.closest('.pod-hud__speed')?.classList.toggle('is-boosting', model.boostActive);
    this.telemetry.classList.toggle('is-hot', model.heat >= 0.82);
    this.telemetry.classList.toggle('is-damaged', model.damage >= 0.58);
    this.updateGalactic(model);

    this.updateCountdown(model.countdownCue);
    this.updateResults(
      model.results,
      model.phase === 'finished',
      model.position,
      model.resultsPresentation,
    );
    this.updateCourseProgress(model.racers);
    this.minimap.update(model.course, model.racers, model.raceTime, model.courseBranches);
    this.updateMastery(model.mastery, model.phase, selectorActive, session.tutorialVisible);
    this.eventAtlas.update(model.mastery, model.preRace?.lobby.canStart === true);
    if (!selectorActive || !model.mastery) this.setEventAtlasVisible(false);
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.onMuteChange?.(muted);
  }

  updateCombat(frame: CombatHudFrame, localWreckPhase?: HudGalacticWreckPhase | 'running'): void {
    // Authoritative presentation state is refreshed per render, independently
    // of cancellable cues and the four-simulation-frame telemetry cadence.
    if (localWreckPhase !== undefined) {
      this.root.classList.toggle('has-wreck-state', localWreckPhase !== 'running');
    }
    const available = !this.root.classList.contains('has-vehicle-selection') && !this.root.classList.contains('is-paused') && this.root.dataset.phase === 'racing';
    const cue = available ? frame.cue : null;
    const reduced = this.root.classList.contains('is-reduced-motion') || this.systemMotionPreference?.matches;
    // Combat events render every frame; the full telemetry model updates less often.
    // Suppress driving instructions on the wreck's first frame too, including reduced motion.
    this.root.classList.toggle('has-wreck-cue', cue?.kind === 'wreck');
    this.root.classList.toggle('has-cinematic-matte', available && frame.cinematic.active && frame.cinematic.letterbox && !reduced);
  }

  setAssetStatus(message: string | null): void {
    this.root.classList.toggle('has-asset-status', Boolean(message));
    let status = this.root.querySelector<HTMLElement>('[data-hud="asset-status"]');
    if (!status && message) {
      status = this.root.ownerDocument.createElement('div');
      status.dataset.hud = 'asset-status';
      status.className = 'pod-hud__asset-status';
      status.setAttribute('role', 'status');
      this.root.append(status);
    }
    if (status) { status.hidden = !message; status.textContent = message ?? ''; }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setPaused(paused: boolean): void {
    const settingsOpen = this.settingsPanel.classList.contains('is-visible');
    setVisible(this.pause, paused || settingsOpen);
    this.pause.setAttribute('aria-label', settingsOpen ? 'Game settings' : 'Race paused');
    this.root.classList.toggle('is-paused', paused);
  }

  dispose(): void {
    this.eventAtlas.dispose();
    this.root.removeEventListener('keydown', this.handleInterfaceKey);
    this.roomCodeInput.removeEventListener('input', this.handleRoomCodeInput);
    this.roomCodeInput.removeEventListener('paste', this.handleRoomCodePaste);
    this.root.removeEventListener('click', this.handleActionClick);
    this.root.removeEventListener('change', this.handleControlChange);
    this.root.removeEventListener('input', this.handleControlInput);
    const inspection = requireElement<HTMLElement>(this.root, '[data-hud="garage-model"]');
    this.vehicleSelection.removeEventListener('toggle', this.handleSetupDrawerToggle, true);
    inspection.removeEventListener('pointerdown', this.handleInspectionStart);
    inspection.removeEventListener('pointermove', this.handleInspectionMove);
    inspection.removeEventListener('pointerup', this.handleInspectionEnd);
    inspection.removeEventListener('pointercancel', this.handleInspectionEnd);
    inspection.removeEventListener('lostpointercapture', this.handleInspectionEnd);
    this.vehiclePreviews.dispose();
    this.minimap.dispose();
    this.root.remove();
  }

  private readonly handleRoomCodeInput = (): void => {
    const normalized = normalizeRoomCodeEntry(this.roomCodeInput.value);
    if (normalized === this.roomCodeInput.value) return;
    this.roomCodeInput.value = normalized;
    this.roomCodeInput.setSelectionRange(normalized.length, normalized.length);
  };

  private readonly handleRoomCodePaste = (event: ClipboardEvent): void => {
    if (this.roomCodeInput.readOnly) return;
    const pasted = event.clipboardData?.getData('text');
    if (!pasted) return;
    event.preventDefault();
    const normalized = normalizeRoomCodeEntry(pasted);
    this.roomCodeInput.value = normalized;
    this.roomCodeInput.setSelectionRange(normalized.length, normalized.length);
    this.roomCodeInput.dispatchEvent(new Event('input', { bubbles: true }));
  };

  private emitAction(action: RaceHudAction): void {
    if (action.type === 'start-race' || action.type === 'retry-race' || action.type === 'resume-race') {
      const focused = this.root.ownerDocument.activeElement;
      if (focused instanceof HTMLElement && this.root.contains(focused)) focused.blur();
    }
    this.onAction?.(action);
    this.root.dispatchEvent(new CustomEvent<RaceHudAction>('pod-hud-action', {
      detail: action,
    }));
  }

  private createPodRoster(pods: readonly typeof SETUP_PODS[number][]): string {
    return pods.map(pod => `<button class="setup-racer" type="button" data-action="select-appearance" data-appearance="${pod}" aria-label="${ART_APPEARANCES[pod].label}" aria-pressed="false">
      <span class="setup-racer-art"><img src="/assets/inkstorm/home/pod-${pod}.webp" alt="" width="400" height="250" draggable="false"><span class="setup-racer-check" aria-hidden="true">✓</span></span>
      <strong>${ART_APPEARANCES[pod].label}</strong>
    </button>`).join('');
  }

  private closeSetupDrawers(restoreFocus = false): void {
    for (const drawer of this.vehicleSelection.querySelectorAll<HTMLDetailsElement>('.setup-drawer[open]')) {
      drawer.open = false;
      if (restoreFocus) drawer.querySelector('summary')?.focus();
    }
  }

  private readonly handleSetupDrawerToggle = (event: Event): void => {
    const drawer = event.target;
    if (!(drawer instanceof HTMLDetailsElement) || !drawer.matches('.setup-drawer') || !drawer.open) return;
    for (const other of this.vehicleSelection.querySelectorAll<HTMLDetailsElement>('.setup-drawer[open]')) {
      if (other !== drawer) other.open = false;
    }
  };

  private readonly handleInterfaceKey = (event: KeyboardEvent): void => {
    if (!(event.target instanceof Element)) return;
    if (event.target.matches('[data-hud="garage-model"]') && /^(ArrowLeft|ArrowRight|Home)$/.test(event.code)) {
      event.preventDefault(); event.stopPropagation();
      this.inspectPod(event.code === 'Home' ? 0 : this.inspectionAngle + (event.code === 'ArrowLeft' ? -15 : 15));
      return;
    }
    if (event.code === 'Escape' && this.vehicleSelection.querySelector('.setup-drawer[open]')) {
      this.closeSetupDrawers(true);
      event.preventDefault(); event.stopPropagation(); return;
    }
    // Native button/summary activation must not also trigger garage launch or steering.
    if (!event.target.closest('button,summary')) return;
    if (event.target.closest('.simple-setup') && event.code.startsWith('Arrow')) event.stopPropagation();
    const activatesControl = event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter';
    const workshopNavigation = this.root.classList.contains('has-workshop') && /^(Arrow|Digit|Key[ADV])/.test(event.code);
    if (activatesControl || workshopNavigation) event.stopPropagation();
  };

  private inspectPod(angle: number): void {
    if (!this.vehicleSelectionModel?.active) return;
    this.inspectionAngle = ((angle % 360) + 360) % 360;
    this.vehiclePreviews.setInspectionAngle(this.inspectionAngle);
  }

  private readonly handleInspectionStart = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.vehicleSelectionModel?.active) return;
    const host = event.currentTarget as HTMLElement;
    host.focus({ preventScroll: true }); host.setPointerCapture(event.pointerId);
    this.inspectionPointer = { id: event.pointerId, x: event.clientX, angle: this.inspectionAngle };
    host.classList.add('is-inspecting'); event.preventDefault(); event.stopPropagation();
  };

  private readonly handleInspectionMove = (event: PointerEvent): void => {
    const pointer = this.inspectionPointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    this.inspectPod(pointer.angle + (event.clientX - pointer.x) * .45);
    event.preventDefault(); event.stopPropagation();
  };

  private readonly handleInspectionEnd = (event: PointerEvent): void => {
    if (this.inspectionPointer?.id !== event.pointerId) return;
    this.inspectionPointer = null;
    (event.currentTarget as HTMLElement).classList.remove('is-inspecting');
    event.stopPropagation();
  };

  private setEventAtlasVisible(visible: boolean): void {
    if (this.eventAtlasOpen === visible) return;
    this.eventAtlasOpen = visible;
    const frame = requireElement<HTMLElement>(this.vehicleSelection, '.pod-hud__vehicle-select-frame');
    frame.inert = visible;
    if (visible) this.vehicleSelection.scrollTop = 0;
    this.eventAtlas.setVisible(visible);
    this.root.classList.toggle('has-event-atlas', visible);
    requireElement(this.root, '[data-action="open-event-atlas"]').setAttribute('aria-expanded', String(visible));
  }

  private readonly handleActionClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLElement>('[data-action]');
    const action = trigger?.dataset.action;
    if (!trigger || !action) return;
    if (trigger instanceof HTMLButtonElement && trigger.disabled) return;

    if (action === 'open-event-atlas') {
      this.closeSetupDrawers();
      if (this.vehicleSelectionModel?.active) this.setEventAtlasVisible(true);
    } else if (action === 'close-event-atlas') {
      this.setEventAtlasVisible(false);
    } else if (action === 'launch-atlas-event') {
      this.setEventAtlasVisible(false);
      this.emitAction({ type: 'start-race' });
    } else if (action === 'close-setup-drawer') {
      this.closeSetupDrawers(true);
    } else if (action === 'select-appearance') {
      if (isVehicleAppearanceId(trigger.dataset.appearance)) this.emitAction({ type: 'select-appearance', appearance: trigger.dataset.appearance });
    } else if (action === 'retry-appearance') {
      void this.vehiclePreviews.retryAppearance();
      this.emitAction({ type: 'retry-appearance' });
    } else if (action === 'start-race' || action === 'retry-race' || action === 'return-to-garage') {
      this.setEventAtlasVisible(false);
      if (!(trigger instanceof HTMLButtonElement) || !trigger.disabled) this.emitAction({ type: action });
    } else if (action === 'select-event' || action === 'select-atlas-event') {
      if (trigger.dataset.eventId) this.emitAction({ type: 'select-event', eventId: trigger.dataset.eventId });
      this.closeSetupDrawers(Boolean(trigger.dataset.destination));
    } else if (action === 'toggle-ghost' || action === 'save-course' || action === 'next-event' || action === 'restart-championship') {
      this.emitAction({ type: action });
    } else if (action === 'step-pod') {
      const current = this.vehicleSelectionModel?.appearance?.selected;
      this.emitAction({ type: 'select-appearance', appearance: nextSetupPod(current, Number(trigger.dataset.direction)) });
    } else if (action === 'inspect-vehicle') {
      this.inspectPod(this.inspectionAngle + (Number(trigger.dataset.direction) < 0 ? -30 : 30));
    } else if (action === 'toggle-hud-detail') {
      const open = this.root.classList.toggle('has-hud-detail');
      trigger.setAttribute('aria-pressed', String(open));
      trigger.textContent = open ? 'MAP −' : 'MAP +';
    } else if (action === 'select-ai-difficulty') {
      const difficulty = trigger.dataset.difficulty as HudAiDifficulty | undefined;
      if (difficulty && HUD_AI_DIFFICULTIES.includes(difficulty)) {
        this.emitAction({ type: 'select-ai-difficulty', difficulty });
      }
    } else if (action === 'open-workshop') {
      this.closeSetupDrawers();
      this.setEventAtlasVisible(false);
      this.emitAction({ type: 'toggle-workshop', open: true });
    } else if (action === 'toggle-workshop') {
      this.emitAction({ type: 'toggle-workshop', open: !this.workshopPanel.classList.contains('is-visible') });
    } else if (action === 'select-workshop-slot') {
      const slot = trigger.dataset.slot as HudWorkshopSlot | undefined;
      if (slot && HUD_WORKSHOP_SLOTS.includes(slot)) {
        this.emitAction({ type: 'select-workshop-slot', slot });
      }
    } else if (action === 'equip-workshop-part') {
      const slot = trigger.dataset.slot as HudWorkshopSlot | undefined;
      const partId = trigger.dataset.partId;
      if (slot && partId && HUD_WORKSHOP_SLOTS.includes(slot)) {
        this.emitAction({ type: 'equip-workshop-part', slot, partId });
      }
    } else if (action === 'resume-race') {
      this.emitAction({ type: 'resume-race' });
    } else if (action === 'toggle-settings') {
      this.closeSetupDrawers();
      this.emitAction({ type: 'toggle-settings', open: !this.settingsPanel.classList.contains('is-visible') });
    } else if (action === 'select-settings-tab') {
      const tab = trigger.dataset.settingsTab as HudSettingsTab | undefined;
      if (tab && HUD_SETTINGS_TABS.includes(tab)) this.emitAction({ type: 'select-settings-tab', tab });
    } else if (action === 'request-remap') {
      const bindingAction = trigger.dataset.bindingAction;
      const device = trigger.dataset.bindingDevice;
      if (bindingAction && (device === 'keyboard' || device === 'gamepad')) {
        this.emitAction({ type: 'request-remap', action: bindingAction, device });
      }
    } else if (action === 'view-highlight') {
      const highlightId = trigger.dataset.highlightId;
      if (highlightId) this.emitAction({ type: 'view-highlight', highlightId });
    }
  };

  private readonly handleControlChange = (event: Event): void => {
    const target = event.target;
    if (target === this.raceModeSelect) {
      const mode = this.raceModeSelect.value as HudRaceMode;
      if (HUD_RACE_MODES.some((entry) => entry.id === mode)) {
        this.emitAction({ type: 'select-race-mode', mode });
      }
      return;
    }
    if (!(target instanceof HTMLInputElement) || !target.dataset.setting) return;
    if (target.type === 'checkbox') {
      this.emitAction({
        type: 'change-setting',
        setting: target.dataset.setting as HudSettingPath,
        value: target.checked,
      });
    }
  };

  private readonly handleControlInput = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'range' || !target.dataset.setting) return;
    const value = Number(target.value);
    if (Number.isFinite(value)) {
      this.emitAction({ type: 'change-setting', setting: target.dataset.setting as HudSettingPath, value });
      const output = this.root.querySelector<HTMLOutputElement>(`[data-setting-output="${target.dataset.setting}"]`);
      if (output) write(output, `${Math.round(value * 100)}%`);
    }
  };

  private updateMeter(fill: HTMLElement, value: HTMLElement, amount: number): void {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0));
    fill.style.width = `${(clamped * 100).toFixed(1)}%`;
    fill.style.setProperty('--pod-meter-value', `${(clamped * 100).toFixed(1)}%`);
    write(value, String(Math.round(clamped * 100)));
  }

  private setSystemReadiness(slot: HTMLElement, amount: number): void {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(amount) ? amount : 0));
    slot.style.setProperty('--pod-readiness-angle', `${(clamped * 360).toFixed(1)}deg`);
    slot.dataset.ready = String(clamped >= 0.995);
  }

  private updateVehicleSelection(selection: HudPreRaceViewModel | undefined): void {
    this.vehicleSelectionModel = selection;
    const visible = selection?.active === true;
    this.root.classList.toggle('has-vehicle-selection', visible);
    setVisible(this.vehicleSelection, visible);
    if (!visible || !selection) {
      setVisible(this.workshopPanel, false);
      this.root.classList.remove('has-workshop');
      this.vehiclePreviews.hide();
      return;
    }

    const selectedCard = selection.cards.find((card) => card.id === selection.selectedVehicleClass);
    const appearance = selection.appearance?.selected ?? 'procedural';
    this.vehiclePreviews.setAppearance(appearance);
    const appearanceControls = requireElement<HTMLElement>(this.root, '[data-hud="appearance"]');
    appearanceControls.hidden = selection.selectedVehicleClass !== 'podracer';
    for (const button of this.vehicleSelection.querySelectorAll<HTMLButtonElement>('[data-action="select-appearance"]')) {
      button.setAttribute('aria-pressed', String(button.dataset.appearance === appearance));
      button.disabled = selection.lobby.status === 'connecting';
    }
    this.updateAppearanceStatus();
    const selectedLabel = ART_APPEARANCES[appearance].label;
    const hero = requireElement<HTMLElement>(this.root, '[data-hud="garage-model"]');
    const vehicleKey = `${selection.selectedVehicleClass}:${appearance}`;
    const heroChanged = this.garageVehicleKey !== vehicleKey;
    if (heroChanged && selectedCard) {
      this.garageVehicleKey = vehicleKey;
      this.inspectionAngle = 0;
      hero.dataset.previewAngle = '0';
      if (!this.root.classList.contains('is-reduced-motion') && !this.systemMotionPreference?.matches) {
        hero.getAnimations?.().forEach(animation => animation.cancel());
        hero.animate?.([{ opacity: 0.3, transform: 'translateY(10px) scale(.97)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 300, easing: 'ease-out' });
      }
      write(requireElement(this.root, '[data-hud="setup-pod-index"]'), `${String(Math.max(0, SETUP_PODS.indexOf(appearance as typeof SETUP_PODS[number])) + 1).padStart(2, '0')} / ${String(SETUP_PODS.length).padStart(2, '0')}`);
      hero.dataset.vehicleId = selection.selectedVehicleClass;
      const garageName = selection.selectedVehicleClass === 'podracer' && appearance !== 'procedural' ? selectedLabel : selectedCard.name;
      // A registered pod presents its own identity: role, one-line handling
      // promise and the four ratings that describe how it actually drives.
      const identity = selection.selectedVehicleClass === 'podracer' && appearance !== 'procedural'
        ? selection.appearance?.identity : undefined;
      hero.setAttribute('aria-label', `Inspect ${garageName}`);
      write(requireElement(this.root, '[data-hud="garage-name"]'), garageName);
      write(requireElement(this.root, '[data-hud="garage-description"]'), identity?.tagline ?? selectedCard.description);
      write(requireElement(this.root, '[data-hud="garage-class"]'), identity
        ? `${String(Math.max(0, SETUP_PODS.indexOf(appearance as typeof SETUP_PODS[number])) + 1).padStart(2, '0')} / ${identity.roleLabel.toUpperCase()}`
        : `${String(selection.cards.indexOf(selectedCard) + 1).padStart(2, '0')} / ${['TWIN ENGINE', 'HEAVY REPULSOR', 'AGILITY FRAME', 'SKIM RUNNER'][selection.cards.indexOf(selectedCard)] ?? 'RACE MACHINE'}`);
      const stats = requireElement(this.root, '[data-hud="garage-stats"]');
      stats.replaceChildren(...(identity?.stats ?? selectedCard.stats).map((stat) => {
        const row = this.root.ownerDocument.createElement('div');
        row.innerHTML = '<span></span><i></i><b></b>';
        write(requireElement(row, 'span'), stat.label);
        write(requireElement(row, 'b'), String(stat.value));
        requireElement<HTMLElement>(row, 'i').style.setProperty('--rating', `${stat.value * 20}%`);
        row.setAttribute('aria-label', `${stat.label}: ${stat.value} of 5`);
        return row;
      }));
    }

    const key = selection.cards.map((card) => [
      card.id,
      card.name,
      card.description,
      card.accent,
      ...card.stats.map((stat) => `${stat.label}:${stat.value}`),
    ].join(':')).join('|');
    const cardsChanged = key !== this.vehicleCardsKey;
    if (cardsChanged) {
      this.vehicleCardsKey = key;
      this.vehicleCards.replaceChildren(...selection.cards.map((card, index) =>
        this.createVehicleCard(card, index + 1),
      ));
    }
    for (const card of this.vehicleCards.querySelectorAll<HTMLElement>('.pod-hud__vehicle-card[data-vehicle-id]')) {
      const selected = card.dataset.vehicleId === selection.selectedVehicleClass;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-selected', String(selected));
    }
    for (const button of this.vehicleSelection.querySelectorAll<HTMLButtonElement>('[data-action="select-laps"][data-laps]')) {
      const selected = Number(button.dataset.laps) === selection.selectedLaps;
      const locked = selection.fixedRules === true || selection.lobby.role === 'guest' || selection.lobby.status === 'connecting';
      button.classList.toggle('is-selected', selected);
      button.disabled = locked;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-disabled', String(locked));
    }
    this.root.classList.toggle('has-fixed-event', selection.fixedRules === true);
    requireElement<HTMLElement>(this.root, '.setup-options').hidden = selection.fixedRules === true;
    write(requireElement(this.root, '[data-hud="setup-rule-summary"]'), selection.lobby.role === 'guest' ? 'The host chooses the destination and race rules.' : selection.fixedRules ? 'This event has fixed rules. Every racer starts on equal terms.' : 'Set the pace. Pick your rivals and race length.');
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-action="step-pod"]')) button.disabled = selection.lobby.status === 'connecting';
    write(requireElement(this.root, '[data-hud="event-launch-title"]'), `${selection.selectedLaps} LAP${selection.selectedLaps === 1 ? '' : 'S'} · STOCK MACHINERY`);
    const setupLocked = selection.fixedRules === true || selection.lobby.role === 'guest' || selection.lobby.status === 'connecting';
    for (const button of this.vehicleSelection.querySelectorAll<HTMLButtonElement>('[data-action="select-ai-difficulty"]')) {
      const selected = button.dataset.difficulty === selection.aiDifficulty;
      button.classList.toggle('is-selected', selected);
      button.disabled = setupLocked;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-disabled', String(setupLocked));
    }
    if (this.raceModeSelect.value !== selection.raceMode) this.raceModeSelect.value = selection.raceMode;
    this.raceModeSelect.disabled = setupLocked;
    this.raceModeSelect.setAttribute('aria-disabled', String(setupLocked));
    this.workshopToggle.disabled = selection.stockBuild === true || selection.fixedRules === true || selection.workshop === undefined;
    this.workshopToggle.title = selection.stockBuild || selection.fixedRules ? 'Stock workshop parts are fixed for this event' : 'Tune the five parts in your build';
    const buildButton = requireElement<HTMLButtonElement>(this.root, '[data-action="open-workshop"]');
    buildButton.disabled = this.workshopToggle.disabled;
    buildButton.hidden = this.workshopToggle.disabled;
    buildButton.title = this.workshopToggle.title;
    buildButton.setAttribute('aria-expanded', String(selection.workshop?.open === true));
    const setupHeading = this.vehicleSelection.querySelector('.pod-hud__selector-setup .pod-hud__selector-section-head strong');
    if (setupHeading) write(setupHeading, selection.fixedRules ? 'Event rules · fixed' : 'Race setup');
    this.workshopToggle.setAttribute('aria-expanded', String(selection.workshop?.open === true));
    this.updateWorkshop(selection.workshop);
    this.updateLobby(selection.lobby);
    this.vehiclePreviews.setSelected(selection.selectedVehicleClass);
    if (!this.vehiclePreviews.visible) {
      // The preview renderer commits all four decoded images atomically. A
      // failed auxiliary context must never prevent the selector itself from
      // remaining usable on a browser with WebGL already under pressure.
      void this.vehiclePreviews.show().catch(() => {
        this.root.dataset.vehiclePreviewState = 'unavailable';
      });
    } else if (cardsChanged || heroChanged) {
      void this.vehiclePreviews.refresh().catch(() => {
        this.root.dataset.vehiclePreviewState = 'unavailable';
      });
    }
  }

  /** Preview completion must also update a garage whose simulation is paused. */
  private updateAppearanceStatus(): void {
    const selection = this.vehicleSelectionModel;
    if (!selection?.active) return;
    const appearance = selection.appearance?.selected ?? 'procedural';
    const loading = appearance !== 'procedural' && (selection.appearance?.status === 'loading' || this.vehiclePreviews.appearanceStatus === 'loading');
    const failed = appearance !== 'procedural' && (selection.appearance?.status === 'error' || this.vehiclePreviews.appearanceStatus === 'error');
    const activeAppearance = selection.appearance?.active ?? 'procedural';
    const selectedLabel = ART_APPEARANCES[appearance].label, activeLabel = ART_APPEARANCES[activeAppearance].label;
    const identity = selection.appearance?.identity;
    write(requireElement(this.root, '[data-hud="appearance-status"]'), failed
      ? activeAppearance === appearance ? `Preview unavailable. ${activeLabel} remains ready to race.` : `${selectedLabel} unavailable. ${activeLabel} remains ready to race.`
      : loading ? activeAppearance === appearance ? `Preparing ${selectedLabel} preview… Your race craft is ready.` : `Loading ${selectedLabel}… ${activeLabel} is ready to race.`
        : appearance !== 'procedural'
          ? identity ? `${selectedLabel} · ${identity.roleLabel} · best on ${identity.bestOn}` : `${selectedLabel} · seated pilot · twin engines`
          : 'Classic · original racing frame');
    requireElement<HTMLButtonElement>(this.root, '[data-action="retry-appearance"]').hidden = !failed;
    const statusHost = this.root.querySelector<HTMLElement>('.setup-preview-status');
    if (statusHost) statusHost.hidden = !failed && !loading;
  }

  private updateWorkshop(workshop: HudWorkshopViewModel | undefined): void {
    const open = workshop?.open === true;
    setVisible(this.workshopPanel, open);
    this.root.classList.toggle('has-workshop', open);
    this.workshopToggle.setAttribute('aria-expanded', String(open));
    if (!workshop) return;

    const key = JSON.stringify(workshop);
    if (key === this.workshopKey) return;
    this.workshopKey = key;
    this.workshopPanel.dataset.activeSlot = workshop.activeSlot;
    const active = this.root.ownerDocument.activeElement as HTMLElement | null;
    const focusedControl = open && active && this.workshopPanel.contains(active)
      && (active.dataset.action === 'select-workshop-slot' || active.dataset.action === 'equip-workshop-part')
      ? { action: active.dataset.action, slot: active.dataset.slot, partId: active.dataset.partId }
      : null;

    this.workshopSlots.replaceChildren(...workshop.slots.map((slot) => {
      const button = this.root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'pod-hud__workshop-slot';
      button.classList.toggle('is-selected', slot.slot === workshop.activeSlot);
      button.dataset.action = 'select-workshop-slot';
      button.dataset.slot = slot.slot;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(slot.slot === workshop.activeSlot));
      button.setAttribute('aria-label', `${slot.label}: ${slot.equippedPartName}. ${slot.effect}`);
      button.innerHTML = workshopSymbol(slot.slot) + '<span></span><strong></strong><small></small>';
      write(requireElement(button, 'span'), slot.label);
      write(requireElement(button, 'strong'), slot.equippedPartName);
      write(requireElement(button, 'small'), slot.effect);
      return button;
    }));

    const parts = workshop.parts.filter((part) => part.slot === workshop.activeSlot);
    this.workshopParts.replaceChildren(...parts.map((part) => {
      const button = this.root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'pod-hud__workshop-part';
      button.classList.toggle('is-equipped', part.equipped);
      button.dataset.action = 'equip-workshop-part';
      button.dataset.slot = part.slot;
      button.dataset.partId = part.id;
      button.setAttribute('aria-pressed', String(part.equipped));
      button.innerHTML = workshopSymbol(part.slot, part.id) + '<strong></strong><p></p><span class="is-benefit"></span><span class="is-tradeoff"></span><small class="pod-hud__part-comparison"></small><b class="pod-hud__equip-action"></b>';
      write(requireElement(button, 'strong'), part.name);
      const description = requireElement<HTMLElement>(button, 'p');
      description.id = `workshop-description-${part.id}`;
      button.setAttribute('aria-describedby', description.id);
      write(description, part.description);
      write(requireElement(button, '.is-benefit'), part.benefit);
      write(requireElement(button, '.is-tradeoff'), part.tradeoff);
      const signedPercent = (value: number) => `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;
      write(requireElement(button, '.pod-hud__part-comparison'), part.comparison?.length
        ? part.comparison.map((delta) => `${delta.label}: ${signedPercent(delta.current)} → ${signedPercent(delta.candidate)}`).join(' · ')
        : 'Current configuration');
      write(requireElement(button, '.pod-hud__equip-action'), part.equipped ? '✓ EQUIPPED' : 'EQUIP PART ↗');
      return button;
    }));

    const totalRoot = requireElement<HTMLElement>(this.root, '[data-hud="workshop-totals"]');
    // Group display readings without changing the real totals or their signed meter bindings.
    const totals = workshop.summary.totals ?? [];
    const totalGroups = [
      { label: 'Drive', labels: ['top speed', 'acceleration', 'boost', 'cooling'] },
      { label: 'Chassis', labels: ['handling', 'drift', 'armour', 'shield'] },
      { label: 'Combat', labels: ['weapon power', 'mine capacity'] },
    ];
    const knownLabels = new Set(totalGroups.flatMap(group => group.labels));
    const groupedTotals = totalGroups.map(group => ({
      label: group.label,
      totals: group.labels.flatMap(label => totals.filter(total => total.label === label)),
    }));
    groupedTotals.push({ label: 'Other', totals: totals.filter(total => !knownLabels.has(total.label)) });
    totalRoot.replaceChildren(...groupedTotals.flatMap(group => group.totals.map((total, index) => {
      const row = this.root.ownerDocument.createElement('li');
      row.dataset.totalGroup = group.label;
      row.innerHTML = '<span class="pod-hud__total-label"></span><b></b><i class="pod-hud__build-meter" aria-hidden="true"><i></i></i>';
      if (index === 0) {
        const heading = this.root.ownerDocument.createElement('span');
        heading.className = 'pod-hud__total-group';
        heading.textContent = group.label;
        row.prepend(heading);
      }
      write(requireElement(row, '.pod-hud__total-label'), total.label);
      write(requireElement(row, 'b'), `${total.value > 0 ? '+' : ''}${Math.round(total.value * 100)}%`);
      row.classList.toggle('is-negative', total.value < 0);
      row.style.setProperty('--build-delta', `${Math.min(0.5, Math.abs(total.value)) * 100}%`);
      return row;
    })));
    this.replaceSummaryList(this.workshopBonuses, workshop.summary.bonuses, 'Balanced output');
    this.replaceSummaryList(this.workshopPenalties, workshop.summary.penalties, 'No major penalty');
    this.replaceSummaryList(this.workshopSynergies, workshop.summary.synergies, 'No active synergy');
    // Rebuilding comparison cards must not drop keyboard focus onto the page
    // when a racer equips a part or switches systems.
    if (focusedControl) {
      const replacement = [...this.workshopPanel.querySelectorAll<HTMLButtonElement>('button[data-action]')]
        .find(button => button.dataset.action === focusedControl.action
          && button.dataset.slot === focusedControl.slot && button.dataset.partId === focusedControl.partId);
      replacement?.focus({ preventScroll: true });
    }
  }

  private replaceSummaryList(root: HTMLElement, values: readonly string[], emptyLabel: string): void {
    const items = values.length > 0 ? values : [emptyLabel];
    root.replaceChildren(...items.map((value) => {
      const item = this.root.ownerDocument.createElement('li');
      item.textContent = value;
      return item;
    }));
  }

  private updateMastery(mastery: HudMasteryViewModel | undefined, phase: RaceHudViewModel['phase'], preRace: boolean, tutorialVisible: boolean): void {
    this.root.classList.toggle('has-mastery', Boolean(mastery));
    requireElement<HTMLElement>(this.root, '[data-hud="mastery"]').hidden = !mastery;
    const controls = requireElement<HTMLElement>(this.root, '[data-hud="mastery-controls"]');
    controls.hidden = !mastery;
    const tutorial = requireElement<HTMLElement>(this.root, '[data-hud="tutorial"]');
    tutorial.hidden = !tutorialVisible;
    const cup = requireElement<HTMLElement>(this.root, '[data-hud="cup-context"]');
    const cupComplete = mastery?.championshipRound === CHAMPIONSHIP_EVENT_IDS.length;
    cup.hidden = !mastery?.championshipContext && !cupComplete;
    if (!mastery) {
      write(requireElement(this.root, '[data-hud="event-launch-detail"]'), 'Shared room rules. Race settings and builds are locked when the host launches.');
      requireElement<HTMLElement>(this.root, '[data-hud="mastery-result"]').hidden = true;
      this.results.querySelector('[data-action="next-event"]')?.remove();
      this.results.querySelector('[data-action="restart-championship"]')?.remove();
      this.masteryResultKey = '';
      return;
    }
    const cupContext: HudMasteryViewModel['championshipContext'] = mastery.championshipContext ?? (cupComplete ? {
      title: 'Inkstorm Cup complete',
      detail: 'Your final standings are saved. Race another cup to start four new rounds; your personal records stay.',
    } : undefined);
    let cupReplay = cup.querySelector<HTMLButtonElement>('[data-action="restart-championship"]');
    if (!cupReplay) {
      cupReplay = this.createCupReplayButton();
      cupReplay.className = 'pod-hud__cup-replay';
      cup.append(cupReplay);
    }
    cupReplay.hidden = !cupComplete || !preRace;
    if (cupContext) {
      write(requireElement(cup, 'strong'), cupContext.title);
      write(requireElement(cup, 'p'), cupContext.detail);
      const startButton = requireElement<HTMLButtonElement>(this.root, '[data-hud="start-button"]');
      if (preRace && !startButton.disabled && cupContext.actionLabel) startButton.title = cupContext.actionLabel;
      const standingsKey = JSON.stringify(mastery.championship);
      if (standingsKey !== this.cupStandingsKey) {
        this.cupStandingsKey = standingsKey;
        const leaders = mastery.championship.filter((racer, index) => index < 3 || racer.isPlayer);
        requireElement(cup, '[data-hud="cup-standings"]').replaceChildren(...leaders.map((racer) => {
          const row = this.root.ownerDocument.createElement('span');
          row.classList.toggle('is-player', racer.isPlayer);
          row.textContent = `${racer.name} · ${racer.points} PTS`;
          return row;
        }));
      }
    }
    write(requireElement(this.root, '[data-hud="event-title"]'), mastery.eventTitle);
    write(requireElement(this.root, '[data-hud="event-description"]'), mastery.eventSubtitle);
    write(requireElement(this.root, '[data-hud="event-launch-detail"]'), mastery.eventSubtitle);
    write(requireElement(this.root, '[data-hud="personal-best"]'), mastery.bestTime === null ? '—:——.——' : formatRaceTimeHundredths(mastery.bestTime));
    write(requireElement(this.root, '[data-hud="mastery-objective"]'), mastery.storageWarning
      ?? (mastery.retryTarget ? `Next pursuit: ${mastery.retryTarget.label} · S${mastery.retryTarget.sectorIndex}. Last ${mastery.retryTarget.currentTime.toFixed(2)}s / PB ${mastery.retryTarget.targetTime.toFixed(2)}s. Recover ${mastery.retryTarget.loss.toFixed(2)}s.`
      : mastery.bestTime === null ? 'Complete a clean run to set your first record.' : `${mastery.medal === 'none' ? 'Record saved' : mastery.medal + ' medal'} · Improve the line. Chase your ghost.`));
    const archiveNotice = requireElement<HTMLElement>(this.root, '[data-hud="archive-notice"]');
    archiveNotice.hidden = !mastery.archiveNotice;
    write(archiveNotice, mastery.archiveNotice ?? '');
    const eventsKey = mastery.events.map((event) => `${event.id}:${event.title}:${event.subtitle}`).join('|');
    if (eventsKey !== this.masteryEventsKey) {
      this.masteryEventsKey = eventsKey;
      write(requireElement(this.root, '[data-hud="calendar-title"]'), `RACE CALENDAR · ${mastery.events.length} EVENTS`);
      requireElement(this.root, '[data-hud="event-list"]').replaceChildren(...mastery.events.map((event) => {
        const button = this.root.ownerDocument.createElement('button');
        button.type = 'button';
        button.dataset.action = 'select-event';
        button.dataset.eventId = event.id;
        button.innerHTML = '<strong></strong><small></small>';
        write(requireElement(button, 'strong'), event.title);
        write(requireElement(button, 'small'), event.subtitle);
        return button;
      }));
    }
    let newlySelectedEvent: HTMLButtonElement | null = null;
    for (const event of this.root.querySelectorAll<HTMLButtonElement>('[data-hud="event-list"] [data-action="select-event"]')) {
      const selected = event.dataset.eventId === mastery.eventId;
      if (selected && !event.classList.contains('is-selected')) newlySelectedEvent = event;
      event.classList.toggle('is-selected', selected);
      event.setAttribute('aria-pressed', String(selected));
      event.disabled = this.roomPanel.dataset.role === 'guest';
    }
    // Selecting a Cup can insert standings and expand the selected description.
    // Reveal the entire entry after that layout change, only on selection.
    if (newlySelectedEvent?.offsetHeight) newlySelectedEvent.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    const biomeMatch = /^biome-(frozen|volcanic|jungle)-(battle|race|trial)$/.exec(mastery.eventId);
    const destination = biomeMatch?.[1] ?? 'desert';
    const kind = biomeMatch?.[2] ?? (mastery.eventId === 'inkstorm-trial' ? 'trial' : mastery.eventId === 'inkstorm-race' ? 'race' : 'battle');
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-destination]')) {
      const id = button.dataset.destination!;
      button.dataset.eventId = id === 'desert' ? `inkstorm-${kind}` : `biome-${id}-${kind}`;
      button.setAttribute('aria-pressed', String(id === destination));
      button.disabled = this.roomPanel.dataset.role === 'guest';
    }
    const cupSelected = mastery.eventId.startsWith('cup-');
    write(requireElement(this.root, '[data-hud="setup-destination"]'), cupSelected ? 'World tour' : ({ desert: 'Dune Sea', frozen: 'Frostline', volcanic: 'Ember Rift', jungle: 'Verdant Run' } as Record<string, string>)[destination]!);
    const modes = ['battle', 'race', 'trial'];
    this.root.querySelectorAll<HTMLButtonElement>('.setup-types [data-event-id]').forEach((button, index) => {
      if (index < 3) button.dataset.eventId = destination === 'desert' ? `inkstorm-${modes[index]}` : `biome-${destination}-${modes[index]}`;
    });
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.setup-types [data-event-id]')) {
      const selected = button.dataset.eventId === mastery.eventId || button.dataset.eventId === 'cup-canyon' && mastery.eventId.startsWith('cup-');
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = this.roomPanel.dataset.role === 'guest';
    }
    const ghost = requireElement<HTMLButtonElement>(controls, '[data-action="toggle-ghost"]');
    ghost.disabled = !mastery.ghostAvailable;
    ghost.setAttribute('aria-pressed', String(mastery.ghostEnabled));
    ghost.title = mastery.ghostAvailable ? 'Race the saved pose of your personal best' : 'Complete a clean event to record a ghost';
    write(requireElement(this.root, '[data-hud="ghost-state"]'), mastery.ghostAvailable ? mastery.ghostEnabled ? 'ON' : 'OFF' : 'NO RUN');
    const saveCourse = requireElement<HTMLButtonElement>(controls, '[data-action="save-course"]');
    saveCourse.setAttribute('aria-pressed', String(mastery.courseSaved));
    write(saveCourse, mastery.courseSaved ? '★ Course saved' : '☆ Save course');
    if (mastery.latestSector && phase === 'racing') {
      const sector = mastery.latestSector;
      const pace = sector.paceDelta ?? null;
      write(this.split, pace === null ? `S${sector.index} ${formatRaceTimeHundredths(sector.time)}` : `PB TOTAL ${formatSplitDelta(pace)}`);
      this.split.title = `${sector.label ?? `Sector ${sector.index}`} · cumulative pace at the last timing gate`;
      this.split.classList.toggle('is-slow', (pace ?? 0) > 0);
    }
    if (mastery.tutorial) {
      write(requireElement(tutorial, '[data-hud="tutorial-step"]'), `FLIGHT SCHOOL · ${mastery.tutorial.step} / ${mastery.tutorial.total}`);
      write(requireElement(tutorial, '[data-hud="tutorial-title"]'), mastery.tutorial.title);
      write(requireElement(tutorial, '[data-hud="tutorial-instruction"]'), mastery.tutorial.instruction);
      requireElement<HTMLElement>(tutorial, '[data-hud="tutorial-progress"]').style.width = `${Math.min(1, Math.max(0, mastery.tutorial.progress)) * 100}%`;
    }
    const resultRoot = requireElement<HTMLElement>(this.root, '[data-hud="mastery-result"]');
    resultRoot.hidden = !mastery.result;
    const key = JSON.stringify([mastery.result, mastery.championship, mastery.championshipRound]);
    if (mastery.result) write(this.resultCallout, `${mastery.result.eventTitle} · Event result`);
    if (key === this.masteryResultKey) return;
    this.masteryResultKey = key;
    const result = mastery.result;
    resultRoot.replaceChildren();
    // Rebuild progression actions only when the run result changes.
    this.results.querySelector('[data-action="next-event"]')?.remove();
    this.results.querySelector('[data-action="restart-championship"]')?.remove();
    if (!result) return;
    const head = this.root.ownerDocument.createElement('header');
    head.innerHTML = '<strong></strong><span></span>';
    write(requireElement(head, 'strong'), result.invalidReason ? 'Practice run' : result.personalBest ? 'NEW PERSONAL BEST' : result.medal === 'none' ? 'A line worth learning.' : `${result.medal} medal`);
    const bestTotal = result.bestTime === null ? 'PB —' : `PB ${formatRaceTimeHundredths(result.bestTime)}`;
    const totalGap = result.bestTime !== null && !result.invalidReason
      ? ` · GAP ${formatSplitDelta(result.time - result.bestTime)}s` : '';
    write(requireElement(head, 'span'), `TOTAL ${formatRaceTimeHundredths(result.time)} · ${bestTotal}${totalGap}`);
    write(this.resultCallout, `${result.eventTitle} · Event result`);
    const objective = this.root.ownerDocument.createElement('p');
    objective.textContent = result.invalidReason ?? result.nextObjective;
    const sectors = this.root.ownerDocument.createElement('div');
    sectors.className = 'pod-hud__sector-results';
    for (const sector of result.sectors) {
      const cell = this.root.ownerDocument.createElement('span');
      cell.textContent = `S${sector.index} ${formatRaceTimeHundredths(sector.time)}`;
      if (sector.label) {
        const label = this.root.ownerDocument.createElement('small');
        label.textContent = `${sector.lap && sector.lap > 1 ? `L${sector.lap} · ` : ''}${sector.label}`;
        cell.prepend(label);
      }
      const delta = this.root.ownerDocument.createElement('b');
      delta.textContent = sector.delta === null ? '—' : formatSplitDelta(sector.delta);
      delta.classList.toggle('is-slow', (sector.delta ?? 0) > 0);
      cell.append(delta); sectors.append(cell);
    }
    resultRoot.append(head, objective, sectors);
    if (result.retryTarget) {
      const pursuit = this.root.ownerDocument.createElement('p');
      pursuit.className = 'pod-hud__retry-pursuit'; pursuit.dataset.hud = 'retry-pursuit';
      pursuit.textContent = `NEXT PURSUIT · ${result.retryTarget.label} · S${result.retryTarget.sectorIndex}: ${result.retryTarget.currentTime.toFixed(2)}s → ${result.retryTarget.targetTime.toFixed(2)}s PB (+${result.retryTarget.loss.toFixed(2)}s). Race again to recover this section.`;
      resultRoot.append(pursuit);
    }
    if (mastery.championship.length > 0) {
      const board = this.root.ownerDocument.createElement('div');
      board.className = 'pod-hud__championship';
      for (const racer of mastery.championship.slice(0, 4)) {
        const row = this.root.ownerDocument.createElement('span');
        row.classList.toggle('is-player', racer.isPlayer);
        row.textContent = `${racer.name} · ${racer.points} PTS`;
        board.append(row);
      }
      resultRoot.append(board);
    }
    if (result.nextEventId) {
      const next = this.root.ownerDocument.createElement('button');
      next.type = 'button'; next.dataset.action = 'next-event'; next.textContent = 'NEXT EVENT →';
      const destination = mastery.events.find((event) => event.id === result.nextEventId)?.title ?? 'Next event';
      next.title = `Continue to ${destination}`;
      next.setAttribute('aria-label', `Next event: ${destination}`);
      const nextDetail = this.root.ownerDocument.createElement('small'); nextDetail.textContent = destination; next.append(nextDetail);
      requireElement(this.results, '.pod-hud__results-actions').append(next);
    } else if (cupComplete) {
      requireElement(this.results, '.pod-hud__results-actions').append(this.createCupReplayButton());
    }
  }

  private createCupReplayButton(): HTMLButtonElement {
    const button = this.root.ownerDocument.createElement('button');
    button.type = 'button';
    button.dataset.action = 'restart-championship';
    button.textContent = 'Race another cup';
    button.title = 'Start a new four-destination World Cup. Personal records and saved courses stay.';
    return button;
  }

  private updateSettings(settings: HudSettingsViewModel | undefined): void {
    const open = settings?.open === true;
    setVisible(this.settingsPanel, open);
    this.pause.classList.toggle('has-settings', open);
    setVisible(this.pause, open || this.root.classList.contains('is-paused'));
    this.pause.setAttribute('aria-label', open ? 'Game settings' : 'Race paused');
    requireElement<HTMLElement>(this.vehicleSelection, '.pod-hud__vehicle-select-frame').inert = open || this.eventAtlasOpen;
    const settingsToggle = this.pause.querySelector<HTMLButtonElement>('.pod-hud__pause-home [data-action="toggle-settings"]');
    settingsToggle?.setAttribute('aria-expanded', String(open));
    if (!settings) return;

    this.root.classList.toggle('is-high-contrast', settings.comfort.highContrast);
    this.root.classList.toggle('is-reduced-motion', settings.comfort.reducedMotion);
    this.root.dataset.threatCues = settings.comfort.directionalThreatCues ? 'enabled' : 'disabled';
    this.root.style.setProperty('--pod-motion-intensity', String(Math.min(1, Math.max(0, settings.comfort.motionIntensity))));

    for (const tab of this.settingsPanel.querySelectorAll<HTMLButtonElement>('[data-settings-tab]')) {
      const selected = tab.dataset.settingsTab === settings.activeTab;
      tab.classList.toggle('is-selected', selected);
      tab.setAttribute('aria-pressed', String(selected));
    }
    for (const page of this.settingsPanel.querySelectorAll<HTMLElement>('[data-settings-page]')) {
      page.hidden = page.dataset.settingsPage !== settings.activeTab;
    }

    const values: Readonly<Record<string, number | boolean>> = {
      'controls.gamepadDeadzone': settings.controls.gamepadDeadzone,
      'controls.gamepadSensitivity': settings.controls.gamepadSensitivity,
      'controls.steeringAssist': settings.controls.steeringAssist,
      'comfort.cameraShake': settings.comfort.cameraShake,
      'comfort.fovEffects': settings.comfort.fovEffects,
      'comfort.motionIntensity': settings.comfort.motionIntensity,
      'comfort.reducedMotion': settings.comfort.reducedMotion,
      'comfort.highContrast': settings.comfort.highContrast,
      'comfort.directionalThreatCues': settings.comfort.directionalThreatCues,
      'audio.master': settings.audio.master,
      'audio.music': settings.audio.music,
      'audio.engine': settings.audio.engine,
      'audio.effects': settings.audio.effects,
      'audio.voice': settings.audio.voice,
    };
    for (const input of this.settingsPanel.querySelectorAll<HTMLInputElement>('[data-setting]')) {
      const value = values[input.dataset.setting ?? ''];
      if (typeof value === 'boolean') {
        input.checked = value;
      } else if (typeof value === 'number' && this.root.ownerDocument.activeElement !== input) {
        input.value = String(value);
      }
      if (typeof value === 'number') {
        const output = this.settingsPanel.querySelector<HTMLOutputElement>(`[data-setting-output="${input.dataset.setting}"]`);
        if (output) write(output, `${Math.round(value * 100)}%`);
      }
    }

    const bindingsKey = settings.controls.bindings
      .map((binding) => `${binding.action}:${binding.label}:${binding.keyboard}:${binding.gamepad}`)
      .join('|');
    if (bindingsKey !== this.settingsBindingsKey) {
      this.settingsBindingsKey = bindingsKey;
      for (const action of ['fire', 'shield', 'mine'] as const) {
        const binding = settings.controls.bindings.find(binding => binding.action === action);
        if (!binding) continue;
        this.combatBindings[action] = binding.keyboard;
        for (const caption of this.root.querySelectorAll<HTMLElement>(`[data-key-binding="${action}"]`)) write(caption, binding.keyboard);
      }
      this.settingsBindings.replaceChildren(...settings.controls.bindings.map((binding) => {
        const row = this.root.ownerDocument.createElement('div');
        row.className = 'pod-hud__binding-row';
        row.innerHTML = '<span></span><button type="button"></button><button type="button"></button>';
        write(requireElement(row, 'span'), binding.label);
        const [keyboard, gamepad] = row.querySelectorAll<HTMLButtonElement>('button');
        if (keyboard) {
          keyboard.dataset.action = 'request-remap';
          keyboard.dataset.bindingAction = binding.action;
          keyboard.dataset.bindingDevice = 'keyboard';
          keyboard.textContent = binding.keyboard;
          keyboard.title = `Remap ${binding.label} keyboard binding`;
        }
        if (gamepad) {
          gamepad.dataset.action = 'request-remap';
          gamepad.dataset.bindingAction = binding.action;
          gamepad.dataset.bindingDevice = 'gamepad';
          gamepad.textContent = binding.gamepad;
          gamepad.title = `Remap ${binding.label} gamepad binding`;
        }
        return row;
      }));
    }
    write(
      this.settingsCapture,
      settings.capture
        ? `Listening for ${settings.capture.device} // ${settings.capture.action}`
        : 'Select a binding to remap',
    );
    this.settingsCapture.classList.toggle('is-listening', settings.capture !== null);
  }

  private updatePerfectLaunch(launch: HudLaunchViewModel | undefined, preRace: boolean): void {
    const visible = launch?.stage === 'charging' && !preRace;
    if (!launch) {
      setVisible(this.launch, false);
      return;
    }
    const rev = Math.min(1, Math.max(0, Number.isFinite(launch.rev) ? launch.rev : 0));
    const target = Math.min(1, Math.max(0, Number.isFinite(launch.target) ? launch.target : 0));
    const sweetMin = Math.min(1, Math.max(0, Number.isFinite(launch.sweetSpotMin) ? launch.sweetSpotMin : 0));
    const sweetMax = Math.min(1, Math.max(sweetMin, Number.isFinite(launch.sweetSpotMax) ? launch.sweetSpotMax : sweetMin));
    const heat = Math.min(1, Math.max(0, Number.isFinite(launch.heat) ? launch.heat : 0));
    this.launchNeedle.style.left = `${(rev * 100).toFixed(1)}%`;
    this.launchSweetSpot.style.left = `${(sweetMin * 100).toFixed(1)}%`;
    this.launchSweetSpot.style.width = `${((sweetMax - sweetMin) * 100).toFixed(1)}%`;
    this.launchHeat.style.width = `${(heat * 100).toFixed(1)}%`;
    this.launch.dataset.stage = launch.stage;
    this.launch.dataset.outcome = launch.outcome ?? 'pending';
    this.launch.classList.toggle('is-hot', heat >= 0.76);
    write(this.launchLabel, 'Match the sweet spot');
    write(this.launchValue, `REV ${String(Math.round(rev * 100)).padStart(3, '0')} // TARGET ${String(Math.round(target * 100)).padStart(3, '0')}`);
    this.launch.setAttribute('aria-label', 'Perfect launch meter. Match engine revs to the green sweet spot.');
    setVisible(this.launch, visible);
  }

  private updateRaceModeStatus(
    status: HudRaceModeStatusViewModel | undefined,
    phase: RaceHudViewModel['phase'],
    preRace: boolean,
  ): void {
    const visible = Boolean(status) && phase !== 'finished' && !preRace;
    if (!status) {
      setVisible(this.raceModeStatus, false);
      return;
    }
    write(this.raceModeName, status.name);
    write(this.raceModeObjective, status.objective);
    write(this.raceModeScoreLabel, status.scoreLabel);
    write(this.raceModeScoreValue, status.scoreValue);
    const progress = status.progress === null
      ? null
      : Math.min(1, Math.max(0, Number.isFinite(status.progress) ? status.progress : 0));
    this.raceModeProgress.style.width = `${((progress ?? 0) * 100).toFixed(1)}%`;
    this.raceModeStatus.classList.toggle('has-progress', progress !== null);
    this.raceModeStatus.dataset.mode = status.mode;
    this.raceModeStatus.setAttribute(
      'aria-label',
      `${status.name}. ${status.objective}. ${status.scoreLabel}: ${status.scoreValue}.`,
    );
    setVisible(this.raceModeStatus, visible);
  }

  private updateLobby(lobby: HudPreRaceViewModel['lobby']): void {
    this.roomPanel.dataset.role = lobby.role;
    this.roomPanel.dataset.status = lobby.status;
    write(this.roomMemberCount, `${lobby.members.length}/${Math.max(1, lobby.capacity)}`);
    write(this.roomStatus, lobby.statusText);
    const guest = lobby.role === 'guest';
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.setup-types button,[data-destination]')) {
      button.disabled = guest || lobby.status === 'connecting';
      if (guest && lobby.sharedSetup) {
        const selected = button.dataset.destination
          ? button.dataset.destination === lobby.sharedSetup.destination
          : button.dataset.mode === lobby.sharedSetup.mode;
        button.setAttribute('aria-pressed', String(selected));
      }
    }
    if (guest && lobby.sharedSetup) write(requireElement(this.root, '[data-hud="setup-destination"]'), lobby.sharedSetup.destination === 'desert' ? 'Dune Sea' : lobby.sharedSetup.destinationLabel);


    const startButton = requireElement<HTMLButtonElement>(this.root, '[data-hud="start-button"]');
    startButton.disabled = !lobby.canStart;
    write(requireElement(startButton, 'span'), lobby.canStart ? 'Play' : 'Waiting');
    startButton.setAttribute('aria-label', lobby.canStart ? 'Start race' : 'Waiting for host');
    const promptKey = `${lobby.role}:${lobby.canStart}`;
    if (promptKey !== this.startPromptKey) {
      this.startPromptKey = promptKey;
      this.startPrompt.replaceChildren();
      if (lobby.canStart) {
        this.startPrompt.textContent = 'Space / Enter to launch';
        this.startPrompt.dataset.mode = 'ready';
      } else {
        this.startPrompt.textContent = 'Waiting for host to start the race…';
        this.startPrompt.dataset.mode = 'waiting';
      }
    }

    const normalizedCode = lobby.roomCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const inputIsFocused = this.root.ownerDocument.activeElement === this.roomCodeInput;
    if (lobby.role !== 'solo' || (normalizedCode.length > 0 && !inputIsFocused)) {
      this.roomCodeInput.value = normalizedCode;
    }
    this.roomCodeInput.readOnly = lobby.role !== 'solo';
    this.roomCodeInput.setAttribute('aria-invalid', String(lobby.status === 'error'));

    const connecting = lobby.status === 'connecting';
    this.createRoomButton.disabled = lobby.role !== 'solo' || connecting;
    this.joinRoomButton.disabled = lobby.role !== 'solo' || connecting;
    this.copyRoomButton.disabled = normalizedCode.length !== 6;
    this.leaveRoomButton.disabled = lobby.role === 'solo';

    const membersKey = lobby.members
      .map((member) => `${member.id}:${member.name}:${member.isHost}:${member.isLocal}`)
      .join('|');
    if (membersKey === this.lobbyMembersKey) return;
    this.lobbyMembersKey = membersKey;
    if (lobby.members.length === 0) {
      const empty = this.root.ownerDocument.createElement('li');
      empty.className = 'pod-hud__room-member pod-hud__room-member--empty';
      empty.textContent = 'No racers connected';
      this.roomMemberList.replaceChildren(empty);
      return;
    }
    this.roomMemberList.replaceChildren(...lobby.members.map((member) => {
      const item = this.root.ownerDocument.createElement('li');
      item.className = 'pod-hud__room-member';
      item.classList.toggle('is-local', member.isLocal);
      item.textContent = member.name;
      if (member.isHost) {
        const badge = this.root.ownerDocument.createElement('b');
        badge.textContent = 'Host';
        item.append(badge);
      }
      return item;
    }));
  }

  private createVehicleCard(card: HudVehicleCardViewModel, index: number): HTMLElement {
    const element = this.root.ownerDocument.createElement('article');
    element.className = 'pod-hud__vehicle-card';
    element.dataset.vehicleId = card.id;
    element.setAttribute('role', 'option');
    element.setAttribute('aria-label', card.name);
    element.tabIndex = 0;
    element.style.setProperty('--pod-vehicle-accent', card.accent);
    element.innerHTML = /* html */ `
      <div class="pod-hud__vehicle-card-index">0${index}</div>
      <div class="pod-hud__vehicle-card-check">Selected</div>
      <h2></h2>
      <div class="pod-hud__vehicle-preview" data-vehicle-preview="${card.id}" data-vehicle-id="${card.id}" role="img" aria-label="3D preview of ${card.name}"></div>
      <p class="pod-hud__vehicle-card-description"></p>
      <div class="pod-hud__vehicle-stats"></div>
    `;
    write(requireElement(element, 'h2'), card.name);
    write(requireElement(element, '.pod-hud__vehicle-card-description'), card.description);
    const stats = requireElement(element, '.pod-hud__vehicle-stats');
    stats.replaceChildren(...card.stats.map((stat) => {
      const row = this.root.ownerDocument.createElement('div');
      row.className = 'pod-hud__vehicle-stat';
      row.innerHTML = `<span></span><i aria-label="${stat.value} of 5"></i><b>${stat.value}</b>`;
      write(requireElement(row, 'span'), stat.label);
      requireElement<HTMLElement>(row, 'i').style.setProperty('--pod-stat', String(stat.value));
      return row;
    }));
    return element;
  }

  private updateCourseProgress(racers: RaceHudViewModel['racers']): void {
    const structuralKey = racers.map((racer) =>
      `${racer.id}:${racer.name}:${racer.isPlayer ? 'player' : 'rival'}:${racer.color ?? ''}`,
    ).join('|');
    if (structuralKey !== this.courseRacersKey) {
      this.courseRacersKey = structuralKey;
      this.courseMarkers.replaceChildren(...racers.map((racer, index) => {
        const marker = this.root.ownerDocument.createElement('i');
        marker.dataset.courseProgressMarker = '';
        marker.dataset.racerId = racer.id;
        marker.className = racer.isPlayer
          ? 'pod-hud__course-racer is-player'
          : 'pod-hud__course-racer';
        marker.setAttribute('aria-label', `${racer.name} course progress`);
        marker.title = racer.name;
        marker.style.setProperty('--pod-racer-offset', `${(index - (racers.length - 1) * 0.5) * 7}px`);
        if (racer.color) marker.style.setProperty('--pod-racer-color', racer.color);
        return marker;
      }));
    }

    const progressById = new Map(racers.map((racer) => [racer.id, racer.courseProgress]));
    for (const marker of this.courseMarkers.querySelectorAll<HTMLElement>('[data-course-progress-marker]')) {
      const raw = progressById.get(marker.dataset.racerId ?? '') ?? 0;
      const progress = Math.min(1, Math.max(0, Number.isFinite(raw) ? raw : 0));
      marker.style.setProperty('--pod-course-progress', `${(progress * 100).toFixed(2)}%`);
      marker.dataset.courseProgress = progress.toFixed(4);
    }
    const playerProgress = racers.find((racer) => racer.isPlayer)?.courseProgress ?? 0;
    const clampedPlayerProgress = Math.min(1, Math.max(0, Number.isFinite(playerProgress) ? playerProgress : 0));
    this.courseCorner.style.setProperty('--pod-player-progress', `${(clampedPlayerProgress * 100).toFixed(2)}%`);
  }

  private updateGalactic(model: RaceHudViewModel): void {
    const galactic = model.galactic;
    setVisible(this.galactic, Boolean(galactic) && model.combatEnabled !== false && model.phase !== 'finished');
    if (!galactic) {
      setVisible(this.redlineInstrument, false);
      return;
    }

    const shieldFraction = galactic.shieldActive && galactic.shieldDuration > 0
      ? Math.min(1, galactic.shieldRemaining / galactic.shieldDuration)
      : galactic.shieldCooldown <= 0.001 ? 1 : 0;
    this.shieldFill.style.width = `${(shieldFraction * 100).toFixed(1)}%`;
    const shieldState = galactic.shieldActive
        ? `${galactic.shieldRemaining.toFixed(1)}S`
        : galactic.shieldCooldown > 0
          ? `${galactic.shieldCooldown.toFixed(1)}S`
          : 'Ready';
    write(this.shieldValue, shieldState);
    this.setSystemReadiness(this.shieldSlot, shieldFraction);
    this.shieldSlot.setAttribute('aria-label', `Shield ${this.combatBindings.shield}, ${shieldState}`);
    this.shieldSlot.title = `Shield [${this.combatBindings.shield}] • ${shieldState}`;
    this.galactic.classList.toggle('is-shield-active', galactic.shieldActive);
    this.galactic.classList.toggle('is-shield-recharging', galactic.shieldCooldown > 0);
    this.galactic.classList.toggle('is-shield-ready', !galactic.shieldActive && galactic.shieldCooldown <= 0.001);

    write(this.weaponName, galactic.weaponName);
    const weaponCooldownFraction = galactic.weaponCooldownDuration > 0
      ? Math.min(1, galactic.weaponCooldown / galactic.weaponCooldownDuration)
      : 0;
    const weaponReadiness = 1 - weaponCooldownFraction;
    this.weaponFill.style.width = `${(weaponReadiness * 100).toFixed(1)}%`;
    const weaponState = galactic.weaponOvercharge > 0
        ? galactic.weaponOvercharge >= 0.999 ? 'OVERCHARGE // RELEASE' : `Overcharge ${Math.round(galactic.weaponOvercharge * 100)}%`
        : galactic.weaponReload > 0
          ? `Reloading ${(galactic.weaponReload * RELOAD_SECONDS).toFixed(1)}S`
          : galactic.weaponCooldown <= 0.001
            ? `Ready ×${galactic.weaponCharges}`
            : `${galactic.weaponCooldown.toFixed(1)}S ×${galactic.weaponCharges}`;
    write(this.weaponValue, weaponState);
    // A reloading lance fills the dial as the magazine comes back.
    this.setSystemReadiness(this.primarySlot, galactic.weaponOvercharge > 0 ? galactic.weaponOvercharge
      : galactic.weaponReload > 0 ? 1 - galactic.weaponReload : weaponReadiness);
    this.galactic.classList.toggle('is-overcharging', galactic.weaponOvercharge > 0);
    this.galactic.classList.toggle('is-weapon-empty', galactic.weaponReload > 0);
    this.primarySlot.setAttribute('aria-label', `Primary ${this.combatBindings.fire}, ${galactic.weaponName}, ${weaponState}`);
    this.primarySlot.title = `${galactic.weaponName} [${this.combatBindings.fire}] • ${weaponState}`;
    write(
      this.weaponTarget,
      galactic.weaponTarget
        ? `Target // ${galactic.weaponTarget}`
        : `Shots ${galactic.weaponShots} // Hits ${galactic.weaponHits}`,
    );
    this.galactic.classList.toggle('has-target', galactic.weaponTarget !== null);
    this.galactic.classList.toggle('is-weapon-ready', galactic.weaponCooldown <= 0.001);
    const targetState = galactic.weaponTarget ? `Target locked: ${galactic.weaponTarget}` : 'Target scanner: no target';
    this.contextAction.setAttribute('aria-label', targetState);
    this.contextAction.title = targetState;

    // Loaded forward ordnance takes over the mine key until it is spent.
    const ordnanceName = galactic.towActive ? 'Release' : galactic.ordnanceKind === 'tow-cable' ? 'Cable' : 'Mine';
    const ordnanceCount = galactic.ordnanceKind ? galactic.ordnanceCharges : galactic.mineCount;
    write(this.mineCount, galactic.towActive ? '' : String(ordnanceCount));
    write(this.mineLabel, ordnanceName);
    this.setSystemReadiness(this.mineSlot, galactic.towActive || ordnanceCount > 0 ? 1 : 0);
    this.mineSlot.dataset.ordnance = galactic.towActive ? 'tow' : galactic.ordnanceKind ?? 'mine';
    this.mineSlot.setAttribute('aria-label', `${ordnanceName} ${this.combatBindings.mine}, ${ordnanceCount} remaining`);
    this.mineSlot.title = `${ordnanceName} [${this.combatBindings.mine}] • ${ordnanceCount} remaining`;
    this.updateMeter(this.redlineFill, this.redlineValue, galactic.redlineHeat);
    const redlinePercent = Math.round(galactic.redlineHeat * 100);
    const redlineVisible = model.phase !== 'finished'
      && model.preRace?.active !== true;
    this.redlineInstrument.classList.toggle('is-active', galactic.redlineActive);
    this.redlineInstrument.classList.toggle('has-core-heat', galactic.redlineHeat > 0.01);
    this.redlineInstrument.classList.toggle('is-hot', galactic.redlineHeat >= 0.7);
    this.redlineInstrument.classList.toggle('is-critical', galactic.redlineHeat >= 0.9);
    this.redlineInstrument.setAttribute(
      'aria-label',
      `Redline heat ${redlinePercent} percent${galactic.redlineActive ? ', active' : ''}`,
    );
    this.redlineInstrument.title = `Redline [Shift] • ${redlinePercent}%`;
    setVisible(this.redlineInstrument, redlineVisible);
    this.galactic.classList.toggle('is-redline', galactic.redlineActive);

    const upgradesKey = galactic.upgrades.join('|');
    if (upgradesKey !== this.upgradesKey) {
      this.upgradesKey = upgradesKey;
      const visible = galactic.upgrades.slice(0, 3);
      const chips = visible.map((upgrade) => {
        const chip = this.root.ownerDocument.createElement('span');
        chip.className = 'pod-hud__upgrade-chip';
        chip.textContent = upgrade;
        chip.title = upgrade;
        return chip;
      });
      if (galactic.upgrades.length > visible.length) {
        const overflow = this.root.ownerDocument.createElement('span');
        overflow.className = 'pod-hud__upgrade-chip pod-hud__upgrade-chip--overflow';
        overflow.textContent = `+${galactic.upgrades.length - visible.length}`;
        overflow.title = galactic.upgrades.slice(visible.length).join(', ');
        chips.push(overflow);
      }
      this.upgradeList.replaceChildren(...chips);
    }

    this.galactic.classList.toggle('is-wrecked', galactic.wreckPhase === 'wrecked');
    this.galactic.classList.toggle('is-recovering', galactic.wreckPhase === 'recovering');
  }

  private updateCountdown(cue: RaceHudViewModel['countdownCue']): void {
    const key = cue === null || cue === 0 ? '' : String(cue).toUpperCase();
    if (key === this.countdownKey) return;
    this.countdownKey = key;
    this.countdown.classList.remove('is-visible', 'is-go');
    write(this.countdown, key);
    if (!key) {
      this.countdown.setAttribute('aria-hidden', 'true');
      return;
    }
    // Force only on cue boundaries so the stepped ink-kick animation restarts.
    void this.countdown.offsetWidth;
    this.countdown.classList.toggle('is-go', key === 'GO');
    this.countdown.classList.add('is-visible');
    this.countdown.setAttribute('aria-hidden', 'false');
  }

  private updateResults(
    results: readonly HudResultViewModel[],
    visible: boolean,
    playerPlacement: number,
    presentation?: HudResultsPresentationViewModel,
  ): void {
    setVisible(this.results, visible);
    if (!visible) return;
    write(this.resultTitle, playerPlacement === 1 ? 'Victory' : `${formatOrdinal(playerPlacement)} Place`);
    write(this.resultCallout, playerPlacement === 1
      ? 'Pod one // Circuit conquered'
      : 'Classified // Finish verified');
    this.updateResultPresentation(presentation);
    const key = results.map((result) =>
      `${result.id}:${result.placement}:${result.finishTime ?? 'dnf'}:${result.bestLap ?? 'none'}`,
    ).join('|');
    if (key === this.resultsKey) return;
    this.resultsKey = key;
    this.resultList.replaceChildren(...results.map((result) => this.createResultRow(result)));
  }

  private updateResultPresentation(presentation: HudResultsPresentationViewModel | undefined): void {
    const key = JSON.stringify(presentation ?? null);
    if (key === this.resultPresentationKey) return;
    this.resultPresentationKey = key;
    const lead = presentation?.highlights[0];
    const photo = presentation?.photoFinish;
    const hasFeature = Boolean(photo || lead || presentation?.headline);
    setVisible(this.resultHighlight, hasFeature);
    this.resultHighlight.className = 'pod-hud__result-highlight';
    if (hasFeature) this.resultHighlight.classList.add('is-visible');
    if (photo) this.resultHighlight.classList.add('is-photo-finish', photo.won ? 'is-win' : 'is-loss');
    this.resultHighlight.replaceChildren();
    if (hasFeature) {
      const kicker = this.root.ownerDocument.createElement('span');
      kicker.textContent = photo ? 'Photo finish' : lead?.kind.replace('-', ' ') ?? 'Race highlight';
      const title = this.root.ownerDocument.createElement('strong');
      title.textContent = presentation?.headline ?? lead?.title ?? 'Race classified';
      const detail = this.root.ownerDocument.createElement('small');
      detail.textContent = photo
        ? `${photo.won ? 'Ahead of' : 'Behind'} ${photo.rivalName} by ${Math.abs(photo.gapSeconds).toFixed(3)} S`
        : lead?.detail ?? '';
      this.resultHighlight.append(kicker, title, detail);
    }

    const highlights = presentation?.highlights ?? [];
    this.resultMoments.replaceChildren(...highlights.map((highlight) => {
      const button = this.root.ownerDocument.createElement('button');
      button.type = 'button';
      button.dataset.action = 'view-highlight';
      button.dataset.highlightId = highlight.id;
      button.innerHTML = '<span></span><strong></strong><small></small>';
      write(requireElement(button, 'span'), `▶ REPLAY · ${highlight.kind.replace('-', ' ')}`);
      write(requireElement(button, 'strong'), highlight.title);
      write(
        requireElement(button, 'small'),
        highlight.time === undefined ? highlight.detail : `${formatRaceTime(highlight.time)} // ${highlight.detail}`,
      );
      return button;
    }));
    this.resultMoments.classList.toggle('is-visible', highlights.length > 0);
  }

  private createResultRow(result: HudResultViewModel): HTMLElement {
    const row = this.root.ownerDocument.createElement('div');
    row.className = `pod-hud__result-row${result.isPlayer ? ' is-player' : ''}`;
    const placement = this.root.ownerDocument.createElement('span');
    placement.className = 'pod-hud__result-place';
    placement.textContent = formatOrdinal(result.placement);
    const name = this.root.ownerDocument.createElement('span');
    name.textContent = result.name;
    const time = this.root.ownerDocument.createElement('span');
    time.className = 'pod-hud__result-time';
    time.textContent = result.finishTime === null ? 'DNF' : formatRaceTime(result.finishTime);
    const lap = this.root.ownerDocument.createElement('span');
    lap.className = 'pod-hud__result-lap';
    lap.textContent = result.bestLap === null ? 'BEST LAP (RUN) —' : `BEST LAP (RUN) ${formatRaceTime(result.bestLap)}`;
    row.append(placement, name, time, lap);
    return row;
  }
}
