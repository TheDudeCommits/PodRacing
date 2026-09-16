import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CinematicCamera } from '../../src/camera/CinematicCamera';

describe('final straight chase framing', () => {
  it('moves the chase eye in and low and looks further down the road', () => {
    const at = (finalStraight: number) => {
      const rig = new CinematicCamera();
      rig.setMode('chase');
      const subject = { position: new Vector3(0, 2, 0), forward: new Vector3(0, 0, 1), velocity: new Vector3(0, 0, 90), speed: 90, finalStraight };
      rig.snap(subject);
      return { distance: rig.camera.position.distanceTo(subject.position), height: rig.camera.position.y };
    };
    const normal = at(0), tight = at(1);
    expect(tight.distance).toBeLessThan(normal.distance - 3);
    expect(tight.height).toBeLessThan(normal.height - 1);
  });
});
