/**
 * Renderer-free race highlight recorder.
 *
 * The recorder deliberately stores a sparse pose history rather than Three.js
 * objects. Results cameras, DOM cards, deterministic captures and online
 * guests can all consume the same JSON-safe package.
 */

export type RaceHighlightKind =
  | 'perfect-launch'
  | 'slingshot'
  | 'overtake'
  | 'takedown'
  | 'wreck'
  | 'director-event'
  | 'finish'
  | 'photo-finish';

export interface HighlightRacerPose {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  progress: number;
  placement: number | null;
}

export interface RaceHighlightFrame {
  time: number;
  racers: readonly HighlightRacerPose[];
}

export interface RaceHighlightMoment {
  id: string;
  kind: RaceHighlightKind;
  time: number;
  severity: number;
  racerId: string | null;
  otherRacerId: string | null;
  label: string;
  frameIndex: number;
}

export interface RaceHighlightPackage {
  version: 1;
  frames: readonly RaceHighlightFrame[];
  moments: readonly RaceHighlightMoment[];
  photoFinishGap: number | null;
}

export interface HighlightEntryLike {
  id: string;
  vehicle: {
    position: { x: number; y: number; z: number };
    orientation: { yaw: number };
    telemetry: { speed: number };
  };
  progress: {
    courseProgress: number;
    placement: number | null;
    finishTime: number | null;
  };
}

export interface HighlightEventLike {
  type: string;
  [key: string]: unknown;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function eventString(event: HighlightEventLike, key: string): string | null {
  const value = event[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function eventNumber(event: HighlightEventLike, key: string, fallback: number): number {
  const value = event[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function classifyEvent(event: HighlightEventLike): Omit<RaceHighlightMoment, 'id' | 'time' | 'frameIndex'> | null {
  const racerId = eventString(event, 'racerId')
    ?? eventString(event, 'attackerId')
    ?? eventString(event, 'ownerId');
  switch (event.type) {
    case 'launch-result': {
      const quality = eventString(event, 'quality') ?? eventString(event, 'outcome') ?? 'launch';
      if (quality !== 'perfect') return null;
      return {
        kind: 'perfect-launch', severity: 1.45, racerId,
        otherRacerId: null, label: 'PERFECT LAUNCH',
      };
    }
    case 'draft-slingshot':
    case 'slingshot':
      return {
        kind: 'slingshot', severity: 1.15, racerId,
        otherRacerId: eventString(event, 'targetId') ?? eventString(event, 'leaderId'),
        label: 'SLINGSHOT',
      };
    case 'overtake':
      return {
        kind: 'overtake', severity: 0.82, racerId,
        otherRacerId: eventString(event, 'passedId'), label: 'OVERTAKE',
      };
    case 'takedown':
      return {
        kind: 'takedown', severity: 1.7, racerId,
        otherRacerId: eventString(event, 'victimId') ?? eventString(event, 'targetId'),
        label: 'TAKEDOWN',
      };
    case 'wreck':
      return {
        kind: 'wreck', severity: 1.35, racerId,
        otherRacerId: eventString(event, 'takedownBy') ?? eventString(event, 'sourceId'),
        label: 'WRECK',
      };
    case 'director-event':
    case 'race-director-event':
    case 'director-start':
      return {
        kind: 'director-event', severity: eventNumber(event, 'intensity', 1), racerId,
        otherRacerId: null,
        label: (eventString(event, 'label')
          ?? eventString(event, 'eventKind')
          ?? eventString(event, 'kind')
          ?? 'COURSE EVENT')
          .replaceAll('-', ' ').toUpperCase(),
      };
    case 'finish':
      return {
        kind: 'finish', severity: 1.25, racerId,
        otherRacerId: null, label: 'FINISH',
      };
    default:
      return null;
  }
}

export class RaceHighlightRecorder {
  private readonly maximumFrames: number;
  private readonly sampleInterval: number;
  private readonly frames: RaceHighlightFrame[] = [];
  private readonly moments: RaceHighlightMoment[] = [];
  private lastSampleTime = Number.NEGATIVE_INFINITY;
  private sequence = 0;

  constructor(options: { historySeconds?: number; sampleHz?: number } = {}) {
    // Five minutes remains a strict bound while retaining a complete typical
    // three-lap race for the results replay camera.
    const historySeconds = clamp(options.historySeconds ?? 14, 4, 300);
    const sampleHz = clamp(options.sampleHz ?? 15, 5, 30);
    this.maximumFrames = Math.ceil(historySeconds * sampleHz);
    this.sampleInterval = 1 / sampleHz;
  }

  recordFrame(time: number, entries: readonly HighlightEntryLike[]): boolean {
    if (!Number.isFinite(time) || time < this.lastSampleTime + this.sampleInterval - 1e-8) {
      return false;
    }
    this.lastSampleTime = time;
    this.frames.push({
      time,
      racers: entries.map((entry) => ({
        id: entry.id,
        x: entry.vehicle.position.x,
        y: entry.vehicle.position.y,
        z: entry.vehicle.position.z,
        yaw: entry.vehicle.orientation.yaw,
        speed: entry.vehicle.telemetry.speed,
        progress: entry.progress.courseProgress,
        placement: entry.progress.placement,
      })),
    });
    if (this.frames.length > this.maximumFrames) {
      const removed = this.frames.length - this.maximumFrames;
      this.frames.splice(0, removed);
      for (const moment of this.moments) moment.frameIndex = Math.max(0, moment.frameIndex - removed);
    }
    return true;
  }

  consumeEvents(time: number, events: readonly HighlightEventLike[]): void {
    for (const event of events) {
      const classified = classifyEvent(event);
      if (!classified) continue;
      this.sequence += 1;
      this.moments.push({
        id: `highlight-${this.sequence}`,
        ...classified,
        time,
        frameIndex: Math.max(0, this.frames.length - 1),
      });
    }
    if (this.moments.length > 32) this.moments.splice(0, this.moments.length - 32);
  }

  snapshot(entries: readonly HighlightEntryLike[]): RaceHighlightPackage {
    const finishers = entries
      .flatMap((entry) => entry.progress.finishTime === null ? [] : [{
        id: entry.id,
        time: entry.progress.finishTime,
      }])
      .sort((left, right) => left.time - right.time);
    const leading = finishers[0];
    const runnerUp = finishers[1];
    const gap = leading && runnerUp ? Math.max(0, runnerUp.time - leading.time) : null;
    const moments = this.moments.map((moment) => ({ ...moment }));
    if (gap !== null && gap <= 0.18 && leading && runnerUp) {
      moments.push({
        id: 'highlight-photo-finish',
        kind: 'photo-finish',
        time: runnerUp.time,
        severity: 2,
        racerId: leading.id,
        otherRacerId: runnerUp.id,
        label: `PHOTO FINISH · ${gap.toFixed(3)}S`,
        frameIndex: Math.max(0, this.frames.length - 1),
      });
    }
    return {
      version: 1,
      frames: this.frames.map((frame) => ({
        time: frame.time,
        racers: frame.racers.map((racer) => ({ ...racer })),
      })),
      moments: moments
        .sort((left, right) => right.severity - left.severity || left.time - right.time)
        .slice(0, 8),
      photoFinishGap: gap !== null && gap <= 0.18 ? gap : null,
    };
  }

  reset(): void {
    this.frames.length = 0;
    this.moments.length = 0;
    this.lastSampleTime = Number.NEGATIVE_INFINITY;
    this.sequence = 0;
  }
}
