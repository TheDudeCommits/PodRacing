import { Box3, Euler, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CinematicCamera } from '../../src/camera/CinematicCamera';
import { vehicleChaseClearance } from '../../src/game/vehicleAppearance';

describe('cinematic cockpit presentation', () => {
  it('frames the actual rigid Teemto wreck across its cut while separating cockpit and engine depth', () => {
    // POSITION bounds from the admitted teemto-hero-open-v2.glb, including its pilot.
    // This tests the displayed YXZ wreck, not the physics collider or a guessed box.
    const bounds = new Box3(new Vector3(-6.545275, .072866, -7.39), new Vector3(6.496448, 5.250974, 22.738541));
    const center = bounds.getCenter(new Vector3()), radius = bounds.getSize(new Vector3()).length() * .5;
    const rig = new CinematicCamera();
    rig.setMode('side'); rig.setCombatFraming(true);
    const authoritativeForward = new Vector3(0, 0, 1), authoritativePosition = new Vector3(18600, -10.3, 14.6);
    for (const aspect of [1440 / 900, 390 / 844]) for (const time of [7.6, 7.7, 7.8, 7.9]) {
      const yaw = -.0083682 + time * 1.25;
      const rotation = new Euler(.34 + Math.sin(time * 5.1) * .16, yaw, -.92 + Math.sin(time * 7.4) * .34, 'YXZ');
      const focus = center.clone().applyEuler(rotation).add(authoritativePosition);
      const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const subject = { position: authoritativePosition, forward: authoritativeForward, velocity: new Vector3(), speed: 0,
        combatFocus: focus, combatForward: forward, combatRadius: radius };
      const inputs = [focus.clone(), forward.clone()];
      rig.camera.aspect = aspect; rig.snap(subject); rig.camera.updateMatrixWorld(true);
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
        const projected = new Vector3(x, y, z).applyEuler(rotation).add(authoritativePosition).project(rig.camera);
        expect(Math.abs(projected.x)).toBeLessThan(.85);
        expect(Math.abs(projected.y)).toBeLessThan(.82);
      }
      const cockpit = new Vector3(0, 2.8, -5.2).applyEuler(rotation).add(authoritativePosition).project(rig.camera);
      const engines = new Vector3(0, 2.65, 14).applyEuler(rotation).add(authoritativePosition).project(rig.camera);
      expect(Math.abs(cockpit.x - engines.x)).toBeGreaterThan(.3);
      expect(rig.camera.getWorldDirection(new Vector3()).dot(focus.clone().sub(rig.camera.position).normalize())).toBeCloseTo(1, 8);
      expect([focus, forward]).toEqual(inputs);
      expect(authoritativeForward.toArray()).toEqual([0, 0, 1]);
      expect(authoritativePosition.toArray()).toEqual([18600, -10.3, 14.6]);
    }
    rig.dispose();
  });

  it('restores ordinary and replay camera framing exactly after a combat cut', () => {
    const actual = new CinematicCamera(), baseline = new CinematicCamera();
    const subject = { position: new Vector3(100, 2, -30), forward: new Vector3(0, 0, 1), velocity: new Vector3(0, 0, 120), speed: 120 };
    actual.setMode('side'); actual.setCombatFraming(true);
    actual.snap({ ...subject, combatFocus: new Vector3(105, 3, -28), combatForward: new Vector3(1, 0, 0), combatRadius: 19 });
    actual.setCombatFraming(false);
    for (const highlight of [false, true]) for (const mode of ['chase', 'side', 'cockpit', 'hero'] as const) {
      actual.setHighlightFraming(highlight); baseline.setHighlightFraming(highlight);
      actual.setMode(mode); baseline.setMode(mode);
      // Even a stale optional combat subject cannot affect any ordinary/replay shot.
      actual.snap({ ...subject, combatFocus: new Vector3(900, -100, 700), combatForward: new Vector3(-1, 0, 0), combatRadius: 100 });
      baseline.snap(subject);
      expect(actual.camera.position.toArray()).toEqual(baseline.camera.position.toArray());
      expect(actual.camera.quaternion.toArray()).toEqual(baseline.camera.quaternion.toArray());
      expect(actual.camera.fov).toEqual(baseline.camera.fov);
    }
    actual.dispose(); baseline.dispose();
  });

  it('uses a finite fallback for unavailable imported bounds and follows a translated visual subject', () => {
    const rig = new CinematicCamera(); rig.setMode('side'); rig.setCombatFraming(true);
    const subject = { position: new Vector3(), forward: new Vector3(0, 0, 1), velocity: new Vector3(), speed: 0,
      combatFocus: new Vector3(2, 3, 4), combatForward: new Vector3(1, 0, 0), combatRadius: Number.NaN };
    rig.snap(subject); const offset = rig.camera.position.clone().sub(subject.position);
    for (let index = 0; index < 30; index++) {
      subject.position.x += 1; subject.combatFocus.x += 1;
      rig.update(1 / 60, index / 60, subject);
    }
    expect(rig.camera.position.clone().sub(subject.position).distanceTo(offset)).toBeLessThan(.001);
    expect(rig.camera.position.toArray().every(Number.isFinite)).toBe(true);
    rig.dispose();
  });
  it('keeps the tumbling rigid body inside restored chase throughout the exit spring', () => {
    const min = new Vector3(-6.545275, .072866, -7.39), max = new Vector3(6.496448, 5.250974, 22.738541);
    const bounds = new Box3(min, max), center = bounds.getCenter(new Vector3()), radius = bounds.getSize(new Vector3()).length() * .5;
    for (const aspect of [1440 / 900, 390 / 844]) {
      const rig = new CinematicCamera(); rig.camera.aspect = aspect; rig.setMode('side'); rig.setCombatFraming(true);
      const subject = { position: new Vector3(), forward: new Vector3(0, 0, 1), velocity: new Vector3(), speed: 0,
        combatFocus: new Vector3(), combatForward: new Vector3(), combatRadius: radius, wreckChase: false };
      const rotation = new Euler(0, 0, 0, 'YXZ');
      for (let frame = 0; frame < 100; frame++) {
        const time = 7.9 + frame / 60, yaw = time * 1.25;
        rotation.set(.34 + Math.sin(time * 5.1) * .16, yaw, -.92 + Math.sin(time * 7.4) * .34, 'YXZ');
        subject.combatFocus.copy(center).applyEuler(rotation);
        subject.combatForward.set(Math.sin(yaw), 0, Math.cos(yaw));
        if (frame === 0) rig.snap(subject);
        else {
          rig.setCombatFraming(false); rig.setMode('chase'); subject.wreckChase = true;
          rig.update(1 / 60, time, subject);
        }
        rig.camera.updateMatrixWorld(true);
        for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
          const point = new Vector3(x, y, z).applyEuler(rotation).project(rig.camera);
          expect(Math.abs(point.x)).toBeLessThan(.98);
          expect(Math.abs(point.y)).toBeLessThan(.98);
        }
      }
      subject.wreckChase = false;
      const baseline = new CinematicCamera(); baseline.camera.aspect = aspect;
      baseline.snap(subject); rig.snap(subject);
      expect(rig.camera.position.toArray()).toEqual(baseline.camera.position.toArray());
      expect(rig.camera.quaternion.toArray()).toEqual(baseline.camera.quaternion.toArray());
      rig.dispose(); baseline.dispose();
    }
  });

  it('never doubles the physical pilot with the legacy camera-space body overlay', () => {
    const rig = new CinematicCamera();
    const overlay = rig.camera.getObjectByName('Cockpit camera instrument frame');
    expect(overlay).toBeDefined();
    expect(overlay!.visible).toBe(false);

    rig.setMode('cockpit');
    expect(overlay!.visible).toBe(false);

    rig.setMode('chase');
    expect(overlay!.visible).toBe(false);
  });

  it('pulls the capture results orbit back far enough to frame the four-racer tableau', () => {
    const rig = new CinematicCamera();
    rig.setCaptureMode(true);
    rig.setMode('hero');
    rig.snap({
      position: new Vector3(),
      forward: new Vector3(0, 0, 1),
      velocity: new Vector3(0, 0, 160),
      speed: 160,
    });
    const horizontalDistance = Math.hypot(rig.camera.position.x, rig.camera.position.z);
    expect(horizontalDistance).toBeGreaterThanOrEqual(107.99);
    expect(horizontalDistance).toBeLessThanOrEqual(108.01);
    expect(rig.camera.position.y).toBeCloseTo(28, 5);
  });

  it('frames the full eight-racer stationary countdown grid', () => {
    const rig = new CinematicCamera();
    rig.setCaptureMode(true);
    rig.setMode('hero');
    rig.snap({
      position: new Vector3(),
      forward: new Vector3(0, 0, 1),
      velocity: new Vector3(),
      speed: 0,
    });
    const horizontalDistance = Math.hypot(rig.camera.position.x, rig.camera.position.z);
    expect(horizontalDistance).toBeCloseTo(110, 5);
    expect(rig.camera.position.y).toBeCloseTo(40, 5);
  });

  it('uses a close fixed-FOV two-racer highlight lens without changing gameplay side framing', () => {
    const rig = new CinematicCamera();
    const subject = {
      position: new Vector3(),
      forward: new Vector3(0, 0, 1),
      velocity: new Vector3(0, 0, 170),
      speed: 170,
    };
    rig.setMode('side');
    rig.snap(subject);
    const gameplayDistance = rig.camera.position.length();

    rig.setHighlightFraming(true);
    rig.snap(subject);
    const highlightDistance = rig.camera.position.length();
    expect(highlightDistance).toBeGreaterThan(30);
    expect(highlightDistance).toBeLessThan(32);
    expect(rig.camera.position.y).toBeCloseTo(9, 5);
    expect(rig.camera.fov).toBe(60);

    rig.setHighlightFraming(false);
    rig.snap(subject);
    expect(rig.camera.position.length()).toBeCloseTo(gameplayDistance, 5);
  });

  it('applies normalized motion-comfort settings to FOV and shake', () => {
    const rig = new CinematicCamera();
    rig.setComfortSettings({
      shakeIntensity: 4,
      fovKickIntensity: -2,
      reducedMotion: true,
    });
    expect(rig.getComfortSettings()).toEqual({
      shakeIntensity: 1,
      fovKickIntensity: 0,
      reducedMotion: true,
    });

    rig.setMode('chase');
    rig.snap({
      position: new Vector3(),
      forward: new Vector3(0, 0, 1),
      velocity: new Vector3(0, 0, 230),
      speed: 230,
    });
    expect(rig.camera.fov).toBe(62);

    const before = rig.camera.position.clone();
    rig.impulse(2);
    rig.update(1 / 60, 1, {
      position: new Vector3(),
      forward: new Vector3(0, 0, 1),
      velocity: new Vector3(0, 0, 230),
      speed: 230,
    });
    expect(rig.camera.position.x).toBeCloseTo(before.x, 3);
  });
});

describe('Inkstorm driving composition', () => {
  const subject = () => ({
    position: new Vector3(), forward: new Vector3(0, 0, 1),
    velocity: new Vector3(0, 0, 180), speed: 180,
  });

  it('separates Polwo engine and cockpit depth in the live chase view without moving race state', () => {
    const rig = new CinematicCamera(), state = subject();
    const cockpit = new Vector3(0, 4.2725, -5.2), engine = new Vector3(-3.9292, 1.6775, 13);
    rig.snap(state); rig.camera.updateMatrixWorld(true);
    const previousSeparation = engine.clone().project(rig.camera).y - cockpit.clone().project(rig.camera).y;
    rig.snap({ ...state, chaseClearance: vehicleChaseClearance('polwo') });
    rig.camera.updateMatrixWorld(true);
    const pilotProjection = cockpit.clone().project(rig.camera), engineProjection = engine.clone().project(rig.camera);
    expect(engineProjection.y - pilotProjection.y).toBeGreaterThan(previousSeparation * 2);
    expect(pilotProjection.y).toBeGreaterThan(-.8);
    expect(engineProjection.y).toBeLessThan(0);
    expect(rig.camera.getWorldDirection(new Vector3()).y).toBeGreaterThan(-.18);
    expect(state.position.toArray()).toEqual([0, 0, 0]);
    for (const appearance of ['teemto', 'sebulba', 'procedural'] as const) expect(vehicleChaseClearance(appearance)).toBe(0);
    rig.dispose();
  });

  it('bounds a junction orbit while preserving the foreground racer', () => {
    const rig=new CinematicCamera(),state=subject();
    rig.snap({...state,junctionLookAhead:new Vector3(-150,50,220),junctionWeight:1});
    const direction=rig.camera.getWorldDirection(new Vector3());
    expect(direction.x).toBeLessThan(-.15);
    expect(direction.x).toBeGreaterThan(-.26);
    expect(rig.camera.position.distanceTo(state.position)).toBeLessThan(22);
    for(const x of [-8,8]){
      const engine=new Vector3(x,1,8).project(rig.camera);
      expect(Math.abs(engine.x)).toBeLessThan(1);
      expect(engine.y).toBeGreaterThan(-1);expect(engine.y).toBeLessThan(.15);
    }
    expect(state.forward.toArray()).toEqual([0,0,1]);
    rig.dispose();
  });

  it('reveals a descending route with bounded pitch while leaving the subject unchanged', () => {
    const rig = new CinematicCamera(), state = subject();
    rig.snap(state);
    const level = rig.camera.getWorldDirection(new Vector3());
    rig.snap({...state,routeLookAhead:new Vector3(0,-1000,80)});
    const descent = rig.camera.getWorldDirection(new Vector3());
    expect(descent.y).toBeLessThan(level.y - .03);
    // The valley view remains within a comfortable fourteen-degree downward
    // aim, including pathological far-below preview points after recovery.
    expect(descent.y).toBeGreaterThan(-.242);
    expect(state.position.toArray()).toEqual([0,0,0]);
    rig.dispose();
  });

  it('keeps the moving craft close while showing a bounded route preview', () => {
    const rig = new CinematicCamera();
    const state = subject();
    rig.snap(state);
    expect(rig.camera.position.distanceTo(state.position)).toBeLessThan(31);
    expect(rig.camera.fov).toBeLessThan(73);
    const straight = rig.camera.getWorldDirection(new Vector3());
    rig.snap({ ...state, routeLookAhead: new Vector3(1000, 0, 10) });
    const curved = rig.camera.getWorldDirection(new Vector3());
    expect(curved.x).toBeGreaterThan(straight.x);
    expect(Math.abs(curved.x - straight.x)).toBeLessThan(0.09);
    expect(state.forward).toEqual(new Vector3(0, 0, 1));
    rig.dispose();
  });

  it('settles a landing compression without moving or tilting the simulated subject', () => {
    const rig = new CinematicCamera();
    rig.setComfortSettings({ reducedMotion: false });
    const state = subject();
    rig.snap(state);
    const restingY = rig.camera.position.y;
    rig.landingImpulse(1.2);
    for (let frame = 0; frame < 15; frame += 1) rig.update(1 / 60, frame / 60, state);
    expect(rig.camera.position.y).toBeLessThan(restingY - 0.03);
    for (let frame = 15; frame < 180; frame += 1) rig.update(1 / 60, frame / 60, state);
    expect(rig.camera.position.y).toBeCloseTo(restingY, 3);
    expect(state.position.length()).toBe(0);
    rig.dispose();
  });

  it('makes reduced motion remove both landing compression and speed FOV changes', () => {
    const rig = new CinematicCamera();
    const state = subject();
    rig.setComfortSettings({ reducedMotion: true, fovKickIntensity: 1 });
    rig.snap(state);
    const original = rig.camera.position.clone();
    rig.landingImpulse(2);
    rig.update(1 / 60, 5, state);
    expect(rig.camera.position).toEqual(original);
    expect(rig.camera.fov).toBe(62);
    rig.dispose();
  });
});


describe('live chase transport', () => {
  it('keeps the intended close composition during sustained 180 m/s movement', () => {
    const rig = new CinematicCamera();
    const state = {
      position: new Vector3(), forward: new Vector3(0, 0, 1),
      velocity: new Vector3(0, 0, 180), speed: 180,
    };
    rig.snap(state);
    const originalOffset = rig.camera.position.clone().sub(state.position);
    for (let frame = 0; frame < 180; frame += 1) {
      state.position.addScaledVector(state.velocity, 1 / 60);
      rig.update(1 / 60, frame / 60, state);
    }
    const actualOffset = rig.camera.position.clone().sub(state.position);
    expect(actualOffset.distanceTo(originalOffset)).toBeLessThan(0.01);
    expect(actualOffset.length()).toBeLessThan(20);
    const direction = rig.camera.getWorldDirection(new Vector3());
    expect(direction.z).toBeGreaterThan(0.99);
    expect(direction.y).toBeGreaterThan(-0.08);
    rig.dispose();
  });
});
