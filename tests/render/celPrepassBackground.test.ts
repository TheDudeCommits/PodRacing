import { Color, PerspectiveCamera, Scene, WebGLRenderTarget, type WebGLRenderer } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CelPostPipeline } from '../../src/render/post/CelPostPipeline';
import { CelPrepassMaterial } from '../../src/render/post/CelPrepassMaterial';

describe('MRT background ownership', () => {
  it.each([false, true])('preserves independent MRT clears and restores the beauty background (draw throws: %s)', throws => {
    const scene = new Scene(), background = new Color('#281f56');
    scene.background = background;
    const previousTarget = new WebGLRenderTarget(), mrt = new WebGLRenderTarget(1, 1, { count: 2 });
    let activeTarget = previousTarget;
    const clears: number[][] = [];
    const renderer = {
      capabilities: { isWebGL2: false }, autoClear: true,
      getRenderTarget: () => activeTarget,
      setRenderTarget: (target: WebGLRenderTarget) => { activeTarget = target; },
      clearDepth: vi.fn(),
      getContext: () => ({ COLOR: 0x1800, clearBufferfv: (_kind: number, attachment: number, color: Float32Array) => { clears[attachment] = [...color]; } }),
      render: vi.fn(() => {
        // Three forcibly clears a Color background even with autoClear=false.
        // The prepass must therefore withhold it until the beauty pass.
        expect(scene.background).toBeNull();
        expect(renderer.autoClear).toBe(false);
        expect(activeTarget).toBe(mrt);
        if (throws) throw new Error('simulated draw failure');
      }),
    };
    const post = new CelPostPipeline(renderer as unknown as WebGLRenderer, scene, new PerspectiveCamera());
    const material = new CelPrepassMaterial();
    Object.assign(post, { prepassTarget: mrt, prepassMaterial: material });
    const renderPrepass = () => (post as unknown as { renderPrepass(): void }).renderPrepass();
    try {
      if (throws) expect(renderPrepass).toThrow('simulated draw failure');
      else renderPrepass();
      expect(clears).toEqual([[.5, .5, 1, 0], [1, 1, 1, 0]]);
      expect(scene.background).toBe(background);
      expect(scene.overrideMaterial).toBeNull();
      expect(renderer.autoClear).toBe(true);
      expect(activeTarget).toBe(previousTarget);
    } finally { post.dispose(); previousTarget.dispose(); }
  });
});
