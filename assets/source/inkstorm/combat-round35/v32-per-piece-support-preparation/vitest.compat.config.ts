import { defineConfig } from 'vitest/config';
import { existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const project = '/Users/amir/Projects/PodRacing';
const preparation = `${project}/assets/source/inkstorm/combat-round35/v32-per-piece-support-preparation`;
const candidate = `${preparation}/candidate`;
const baseline = `${preparation}/baseline`;
const sourceFile = (path: string): string | undefined => {
  for (const name of [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) if (existsSync(name) && statSync(name).isFile()) return name;
};

export default defineConfig({
  plugins: [{
    name: 'v32-private-per-piece-support', enforce: 'pre',
    resolveId(source, importer) {
      const absolute = source.startsWith('.') && importer ? resolve(dirname(importer), source) : source;
      // Pinned V23 references resolve their changed siblings in baseline first.
      // Unchanged dependencies can use live source; no live files are written.
      if (absolute.startsWith(`${baseline}/src/`)) {
        return sourceFile(absolute) ?? sourceFile(absolute.replace(baseline, project)) ?? null;
      }
      if (absolute.startsWith(`${candidate}/src/`)) {
        return sourceFile(absolute) ?? sourceFile(absolute.replace(candidate, project)) ?? null;
      }
      if (absolute.startsWith(`${project}/src/`) && !importer?.startsWith(baseline)) {
        return sourceFile(absolute.replace(project, candidate)) ?? null;
      }
      if (absolute.startsWith(`${candidate}/tests/`)) return sourceFile(absolute) ?? sourceFile(absolute.replace(candidate, project)) ?? null;
      return null;
    },
  }],
  test: {
    environment: 'node', maxWorkers: 1, fileParallelism: false,
    include: [`${preparation}/candidate/tests/**/*.test.ts`,
      `${project}/tests/render/GalacticEffectsView.test.ts`,
      `${project}/tests/render/WreckFootprintEffects.test.ts`,
      `${project}/tests/render/WreckContactConsequence.test.ts`,
      `${project}/tests/combat/WreckContactBeat.test.ts`,
      `${project}/tests/combat/TeemtoGroundFootprint.test.ts`,
      `${project}/tests/combat/TeemtoFrontCatch.test.ts`,
      `${project}/tests/combat/AuthoredAftermath.test.ts`,
      `${project}/tests/render/AuthoredRuptureBeat.test.ts`,
      `${project}/tests/render/RuptureAtlasIntegration.test.ts`,
      `${project}/tests/render/RupturePressureScale.test.ts`,
      `${project}/tests/render/GalacticEffectsContact.test.ts`,

      `${project}/tests/render/DirectionalRuptureLifecycle.test.ts`,
      `${project}/tests/render/RuptureFlameAtlas.test.ts`,
    ],
  },
});
