import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Scene, Vector3, type WebGLRenderer } from 'three';
import { InkstormSunShadow } from '../../src/render/inkstorm/InkstormSunShadow';
import { InkstormSurfaceMaterial } from '../../src/render/inkstorm/InkstormSurfaceMaterial';

function rendererStub(fail = false, incompleteFrames=0) {
  const state = { target: { name: 'prior target' } as unknown, color: new Color('#aabbcc'), alpha: .4 };
  const renderer = { capabilities: { maxTextureSize: 4096 }, autoClear: false,
    getContext:()=>({isContextLost:()=>false,checkFramebufferStatus:()=>incompleteFrames-->0?36054:36053,FRAMEBUFFER:36160,FRAMEBUFFER_COMPLETE:36053}),
    getRenderTarget: () => state.target, getClearColor: (c: Color) => c.copy(state.color), getClearAlpha: () => state.alpha,
    setRenderTarget: (target: unknown) => { state.target = target; },
    setClearColor: (color: Color | number, alpha: number) => { state.color.set(color); state.alpha = alpha; },
    clear: vi.fn(), render: vi.fn(() => { if (fail) throw new Error('GPU failed'); }),
  };
  return { renderer: renderer as unknown as WebGLRenderer, state, render: renderer.render };
}

describe('static scenery sun atlas lifecycle', () => {
  it('falls back to a smaller complete framebuffer and never publishes an incomplete target', () => {
    for(const failures of [1,Infinity]){
      const atlas=new InkstormSunShadow(),stub=rendererStub(false,failures),geometry=new BoxGeometry(),material=new MeshBasicMaterial();
      const create=()=>{const group=new Group();group.add(new Mesh(geometry,material));return group;};
      if(failures===1){
        atlas.update(stub.renderer,1,create,new Scene());
        expect(atlas.receipt.size).toBe(2048);expect(atlas.uniforms.uWorldShadowReady.value).toBe(1);
      }else{
        expect(()=>atlas.update(stub.renderer,1,create,new Scene())).toThrow('framebuffer is incomplete');
        expect(atlas.uniforms.uWorldShadowReady.value).toBe(0);expect(stub.render).not.toHaveBeenCalled();
        expect(atlas.receipt.failure).toContain('incomplete');
      }
      atlas.dispose();geometry.dispose();material.dispose();
    }
  });

  it('settles preparation failures once and disposes empty clone buffers', () => {
    const atlas=new InkstormSunShadow(),stub=rendererStub();
    const fail=vi.fn(()=>{throw new Error('source unavailable');});
    expect(()=>atlas.update(stub.renderer,1,fail,new Scene())).toThrow('source unavailable');
    atlas.update(stub.renderer,1,fail,new Scene());expect(fail).toHaveBeenCalledTimes(1);
    const geometry=new BoxGeometry(),material=new MeshBasicMaterial(),mesh=new InstancedMesh(geometry,material,1);mesh.count=0;
    const dispose=vi.fn();mesh.addEventListener('dispose',dispose);
    atlas.update(stub.renderer,2,()=>{const group=new Group();group.add(mesh);return group;},new Scene());
    expect(dispose).toHaveBeenCalledTimes(1);expect(stub.render).not.toHaveBeenCalled();
    atlas.dispose();geometry.dispose();material.dispose();
  });
  it('bakes full placement geometry only once, then rebakes after a course or context change', () => {
    const atlas = new InkstormSunShadow(), stub = rendererStub(), receiving = new Scene();
    const material = new InkstormSurfaceMaterial(); receiving.add(new Mesh(new BoxGeometry(), material));
    const geometry = new BoxGeometry(30, 80, 30), sourceMaterial = new MeshBasicMaterial();
    const create = vi.fn(() => {
      const group = new Group(), mesh = new InstancedMesh(geometry, sourceMaterial, 2);
      mesh.setMatrixAt(0, new Matrix4().makeTranslation(-100, 40, 20));
      mesh.setMatrixAt(1, new Matrix4().makeTranslation(100, 40, 20)); group.add(mesh); return group;
    });
    const oldTarget = stub.state.target, oldColor = stub.state.color.clone();
    atlas.update(stub.renderer, 1, create, receiving); atlas.update(stub.renderer, 1, create, receiving);
    expect(stub.render).toHaveBeenCalledTimes(1); expect(create).toHaveBeenCalledTimes(1);
    expect(material.uniforms.uWorldShadow).toBe(atlas.uniforms.uWorldShadow);
    expect(material.uniforms.uWorldShadowReady!.value).toBe(1);
    for (const x of [-100, 100]) {
      const projected = new Vector3(x, 40, 20).applyMatrix4(atlas.uniforms.uWorldShadowMatrix.value);
      expect(projected.toArray().every(v => v > 0 && v < 1)).toBe(true);
    }
    atlas.invalidate(); expect(material.uniforms.uWorldShadowReady!.value).toBe(0);
    atlas.update(stub.renderer, 1, create, receiving); atlas.update(stub.renderer, 2, create, receiving);
    expect(stub.render).toHaveBeenCalledTimes(3); expect(atlas.receipt.bakes).toBe(3);
    expect(stub.state.target).toBe(oldTarget); expect(stub.state.color).toEqual(oldColor);
    expect(stub.state.alpha).toBe(.4); expect(stub.renderer.autoClear).toBe(false);
    atlas.dispose(); material.dispose(); geometry.dispose(); sourceMaterial.dispose();
    (receiving.children[0] as Mesh).geometry.dispose();
  });

  it('restores the active frame target and releases temporary instance buffers even when rendering fails', () => {
    const atlas = new InkstormSunShadow(), stub = rendererStub(true), group = new Group();
    const geometry = new BoxGeometry(), material = new MeshBasicMaterial(), mesh = new InstancedMesh(geometry, material, 1);
    const instanceDispose = vi.fn(), geometryDispose = vi.fn();
    mesh.addEventListener('dispose', instanceDispose); geometry.addEventListener('dispose', geometryDispose); group.add(mesh);
    const oldTarget = stub.state.target;
    expect(() => atlas.update(stub.renderer, 1, () => group, new Scene())).toThrow('GPU failed');
    expect(instanceDispose).toHaveBeenCalledTimes(1); expect(geometryDispose).not.toHaveBeenCalled();
    expect(stub.state.target).toBe(oldTarget); expect(stub.renderer.autoClear).toBe(false);
    expect(atlas.uniforms.uWorldShadowReady.value).toBe(0);
    atlas.dispose(); geometry.dispose(); material.dispose();
  });
});
