import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

/** Capture-only camera moves. Coordinates are right/up/forward in the racer's frame. */
export interface TrailerCameraShot {
  racerIndex: number;
  eye: readonly [number, number, number];
  target: readonly [number, number, number];
  fov: number;
  /** A fixed trackside eye; the target continues to follow the real racer. */
  worldEye?: readonly [number, number, number];
}

export function validateTrailerCameraShot(shot: TrailerCameraShot): TrailerCameraShot {
  if (!Number.isInteger(shot.racerIndex) || shot.racerIndex < 0 || shot.racerIndex > 7
    || !Number.isFinite(shot.fov) || shot.fov < 20 || shot.fov > 110
    || ![shot.eye, shot.target, ...(shot.worldEye ? [shot.worldEye] : [])]
      .every(v => v.length === 3 && v.every(n => Number.isFinite(n) && Math.abs(n) < 100_000))) {
    throw new Error('Invalid trailer camera shot.');
  }
  return { ...shot, eye: [...shot.eye], target: [...shot.target],
    ...(shot.worldEye ? { worldEye: [...shot.worldEye] as [number, number, number] } : {}) };
}

const look = new Vector3();
export function applyTrailerCamera(
  camera: PerspectiveCamera, shot: TrailerCameraShot,
  position: { x: number; y: number; z: number }, yaw: number,
): void {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  const place = (out: Vector3, offset: readonly number[]) => out.set(
    position.x + cos * offset[0]! + sin * offset[2]!,
    position.y + offset[1]!,
    position.z - sin * offset[0]! + cos * offset[2]!,
  );
  if (shot.worldEye) camera.position.fromArray(shot.worldEye);
  else place(camera.position, shot.eye);
  place(look, shot.target);
  camera.fov = MathUtils.clamp(shot.fov, 20, 110);
  camera.updateProjectionMatrix();
  camera.lookAt(look);
}
