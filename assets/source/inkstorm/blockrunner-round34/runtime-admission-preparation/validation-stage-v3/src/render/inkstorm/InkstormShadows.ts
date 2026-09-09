import { GLSL3, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, ShaderMaterial, Vector3 } from 'three';
import { TERRAIN_GLSL } from '../terrain/terrainShaderChunks';
import { createCourseGulfUniforms, type CourseGulfUniforms } from '../terrain/CourseGulfTextures';
import type { InkstormPlacement } from '../../game/race/inkstormLayout';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';
/** Cheap directional art shadows projected onto the same analytic racing terrain. */
export function createInkstormShadows(placements:readonly InkstormPlacement[], gulfUniforms:CourseGulfUniforms=createCourseGulfUniforms()):InstancedMesh{
 const geometry=new PlaneGeometry(1,1,5,10).rotateX(-Math.PI/2);
 const material=new ShaderMaterial({name:'Inkstorm directional ground shadows',glslVersion:GLSL3,transparent:true,depthWrite:false,toneMapped:false,
  uniforms:gulfUniforms,
  vertexShader:`${TERRAIN_GLSL}
    out vec2 vUv;void main(){vUv=uv;vec4 p=modelMatrix*instanceMatrix*vec4(position,1.);vec3 fields;p.y=terrainFields(p.xz,fields)+.57;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader:`precision highp float;in vec2 vUv;out vec4 fragColor;void main(){vec2 p=(vUv-.5)*2.;float shape=max(abs(p.x),abs(p.y));float edge=1.-smoothstep(.78,1.,shape);float fade=1.-smoothstep(.72,1.,vUv.y);fragColor=vec4(.12,.075,.20,edge*fade*.30);fragColor=linearToOutputTexel(fragColor);}`
 });
 const mesh=new InstancedMesh(geometry,material,placements.length);mesh.name='Directional cliff and machinery shadows';mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]=true;mesh.renderOrder=2;mesh.count=0;mesh.frustumCulled=false;
 const matrix=new Matrix4(),p=new Vector3(),q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.atan2(.42,.5)),s=new Vector3();
 for(const item of placements){
  const widths:Record<string,number>={'cliff-strata':56,'wind-blade':22,'mesa-crown':90,'roadside-shard':6,'canyon-arch':90,'foundry-gantry':80,'refinery-stack':15,'pit-complex':70,'pit-district':80,'pipe-bank':60,'finish-tower':24,'fractured-spire':65};
  const heights:Record<string,number>={'cliff-strata':108,'wind-blade':148,'mesa-crown':76,'roadside-shard':12,'canyon-arch':70,'foundry-gantry':48,'refinery-stack':98,'pit-complex':47,'pit-district':35,'pipe-bank':51,'finish-tower':113,'fractured-spire':120};
  const length=(heights[item.family]??(item.family==='canyon-buttress'?120:12))*item.sy*.72;
  p.set(item.x+.64*length*.42,0,item.z+.768*length*.42);s.set((widths[item.family]??(item.family==='canyon-buttress'?65:26))*item.sx,1,length);
  matrix.compose(p,q,s);mesh.setMatrixAt(mesh.count++,matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();return mesh;
}
