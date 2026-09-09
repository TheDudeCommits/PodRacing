import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
const root = process.cwd();
const base = resolve(root, 'assets/source/inkstorm/combat-round35/v20-contact-beat');
const targets = new Map([
  ['src/camera/CinematicCamera.ts', 'CinematicCamera.ts'],
  ['src/render/combat/TeemtoAuthoredDamage.ts', 'TeemtoAuthoredDamage.ts'],
  ['src/render/galactic/GalacticEffectsView.ts', 'GalacticEffectsView.ts'],
].map(([source, name]) => [resolve(root, source), resolve(base, 'test-runtime', name)]));
export default defineConfig({
  plugins: [{ name: 'private-v20-runtime-candidate', enforce: 'pre', resolveId(source, importer) {
    const absolute = source.startsWith('.') && importer ? resolve(dirname(importer), source) : source;
    return targets.get(absolute) ?? targets.get(absolute + '.ts') ?? null;
  }}],
  test: { environment: 'node', include: ['tests/**/*.test.ts', 'assets/source/inkstorm/combat-round35/v20-contact-beat/*.test.ts'], maxWorkers: 1, fileParallelism: false },
});
