import type { GalacticRacerState, GalacticWorldState } from '../game/galactic/types';
import type { PlayerInputState } from '../game/input/actions';

export type CapturePreset =
  | 'desert'
  | 'countdown'
  | 'race'
  | 'airtime'
  | 'drift'
  | 'finish';

export type ExpansionCapturePreset =
  | 'vehicle-showcase'
  | 'weapon-fired'
  | 'shield-active'
  | 'mine-trigger'
  | 'hazard'
  | 'redline'
  | 'wreck'
  | 'recovery'
  | 'upgrade'
  | 'combat-stress';

export type ReviewCapturePreset = CapturePreset | ExpansionCapturePreset;

export type CaptureCamera = 'chase' | 'hero' | 'side' | 'course' | 'cockpit';
export type ExpansionCaptureCamera = 'overhead' | 'impact';
export type ReviewCaptureCamera = CaptureCamera | ExpansionCaptureCamera;

export interface ReviewGalacticSnapshot {
  racers: readonly {
    id: string;
    galactic: GalacticRacerState;
    /** Review-only world pose used to prove readable cause-and-effect staging. */
    position?: readonly [number, number, number];
    yaw?: number;
    courseProgress?: number;
    lateralOffset?: number;
  }[];
  world: GalacticWorldState;
  recentEvents: readonly Readonly<Record<string, unknown>>[];
}

export interface ReviewSnapshot {
  preset: CapturePreset;
  camera: CaptureCamera;
  simulationFrame: number;
  raceTime: number;
  renderer: {
    racerShadow?: { size:number; casters:number; candidates:number; omitted:number; triangles:number; drawCalls:number; drawnTriangles:number; frames:number; refreshes:number; texelMetres:number; depthMetres:number; cpuMs:number; maxCpuMs:number; failure:string|null; skipped:string|null };
    skyAssets?: { loaded: string[]; failures: string[] };
    sceneryShadow?: { revision: number; size: number; casters: number; texelMetres: number; bakes: number; failure: string|null;
      terrain?: { vertices: number; triangles: number; sampleMetres: number; physicalMinHeight: number; physicalMaxHeight: number;
        maxMeasuredOvershoot: number; maxDownwardPad: number; interiorProbeMetres: number } };
    width: number;
    height: number;
    pixelRatio: number;
    calls: number;
    triangles: number;
    points: number;
    lines: number;
    /** Scalar copies: diagnostic callers cannot mutate the live governor. */
    performance?: {
      qualityLevel: number;
      adaptive: boolean;
      reason: string;
      terrainRequestedLevels: number;
      terrainEffectiveLevels: number;
      terrainCoverageRadius: number;
      workEmaMs: number;
      cadenceEmaMs: number | null;
      cadenceSamples: number;
      cadenceLastMs: number | null;
    };
    memory?: {
      geometries: number;
      textures: number;
      programs: number;
    };
  };
  game: Record<string, unknown>;
  galactic?: ReviewGalacticSnapshot;
}

export interface PodRacingReviewApi {
  ready: boolean;
  /** Version two adds expansion scenarios and semantic input injection. */
  version: 1 | 2;
  setCaptureMode(enabled: boolean): void;
  setPreset(name: CapturePreset): void;
  setCamera(name: CaptureCamera): void;
  step(frames: number): void;
  snapshot(): ReviewSnapshot;
  /** Optional until GameApp installs the expansion scenario adapter. */
  setScenario?(name: ReviewCapturePreset): void;
  setReviewCamera?(name: ReviewCaptureCamera): void;
  setInput?(input: Partial<PlayerInputState>): void;
  clearInput?(): void;
  clearEvents?(): void;
  /** Diagnostic-only course framing; cannot write competitive records. */
  seekCourse?(progress: number): void;
  /** Rendering-only benchmark override; null restores adaptive quality. */
  setPerformanceQuality?(level: number | null): void;
}

declare global {
  interface Window {
    __PODRACING__?: PodRacingReviewApi;
  }
}
