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
import type { CaptureCamera } from '/Users/amir/Projects/PodRacing/src/diagnostics/reviewTypes';

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
  /** Extra eye clearance for a tall cockpit; affects chase composition only. */
  chaseClearance?: number;
  /** Current displayed wreck center/heading, separate from authoritative driving. */
  combatFocus?: Vector3;
  combatForward?: Vector3;
  /** Authored moving failure point; a victim shot views its side of the craft. */
  combatImpactPosition?: Vector3;
  /** Optional active authored-engine cluster; full combatBounds still protect the lens. */
  combatImpactFraming?: { readonly center: Vector3; readonly bounds: readonly Vector3[];
    /** Optional authored wreck age. Omission preserves the locked legacy shot. */
    readonly ageSeconds?: number;
    /** Optional authored composition limit in NDC; legacy providers retain .74. */
    readonly horizontalHalfSpan?: number };
  /** Current displayed assembly radius, resolved from cached source bounds. */
  combatRadius?: number;
  /** Existing per-part source-box corners, already transformed into world space. */
  combatBounds?: readonly Vector3[];
  combatTerrain?: { heightAt(x: number, z: number): number };
  /** Keep the fitted recovery view until the player regains the running phase. */
  wreckRecovery?: boolean;
  /** Post-cut chase keeps the tumbling body outside the lens until recovery. */
  wreckChase?: boolean;
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
  private combatFraming = false;
  private readonly authoredCombatBack = new Vector3();
  private hasAuthoredCombatBack = false;
  private hasImpactCombatBack = false;
  private impactArcSign = 0;
  private readonly impactAzimuthCandidate = new Vector3();
  private readonly desiredPosition = new Vector3();
  private readonly desiredLookAt = new Vector3();
  private readonly travelDirection = new Vector3();
  private readonly framingForward = new Vector3();
  private readonly boundsBack = new Vector3();
  private readonly boundsRight = new Vector3();
  private readonly boundsUp = new Vector3();
  private readonly boundsOffset = new Vector3();
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
    if (mode !== 'side' && mode !== 'chase') this.hasAuthoredCombatBack = false;
    // The physical, fully animated pilot remains in frame in cockpit mode.
    // Drawing a second camera-attached pair of sleeves and gloves over it made
    // one hand read as a ghost head and doubled the upper-body silhouette.
    this.cockpitOverlay.visible = false;
    this.orbitTime = 0;
  }

  setCaptureMode(enabled: boolean): void {
    this.captureMode = enabled;
    if (enabled) this.hasAuthoredCombatBack = false;
  }

  /**
   * Results highlights often contain two full-width craft at contact distance.
   * The normal side camera is intentionally intimate for one racer, so replay
   * framing uses a longer graphic lens that keeps both silhouettes on screen.
   */
  setHighlightFraming(enabled: boolean): void {
    this.highlightFraming = enabled;
    if (enabled) this.hasAuthoredCombatBack = false;
  }

  /** Live victim wreck framing; optional authored impact clusters retain full lens safety. */
  setCombatFraming(enabled: boolean): void {
    if (enabled && !this.combatFraming) {
      this.hasAuthoredCombatBack = false; this.hasImpactCombatBack = false; this.impactArcSign = 0;
    }
    this.combatFraming = enabled;
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
    if (!this.combatFraming && !subject.wreckChase) {
      this.hasAuthoredCombatBack = false; this.hasImpactCombatBack = false;
    }
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
    this.camera.fov = this.highlightFraming || this.combatFraming
      ? 60
      : this.mode === 'cockpit'
        ? 84
        : 62 + speedT * 6 * (this.comfort.reducedMotion ? 0 : this.comfort.fovKickIntensity);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.lookPoint);
  }

  update(dt: number, time: number, subject: CameraSubject): void {
    if (!this.combatFraming && !subject.wreckChase) {
      this.hasAuthoredCombatBack = false; this.hasImpactCombatBack = false;
    }
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
    const targetFov = this.highlightFraming || this.combatFraming
      ? 60
      : this.mode === 'cockpit'
        ? 84
        : 62 + speedT * 6 * (this.comfort.reducedMotion ? 0 : this.comfort.fovKickIntensity);
    this.camera.fov = MathUtils.damp(this.camera.fov, targetFov, 4.8, dt);
    this.camera.updateProjectionMatrix();

    const boundedWreck = (this.combatFraming && this.mode === 'side')
      || (this.mode === 'chase' && subject.wreckChase);
    if (boundedWreck && this.hasCombatBounds(subject)) {
      // Preserve the spring's angle, then solve the same perspective bounds
      // at that intermediate angle. Safe endpoints alone do not protect a
      // spring crossing the nearer engine as the parts open.
      this.boundsBack.copy(this.camera.position).sub(this.lookPoint).normalize();
      const focus = this.impactFrame(subject)?.center ?? subject.combatFocus!;
      const distance = this.boundsOffset.copy(this.camera.position).sub(focus).dot(this.boundsBack);
      this.fitCombatBounds(subject, this.boundsBack, Math.max(0, distance));
      this.camera.position.copy(this.desiredPosition);
      this.lookPoint.copy(this.desiredLookAt);
    } else if (this.mode === 'chase' && subject.wreckChase && subject.combatFocus) {
      // A straight spring between two safe viewpoints can cross the wreck.
      // Keep its radial clearance while the restored chase angle eases around it.
      const distance = this.wreckChaseDistance(subject);
      this.targetVelocity.copy(this.camera.position).sub(subject.combatFocus);
      if (this.targetVelocity.lengthSq() < distance * distance) {
        if (this.targetVelocity.lengthSq() < .001) this.targetVelocity.set(0, 1, -1);
        this.targetVelocity.setLength(distance);
        this.camera.position.copy(subject.combatFocus).add(this.targetVelocity);
      }
      this.lookPoint.copy(subject.combatFocus);
    }

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
        if (this.combatFraming && this.hasCombatBounds(subject)) {
          this.combatDirection(subject, forward, right);
          this.fitCombatBounds(subject, this.boundsBack);
        } else if (this.combatFraming) {
          const portraitClearance = Math.max(1, 1.35 / this.camera.aspect);
          const radius = Number.isFinite(subject.combatRadius) ? Math.max(0, subject.combatRadius!) : 17;
          const clearance = portraitClearance * Math.max(1, radius / 17);
          if (subject.combatForward && subject.combatForward.lengthSq() > 0.001) {
            forward.copy(subject.combatForward).setY(0).normalize();
            right.crossVectors(forward, UP).normalize();
          }
          lookAt.copy(subject.combatFocus ?? subject.position);
          if (!subject.combatFocus) lookAt.addScaledVector(UP, 2.8).addScaledVector(forward, 4);
          // The live visual wreck spins independently of the simulation yaw.
          // Track that rigid body's center from a lateral three-quarter view;
          // an authoritative-heading rear view stacks its long engines end-on.
          position.copy(lookAt)
            .addScaledVector(right, 28 * clearance)
            .addScaledVector(UP, 14 * clearance)
            .addScaledVector(forward, -28 * clearance);
        } else if (this.highlightFraming) {
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
        if (subject.wreckChase && this.hasCombatBounds(subject)) {
          // Retain a lower three-quarter view through wreck/recovery instead
          // of passing behind the start gantry immediately after the matte.
          // The director's chase/manual mode remains authoritative.
          this.combatDirection(subject, forward, right);
          this.fitCombatBounds(subject, this.boundsBack);
          break;
        }
        if (subject.wreckChase && subject.combatFocus) {
          const distance = this.wreckChaseDistance(subject);
          lookAt.copy(subject.combatFocus);
          position.copy(lookAt)
            .addScaledVector(forward, -distance * Math.sqrt(1 - .36 * .36))
            .addScaledVector(UP, distance * .36);
          break;
        }
        const speedT = MathUtils.smoothstep(subject.speed, 0, 230);
        const clearance = MathUtils.clamp(Number.isFinite(subject.chaseClearance) ? subject.chaseClearance! : 0, 0, 6);
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
          .addScaledVector(this.framingForward, -16.5 - speedT * 0.8 - clearance * .45)
          .addScaledVector(UP, 7.1 + speedT * 0.5 + clearance + this.landingCompression)
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
          // Preserve the skyline on the elevated tall-cockpit rig while the
          // normal descent framing still reveals the landing corridor.
          lookAt.y += descent * clearance * .45;
        }
        break;
      }
    }

    return this.desiredPose;
  }

  private hasCombatBounds(subject: CameraSubject): boolean {
    const focus = subject.combatFocus, points = subject.combatBounds;
    if (!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.y) || !Number.isFinite(focus.z)
      || !points || points.length < 8 || points.length > 64) return false;
    for (const point of points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return false;
    }
    return true;
  }

  private impactFrame(subject: CameraSubject): CameraSubject['combatImpactFraming'] {
    const frame = subject.combatImpactFraming;
    if (subject.wreckRecovery || !frame || !this.hasCombatBounds(subject)
      || !((this.combatFraming && this.mode === 'side') || (this.mode === 'chase' && subject.wreckChase))
      || !Number.isFinite(frame.center.x + frame.center.y + frame.center.z)
      || frame.bounds.length < 8 || frame.bounds.length > 32) return undefined;
    for (const point of frame.bounds) {
      if (!Number.isFinite(point.x + point.y + point.z)) return undefined;
    }
    return frame;
  }

  private combatDirection(subject: CameraSubject, forward: Vector3, right: Vector3): void {
    if (subject.combatForward && subject.combatForward.lengthSq() > .001) {
      forward.copy(subject.combatForward).setY(0).normalize();
      right.crossVectors(forward, UP).normalize();
    }
    // Approximately 60 degrees off the rear axis, with an 11-degree elevation.
    // Source corners determine distance; a long hull does not require a tall eye.
    let side = .86, fore = -.5;
    const impact = subject.combatImpactPosition;
    const authored = !!impact && !!subject.combatFocus && Number.isFinite(impact.x + impact.y + impact.z);
    const impactFrame = this.impactFrame(subject);
    if (authored && this.hasAuthoredCombatBack && (!impactFrame || this.hasImpactCombatBack)) {
      // The controller's victim-cut rising edge owns this shot. Crossing the
      // moving assembly centroid must not reverse its chosen tear-side azimuth.
      this.boundsBack.copy(this.authoredCombatBack);
      this.applyAuthoredImpactArc(subject, impactFrame);
      return;
    }
    if (authored) {
      // Expose the actual torn section instead of placing an intact engine in
      // front of it. Unauthored families keep their existing shot direction.
      this.boundsOffset.copy(impact!).sub(subject.combatFocus!);
      if (this.boundsOffset.dot(right) < 0) side = -.86;
      // The authored cut lies ahead of the cockpit. A forward quarter also
      // reveals its open face, rather than looking down the intact nozzle.
      if (this.boundsOffset.dot(forward) > 0) fore = .35;
    }
    this.boundsBack.copy(right).multiplyScalar(side).addScaledVector(forward, fore)
      .addScaledVector(UP, .20).normalize();
    this.impactArcSign = 0;
    if (authored && impactFrame) {
      // Existing racer shadows cast toward (+.42, +.50) in world XZ. Select
      // one modest 20-degree initial offset away from that direction, on the
      // same tear side. An age-bearing authored frame may add a bounded arc.
      const x = this.boundsBack.x, z = this.boundsBack.z;
      let best = x * .42 + z * .50;
      for (let sign = -1; sign <= 1; sign += 2) {
        const angle = sign * Math.PI / 9;
        const c = Math.cos(angle), sn = Math.sin(angle);
        this.impactAzimuthCandidate.set(x * c + z * sn, this.boundsBack.y, z * c - x * sn);
        const score = this.impactAzimuthCandidate.x * .42 + this.impactAzimuthCandidate.z * .50;
        if (score < best && this.impactAzimuthCandidate.dot(right) * Math.sign(side) > .35) {
          best = score; this.boundsBack.copy(this.impactAzimuthCandidate);
        }
      }
      this.hasImpactCombatBack = true;
      if (Number.isFinite(impactFrame.ageSeconds) && !this.comfort.reducedMotion) {
        // Pick one direction for this victim identity. Both endpoints remain
        // on the exposed tear side; no angle accumulates from prior frames.
        const arc = Math.PI * 14 / 180, c = Math.cos(arc), sn = Math.sin(arc);
        const baseX = this.boundsBack.x, baseZ = this.boundsBack.z;
        let bestArc = Infinity;
        for (let sign = -1; sign <= 1; sign += 2) {
          this.impactAzimuthCandidate.set(baseX * c + baseZ * sn * sign, this.boundsBack.y,
            baseZ * c - baseX * sn * sign);
          const score = this.impactAzimuthCandidate.x * .42 + this.impactAzimuthCandidate.z * .50;
          if (score < bestArc && this.impactAzimuthCandidate.dot(right) * Math.sign(side) > .35) {
            bestArc = score; this.impactArcSign = sign;
          }
        }
      }
    }
    if (authored) {
      this.authoredCombatBack.copy(this.boundsBack);
      this.hasAuthoredCombatBack = true;
      this.applyAuthoredImpactArc(subject, impactFrame);
    }
  }

  private applyAuthoredImpactArc(subject: CameraSubject, frame: CameraSubject['combatImpactFraming']): void {
    if (!this.impactArcSign || this.comfort.reducedMotion) return;
    // Protected intact recovery retains the terminal angle, rather than
    // rotating back through the craft when the authored metadata disappears.
    const progress = subject.wreckRecovery ? 1
      : Number.isFinite(frame?.ageSeconds) ? MathUtils.smoothstep(frame!.ageSeconds!, .015, .50) : 0;
    const angle = this.impactArcSign * Math.PI * 14 / 180 * progress;
    const c = Math.cos(angle), sn = Math.sin(angle), x = this.boundsBack.x, z = this.boundsBack.z;
    this.boundsBack.set(x * c + z * sn, this.boundsBack.y, z * c - x * sn);
  }

  private fitCombatBounds(subject: CameraSubject, direction: Vector3, minimumDistance = 0): void {
    const impactFrame = this.impactFrame(subject);
    const focus = impactFrame?.center ?? subject.combatFocus!;
    const points = impactFrame?.bounds ?? subject.combatBounds!;
    // Explicit phase composition: early authored close-up may occupy more
    // screen width; all source near-plane and terrain checks below stay full.
    const impactHorizontal = impactFrame && Number.isFinite(impactFrame.horizontalHalfSpan)
      ? MathUtils.clamp(impactFrame.horizontalHalfSpan!, .74, .90) : .74;
    this.boundsBack.copy(direction);
    if (this.boundsBack.lengthSq() < .001) this.boundsBack.set(0, .2, -1);
    this.boundsBack.normalize();
    // A 60-degree lens is conservative during the normal chase FOV's return.
    const tangent = Math.tan(Math.PI / 6);
    const horizontal = tangent * Math.max(.1, Number.isFinite(this.camera.aspect) ? this.camera.aspect : 1);
    for (let pass = 0; pass < 2; pass++) {
      this.boundsRight.crossVectors(UP, this.boundsBack);
      if (this.boundsRight.lengthSq() < .001) this.boundsRight.set(1, 0, 0);
      this.boundsRight.normalize();
      this.boundsUp.crossVectors(this.boundsBack, this.boundsRight).normalize();
      let distance = Math.max(2, minimumDistance);
      let leftAim = -Infinity, rightAim = Infinity, upperAim = -Infinity, lowerAim = Infinity;
      for (const point of points) {
        this.boundsOffset.copy(point).sub(focus);
        const x = this.boundsOffset.dot(this.boundsRight), y = this.boundsOffset.dot(this.boundsUp);
        const z = this.boundsOffset.dot(this.boundsBack);
        if (impactFrame) {
          // Solve the aim translation as well as distance. A world-AABB center
          // leaves empty screen space above/beside a long banked casing. These
          // interval endpoints retain the validated horizontal limit and
          // y=[-.58,.70] exactly.
          leftAim = Math.max(leftAim, x + impactHorizontal * horizontal * z);
          rightAim = Math.min(rightAim, x - impactHorizontal * horizontal * z);
          upperAim = Math.max(upperAim, y + .70 * tangent * z);
          lowerAim = Math.min(lowerAim, y - .58 * tangent * z);
          distance = Math.max(distance, z + this.camera.near + .5);
        } else {
          // Exact legacy framing, including its fixed .06 upward screen bias.
          distance = Math.max(distance, z + Math.abs(x) / (.78 * horizontal),
            (y + .70 * tangent * z) / (.64 * tangent),
            (-y + .58 * tangent * z) / (.64 * tangent), z + this.camera.near + .5);
        }
      }
      if (impactFrame) {
        distance = Math.max(distance, (leftAim - rightAim) / (2 * impactHorizontal * horizontal),
          (upperAim - lowerAim) / (1.28 * tangent));
        // The reframing permits rods offscreen, never through the lens. Every
        // original full-assembly box must remain beyond the near-plane guard.
        // Therefore the eye is outside every visible source box as well.
        for (const point of subject.combatBounds!) {
          const z = this.boundsOffset.copy(point).sub(focus).dot(this.boundsBack);
          distance = Math.max(distance, z + this.camera.near + .5);
        }
      }
      this.desiredLookAt.copy(focus).addScaledVector(this.boundsUp, -.06 * tangent * distance);
      if (impactFrame) {
        this.desiredLookAt.addScaledVector(this.boundsRight, (leftAim + rightAim) * .5)
          .addScaledVector(this.boundsUp, (upperAim + lowerAim) * .5);
      }
      this.desiredPosition.copy(this.desiredLookAt).addScaledVector(this.boundsBack, distance);
      const height = subject.combatTerrain?.heightAt(this.desiredPosition.x, this.desiredPosition.z);
      if (pass === 0 && height !== undefined && Number.isFinite(height) && this.desiredPosition.y < height + 1.2) {
        this.desiredPosition.y = height + 1.2;
        this.boundsBack.copy(this.desiredPosition).sub(this.desiredLookAt).normalize();
      } else break;
    }
  }

  private wreckChaseDistance(subject: CameraSubject): number {
    const radius = Number.isFinite(subject.combatRadius) ? Math.max(1, subject.combatRadius!) : 17;
    // Use the narrower screen angle; the 60-degree cut lens is conservative
    // while ordinary chase FOV recovers. No geometry or physics radius changes.
    const halfAngle = Math.atan(Math.tan(Math.PI / 6) * Math.min(1, Math.max(.1, this.camera.aspect)));
    return radius / Math.sin(halfAngle) * 1.08;
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
