import { describe, expect, it } from 'vitest';
import { createGalacticRacerState, GALACTIC_VEHICLES } from '../../src/game/galactic';
import { DEFAULT_GAME_SETTINGS } from '../../src/game/settings';
import {
  createSettingsHudViewModel,
  createVehicleSelectionViewModel,
  createWorkshopHudViewModel,
  deriveGalacticHudViewModel,
  HUD_SOLO_LOBBY,
  HUD_VEHICLE_CARDS,
  PODRACING_HUD_CSS,
  type HudLobbyViewModel,
} from '../../src/ui';

describe('Galactic Racer HUD model', () => {
  it('builds four distinct pre-race cards from the canonical vehicle catalog', () => {
    const selection = createVehicleSelectionViewModel('skim-speeder');

    expect(selection).toMatchObject({
      active: true,
      selectedVehicleClass: 'skim-speeder',
      selectedLaps: 3,
      aiDifficulty: 'medium',
      raceMode: 'circuit',
      lobby: HUD_SOLO_LOBBY,
    });
    expect(Object.keys(selection).sort()).toEqual([
      'active',
      'aiDifficulty',
      'cards',
      'lobby',
      'raceMode',
      'selectedLaps',
      'selectedVehicleClass',
      'workshop',
    ]);
    expect(selection.cards).toHaveLength(4);
    expect(new Set(selection.cards.map((card) => card.id)).size).toBe(4);
    expect(selection.cards).toBe(HUD_VEHICLE_CARDS);

    for (const card of selection.cards) {
      const definition = GALACTIC_VEHICLES[card.id];
      expect(card.name).toBe(definition.label);
      expect(Object.keys(card).sort()).toEqual(['accent', 'description', 'id', 'name', 'stats']);
      expect(card.description).toMatch(/^[^\n]{20,80}$/);
      expect(card.stats).toEqual([
        { label: 'Speed', value: definition.stats.speed },
        { label: 'Acceleration', value: definition.stats.acceleration },
        { label: 'Drift', value: definition.stats.drift },
        { label: 'Defense', value: definition.stats.defence },
        { label: 'Weapons', value: definition.stats.weapons },
      ]);
    }
  });

  it('projects five workshop slots, named tradeoffs, and saved settings without callbacks', () => {
    const workshop = createWorkshopHudViewModel('podracer', undefined, {
      open: true,
      activeSlot: 'cooling',
    });
    expect(workshop.open).toBe(true);
    expect(workshop.activeSlot).toBe('cooling');
    expect(workshop.slots.map((slot) => slot.slot)).toEqual([
      'engine', 'cooling', 'armour', 'steering', 'gadget',
    ]);
    expect(workshop.parts).toHaveLength(20);
    expect(workshop.parts.filter((part) => part.equipped)).toHaveLength(5);
    expect(workshop.parts.every((part) => part.benefit.length > 3 && part.tradeoff.length > 3)).toBe(true);
    expect(workshop.summary.synergies.length).toBeGreaterThan(0);

    const settings = createSettingsHudViewModel(DEFAULT_GAME_SETTINGS, {
      open: true,
      activeTab: 'comfort',
    });
    expect(settings).toMatchObject({
      open: true,
      activeTab: 'comfort',
      comfort: DEFAULT_GAME_SETTINGS.comfort,
      audio: DEFAULT_GAME_SETTINGS.audio,
    });
    expect(settings.controls.bindings.some((binding) => binding.action === 'mine')).toBe(true);
    expect(JSON.parse(JSON.stringify({ workshop, settings }))).toMatchObject({
      workshop: { activeSlot: 'cooling' },
      settings: { activeTab: 'comfort' },
    });
  });

  it('keeps the lap and online-room selector contract JSON-safe', () => {
    const lobby = {
      role: 'guest',
      roomCode: 'A1B2C3',
      status: 'waiting',
      statusText: 'Waiting for host',
      members: [
        { id: 'host-1', name: 'Boonta Host', isHost: true, isLocal: false },
        { id: 'guest-1', name: 'You', isHost: false, isLocal: true },
      ],
      capacity: 4,
      canStart: false,
    } satisfies HudLobbyViewModel;

    const selection = createVehicleSelectionViewModel('speeder-bike', true, {
      selectedLaps: 2,
      lobby,
    });

    expect(selection).toMatchObject({
      selectedVehicleClass: 'speeder-bike',
      selectedLaps: 2,
      lobby,
    });
    expect(JSON.parse(JSON.stringify(selection))).toMatchObject({
      selectedLaps: 2,
      lobby: {
        role: 'guest',
        roomCode: 'A1B2C3',
        status: 'waiting',
        capacity: 4,
        canStart: false,
      },
    });
  });

  it('keeps the selection layer opaque and free of continuous prompt animation', () => {
    expect(PODRACING_HUD_CSS).toContain('background-color: #100b1b');
    expect(PODRACING_HUD_CSS).toContain('contain: layout paint style');
    expect(PODRACING_HUD_CSS).not.toContain('pod-start-pulse');
    expect(PODRACING_HUD_CSS).not.toContain('.pod-hud__mute');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__selector-control-grid');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__lap-selector');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__room-actions');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__difficulty-selector');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__workshop-part.is-equipped');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__settings-tabs');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__threat-cue.is-critical');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__result-highlight.is-photo-finish');
  });

  it('keeps the racing HUD on compact edge instruments', () => {
    expect(PODRACING_HUD_CSS).toContain('--pod-readiness-angle');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__course-finish-flag');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__target-reticle');
    expect(PODRACING_HUD_CSS).toContain('repeating-linear-gradient(to top');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__redline-heat.is-critical');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__launch-sweet');
    expect(PODRACING_HUD_CSS).toContain('attr(data-highlight-title)');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__mode-status.has-progress');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__director-event[data-phase="active"]');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__minimap { display: block; width: 100%; height: 100%; }');
    expect(PODRACING_HUD_CSS).toContain('pointer-events: auto;\n  touch-action: manipulation;');
    expect(PODRACING_HUD_CSS).toContain('.pod-hud__result-moments button:focus-visible');
    expect(PODRACING_HUD_CSS).not.toContain('.pod-hud__minimap { width: 1px; height: 1px; }');
    expect(PODRACING_HUD_CSS).not.toContain('.pod-hud__combat-slot--redline');
    expect(PODRACING_HUD_CSS).not.toContain('.pod-hud__galactic-head');
  });

  it('can close the selection surface without discarding the locked class', () => {
    expect(createVehicleSelectionViewModel('landspeeder', false)).toMatchObject({
      active: false,
      selectedVehicleClass: 'landspeeder',
    });
  });

  it('derives the exact shield, Heat Lance, mine, redline and class contract', () => {
    const state = createGalacticRacerState('landspeeder');
    Object.assign(state.shield, { active: true, remaining: 1.25, cooldown: 4.4 });
    Object.assign(state.weapon, { cooldown: 0.45, shotsFired: 17, hits: 9 });
    Object.assign(state.mine, { charges: 5, deployed: 2 });
    Object.assign(state.redline, { active: true, heat: 0.86 });
    state.takedowns = 3;

    const model = deriveGalacticHudViewModel(state);

    expect(model).toMatchObject({
      vehicleClass: 'Armoured Landspeeder',
      shieldRemaining: 1.25,
      shieldActive: true,
      shieldCooldown: 4.4,
      shieldDuration: 1.7,
      weaponName: 'Heat Lance',
      weaponCooldown: 0.45,
      weaponCooldownDuration: 0.9,
      weaponShots: 17,
      weaponHits: 9,
      mineCount: 5,
      redlineHeat: 0.86,
      redlineActive: true,
      takedowns: 3,
      wreckPhase: null,
    });
  });

  it('chooses the strongest status and only alerts for wrecked/recovering phases', () => {
    const state = createGalacticRacerState();
    Object.assign(state.status, {
      sandGeyser: 0.35,
      heatVent: 0.72,
      rockfallStun: 0.94,
      dustInterference: 0.6,
      ionized: 0.81,
    });
    state.upgrades.afterburner = 2;
    state.upgrades.cornering = 1;
    state.upgrades.parts.push('pulse-capacitor', 'landing-recuperator');

    const running = deriveGalacticHudViewModel(state)!;
    expect(running.statusLabel).toBe('rockfall stun');
    expect(running.statusIntensity).toBe(0.94);
    expect(running.wreckPhase).toBeNull();
    expect(running.upgrades).toEqual([
      'afterburner 2',
      'cornering 1',
      'pulse capacitor',
      'landing recuperator',
    ]);

    state.wreck.phase = 'wrecked';
    state.wreck.timer = 2.15;
    const wrecked = deriveGalacticHudViewModel(state)!;
    expect(wrecked.wreckPhase).toBe('wrecked');
    expect(wrecked.wreckTimer).toBe(2.15);

    state.wreck.phase = 'recovering';
    state.wreck.timer = 0;
    state.wreck.invulnerable = 1.875;
    const recovering = deriveGalacticHudViewModel(state)!;
    expect(recovering.wreckPhase).toBe('recovering');
    expect(recovering.wreckTimer).toBe(1.875);
  });

  it('keeps legacy entries free of expansion chrome', () => {
    expect(deriveGalacticHudViewModel(undefined)).toBeUndefined();
  });
});
