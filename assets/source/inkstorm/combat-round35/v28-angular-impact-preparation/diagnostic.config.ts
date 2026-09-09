import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const project = '/Users/amir/Projects/PodRacing';
const preparation = `${project}/assets/source/inkstorm/combat-round35/v28-angular-impact-preparation`;
const candidate = `${preparation}/candidate`;
const baseline = `${preparation}/baseline`;
const sourceFile = (path: string): string | undefined => {
  for (const name of [path, `${path}.ts`, `${path}.tsx`]) if (existsSync(name)) return name;
};

export default defineConfig({
  plugins: [{
    name: 'v28-private-angular-sources', enforce: 'pre',
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
    include: [`${preparation}/diagnostic/TrajectoryDiagnostic.test.ts`],
  },
});
