import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { applyTrailerCamera, validateTrailerCameraShot } from '../../src/camera/TrailerCamera';

describe('capture cinematography', () => {
  it('keeps the same local composition around a turning pod', () => {
    const camera = new PerspectiveCamera();
    const shot = { racerIndex: 0, eye: [10, 5, -20] as const, target: [0, 2, 10] as const, fov: 48 };
    applyTrailerCamera(camera, shot, { x: 100, y: 10, z: 200 }, Math.PI / 2);
    expect(camera.position.toArray()).toEqual([80, 15, 190]);
    const direction = camera.getWorldDirection(new Vector3());
    expect(direction.dot(new Vector3(30, -3, 10).normalize())).toBeCloseTo(1);
    expect(camera.fov).toBe(48);
  });
  it('holds a trackside camera in world space while tracking the racer', () => {
    const camera = new PerspectiveCamera();
    const shot = { racerIndex: 1, eye: [0, 5, -20] as const, target: [0, 0, 0] as const,
      fov: 60, worldEye: [12, 8, 30] as const };
    applyTrailerCamera(camera, shot, { x: 100, y: 0, z: 200 }, 0);
    expect(camera.position.toArray()).toEqual([12, 8, 30]);
  });
  it('rejects invalid shots and does not retain mutable caller arrays', () => {
    const shot = { racerIndex: 0, eye: [10, 5, -20] as [number,number,number],
      target: [0, 0, 0] as const, fov: 48 };
    const copy = validateTrailerCameraShot(shot);
    shot.eye[0] = 900;
    expect(copy.eye[0]).toBe(10);
    expect(() => validateTrailerCameraShot({ ...shot, fov: NaN })).toThrow();
    expect(() => validateTrailerCameraShot({ ...shot, racerIndex: -1 })).toThrow();
  });
});
