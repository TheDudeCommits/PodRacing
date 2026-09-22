import { Color, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, ShaderMaterial, Quaternion, Vector3, type BufferGeometry, type Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '../../game/race/course';
import { racingBiomeForSeed } from '../../game/race/racingBiomes';

function sceneryMaterial(organic: boolean): ShaderMaterial {
  return new ShaderMaterial({ name: 'Faceted biome surfaces', toneMapped: false,
    uniforms: { uOrganic: { value: organic ? 1 : 0 } },
    vertexShader: `varying vec3 vColor; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vLocal;
      void main(){mat3 m=mat3(instanceMatrix);vec3 n=normal/vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]));
      vNormal=normalize(mat3(modelMatrix)*m*n);vColor=instanceColor;vLocal=position;
      vec4 p=modelMatrix*instanceMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `uniform float uOrganic;varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;varying vec3 vLocal;
      void main(){vec3 n=normalize(vNormal);float light=dot(n,normalize(vec3(-.42,.76,-.5)));
      float band=light>.55?1.16:light>.05?.83:.43;
      float strata=smoothstep(.80,.93,sin(vWorld.y*.44+sin(vWorld.x*.06)*1.8))*mix(.1,.02,uOrganic);
      float baseShade=mix(.7,1.,smoothstep(-1.,16.,vLocal.y));
      vec3 color=vColor*(band-strata)*baseShade;
      color+=vec3(.10,.14,.19)*pow(1.-abs(dot(normalize(cameraPosition-vWorld),n)),3.)*.22;
      float haze=1.-exp(-max(0.,length(vWorld-cameraPosition)-260.)*.0005);
      color=mix(color,vec3(.30,.40,.47),haze*.72);gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
      }`,
  });
}
function joined(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false)!; for (const p of parts) p.dispose(); return merged;
}
/** Root flare, taper and forked limbs give the canopy a legible tree silhouette. */
function treeGeometry(): BufferGeometry {
  const pieces: BufferGeometry[] = [new CylinderGeometry(.8, 2.6, 30, 7, 3).translate(0, 15, 0)];
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3;
    pieces.push(new CylinderGeometry(.35, 1.1, 15, 5).rotateZ(.65).translate(-4.5, 25, 0).rotateY(angle));
    pieces.push(new CylinderGeometry(.4, 1.9, 8, 5).rotateZ(.8).translate(-2, 2, 0).rotateY(angle));
  }
  return joined(pieces);
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
      const offset = side * (sample.width + 35 + random() * (jungle ? 140 : 235));
      const x = sample.x + sample.rightX * offset, z = sample.z + sample.rightZ * offset;
      const nearest = course.projectPoint(x, z);
      if (nearest.distanceToCenter < nearest.width + 28) continue;
      placements.push({ x, z, y: heightAt(x, z) - .6, scale: .65 + random() * 1.35, yaw: random() * Math.PI * 2 });
    }
  }
  const material = sceneryMaterial(jungle), result: Mesh[] = [];
  const matrix = new Matrix4(), p = new Vector3(), q = new Quaternion(), scale = new Vector3(), up = new Vector3(0, 1, 0), color = new Color();
  const body = new InstancedMesh(jungle ? treeGeometry() : desert ? new DodecahedronGeometry(1, 0) : rockGeometry(frozen), material, placements.length);
  body.name = `${biome.title} ${jungle ? 'rooted branching trees' : frozen ? 'fractured ice outcrops' : desert ? 'eroded shoulder stones' : 'clustered basalt stacks'}`;
  placements.forEach((o, i) => {
    p.set(o.x, o.y, o.z); q.setFromAxisAngle(up, o.yaw);
    scale.set(desert ? o.scale * 8 : o.scale, desert ? o.scale * 4 : o.scale, desert ? o.scale * 6 : o.scale);
    body.setMatrixAt(i, matrix.compose(p, q, scale));
    color.set(jungle ? '#5c5239' : biome.stone).multiplyScalar(.78 + (i % 7) * .055); body.setColorAt(i, color);
  });
  body.computeBoundingSphere(); result.push(body);
  if (jungle) {
    // Offset crown fans leave negative space around forks, with sunlit upper leaves.
    const leafGeometry = new IcosahedronGeometry(1, 1);
    const pos = leafGeometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setY(i, y * (y > 0 ? 1 : .5)); }
    leafGeometry.computeVertexNormals();
    const leaves = new InstancedMesh(leafGeometry, material.clone(), placements.length * 5);
    leaves.name = 'Verdant asymmetrical crown fans';
    placements.forEach((o, i) => { for (let layer = 0; layer < 5; layer++) {
      const angle = o.yaw + layer * 2.4;
      p.set(o.x + Math.sin(angle) * (layer ? 10 : 0) * o.scale, o.y + (layer ? 29 + (layer % 3) * 2 : 36) * o.scale, o.z + Math.cos(angle) * (layer ? 10 : 0) * o.scale);
      q.setFromAxisAngle(up, angle); scale.set((layer ? 12 : 10) * o.scale, 5.5 * o.scale, 8 * o.scale);
      leaves.setMatrixAt(i * 5 + layer, matrix.compose(p, q, scale));
      color.set(['#899753', '#486740', '#5c7a43', '#365742', '#718849'][layer]!); leaves.setColorAt(i * 5 + layer, color);
    } }); leaves.computeBoundingSphere(); result.push(leaves);
  }
  // Low broken masses tie the large silhouettes into the ground without impeding a racing line.
  const ground = new InstancedMesh(new IcosahedronGeometry(1, 0), material.clone(), placements.length * 3);
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
