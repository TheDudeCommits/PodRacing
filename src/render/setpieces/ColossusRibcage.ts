import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Mesh, ShaderMaterial, Vector3 } from 'three';

import type { CourseRenderPoint } from '../../game/race/types';
import { LEGACY_HAZE, SKY_SUN, WORLD_SUN } from '../lighting/WorldLight';
import { createInkstormShadowUniforms, INKSTORM_SHADOW_GLSL } from '../inkstorm/InkstormSunShadow';

type HeightAt = (x: number, z: number) => number;

/**
 * Sunscar Canyon's signature set piece: the fossil of a colossal beast lying
 * on its side, with the racing line threading its chest. Ribs arch 40-70 m
 * over the track from a half-buried spine, so the pack streams through a
 * strobe of bone and shadow. Purely presentational: every foot stands
 * outside the racing surface, and the simulation never sees it.
 */
export interface ColossusReceipt {
  placed: boolean;
  /** Course progress of the first and last rib. */
  startProgress: number;
  endProgress: number;
  /** +1 when the spine lies on the course's right-hand side. */
  side: number;
  ribs: number;
  vertebrae: number;
  triangles: number;
  reason: string;
}

interface Frame {
  x: number; y: number; z: number;
  /** Unit horizontal tangent and right vectors. */
  tx: number; tz: number; rx: number; rz: number;
  width: number; progress: number; s: number; tag: string;
}

const STRAIGHT_TAGS = new Set(['start-straight', 'fast-straight', 'recovery-straight']);
const RIB_SPACING = 36;
const RIB_COUNT = 9;
const WINDOW = RIB_SPACING * (RIB_COUNT - 1);

function buildFrames(points: readonly CourseRenderPoint[]): { frames: Frame[]; length: number } {
  const frames: Frame[] = [];
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!, prev = points[(i - 1 + points.length) % points.length]!, next = points[(i + 1) % points.length]!;
    if (i) s += Math.hypot(p.x - prev.x, p.z - prev.z);
    const dx = next.x - prev.x, dz = next.z - prev.z, len = Math.hypot(dx, dz) || 1;
    const tx = dx / len, tz = dz / len;
    // Matches inkstormRoadCrossSection: right = (tz, -tx).
    frames.push({ x: p.x, y: p.y, z: p.z, tx, tz, rx: tz, rz: -tx, width: p.width, progress: p.progress, s, tag: p.tag });
  }
  const last = points[points.length - 1]!, first = points[0]!;
  return { frames, length: s + Math.hypot(first.x - last.x, first.z - last.z) };
}

function frameAt(frames: readonly Frame[], length: number, s: number): Frame {
  const d = ((s % length) + length) % length;
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (frames[mid]!.s <= d) lo = mid; else hi = mid - 1; }
  const a = frames[lo]!, b = frames[(lo + 1) % frames.length]!;
  const span = (b.s > a.s ? b.s : length) - a.s || 1;
  const t = Math.min(1, Math.max(0, (d - a.s) / span));
  const tx = a.tx + (b.tx - a.tx) * t, tz = a.tz + (b.tz - a.tz) * t, tl = Math.hypot(tx, tz) || 1;
  return {
    x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t,
    tx: tx / tl, tz: tz / tl, rx: tz / tl, rz: -tx / tl,
    width: a.width + (b.width - a.width) * t, progress: a.progress + (b.progress - a.progress) * t, s: d,
    tag: t < .5 ? a.tag : b.tag,
  };
}

interface Window { start: number; side: 1 | -1; score: number }

/**
 * Chooses the straightest open stretch of a straight-tagged section, clear of
 * the launch grid and any fork. The spine lies on whichever side has lower
 * ground, so neither the ribs nor the vertebrae bury themselves in a wall.
 */
function chooseWindow(frames: readonly Frame[], length: number, heightAt: HeightAt,
  avoid: readonly { x: number; z: number }[]): Window | null {
  let best: Window | null = null;
  const lead = 70, tail = 90;
  for (let i = 0; i < frames.length; i += 3) {
    const start = frames[i]!.s;
    // Keep the grid, the launch citadel and the finish approach uncluttered.
    if (start < 380 || start + WINDOW + tail > length - 420) continue;
    let ok = true, turn = 0, rise = 0;
    const first = frameAt(frames, length, start - lead);
    let prevHeading = Math.atan2(first.tx, first.tz);
    const sides = { [1]: 0, [-1]: 0 } as Record<1 | -1, number>;
    for (let d = -lead; d <= WINDOW + tail; d += 12) {
      const f = frameAt(frames, length, start + d);
      if (d >= -20 && d <= WINDOW + 20 && !STRAIGHT_TAGS.has(f.tag)) { ok = false; break; }
      const heading = Math.atan2(f.tx, f.tz);
      let delta = heading - prevHeading; delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      turn += Math.abs(delta); prevHeading = heading;
      for (const a of avoid) if ((a.x - f.x) ** 2 + (a.z - f.z) ** 2 < 110 * 110) { ok = false; break; }
      if (!ok) break;
      rise = Math.max(rise, Math.abs(f.y - first.y));
      for (const side of [1, -1] as const) {
        const reach = f.width + 44;
        const ground = heightAt(f.x + f.rx * reach * side, f.z + f.rz * reach * side);
        sides[side] += Math.max(0, ground - f.y - 6);
      }
    }
    if (!ok) continue;
    const side: 1 | -1 = sides[1] <= sides[-1] ? 1 : -1;
    const walls = Math.min(sides[1], sides[-1]) + Math.max(sides[1], sides[-1]) * .15;
    // Prefer the early lap, where the whole pack is still bunched together.
    const score = -turn * 900 - walls * 2 - rise * 3 - start / length * 60;
    if (!best || score > best.score) best = { start, side, score };
  }
  return best;
}

/** Deterministic value noise for bone surface variation. */
function hash(x: number): number { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

class TubeBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly ground: number[] = [];
  readonly along: number[] = [];
  readonly indices: number[] = [];
  constructor(private readonly heightAt: HeightAt) {}

  /**
   * Sweeps an elliptical ring along a polyline. `flat` is the preferred
   * direction of the ring's wide axis (bone blades face along the body).
   */
  tube(path: readonly Vector3[], radius: (u: number) => number, flat: Vector3, aspect: number, segments: number, caps: boolean, seed: number): void {
    const base = this.positions.length / 3;
    const tangent = new Vector3(), e1 = new Vector3(), e2 = new Vector3(), n = new Vector3(), p = new Vector3();
    for (let i = 0; i < path.length; i++) {
      const u = i / (path.length - 1);
      const a = path[Math.max(0, i - 1)]!, b = path[Math.min(path.length - 1, i + 1)]!;
      tangent.subVectors(b, a).normalize();
      e1.copy(flat).addScaledVector(tangent, -flat.dot(tangent)).normalize();
      e2.crossVectors(tangent, e1).normalize();
      const r = radius(u);
      for (let j = 0; j < segments; j++) {
        const angle = j / segments * Math.PI * 2;
        const c = Math.cos(angle), s = Math.sin(angle);
        // Weathered bone is lumpy: vary the radius per ring and per facet.
        const lump = 1 + (hash(seed + i * 7.31 + j * 1.73) - .5) * .16 + Math.sin(u * 23 + seed) * .04;
        n.copy(e1).multiplyScalar(c * aspect).addScaledVector(e2, s / aspect).normalize();
        p.copy(path[i]!).addScaledVector(e1, c * r * aspect * lump).addScaledVector(e2, s * r / aspect * lump);
        this.positions.push(p.x, p.y, p.z);
        this.normals.push(n.x, n.y, n.z);
        this.ground.push(this.heightAt(p.x, p.z));
        this.along.push(u);
      }
    }
    for (let i = 0; i < path.length - 1; i++) {
      for (let j = 0; j < segments; j++) {
        const a = base + i * segments + j, b = base + i * segments + (j + 1) % segments;
        const c = a + segments, d = b + segments;
        this.indices.push(a, c, b, b, c, d);
      }
    }
    if (!caps) return;
    for (const end of [0, path.length - 1]) {
      const centre = path[end]!, dir = new Vector3().subVectors(path[end === 0 ? 1 : end - 1]!, centre).normalize().negate();
      const tip = new Vector3().copy(centre).addScaledVector(dir, radius(end === 0 ? 0 : 1) * .55);
      const cap = this.positions.length / 3;
      this.positions.push(tip.x, tip.y, tip.z); this.normals.push(dir.x, dir.y, dir.z);
      this.ground.push(this.heightAt(tip.x, tip.z)); this.along.push(end === 0 ? 0 : 1);
      const ring = base + end * segments;
      for (let j = 0; j < segments; j++) {
        const a = ring + j, b = ring + (j + 1) % segments;
        if (end === 0) this.indices.push(cap, a, b); else this.indices.push(cap, b, a);
      }
    }
  }

  /** A lumpy ellipsoid on the (right, up, forward) basis, for the buried cranium. */
  ellipsoid(centre: Vector3, right: Vector3, forward: Vector3, radii: [number, number, number], seed: number): void {
    const base = this.positions.length / 3, rings = 14, segments = 20;
    const up = new Vector3(0, 1, 0), p = new Vector3(), n = new Vector3();
    for (let i = 0; i <= rings; i++) {
      const phi = i / rings * Math.PI, sp = Math.sin(phi), cp = Math.cos(phi);
      for (let j = 0; j < segments; j++) {
        const theta = j / segments * Math.PI * 2, st = Math.sin(theta), ct = Math.cos(theta);
        const lump = 1 + (hash(seed + i * 3.1 + j * 7.7) - .5) * .1;
        const x = sp * ct, y = cp, z = sp * st;
        p.copy(centre).addScaledVector(right, x * radii[0] * lump).addScaledVector(up, y * radii[1] * lump).addScaledVector(forward, z * radii[2] * lump);
        n.copy(right).multiplyScalar(x / radii[0]).addScaledVector(up, y / radii[1]).addScaledVector(forward, z / radii[2]).normalize();
        this.positions.push(p.x, p.y, p.z); this.normals.push(n.x, n.y, n.z);
        this.ground.push(this.heightAt(p.x, p.z)); this.along.push(i / rings);
      }
    }
    for (let i = 0; i < rings; i++) for (let j = 0; j < segments; j++) {
      const a = base + i * segments + j, b = base + i * segments + (j + 1) % segments;
      this.indices.push(a, b, a + segments, b, b + segments, a + segments);
    }
  }

  build(): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(this.positions), 3));
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(this.normals), 3));
    geometry.setAttribute('aGround', new BufferAttribute(new Float32Array(this.ground), 1));
    geometry.setAttribute('aAlong', new BufferAttribute(new Float32Array(this.along), 1));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }
}

function boneMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    name: 'Colossus fossil bone', toneMapped: false,
    uniforms: { uWorldSun: WORLD_SUN, uSkySun: SKY_SUN, uLegacyHaze: LEGACY_HAZE, ...createInkstormShadowUniforms() },
    vertexShader: /* glsl */ `
      attribute float aGround; attribute float aAlong;
      varying vec3 vWorld; varying vec3 vNormal; varying float vAbove; varying float vAlong;
      void main(){
        vec4 w=modelMatrix*vec4(position,1.);
        vWorld=w.xyz; vNormal=normalize(mat3(modelMatrix)*normal); vAbove=w.y-aGround; vAlong=aAlong;
        gl_Position=projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uWorldSun; uniform vec3 uSkySun; uniform float uLegacyHaze;
      varying vec3 vWorld; varying vec3 vNormal; varying float vAbove; varying float vAlong;
      ${INKSTORM_SHADOW_GLSL}
      float bh(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
      float bn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
        return mix(mix(mix(bh(i),bh(i+vec3(1,0,0)),f.x),mix(bh(i+vec3(0,1,0)),bh(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(bh(i+vec3(0,0,1)),bh(i+vec3(1,0,1)),f.x),mix(bh(i+vec3(0,1,1)),bh(i+vec3(1,1,1)),f.x),f.y),f.z);}
      void main(){
        vec3 n=normalize(vNormal); if(!gl_FrontFacing)n=-n;
        vec3 v=normalize(cameraPosition-vWorld); vec3 sun=normalize(uWorldSun);
        float dist=length(vWorld-cameraPosition);
        float detail=1.-smoothstep(300.,1200.,dist);
        float grain=bn(vWorld*.18)*.55+bn(vWorld*.7)*.3+bn(vWorld*2.4)*.15;
        vec3 albedo=mix(vec3(.8,.72,.57),vec3(.56,.44,.32),smoothstep(.38,.8,grain));
        // Growth rings along each bone and dark weathering pits.
        albedo*=1.-.1*smoothstep(.55,1.,sin(vAlong*110.+grain*4.))*detail;
        float pits=smoothstep(.72,.8,bn(vWorld*1.6+7.))*detail;
        albedo*=1.-pits*.35;
        // Old fractures: dark hairline bands across each bone.
        float fracture=smoothstep(.93,.99,sin(vAlong*41.+bn(vWorld*.05)*9.))*smoothstep(.4,.7,bn(vWorld*.09+3.));
        albedo*=1.-fracture*.55*detail;
        // Wind-blown sand stains the buried feet and fills the lower grooves.
        float stain=1.-smoothstep(.5,9.,vAbove+grain*2.);
        albedo=mix(albedo,vec3(.78,.46,.26),stain*.8);
        float lit=smoothstep(-.08,.22,dot(n,sun))*inkstormSunVisibility(vWorld+n*.8);
        vec3 col=mix(albedo*vec3(.27,.23,.46),albedo*vec3(1.12,.98,.82),lit);
        // Warm bounce from the sunlit sand, cool fill from the open sky.
        col+=albedo*vec3(.26,.13,.06)*clamp(-n.y*.6+.4,0.,1.)*(1.-lit*.7);
        col+=albedo*vec3(.05,.05,.09)*clamp(n.y,0.,1.);
        float backlit=smoothstep(-.1,.7,dot(-v,normalize(uSkySun)));
        col+=vec3(1.,.7,.42)*pow(1.-max(dot(n,v),0.),3.)*(.08+backlit*.3)*mix(.35,1.,lit);
        float haze=1.-exp(-max(0.,dist-260.)*.0005);
        col=mix(col,vec3(.48,.34,.47),haze*.65*uLegacyHaze);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * Builds the skeleton for a course. Returns null (with a receipt reason)
 * when no stretch is straight and open enough to host it.
 */
export function createColossusRibcage(points: readonly CourseRenderPoint[], heightAt: HeightAt,
  avoid: readonly { x: number; z: number }[] = []): { mesh: Mesh | null; receipt: ColossusReceipt } {
  const receipt: ColossusReceipt = { placed: false, startProgress: 0, endProgress: 0, side: 0, ribs: 0, vertebrae: 0, triangles: 0, reason: '' };
  if (points.length < 16) { receipt.reason = 'course too short'; return { mesh: null, receipt }; }
  const { frames, length } = buildFrames(points);
  const window = chooseWindow(frames, length, heightAt, avoid);
  if (!window) { receipt.reason = 'no open straight'; return { mesh: null, receipt }; }
  const { start, side } = window;
  const tubes = new TubeBuilder(heightAt);
  const up = new Vector3(0, 1, 0);
  const pointAt = (s: number, lateral: number, height: number, out = new Vector3()) => {
    const f = frameAt(frames, length, s);
    return out.set(f.x + f.rx * lateral, height, f.z + f.rz * lateral);
  };
  const halfWidth = (s: number) => frameAt(frames, length, s).width;

  // Spine: vertebrae from the neck (before the first rib) to a tapering tail.
  const spineGap = 24;
  const neck = start - 46, tailEnd = start + WINDOW + 120;
  let vertebrae = 0;
  for (let s = neck, k = 0; s <= tailEnd; s += 8.6, k++) {
    const size = s < start ? .75 + .25 * (s - neck) / 46 : s > start + WINDOW ? Math.max(.28, 1 - (s - start - WINDOW) / 150) : 1;
    // The tail curls away from the track as it thins out.
    const curl = s > start + WINDOW ? ((s - start - WINDOW) / 120) ** 2 * 26 : 0;
    const lateral = side * (halfWidth(s) + spineGap + 4 + curl);
    const f = frameAt(frames, length, s);
    const centre = pointAt(s, lateral, 0);
    centre.y = heightAt(centre.x, centre.z) + 1.2 * size - .6;
    const axis = new Vector3(f.tx, 0, f.tz);
    const r = 4.6 * size;
    const a = centre.clone().addScaledVector(axis, -3.6 * size), b = centre.clone().addScaledVector(axis, 3.6 * size);
    const mid = centre.clone();
    tubes.tube([a, mid, b], u => r * (1 - Math.sin(u * Math.PI) * .18), up, 1, 9, true, 11 + k * 3.1);
    // Neural spine: a blade pointing away from the ribs, raked toward the tail.
    const outward = new Vector3(f.rx * side, 0, f.rz * side);
    const spineLength = (13 + hash(k * 5.7) * 7) * size;
    const root = centre.clone().addScaledVector(up, r * .6);
    const tip = root.clone().addScaledVector(outward, spineLength * .78).addScaledVector(up, spineLength * .55).addScaledVector(axis, spineLength * .3);
    const spinePath = [root, root.clone().lerp(tip, .5).addScaledVector(up, .6 * size), tip];
    tubes.tube(spinePath, u => (2.1 - u * 1.75) * size, axis, 2.1, 7, true, 23 + k * 1.9);
    vertebrae++;
  }

  // The skull lies half-buried at the neck; two tusks break the sand and frame the way in.
  {
    const s0 = neck - 20;
    const w = halfWidth(s0);
    const head = pointAt(s0, side * (w + 24), 0);
    const f = frameAt(frames, length, s0);
    const right = new Vector3(f.rx, 0, f.rz), forward = new Vector3(f.tx, 0, f.tz);
    const headGround = heightAt(head.x, head.z);
    head.y = headGround - 8;
    tubes.ellipsoid(head, right, forward, [14, 16, 21], 71);
    // [along, lateral (toward the track is negative side), height] control points.
    const tusks: [number, number, number][][] = [
      [[-4, w + 16, 3], [-16, w + 11, 20], [-32, w - 4, 33], [-43, w - 13, 42], [-47, w - 13, 48]],
      [[4, w + 20, 1], [-10, w + 26, 10], [-24, w + 30, 20], [-32, w + 29, 27], [-34, w + 26, 31]],
    ];
    tusks.forEach((controls, k) => {
      const points = controls.map(([along, lateral, height]) => pointAt(s0 + along, side * lateral, headGround + height));
      const curve = new CatmullRomCurve3(points, false, 'centripetal');
      tubes.tube(curve.getPoints(30), u => (k ? 3.1 : 3.8) * (1 - u * .9) + .25, up, 1, 12, true, 301 + k * 9);
    });
  }

  // Ribs: arch from the spine over the track and bury their tips beyond the far shoulder.
  let ribs = 0;
  for (let k = 0; k < RIB_COUNT; k++) {
    const s0 = start + k * RIB_SPACING;
    const envelope = Math.sin(Math.PI * (k + .9) / (RIB_COUNT + .8)) ** .65;
    const apex = 34 + 34 * envelope + (hash(k * 3.3) - .5) * 5;
    const w = halfWidth(s0);
    const spineLateral = side * (w + spineGap);
    const tipLateral = -side * (w + 17 + hash(k * 1.7) * 9);
    const sweep = 14 + envelope * 8;
    // Two ribs snapped long ago; their stumps still reach high over the track.
    const broken = k === 2 ? .72 : k === 6 ? .8 : 1;
    const spineFoot = pointAt(s0, spineLateral, 0);
    const baseY = heightAt(spineFoot.x, spineFoot.z) + 3;
    const tipFoot = pointAt(s0 + sweep, tipLateral, 0);
    const tipY = heightAt(tipFoot.x, tipFoot.z) - 6;
    const path: Vector3[] = [];
    const steps = 44;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps * broken;
      // The crest leans toward the spine, like a rib springing from its joint.
      const theta = Math.PI * (1 - (1 - u) ** 1.22);
      const lateral = (spineLateral + tipLateral) / 2 + (spineLateral - tipLateral) / 2 * Math.cos(theta);
      const along = s0 + sweep * (1 - Math.cos(theta)) / 2;
      const height = baseY + (tipY - baseY) * (theta / Math.PI) + apex * Math.sin(theta) ** .9;
      path.push(pointAt(along, lateral, height));
    }
    const f = frameAt(frames, length, s0);
    const flat = new Vector3(f.tx, 0, f.tz);
    tubes.tube(path, u => {
      const head = 2.4 * Math.exp(-u * 14);
      return (4.3 - 2.9 * Math.min(1, u / broken) ** .75) + head;
    }, flat, 1.55, 12, true, 101 + k * 17.7);
    ribs++;
  }

  const geometry = tubes.build();
  const mesh = new Mesh(geometry, boneMaterial());
  mesh.name = 'Colossus ribcage';
  mesh.renderOrder = 0;
  Object.assign(receipt, {
    placed: true,
    startProgress: frameAt(frames, length, start).progress,
    endProgress: frameAt(frames, length, start + WINDOW).progress,
    side, ribs, vertebrae, triangles: geometry.index!.count / 3, reason: 'ok',
  });
  return { mesh, receipt };
}
