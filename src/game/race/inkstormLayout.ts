import type { PodraceCourse } from './course';
import type { CourseObstacleContact } from './types';
import { getLaunchBasinAnchor } from './CourseGulfField';
export const INKSTORM_FAMILIES = ['cliff-strata','wind-blade','mesa-crown','roadside-shard','canyon-arch','foundry-gantry','refinery-stack','pit-complex','pipe-bank','finish-tower','canyon-buttress','sandstone-scree','fractured-spire','pit-district'] as const;
export type InkstormFamily = typeof INKSTORM_FAMILIES[number];
export interface InkstormPlacement { id:string;family:InkstormFamily;progress:number;x:number;z:number;yaw:number;sx:number;sy:number;sz:number; }
const rnd=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const layoutCache=new WeakMap<PodraceCourse,readonly InkstormPlacement[]>();
/** One authoritative placement list serves rendering and obstacle collision. */
export function getInkstormLayout(course:PodraceCourse):readonly InkstormPlacement[]{
  const cached=layoutCache.get(course);if(cached)return cached;
  const placements:InkstormPlacement[]=[];
    const route = course.getRenderData(512);
    const routePoints = [...route.points, ...(route.branches ?? []).flatMap(branch => branch.points)];
    const place=(family:InkstormFamily,progress:number,lateral:number,sx=1,sy=sx,sz=sx,yawOffset=0)=>{
      const p=course.sampleAtProgress(progress),x=p.x+p.rightX*lateral,z=p.z+p.rightZ*lateral;
      // Adjacent switchbacks and playable fork routes always win over decoration.
      const projection=course.projectPoint(x,z);
      const radius=family==='mesa-crown'?58*sx:family==='cliff-strata'?35*sx:(family==='canyon-buttress'||family==='fractured-spire')?40*sx:family==='sandstone-scree'?17.5*sx:family==='wind-blade'?18*sx:family==='roadside-shard'?5*sx:family==='refinery-stack'?12*sx:0;
      if(radius && projection.distanceToCenter<projection.width+radius+5)return;
      const yaw=Math.atan2(p.tangentX,p.tangentZ)+yawOffset;
      const footprints:Partial<Record<InkstormFamily,[number,number]>>={'cliff-strata':[35,22],'canyon-buttress':[40,50],'fractured-spire':[40,50],'pit-complex':[75,31],'pit-district':[60,18],'pipe-bank':[47,22],'finish-tower':[17,12]};
      const footprint=footprints[family];
      if(footprint && routePoints.some(point=>{
        const dx=point.x-x,dz=point.z-z,cos=Math.cos(yaw),sin=Math.sin(yaw);
        return Math.hypot((dx*cos-dz*sin)/(footprint[0]*sx+point.width+7),(dx*sin+dz*cos)/(footprint[1]*sz+point.width+7))<1;
      }))return;
      if(family==='pit-district' && footprint){
        // District modules must fit actual gaps, including expedition seeds with
        // shorter opening straights. Never intersect an existing hangar shell.
        const axes=(angle:number)=>[[Math.cos(angle),-Math.sin(angle)],[Math.sin(angle),Math.cos(angle)]] as const;
        const extent=(axis:readonly number[],angle:number,halfX:number,halfZ:number)=>
          Math.abs(axis[0]!*Math.cos(angle)-axis[1]!*Math.sin(angle))*halfX
          +Math.abs(axis[0]!*Math.sin(angle)+axis[1]!*Math.cos(angle))*halfZ;
        if(placements.some(other=>{
          if(other.family!=='pit-complex'&&other.family!=='pit-district')return false;
          const otherFootprint=footprints[other.family]!;
          return ![...axes(yaw),...axes(other.yaw)].some(axis=>
            Math.abs((other.x-x)*axis[0]+(other.z-z)*axis[1])
              -extent(axis,yaw,footprint[0]*sx,footprint[1]*sz)
              -extent(axis,other.yaw,otherFootprint[0]*other.sx,otherFootprint[1]*other.sz)>=2);
        }))return;
      }
      placements.push({id:`inkstorm-${family}-${placements.length}`,family,progress,x,z,yaw,sx,sy,sz});
    };
    // Place in distance units so density remains consistent across event courses.
    for(let d=0,i=0;d<course.totalLength;d+=38,i++){
      const progress=d/course.totalLength,p=course.sampleAtProgress(progress),r=rnd(i+course.seed!);
      for(const side of [-1,1]){
        if(p.tag==='narrow-canyon'){
          if(i%3===0)place('canyon-buttress',progress,side*(p.width+67+r*12),1.25+r*.25,.8+r*.6,1.6,side*(.03+r*.12));
          if(i%6===0)place('sandstone-scree',progress,side*(p.width+30),1.05,.8+r*.5,1.2,side*.11);
        }
        // Keep the cliff on the inside of the bend. The outer shoulder opens
        // onto the gulf instead of being sealed by the former wall of columns.
        else if(p.tag==='hairpin'&&side===(p.curvature>0?1:-1)&&i%4===0)place('canyon-buttress',progress,side*(p.width+77),1.35,.95+r*.55,1.5,side*.18);
        else if(i%8===0)place('canyon-buttress',progress,side*(p.width+150+r*190),.58+r*.35,.8+r*1.15,.8+r*.7,side*(.3+r*.6));
        // Broad layered escarpments remain the dominant distant landform.
        // Isolated split spires are selected below, without mirrored pairs.
        if(i%13===0)place('canyon-buttress',progress,side*(p.width+540+r*260),2.2+r*2.2,.9+r*1.5,2.1+r*1.8,side*(.4+r*.5));
        if(i%19===0)place('canyon-buttress',progress,side*(p.width+980+r*340),4.5+r*3,1.6+r*1.4,3.1+r*2,side*.75);
        if(i%4===0)place('roadside-shard',progress,side*(p.width+13+r*9),.5+r*.6,.6+r*.5,.8,side*r);
        if(p.tag==='chicane'&&i%4===0)place('refinery-stack',progress,side*(p.width+42+r*12),.9,1+r*.45,1);
      }
    }
    // Three editorial landmark beats: starting grid, canyon arch, industrial reveal.
    place('foundry-gantry',.012,0,1,1,1);
    for(const [progress,side] of [[.993,-1],[.024,-1],[.006,1]] as const){
      const p=course.sampleAtProgress(progress);place('pit-complex',progress,side*(p.width+52),1,1,1,-side*Math.PI/2);
    }
    // Layered service district fills the staggered gaps between the original
    // hangars. Frontage varies, while every module faces the racing corridor.
    for(const [progress,side,frontage] of [[.0085,-1,.72],[.026,1,1],[.044,1,1],[.048,-1,1]] as const){
      const p=course.sampleAtProgress(progress);place('pit-district',progress,side*(p.width+48),frontage,1,1,-side*Math.PI/2);
    }
    for(const progress of [.979,.008]){const p=course.sampleAtProgress(progress);place('finish-tower',progress,p.width+31,1,1,1,Math.PI);}
    const canyon=course.getRenderData(256).points.filter(p=>p.tag==='narrow-canyon');
    if(canyon.length){place('canyon-arch',canyon[Math.floor(canyon.length*.36)]!.progress,0,1.05,1.08,1.5);place('canyon-arch',canyon[Math.floor(canyon.length*.82)]!.progress,0,1.15,1.2,1.5);}
    const industrial=course.getRenderData(256).points.find(p=>p.tag==='chicane');
    if(industrial)place('foundry-gantry',industrial.progress+.013,0,.78,1.05,1);
    const industrialPoints=route.points.filter(p=>p.tag==='chicane');
    for(let i=0;i<industrialPoints.length;i+=6){
      const p=industrialPoints[i]!;
      for(const side of [-1,1])place('pipe-bank',p.progress,side*(p.width+52),1,1.15+rnd(i)*.7,1,-side*Math.PI/2);
    }
    // A visible race landmark closes the return hairpin before the home straight.
    const returnBend=route.points.filter(p=>p.tag==='hairpin');
    if(returnBend.length){const p=returnBend[Math.floor(returnBend.length*.53)]!;place('finish-tower',p.progress,p.width+35,1,1.3,1,Math.PI);}
    mixOpenGeology(course, placements);
    composeSaltRun(course, placements);
    composeLaunchGeology(course, placements);
    composeCanyonEntrance(course, placements);
    placements.push(...getInkstormForkDividers(course));
  layoutCache.set(course,placements);return placements;
}

/** Unequal near shoulders expose the flagship arch without moving the racing corridor. */
function composeCanyonEntrance(course: PodraceCourse, placements: InkstormPlacement[]): void {
  if (course.seed !== 0x494e4b53) return;
  const progress = .44729237368968017;
  const route = course.sampleAtProgress(progress);
  for (const rock of placements) {
    if (rock.family !== 'canyon-buttress' || Math.abs(rock.progress - progress) > 1e-12) continue;
    // Resolve authored location and course side; generated numeric IDs depend
    // on earlier placements and must not select these two composition anchors.
    const lateral = (rock.x - route.x) * route.rightX + (rock.z - route.z) * route.rightZ;
    if (lateral === 0) continue;
    const left = lateral < 0, offset = left ? -12 : 18;
    rock.id = `inkstorm-canyon-near-${left ? 'left' : 'right'}-buttress`;
    rock.x += route.rightX * offset;
    rock.z += route.rightZ * offset;
    rock.sx = left ? .92 : 1;
    rock.sy = left ? .72 : .82;
    rock.sz = left ? .95 : 1;
  }
}

/** A flagship salt-valley sequence with a clear road opening and unequal depth. */
export function getInkstormSaltFrames(course: PodraceCourse): readonly InkstormPlacement[] {
  if (course.seed !== 0x494e4b53) return [];
  const route = course.getRenderData(2048);
  const corridors = [route.points, ...course.branches.map(branch => branch.points)];
  const forms = [
    [680, 175, 'canyon-buttress', 1.65, 1.5, 1.7, .48],
    [810, -195, 'wind-blade', 2.5, 1.15, 2.0, -.65],
    [970, 235, 'canyon-buttress', 1.35, .85, 1.6, .72],
    [1110, -265, 'wind-blade', 1.3, .95, 1.6, -.44],
    [1260, 355, 'fractured-spire', 1.4, 1.15, 1.1, .34],
  ] as const;
  const frames: InkstormPlacement[] = [];
  for (const [distance, lateral, family, sx, sy, sz, turn] of forms) {
    const sample = course.sampleAtDistance(distance);
    const x = sample.x + sample.rightX * lateral, z = sample.z + sample.rightZ * lateral;
    const radius = family === 'wind-blade' ? Math.hypot(18 * sx, 8 * sz) : Math.hypot(40 * sx, 50 * sz);
    let clear = true;
    for (const corridor of corridors) for (let i = 1; i < corridor.length; i++) {
      const a = corridor[i - 1]!, b = corridor[i]!;
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / Math.max(1e-8, dx * dx + dz * dz)));
      if (Math.hypot(x - a.x - dx * t, z - a.z - dz * t) < radius + Math.max(a.width, b.width) + 10) clear = false;
    }
    if (clear) frames.push({ id: `inkstorm-salt-frame-${frames.length}`, family, progress: sample.progress,
      x, z, yaw: Math.atan2(sample.tangentX, sample.tangentZ) + turn, sx, sy, sz });
  }
  return frames;
}

function composeSaltRun(course: PodraceCourse, placements: InkstormPlacement[]): void {
  if (course.seed !== 0x494e4b53) return;
  const anchor = course.sampleAtDistance(course.totalLength * .0859375);
  // Several distant loop placements formerly overlapped this same near view.
  // Replace that bounded cluster instead of layering a second random avenue.
  for (let i = placements.length - 1; i >= 0; i--) {
    const p = placements[i]!;
    if (p.family !== 'canyon-buttress' && p.family !== 'fractured-spire') continue;
    const dx = p.x - anchor.x, dz = p.z - anchor.z;
    const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
    const lateral = dx * anchor.rightX + dz * anchor.rightZ;
    if (forward > -100 && forward < 700 && Math.abs(lateral) < 390) placements.splice(i, 1);
  }
  placements.push(...getInkstormSaltFrames(course));
}

/**
 * The authored basin owns its geology in world space. Distant rocks generated
 * from other parts of the loop used to appear between these same ridge faces.
 * Remove only non-colliding broad/spire scenery; road obstacles and the actual
 * fork island retain the shared rendering/collision placement contract.
 */
function composeLaunchGeology(course: PodraceCourse, placements: InkstormPlacement[]): void {
  const anchor = getLaunchBasinAnchor(course);
  if (!anchor) return;
  for (let i = placements.length - 1; i >= 0; i--) {
    const p = placements[i]!;
    if (p.id.startsWith('inkstorm-salt-frame-')) continue;
    if (p.family !== 'canyon-buttress' && p.family !== 'fractured-spire') continue;
    const dx = p.x - anchor.x, dz = p.z - anchor.z;
    const forward = dx * anchor.tangentX + dz * anchor.tangentZ;
    const right = -dx * anchor.rightX - dz * anchor.rightZ;
    if (forward > -220 && forward < 1800 && right > -1050 && right < 850) placements.splice(i, 1);
  }
}

/** Keep broad cliffs dominant; fracture accents belong to separated open-ground groups. */
function mixOpenGeology(course: PodraceCourse, placements: InkstormPlacement[]): void {
  const masses = placements.filter(p => p.family === 'canyon-buttress');
  const openTags = new Set(['fast-straight', 'wide-sweeper', 'launch-crest', 'recovery-straight']);
  const candidates = masses.filter(p => {
    if (!openTags.has(course.sampleAtProgress(p.progress).tag)) return false;
    // Keep the large far escarpments and the low roadside masses broad. A spire
    // is a midground accent, not a replacement for the entire canyon skyline.
    const route = course.projectPoint(p.x, p.z);
    return p.sx < 4 && route.distanceToCenter > route.width + 100;
  }).sort((a, b) => rnd(a.x * .017 + a.z * .029 + (course.seed ?? 0))
    - rnd(b.x * .017 + b.z * .029 + (course.seed ?? 0)));
  const count = Math.floor(masses.length * .15);
  if (!count) return;
  const accents: InkstormPlacement[] = [];
  for (const p of candidates) {
    // Unequal spacing and one-sided selection avoid an alternating avenue of
    // matching teeth. Preserve every existing ground footprint and clearance.
    if (accents.some(other => Math.hypot(other.x - p.x, other.z - p.z) < 260)) continue;
    p.family = 'fractured-spire';
    p.id = p.id.replace('canyon-buttress', 'fractured-spire');
    p.sx = Math.min(p.sx, 1.6);
    p.sz = Math.min(p.sz, 1.7);
    p.sy = Math.min(p.sy, 1.55);
    accents.push(p);
    if (accents.length >= count) break;
  }
}

interface CorridorSegment { ax: number; az: number; dx: number; dz: number; lengthSquared: number; width: number; }
const forkDividerCache = new WeakMap<PodraceCourse, readonly InkstormPlacement[]>();

/** Exact separation of a line segment and an axis-aligned rectangle. */
function segmentRectangleDistance(ax: number, az: number, bx: number, bz: number, halfX: number, halfZ: number): number {
  const dx = bx - ax, dz = bz - az, lengthSquared = dx * dx + dz * dz;
  let minimum = Math.min(Math.hypot(Math.max(0, Math.abs(ax) - halfX), Math.max(0, Math.abs(az) - halfZ)),
    Math.hypot(Math.max(0, Math.abs(bx) - halfX), Math.max(0, Math.abs(bz) - halfZ)));
  if (minimum === 0) return 0;
  for (const side of [-1, 1]) {
    const tx = dx === 0 ? -1 : (halfX * side - ax) / dx;
    const tz = dz === 0 ? -1 : (halfZ * side - az) / dz;
    if ((tx >= 0 && tx <= 1 && Math.abs(az + dz * tx) <= halfZ)
      || (tz >= 0 && tz <= 1 && Math.abs(ax + dx * tz) <= halfX)) return 0;
    for (const other of [-1, 1]) {
      const x = halfX * side, z = halfZ * other;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (lengthSquared || 1)));
      minimum = Math.min(minimum, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
  }
  return minimum;
}

/** Rock island between the actual shortcut and main road, never across either lane. */
export function getInkstormForkDividers(course: PodraceCourse): readonly InkstormPlacement[] {
  const cached = forkDividerCache.get(course);
  if (cached) return cached;
  const route = course.getRenderData(2048);
  const lines = [route.points, ...course.branches.map(branch => branch.points)];
  const segments: CorridorSegment[] = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!;
    const count = lineIndex === 0 ? line.length : line.length - 1;
    for (let i = 0; i < count; i++) {
      const a = line[i]!, b = line[(i + 1) % line.length]!;
      const dx = b.x - a.x, dz = b.z - a.z;
      segments.push({ ax: a.x, az: a.z, dx, dz, lengthSquared: dx * dx + dz * dz, width: Math.max(a.width, b.width) });
    }
  }
  const dividers: InkstormPlacement[] = [];
  for (const branch of course.branches.filter(branch => branch.elevated)) {
    for (const [fraction, heightScale] of [[.375, .42], [.50, .80], [.625, 1.08]] as const) {
      const index = Math.round((branch.points.length - 1) * fraction);
      const p = branch.points[index]!, previous = branch.points[index - 1]!, next = branch.points[index + 1]!;
      const canonical = course.sampleAtProgress(p.canonicalProgress);
      const previousMain = course.sampleAtProgress(previous.canonicalProgress), nextMain = course.sampleAtProgress(next.canonicalProgress);
      // Offset toward the narrower bridge lane to use the actual free strip,
      // rather than shrinking the whole rock to the main road's circle radius.
      const gapX = p.x - canonical.x, gapZ = p.z - canonical.z, gap = Math.hypot(gapX, gapZ);
      const shift = (canonical.width - p.width) * .5 / Math.max(1, gap);
      const x = (p.x + canonical.x) * .5 + gapX * shift, z = (p.z + canonical.z) * .5 + gapZ * shift;
      const axisYaw = Math.atan2(next.x + nextMain.x - previous.x - previousMain.x,
        next.z + nextMain.z - previous.z - previousMain.z);
      // Any segment capable of intersecting the largest attempted rectangle
      // lies inside this conservative endpoint/segment-length broad phase.
      const nearby = segments.filter(segment => Math.hypot(segment.ax - x, segment.az - z)
        < 130 + Math.sqrt(segment.lengthSquared) + segment.width + 12);
      let best: { yaw: number; halfX: number; halfZ: number; score: number } | null = null;
      for (const turn of [-.10, 0, .10]) {
        const yaw = axisYaw + turn, cos = Math.cos(yaw), sin = Math.sin(yaw);
        const local = nearby.map(segment => {
          const dx = segment.ax - x, dz = segment.az - z;
          return { ax: dx * cos - dz * sin, az: dx * sin + dz * cos,
            bx: (dx + segment.dx) * cos - (dz + segment.dz) * sin,
            bz: (dx + segment.dx) * sin + (dz + segment.dz) * cos, width: segment.width };
        });
        for (const halfZ of [25, 35, 45, 55, 65, 80, 95]) {
          const fits = (halfX: number) => local.every(segment =>
            segmentRectangleDistance(segment.ax, segment.az, segment.bx, segment.bz, halfX, halfZ) >= segment.width + 12);
          if (!fits(12)) continue;
          let low = 12, high = 48;
          for (let iteration = 0; iteration < 12; iteration++) {
            const halfX = (low + high) * .5;
            if (fits(halfX)) low = halfX; else high = halfX;
          }
          const score = low * halfZ * (1 + halfZ * .003);
          if (!best || score > best.score) best = { yaw, halfX: low, halfZ, score };
        }
      }
      if (!best) continue;
      // 80×120×100m canonical glTF bounds. Three overlapping, lengthwise
      // masses form a low leading shoulder and a taller downstream crown.
      dividers.push({ id: `inkstorm-fork-divider-${branch.id}-${dividers.length}`, family: 'canyon-buttress',
        progress: p.canonicalProgress, x, z, yaw: best.yaw,
        sx: best.halfX / 40, sz: best.halfZ / 50, sy: heightScale });
    }
  }
  forkDividerCache.set(course, dividers);
  return dividers;
}
interface Collider {id:string;x:number;z:number;rx:number;rz:number;yaw:number;height:number;progress:number;box?:boolean;}
const colliderCache=new WeakMap<PodraceCourse,Map<string,Collider[]>>();
function obstacleBuckets(course:PodraceCourse):Map<string,Collider[]>{
  const cached=colliderCache.get(course);if(cached)return cached;
  const buckets=new Map<string,Collider[]>();
  const add=(c:Collider)=>{const radius=(c.box?Math.hypot(c.rx,c.rz):Math.max(c.rx,c.rz))+20;for(let x=Math.floor((c.x-radius)/128);x<=Math.floor((c.x+radius)/128);x++)for(let z=Math.floor((c.z-radius)/128);z<=Math.floor((c.z+radius)/128);z++){const key=`${x}:${z}`;const list=buckets.get(key)??[];list.push(c);buckets.set(key,list);}};
  for(const p of getInkstormLayout(course)){
    const dimensions:Partial<Record<InkstormFamily,[number,number,number]>>={'roadside-shard':[5,3.5,12],'sandstone-scree':[17.5,11,12],'wind-blade':[17,7.5,148],'mesa-crown':[58,45,76],'refinery-stack':[12,12,98],'pit-complex':[75,31,47],'pit-district':[60,18,35],'pipe-bank':[47,22,51],'finish-tower':[17,12,113]};
    const size=dimensions[p.family];
    if(size)add({id:p.id,x:p.x,z:p.z,rx:size[0]*p.sx,rz:size[1]*p.sz,yaw:p.yaw,height:size[2]*p.sy,progress:p.progress});
    if(p.id.startsWith('inkstorm-fork-divider-'))add({id:p.id,x:p.x,z:p.z,rx:40*p.sx,rz:50*p.sz,yaw:p.yaw,height:120*p.sy,progress:p.progress,box:true});
    if(p.family==='foundry-gantry')for(const side of [-1,1])add({id:`${p.id}-${side}`,x:p.x+Math.cos(p.yaw)*46*p.sx*side,z:p.z-Math.sin(p.yaw)*46*p.sx*side,rx:6*p.sx,rz:7*p.sz,yaw:p.yaw,height:50*p.sy,progress:p.progress});
  }
  colliderCache.set(course,buckets);return buckets;
}
/** Bounded spatial lookup; low shrubs and distant decoration never affect driveable route. */
export function getInkstormObstacleContact(course:PodraceCourse,x:number,z:number,radius:number,y:number|undefined,heightAt:(x:number,z:number)=>number):CourseObstacleContact|null{
  const bucket=obstacleBuckets(course).get(`${Math.floor(x/128)}:${Math.floor(z/128)}`);if(!bucket)return null;
  for(const c of bucket){
    if(y!==undefined&&y>heightAt(c.x,c.z)+c.height+2)continue;
    const dx=x-c.x,dz=z-c.z,cos=Math.cos(c.yaw),sin=Math.sin(c.yaw);
    const lx=dx*cos-dz*sin,lz=dx*sin+dz*cos,rx=c.rx+radius,rz=c.rz+radius;
    if(c.box){
      // Full rotated GLB box, matching the envelope used to fit the divider.
      // The old ellipse omitted its corners and could admit a pod into rock.
      const cx=Math.max(-c.rx,Math.min(c.rx,lx)),cz=Math.max(-c.rz,Math.min(c.rz,lz));
      const ox=lx-cx,oz=lz-cz,distance=Math.hypot(ox,oz);
      if(distance>=radius&&distance>0)continue;
      let nx:number,nz:number,penetration:number;
      if(distance>0){nx=ox/distance;nz=oz/distance;penetration=radius-distance;}
      else if(c.rx-Math.abs(lx)<c.rz-Math.abs(lz)){nx=lx<0?-1:1;nz=0;penetration=radius+c.rx-Math.abs(lx);}
      else{nx=0;nz=lz<0?-1:1;penetration=radius+c.rz-Math.abs(lz);}
      return {id:c.id,kind:'scenery',progress:c.progress,penetration,normalX:nx*cos+nz*sin,normalZ:-nx*sin+nz*cos};
    }
    const distance=Math.hypot(lx/rx,lz/rz);if(distance>=1)continue;
    let nx=lx/(rx*rx),nz=lz/(rz*rz);const length=Math.hypot(nx,nz)||1;nx/=length;nz/=length;
    if(Math.abs(nx)+Math.abs(nz)<.001){nx=1;nz=0;}
    return {id:c.id,kind:'scenery',progress:c.progress,penetration:(1-distance)*Math.min(rx,rz),normalX:nx*cos+nz*sin,normalZ:-nx*sin+nz*cos};
  }
  return null;
}
