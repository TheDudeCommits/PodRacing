import { Color, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, ShaderMaterial, Quaternion, Vector3, type BufferGeometry, type Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '../../game/race/course';
import { racingBiomeForSeed } from '../../game/race/racingBiomes';
import { LEGACY_HAZE, SKY_SUN, WORLD_SUN } from '../lighting/WorldLight';
import { createVerdantCanopy } from './VerdantCanopy';

/** 0 desert, 1 frozen, 2 volcanic, 3 jungle. */
const BIOME_INDEX = { desert: 0, frozen: 1, volcanic: 2, jungle: 3 } as const;

/**
 * Stylized world materials for the biome scenery. Scene-referred emission
 * (glowing ice rims, magma seams, sunlit leaves) is left above 1 so the
 * cinematic post chain blooms it.
 */
function sceneryMaterial(organic: boolean, biome: keyof typeof BIOME_INDEX): ShaderMaterial {
  return new ShaderMaterial({ name: 'Faceted biome surfaces', toneMapped: false,
    uniforms: { uOrganic: { value: organic ? 1 : 0 }, uWorldSun: WORLD_SUN, uSkySun: SKY_SUN, uLegacyHaze: LEGACY_HAZE,
      uBiome: { value: BIOME_INDEX[biome] }, uTime: SCENERY_TIME },
    vertexShader: `uniform float uTime;uniform float uOrganic;varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vLocal;
      void main(){mat3 m=mat3(instanceMatrix);vec3 n=normal/vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));
      vNormal=normalize(mat3(modelMatrix)*m*n);vColor=instanceColor;vLocal=position;
      vec4 p=modelMatrix*instanceMatrix*vec4(position,1.);
      // Leaves sway in the wind; trunks and rock stay rooted.
      float sway=uOrganic*smoothstep(.2,1.,position.y*.5+.5);
      p.x+=sin(uTime*1.1+p.z*.02)*sway*.9;p.z+=cos(uTime*.9+p.x*.02)*sway*.6;
      vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform float uOrganic;uniform vec3 uWorldSun;uniform vec3 uSkySun;uniform float uLegacyHaze;uniform float uBiome;uniform float uTime;
      varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;varying vec3 vLocal;
      float sh(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
      float sn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(sh(i),sh(i+vec2(1,0)),f.x),mix(sh(i+vec2(0,1)),sh(i+vec2(1,1)),f.x),f.y);}
      // Distance to the nearest Voronoi cell border, and the cell's random id.
      float cracks(vec2 p,out float id){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;vec2 c=i;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);vec2 r=g+vec2(sh(i+g),sh(i+g+19.19))-f;float d=dot(r,r);
          if(d<d1){d2=d1;d1=d;c=i+g;}else if(d<d2)d2=d;}
        id=sh(c+7.3);return sqrt(d2)-sqrt(d1);}
      void main(){vec3 n=normalize(vNormal);vec3 v=normalize(cameraPosition-vWorld);vec3 sun=normalize(uWorldSun);
      float light=dot(n,sun);
      float band=light>.55?1.16:light>.05?.83:.43;
      float strata=smoothstep(.80,.93,sin(vWorld.y*.44+sin(vWorld.x*.06)*1.8))*mix(.1,.02,uOrganic);
      float baseShade=mix(.7,1.,smoothstep(-1.,16.,vLocal.y));
      vec3 color=vColor*(band-strata)*baseShade;
      float fres=pow(1.-abs(dot(v,n)),3.);
      if(uBiome>.5&&uBiome<1.5){
        // Glacial ice: dark translucent core, glowing rims and sunlit facets.
        vec3 core=vec3(.03,.14,.3);vec3 lit=vec3(.55,.85,1.05);
        color=mix(core,lit,smoothstep(-.2,.9,light));
        color+=vec3(.3,.7,1.1)*fres*.9;
        float inner=pow(1.-abs(sn(vWorld.xz*.08+vWorld.y*.05)*2.-1.),12.);
        color+=vec3(.15,.55,.95)*inner*.55*(1.-smoothstep(.0,.6,light));
        vec3 h=normalize(sun+v);color+=vec3(1.3,1.2,1.1)*pow(max(dot(n,h),0.),90.)*1.6;
      } else if(uBiome>1.5&&uBiome<2.5){
        // Basalt stacks: near-black columns veined with magma, lit from the lava below.
        color=vColor*.24*(band*.8+.2);
        float cellId;
        vec2 wrap=vec2(atan(vLocal.z,vLocal.x)*1.6,vWorld.y*.16)+vec2(sn(vWorld.xz*.07),sn(vWorld.yx*.05))*.7;
        float edge=cracks(wrap,cellId);
        float heat=exp(-max(vLocal.y,0.)*.16);
        // Only some borders are open; open cracks cool from white-orange to deep red with height.
        float open=step(.45,cellId)*(1.-smoothstep(.015,.07+heat*.05,edge));
        float pulse=.78+.22*sin(uTime*1.3+cellId*20.+vWorld.y*.2);
        color+=mix(vec3(.9,.09,.01),vec3(3.4,.9,.12),heat)*open*pulse*(.35+heat*.9);
        color+=vec3(.8,.18,.03)*heat*.55;
        color+=vec3(.5,.14,.06)*fres*.25;
      } else if(uBiome>2.5){
        // Canopy: leaves glow warm when the low sun shines through them.
        vec3 toSun=normalize(uSkySun);
        float through=pow(max(dot(-v,toSun),0.),3.)*uOrganic;
        // Foliage: soft painted bands, leaf clusters and sunlit tips; bark keeps the hard bands.
        float soft=mix(.43,.83,smoothstep(-.12,.2,light));soft=mix(soft,1.16,smoothstep(.4,.7,light));
        float leaves=sn(vWorld.xz*.55+vWorld.y*.4)*.6+sn(vWorld.xz*1.7-vWorld.y*.9)*.4;
        float lit=mix(band,soft,uOrganic);
        color=vColor*(lit*.8+.12)*mix(1.,mix(.72,1.12,leaves),uOrganic);
        color+=vColor*vec3(.35,.45,.1)*smoothstep(.62,.9,leaves)*smoothstep(.2,.8,light)*uOrganic;
        color+=vec3(.42,.58,.12)*through*.55;
        color+=vec3(.25,.4,.18)*fres*.25*uOrganic;
        // Bark: vertical fissures and moss on the shaded side.
        float fissure=pow(1.-abs(sn(vec2(atan(n.z,n.x)*6.,vWorld.y*.08))*2.-1.),6.)*(1.-uOrganic);
        color*=1.-fissure*.35;
        color=mix(color,vec3(.16,.26,.1)*(lit*.8+.2),(1.-uOrganic)*smoothstep(.1,-.4,light)*.55);
        color*=mix(.9,1.1,sn(vWorld.xz*.2));
      } else {
        color+=vec3(.10,.14,.19)*fres*.22;
      }
      float haze=1.-exp(-max(0.,length(vWorld-cameraPosition)-260.)*.0005);
      color=mix(color,vec3(.30,.40,.47),haze*.72*uLegacyHaze);gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
      }`,
  });
}
/** Shared animation clock for the biome scenery. */
export const SCENERY_TIME = { value: 0 };
function joined(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false)!; for (const p of parts) p.dispose(); return merged;
}
function rockGeometry(frozen: boolean): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const piece = frozen ? new DodecahedronGeometry(1, 0) : new CylinderGeometry(3.2, 4.3, 1, 6, 1);
    if (frozen) piece.scale(3 + i * .6, 10 + i * 4, 5).rotateZ((i - 1.5) * .17);
    else piece.scale(1, 17 + i * 7, 1);
    piece.translate(Math.sin(i * 2.4) * 5, frozen ? 8 + i * 4 : (17 + i * 7) / 2, Math.cos(i * 2.4) * 5);
    parts.push(piece);
  }
  return joined(parts);
}

/** Layered vegetation / rock stands outside the racing envelope. Six static draws,
 * zero downloads; the near shoulder stays readable and distant silhouettes break repetition. */
export function createRacingBiomeScenery(course: PodraceCourse, heightAt: (x: number, z: number) => number): Mesh[] {
  const biome = racingBiomeForSeed(course.seed), jungle = biome.id === 'jungle', frozen = biome.id === 'frozen', desert = biome.id === 'desert';
  const placements: { x: number; y: number; z: number; scale: number; yaw: number }[] = [];
  let seed = (course.seed ?? 1) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 260; i++) {
    const sample = course.sampleAtProgress(i / 260);
    for (const side of [-1, 1]) {
      const offset = side * (sample.width + (jungle ? 26 : 35) + random() * (jungle ? 120 : 235));
      const x = sample.x + sample.rightX * offset, z = sample.z + sample.rightZ * offset;
      const nearest = course.projectPoint(x, z);
      if (nearest.distanceToCenter < nearest.width + 28) continue;
      placements.push({ x, z, y: heightAt(x, z) - .6, scale: (.65 + random() * 1.35) * (jungle ? 1.55 : 1), yaw: random() * Math.PI * 2 });
    }
  }
  const material = sceneryMaterial(false, biome.id), result: Mesh[] = [];
  const matrix = new Matrix4(), p = new Vector3(), q = new Quaternion(), scale = new Vector3(), up = new Vector3(0, 1, 0), color = new Color();
  // Verdant Run grows a closed canopy of buttressed giants instead of stands.
  if (jungle) result.push(...createVerdantCanopy(course, heightAt, placements, material, sceneryMaterial(true, biome.id)));
  const body = new InstancedMesh(desert ? new DodecahedronGeometry(1, 0) : rockGeometry(frozen), material, jungle ? 0 : placements.length);
  body.name = `${biome.title} ${frozen ? 'fractured ice outcrops' : desert ? 'eroded shoulder stones' : 'clustered basalt stacks'}`;
  placements.forEach((o, i) => {
    p.set(o.x, o.y, o.z); q.setFromAxisAngle(up, o.yaw);
    scale.set(desert ? o.scale * 8 : o.scale, desert ? o.scale * 4 : o.scale, desert ? o.scale * 6 : o.scale);
    body.setMatrixAt(i, matrix.compose(p, q, scale));
    color.set(jungle ? '#5c5239' : biome.stone).multiplyScalar(.78 + (i % 7) * .055); body.setColorAt(i, color);
  });
  body.computeBoundingSphere(); if (!jungle) result.push(body); else body.geometry.dispose();
  // Low broken masses tie the large silhouettes into the ground without impeding a racing line.
  const ground = new InstancedMesh(new IcosahedronGeometry(1, 0), sceneryMaterial(false, biome.id), placements.length * 3);
  ground.name = `${biome.title} ground transition clusters`;
  placements.forEach((o, i) => { for (let k = 0; k < 3; k++) {
    const x = o.x + Math.sin(o.yaw + k * 2.4) * 10, z = o.z + Math.cos(o.yaw + k * 2.4) * 10;
    p.set(x, heightAt(x, z) + .2, z); q.setFromAxisAngle(up, o.yaw + k);
    scale.set((4 + k * 2) * o.scale, (jungle ? 2.7 : 1.8) * o.scale, (3 + k) * o.scale);
    ground.setMatrixAt(i * 3 + k, matrix.compose(p, q, scale));
    color.set(jungle ? ['#48633e', '#657c44', '#78814b'][k]! : biome.stone).multiplyScalar(.66 + k * .08); ground.setColorAt(i * 3 + k, color);
  } }); ground.computeBoundingSphere(); result.push(ground);
  return result;
}
