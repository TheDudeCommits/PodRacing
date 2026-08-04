import { MinimapCanvas } from './MinimapCanvas';
import { VehicleCardPreviewRenderer } from './VehicleCardPreview';
import { installPodracingHudStyles } from './hudStyles';
import {
  cornerGlyph,
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
  HudLaunchViewModel,
  HudRaceDirectorViewModel,
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

export interface RaceHudOptions {
  installStyles?: boolean;
  initiallyMuted?: boolean;
  onMuteChange?: (muted: boolean) => void;
  /** Strongly typed menu actions; the same payload is also dispatched as `pod-hud-action`. */
  onAction?: (action: RaceHudAction) => void;
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
  private readonly flight: HTMLElement;
  private readonly flightClearance: HTMLElement;
  private readonly flightMotion: HTMLElement;
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
  private readonly redlineFill: HTMLElement;
  private readonly redlineValue: HTMLElement;
  private readonly upgradeList: HTMLElement;
  private readonly galacticAlert: HTMLElement;
  private readonly galacticAlertLabel: HTMLElement;
  private readonly galacticAlertDetail: HTMLElement;
  private readonly wrongWay: HTMLElement;
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
  private readonly directorEvent: HTMLElement;
  private readonly directorTitle: HTMLElement;
  private readonly directorDetail: HTMLElement;
  private readonly pause: HTMLElement;
  private readonly settingsPanel: HTMLElement;
  private readonly settingsBindings: HTMLElement;
  private readonly settingsCapture: HTMLElement;
  private readonly controls: HTMLElement;
  private readonly threatCues: HTMLElement;
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
  private readonly createdAt: number;
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
  private threatStructureKey = '';

  constructor(mount: HTMLElement, options: RaceHudOptions = {}) {
    if (options.installStyles !== false) installPodracingHudStyles(mount.ownerDocument);
    this.onMuteChange = options.onMuteChange;
    this.onAction = options.onAction;
    this.muted = options.initiallyMuted ?? false;
    this.createdAt = performance.now();
    this.root = mount.ownerDocument.createElement('div');
    this.root.className = 'pod-hud';
    // Avoid a one-frame flash of every instrument before the first model tick.
    this.root.dataset.phase = 'countdown';
    this.root.setAttribute('aria-label', 'Podrace instruments');
    this.root.innerHTML = /* html */ `
      <section class="pod-hud__vehicle-select" data-hud="vehicle-selection" aria-label="Select your vehicle" aria-hidden="true">
        <div class="pod-hud__vehicle-select-frame">
          <header class="pod-hud__vehicle-select-head">
            <h1>NOW THIS IS PODRACING!</h1>
          </header>
          <div class="pod-hud__vehicle-cards" data-hud="vehicle-cards"></div>
          <footer class="pod-hud__vehicle-select-footer">
            <section class="pod-hud__selector-controls" aria-label="Race controls">
              <div class="pod-hud__selector-section-head">
                <strong>Race controls</strong>
                <small>Click a craft or use ← / → to select</small>
              </div>
              <div class="pod-hud__selector-control-grid">
                <span><kbd>W</kbd><em>Throttle</em></span>
                <span><kbd>S</kbd><em>Brake</em></span>
                <span><kbd>A/D</kbd><em>Steer</em></span>
                <span><kbd>Space</kbd><em>Drift</em></span>
                <span><kbd>Shift</kbd><em>Redline</em></span>
                <span><kbd>E</kbd><em>Heat Lance</em></span>
                <span><kbd>Q</kbd><em>Shield</em></span>
                <span><kbd>F</kbd><em>Mine</em></span>
                <span><kbd>R</kbd><em>Recover</em></span>
                <span><kbd>Esc/P</kbd><em>Pause</em></span>
              </div>
            </section>

            <section class="pod-hud__selector-setup" aria-label="Race setup">
              <div class="pod-hud__selector-section-head"><strong>Race setup</strong></div>
              <div class="pod-hud__difficulty-selector" role="group" aria-label="AI difficulty">
                <span>AI</span>
                <button type="button" data-action="select-ai-difficulty" data-difficulty="easy" aria-pressed="false">Easy</button>
                <button type="button" data-action="select-ai-difficulty" data-difficulty="medium" aria-pressed="true">Medium</button>
                <button type="button" data-action="select-ai-difficulty" data-difficulty="hard" aria-pressed="false">Hard</button>
              </div>
              <label class="pod-hud__mode-selector">
                <span>Mode</span>
                <select data-action="select-race-mode" data-hud="race-mode-select" aria-label="Race mode">
                  <option value="circuit">Circuit</option>
                  <option value="eliminator">Eliminator</option>
                  <option value="checkpoint-sprint">Checkpoint Sprint</option>
                  <option value="combat-race">Combat</option>
                  <option value="survival-gauntlet">Survival</option>
                  <option value="drift-trial">Drift Trial</option>
                  <option value="team-race">Team Race</option>
                </select>
              </label>
              <div class="pod-hud__lap-selector" role="group" aria-label="Number of laps">
                <span>Laps</span>
                <button type="button" data-action="select-laps" data-laps="1" aria-pressed="false">1</button>
                <button type="button" data-action="select-laps" data-laps="2" aria-pressed="false">2</button>
                <button type="button" data-action="select-laps" data-laps="3" aria-pressed="true">3</button>
              </div>
              <div class="pod-hud__selector-launch-row">
                <button class="pod-hud__workshop-toggle" type="button" data-action="toggle-workshop" aria-expanded="false">Workshop</button>
                <strong class="pod-hud__start-prompt" data-hud="start-prompt">Press <kbd>Space</kbd> or <kbd>Enter</kbd> to start</strong>
              </div>
            </section>

            <section class="pod-hud__room" data-hud="room-panel" aria-label="Online room">
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
            </section>
          </footer>
          <section class="pod-hud__workshop" data-hud="workshop" aria-label="Podracer workshop" aria-hidden="true">
            <header class="pod-hud__workshop-head">
              <div><span>Boonta workshop</span><strong>Build the advantage</strong></div>
              <button type="button" data-action="toggle-workshop" aria-label="Close workshop">×</button>
            </header>
            <div class="pod-hud__workshop-slots" data-hud="workshop-slots" role="tablist" aria-label="Loadout slots"></div>
            <div class="pod-hud__workshop-body">
              <div class="pod-hud__workshop-parts" data-hud="workshop-parts" aria-label="Available parts"></div>
              <aside class="pod-hud__workshop-summary" aria-label="Build summary">
                <div><strong>Bonuses</strong><ul data-hud="workshop-bonuses"></ul></div>
                <div><strong>Tradeoffs</strong><ul data-hud="workshop-penalties"></ul></div>
                <div><strong>Synergies</strong><ul data-hud="workshop-synergies"></ul></div>
              </aside>
            </div>
          </section>
        </div>
      </section>

      <section class="pod-hud__race" aria-label="Race status">
        <div class="pod-hud__race-rail" aria-hidden="true"></div>
        <div class="pod-hud__race-stat pod-hud__race-stat--lap">
          <div class="pod-hud__race-value"><span data-hud="lap">1</span><small>/ <span data-hud="lap-total">3</span></small></div>
          <div class="pod-hud__label">Lap</div>
        </div>
        <div class="pod-hud__race-time">
          <span class="pod-hud__clock" data-hud="clock">0:00.00</span>
          <span class="pod-hud__label">Time</span>
          <span class="pod-hud__split" data-hud="split">—</span>
        </div>
        <div class="pod-hud__race-stat pod-hud__race-stat--position">
          <div class="pod-hud__race-value"><span data-hud="position">1</span><small>/ <span data-hud="racer-count">4</span></small></div>
          <div class="pod-hud__label">Pos</div>
        </div>
        <div class="pod-hud__redline-heat" data-hud="redline-instrument" aria-label="Redline heat" aria-hidden="true">
          <span>[Shift] Redline</span>
          <i class="pod-hud__redline-track" aria-hidden="true"><i data-hud="redline-fill"></i></i>
          <strong class="pod-hud__sr-only"><span data-hud="redline-value">0</span>%</strong>
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
          <div class="pod-hud__corner-tag pod-hud__sr-only" data-hud="corner-tag">Straight</div>
        </section>
      </section>

      <section class="pod-hud__galactic" data-hud="galactic" aria-label="Combat systems" aria-hidden="true">
        <div class="pod-hud__systems-cluster">
          <div class="pod-hud__combat-grid">
            <div class="pod-hud__combat-slot pod-hud__combat-slot--weapon" data-hud="system-primary" aria-label="Primary weapon E">
              <b class="pod-hud__combat-key">E</b>
              <i class="pod-hud__system-gauge" aria-hidden="true"><i class="pod-hud__system-icon"></i></i>
              <span class="pod-hud__system-label">Primary</span>
              <span class="pod-hud__sr-only" data-hud="weapon-name">Heat Lance</span>
              <strong class="pod-hud__sr-only" data-hud="weapon-value">Ready</strong>
              <i class="pod-hud__combat-charge" aria-hidden="true"><i data-hud="weapon-fill"></i></i>
            </div>
            <div class="pod-hud__combat-slot pod-hud__combat-slot--shield" data-hud="system-shield" aria-label="Shield Q">
              <b class="pod-hud__combat-key">Q</b>
              <i class="pod-hud__system-gauge" aria-hidden="true"><i class="pod-hud__system-icon"></i></i>
              <span class="pod-hud__system-label">Shield</span>
              <strong class="pod-hud__sr-only" data-hud="shield-value">Ready</strong>
              <i class="pod-hud__combat-charge" aria-hidden="true"><i data-hud="shield-fill"></i></i>
            </div>
            <div class="pod-hud__combat-slot pod-hud__combat-slot--mine" data-hud="system-mine" aria-label="Mine F">
              <b class="pod-hud__combat-key">F</b>
              <i class="pod-hud__system-gauge" aria-hidden="true"><i class="pod-hud__system-icon"></i></i>
              <span class="pod-hud__system-label">Mine</span>
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

      <aside class="pod-hud__flight" data-hud="flight" aria-live="polite" aria-hidden="true">
        <span class="pod-hud__flight-state">Airborne</span>
        <strong data-hud="flight-clearance">00.0 M Clear</strong>
        <small data-hud="flight-motion">Apex // Set</small>
      </aside>

      <section class="pod-hud__speed" aria-label="Speed">
        <div class="pod-hud__speed-ring" data-hud="speed-ring"></div>
        <div class="pod-hud__speed-readout">
          <span class="pod-hud__speed-number" data-hud="speed">000</span>
          <span class="pod-hud__speed-unit">KPH</span>
        </div>
        <div class="pod-hud__meter pod-hud__meter--drift">
          <div class="pod-hud__meter-head"><span class="pod-hud__label">Drift</span><span class="pod-hud__meter-value pod-hud__sr-only" data-hud="drift-value">0</span></div>
          <div class="pod-hud__meter-track"><span class="pod-hud__meter-fill" data-hud="drift-fill"></span></div>
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

      <div class="pod-hud__galactic-alert" data-hud="galactic-alert" role="status" aria-live="polite" aria-hidden="true">
        <strong data-hud="galactic-alert-label"></strong>
        <span data-hud="galactic-alert-detail"></span>
      </div>
      <div class="pod-hud__director-event" data-hud="director-event" role="status" aria-live="polite" aria-atomic="true" aria-hidden="true">
        <span>Race Director</span>
        <strong data-hud="director-title"></strong>
        <small data-hud="director-detail"></small>
      </div>
      <div class="pod-hud__wrong-way" data-hud="wrong-way" role="alert" aria-hidden="true">Wrong way</div>
      <div class="pod-hud__countdown" data-hud="countdown" aria-live="assertive" aria-hidden="true"></div>
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
      <div class="pod-hud__threat-cues" data-hud="threat-cues" aria-label="Directional threats" aria-hidden="true"></div>
      <aside class="pod-hud__pause" data-hud="pause" role="dialog" aria-label="Race paused" aria-hidden="true">
        <div class="pod-hud__pause-home">
          <span>Engines holding</span>
          <strong>Paused</strong>
          <small>Press P or Escape to rejoin the circuit</small>
          <div class="pod-hud__pause-actions">
            <button type="button" data-action="resume-race">Resume</button>
            <button type="button" data-action="toggle-settings" aria-expanded="false">Settings</button>
          </div>
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
              <label><input type="checkbox" data-setting="comfort.directionalThreatCues"><span>Directional threat cues</span></label>
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
          </div>
        </section>
      </aside>

      <aside class="pod-hud__controls" data-hud="controls" aria-hidden="true">
        <span><b class="pod-hud__key">W</b> Throttle</span>
        <span><b class="pod-hud__key">S</b> Brake</span>
        <span><b class="pod-hud__key">A D</b> Carve</span>
        <span><b class="pod-hud__key">SPACE</b> Drift</span>
        <span><b class="pod-hud__key">SHIFT</b> Redline</span>
        <span><b class="pod-hud__key">E</b> Heat Lance</span>
        <span><b class="pod-hud__key">Q</b> Shield</span>
        <span><b class="pod-hud__key">F</b> Mine</span>
        <span><b class="pod-hud__key">R</b> Recover</span>
        <span><b class="pod-hud__key">ESC/P</b> Pause</span>
      </aside>

      <section class="pod-hud__results" data-hud="results" role="dialog" aria-label="Race results" aria-hidden="true">
        <h1 class="pod-hud__results-title" data-hud="result-title">Race complete</h1>
        <div class="pod-hud__results-callout" data-hud="result-callout">Pod one // Circuit conquered</div>
        <div class="pod-hud__result-highlight" data-hud="result-highlight" aria-hidden="true"></div>
        <div class="pod-hud__results-list" data-hud="result-list"></div>
        <div class="pod-hud__result-moments" data-hud="result-moments" aria-label="Race highlights"></div>
        <div class="pod-hud__results-footer">Press R to challenge the circuit again</div>
      </section>
    `;
    mount.append(this.root);

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
    this.flight = requireElement(this.root, '[data-hud="flight"]');
    this.flightClearance = requireElement(this.root, '[data-hud="flight-clearance"]');
    this.flightMotion = requireElement(this.root, '[data-hud="flight-motion"]');
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
    this.redlineFill = requireElement(this.root, '[data-hud="redline-fill"]');
    this.redlineValue = requireElement(this.root, '[data-hud="redline-value"]');
    this.upgradeList = requireElement(this.root, '[data-hud="upgrade-list"]');
    this.galacticAlert = requireElement(this.root, '[data-hud="galactic-alert"]');
    this.galacticAlertLabel = requireElement(this.root, '[data-hud="galactic-alert-label"]');
    this.galacticAlertDetail = requireElement(this.root, '[data-hud="galactic-alert-detail"]');
    this.wrongWay = requireElement(this.root, '[data-hud="wrong-way"]');
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
    this.directorEvent = requireElement(this.root, '[data-hud="director-event"]');
    this.directorTitle = requireElement(this.root, '[data-hud="director-title"]');
    this.directorDetail = requireElement(this.root, '[data-hud="director-detail"]');
    this.pause = requireElement(this.root, '[data-hud="pause"]');
    this.settingsPanel = requireElement(this.root, '[data-hud="settings"]');
    this.settingsBindings = requireElement(this.root, '[data-hud="settings-bindings"]');
    this.settingsCapture = requireElement(this.root, '[data-hud="settings-capture"]');
    this.controls = requireElement(this.root, '[data-hud="controls"]');
    this.threatCues = requireElement(this.root, '[data-hud="threat-cues"]');
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
    this.vehiclePreviews = new VehicleCardPreviewRenderer({ root: this.root });
    this.courseMarkers = requireElement(this.root, '[data-hud="course-progress-markers"]');
    this.courseCorner = requireElement(this.root, '[data-hud="course-corner"]');
    this.minimap = new MinimapCanvas(requireElement<HTMLCanvasElement>(this.root, '[data-hud="minimap"]'));
    this.root.addEventListener('click', this.handleActionClick);
    this.root.addEventListener('change', this.handleControlChange);
    this.root.addEventListener('input', this.handleControlInput);
  }

  update(model: RaceHudViewModel): void {
    this.root.dataset.phase = model.phase;
    this.updateVehicleSelection(model.preRace);
    const selectorActive = model.preRace?.active === true;
    this.updateSettings(model.settings);
    this.updateThreatCues(model.threats, model.phase, selectorActive);
    this.updatePerfectLaunch(model.launch, selectorActive);
    this.updateRaceModeStatus(model.raceModeStatus, model.phase, selectorActive);
    this.updateDirectorEvent(model.directorEvent, model.phase, model.wrongWay, selectorActive);
    write(this.lap, String(Math.max(1, Math.floor(model.lap))));
    write(this.lapTotal, String(Math.max(1, Math.floor(model.totalLaps))));
    write(this.position, String(Math.max(1, Math.floor(model.position))));
    write(this.racerCount, String(Math.max(1, Math.floor(model.racerCount))));
    write(this.clock, formatRaceTimeHundredths(model.raceTime));
    write(this.speed, formatSpeed(model.speedMps));
    this.speedRing.style.setProperty('--pod-speed-angle', `${Math.round(Math.min(1, Math.max(0, model.normalizedSpeed)) * 268)}deg`);

    const delta = formatSplitDelta(model.splitDelta);
    const splitText = model.splitDelta === null && model.lastSplit !== null
      ? `SPLIT ${formatRaceTime(model.lastSplit)}`
      : delta;
    write(this.split, splitText);
    this.split.classList.toggle('is-slow', model.splitDelta !== null && model.splitDelta > 0);

    write(this.cornerArrow, cornerGlyph(model.corner.direction, model.corner.severity));
    write(this.cornerDistance, `${Math.round(Math.max(0, model.corner.distance))} M`);
    write(this.cornerTag, model.corner.label ?? model.corner.direction);
    this.cornerArrow.dataset.direction = model.corner.direction;
    this.cornerArrow.style.transform = `skewX(-5deg) scale(${(0.92 + model.corner.severity * 0.16).toFixed(3)})`;

    const airborne = model.airborne === true;
    const clearance = Math.max(0, Number.isFinite(model.groundClearance) ? model.groundClearance ?? 0 : 0);
    const verticalSpeed = Number.isFinite(model.verticalSpeed) ? model.verticalSpeed ?? 0 : 0;
    const motion = clearance < 3.2 || verticalSpeed < -1.25
      ? 'descending'
      : verticalSpeed > 1.25
        ? 'climbing'
        : 'apex';
    write(this.flightClearance, `${clearance.toFixed(1).padStart(4, '0')} M CLEAR`);
    write(this.flightMotion, motion === 'descending'
      ? '↓ Landing // Brace'
      : motion === 'climbing'
        ? '↑ Climb // Landing Armed'
        : '◇ Apex // Landing Set');
    this.flight.dataset.motion = motion;
    setVisible(this.flight, airborne);

    this.updateMeter(this.boostFill, this.boostValue, model.boost);
    this.updateMeter(this.driftFill, this.driftValue, model.driftCharge);
    this.updateMeter(this.heatFill, this.heatValue, model.heat);
    this.updateMeter(this.damageFill, this.damageValue, model.damage);
    this.speedRing.closest('.pod-hud__speed')?.classList.toggle('is-boosting', model.boostActive);
    this.telemetry.classList.toggle('is-hot', model.heat >= 0.82);
    this.telemetry.classList.toggle('is-damaged', model.damage >= 0.58);
    this.updateGalactic(model);

    setVisible(this.wrongWay, model.wrongWay);
    this.updateCountdown(model.countdownCue);
    const automaticControls = performance.now() - this.createdAt < 7_500
      && model.phase !== 'finished'
      && model.preRace?.active !== true;
    setVisible(this.controls, model.controlsVisible ?? automaticControls);
    this.updateResults(
      model.results,
      model.phase === 'finished',
      model.position,
      model.resultsPresentation,
    );
    this.updateCourseProgress(model.racers);
    this.minimap.update(model.course, model.racers, model.raceTime, model.courseBranches);
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.onMuteChange?.(muted);
  }

  isMuted(): boolean {
    return this.muted;
  }

  setPaused(paused: boolean): void {
    setVisible(this.pause, paused);
    this.root.classList.toggle('is-paused', paused);
  }

  dispose(): void {
    this.roomCodeInput.removeEventListener('input', this.handleRoomCodeInput);
    this.roomCodeInput.removeEventListener('paste', this.handleRoomCodePaste);
    this.root.removeEventListener('click', this.handleActionClick);
    this.root.removeEventListener('change', this.handleControlChange);
    this.root.removeEventListener('input', this.handleControlInput);
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
    this.onAction?.(action);
    this.root.dispatchEvent(new CustomEvent<RaceHudAction>('pod-hud-action', {
      detail: action,
    }));
  }

  private readonly handleActionClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest<HTMLElement>('[data-action]');
    const action = trigger?.dataset.action;
    if (!trigger || !action) return;

    if (action === 'select-ai-difficulty') {
      const difficulty = trigger.dataset.difficulty as HudAiDifficulty | undefined;
      if (difficulty && HUD_AI_DIFFICULTIES.includes(difficulty)) {
        this.emitAction({ type: 'select-ai-difficulty', difficulty });
      }
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
    const visible = selection?.active === true;
    this.root.classList.toggle('has-vehicle-selection', visible);
    setVisible(this.vehicleSelection, visible);
    if (!visible || !selection) {
      setVisible(this.workshopPanel, false);
      this.root.classList.remove('has-workshop');
      this.vehiclePreviews.hide();
      return;
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
      const locked = selection.lobby.role === 'guest' || selection.lobby.status === 'connecting';
      button.classList.toggle('is-selected', selected);
      button.disabled = locked;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-disabled', String(locked));
    }
    const setupLocked = selection.lobby.role === 'guest' || selection.lobby.status === 'connecting';
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
    this.workshopToggle.disabled = selection.workshop === undefined;
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
    } else if (cardsChanged) {
      void this.vehiclePreviews.refresh().catch(() => {
        this.root.dataset.vehiclePreviewState = 'unavailable';
      });
    }
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

    this.workshopSlots.replaceChildren(...workshop.slots.map((slot) => {
      const button = this.root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'pod-hud__workshop-slot';
      button.classList.toggle('is-selected', slot.slot === workshop.activeSlot);
      button.dataset.action = 'select-workshop-slot';
      button.dataset.slot = slot.slot;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(slot.slot === workshop.activeSlot));
      button.innerHTML = '<span></span><strong></strong><small></small>';
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
      button.innerHTML = '<strong></strong><p></p><span class="is-benefit"></span><span class="is-tradeoff"></span>';
      write(requireElement(button, 'strong'), part.name);
      write(requireElement(button, 'p'), part.description);
      write(requireElement(button, '.is-benefit'), `+ ${part.benefit}`);
      write(requireElement(button, '.is-tradeoff'), `− ${part.tradeoff}`);
      return button;
    }));

    this.replaceSummaryList(this.workshopBonuses, workshop.summary.bonuses, 'Balanced output');
    this.replaceSummaryList(this.workshopPenalties, workshop.summary.penalties, 'No major penalty');
    this.replaceSummaryList(this.workshopSynergies, workshop.summary.synergies, 'No active synergy');
  }

  private replaceSummaryList(root: HTMLElement, values: readonly string[], emptyLabel: string): void {
    const items = values.length > 0 ? values : [emptyLabel];
    root.replaceChildren(...items.slice(0, 4).map((value) => {
      const item = this.root.ownerDocument.createElement('li');
      item.textContent = value;
      return item;
    }));
  }

  private updateSettings(settings: HudSettingsViewModel | undefined): void {
    const open = settings?.open === true;
    setVisible(this.settingsPanel, open);
    this.pause.classList.toggle('has-settings', open);
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

  private updateThreatCues(
    threats: RaceHudViewModel['threats'],
    phase: RaceHudViewModel['phase'],
    preRace: boolean,
  ): void {
    const visibleThreats = phase === 'racing'
      && !preRace
      && this.root.dataset.threatCues !== 'disabled'
      ? [...(threats ?? [])]
        .sort((left, right) => right.urgency - left.urgency)
        .slice(0, 3)
      : [];
    const key = visibleThreats.map((threat) => `${threat.id}:${threat.kind}:${threat.label}`).join('|');
    if (key !== this.threatStructureKey) {
      this.threatStructureKey = key;
      this.threatCues.replaceChildren(...visibleThreats.map((threat) => {
        const cue = this.root.ownerDocument.createElement('i');
        cue.className = 'pod-hud__threat-cue';
        cue.dataset.threatId = threat.id;
        cue.dataset.kind = threat.kind;
        cue.innerHTML = '<b aria-hidden="true">▲</b><span></span>';
        write(requireElement(cue, 'span'), threat.label);
        return cue;
      }));
    }
    const byId = new Map(visibleThreats.map((threat) => [threat.id, threat]));
    for (const cue of this.threatCues.querySelectorAll<HTMLElement>('[data-threat-id]')) {
      const threat = byId.get(cue.dataset.threatId ?? '');
      if (!threat) continue;
      const threatIndex = visibleThreats.findIndex((candidate) => candidate.id === threat.id);
      const bearing = ((Number.isFinite(threat.bearingDegrees) ? threat.bearingDegrees : 0) + 540) % 360 - 180;
      const radians = bearing * Math.PI / 180;
      const urgency = Math.min(1, Math.max(0, Number.isFinite(threat.urgency) ? threat.urgency : 0));
      // Keep the forward warning arc below the timer/director stack and the
      // rear arc above the combat/speed instruments. Similar bearings fan out
      // slightly instead of becoming one unreadable pile of labels.
      const fan = (threatIndex - (visibleThreats.length - 1) * 0.5) * 4.5;
      const lateralFan = Math.abs(Math.sin(radians)) < 0.42 ? fan : 0;
      const verticalFan = Math.abs(Math.sin(radians)) >= 0.42 ? fan * 0.45 : 0;
      cue.style.left = `${50 + Math.sin(radians) * 43 + lateralFan}%`;
      cue.style.top = `${50 - Math.cos(radians) * 24 + verticalFan}%`;
      cue.style.setProperty('--pod-threat-bearing', `${bearing}deg`);
      cue.style.setProperty('--pod-threat-urgency', urgency.toFixed(3));
      cue.classList.toggle('is-critical', urgency >= 0.72);
      cue.setAttribute('aria-label', `${threat.label}, ${Math.round(urgency * 100)} percent threat`);
    }
    setVisible(this.threatCues, visibleThreats.length > 0);
  }

  private updatePerfectLaunch(launch: HudLaunchViewModel | undefined, preRace: boolean): void {
    const visible = Boolean(launch) && !preRace;
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
    if (launch.stage === 'charging') {
      this.launch.setAttribute('aria-live', 'off');
      write(this.launchLabel, 'Match the sweet spot');
      write(this.launchValue, `REV ${String(Math.round(rev * 100)).padStart(3, '0')} // TARGET ${String(Math.round(target * 100)).padStart(3, '0')}`);
      this.launch.setAttribute('aria-label', 'Perfect launch meter. Match engine revs to the green sweet spot.');
    } else {
      const outcome = launch.outcome ?? 'good';
      const result = {
        perfect: ['Perfect launch', 'Boost charged // Full impulse'],
        good: ['Clean launch', 'Impulse stable'],
        bog: ['Engine bog', 'Low revs // Recover throttle'],
        overheat: ['Over-rev', 'Core hot // Throttle limited'],
      } as const;
      this.launch.setAttribute('aria-live', 'polite');
      write(this.launchLabel, result[outcome][0]);
      write(this.launchValue, result[outcome][1]);
      this.launch.setAttribute('aria-label', `${result[outcome][0]}. ${result[outcome][1]}.`);
    }
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

  private updateDirectorEvent(
    event: HudRaceDirectorViewModel | undefined,
    phase: RaceHudViewModel['phase'],
    wrongWay: boolean,
    preRace: boolean,
  ): void {
    const visible = Boolean(event) && phase === 'racing' && !wrongWay && !preRace;
    if (event) {
      write(this.directorTitle, event.title);
      write(this.directorDetail, event.detail);
      this.directorEvent.dataset.kind = event.kind;
      this.directorEvent.dataset.phase = event.phase;
      this.directorEvent.setAttribute('aria-label', `Race Director. ${event.title}. ${event.detail}.`);
    }
    this.root.classList.toggle('has-director-event', visible);
    setVisible(this.directorEvent, visible);
  }

  private updateLobby(lobby: HudPreRaceViewModel['lobby']): void {
    this.roomPanel.dataset.role = lobby.role;
    this.roomPanel.dataset.status = lobby.status;
    write(this.roomMemberCount, `${lobby.members.length}/${Math.max(1, lobby.capacity)}`);
    write(this.roomStatus, lobby.statusText);

    const promptKey = `${lobby.role}:${lobby.canStart}`;
    if (promptKey !== this.startPromptKey) {
      this.startPromptKey = promptKey;
      this.startPrompt.replaceChildren();
      if (lobby.canStart) {
        this.startPrompt.append('Press ');
        const space = this.root.ownerDocument.createElement('kbd');
        space.textContent = 'Space';
        this.startPrompt.append(space, ' or ');
        const enter = this.root.ownerDocument.createElement('kbd');
        enter.textContent = 'Enter';
        this.startPrompt.append(enter, ' to start');
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
    setVisible(this.galactic, Boolean(galactic) && model.phase !== 'finished');
    if (!galactic) {
      setVisible(this.redlineInstrument, false);
      setVisible(this.galacticAlert, false);
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
    this.shieldSlot.setAttribute('aria-label', `Shield Q, ${shieldState}`);
    this.shieldSlot.title = `Shield [Q] • ${shieldState}`;
    this.galactic.classList.toggle('is-shield-active', galactic.shieldActive);
    this.galactic.classList.toggle('is-shield-recharging', galactic.shieldCooldown > 0);
    this.galactic.classList.toggle('is-shield-ready', !galactic.shieldActive && galactic.shieldCooldown <= 0.001);

    write(this.weaponName, galactic.weaponName);
    const weaponCooldownFraction = galactic.weaponCooldownDuration > 0
      ? Math.min(1, galactic.weaponCooldown / galactic.weaponCooldownDuration)
      : 0;
    const weaponReadiness = 1 - weaponCooldownFraction;
    this.weaponFill.style.width = `${(weaponReadiness * 100).toFixed(1)}%`;
    const weaponState = galactic.weaponCooldown <= 0.001
        ? 'Ready'
        : `${galactic.weaponCooldown.toFixed(1)}S`;
    write(this.weaponValue, weaponState);
    this.setSystemReadiness(this.primarySlot, weaponReadiness);
    this.primarySlot.setAttribute('aria-label', `Primary E, ${galactic.weaponName}, ${weaponState}`);
    this.primarySlot.title = `${galactic.weaponName} [E] • ${weaponState}`;
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

    write(this.mineCount, String(galactic.mineCount));
    this.setSystemReadiness(this.mineSlot, galactic.mineCount > 0 ? 1 : 0);
    this.mineSlot.setAttribute('aria-label', `Mine F, ${galactic.mineCount} remaining`);
    this.mineSlot.title = `Mine [F] • ${galactic.mineCount} remaining`;
    this.updateMeter(this.redlineFill, this.redlineValue, galactic.redlineHeat);
    const redlinePercent = Math.round(galactic.redlineHeat * 100);
    const redlineVisible = model.phase !== 'finished'
      && model.preRace?.active !== true;
    this.redlineInstrument.classList.toggle('is-active', galactic.redlineActive);
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

    const wrecked = galactic.wreckPhase !== null;
    const recovering = galactic.wreckPhase === 'recovering';
    const wreckLabel = recovering ? 'Recovering' : 'Wrecked';
    const redlineCritical = galactic.redlineHeat >= 0.9;
    const alertVisible = wrecked || galactic.statusLabel !== null || redlineCritical;
    write(
      this.galacticAlertLabel,
      wrecked
        ? wreckLabel
        : galactic.statusLabel ?? (redlineCritical ? 'Redline critical' : ''),
    );
    write(
      this.galacticAlertDetail,
      wrecked
        ? `${recovering ? 'Control link' : 'Recovery'} // ${galactic.wreckTimer.toFixed(1)} S`
        : redlineCritical
          ? 'Core heat // Vent or release'
          : galactic.weaponTarget
            ? `Target // ${galactic.weaponTarget}`
            : '',
    );
    this.galacticAlert.style.setProperty('--pod-alert-intensity', galactic.statusIntensity.toFixed(3));
    this.galactic.classList.toggle('is-wrecked', galactic.wreckPhase === 'wrecked');
    this.galactic.classList.toggle('is-recovering', recovering);
    this.galacticAlert.classList.toggle('is-wrecked', galactic.wreckPhase === 'wrecked');
    this.galacticAlert.classList.toggle('is-recovering', recovering);
    this.galacticAlert.classList.toggle('is-critical', redlineCritical || galactic.statusIntensity >= 0.72);
    setVisible(this.galacticAlert, alertVisible && model.phase !== 'finished' && !model.wrongWay);
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
      write(requireElement(button, 'span'), highlight.kind.replace('-', ' '));
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
    lap.textContent = result.bestLap === null ? 'BEST —' : `BEST ${formatRaceTime(result.bestLap)}`;
    row.append(placement, name, time, lap);
    return row;
  }
}
