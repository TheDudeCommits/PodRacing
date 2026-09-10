import { createInkstormRacerShadowUniforms, INKSTORM_RACER_SHADOW_GLSL } from './InkstormRacerShadow';
import { BufferAttribute, BufferGeometry, DoubleSide, GLSL3, Mesh, ShaderMaterial } from 'three';
import type { CourseRenderPoint } from '../../game/race/types';
import { createCourseGulfUniforms, type CourseGulfUniforms } from '../terrain/CourseGulfTextures';
import { TERRAIN_GLSL } from '../terrain/terrainShaderChunks';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
import { inkstormGroundPaint } from './InkstormSurfaceMaterial';
import { createInkstormShadowUniforms, INKSTORM_SHADOW_GLSL } from './InkstormSunShadow';

/** Shared road/structure boundary. Open ends use only their adjacent segment. */
export function inkstormRoadCrossSection(
  points: readonly Pick<CourseRenderPoint, 'x' | 'z' | 'width'>[], index: number, closed: boolean,
): { rightX: number; rightZ: number } {
  const prev=points[closed?(index-1+points.length)%points.length:Math.max(0,index-1)]!;
  const next=points[closed?(index+1)%points.length:Math.min(points.length-1,index+1)]!;
  const dx=next.x-prev.x,dz=next.z-prev.z,length=Math.hypot(dx,dz)||1;
  return { rightX: dz/length, rightZ: -dx/length };
}

/** A terrain-conforming hardpack surface, with feathered shoulders and tire grooves. */
export function createInkstormRoad(points:readonly CourseRenderPoint[], closed=true, elevated=false, gulfUniforms:CourseGulfUniforms=createCourseGulfUniforms()):Mesh {
  const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];const across=16;
  let distance=0;const count=points.length+(closed?1:0);
  for(let i=0;i<count;i++){
    const p=points[i%points.length]!;
    // An open branch never joins its last row back to the first. A wrapped
    // tangent twists the entry ribbon across the neighbouring main route.
    const prev=points[closed?(i-1+points.length)%points.length:Math.max(0,i-1)]!;
    if(i)distance+=Math.hypot(p.x-prev.x,p.z-prev.z);
    const {rightX,rightZ}=inkstormRoadCrossSection(points,i%points.length,closed);
    for(let j=0;j<=across;j++){
      const lateral=(j/across*2-1)*(p.width+(elevated?0:4));
      vertices.push(p.x+rightX*lateral,p.y+.07,p.z+rightZ*lateral);uvs.push(j/across,distance);
      if(i<count-1&&j<across){const a=i*(across+1)+j,b=a+across+1;indices.push(a,b,a+1,a+1,b,b+1);}
    }
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(vertices),3));geometry.setAttribute('uv',new BufferAttribute(new Float32Array(uvs),2));geometry.setIndex(indices);geometry.computeBoundingSphere();
  const material=new ShaderMaterial({name:'Inkstorm compacted racing surface',glslVersion:GLSL3,transparent:true,depthWrite:false,side:DoubleSide,toneMapped:false,
    uniforms:{...gulfUniforms,...createInkstormShadowUniforms(), ...createInkstormRacerShadowUniforms(),uElevated:{value:elevated?1:0},uGroundPaint:{value:inkstormGroundPaint()},uGroundReady:{value:inkstormGroundPaint()?1:0}},
    vertexShader:`${TERRAIN_GLSL}
      uniform float uElevated;out vec2 vUv;out vec3 vWorld;void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vec3 fields;p.y=uElevated>.5?p.y+.04:terrainFields(p.xz,fields)+.45;vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`precision highp float;in vec2 vUv;in vec3 vWorld;out vec4 fragColor;uniform sampler2D uGroundPaint;uniform float uGroundReady;
      ${INKSTORM_SHADOW_GLSL}
${INKSTORM_RACER_SHADOW_GLSL}
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
        float edge=abs(vUv.x-.5)*2.;float distanceToCamera=length(vWorld-cameraPosition);
        float rough=noise(vec2(vUv.x*20.,vUv.y*.045));
        float alpha=(1.-smoothstep(.62+rough*.12,1.,edge))*.89;
        vec3 base=mix(vec3(.40,.17,.076),vec3(.64,.31,.13),rough*.65);
        // Broad compacted sand planes with restrained granular texture keep the
        // racing line readable without looking like a pasted gravel strip.
        vec3 crust=texture(uGroundPaint,vWorld.xz*.026).rgb;
        base=mix(base,crust,uGroundReady*.48);
        float grooves=sin(vUv.x*166.+sin(vUv.y*.016)*2.4+noise(vec2(vUv.x*24.,vUv.y*.055))*3.);
        float detail=1.-smoothstep(100.,500.,distanceToCamera);
        float brokenTrail=smoothstep(.32,.65,noise(vec2(vUv.x*17.,vUv.y*.021)));
        base*=1.-smoothstep(.3,.9,grooves)*.065*detail*brokenTrail;
        float tire1=exp(-pow((vUv.x-.33)*35.,2.)),tire2=exp(-pow((vUv.x-.67)*35.,2.));
        base*=1.-(tire1+tire2)*(.06+noise(vec2(vUv.y*.17,1.))*.08);
        float scuff=noise(vec2(vUv.x*9.+sin(vUv.y*.007),vUv.y*.013));
        base*=mix(.82,1.1,smoothstep(.23,.78,scuff));
        vec3 n=normalize(cross(dFdx(vWorld),dFdy(vWorld)));if(n.y<0.)n=-n;
        float light=smoothstep(-.1,.8,dot(n,normalize(vec3(-.42,.76,-.5))));
        base=mix(base*vec3(.28,.25,.48),base,light*mix(.15,1.,min(inkstormSunVisibility(vWorld+vec3(0.,.5,0.)),inkstormRacerSunVisibility(vWorld,n))));
        float haze=1.-exp(-max(0.,distanceToCamera-300.)*.00045);base=mix(base,vec3(.48,.34,.47),haze*.65);
        fragColor=vec4(base,alpha);
        fragColor = linearToOutputTexel(fragColor);
      }`});
  const mesh=new Mesh(geometry,material);mesh.name='Compacted road and worn racing grooves';mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]=true;mesh.renderOrder=1;return mesh;
}
