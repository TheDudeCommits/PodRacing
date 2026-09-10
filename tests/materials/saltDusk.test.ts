import { afterEach, describe, expect, it, vi } from 'vitest';
import { Matrix3, Texture, TextureLoader, SRGBColorSpace } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { acquireSaltDuskAssets, saltDuskUniforms } from '../../src/render/saltDusk/SaltDuskAssets';
import { SALT_DUSK_SUN } from '../../src/render/saltDusk/SaltDuskLighting';
import { SaltDuskVehicleMaterial } from '../../src/render/saltDusk/SaltDuskVehicleMaterial';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('photographic dusk resource and material contracts',()=>{
  it('rotates the photographed sun into the same direction used by both shadow atlases',()=>{
    const u=saltDuskUniforms();
    const actualU=(Math.atan2(SALT_DUSK_SUN.z,SALT_DUSK_SUN.x)/(Math.PI*2)+.5+u.uDuskEnvironmentRotation.value+1)%1;
    const actualV=Math.asin(SALT_DUSK_SUN.y)/Math.PI+.5;
    expect(actualU).toBeCloseTo(.6119384765625,8);
    expect(actualV).toBeCloseTo(.525634765625,8);
  });

  it('keeps borrowed glTF metallic texture, independent UV transform and factor across material disposal',()=>{
    const metal=new Texture();metal.channel=2;metal.offset.set(.2,.3);metal.repeat.set(2,-1);
    const original=metal.matrix.clone(),dispose=vi.spyOn(metal,'dispose');
    const a=new SaltDuskVehicleMaterial({roughness:.7},.65,metal);
    const b=new SaltDuskVehicleMaterial({roughness:.4},.2,metal);
    expect(a.uniforms.uDuskMetalnessMap?.value).toBe(metal);
    expect(a.uniforms.uDuskMetalness?.value).toBe(.65);
    expect(a.uniforms.uDuskMetalnessUvTransform?.value).toEqual(new Matrix3().setUvTransform(.2,.3,2,-1,0,0,0));
    expect(a.vertexShader).toContain('vec3(uv2,1.)');
    expect(a.fragmentShader).toContain('texture2D(uDuskMetalnessMap,vDuskMetalnessUv).b');
    a.dispose();expect(dispose).not.toHaveBeenCalled();
    expect(b.uniforms.uDuskMetalnessMap?.value).toBe(metal);expect(metal.matrix).toEqual(original);
    b.dispose();expect(dispose).not.toHaveBeenCalled();metal.dispose();
  });

  it('shares one settled upload set and only releases it after both sky and preview leases close',async()=>{
    vi.stubGlobal('document',{});
    const textures:Texture[]=[];
    const make=()=>{const t=new Texture();textures.push(t);vi.spyOn(t,'dispose');return Promise.resolve(t);};
    const maps=vi.spyOn(TextureLoader.prototype,'loadAsync').mockImplementation(make as never);
    const hdr=vi.spyOn(HDRLoader.prototype,'loadAsync').mockImplementation(make as never);
    const sky=acquireSaltDuskAssets(),preview=acquireSaltDuskAssets();
    await Promise.all([sky.ready,preview.ready]);
    const u=saltDuskUniforms();
    expect(maps).toHaveBeenCalledTimes(7);expect(hdr).toHaveBeenCalledTimes(1);
    expect(u.uDuskGround.value?.colorSpace).toBe(SRGBColorSpace);
    expect(u.uDuskGroundNormal.value?.colorSpace).not.toBe(SRGBColorSpace);
    expect(u.uDuskEnvironmentReady.value).toBe(1);
    sky.release();sky.release();expect(textures.every(t=>vi.mocked(t.dispose).mock.calls.length===0)).toBe(true);
    preview.release();expect(textures.every(t=>vi.mocked(t.dispose).mock.calls.length===1)).toBe(true);
    expect(u.uDuskEnvironment.value).toBeNull();expect(u.uDuskGroundReady.value).toBe(0);
  });

  it('disposes late downloads instead of publishing them into a new app generation',async()=>{
    vi.stubGlobal('document',{});
    const pending:{texture:Texture;resolve:(t:Texture)=>void}[]=[];
    const defer=()=>new Promise<Texture>(resolve=>{const texture=new Texture();vi.spyOn(texture,'dispose');pending.push({texture,resolve});});
    vi.spyOn(TextureLoader.prototype,'loadAsync').mockImplementation(defer as never);
    vi.spyOn(HDRLoader.prototype,'loadAsync').mockImplementation(defer as never);
    const old=acquireSaltDuskAssets();old.release();
    const current=acquireSaltDuskAssets();
    const obsolete=pending.slice(0,8),fresh=pending.slice(8);
    obsolete.forEach(p=>p.resolve(p.texture));await old.ready;
    expect(saltDuskUniforms().uDuskEnvironmentReady.value).toBe(0);
    expect(obsolete.every(p=>vi.mocked(p.texture.dispose).mock.calls.length===1)).toBe(true);
    fresh.forEach(p=>p.resolve(p.texture));await current.ready;
    expect(saltDuskUniforms().uDuskEnvironmentReady.value).toBe(1);
    current.release();expect(fresh.every(p=>vi.mocked(p.texture.dispose).mock.calls.length===1)).toBe(true);
  });
});
