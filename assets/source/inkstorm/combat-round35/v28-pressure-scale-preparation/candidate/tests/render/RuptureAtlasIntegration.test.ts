import { Matrix4, MeshBasicMaterial, PerspectiveCamera, ShaderLib, Texture, UniformsUtils, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { GalacticEffectsView } from '../../src/render/galactic/GalacticEffectsView';
import { ruptureArtworkScale, type RuptureAtlasOptions } from '../../src/render/galactic/RuptureFlameAtlas';

function pendingTexture() {
  const texture = new Texture({ width: 1254, height: 1254 } as HTMLImageElement);
  let done: ((value: Texture<HTMLImageElement>) => void) | undefined;
  const loader: NonNullable<RuptureAtlasOptions['loader']> = { load: (_url, ok) => { done = ok; return texture; } };
  return { loader, ready: () => done?.(texture) };
}
const event = Object.freeze({ type: 'crash' as const, time: 4, position: Object.freeze({ x: 0, y: 8, z: 0 }),
  groundY: 0, severity: 2, style: 'redline' as const,
  surfaceNormal: Object.freeze({ x: 1, y: 0, z: 0 }), wreckOwner: 0, wreckSequence: 7 });
function state(view: GalacticEffectsView) {
  return [view.explosionPlates, view.crashDebris].map(m => ({ count: m.count,
    matrices: Array.from(m.instanceMatrix.array.slice(0, m.count * 16)),
    colors: Array.from(m.instanceColor?.array.slice(0, m.count * 3) ?? []),
    surface: Array.from(m.geometry.getAttribute('aEffectSurface')?.array.slice(0, m.count * 3) ?? []),
  }));
}

describe('rooted artwork on the existing authored plates', () => {
  it('keeps every live matrix/color/age/pool identical before and after a mid-event texture completion', () => {
    const pending = pendingTexture(), fallback = new GalacticEffectsView();
    const trial = new GalacticEffectsView({ flameAtlas: { url: '/trial.png', loader: pending.loader } });
    const camera = new PerspectiveCamera(60, 1.6, .35, 1000);
    camera.position.set(0, 15, 35); camera.lookAt(0, 8, 0); camera.updateMatrixWorld();
    try {
      fallback.emitCrash(event); trial.emitCrash(event);
      for (const age of [0, .08, .3, .7, 1.5, 2.3]) {
        fallback.update(4 + age, camera); trial.update(4 + age, camera);
        expect(state(trial)).toEqual(state(fallback));
        if (age === .7) {
          const before = state(trial); pending.ready(); trial.update(4 + age, camera);
          expect(state(trial)).toEqual(before); expect(trial.flameAtlasDiagnostics.status).toBe('ready');
        }
      }
      expect(trial.children).toHaveLength(8); expect(trial.explosionPlates.count).toBe(0);
      trial.syncWreckRupture(0, -1); trial.clearEffects(); expect(trial.crashDebris.count).toBe(0);
    } finally { trial.dispose(); fallback.dispose(); }
  });

  it('maps all four measured roots to the same plate center with one animated optical scale despite unequal rectangles and pulse/stretch', () => {
    const view = new GalacticEffectsView(), camera = new PerspectiveCamera();
    camera.position.set(15, 18, 30); camera.lookAt(0, 8, 0); camera.updateMatrixWorld();
    const matrix = new Matrix4(), axis = new Vector3();
    try {
      view.emitCrash(event);
      for (const age of [0, .08, .25, .6, 1.6]) {
        view.update(4 + age, camera);
        const span = view.explosionPlates.geometry.getAttribute('aRuptureAtlasSpan');
        const kind = view.explosionPlates.geometry.getAttribute('aEffectSurface');
        for (let i = 0; i < view.explosionPlates.count; i++) {
          if (kind.getX(i) < 6 || kind.getX(i) > 7) { expect(span.getX(i)).toBe(0); continue; }
          view.explosionPlates.getMatrixAt(i, matrix);
          const metresPerPixelX = axis.setFromMatrixColumn(matrix, 0).length() / span.getX(i);
          const metresPerPixelY = axis.setFromMatrixColumn(matrix, 1).length() / span.getY(i);
          const fireAge = kind.getX(i) === 6 ? age : age - .065;
          const scale = ruptureArtworkScale(kind.getX(i) === 6, fireAge);
          expect(metresPerPixelX).toBeCloseTo(scale / 120, 7); expect(metresPerPixelY).toBeCloseTo(scale / 120, 7);

        }
      }
      const mat = view.explosionPlates.material as MeshBasicMaterial;
      expect(mat.depthTest).toBe(true); expect(mat.depthWrite).toBe(false);
    } finally { view.dispose(); }
  });

  it('updates the compiled shader uniform in place and keeps the non-atlas procedural branch available', () => {
    const pending = pendingTexture(), view = new GalacticEffectsView({ flameAtlas: { url: '/trial.png', loader: pending.loader } });
    try {
      const material = view.explosionPlates.material as MeshBasicMaterial;
      const shader = { vertexShader: ShaderLib.basic.vertexShader, fragmentShader: ShaderLib.basic.fragmentShader,
        uniforms: UniformsUtils.clone(ShaderLib.basic.uniforms) } as Parameters<typeof material.onBeforeCompile>[0];
      material.onBeforeCompile(shader, undefined as never);
      expect(shader.uniforms.uRuptureAtlasReady!.value).toBe(0);
      pending.ready(); expect(shader.uniforms.uRuptureAtlasReady!.value).toBe(1);
      expect(shader.fragmentShader).toContain('vEffectSurface.x > 5.5 && vEffectSurface.x < 7.5');
      expect(shader.fragmentShader).toContain('else if (vEffectSurface.x > 7.5)');
      view.dispose(); expect(shader.uniforms.uRuptureAtlasReady!.value).toBe(0);
    } finally { if (view.flameAtlasDiagnostics.status !== 'disposed') view.dispose(); }
  });
});
