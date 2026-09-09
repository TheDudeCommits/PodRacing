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
  constructor(stone = true) {
    super({
      name: stone ? 'Inkstorm painted sandstone' : 'Inkstorm worn machinery',
      vertexColors: true, toneMapped: false,
      uniforms: { ...createInkstormShadowUniforms(), ...createInkstormRacerShadowUniforms(), ...machineryPaintUniforms, uPaint: rockPaintUniforms.uRockPaint, uRockBeds: rockPaintUniforms.uRockBeds, uPaintReady: rockPaintUniforms.uRockPaintReady, uStone: { value: stone ? 1 : 0 }, uSun: { value: new Vector3(-.42, .76, -.5).normalize() }, uHaze: { value: new Color('#b79cb8') } },
      vertexShader: `
        #include <common>
        #include <color_pars_vertex>
        varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vPaintNormal;
        void main(){
          #include <color_vertex>
          vec4 p=vec4(position,1.); vec3 n=normal;
          #ifdef USE_INSTANCING
          p=instanceMatrix*p;
          n=mat3(instanceMatrix)*(n / vec3(dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),dot(instanceMatrix[1].xyz,instanceMatrix[1].xyz),dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz)));
          #endif
          vWorld=(modelMatrix*p).xyz;vLocal=position;vNormal=normalize(mat3(modelMatrix)*n);vPaintNormal=normal;
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
        void main(){
          vec3 n=normalize(vNormal);float ndl=dot(n,uSun);vec3 base=vec3(.8,.26,.13);
          #if defined(USE_COLOR) || defined(USE_COLOR_ALPHA)
          base=vColor.rgb;
          #endif
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
          float service=(1.-uStone)*step(base.r*1.65,base.g)*step(base.r*1.65,base.b);
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
