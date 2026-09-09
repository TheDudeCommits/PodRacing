/** CPU study only: compare clipmap surface triangles to the unchanged physical field. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createProceduralPodraceCourse } from '../src/game/race/course';
import { COURSE_GULF_SEED, createCourseGulfField, getLaunchBasinAnchor } from '../src/game/race/CourseGulfField';
import { sampleTerrainHeight } from '../src/render/terrain/terrainMath';
import { createTerrainRingGeometry } from '../src/render/terrain/createTerrainRingGeometry';

const input = process.argv.find(a => a.startsWith('--input='))?.slice(8) ?? 'output/gauntlet/round-24/receipts.json';
const out = process.argv.find(a => a.startsWith('--output='))?.slice(9) ?? 'output/terrain/round25-interpolation-study';
const source = await readFile(input, 'utf8');
const captures = JSON.parse(source);
const course = createProceduralPodraceCourse({ heightAt: sampleTerrainHeight }, COURSE_GULF_SEED);
const field = createCourseGulfField(course)!;
const anchor = getLaunchBasinAnchor(course)!;
const height = (x: number, z: number) => sampleTerrainHeight(x, z) + field.sampleOffset(x, z);
const plans: { name: string; cells: number[]; centers?: number[] }[] = [
  { name: 'round24', cells: [1.5, 6, 12, 24, 48, 96] },
  { name: 'bounded-refinement', cells: [1.5, 6, 12, 12, 12, 24] },
  { name: 'cell-center-refinement', cells: [1.5, 6, 12, 12, 12, 24], centers: [3, 4] },
];
const views = [...captures.receipts.filter((r: any) => r.section.id === '05-launch').map((r: any) => ({ id: r.section.id, game: r.game })),
  ...captures.supplemental.filter((r: any) => r.view.id.startsWith('launch-')).map((r: any) => ({ id: r.view.id, game: r.game }))];
const sites: { x: number; z: number; height: number; forward: number; right: number }[] = [];
// Non-aligned steps exercise both triangles within cells, not just their vertices.
for (let forward = -30; forward < 1540; forward += 11.3) {
  for (let right = -690; right < 650; right += 13.7) {
    if (Math.abs(right) < 160) continue;
    const x = anchor.x + anchor.tangentX * forward - anchor.rightX * right;
    const z = anchor.z + anchor.tangentZ * forward - anchor.rightZ * right;
    const y = height(x, z);
    if (y > 40 && Math.abs(field.sampleOffset(x, z)) > 20) sites.push({ x, z, height: y, forward, right });
  }
}
function summary(values: number[]) {
  const sorted = values.toSorted((a, b) => a - b);
  return { samples: sorted.length, mean: values.reduce((a, b) => a + b, 0) / values.length,
    rms: Math.sqrt(values.reduce((a, b) => a + b * b, 0) / values.length),
    p95: sorted[Math.floor((sorted.length - 1) * .95)], max: sorted.at(-1) };
}
const reports = [];
for (const plan of plans) {
  const triangles = plan.cells.map((cellSize, level) => {
    const outerHalfExtent = 96 * 2 ** level;
    const geometry = createTerrainRingGeometry({ outerHalfExtent, innerHalfExtent: level ? outerHalfExtent / 2 : 0,
      cellSize, innerBoundaryStep: level ? plan.cells[level - 1]! : cellSize, cellCenters: plan.centers?.includes(level), outerSkirt: level === 5 });
    const count = geometry.index!.count / 3;
    geometry.dispose(); return count;
  });
  const viewReports = views.map((view: any) => {
    const [cameraX, , cameraZ] = view.game.cameraPosition;
    const cache = new Map<string, number>();
    const vertexHeight = (x: number, z: number) => {
      const key = `${x}:${z}`;
      let value = cache.get(key);
      if (value === undefined) { value = height(x, z); cache.set(key, value); }
      return value;
    };
    const errors: number[] = [], byLevel: number[][] = plan.cells.map(() => []);
    let skippedTransition = 0;
    let worst: unknown = null, worstError = -1;
    for (const site of sites) {
      const localX = site.x - cameraX, localZ = site.z - cameraZ;
      const radius = Math.max(Math.abs(localX), Math.abs(localZ));
      const level = Math.max(0, Math.ceil(Math.log2(Math.max(1, radius / 96))));
      if (level > 5) continue;
      const cell = plan.cells[level]!, outer = 96 * 2 ** level, inner = level ? outer / 2 : 0;
      // This study measures the regular triangle surface only. Transition fans
      // have different topology and are tested separately before integration.
      const transitionWidth = Math.max(...plans.map(candidate => candidate.cells[level]!));
      if (level && radius < inner + transitionWidth) { skippedTransition++; continue; }
      const gx = (localX + outer) / cell, gz = (localZ + outer) / cell;
      const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
      const x0 = cameraX - outer + ix * cell, z0 = cameraZ - outer + iz * cell;
      const a = vertexHeight(x0, z0), c = vertexHeight(x0 + cell, z0 + cell);
      let interpolated = fx >= fz
        ? a * (1 - fx) + vertexHeight(x0 + cell, z0) * (fx - fz) + c * fz
        : a * (1 - fz) + vertexHeight(x0, z0 + cell) * (fz - fx) + c * fx;
      if (plan.centers?.includes(level)) {
        const points = [[0, 0, a], [1, 0, vertexHeight(x0 + cell, z0)], [1, 1, c], [0, 1, vertexHeight(x0, z0 + cell)]];
        const mid = vertexHeight(x0 + cell / 2, z0 + cell / 2);
        for (let side = 0; side < 4; side++) {
          const p = points[side]!, q = points[(side + 1) % 4]!;
          const denominator = (q[1]! - .5) * (p[0]! - .5) + (.5 - q[0]!) * (p[1]! - .5);
          const u = ((q[1]! - .5) * (fx - .5) + (.5 - q[0]!) * (fz - .5)) / denominator;
          const v = ((.5 - p[1]!) * (fx - .5) + (p[0]! - .5) * (fz - .5)) / denominator;
          const w = 1 - u - v;
          if (Math.min(u, v, w) >= -1e-9) { interpolated = u * p[2]! + v * q[2]! + w * mid; break; }
        }
      }
      const error = Math.abs(interpolated - site.height);
      errors.push(error); byLevel[level]!.push(error);
      if (error > worstError) { worstError = error; worst = { ...site, interpolated, error, level, cell }; }
    }
    return { id: view.id, camera: view.game.cameraPosition, skippedTransition, errorMetres: summary(errors),
      byLevel: byLevel.map((values, level) => ({ level, cell: plan.cells[level], ...(values.length ? summary(values) : { samples: 0 }) })), worst };
  });
  reports.push({ ...plan, triangles, totalTrianglesPerPass: triangles.reduce((a, b) => a + b, 0), views: viewReports });
}
await mkdir(out, { recursive: true });
const receipt = { source: input, sourceSha256: createHash('sha256').update(source).digest('hex'), sites: sites.length,
  method: 'Regular clipmap triangle barycentric height versus unchanged CPU physical height at actual round24 camera centers. All plans use identical sites: the union of their transition bands is omitted. No terrain or runtime mutation. No GPU, image-quality or performance claim.', reports };
await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
