import {
  BufferAttribute, BufferGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh,
  Matrix4, Quaternion, Vector3, type ShaderMaterial,
} from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import type { PodraceCourse } from '../../game/race/course';

type HeightAt = (x: number, z: number) => number;

/**
 * Verdant Run's canopy cathedral. Buttressed giants lean in from both
 * shoulders so their crowns close over the racing line 40-70 m up; light
 * falls through the gaps as god rays and dappled shadow, and vines hang in
 * the slipstream. The trunks keep the scenery's rooted clearance from the
 * track; only crowns, limbs and vines ever reach over it.
 */
export interface Tree { base: Vector3; lean: Vector3; height: number; radius: number; crown: number; seed: number; hero: boolean }

function hash(n: number): number { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

class BarkBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly indices: number[] = [];

  /** A tapered, leaning trunk with root buttresses flaring into the ground. */
  trunk(tree: Tree): Vector3 {
    const rings = 16, around = 11, base = this.positions.length / 3;
    const centre = new Vector3(), next = new Vector3(), tangent = new Vector3(), side = new Vector3(), across = new Vector3();
    const point = (t: number, out: Vector3) => out.copy(tree.base)
      .addScaledVector(new Vector3(0, 1, 0), tree.height * t)
      .addScaledVector(tree.lean, tree.height * .55 * t ** 1.7);
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      point(t, centre); point(Math.min(1, t + .02), next);
      tangent.subVectors(next, centre).normalize();
      if (i === rings) tangent.subVectors(centre, point(t - .02, next)).normalize();
      side.set(1, 0, 0).addScaledVector(tangent, -tangent.x).normalize();
      across.crossVectors(tangent, side).normalize();
      const radius = tree.radius * (1 - .66 * t ** .8);
      for (let j = 0; j < around; j++) {
        const angle = j / around * Math.PI * 2;
        // Five root fins, fading out a few metres up the trunk.
        const fin = t < .16 ? (1 - t / .16) ** 2 * 2.1 * Math.abs(Math.cos(angle * 2.5 + tree.seed)) ** 3 : 0;
        const bark = 1 + (hash(tree.seed + i * 3.7 + j * 1.3) - .5) * .12;
        const r = radius * (1 + fin) * bark;
        const c = Math.cos(angle), s = Math.sin(angle);
        this.positions.push(centre.x + (side.x * c + across.x * s) * r, centre.y + (side.y * c + across.y * s) * r - (t === 0 ? 2.5 : 0), centre.z + (side.z * c + across.z * s) * r);
        this.normals.push(side.x * c + across.x * s, side.y * c + across.y * s, side.z * c + across.z * s);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < around; j++) {
      const a = base + i * around + j, b = base + i * around + (j + 1) % around;
      this.indices.push(a, b, a + around, b, b + around, a + around);
    }
    return point(1, new Vector3());
  }

  /** A limb reaching from the upper trunk out under the crown. */
  limb(from: Vector3, to: Vector3, radius: number, seed: number): void {
    const steps = 7, around = 6, base = this.positions.length / 3;
    const mid = new Vector3().lerpVectors(from, to, .5).add(new Vector3(0, 3 + hash(seed) * 4, 0));
    const p = new Vector3(), tangent = new Vector3(), side = new Vector3(), across = new Vector3();
    const at = (t: number, out: Vector3) => out.set(
      (1 - t) ** 2 * from.x + 2 * (1 - t) * t * mid.x + t * t * to.x,
      (1 - t) ** 2 * from.y + 2 * (1 - t) * t * mid.y + t * t * to.y,
      (1 - t) ** 2 * from.z + 2 * (1 - t) * t * mid.z + t * t * to.z);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      at(t, p); tangent.subVectors(at(Math.min(1, t + .05), new Vector3()), at(Math.max(0, t - .05), new Vector3())).normalize();
      side.set(0, 1, 0).addScaledVector(tangent, -tangent.y).normalize();
      across.crossVectors(tangent, side).normalize();
      const r = radius * (1 - .7 * t);
      for (let j = 0; j < around; j++) {
        const angle = j / around * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
        this.positions.push(p.x + (side.x * c + across.x * s) * r, p.y + (side.y * c + across.y * s) * r, p.z + (side.z * c + across.z * s) * r);
        this.normals.push(side.x * c + across.x * s, side.y * c + across.y * s, side.z * c + across.z * s);
      }
    }
    for (let i = 0; i < steps; i++) for (let j = 0; j < around; j++) {
      const a = base + i * around + j, b = base + i * around + (j + 1) % around;
      this.indices.push(a, b, a + around, b, b + around, a + around);
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}

/** Soft, lumpy foliage masses with smooth normals for the painted canopy. */
function clumpGeometry(seed: number): BufferGeometry {
  const geometry = mergeVertices(new IcosahedronGeometry(1, 2));
  const position = geometry.getAttribute('position');
  const v = new Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const lump = 1 + (Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 1.7) * Math.sin(v.z * 3.3 + seed * .6)) * .22;
    v.multiplyScalar(lump);
    // Flat undersides, like leaf masses shaded from below.
    if (v.y < 0) v.y *= .55;
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

type Backdrop = readonly { x: number; y: number; z: number; scale: number; yaw: number }[];

/** Deterministic tree plan: hero giants on alternating shoulders plus the backdrop stands. */
export function planVerdantTrees(course: PodraceCourse, heightAt: HeightAt, backdrop: Backdrop): Tree[] {
  const trees: Tree[] = [];
  const start = course.sampleAtProgress(0);
  let seed = ((course.seed ?? 1) ^ 0x7ee5) >>> 0;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  // Heroes: alternate shoulders every ~44 m, leaning in over the track.
  const length = course.totalLength;
  const count = Math.floor(length / 44);
  for (let i = 0; i < count; i++) {
    const progress = (i + random() * .4) / count;
    const sample = course.sampleAtProgress(progress);
    if (Math.hypot(sample.x - start.x, sample.z - start.z) < 260) continue;
    const side = i % 2 ? 1 : -1;
    const offset = side * (sample.width + 22 + random() * 14);
    const x = sample.x + sample.rightX * offset, z = sample.z + sample.rightZ * offset;
    const nearest = course.projectPoint(x, z);
    if (nearest.distanceToCenter < nearest.width + 18) continue;
    const lean = new Vector3(-sample.rightX * side, 0, -sample.rightZ * side).normalize().multiplyScalar(.45 + random() * .35);
    trees.push({ base: new Vector3(x, heightAt(x, z), z), lean, height: 52 + random() * 22, radius: 2.6 + random() * 1.3, crown: 1 + random() * .4, seed: random() * 100, hero: true });
  }
  // The existing scattered stands become upright giants behind the shoulders.
  for (const o of backdrop) {
    trees.push({ base: new Vector3(o.x, o.y, o.z), lean: new Vector3(Math.sin(o.yaw), 0, Math.cos(o.yaw)).multiplyScalar(.08),
      height: 30 * o.scale, radius: 1.7 * o.scale, crown: o.scale * .72, seed: o.yaw * 13, hero: false });
  }
  return trees;
}

export function createVerdantCanopy(course: PodraceCourse, heightAt: HeightAt, backdrop: Backdrop,
  barkMaterial: ShaderMaterial, leafMaterial: ShaderMaterial): InstancedMesh[] {
  const trees = planVerdantTrees(course, heightAt, backdrop);

  const bark = new BarkBuilder();
  const clumps: { position: Vector3; scale: Vector3; yaw: number; tint: number }[] = [];
  const vines: { position: Vector3; length: number; yaw: number }[] = [];
  for (const tree of trees) {
    const top = bark.trunk(tree);
    const crownCentre = top.clone();
    const reach = tree.hero ? 20 : 11;
    const limbs = tree.hero ? 3 : 2;
    for (let k = 0; k < limbs; k++) {
      const angle = tree.seed + k * 2.1;
      // Hero limbs favour the lean direction, reaching over the racing line.
      const dir = new Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(.6).add(tree.hero ? tree.lean.clone().normalize() : new Vector3()).normalize();
      const from = new Vector3().lerpVectors(tree.base, top, .72).setY(tree.base.y + tree.height * .7);
      const to = top.clone().addScaledVector(dir, reach * (.7 + hash(tree.seed + k) * .5)).add(new Vector3(0, -2 + hash(k + tree.seed) * 4, 0));
      bark.limb(from, to, tree.radius * .38, tree.seed + k);
      crownCentre.add(to.clone().sub(top).multiplyScalar(.25));
    }
    const masses = tree.hero ? 9 : 4;
    for (let k = 0; k < masses; k++) {
      const angle = tree.seed * 3 + k * 2.39996;
      const spread = (tree.hero ? 17 : 9) * tree.crown * Math.sqrt((k + .5) / masses);
      const lift = (k % 3 - 1) * 3 * tree.crown;
      const position = crownCentre.clone().add(new Vector3(Math.sin(angle) * spread, lift + 2, Math.cos(angle) * spread));
      if (tree.hero) position.addScaledVector(tree.lean.clone().normalize(), 6);
      const size = (tree.hero ? 10 : 7.5) * tree.crown * (.8 + hash(tree.seed + k * 7) * .45);
      clumps.push({ position, scale: new Vector3(size, size * .62, size * (.85 + hash(k) * .3)), yaw: angle, tint: k });
      if (tree.hero && k % 2 === 0) {
        for (let v = 0; v < 2; v++) {
          const hang = position.clone().add(new Vector3((hash(k * 3 + v) - .5) * size, -size * .3, (hash(k * 5 + v) - .5) * size));
          vines.push({ position: hang, length: 8 + hash(tree.seed + k + v) * 16, yaw: angle });
        }
      }
    }
  }

  const matrix = new Matrix4(), q = new Quaternion(), up = new Vector3(0, 1, 0), color = new Color(), one = new Vector3(1, 1, 1);
  const trunks = new InstancedMesh(bark.build(), barkMaterial, 1);
  trunks.name = 'Verdant buttressed giants';
  trunks.setMatrixAt(0, new Matrix4());
  trunks.setColorAt(0, color.set('#5a4a33'));
  trunks.computeBoundingSphere();

  const prototypes = [clumpGeometry(1.3), clumpGeometry(4.7), clumpGeometry(8.1)];
  const palette = ['#7d9a4b', '#4d7240', '#5f8446', '#3b6044', '#6d8e47', '#86a052'];
  const crowns: InstancedMesh[] = prototypes.map((geometry, index) => {
    const mine = clumps.filter((_, i) => i % prototypes.length === index);
    const mesh = new InstancedMesh(geometry, leafMaterial, mine.length);
    mesh.name = `Verdant canopy masses ${index + 1}`;
    mine.forEach((clump, i) => {
      q.setFromAxisAngle(up, clump.yaw);
      mesh.setMatrixAt(i, matrix.compose(clump.position, q, clump.scale));
      mesh.setColorAt(i, color.set(palette[(clump.tint + index) % palette.length]!));
    });
    mesh.computeBoundingSphere();
    return mesh;
  });

  // Vines hang from the crowns; flipped so their free ends sway most.
  const vineGeometry = new CylinderGeometry(.09, .16, 1, 4, 6).translate(0, .5, 0);
  const vineMesh = new InstancedMesh(vineGeometry, leafMaterial, vines.length);
  vineMesh.name = 'Verdant hanging vines';
  const flip = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI);
  vines.forEach((vine, i) => {
    q.setFromAxisAngle(up, vine.yaw).multiply(flip);
    vineMesh.setMatrixAt(i, matrix.compose(vine.position, q, one.clone().set(1, vine.length, 1)));
    vineMesh.setColorAt(i, color.set(i % 3 ? '#3e5a34' : '#56703c'));
  });
  vineMesh.computeBoundingSphere();
  return [trunks, ...crowns, vineMesh];
}
