// Private CPU-only module comparison. No renderer/browser/source edits.
import { registerHooks } from 'node:module';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../../../..');
registerHooks({resolve(specifier,context,nextResolve){
  if(specifier.startsWith('.') && context.parentURL?.startsWith('file:')){
    let p=fileURLToPath(new URL(specifier,context.parentURL));
    if(!existsSync(p) && !existsSync(p+'.ts')){
      for(const version of ['baseline','candidate']){
        const prefix=resolve(here,version,'src')+'/';
        if(p.startsWith(prefix))p=resolve(root,'src',p.slice(prefix.length));
      }
    }
    if(existsSync(p+'.ts'))return nextResolve(pathToFileURL(p+'.ts').href,context);
    if(existsSync(p+'/index.ts'))return nextResolve(pathToFileURL(p+'/index.ts').href,context);
  }
  return nextResolve(specifier,context);
}});
const [{CelMaterial:Before},{CelMaterial:Candidate},beforeRamp,afterRamp,palettes,three]=await Promise.all([
 import('./baseline/src/render/materials/CelMaterial.ts'),import('./candidate/src/render/materials/CelMaterial.ts'),
 import('./baseline/src/render/materials/celRamp.ts'),import('./candidate/src/render/materials/celRamp.ts'),
 import(pathToFileURL(resolve(root,'src/render/materials/celPalette.ts')).href),import('three')]);
const check=(value,message)=>{if(!value)throw Error(message);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const valueRecord=value=>{
 if(value?.isTexture){return {type:'texture',bytes:hash(value.image.data),width:value.image.width,height:value.image.height,minFilter:value.minFilter,magFilter:value.magFilter,wrapS:value.wrapS,wrapT:value.wrapT,colorSpace:value.colorSpace,generateMipmaps:value.generateMipmaps};}
 if(value && typeof value.toArray==='function')return value.toArray();
 return value;
};
const paletteCases=Object.values(palettes.CEL_PALETTES);
const rows=[];
for(const palette of paletteCases){
 for(const wear of [0,.5,1]){
  const before=new Before({palette,wear});
  for(const softness of [undefined,0]){
   const after=new Candidate({palette,wear,...(softness===undefined?{}:{paintedShadingSoftness:softness})});
   check(before.fragmentShader===after.fragmentShader,'Legacy fragment byte change');
   check(before.vertexShader===after.vertexShader,'Legacy vertex byte change');
   check(JSON.stringify(Object.keys(before.uniforms))===JSON.stringify(Object.keys(after.uniforms)),'Legacy uniform keys changed');
   check(JSON.stringify(before.defines)===JSON.stringify(after.defines),'Legacy defines changed');
   for(const key of Object.keys(before.uniforms))check(JSON.stringify(valueRecord(before.uniforms[key].value))===JSON.stringify(valueRecord(after.uniforms[key].value)),'Legacy uniform value changed: '+key);
   check(hash(before.uniforms.uRamp.value.image.data)===hash(after.uniforms.uRamp.value.image.data),'Legacy ramp bytes changed');
   check(before.uniforms.uWear.value===after.uniforms.uWear.value,'Wear changed');
   rows.push({bands:palette.diffuseBands,wear,softness:softness??'omitted',rampSha256:hash(after.uniforms.uRamp.value.image.data),legacyShaderBytesExact:true,uniformKeysExact:true,uniformValuesExact:true,definesExact:true});
   after.dispose();
  }
  before.dispose();
 }
}
const bounds=[];
for(const value of [-.01,1.01,NaN,Infinity,-Infinity]){
 let material=false,ramp=false;
 try{new Candidate({paintedShadingSoftness:value});}catch{material=true;}
 try{afterRamp.createCelRampTexture({bands:['#000','#777','#fff'],thresholds:[.2,.7],paintedShadingSoftness:value});}catch{ramp=true;}
 check(material&&ramp,'Invalid value accepted');bounds.push({value:String(value),materialRejected:true,rampRejected:true});
}
const borrowed=new three.Texture(),rough=new three.Texture();let mapDispose=0,roughDispose=0;borrowed.addEventListener('dispose',()=>mapDispose++);rough.addEventListener('dispose',()=>roughDispose++);
const soft=new Candidate({palette:palettes.DEFAULT_CEL_PALETTE,wear:0,paintedShadingSoftness:.85,baseColorMap:borrowed,roughnessMap:rough,roughness:.7});
check((soft.fragmentShader.match(/texture2D\(uRamp/g)||[]).length===1,'Opt-in ramp fetch count');
check(soft.uniforms.uWear.value===0 && soft.uniforms.uPaintedShadingSoftness.value===.85,'Wear coupling');
const texture=soft.uniforms.uRamp.value;check(texture.image.width===256&&texture.image.height===1,'Texture resized');
soft.setPalette(palettes.CEL_PALETTES.rivalTeal);
const expected=afterRamp.createCelRampTexture({bands:palettes.CEL_PALETTES.rivalTeal.diffuseBands,thresholds:soft.diffuseThresholds,paintedShadingSoftness:.85});
check(texture===soft.uniforms.uRamp.value,'setPalette replaced texture');check(hash(texture.image.data)===hash(expected.image.data),'setPalette softness lost');expected.dispose();soft.dispose();check(mapDispose===0&&roughDispose===0,'Borrowed texture disposed');borrowed.dispose();rough.dispose();
const ramps=[];
for(const softness of [0,.45,.75,.85,1]){
 const config={bands:['#000000','#777777','#cccccc','#ffffff'],thresholds:[.16,.46,.74],paintedShadingSoftness:softness};
 const tex=afterRamp.createCelRampTexture(config);let previous=-1,maxJump=0;const levels=new Set();
 for(let i=0;i<256;i++){const value=tex.image.data[i*4];check(value>=previous,'Ramp nonmonotonic');if(previous>=0)maxJump=Math.max(maxJump,value-previous);previous=value;levels.add(value);check(tex.image.data[i*4+3]===255,'Opacity changed');}
 ramps.push({softness,levels:levels.size,maxByteStep:maxJump,rampSha256:hash(tex.image.data)});tex.dispose();
}
const result={scope:'CPU-only actual baseline/candidate TypeScript modules using native Node loader; no GPU shader execution or visual/performance acceptance.',legacyCases:rows,invalidBounds:bounds,softPath:{rampFetches:1,rampDimensions:[256,1],wearStillZero:true,setPaletteRetainsTextureAndSoftness:true,borrowedMapsNotDisposed:true},monotoneGrayscaleRamps:ramps};
writeFileSync(new URL('./cpu-parity-receipt.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({legacyCases:rows.length,boundsRejected:bounds.length,softPath:result.softPath,ramps},null,2));
