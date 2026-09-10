import { SALT_DUSK_SUN } from '../../src/render/saltDusk/SaltDuskLighting';
import { describe, expect, it, vi } from 'vitest';
import {
  BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, Scene, ShaderChunk,
  ShaderMaterial, Vector3, Vector4, type WebGLRenderer, type WebGLRenderTarget,
} from 'three';
import {
  createInkstormRacerShadowUniforms, INKSTORM_RACER_SHADOW_GLSL, InkstormRacerShadow,
} from '../../src/render/inkstorm/InkstormRacerShadow';
import { PodracerView } from '../../src/render/objects/PodracerView';

function rendererStub() {
  const state = {
    target: { name: 'previous target' } as unknown as WebGLRenderTarget | null,
    color: new Color('#aabbcc'), alpha: .4, viewport: new Vector4(1, 2, 300, 200),
    scissor: new Vector4(3, 4, 100, 90), scissorTest: true, cubeFace: 2, mip: 1,
    contextLost: false, incompleteFrames: 0, renderFailure: false,
  };
  const info = { autoReset: true, render: { calls: 9, triangles: 100 } };
  const renderer = {
    capabilities: { maxTextureSize: 4096, reversedDepthBuffer: false },
    autoClear: false, xr: { enabled: true }, info,
    getContext: () => ({
      isContextLost: () => state.contextLost,
      checkFramebufferStatus: vi.fn(() => state.incompleteFrames-- > 0 ? 36054 : 36053),
      FRAMEBUFFER: 36160, FRAMEBUFFER_COMPLETE: 36053,
    }),
    getRenderTarget: () => state.target,
    getActiveCubeFace: () => state.cubeFace,
    getActiveMipmapLevel: () => state.mip,
    getClearColor: (c: Color) => c.copy(state.color), getClearAlpha: () => state.alpha,
    getViewport: (v: Vector4) => v.copy(state.viewport),
    getScissor: (v: Vector4) => v.copy(state.scissor), getScissorTest: () => state.scissorTest,
    setRenderTarget: vi.fn((target: WebGLRenderTarget | null, face = 0, mip = 0) => {
      state.target = target; state.cubeFace = face; state.mip = mip;
    }),
    setClearColor: (c: Color | number, alpha: number) => { state.color.set(c); state.alpha = alpha; },
    setViewport: (v: Vector4) => state.viewport.copy(v),
    setScissor: (v: Vector4) => state.scissor.copy(v),
    setScissorTest: (value: boolean) => { state.scissorTest = value; },
    clear: vi.fn(),
    render: vi.fn((scene: Scene) => {
      if (state.renderFailure) throw new Error('GPU failed');
      scene.updateMatrixWorld(true);
      scene.traverseVisible(object => {
        if (!(object instanceof Mesh)) return;
        info.render.calls++;
        info.render.triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      });
    }),
  };
  return { renderer: renderer as unknown as WebGLRenderer, api: renderer, state };
}

function fixture() {
  const geometry = new BoxGeometry(6, 2, 10), material = new MeshBasicMaterial();
  const player = new Group(), parent = new Group(), mesh = new Mesh(geometry, material);
  player.name = 'player'; mesh.name = 'shell'; player.position.set(35, 9, -40);
  parent.position.set(13, 3, 21); parent.rotation.y = .25;
  parent.add(player); player.add(mesh);
  return { geometry, material, player, mesh, parent };
}

function renderedMeshes(scene: Scene): Mesh[] {
  const meshes: Mesh[] = [];
  scene.traverseVisible(object => { if (object instanceof Mesh) meshes.push(object); });
  return meshes;
}

describe('bounded live player sun shadow', () => {
  it('projects the live mesh and its sun-directed ground footprint into one shallow atlas', () => {
    const atlas = new InkstormRacerShadow(), stub = rendererStub(), f = fixture();
    const receiver = new ShaderMaterial({ uniforms: createInkstormRacerShadowUniforms() });
    const receiving = new Scene(); receiving.add(f.parent, new Mesh(f.geometry, receiver));
    expect(atlas.update(stub.renderer, f.player, receiving, 5)).toBe(true);
    const center = new Vector3().setFromMatrixPosition(f.mesh.matrixWorld);
    const footprint = center.clone().addScaledVector(SALT_DUSK_SUN, -(center.y - 5) / SALT_DUSK_SUN.y);
    for (const world of [center, footprint]) {
      const projected = world.clone().applyMatrix4(atlas.uniforms.uRacerShadowMatrix.value);
      expect(projected.toArray().every(v => v > 0 && v < 1)).toBe(true);
    }
    expect(receiver.uniforms.uRacerShadow).toBe(atlas.uniforms.uRacerShadow);
    expect(atlas.receipt.depthMetres).toBeLessThan(384); // Same local volume, photographed grazing sun.
    expect(atlas.receipt.texelMetres).toBeLessThan(.08);
    expect(atlas.receipt.drawCalls).toBe(1);
    expect(atlas.receipt.drawnTriangles).toBe(12);
    expect(atlas.uniforms.uRacerShadowNormalBias.value).toBeGreaterThanOrEqual(.06);
    expect(atlas.uniforms.uRacerShadowNormalBias.value).toBeLessThan(.2);
    expect(f.geometry.boundingBox).toBeNull();
    const scene = stub.api.render.mock.calls[0]![0];
    const proxy = renderedMeshes(scene)[0]!;
    expect(proxy.geometry).toBe(f.geometry);
    expect(proxy.matrixWorld).toEqual(f.mesh.matrixWorld);
    const previousMatrix = atlas.uniforms.uRacerShadowMatrix.value.clone();
    f.player.position.x += 25;
    f.mesh.position.z += 3;
    atlas.update(stub.renderer, f.player, receiving, 5);
    expect(renderedMeshes(scene)[0]).toBe(proxy);
    expect(proxy.matrixWorld).toEqual(f.mesh.matrixWorld);
    expect(atlas.uniforms.uRacerShadowMatrix.value).not.toEqual(previousMatrix);
    expect(atlas.receipt.refreshes).toBe(1);
    atlas.dispose(); receiver.dispose(); f.geometry.dispose(); f.material.dispose();
  });

  it('honors source and ancestor visibility while excluding pilot, hull and non-opaque geometry', () => {
    const atlas = new InkstormRacerShadow(), stub = rendererStub(), f = fixture();
    const hidden = new Group(), pilot = new Group(), outline = new Mesh(f.geometry, f.material);
    hidden.visible = false; hidden.add(new Mesh(f.geometry, f.material));
    pilot.name = 'pilot-original'; pilot.add(new Mesh(f.geometry, f.material));
    outline.name = 'shell:ink-hull';
    const transparent = new MeshBasicMaterial({ transparent: true });
    const disabled = new MeshBasicMaterial({ visible: false });
    f.player.add(hidden, pilot, outline, new Mesh(f.geometry, transparent), new Mesh(f.geometry, disabled));
    const sources = [...f.player.children];
    atlas.update(stub.renderer, f.player, undefined, 5);
    expect(atlas.receipt.casters).toBe(1);
    expect(f.player.children).toEqual(sources);
    expect(f.mesh.material).toBe(f.material);
    expect(hidden.visible).toBe(false);
    hidden.visible = true;
    atlas.update(stub.renderer, f.player, undefined, 5);
    expect(atlas.receipt.casters).toBe(2);
    hidden.visible = false;
    f.parent.visible = false;
    expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(false);
    expect(atlas.receipt.casters).toBe(0);
    expect(atlas.uniforms.uRacerShadowReady.value).toBe(0);
    expect(stub.api.render).toHaveBeenCalledTimes(2);
    atlas.dispose(); f.geometry.dispose(); f.material.dispose(); transparent.dispose(); disabled.dispose();
  });

  it('caps actual submissions at 22 and keeps the largest visible opaque masses', () => {
    const atlas = new InkstormRacerShadow({ maxCasters: 100 }), stub = rendererStub(), f = fixture();
    for (let i = 0; i < 30; i++) {
      const trim = new Mesh(f.geometry, f.material);
      trim.scale.setScalar(.05 + i * .001); trim.position.x = i * .01;
      f.player.add(trim);
    }
    atlas.update(stub.renderer, f.player, undefined, 5);
    expect(atlas.receipt.candidates).toBe(31);
    expect(atlas.receipt.casters).toBe(22);
    expect(atlas.receipt.drawCalls).toBe(22);
    expect(atlas.receipt.omitted).toBe(9);
    expect(renderedMeshes(stub.api.render.mock.calls[0]![0]).some(mesh => mesh.name === 'shell:racer-shadow')).toBe(true);
    atlas.dispose(); f.geometry.dispose(); f.material.dispose();
  });

  it('keeps the actual four-class hero within budget without using its hidden prepass geometry', () => {
    const atlas = new InkstormRacerShadow(), stub = rendererStub(), player = new PodracerView();
    player.createCelPrepassProxy();
    const anchorMesh = new Mesh(new BoxGeometry(100, 100, 100), new MeshBasicMaterial());
    player.pilotAnchor.add(anchorMesh);
    const receipts: Record<string, { casters: number; candidates: number; omitted: number; triangles: number }> = {};
    for (const kind of ['podracer', 'landspeeder', 'speeder-bike', 'skim-speeder'] as const) {
      player.setVehicleClass(kind);
      expect(atlas.update(stub.renderer, player, undefined, -3)).toBe(true);
      expect(atlas.receipt.casters).toBeGreaterThan(0);
      expect(atlas.receipt.drawCalls).toBeLessThanOrEqual(22);
      const meshes = renderedMeshes(stub.api.render.mock.calls.at(-1)![0]);
      expect(meshes.every(mesh => !mesh.name.includes('prepass-proxy'))).toBe(true);
      receipts[kind] = {
        casters: atlas.receipt.casters, candidates: atlas.receipt.candidates,
        omitted: atlas.receipt.omitted, triangles: atlas.receipt.triangles,
      };
    }
    // Records the real installed procedural craft workload, not an FPS claim.
    expect(receipts).toMatchInlineSnapshot(`
      {
        "landspeeder": {
          "candidates": 24,
          "casters": 22,
          "omitted": 2,
          "triangles": 9904,
        },
        "podracer": {
          "candidates": 19,
          "casters": 19,
          "omitted": 0,
          "triangles": 13204,
        },
        "skim-speeder": {
          "candidates": 24,
          "casters": 22,
          "omitted": 2,
          "triangles": 9892,
        },
        "speeder-bike": {
          "candidates": 24,
          "casters": 22,
          "omitted": 2,
          "triangles": 9880,
        },
      }
    `);
    atlas.dispose(); player.pilotAnchor.remove(anchorMesh); anchorMesh.geometry.dispose();
    (anchorMesh.material as MeshBasicMaterial).dispose(); player.dispose();
  });

  it('clears the previous shadow outside its bounded world volume and recovers on landing', () => {
    const atlas = new InkstormRacerShadow(), stub = rendererStub(), f = fixture();
    atlas.update(stub.renderer, f.player, undefined, 5);
    f.player.position.y = 200;
    expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(false);
    expect(atlas.receipt.skipped).toBe('outside-local-volume');
    expect(atlas.uniforms.uRacerShadowReady.value).toBe(0);
    expect(atlas.uniforms.uRacerShadow.value).toBeNull();
    expect(stub.api.render).toHaveBeenCalledTimes(1);
    f.player.position.y = 9;
    expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(true);
    expect(atlas.receipt.skipped).toBeNull();
    expect(atlas.uniforms.uRacerShadowBoundsMin.value.y).toBe(0.5);
    expect(INKSTORM_RACER_SHADOW_GLSL).toContain('lessThan(world,uRacerShadowBoundsMin)');
    expect(INKSTORM_RACER_SHADOW_GLSL).toContain('p.z<0. || p.z>1.');
    atlas.dispose(); f.geometry.dispose(); f.material.dispose();
  });

  it('restores renderer state on failures, latches failures, and only retries after explicit invalidation', () => {
    const atlas = new InkstormRacerShadow({ resolution: 1024 }), stub = rendererStub(), f = fixture();
    const original = { ...stub.state, color: stub.state.color.clone(), viewport: stub.state.viewport.clone(), scissor: stub.state.scissor.clone() };
    stub.state.incompleteFrames = 1;
    expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(true);
    expect(atlas.receipt.size).toBe(512);
    expect(stub.state.target).toBe(original.target);
    expect(stub.state.color).toEqual(original.color);
    expect(stub.state.alpha).toBe(original.alpha);
    expect(stub.state.viewport).toEqual(original.viewport);
    expect(stub.state.scissor).toEqual(original.scissor);
    expect(stub.state.scissorTest).toBe(true);
    expect(stub.state.cubeFace).toBe(2); expect(stub.state.mip).toBe(1);
    expect(stub.renderer.autoClear).toBe(false);
    expect(stub.renderer.xr.enabled).toBe(true);
    expect(stub.renderer.info.autoReset).toBe(true);
    stub.state.renderFailure = true;
    expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(false);
    expect(atlas.receipt.failure).toContain('GPU failed');
    expect(stub.state.target).toBe(original.target);
    expect(stub.renderer.xr.enabled).toBe(true);
    stub.state.renderFailure = false;
    atlas.update(stub.renderer, f.player, undefined, 5);
    expect(stub.api.render).toHaveBeenCalledTimes(2);
    atlas.invalidate();
    expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(true);
    expect(atlas.receipt.failure).toBeNull();
    atlas.dispose(); f.geometry.dispose(); f.material.dispose();
  });

  it('does not publish incomplete framebuffers or auto-retry a lost context', () => {
    for (const failure of ['framebuffer', 'context'] as const) {
      const atlas = new InkstormRacerShadow(), stub = rendererStub(), f = fixture();
      if (failure === 'framebuffer') stub.state.incompleteFrames = Infinity;
      else stub.state.contextLost = true;
      expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(false);
      expect(atlas.receipt.failure?.toLowerCase()).toContain(failure);
      expect(atlas.uniforms.uRacerShadowReady.value).toBe(0);
      stub.state.incompleteFrames = 0; stub.state.contextLost = false;
      expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(false);
      expect(stub.api.render).not.toHaveBeenCalled();
      atlas.invalidate();
      expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(true);
      atlas.dispose(); f.geometry.dispose(); f.material.dispose();
    }
  });

  it('releases only adapter resources and preserves source geometry/materials across refresh and disposal', () => {
    const atlas = new InkstormRacerShadow(), stub = rendererStub(), f = fixture();
    const geometryDispose = vi.fn(), materialDispose = vi.fn();
    f.geometry.addEventListener('dispose', geometryDispose);
    f.material.addEventListener('dispose', materialDispose);
    atlas.update(stub.renderer, f.player, undefined, 5);
    const target = stub.api.setRenderTarget.mock.calls.find(([candidate]) => candidate?.texture === atlas.uniforms.uRacerShadow.value)![0]!;
    const depth = renderedMeshes(stub.api.render.mock.calls[0]![0])[0]!.material as MeshBasicMaterial;
    const targetDispose = vi.fn(), depthDispose = vi.fn();
    target.addEventListener('dispose', targetDispose); depth.addEventListener('dispose', depthDispose);
    atlas.refreshCasters(f.player);
    atlas.dispose(); atlas.dispose();
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    expect(depthDispose).toHaveBeenCalledTimes(1);
    expect(targetDispose).toHaveBeenCalledTimes(1);
    expect(f.mesh.parent).toBe(f.player);
    expect(f.mesh.geometry).toBe(f.geometry);
    expect(atlas.uniforms.uRacerShadowReady.value).toBe(0);
    expect(atlas.update(stub.renderer, f.player, undefined, 5)).toBe(false);
    f.geometry.dispose(); f.material.dispose();
  });

  it('matches the installed Three RGBA depth packing order including white-clear far depth', () => {
    expect(ShaderChunk.packing).toContain('vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a )');
    expect(INKSTORM_RACER_SHADOW_GLSL).toContain('vec4(255./256.,255./65536.,255./16777216.,1./16777216.)');
    const factors = [255 / 256, 255 / 65536, 255 / 16777216, 1 / 16777216];
    expect(factors.reduce((a, b) => a + b, 0)).toBe(1);
    for (const depth of [.001, .1234567, .5, .999999]) {
      const wholeA = Math.floor(depth * 16777216), a = depth * 16777216 - wholeA;
      const wholeB = Math.floor(wholeA / 256), b = wholeA / 256 - wholeB;
      const r = Math.floor(wholeB / 256), g = wholeB / 256 - r;
      const packed = [r / 255, g * 256 / 255, b * 256 / 255, a];
      expect(packed.reduce((sum, value, index) => sum + value * factors[index]!, 0)).toBeCloseTo(depth, 12);
    }
  });
});
