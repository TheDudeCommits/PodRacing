import { Matrix3, NoColorSpace, type Texture } from 'three';
import { CelMaterial, type CelMaterialOptions } from '../materials/CelMaterial';
import { CEL_FRAGMENT_SHADER } from '../materials/celShaders';
import { saltDuskUniforms } from './SaltDuskAssets';
import { SALT_DUSK_LIGHT_GLSL } from './SaltDuskLighting';

// Reuse the tested glTF UV and signed tangent/derivative normal frame. The
// lighting body is separate: no ramp, matcap, quantized haze or drawn rims.
const declarations=CEL_FRAGMENT_SHADER.slice(0,CEL_FRAGMENT_SHADER.indexOf('void main() {'));
export const SALT_DUSK_VEHICLE_FRAGMENT=declarations+SALT_DUSK_LIGHT_GLSL+/* glsl */ `
uniform float uDuskMetalness;
#ifdef USE_DUSK_METALNESS_MAP
uniform sampler2D uDuskMetalnessMap;
varying vec2 vDuskMetalnessUv;
#endif
void main(){
  vec3 n=normalize(vWorldNormal);
  float faceDirection=gl_FrontFacing?1.:-1.;
  #ifdef DOUBLE_SIDED
    n*=faceDirection;
  #endif
  #ifdef USE_CEL_NORMAL_MAP
    n=celMappedNormal(n,faceDirection);
  #endif
  vec3 base=uTint;
  #ifdef USE_COLOR
    base*=vColor.rgb;
  #endif
  #ifdef USE_CEL_BASE_COLOR_MAP
    vec3 paint=texture2D(uBaseColorMap,vBaseColorUv).rgb;
    base*=paint;
  #endif
  float roughness=.56;
  #ifdef USE_CEL_ROUGHNESS
    roughness=uRoughness;
    #ifdef USE_CEL_ROUGHNESS_MAP
      roughness*=texture2D(uRoughnessMap,vRoughnessUv).g;
    #endif
  #endif
  float visibility=inkstormSunVisibility(vWorldPosition+n*.35);
  float metalness=uDuskMetalness;
  #ifdef USE_DUSK_METALNESS_MAP
    metalness*=texture2D(uDuskMetalnessMap,vDuskMetalnessUv).b;
  #endif
  vec3 color=duskLight(base,n,vWorldPosition,roughness,metalness,visibility);
  color+=uEmissiveColor*uEmissiveStrength;
  color=duskAtmosphere(color,vViewDepth);
  gl_FragColor=vec4(duskTone(color),uOpacity);
  #include <colorspace_fragment>
}
`;

/** Retains the existing appearance lease, event tint/emission API and texture
 * ownership; source atlases/normals are borrowed and never modified. */
export class SaltDuskVehicleMaterial extends CelMaterial {
  constructor(options:CelMaterialOptions={},metalness=0,metalnessMap:Texture|null=null){
    // Validate before super allocates per-material resources.
    if(!Number.isFinite(metalness))throw new Error('Metalness factor must be finite');
    if(metalnessMap&&(!Number.isInteger(metalnessMap.channel)||metalnessMap.channel<0||metalnessMap.channel>3||metalnessMap.colorSpace!==NoColorSpace))throw new Error('Metalness map requires linear data and a valid glTF UV channel');
    super(options);
    if(metalnessMap){
      const channel=metalnessMap.channel;
      const matrix=new Matrix3();
      if(metalnessMap.matrixAutoUpdate)matrix.setUvTransform(metalnessMap.offset.x,metalnessMap.offset.y,metalnessMap.repeat.x,metalnessMap.repeat.y,metalnessMap.rotation,metalnessMap.center.x,metalnessMap.center.y);
      else matrix.copy(metalnessMap.matrix);
      const uv=channel===0?'uv':`uv${channel}`;
      if(channel>0)this.defines[`USE_UV${channel}`]='';
      this.defines.USE_DUSK_METALNESS_MAP='';
      this.vertexShader='varying vec2 vDuskMetalnessUv;uniform mat3 uDuskMetalnessUvTransform;\n'+this.vertexShader.replace('void main() {',`void main() { vDuskMetalnessUv=(uDuskMetalnessUvTransform*vec3(${uv},1.)).xy;`);
      this.uniforms.uDuskMetalnessMap={value:metalnessMap};
      this.uniforms.uDuskMetalnessUvTransform={value:matrix};
    }
    this.fragmentShader=SALT_DUSK_VEHICLE_FRAGMENT;
    Object.assign(this.uniforms,saltDuskUniforms(),{uDuskMetalness:{value:Math.min(1,Math.max(0,metalness))}});
  }
}
