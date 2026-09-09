import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import { CinematicCamera } from '../../src/camera/CinematicCamera';

describe('cinematic cockpit presentation', () => {
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
