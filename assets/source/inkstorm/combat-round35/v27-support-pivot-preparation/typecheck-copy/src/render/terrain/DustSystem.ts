import { Group } from 'three';
import { CrestDust, type CrestDustOptions } from './CrestDust';
import {
  GroundDustRings,
  type GroundDustRingOptions,
} from './GroundDustRings';
import { SandSpray, type SandSprayOptions } from './SandSpray';
import { WakeRibbons, type WakeRibbonOptions } from './WakeRibbons';
import type { TerrainSampler } from './terrainMath';

export interface DustSystemOptions {
  /** One surface for every pool. Takes precedence over individual pool options. */
  terrain?: TerrainSampler;
  wakes?: WakeRibbonOptions;
  groundRings?: GroundDustRingOptions;
  crestDust?: CrestDustOptions;
  spray?: SandSprayOptions;
}

export interface DustFrame {
  time: number;
  deltaSeconds: number;
  cameraWorldX: number;
  cameraWorldY?: number;
  cameraWorldZ: number;
  /** Explicit presentation class; avoids guessing a low chase lens from dunes. */
  lowCameraView?: boolean;
  renderOriginX: number;
  renderOriginZ: number;
  windX: number;
  windZ: number;
  windStrength: number;
}

/**
 * Unified fixed-capacity desert-effects facade. Call `beginFrame`, append all
 * repulsorlift contacts, then `update`. Wakes and spray are persistent pools and
 * may be fed from fixed simulation events independently of render cadence.
 */
export class DustSystem {
  readonly group = new Group();
  readonly wakes: WakeRibbons;
  readonly groundRings: GroundDustRings;
  readonly crestDust: CrestDust;
  readonly spray: SandSpray;

  private currentTime = 0;

  constructor(options: DustSystemOptions = {}) {
    this.group.name = 'Stylized Desert Dust';
    this.wakes = new WakeRibbons({
      ...options.wakes,
      terrain: options.terrain ?? options.wakes?.terrain,
    });
    this.groundRings = new GroundDustRings({
      ...options.groundRings,
      terrain: options.terrain ?? options.groundRings?.terrain,
    });
    this.crestDust = new CrestDust({
      ...options.crestDust,
      terrain: options.terrain ?? options.crestDust?.terrain,
    });
    this.spray = new SandSpray({
      ...options.spray,
      terrain: options.terrain ?? options.spray?.terrain,
    });
    this.group.add(
      this.crestDust.mesh,
      this.groundRings.mesh,
      this.wakes.mesh,
      this.spray.mesh,
    );
  }

  beginFrame(): void {
    this.groundRings.beginFrame();
  }

  emitGroundContact(
    worldX: number,
    emitterY: number,
    worldZ: number,
    radius: number,
    thrust: number,
  ): void {
    this.groundRings.emitContact(worldX, emitterY, worldZ, radius, thrust);
  }

  pushWakePair(
    racerIndex: number,
    leftWorldX: number,
    leftWorldZ: number,
    rightWorldX: number,
    rightWorldZ: number,
    strength: number,
    simulationTime = this.currentTime,
  ): void {
    this.wakes.pushPair(
      racerIndex,
      leftWorldX,
      leftWorldZ,
      rightWorldX,
      rightWorldZ,
      strength,
      simulationTime,
    );
  }

  emitSpray(
    worldX: number,
    worldY: number,
    worldZ: number,
    directionX: number,
    directionZ: number,
    intensity: number,
    particleCount: number,
  ): void {
    this.spray.emit(
      worldX,
      worldY,
      worldZ,
      directionX,
      directionZ,
      intensity,
      particleCount,
    );
  }

  update(frame: DustFrame): void {
    this.currentTime = frame.time;
    this.groundRings.commit(frame.time, frame.renderOriginX, frame.renderOriginZ);
    this.wakes.update(
      frame.time,
      frame.renderOriginX,
      frame.renderOriginZ,
      frame.cameraWorldX,
      frame.cameraWorldZ,
      frame.cameraWorldY,
      frame.lowCameraView,
    );
    this.spray.update(frame.deltaSeconds, frame.renderOriginX, frame.renderOriginZ);
    this.crestDust.update(
      frame.time,
      frame.cameraWorldX,
      frame.cameraWorldZ,
      frame.renderOriginX,
      frame.renderOriginZ,
      frame.windX,
      frame.windZ,
      frame.windStrength,
    );
  }

  /**
   * Advances lifetime-bearing effects when a deterministic review harness
   * fast-forwards fixed simulation ticks without presenting every frame.
   * Gameplay normally gets this work through `update` once per RAF.
   */
  advancePersistentEffects(
    time: number,
    deltaSeconds: number,
    renderOriginX = 0,
    renderOriginZ = 0,
  ): void {
    this.currentTime = time;
    this.wakes.update(time, renderOriginX, renderOriginZ);
    this.spray.update(deltaSeconds, renderOriginX, renderOriginZ);
  }

  setQuality(quality: 'low' | 'medium' | 'high'): void {
    // Geometry remains allocated so governor transitions do not hitch.
    this.crestDust.mesh.visible = quality !== 'low';
    this.spray.mesh.visible = quality !== 'low';
    this.wakes.mesh.visible = true;
    this.groundRings.mesh.visible = true;
  }

  settleDeterministicEffects(): void {
    this.crestDust.settleDistribution();
  }

  clear(): void {
    this.wakes.clear();
    this.spray.clear();
    this.crestDust.clear();
    this.groundRings.beginFrame();
    this.groundRings.commit(this.currentTime, 0, 0);
  }

  dispose(): void {
    this.wakes.dispose();
    this.groundRings.dispose();
    this.crestDust.dispose();
    this.spray.dispose();
    this.group.clear();
  }
}
