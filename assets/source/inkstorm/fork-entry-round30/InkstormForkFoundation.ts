import {BufferAttribute,BufferGeometry,Color,Vector3} from 'three';
import type {CourseRenderBranch} from '../../../../src/game/race/types';
import type {PodraceCourse} from '../../../../src/game/race/course';
import {inkstormRoadCrossSection} from '../../../../src/render/inkstorm/InkstormRoad';
import {sampleBridgeSurface} from '../../../../src/game/race/bridgeSurface';
import {FORK_ISLAND_CONTACTS} from './ForkIslandContacts';

type Point=readonly[number,number,number];
type HeightAt=(x:number,z:number)=>number;
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

/** Render-only closed support beneath the unchanged elevated physics deck. */
export function createInkstormForkFoundation(branch:CourseRenderBranch,heightAt:HeightAt,course:PodraceCourse):BufferGeometry|null{
 if(course.seed!==0x494e4b53||branch.id!=='branch-1-shortcut')return null;
 const positions:number[]=[],colors:number[]=[],kinds:number[]=[];
 const palette=['#8e654b','#aa7953','#795640','#93694d'].map(c=>new Color(c));
 const a=new Vector3(),b=new Vector3(),c=new Vector3();
 const triangle=(p:Point,q:Point,r:Point,color:Color,kind:number)=>{
  p=safePoint(p);q=safePoint(q);r=safePoint(r);
  a.fromArray(p);b.fromArray(q).sub(a);c.fromArray(r).sub(a);if(b.cross(c).lengthSq()<1e-12)return;
  for(const v of (kind===1?[p,r,q]:[p,q,r])){positions.push(...v);colors.push(color.r,color.g,color.b);kinds.push(kind);}
 };
 const quad=(p:Point,q:Point,r:Point,s:Point,color:Color,kind:number)=>{triangle(p,q,r,color,kind);triangle(p,r,s,color,kind);};
 const roadRows=branch.points.map((p,i)=>({...p,...inkstormRoadCrossSection(branch.points,i,false)}));
 const canonical=course.getRenderData(1536).points;
 const clearance=(x:number,z:number)=>{let value=Infinity;for(let i=0;i<canonical.length;i++){const p=canonical[i]!,q=canonical[(i+1)%canonical.length]!,dx=q.x-p.x,dz=q.z-p.z,t=Math.max(0,Math.min(1,((x-p.x)*dx+(z-p.z)*dz)/Math.max(1e-8,dx*dx+dz*dz)));value=Math.min(value,Math.hypot(x-p.x-dx*t,z-p.z-dz*t)-Math.max(p.width,q.width));}return value;};
 // Added stone stays below the exact road physics, including the finite end
 // planes. Quantize X/Z first because world coordinates are ultimately Float32.
 // At the shared entry/exit the stone settles under terrain; it never forms a
 // new obstacle on the canonical racing lane.
 const ceilings=new Map<string,number>();
 const safePoint=(p:Point):Point=>{
  const x=Math.fround(p[0]),z=Math.fround(p[2]),key=x+','+z;
  let ceiling=ceilings.get(key);
  if(ceiling===undefined){
   const deck=sampleBridgeSurface(course.branches,x,z);ceiling=deck?deck.height-.45:Infinity;
   if(clearance(x,z)<1)ceiling=Math.min(ceiling,heightAt(x,z)-.35);
   ceilings.set(key,ceiling);
  }
  return [x,Math.fround(Math.min(p[1],ceiling)),z];
 };
 const rings:Point[][]=[],footPoints:Point[]=[];
 for(let index=0;index<roadRows.length-1;index++){
  const p=roadRows[index]!,q=roadRows[index+1]!,steps=Math.max(1,Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/4));
  for(let step=0;step<steps+(index===roadRows.length-2?1:0);step++){
   const t=step/steps,x=p.x+(q.x-p.x)*t,y=p.y+(q.y-p.y)*t,z=p.z+(q.z-p.z)*t,width=p.width+(q.width-p.width)*t;
   // Interpolate the actual road-row boundaries instead of inventing a new
   // tangent. This retains the deck's miter and finite entry/exit planes.
   const edges=[-1,1].map(side=>({x:p.x+p.rightX*p.width*side+(q.x+q.rightX*q.width*side-p.x-p.rightX*p.width*side)*t,z:p.z+p.rightZ*p.width*side+(q.z+q.rightZ*q.width*side-p.z-p.rightZ*p.width*side)*t}));
   const rightX=(edges[1]!.x-edges[0]!.x)/(2*width),rightZ=(edges[1]!.z-edges[0]!.z)/(2*width);
   const at=(side:number,extra:number,height:number):Point=>[x+rightX*(side*width+extra),height,z+rightZ*(side*width+extra)];
   const ground=edges.map(e=>heightAt(e.x,e.z));
   const cap=y-.22;
   // Flared toes are buried; where routes overlap, all visible material stays
   // within the existing bridge footprint and below its legal surface.
   const flares=edges.map(e=>smooth(4,12,clearance(e.x,e.z))*2.2);
   const ring:Point[]=[at(-1,.10,cap),at(1,-.10,cap)];
   for(const side of [1,-1]){
    const k=side===1?1:0,edge=edges[k]!,flare=flares[k]!,footX=edge.x+rightX*side*flare,footZ=edge.z+rightZ*side*flare;
    let bottom=Math.min(heightAt(footX,footZ),ground[k]!)-1.25;
    // Preserve a closed, buried foundation even on a bank which rises over
    // the deck edge. No new top surface may rise above the original deck.
    bottom=Math.min(bottom,cap-.10);
    const height=cap-bottom;
    const band=(fraction:number,extra:number):Point=>at(side,side*extra,Math.min(cap-.04,bottom+height*fraction));
    if(side===1)ring.push(band(.78,flare*.12),band(.38,flare*.62),at(side,side*flare,bottom));
    else ring.push(at(side,side*flare,bottom),band(.38,flare*.62),band(.78,flare*.12));
   }
   rings.push(ring);footPoints.push(safePoint(ring[4]!),safePoint(ring[5]!));
  }
 }
 // Ring order is clockwise when viewed along the branch: outward normals.
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<rings[i]!.length;j++){
  const k=(j+1)%rings[i]!.length;quad(rings[i]![j]!,rings[i+1]![j]!,rings[i+1]![k]!,rings[i]![k]!,palette[j%palette.length]!,0);
 }
 for(const [index,reverse]of [[0,false],[rings.length-1,true]]as const){const ring=rings[index]!;for(let i=1;i<ring.length-1;i++)reverse?triangle(ring[0]!,ring[i+1]!,ring[i]!,palette[0]!,0):triangle(ring[0]!,ring[i]!,ring[i+1]!,palette[0]!,0);}

 // A closed rock buttress connects the causeway flank to measured triangles
 // of the existing island scan. Ends settle into true terrain. These contacts
 // are authored for the flagship seed and pinned to its source GLB hash.
 const matches=FORK_ISLAND_CONTACTS.every(contact=>{
  const i=Math.floor(contact.row),t=contact.row-i,p=roadRows[i]!,q=roadRows[i+1]!;
  return Math.hypot(p.x+(q.x-p.x)*t-contact.center[0],p.z+(q.z-p.z)*t-contact.center[1])<.01
   &&Math.abs(p.y+(q.y-p.y)*t-.45-contact.start[1])<.01;
 });
 if(matches){
  const top:Point[][]=[],bottom:Point[][]=[];const across=12;
  for(let row=0;row<FORK_ISLAND_CONTACTS.length;row++){
   const contact=FORK_ISLAND_CONTACTS[row]!,blend=smooth(0,2,row)*(1-smooth(FORK_ISLAND_CONTACTS.length-3,FORK_ISLAND_CONTACTS.length-1,row));
   top[row]=[];bottom[row]=[];
   for(let j=0;j<=across;j++){
    const t=j/across,x=contact.start[0]+(contact.inside[0]-contact.start[0])*t,z=contact.start[2]+(contact.inside[2]-contact.start[2])*t,g=heightAt(x,z);
    // The diagonal spur has a shallow saddle, visible depth and a planted toe;
    // it is not a vertical backdrop or a road painted over empty space.
    const maxTop=contact.start[1],rise=Math.max(0,maxTop-g),saddle=Math.sin(t*Math.PI)*Math.min(4.5,rise*.35);
    const h=Math.min(maxTop,g+(rise-saddle)*blend);
    top[row]![j]=[x,h,z];bottom[row]![j]=[x,Math.min(g-1.25,h-.1),z];
   }
  }
  for(let row=0;row<top.length-1;row++)for(let j=0;j<across;j++){
   quad(top[row]![j]!,top[row+1]![j]!,top[row+1]![j+1]!,top[row]![j+1]!,palette[0]!,1);
   quad(bottom[row]![j+1]!,bottom[row+1]![j+1]!,bottom[row+1]![j]!,bottom[row]![j]!,palette[2]!,1);
  }
  for(let row=0;row<top.length-1;row++)for(const j of [0,across]){
   if(j===0)quad(bottom[row]![j]!,bottom[row+1]![j]!,top[row+1]![j]!,top[row]![j]!,palette[0]!,1);
   else quad(top[row]![j]!,top[row+1]![j]!,bottom[row+1]![j]!,bottom[row]![j]!,palette[0]!,1);
  }
  for(const row of [0,top.length-1])for(let j=0;j<across;j++){
   if(row===0)quad(bottom[row]![j+1]!,bottom[row]![j]!,top[row]![j]!,top[row]![j+1]!,palette[0]!,1);
   else quad(bottom[row]![j]!,bottom[row]![j+1]!,top[row]![j+1]!,top[row]![j]!,palette[0]!,1);
  }
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));geometry.setAttribute('color',new BufferAttribute(new Float32Array(colors),3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData={scope:'view-only flagship fork support',triangleKinds:kinds.filter((_,i)=>i%3===0),footPoints,islandConnected:matches,sourceContacts:FORK_ISLAND_CONTACTS.length};return geometry;
}
