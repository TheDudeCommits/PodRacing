import { INKSTORM_GEOLOGY_GLSL } from './InkstormGeologyShader';
import { createInkstormRacerShadowUniforms, INKSTORM_RACER_SHADOW_GLSL } from './InkstormRacerShadow';
import { Color, RepeatWrapping, ShaderMaterial, SRGBColorSpace, TextureLoader, Vector3, type Texture } from 'three';
import { createInkstormShadowUniforms, INKSTORM_SHADOW_GLSL } from './InkstormSunShadow';
let groundTexture:Texture|null=null;
let paintLoading:Promise<Texture|null>|null=null;
const rockPaintUniforms = { uRockPaint: { value: null as Texture | null }, uRockBeds: { value: null as Texture | null }, uRockPaintReady: { value: 0 } };
const groundPaintUniforms = { uSandPaint: { value: null as Texture | null }, uSandPaintReady: { value: 0 } };
const machineryPaintUniforms = { uMachineryPaint: { value: null as Texture | null }, uMachineryPaintReady: { value: 0 } };
/** Shared uniform objects publish the asynchronous paint to already-built terrain. */
export function inkstormSandPaintUniforms() { return { ...groundPaintUniforms, ...rockPaintUniforms }; }
export function inkstormGroundPaint():Texture|null { return groundTexture; }
export function loadInkstormPaint():Promise<Texture|null>{
  if(!paintLoading)paintLoading=typeof document==='undefined'?Promise.resolve(null):Promise.all([
    new TextureLoader().loadAsync('/assets/inkstorm/rock-mass-v2.png'),
    new TextureLoader().loadAsync('/assets/inkstorm/ground-paint.png'),
    new TextureLoader().loadAsync('/assets/inkstorm/machinery-paint.png'),
    new TextureLoader().loadAsync('/assets/inkstorm/rock-paint.png'),
  ]).then(([rock,ground,machinery,beds])=>{
    for(const texture of [rock,ground,beds]){texture.colorSpace=SRGBColorSpace;texture.wrapS=RepeatWrapping;texture.wrapT=RepeatWrapping;texture.anisotropy=8;}
    // Grayscale data modulates authored vertex colors; it is not a new albedo palette.
    machinery.wrapS=RepeatWrapping;machinery.wrapT=RepeatWrapping;machinery.anisotropy=8;
    machineryPaintUniforms.uMachineryPaint.value=machinery;machineryPaintUniforms.uMachineryPaintReady.value=1;
    groundTexture=ground;
    rockPaintUniforms.uRockPaint.value=rock;rockPaintUniforms.uRockPaintReady.value=1;
    rockPaintUniforms.uRockBeds.value=beds;
    groundPaintUniforms.uSandPaint.value=ground;groundPaintUniforms.uSandPaintReady.value=1;
    return rock;
  });
  return paintLoading;
}

/** Vertex-painted Blender surfaces with broad violet shade and eroded strata. */
export class InkstormSurfaceMaterial extends ShaderMaterial {
  constructor(stone = true, workshopFamily: 'pit-complex' | 'pit-district' | null = null, workshopBake: { texture: Texture; decodeRange: number } | null = null) {
    super({
      name: stone ? 'Inkstorm painted sandstone' : 'Inkstorm worn machinery',
      vertexColors: true, toneMapped: false,
      defines: !stone && workshopFamily ? { INKSTORM_WORKSHOP_FAMILY: workshopFamily === 'pit-complex' ? 1 : 2, ...(workshopBake ? { INKSTORM_WORKSHOP_BAKE: 1 } : {}) } : {},
      uniforms: { uWorkshopBake: { value: workshopBake?.texture ?? null }, uWorkshopDecodeRange: { value: workshopBake?.decodeRange ?? 4 }, ...createInkstormShadowUniforms(), ...createInkstormRacerShadowUniforms(), ...machineryPaintUniforms, uPaint: rockPaintUniforms.uRockPaint, uRockBeds: rockPaintUniforms.uRockBeds, uPaintReady: rockPaintUniforms.uRockPaintReady, uStone: { value: stone ? 1 : 0 }, uSun: { value: new Vector3(-.42, .76, -.5).normalize() }, uHaze: { value: new Color('#b79cb8') } },
      vertexShader: `
        #include <common>
        #include <color_pars_vertex>
        varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vPaintNormal;
        #ifdef INKSTORM_WORKSHOP_FAMILY
        #ifdef INKSTORM_WORKSHOP_BAKE
        #ifndef USE_UV1
        attribute vec2 uv1;
        #endif
        varying vec2 vWorkshopUv;
        #else
        varying vec3 vWorkshopScale;
        #endif
        #endif
        void main(){
          #include <color_vertex>
          vec4 p=vec4(position,1.); vec3 n=normal;
          #ifdef USE_INSTANCING
          p=instanceMatrix*p;
          n=mat3(instanceMatrix)*(n / vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz)));
          #endif
          vWorld=(modelMatrix*p).xyz;vLocal=position;vNormal=normalize(mat3(modelMatrix)*n);vPaintNormal=normal;
          /* The existing instance transforms are orthogonal TRS, without shear. */
          #ifdef INKSTORM_WORKSHOP_FAMILY
          mat4 workshopTransform=modelMatrix;
          #ifdef USE_INSTANCING
          workshopTransform=modelMatrix*instanceMatrix;
          #endif
          #ifdef INKSTORM_WORKSHOP_BAKE
          vWorkshopUv=uv1;
          #if INKSTORM_WORKSHOP_FAMILY == 2
          // District atlas left: unit scale. Right: authored 0.72 frontage.
          vWorkshopUv.x=.5*vWorkshopUv.x + (length(workshopTransform[0].xyz)<.86 ? .5 : 0.);
          #endif
          #else
          vWorkshopScale=vec3(length(workshopTransform[0].xyz),length(workshopTransform[1].xyz),length(workshopTransform[2].xyz));
          #endif
          #endif
          gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
        }`,
      fragmentShader: `
        #include <common>
        #include <color_pars_fragment>
        ${INKSTORM_SHADOW_GLSL}
${INKSTORM_RACER_SHADOW_GLSL}
${INKSTORM_GEOLOGY_GLSL}
        varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;varying vec3 vPaintNormal;
        uniform float uStone;uniform vec3 uSun;uniform vec3 uHaze;uniform sampler2D uPaint;uniform sampler2D uRockBeds;uniform float uPaintReady;
        uniform sampler2D uMachineryPaint;uniform float uMachineryPaintReady;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
// Authored workshop lighting. Included only by the two existing
// industrial family materials; this is not a scene-wide light list.
#ifdef INKSTORM_WORKSHOP_FAMILY
#ifdef INKSTORM_WORKSHOP_BAKE
varying vec2 vWorkshopUv;
uniform sampler2D uWorkshopBake;
uniform float uWorkshopDecodeRange;
#else
varying vec3 vWorkshopScale;

float inkstormWorkshopReceiver(vec3 p, vec2 centerXZ, vec2 halfXZ, float roof) {
  // A soft guard on the authored room/apron envelope. This is NOT an occlusion
  // solution; the light still cannot see opaque equipment between receivers.
  vec2 edge = halfXZ - abs(p.xz - centerXZ);
  return smoothstep(0., .7, min(edge.x, edge.y))
    * smoothstep(-.05, .10, p.y)
    * (1. - smoothstep(roof - .15, roof, p.y));
}

float inkstormWorkshopLamp(vec3 center, float range, vec3 aim) {
  // Closest point on a 2.1 m strip. A scaled instance moves/scales the physical
  // fixture; distance remains measured in world metres rather than UV units.
  vec3 source = center + vec3(clamp(vLocal.x - center.x, -1.05, 1.05), 0., 0.);
  vec3 toLight = (source - vLocal) * vWorkshopScale;
  float d2 = max(dot(toLight, toLight), .04);
  vec3 l = toLight * inversesqrt(d2);
  // Inverse-scale normal is essential when district frontage is compressed.
  vec3 localNormal = normalize(vPaintNormal / max(vWorkshopScale, vec3(.001)));
  float diffuse = max(0., dot(localNormal, l));
  float cone = smoothstep(.08, .48, dot(-l, normalize(aim * vWorkshopScale)));
  float cutoff = max(0., 1. - d2 / (range * range));
  // Soft source core; finite support, no singular hotspot and no atmosphere
  // injection. All constants are artistic radiant strengths, not lumen units.
  return diffuse * cone * cutoff * cutoff / (1. + d2 / 64.);
}

#endif

float inkstormWorkshopLens(vec3 center) {
  // Only the explicitly authored warm inset, not nearby cream paint, is emissive.
  vec3 q = abs(vLocal - center);
  float warmPaint = 0.;
  #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
    warmPaint = step(.44, vColor.r) * step(.22, vColor.g)
      * (1. - step(.28, vColor.b));
  #endif
  return step(q.x, 1.055) * step(q.z, .345) * step(q.y, .009)
    * step(.9, -normalize(vPaintNormal).y) * warmPaint;
}

#ifndef INKSTORM_WORKSHOP_BAKE
vec2 inkstormWorkshopLight() {
  float task = 0.;
  vec3 center;
  vec2 receiverCenter;
  vec2 receiverHalf;
  float range;
  float roof;
  vec3 aim;
  #if INKSTORM_WORKSHOP_FAMILY == 1
    // Blender originals: hangar(x,y,w,d,h), existing hoist at (x,y-1,10).
    // GLB coordinates are (Blender X, Blender Z, -Blender Y).
    aim = vec3(0., -1., .18);
    roof = 9.45;
    // Receiver X envelopes do not overlap: evaluate only the owning bay.
    if (vLocal.x < -25.) {
      center = vec3(-50., 9.44, -3.); range = 22.;
      receiverCenter = vec2(-47., -.2); receiverHalf = vec2(18.8, 19.2);
    } else if (vLocal.x < 14.) {
      center = vec3(-8., 9.44, -3.); range = 20.;
      receiverCenter = vec2(-5., -.2); receiverHalf = vec2(15.98, 18.2);
    } else {
      center = vec3(36., 9.44, -6.); range = 23.;
      receiverCenter = vec2(39., -3.2); receiverHalf = vec2(21.62, 22.2);
    }
  #elif INKSTORM_WORKSHOP_FAMILY == 2
    // Each fixture is under the lower service rail, behind the cloth attachment.
    // Former front-beam positions were above the opaque awning and are rejected.
    aim = vec3(0., -1., -.24);
    if (vLocal.x < -21.) {
      center = vec3(-36., 8.08, -4.); range = 21.; roof = 8.09;
      receiverCenter = vec2(-39., -2.); receiverHalf = vec2(15.9, 10.4);
    } else if (vLocal.x < 18.) {
      center = vec3(1., 13.08, -8.); range = 25.; roof = 13.09;
      receiverCenter = vec2(-2., -4.5); receiverHalf = vec2(16.9, 11.9);
    } else {
      center = vec3(41., 9.88, -1.); range = 22.; roof = 9.89;
      receiverCenter = vec2(38., 1.); receiverHalf = vec2(15.9, 10.4);
    }
  #endif
  float receiver = inkstormWorkshopReceiver(vLocal, receiverCenter, receiverHalf, roof);
  if (receiver > 0.) task = receiver * inkstormWorkshopLamp(center, range, aim);
  return vec2(min(task * 1.10, .66), inkstormWorkshopLens(center));
}
#else
float inkstormWorkshopBakedLens() {
  vec3 center;
  #if INKSTORM_WORKSHOP_FAMILY == 1
  center=vLocal.x < -25. ? vec3(-50.,9.44,-3.) : (vLocal.x < 14. ? vec3(-8.,9.44,-3.) : vec3(36.,9.44,-6.));
  #else
  center=vLocal.x < -21. ? vec3(-36.,8.08,-4.) : (vLocal.x < 18. ? vec3(1.,13.08,-8.) : vec3(41.,9.88,-1.));
  #endif
  return inkstormWorkshopLens(center);
}
#endif
#endif

        void main(){
          vec3 n=normalize(vNormal);float ndl=dot(n,uSun);vec3 base=vec3(.8,.26,.13);
          #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
          base=vColor.rgb;
          #endif
          // Classify the untouched authored palette, before procedural wear.
          // Muted cobalt is reflective paint; only bright, high-chroma cyan is
          // a service lamp. Both exported cyan palettes keep their dim faces.
          float service=(1.-uStone)*step(.50,base.g)*step(.45,base.b)
            *step(base.r*3.,base.g)*step(base.r*3.,base.b);
          vec3 weights=pow(abs(normalize(vPaintNormal)),vec3(4.));weights/=max(.001,weights.x+weights.y+weights.z);
          float broad=noise(vLocal.xz*.024+vLocal.y*.011);
          float brush=noise(vLocal.xy*vec2(.16,.32)+vLocal.z*.07);
          base*=.82+broad*.15+brush*.08;
          // The same world coordinates, albedo and light response as physical
          // terrain cliffs. Three world paint reads replace six mixed-scale reads.
          float stonePaintValue=1.;
          if(uStone>.5){
            // The Blender scan paint retains source diffuse value and AO at
            // each vertex. Replacing it outright erased cracks and cavities.
            // Keep the common palette, with bounded authored value detail.
            #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
            stonePaintValue=clamp(dot(vColor.rgb,vec3(.2126,.7152,.0722))/.19,.38,1.45);
            #endif
            base=inkstormRockAlbedo(vWorld,n,uPaint,uRockBeds,uPaintReady)*mix(.68,1.25,
              smoothstep(.38,1.45,stonePaintValue));
          }
          float machinery=(1.-uStone)*(1.-service)*uMachineryPaintReady;
          float enamel=1.;
          if(machinery>.0){
            // About eighteen metres per tile: visible repair clusters on tanks,
            // with their fine marks naturally removed by texture mip filtering.
            vec3 wear=texture2D(uMachineryPaint,vLocal.zy*.055).rgb*weights.x
              +texture2D(uMachineryPaint,vLocal.xz*.055).rgb*weights.y
              +texture2D(uMachineryPaint,vLocal.xy*.055).rgb*weights.z;
            enamel=dot(wear,vec3(.2126,.7152,.0722));
            float chips=1.-smoothstep(.35,.53,enamel);
            float detail=1.-smoothstep(350.,1250.,length(vWorld-cameraPosition));
            base*=mix(1.,clamp(.78+(enamel-.58)*1.65,.48,1.18),detail*.72);
            base=mix(base,vec3(.055,.039,.051),chips*detail*.72);
          }
          float visibility=min(inkstormSunVisibility(vWorld+n*.45),inkstormRacerSunVisibility(vWorld,n));
          float lit=smoothstep(-.03,.76,ndl)*mix(.12,1.,visibility);
          vec3 shade=mix(vec3(.032,.024,.064),base*vec3(.25,.23,.46),.65);
          vec3 color=mix(shade,base,lit);
          color*=mix(.8,1.,smoothstep(-.1,.55,n.y));
          if(uStone>.5){
            color=inkstormRockLight(base,inkstormRockNormal(vWorld,n,base),uSun,visibility);
            // Retain cavity contrast in sky-filled shade as well as sunlight.
            color*=mix(.72,1.,smoothstep(.38,1.,stonePaintValue));
          }
          vec3 halfLight=normalize(uSun+normalize(cameraPosition-vWorld));
          float sheen=pow(max(0.,dot(n,halfLight)),18.);
          color+=vec3(.23,.14,.085)*smoothstep(.18,.72,sheen)*machinery*visibility*smoothstep(.45,.72,enamel);
          // Painted service lights are small areas authored into industrial
          // vertex colors; retain their signal even on an occluded underside.
          color=mix(color,base*1.12,service*.72);
          #ifdef INKSTORM_WORKSHOP_FAMILY
          #ifdef INKSTORM_WORKSHOP_BAKE
          // White diffuse response already includes source normals and occlusion.
          // Texture is sRGB encoded linear-response/range; hardware decodes once.
          color+=base*texture2D(uWorkshopBake,vWorkshopUv).rgb*uWorkshopDecodeRange*(1.-service);
          color=mix(color,max(color,vec3(.54,.31,.105)),inkstormWorkshopBakedLens());
          #else
          vec2 workshop=inkstormWorkshopLight();
          color+=base*vec3(1.,.74,.43)*workshop.x*(1.-service);
          color=mix(color,max(color,vec3(.54,.31,.105)),workshop.y);
          #endif
          #endif
          float distanceToCamera=length(vWorld-cameraPosition);
          float haze=1.-exp(-max(0.,distanceToCamera-300.)*.00045);
          color=uStone>.5 ? inkstormRockAtmosphere(color,distanceToCamera)
            : mix(color,uHaze,haze*.85);
          gl_FragColor=vec4(color,1.);
          #include <colorspace_fragment>
        }`,
    });
  }
}
