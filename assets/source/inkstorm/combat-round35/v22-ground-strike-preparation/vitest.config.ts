import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
const root = process.cwd();
const base = resolve(root, 'assets/source/inkstorm/combat-round35/v22-ground-strike-preparation');
const targets = new Map([["/Users/amir/Projects/PodRacing/src/render/combat/TeemtoAuthoredDamage.ts", "/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v22-ground-strike-preparation/test-runtime/TeemtoAuthoredDamage.ts"], ["/Users/amir/Projects/PodRacing/src/render/combat/WreckGroundContact.ts", "/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v22-ground-strike-preparation/test-runtime/WreckGroundContact.ts"], ["/Users/amir/Projects/PodRacing/src/render/galactic/GalacticEffectsView.ts", "/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v22-ground-strike-preparation/test-runtime/GalacticEffectsView.ts"], ["/Users/amir/Projects/PodRacing/src/render/app/GameApp.ts", "/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/v22-ground-strike-preparation/test-runtime/GameApp.ts"]]);
export default defineConfig({
  plugins: [{ name: 'private-v20-runtime-candidate', enforce: 'pre', resolveId(source, importer) {
    const absolute = source.startsWith('.') && importer ? resolve(dirname(importer), source) : source;
    return targets.get(absolute) ?? targets.get(absolute + '.ts') ?? null;
  }}],
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'assets/source/inkstorm/combat-round35/v22-ground-strike-preparation/*.test.ts'], maxWorkers: 1, fileParallelism: false },
});
