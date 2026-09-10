import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function bytes(path: string): Promise<Uint8Array<ArrayBuffer>> {
  const moduleName: string = 'node:fs';
  const {readFileSync} = await import(/* @vite-ignore */ moduleName) as {readFileSync(path: URL): Uint8Array};
  return Uint8Array.from(readFileSync(new URL(path, import.meta.url)));
}
async function geometry(path: string) {
  const data=await bytes(path), gltf=await new GLTFLoader().parseAsync(data.buffer,'');
  gltf.scene.updateMatrixWorld(true);const meshes:Mesh[]=[];
  gltf.scene.traverse(o=>{if(o instanceof Mesh)meshes.push(o);});expect(meshes).toHaveLength(1);
  const mesh=meshes[0]!,g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();return g;
}

describe('versioned Salt Dusk stone exports',()=>{
  it.each([
    ['canyon-arch-v3','canyon-arch-dusk-v1',70000,9],
    ['wind-blade','wind-blade-dusk-v1',10000,1],
  ] as const)('keeps %s source bounds, closed outward topology, color ranges and one primitive',async(source,candidate,budget,components)=>{
    const original=await geometry(`../../public/assets/inkstorm/${source}.glb`);
    const refined=await geometry(`../../public/assets/inkstorm/${candidate}.glb`);
    const p=refined.getAttribute('position'),n=refined.getAttribute('normal'),color=refined.getAttribute('color');
    refined.computeBoundingBox();original.computeBoundingBox();
    const bounds=refined.boundingBox!,oldBounds=original.boundingBox!;
    expect(bounds.min.distanceTo(oldBounds.min)).toBeLessThan(1e-4);expect(bounds.max.distanceTo(oldBounds.max)).toBeLessThan(1e-4);
    expect(refined.index!.count/3).toBe(budget);expect(color).toBeDefined();expect(color.count).toBe(p.count);
    const weld=new Map<string,number>(),remap:number[]=[],positions:number[][]=[],parent:number[]=[];
    let finite=true;
    for(let i=0;i<p.count;i++){
      const v=[p.getX(i),p.getY(i),p.getZ(i)],key=v.map(x=>x.toFixed(5)).join(',');
      if(!weld.has(key)){weld.set(key,positions.length);parent.push(positions.length);positions.push(v);}remap.push(weld.get(key)!);
      if(!v.every(Number.isFinite)||Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.0001
        ||![color.getX(i),color.getY(i),color.getZ(i)].every(c=>c>=0&&c<=1))finite=false;
    }
    expect(finite).toBe(true);
    const edges=new Map<string,{count:number;winding:number}>();
    const find=(i:number):number=>{while(parent[i]!==i){parent[i]=parent[parent[i]!]!;i=parent[i]!;}return i;};
    let volume=0,degenerate=0,passageOverlaps=0;
    for(let i=0;i<refined.index!.count;i+=3){
      const ids=[0,1,2].map(j=>remap[refined.index!.getX(i+j)]!),[a,b,c]=ids.map(j=>positions[j]!) as [number[],number[],number[]];
      const u=b.map((v,j)=>v-a[j]!),v=c.map((v,j)=>v-a[j]!);
      if(Math.hypot(u[1]!*v[2]!-u[2]!*v[1]!,u[2]!*v[0]!-u[0]!*v[2]!,u[0]!*v[1]!-u[1]!*v[0]!)<1e-8)degenerate++;
      volume+=a[0]!*(b[1]!*c[2]!-b[2]!*c[1]!)+a[1]!*(b[2]!*c[0]!-b[0]!*c[2]!)+a[2]!*(b[0]!*c[1]!-b[1]!*c[0]!);
      if(candidate.startsWith('canyon')&&!(Math.max(a[0]!,b[0]!,c[0]!)<=-44||Math.min(a[0]!,b[0]!,c[0]!)>=44||Math.min(a[1]!,b[1]!,c[1]!)>=24))passageOverlaps++;
      for(let j=0;j<3;j++){
        const from=ids[j]!,to=ids[(j+1)%3]!,key=`${Math.min(from,to)},${Math.max(from,to)}`,e=edges.get(key)??{count:0,winding:0};
        e.count++;e.winding+=from<to?1:-1;edges.set(key,e);parent[find(from)]=find(to);
      }
    }
    expect([...edges.values()].every(e=>e.count===2&&e.winding===0)).toBe(true);
    expect(new Set(parent.map((_,i)=>find(i))).size).toBe(components);expect(volume).toBeGreaterThan(0);expect(degenerate).toBe(0);expect(passageOverlaps).toBe(0);
    original.dispose();refined.dispose();
  });

  it('records actual nonplanar displacement, original color correspondence and non-shrinking blade contact rays',async()=>{
    const decoder=new TextDecoder();
    for(const name of ['canyon-arch-dusk-v1','wind-blade-dusk-v1']){
      const receipt=JSON.parse(decoder.decode(await bytes(`../../assets/source/salt-dusk/stone-refinement-v1/${name}-receipt.json`)));
      expect(receipt.movedVertices).toBeGreaterThan(4000);expect(receipt.maxDisplacementMetres).toBeGreaterThan(.6);expect(receipt.maxDisplacementMetres).toBeLessThan(.93);
      expect(receipt.sourceColorMaxInterpolationError).toBeLessThan(1e-6);
      if(name.startsWith('wind')){expect(receipt.contactProfile.rays).toBeGreaterThan(1300);expect(receipt.contactProfile.largestInwardMetres).toBeLessThan(.01);}
    }
  });
});
