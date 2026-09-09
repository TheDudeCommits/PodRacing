import type {
  HudCourseBranchViewModel,
  HudCoursePoint,
  HudRacerViewModel,
} from './types';

const RACER_COLORS = [
  '#fbef8b', '#f45a46', '#53d9ff', '#c67cff',
  '#70ed9a', '#ff9f43', '#f779c8', '#89a7ff',
] as const;

const BRANCH_COLORS: Readonly<Record<NonNullable<HudCoursePoint['branchKind']>, string>> = {
  safe: '#e8b85d',
  shortcut: '#ffcf55',
  jump: '#ff9855',
  salvage: '#f2b55f',
  technical: '#dca74b',
};

const EMPTY_BRANCHES: readonly HudCourseBranchViewModel[] = Object.freeze([]);

interface MapBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function getBounds(points: readonly HudCoursePoint[]): MapBounds {
  if (points.length === 0) return { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const x = finite(point.x);
    const z = finite(point.z);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxZ - minZ);
  return {
    minX: minX - width * 0.04,
    maxX: maxX + width * 0.04,
    minZ: minZ - height * 0.04,
    maxZ: maxZ + height * 0.04,
  };
}

export class MinimapCanvas {
  readonly canvas: HTMLCanvasElement;

  private readonly context: CanvasRenderingContext2D;
  private course: readonly HudCoursePoint[] = [];
  private courseBranchesInput: readonly HudCourseBranchViewModel[] = EMPTY_BRANCHES;
  private canonicalCourse: readonly HudCoursePoint[] = [];
  private branchCourses: readonly Readonly<{
    id: string;
    kind: NonNullable<HudCoursePoint['branchKind']>;
    points: readonly HudCoursePoint[];
    status?: 'warning' | 'open';
  }>[] = [];
  private bounds: MapBounds = getBounds([]);
  private cssWidth = 0;
  private cssHeight = 0;
  private pixelRatio = 1;
  private resizeObserver: ResizeObserver | null = null;
  private racers: readonly HudRacerViewModel[] = [];
  private raceTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('The podracing minimap requires a 2D canvas context.');
    this.context = context;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.syncSize()) this.draw(this.racers, this.raceTime);
      });
      this.resizeObserver.observe(canvas);
    }
    this.syncSize();
  }

  update(
    course: readonly HudCoursePoint[],
    racers: readonly HudRacerViewModel[],
    raceTime: number,
    courseBranches: readonly HudCourseBranchViewModel[] = EMPTY_BRANCHES,
  ): void {
    this.racers = racers;
    this.raceTime = raceTime;
    if (course !== this.course || courseBranches !== this.courseBranchesInput) {
      this.course = course;
      this.courseBranchesInput = courseBranches;
      this.canonicalCourse = course.filter((point) => !point.branchId);
      if (courseBranches.length > 0) {
        this.branchCourses = courseBranches;
      } else {
        const branchGroups = new Map<string, HudCoursePoint[]>();
        for (const point of course) {
          if (!point.branchId) continue;
          const points = branchGroups.get(point.branchId) ?? [];
          points.push(point);
          branchGroups.set(point.branchId, points);
        }
        this.branchCourses = [...branchGroups].map(([id, points]) => ({
          id,
          kind: points[0]?.branchKind ?? 'technical',
          points,
        }));
      }
      this.bounds = getBounds([
        ...this.canonicalCourse,
        ...this.branchCourses.flatMap((branch) => branch.points),
      ]);
    }
    this.syncSize();
    this.draw(racers, raceTime);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  private syncSize(): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 206));
    const height = Math.max(1, Math.round(rect.height || 206));
    const ratio = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1));
    if (width === this.cssWidth && height === this.cssHeight && ratio === this.pixelRatio) return false;
    this.cssWidth = width;
    this.cssHeight = height;
    this.pixelRatio = ratio;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    return true;
  }

  private draw(racers: readonly HudRacerViewModel[], raceTime: number): void {
    const context = this.context;
    const width = this.cssWidth;
    const height = this.cssHeight;
    const ratio = this.pixelRatio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const pad = Math.max(16, Math.min(width, height) * 0.1);
    const mapWidth = width - pad * 2;
    const mapHeight = height - pad * 2;
    const boundsWidth = Math.max(1, this.bounds.maxX - this.bounds.minX);
    const boundsHeight = Math.max(1, this.bounds.maxZ - this.bounds.minZ);
    const scale = Math.min(mapWidth / boundsWidth, mapHeight / boundsHeight);
    const offsetX = (width - boundsWidth * scale) * 0.5;
    const offsetY = (height - boundsHeight * scale) * 0.5;
    const project = (x: number, z: number): readonly [number, number] => [
      offsetX + (finite(x) - this.bounds.minX) * scale,
      height - (offsetY + (finite(z) - this.bounds.minZ) * scale),
    ];

    if (this.canonicalCourse.length >= 2) {
      const traceCourse = (points: readonly HudCoursePoint[], close: boolean): void => {
        const first = points[0];
        if (!first) return;
        const firstPoint = project(first.x, first.z);
        context.beginPath();
        context.moveTo(firstPoint[0], firstPoint[1]);
        for (let index = 1; index < points.length; index += 1) {
          const point = points[index];
          if (!point) continue;
          const mapped = project(point.x, point.z);
          context.lineTo(mapped[0], mapped[1]);
        }
        if (close) context.closePath();
      };

      context.lineJoin = 'round';
      context.lineCap = 'round';
      traceCourse(this.canonicalCourse, true);
      context.strokeStyle = '#100b1b';
      context.lineWidth = 10;
      context.stroke();
      traceCourse(this.canonicalCourse, true);
      context.strokeStyle = '#6b3b35';
      context.lineWidth = 5;
      context.stroke();
      traceCourse(this.canonicalCourse, true);
      context.strokeStyle = '#78f29a';
      context.lineWidth = 2;
      context.stroke();

      // Alternate routes are deliberately open paths: closing one would draw
      // an invented diagonal from exit back to entry. A dark under-stroke
      // keeps them readable over every regional palette.
      for (const branch of this.branchCourses) {
        if (branch.points.length < 2) continue;
        const emphasized = branch.status === 'warning' || branch.status === 'open';
        traceCourse(branch.points, false);
        context.strokeStyle = '#100b1b';
        context.lineWidth = emphasized ? 8 : 6;
        context.stroke();
        traceCourse(branch.points, false);
        context.strokeStyle = branch.status === 'open'
          ? '#78f29a'
          : branch.status === 'warning'
            ? '#fbef8b'
            : BRANCH_COLORS[branch.kind];
        context.lineWidth = emphasized ? 4 : 2.5;
        context.setLineDash(emphasized || branch.kind === 'safe' ? [] : [5, 3]);
        context.stroke();
        context.setLineDash([]);

        // A pair of directional chevrons turns a short gold dash into an
        // immediately recognizable alternate route. Director-open branches
        // receive a LIVE entry badge without adding permanent HUD copy.
        for (const fraction of [0.42, 0.7]) {
          const pointIndex = Math.max(1, Math.min(
            branch.points.length - 2,
            Math.round((branch.points.length - 1) * fraction),
          ));
          const before = branch.points[pointIndex - 1];
          const point = branch.points[pointIndex];
          const after = branch.points[pointIndex + 1];
          if (!before || !point || !after) continue;
          const mapped = project(point.x, point.z);
          const mappedBefore = project(before.x, before.z);
          const mappedAfter = project(after.x, after.z);
          const dx = mappedAfter[0] - mappedBefore[0];
          const dy = mappedAfter[1] - mappedBefore[1];
          const length = Math.max(1, Math.hypot(dx, dy));
          const tx = dx / length;
          const ty = dy / length;
          const nx = -ty;
          const ny = tx;
          const size = emphasized ? 5.5 : 4.2;
          context.beginPath();
          context.moveTo(mapped[0] - tx * size + nx * size * 0.72, mapped[1] - ty * size + ny * size * 0.72);
          context.lineTo(mapped[0] + tx * size, mapped[1] + ty * size);
          context.lineTo(mapped[0] - tx * size - nx * size * 0.72, mapped[1] - ty * size - ny * size * 0.72);
          context.strokeStyle = branch.status === 'open' ? '#fbef8b' : '#fff0a8';
          context.lineWidth = emphasized ? 2.4 : 1.6;
          context.stroke();
        }

        const entry = branch.points[0];
        if (entry) {
          const mapped = project(entry.x, entry.z);
          context.fillStyle = branch.status === 'open' ? '#78f29a' : BRANCH_COLORS[branch.kind];
          context.strokeStyle = '#100b1b';
          context.lineWidth = 2;
          context.beginPath();
          context.arc(mapped[0], mapped[1], emphasized ? 5 : 3.5, 0, Math.PI * 2);
          context.fill();
          context.stroke();
          if (emphasized) {
            context.font = '900 7px system-ui, sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'bottom';
            context.fillStyle = '#fbef8b';
            context.fillText(branch.status === 'open' ? 'LIVE' : 'SOON', mapped[0], mapped[1] - 7);
          }
        }
      }

      const first = this.canonicalCourse[0];
      const second = this.canonicalCourse[1];
      if (first && second) {
        const start = project(first.x, first.z);
        const next = project(second.x, second.z);
        const dx = next[0] - start[0];
        const dy = next[1] - start[1];
        const length = Math.max(1, Math.hypot(dx, dy));
        const nx = -dy / length;
        const ny = dx / length;
        context.strokeStyle = '#fbef8b';
        context.lineWidth = 2.5;
        context.beginPath();
        context.moveTo(start[0] - nx * 7, start[1] - ny * 7);
        context.lineTo(start[0] + nx * 7, start[1] + ny * 7);
        context.stroke();
      }
    }

    const ordered = [...racers].sort((a, b) => Number(a.isPlayer) - Number(b.isPlayer));
    const placedMarkers: Array<readonly [number, number]> = [];
    for (let index = 0; index < ordered.length; index += 1) {
      const racer = ordered[index];
      if (!racer) continue;
      const projected = project(racer.x, racer.z);
      const mapped: [number, number] = [projected[0], projected[1]];
      const overlapCount = placedMarkers.reduce((count, marker) => (
        Math.hypot(marker[0] - mapped[0], marker[1] - mapped[1]) < 9
          ? count + 1
          : count
      ), 0);
      if (overlapCount > 0) {
        // Eight racers can occupy only a few world metres during launches and
        // battles. Fan coincident dots into a tiny deterministic rosette so
        // the field still reads as eight participants at HUD scale; the
        // displacement is capped well inside the rendered course width.
        const angle = index * 2.399963 + overlapCount * 0.71;
        const offset = Math.min(11, 4.5 + overlapCount * 2.1);
        mapped[0] += Math.cos(angle) * offset;
        mapped[1] += Math.sin(angle) * offset;
      }
      placedMarkers.push(mapped);
      const paletteIndex = Math.max(0, Math.min(RACER_COLORS.length - 1, racer.placement - 1));
      const color = racer.color ?? RACER_COLORS[paletteIndex] ?? RACER_COLORS[0];
      const radius = racer.isPlayer ? 5.6 : 4.1;

      if (racer.isPlayer) {
        const pulse = 8 + (Math.sin(finite(raceTime) * 6) * 0.5 + 0.5) * 3;
        context.strokeStyle = 'rgba(251, 239, 139, 0.42)';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(mapped[0], mapped[1], pulse, 0, Math.PI * 2);
        context.stroke();
      }

      context.fillStyle = '#100b1b';
      context.beginPath();
      context.arc(mapped[0], mapped[1], radius + 2.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = color;
      context.beginPath();
      context.arc(mapped[0], mapped[1], radius, 0, Math.PI * 2);
      context.fill();
      if (racer.finished) {
        context.strokeStyle = '#f9f2d0';
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(mapped[0] - 3, mapped[1] - 3);
        context.lineTo(mapped[0] + 3, mapped[1] + 3);
        context.moveTo(mapped[0] + 3, mapped[1] - 3);
        context.lineTo(mapped[0] - 3, mapped[1] + 3);
        context.stroke();
      }
    }
  }
}
