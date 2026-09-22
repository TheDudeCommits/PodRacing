import { Color, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, ShaderMaterial, Quaternion, Vector3, type Mesh } from 'three';
import type { PodraceCourse } from '../../game/race/course';
import { racingBiomeForSeed } from '../../game/race/racingBiomes';


function sceneryMaterial(): ShaderMaterial {
  return new ShaderMaterial({ name: 'Racing biome cel scenery', toneMapped: false,
    vertexShader: `varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld;
      void main(){ mat3 m=mat3(instanceMatrix); vec3 n=normal/vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));
      vNormal=normalize(mat3(modelMatrix)*m*n); vColor=instanceColor; vec4 p=modelMatrix*instanceMatrix*vec4(position,1.);
      vWorld=p.xyz; gl_Position=projectionMatrix*viewMatrix*p; }`,
    fragmentShader: `varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld;
      void main(){float light=dot(normalize(vNormal),normalize(vec3(-.42,.76,-.5)));
      float band=light>.55?1.15:light>.05?.85:.50; vec3 color=vColor*band;
      float haze=1.-exp(-max(0.,length(vWorld-cameraPosition)-300.)*.00045);
      color=mix(color,vec3(.30,.40,.47),haze*.72);gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
      }`,
  });
}

/** Decorative stands sit beyond every main/branch lane; course physics owns the road. */
export function createRacingBiomeScenery(course: PodraceCourse, heightAt: (x: number, z: number) => number): Mesh[] {
  const biome = racingBiomeForSeed(course.seed);
  if (biome.id === 'desert') return [];
  const frozen = biome.id === 'frozen', jungle = biome.id === 'jungle';
  const placements: { x: number; y: number; z: number; scale: number; yaw: number }[] = [];
  let seed = (course.seed ?? 1) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 320; i++) {
    const sample = course.sampleAtProgress(i / 320);
    for (const side of [-1, 1]) {
      const offset = side * (sample.width + 28 + random() * (jungle ? 150 : 250));
      const x = sample.x + sample.rightX * offset, z = sample.z + sample.rightZ * offset;
      const nearest = course.projectPoint(x, z);
      if (nearest.distanceToCenter < nearest.width + 25) continue;
      placements.push({ x, z, y: heightAt(x, z) - 1.5, scale: .7 + random() * 1.4, yaw: random() * Math.PI * 2 });
    }
  }
  const geometry = jungle ? new CylinderGeometry(1.1, 2.9, 28, 7, 3)
    : frozen ? new DodecahedronGeometry(1, 0) : new CylinderGeometry(5, 7, 30, 6);
  const material = sceneryMaterial();
  const trunks = new InstancedMesh(geometry, material, placements.length);
  trunks.name = `${biome.title} ${jungle ? 'forest trunks' : frozen ? 'ice fins' : 'basalt columns'}`;
  const matrix = new Matrix4(), p = new Vector3(), q = new Quaternion(), scale = new Vector3(), up = new Vector3(0, 1, 0), color = new Color();
  placements.forEach((o, i) => {
    p.set(o.x, o.y + (frozen ? 19 : 14) * o.scale, o.z); q.setFromAxisAngle(up, o.yaw);
    scale.set((frozen ? 6 : 1) * o.scale, (frozen ? 23 : 1) * o.scale, (frozen ? 9 : 1) * o.scale);
    trunks.setMatrixAt(i, matrix.compose(p, q, scale));
    color.set(biome.stone).multiplyScalar(.72 + (i % 7) * .06); if (jungle) color.set('#554b32'); trunks.setColorAt(i, color);
  });
  trunks.computeBoundingSphere();
  const result: Mesh[] = [trunks];
  if (jungle) {
    const leaves = new InstancedMesh(new IcosahedronGeometry(1, 1), sceneryMaterial(), placements.length * 3);
    leaves.name = 'Verdant layered forest canopy';
    placements.forEach((o, i) => {
      for (let layer = 0; layer < 3; layer++) {
        p.set(o.x + Math.sin(o.yaw + layer * 2.1) * 6, o.y + (24 + layer * 5) * o.scale, o.z + Math.cos(o.yaw + layer * 2.1) * 6);
        q.setFromAxisAngle(up, o.yaw + layer); scale.set((16 - layer * 2) * o.scale, (7 - layer) * o.scale, (12 - layer) * o.scale);
        leaves.setMatrixAt(i * 3 + layer, matrix.compose(p, q, scale));
        color.set(['#344f32', '#4d713d', '#7c9551'][layer]!); leaves.setColorAt(i * 3 + layer, color);
      }
    });
    leaves.computeBoundingSphere(); result.push(leaves);
  }
  return result;
}
