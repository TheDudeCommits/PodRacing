import { describe, expect, it } from 'vitest';
import { Camera, PerspectiveCamera, Vector2, Vector3, Vector4 } from 'three';
import { SobelEdgePass } from '../../src/render/post/SobelEdgePass';

function uniforms(pass: SobelEdgePass) {
  return (pass as unknown as { sobelUniforms: {
    uContactProjection: { value: Vector4 };
    uContactDepth: { value: Vector2 };
    uContactValid: { value: number };
  } }).sobelUniforms;
}

describe('contact shading camera reconstruction', () => {
  it('recovers view positions from projected pixels through FOV and view-offset changes', () => {
    const camera = new PerspectiveCamera(63.234, 1.6, .1, 6000);
    const pass = new SobelEdgePass({ contactStrength: .85 });
    for (const fov of [45, 63.234, 86]) {
      camera.fov = fov;
      for (const offset of [false, true]) {
        if (offset) camera.setViewOffset(2400, 1350, 200, 100, 1900, 1100);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
        pass.setCamera(camera);
        const u = uniforms(pass), p = u.uContactProjection.value, range = u.uContactDepth.value;
        expect(u.uContactValid.value).toBe(1);
        for (const depth of [.4, 20, 600, 4000]) {
          for (const side of [-.27, 0, .31]) {
            const view = new Vector3(depth * side, depth * -.13, -depth);
            const ndc = view.clone().applyMatrix4(camera.projectionMatrix);
            const packedLinearDepth = (depth - camera.near) / (camera.far - camera.near);
            const restoredDepth = range.x + packedLinearDepth * range.y;
            const restored = new Vector3((ndc.x + p.z) * restoredDepth * p.x,
              (ndc.y + p.w) * restoredDepth * p.y, -restoredDepth);
            expect(restored.distanceTo(view)).toBeLessThan(1e-8);
          }
        }
      }
    }
    pass.dispose();
  });

  it('disables reconstruction for non-perspective and invalid depth ranges', () => {
    const pass = new SobelEdgePass();
    pass.setCamera(new PerspectiveCamera(60, 1, .1, 2000));
    expect(uniforms(pass).uContactValid.value).toBe(1);
    pass.setCamera(new Camera());
    expect(uniforms(pass).uContactValid.value).toBe(0);
    const invalid = new PerspectiveCamera(60, 1, 2, 1);
    pass.setCamera(invalid);
    expect(uniforms(pass).uContactValid.value).toBe(0);
    pass.dispose();
  });
});
