import { LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { SALT_DUSK_SUN } from './SaltDuskLighting';

const uniforms = {
  uDuskSun: { value: SALT_DUSK_SUN.clone() },
  uDuskEnvironment: { value: null as Texture|null },
  uDuskEnvironmentReady: { value: 0 },
  uDuskEnvironmentRotation: { value: -0.0572179937 },
  uDuskEnvironmentExposure: { value: .4 },
  uDuskGround: { value: null as Texture|null },
  uDuskGroundNormal: { value: null as Texture|null },
  uDuskGroundRoughness: { value: null as Texture|null },
  uDuskRock: { value: null as Texture|null },
  uDuskRockNormal: { value: null as Texture|null },
  uDuskRockRoughness: { value: null as Texture|null },
  uDuskGroundReady: { value: 0 },
  uDuskRockReady: { value: 0 },
  uMachineryPaint: { value: null as Texture|null },
  uMachineryPaintReady: { value: 0 },
};
export function saltDuskUniforms() { return { ...uniforms }; }
export const saltDuskAssetReceipt = { loaded: [] as string[], failures: [] as string[] };
let loading: Promise<void>|null=null;
let owners=0;
let generation=0;
const resident = new Set<Texture>();

/** The sky owns a lease; ground, vehicles and the menu borrow uniform bindings.
 * Late downloads cannot republish disposed GPU resources after app teardown. */
export function acquireSaltDuskAssets(): { ready: Promise<void>; release(): void } {
  owners++;
  const ready=loadSaltDuskAssets();
  let released=false;
  return { ready, release() {
    if(released)return; released=true;
    if(--owners>0)return;
    generation++; loading=null;
    for(const texture of resident)texture.dispose(); resident.clear();
    for(const key of ['uDuskGround','uDuskGroundNormal','uDuskGroundRoughness','uDuskRock','uDuskRockNormal','uDuskRockRoughness','uDuskEnvironment','uMachineryPaint'] as const)uniforms[key].value=null;
    uniforms.uDuskEnvironmentReady.value=uniforms.uDuskGroundReady.value=uniforms.uDuskRockReady.value=uniforms.uMachineryPaintReady.value=0;
  } };
}

export function loadSaltDuskAssets(): Promise<void> {
  if(loading)return loading;
  if(typeof document==='undefined')return Promise.resolve();
  const epoch=generation;
  const loader=new TextureLoader();
  saltDuskAssetReceipt.loaded.length=0; saltDuskAssetReceipt.failures.length=0;
  const material=async (kind:'Ground'|'Rock',stem:string) => {
    const paths=[`${stem}/albedo.jpg`,`${stem}/normal-gl.png`,`${stem}/roughness.jpg`];
    const results=await Promise.allSettled(paths.map(path=>loader.loadAsync(`/assets/salt-dusk/${path}`)));
    const textures=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
    if(epoch!==generation || results.some(r=>r.status==='rejected')) {
      textures.forEach(t=>t.dispose());
      if(epoch===generation)saltDuskAssetReceipt.failures.push(stem);
      return;
    }
    textures.forEach((t,i)=>{t.wrapS=t.wrapT=RepeatWrapping;t.anisotropy=8;if(i===0)t.colorSpace=SRGBColorSpace;resident.add(t);});
    uniforms[`uDusk${kind}`].value=textures[0]!;
    uniforms[`uDusk${kind}Normal`].value=textures[1]!;
    uniforms[`uDusk${kind}Roughness`].value=textures[2]!;
    uniforms[`uDusk${kind}Ready`].value=1;
    saltDuskAssetReceipt.loaded.push(...paths);
  };
  loading=Promise.all([
    material('Ground','ground'),material('Rock','rock'),
    loader.loadAsync('/assets/inkstorm/machinery-paint.png').then(texture=>{
      if(epoch!==generation){texture.dispose();return;}
      texture.wrapS=texture.wrapT=RepeatWrapping;texture.anisotropy=8;
      resident.add(texture);uniforms.uMachineryPaint.value=texture;uniforms.uMachineryPaintReady.value=1;
    }).catch(()=>{if(epoch===generation)saltDuskAssetReceipt.failures.push('machinery-paint.png');}),
    new HDRLoader().loadAsync('/assets/salt-dusk/environment/sunset-quarry-1k.hdr').then(texture=>{
      if(epoch!==generation){texture.dispose();return;}
      texture.wrapS=RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=LinearMipmapLinearFilter;
      resident.add(texture);uniforms.uDuskEnvironment.value=texture;uniforms.uDuskEnvironmentReady.value=1;
      saltDuskAssetReceipt.loaded.push('environment/sunset-quarry-1k.hdr');
    }).catch(()=>{if(epoch===generation)saltDuskAssetReceipt.failures.push('environment/sunset-quarry-1k.hdr');}),
  ]).then(()=>undefined);
  return loading;
}
