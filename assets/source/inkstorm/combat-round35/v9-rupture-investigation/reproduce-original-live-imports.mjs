// CPU only. Run from repository root with Node 24; no browser or state writes.
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); } catch (error) {
      if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
        const base = fileURLToPath(new URL(specifier, context.parentURL));
        for (const path of [base + '.ts', base + '/index.ts']) {
          if (existsSync(path)) return { url: pathToFileURL(path).href, shortCircuit: true };
        }
      }
      throw error;
    }
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return { format: 'module', source: stripTypeScriptTypes(
      readFileSync(fileURLToPath(url), 'utf8'), { mode: 'transform' },
    ), shortCircuit: true };
    return next(url, context);
  },
});
const fromRoot = path => import(pathToFileURL(process.cwd() + '/' + path).href);
const { RaceSimulation } = await fromRoot('src/game/race/RaceSimulation.ts');
const { sampleTerrainHeight } = await fromRoot('src/render/terrain/terrainMath.ts');
const { TEEMTO_ART_DEFINITIONS } = await fromRoot('src/game/vehicleAppearance.ts');
const { GameApp } = await fromRoot('src/render/app/GameApp.ts');
const { GalacticEffectsView } = await fromRoot('src/render/galactic/GalacticEffectsView.ts');
const { Group, Matrix4, Vector3 } = await import('three');
const receipt = JSON.parse(readFileSync('output/playwright/round35-combat-v9/receipt.json', 'utf8'));
const nativeCase = receipt.cases[0];
const race = new RaceSimulation({ terrain: { heightAt: sampleTerrainHeight }, seed: 1229867859,
  totalLaps: 1, countdownSeconds: 3, competitionProfile: 'time-trial' });
const comparisons = []; let birth, events;
for (let frame = 1; frame <= 922; frame++) {
  const result = race.step({ brake: 1, boost: frame >= 558 && frame <= 910 });
  if (frame === 910) { birth = structuredClone(race.state.entries[0]); events = result.galacticEvents; }
  const capture = nativeCase.captures.find(item => item.snapshot.simulationFrame === frame);
  if (capture) {
    const vehicle = race.state.entries[0].vehicle, snapshot = capture.snapshot;
    comparisons.push({ name: capture.name, frame,
      positionExact: Object.values(vehicle.position).every((value, index) => value === snapshot.game.position[index]),
      yawExact: vehicle.orientation.yaw === snapshot.game.yaw,
      raceTimeExact: race.state.raceTime === snapshot.raceTime,
      redlineHeatExact: race.state.entries[0].galactic.redline.heat === snapshot.game.redlineHeat });
  }
}
const view = new Group(), anchor = new Group(), effects = new GalacticEffectsView();
anchor.position.fromArray(TEEMTO_ART_DEFINITIONS.hero.attachments.exhaustRight.position);
view.add(anchor); Object.assign(view, { importedActive: true, imported: { getAttachment: () => anchor } });
let emitted;
GameApp.prototype.consumeGalacticEffects.call({ race: { state: { entries: [birth] }, terrain: race.terrain },
  racerViews: [view], localRacerId: () => 'player', galacticEffects: { emitCrash(event) {
    emitted = structuredClone(event); effects.emitCrash(event);
  } } }, events, 910 / 120);
const lifecycle = [], matrix = new Matrix4(), point = new Vector3();
for (const age of [0, .025, .05, .075, .1, .14, .2, .3, .5, .8]) {
  effects.update(emitted.time + age);
  const plates = [];
  for (let index = 0; index < effects.explosionPlates.count; index++) {
    effects.explosionPlates.getMatrixAt(index, matrix); point.setFromMatrixPosition(matrix);
    const surface = effects.explosionPlates.geometry.getAttribute('aEffectSurface');
    plates.push({ kind: surface.getX(index), opacity: surface.getY(index), y: point.y,
      centerBelowTerrain: race.terrain.heightAt(point.x, point.z) - point.y,
      radius: new Vector3().setFromMatrixScale(matrix).x });
  }
  lifecycle.push({ age, plates, debris: effects.crashDebris.count });
}
console.log(JSON.stringify({ comparisons, birth, at922: race.state.entries[0], emitted,
  emitterBelowTerrain: emitted.groundY - emitted.position.y, lifecycle,
  note: 'CPU reconstruction exact at saved native checkpoints; no pixel/video clock synchronization claim.' }, null, 2));
effects.dispose();
