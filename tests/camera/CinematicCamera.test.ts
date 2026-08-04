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
