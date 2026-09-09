import {
  BoxGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  SphereGeometry,
  Vector3,
} from 'three';
import type { CaptureCamera } from '../diagnostics/reviewTypes';

const UP = new Vector3(0, 1, 0);
const tempA = new Vector3();
const tempB = new Vector3();

function createCockpitOverlay(): Group {
  const overlay = new Group();
  overlay.name = 'Cockpit camera instrument frame';
  const ink = new MeshBasicMaterial({
    color: '#171425',
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const accent = new MeshBasicMaterial({
    color: '#6cf5d0',
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const suit = new MeshBasicMaterial({
    color: '#9f3047',
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const glove = new MeshBasicMaterial({
    color: '#f6c879',
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const addBar = (
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    angle = 0,
    material = ink,
  ): void => {
    const mesh = new Mesh(new BoxGeometry(width, height, 0.12), material);
    mesh.position.set(x, y, z);
    mesh.rotation.z = angle;
    mesh.renderOrder = 1000;
    overlay.add(mesh);
  };
  const addHand = (x: number, y: number, angle: number): void => {
    const hand = new Mesh(new SphereGeometry(0.075, 8, 5), glove);
    hand.position.set(x, y, -1.58);
    hand.rotation.z = angle;
    hand.scale.set(1.28, 0.74, 0.72);
    hand.renderOrder = 1002;
    overlay.add(hand);
  };

  // One continuous instrument coaming plus two braced forearms reads as an
  // inhabited cockpit at a glance. The previous disconnected bars looked like
  // arbitrary screen-space debris rather than controls.
  addBar(1.38, 0.08, 0, -1.08, -1.74, 0);
  addBar(0.54, 0.05, -0.43, -0.98, -1.70, -0.08);
  addBar(0.54, 0.05, 0.43, -0.98, -1.70, 0.08);
  addBar(0.06, 0.34, -1.04, -0.91, -1.75, -0.48);
  addBar(0.06, 0.34, 1.04, -0.91, -1.75, 0.48);

  // Dual repulsor levers, pilot sleeves, and pale gloves. They stay central so
  // the physical engine pods can frame the outer lower corners without
  // colliding with the speed and telemetry instruments.
  // Freeze the cockpit presentation in an authored steering moment rather
  // than a perfectly mirrored T-pose: the left hand pulls a high lever while
  // the right drives its grip forward and low. Hands overlap the cross-grips
  // so contact remains explicit even at the widest airborne FOV.
  addBar(0.04, 0.28, -0.39, -0.78, -1.61, -0.18);
  addBar(0.04, 0.25, 0.31, -0.91, -1.61, 0.08);
  addBar(0.11, 0.32, -0.27, -0.89, -1.60, -0.47, suit);
  addBar(0.10, 0.27, 0.23, -0.97, -1.60, 0.22, suit);
  addHand(-0.39, -0.65, -0.18);
  addHand(0.31, -0.79, 0.08);
  addBar(0.19, 0.028, -0.39, -0.59, -1.59, -0.08, accent);
  addBar(0.19, 0.028, 0.31, -0.73, -1.59, 0.04, accent);
  addBar(0.12, 0.025, -0.28, -0.78, -1.58, -0.47, accent);
  addBar(0.11, 0.025, 0.22, -0.86, -1.58, 0.22, accent);
  addBar(0.34, 0.06, 0, -0.94, -1.66, 0, accent);
  overlay.visible = false;
  return overlay;
}

export interface CameraSubject {
  position: Vector3;
  forward: Vector3;
  velocity: Vector3;
  speed: number;
  /** Optional world-space course preview. Presentation only; never steers the pod. */
  routeLookAhead?: Vector3;
  /** Angular center of both upcoming lane envelopes; bounded live junction framing. */
  junctionLookAhead?: Vector3;
  junctionWeight?: number;
}

/**
 * Player-facing motion comfort controls. Values are normalized so the UI,
 * save data and renderer never need to know the authored camera amplitudes.
 */
export interface CameraComfortSettings {
  /** Master multiplier for collision, landing and engine-surge shake. */
  shakeIntensity: number;
  /** Master multiplier for the speed-driven FOV expansion. */
  fovKickIntensity: number;
  /** Removes decorative camera movement while preserving course framing. */
  reducedMotion: boolean;
}

const DEFAULT_COMFORT_SETTINGS: CameraComfortSettings = {
  shakeIntensity: 1,
  fovKickIntensity: 1,
  reducedMotion: false,
};

export class CinematicCamera {
  readonly camera = new PerspectiveCamera(64, 16 / 9, 0.35, 18000);
  private readonly cockpitOverlay = createCockpitOverlay();
  private velocity = new Vector3();
  private targetVelocity = new Vector3();
  private lookPoint = new Vector3();
  private lookVelocity = new Vector3();
  private mode: CaptureCamera = 'chase';
  private orbitTime = 0;
  private shake = 0;
  private captureMode = false;
  private highlightFraming = false;
  private readonly desiredPosition = new Vector3();
  private readonly desiredLookAt = new Vector3();
  private readonly travelDirection = new Vector3();
  private readonly framingForward = new Vector3();
  private readonly desiredPose = { position: this.desiredPosition, lookAt: this.desiredLookAt };
  private readonly lastSubjectPosition = new Vector3();
  private readonly subjectTranslation = new Vector3();
  private hasSubjectPosition = false;
  private landingCompression = 0;
  private landingVelocity = 0;
  private comfort: CameraComfortSettings = { ...DEFAULT_COMFORT_SETTINGS };

  constructor() {
    this.camera.add(this.cockpitOverlay);
    this.camera.position.set(0, 24, 46);
    this.lookPoint.set(0, 6, 0);
    this.camera.lookAt(this.lookPoint);
  }

  setMode(mode: CaptureCamera): void {
    this.mode = mode;
    // The physical, fully animated pilot remains in frame in cockpit mode.
    // Drawing a second camera-attached pair of sleeves and gloves over it made
    // one hand read as a ghost head and doubled the upper-body silhouette.
    this.cockpitOverlay.visible = false;
    this.orbitTime = 0;
  }

  setCaptureMode(enabled: boolean): void {
    this.captureMode = enabled;
  }

  /**
   * Results highlights often contain two full-width craft at contact distance.
   * The normal side camera is intentionally intimate for one racer, so replay
   * framing uses a longer graphic lens that keeps both silhouettes on screen.
   */
  setHighlightFraming(enabled: boolean): void {
    this.highlightFraming = enabled;
  }

  setComfortSettings(settings: Partial<CameraComfortSettings>): void {
    this.comfort = {
      shakeIntensity: MathUtils.clamp(
        Number.isFinite(settings.shakeIntensity) ? settings.shakeIntensity! : this.comfort.shakeIntensity,
        0,
        1,
      ),
      fovKickIntensity: MathUtils.clamp(
        Number.isFinite(settings.fovKickIntensity) ? settings.fovKickIntensity! : this.comfort.fovKickIntensity,
        0,
        1,
      ),
      reducedMotion: settings.reducedMotion ?? this.comfort.reducedMotion,
    };
    if (this.comfort.reducedMotion || this.comfort.shakeIntensity === 0) {
      this.shake = 0;
      this.landingCompression = 0;
      this.landingVelocity = 0;
    }
  }

  getComfortSettings(): CameraComfortSettings {
    return { ...this.comfort };
  }

  impulse(amount: number): void {
    if (this.comfort.reducedMotion || this.comfort.shakeIntensity <= 0) return;
    this.shake = Math.min(2.8, this.shake + amount * this.comfort.shakeIntensity);
  }

  /** A single downward suspension stroke is readable without a random camera jolt. */
  landingImpulse(amount: number): void {
    if (this.comfort.reducedMotion || this.comfort.shakeIntensity <= 0) return;
    const bounded = MathUtils.clamp(Number.isFinite(amount) ? amount : 0, 0, 2.4);
    this.landingVelocity = Math.max(-10, this.landingVelocity - bounded * 5.5 * this.comfort.shakeIntensity);
  }

  snap(subject: CameraSubject): void {
    this.lastSubjectPosition.copy(subject.position);
    this.hasSubjectPosition = true;
    const desired = this.getDesired(subject, 0);
    this.camera.position.copy(desired.position);
    this.lookPoint.copy(desired.lookAt);
    this.velocity.set(0, 0, 0);
    this.landingCompression = 0;
    this.landingVelocity = 0;
    this.lookVelocity.set(0, 0, 0);
    const speedT = MathUtils.smoothstep(subject.speed, 70, 220);
    this.camera.fov = this.highlightFraming
      ? 60
      : this.mode === 'cockpit'
        ? 84
        : 62 + speedT * 6 * (this.comfort.reducedMotion ? 0 : this.comfort.fovKickIntensity);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.lookPoint);
  }

  update(dt: number, time: number, subject: CameraSubject): void {
    dt = MathUtils.clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    this.orbitTime += dt;
    if (this.hasSubjectPosition) {
      // Transport the camera with the moving subject before damping its relative
      // composition. A world-space spring otherwise adds 30m of lag at race
      // speed, shrinking the craft in real play while snapped captures look close.
      this.subjectTranslation.copy(subject.position).sub(this.lastSubjectPosition);
      this.camera.position.add(this.subjectTranslation);
      this.lookPoint.add(this.subjectTranslation);
    }
    this.lastSubjectPosition.copy(subject.position);
    this.hasSubjectPosition = true;
    if (!this.captureMode && !this.comfort.reducedMotion) {
      // Critically damped, bounded landing suspension. This affects the target,
      // so visual impulses never accumulate in the camera spring's position.
      this.landingVelocity += (-110 * this.landingCompression - 19 * this.landingVelocity) * dt;
      this.landingCompression = MathUtils.clamp(this.landingCompression + this.landingVelocity * dt, -0.7, 0.12);
    }
    const desired = this.getDesired(subject, time);
    this.springVector(this.camera.position, this.velocity, desired.position, 8.5, 0.88, dt);
    this.springVector(this.lookPoint, this.lookVelocity, desired.lookAt, 12, 0.9, dt);

    const speedT = MathUtils.smoothstep(subject.speed, 70, 220);
    // Replays are edited shots, not live chase views: remove the high-speed
    // FOV kick so the two participants remain large enough to read instantly.
    const targetFov = this.highlightFraming
      ? 60
      : this.mode === 'cockpit'
        ? 84
        : 62 + speedT * 6 * (this.comfort.reducedMotion ? 0 : this.comfort.fovKickIntensity);
    this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 4.8, dt);
    this.camera.updateProjectionMatrix();

    this.shake = MathUtils.damp(this.shake, 0, 7, dt);
    if (!this.captureMode && !this.comfort.reducedMotion && this.shake > 0.002) {
      const frequency = time * 53;
      this.camera.position.x += Math.sin(frequency * 1.13) * this.shake * 0.12;
      this.camera.position.y += Math.sin(frequency * 1.91) * this.shake * 0.08;
    }

    this.camera.lookAt(this.lookPoint);
  }

  private getDesired(subject: CameraSubject, _time: number): { position: Vector3; lookAt: Vector3 } {
    const forward = tempA.copy(subject.forward).setY(0).normalize();
    const right = tempB.crossVectors(forward, UP).normalize();
    const position = this.desiredPosition;
    const lookAt = this.desiredLookAt;

    switch (this.mode) {
      case 'hero': {
        // Countdown racers are stationary, while a results hero is still
        // coasting. Use that distinction to pull the finish shot far enough
        // back for a complete winner silhouette below the results card.
        const resultsHero = MathUtils.smoothstep(subject.speed, 20, 90);
        const liveAngle = MathUtils.lerp(
          -0.46 + this.orbitTime * 0.12,
          -0.78 + Math.sin(this.orbitTime * 0.3) * 0.22,
          resultsHero,
        );
        const angle = this.captureMode
          ? MathUtils.lerp(-0.44, -0.82, resultsHero)
          : liveAngle;
        const orbitRadius = this.captureMode
          // A finish is a four-racer tableau, not a single-winner close-up.
          // The trailing craft sits between this orbit and the winner, so the
          // old 72 m radius made that nearest pod spill through the lower-right
          // frame edge. Pulling the results endpoint back preserves every
          // silhouette while leaving the stationary countdown hero untouched.
          ? MathUtils.lerp(110, 108, resultsHero)
          : MathUtils.lerp(104, 110, resultsHero);
        const orbitHeight = this.captureMode
          ? MathUtils.lerp(40, 28, resultsHero)
          : MathUtils.lerp(37, 32, resultsHero);
        // Orbit in the racer's frame, not world space. This keeps a start gate
        // ahead of the grid instead of letting its crossbar slice through the
        // foreground when the course happens to face an unlucky compass angle.
        position.copy(subject.position)
          .addScaledVector(forward, -orbitRadius * Math.cos(angle))
          .addScaledVector(right, orbitRadius * Math.sin(angle))
          .addScaledVector(UP, orbitHeight);
        lookAt.copy(subject.position)
          // The finish preset staggers the four racers behind the winner.
          // Focus through that group centroid instead of several metres ahead
          // of pod one; a small screen-right bias keeps the formation clear of
          // the timing card without sacrificing the rearmost craft.
          .addScaledVector(forward, MathUtils.lerp(-28, -18, resultsHero))
          .addScaledVector(right, MathUtils.lerp(0, -2.5, resultsHero))
          // A low focus point lifts the near, trailing racer clear of the
          // bottom edge and keeps the raised victory arms against clean sand.
          .addScaledVector(UP, MathUtils.lerp(4.2, -34, resultsHero));
        break;
      }
      case 'side':
        // A lower, longer lens keeps the horizon near mid-frame and avoids a
        // dead foreground of flat sand. Looking slightly ahead shifts the pod
        // left of the telemetry stack while preserving clean wake space aft.
        if (this.highlightFraming) {
          // Replay cameras stay inside the pylon line and trail the action at
          // a three-quarter angle. A far exterior side camera made track
          // furniture sweep across the foreground, obscuring the event it was
          // meant to celebrate.
          position.copy(subject.position)
            .addScaledVector(right, 10.5)
            .addScaledVector(UP, 9)
            .addScaledVector(forward, -28);
          lookAt.copy(subject.position)
            .addScaledVector(forward, 3)
            .addScaledVector(UP, 2.8);
        } else {
          position.copy(subject.position)
            .addScaledVector(right, 28)
            .addScaledVector(UP, 9.5)
            .addScaledVector(forward, -3);
          lookAt.copy(subject.position)
            .addScaledVector(forward, 1.5)
            .addScaledVector(UP, 6.5);
        }
        break;
      case 'course':
        position.copy(subject.position)
          .addScaledVector(forward, -105)
          .addScaledVector(right, 68)
          .addScaledVector(UP, 125);
        lookAt.copy(subject.position).addScaledVector(forward, 48);
        break;
      case 'cockpit':
        // Sit just behind and above the physical cockpit instead of floating
        // high over the vehicle. The actual canopy, animated pilot and nose now
        // occupy the lower frame, while the wide lens preserves the ground gap
        // that makes a crest launch legible.
        position.copy(subject.position)
          .addScaledVector(forward, -15.2)
          .addScaledVector(UP, 9.2);
        lookAt.copy(position).addScaledVector(forward, 118).addScaledVector(UP, -5);
        break;
      case 'chase':
      default: {
        const speedT = MathUtils.smoothstep(subject.speed, 0, 230);
        this.framingForward.copy(forward);
        const junction=subject.junctionLookAhead;
        if(junction && Number.isFinite(junction.x) && Number.isFinite(junction.z)){
          const dx=junction.x-subject.position.x,dz=junction.z-subject.position.z;
          const angle=Math.atan2(dx*right.x+dz*right.z,dx*forward.x+dz*forward.z);
          // Keep the player's travel direction recognizable. The former 23°
          // orbit made the near bridge dominate the choice between both paths.
          const yaw=MathUtils.clamp(angle,-.26,.26)*MathUtils.clamp(subject.junctionWeight??0,0,1)*.85;
          this.framingForward.multiplyScalar(Math.cos(yaw)).addScaledVector(right,Math.sin(yaw));
        }
        // The cockpit reaches the bottom edge and the engine nozzles frame the
        // lower sides, leaving the center opening above their linkage for the
        // next apex. This is the live camera at every speed, not a capture preset.
        // Blend actual travel into aim to show the slide's exit before yaw catches up.
        this.travelDirection.copy(subject.velocity).setY(0);
        if (this.travelDirection.lengthSq() < 1) this.travelDirection.copy(forward);
        else this.travelDirection.normalize();
        this.travelDirection.lerp(forward, 0.72).normalize();
        this.travelDirection.lerp(this.framingForward, MathUtils.clamp(subject.junctionWeight??0,0,1)*.85).normalize();
        position.copy(subject.position)
          .addScaledVector(this.framingForward, -16.5 - speedT * 0.8)
          .addScaledVector(UP, 7.1 + speedT * 0.5 + this.landingCompression)
          .addScaledVector(right, -0.35);
        lookAt.copy(subject.position)
          .addScaledVector(this.travelDirection, 34 + speedT * 18)
          .addScaledVector(UP, 5.8);
        const route = subject.routeLookAhead;
        if (route && Number.isFinite(route.x) && Number.isFinite(route.y) && Number.isFinite(route.z)) {
          // A bounded bias gives an apex preview without pulling the racer off
          // screen, even if a recovery changes the nearest course sample.
          const dx = route.x - subject.position.x;
          const dz = route.z - subject.position.z;
          const lateral = MathUtils.clamp(dx * right.x + dz * right.z, -18, 18);
          lookAt.addScaledVector(right, lateral * 0.22 * speedT);
          // Follow the coming grade gently, so crests reveal their landing
          // corridor instead of holding the lens level with empty sky.
          lookAt.y += MathUtils.clamp(route.y - subject.position.y, -16, 12) * .36 * speedT;
          // On a sustained descent, lift the eye and look into the landing
          // valley together. Raising the eye preserves the foreground craft's
          // lower-frame position while the horizon opens above the road.
          const grade = (subject.position.y - route.y) / Math.max(30, Math.hypot(dx, dz));
          const descent = MathUtils.smoothstep(grade, .035, .20) * speedT;
          position.y += descent * 2.4;
          lookAt.y -= descent * 6;
        }
        break;
      }
    }

    return this.desiredPose;
  }

  private springVector(
    value: Vector3,
    velocity: Vector3,
    target: Vector3,
    frequency: number,
    damping: number,
    dt: number,
  ): void {
    const safeDt = Math.min(dt, 1 / 20);
    const stiffness = frequency * frequency;
    const drag = 2 * damping * frequency;
    this.targetVelocity.copy(target).sub(value).multiplyScalar(stiffness);
    this.targetVelocity.addScaledVector(velocity, -drag);
    velocity.addScaledVector(this.targetVelocity, safeDt);
    value.addScaledVector(velocity, safeDt);
  }

  dispose(): void {
    const disposedMaterials = new Set();
    this.cockpitOverlay.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (disposedMaterials.has(material)) continue;
        disposedMaterials.add(material);
        material.dispose();
      }
    });
    this.cockpitOverlay.removeFromParent();
  }
}
