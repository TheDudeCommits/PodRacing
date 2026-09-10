import { describe, expect, it } from 'vitest';
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Mesh, type BufferAttribute } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createProceduralPodraceCourse } from '../../src/game/race/course';
import { getInkstormLayout } from '../../src/game/race/inkstormLayout';
import { createSaltDuskRangeGeometry, planSaltDuskRanges, retainSaltDuskPlacement } from '../../src/render/saltDusk/SaltDuskScenery';
import { smoothStoneNormals } from '../../src/render/saltDusk/StoneNormals';

describe('Salt Dusk landscape geometry', () => {
  it.each([0x494e4b53, 87223])('clears every dense main/branch sample and retains collider placements for %s', seed => {
    const course = createProceduralPodraceCourse({ heightAt: () => 0 }, seed);
    const ranges = planSaltDuskRanges(course), render = course.getRenderData(4096);
    const points = [...render.points, ...(render.branches ?? []).flatMap(b => b.points)];
    let minimum = Infinity;
    for (const range of ranges) for (const p of points) {
      const dx = p.x - range.x, dz = p.z - range.z;
      const a = dx * range.axisX + dz * range.axisZ, b = -dx * range.axisZ + dz * range.axisX;
      const gap = Math.hypot(Math.max(0, Math.abs(a) - range.halfLength), Math.max(0, Math.abs(b) - range.halfWidth)) - p.width;
      minimum = Math.min(minimum, gap);
    }
    expect(minimum).toBeGreaterThan(150);
    const layout = getInkstormLayout(course), kept = layout.filter(p => retainSaltDuskPlacement(p, course));
    const colliding = new Set(['roadside-shard','sandstone-scree','wind-blade','mesa-crown','refinery-stack','pit-complex','pit-district','pipe-bank','finish-tower','foundry-gantry']);
    for (const p of layout) if (colliding.has(p.family) || p.id.startsWith('inkstorm-fork-divider-')) expect(kept).toContain(p);
    expect(kept.length).toBeLessThan(layout.length * .8);
    console.info(JSON.stringify({seed, ranges:ranges.length, minimumCorridorClearance:minimum, originalPlacements:layout.length, retainedPlacements:kept.length}));
  });

  it('has closed outward faces, finite smooth normals, buried skirt and a fixed triangle budget on sloping terrain', () => {
    const course = createProceduralPodraceCourse({ heightAt: () => 0 }, 0x494e4b53);
    const height = (x:number,z:number) => x * .013 + Math.sin(z * .008) * 14;
    let total = 0;
    for (const range of planSaltDuskRanges(course)) {
      const g = createSaltDuskRangeGeometry(range, height), p = g.getAttribute('position'), n = g.getAttribute('normal'), index = g.index!;
      total += index.count / 3;
      const edges = new Map<string, number>(); let volume = 0;
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i), b = index.getX(i+1), c = index.getX(i+2);
        for (const [u,v] of [[a,b],[b,c],[c,a]]) { const key = `${Math.min(u!,v!)},${Math.max(u!,v!)}`; edges.set(key, (edges.get(key) ?? 0)+1); }
        volume += p.getX(a)*(p.getY(b)*p.getZ(c)-p.getZ(b)*p.getY(c)) + p.getY(a)*(p.getZ(b)*p.getX(c)-p.getX(b)*p.getZ(c)) + p.getZ(a)*(p.getX(b)*p.getY(c)-p.getY(b)*p.getX(c));
      }
      expect([...edges.values()].every(count=>count===2)).toBe(true); expect(volume).toBeGreaterThan(0);
      let valid = true;
      for (let i=0;i<p.count;i++) if (![p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite)
        || Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.0001) valid=false;
      expect(valid).toBe(true);
      const uv=g.getAttribute('uv');
      for(let v=0;v<p.count;v++) if(uv.getX(v)===0||uv.getX(v)===1||uv.getY(v)===0||uv.getY(v)===1)
        expect(p.getY(v)-height(p.getX(v),p.getZ(v))).toBeLessThan(-2.9);
      g.dispose();
    }
    expect(total).toBeLessThanOrEqual(60000);
  });
});

describe('source-preserving stone normals', () => {
  it('smooths a shallow UV seam and preserves a ninety-degree box edge without welding any source data', () => {
    const g = new BufferGeometry();
    g.setAttribute('position',new Float32BufferAttribute([0,0,0, 0,0,1, 1,0,0, 1,0,0, 0,0,1, 1,.5,1],3));
    g.setAttribute('uv',new Float32BufferAttribute([0,0,0,1,1,0, .1,.1,.2,.4,.8,.7],2));
    g.computeVertexNormals(); const before = g.clone(); smoothStoneNormals(g);
    expect(g.getAttribute('position').array).toEqual(before.getAttribute('position').array); expect(g.getAttribute('uv').array).toEqual(before.getAttribute('uv').array);
    expect(g.getAttribute('normal').array).not.toEqual(before.getAttribute('normal').array);
    expect(g.getAttribute('normal').getY(2)).toBeCloseTo(g.getAttribute('normal').getY(3),6);
    const box=new BoxGeometry(), normals=box.getAttribute('normal').array.slice();smoothStoneNormals(box);expect(box.getAttribute('normal').array).toEqual(normals);
    box.dispose();g.dispose();before.dispose();
  });

  it('changes actual admitted arch normals while preserving all source attributes, triangle order and bounds', async () => {
    const fs:string='node:fs';const {readFileSync}=await import(/* @vite-ignore */ fs) as {readFileSync(path:URL):Uint8Array};
    const bytes=Uint8Array.from(readFileSync(new URL('../../public/assets/inkstorm/canyon-arch-v3.glb',import.meta.url)));
    const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');let changed=0;
    gltf.scene.traverse(o=>{
      if(!(o instanceof Mesh))return;const g=o.geometry;g.computeBoundingBox();const bounds=g.boundingBox!.clone();
      const attributes=Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,(a as BufferAttribute).array.slice()]));const index=g.index?.array.slice();
      smoothStoneNormals(g);g.computeBoundingBox();expect(g.boundingBox).toEqual(bounds);expect(g.index?.array).toEqual(index);
      for(const [key,array] of Object.entries(attributes))if(key!=='normal')expect(g.getAttribute(key).array).toEqual(array);
      const a=g.getAttribute('normal').array,b=attributes.normal!;for(let i=0;i<a.length;i++)if(Math.abs(a[i]!-b[i]!)>1e-5)changed++;
      g.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();
    });expect(changed).toBeGreaterThan(100);console.info(JSON.stringify({actualArchChangedNormalComponents:changed}));
  });
});
