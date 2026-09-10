import { createCourseGulfUniforms, type CourseGulfUniforms } from '../terrain/CourseGulfTextures';
import { BufferGeometry, Camera, Frustum, Group, InstancedMesh, Matrix4, Mesh, Quaternion, Sphere, SRGBColorSpace, TextureLoader, Vector3, type Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PodraceCourse } from '../../game/race/course';
import { InkstormSurfaceMaterial, loadInkstormPaint } from './InkstormSurfaceMaterial';
import { createInkstormRoad } from './InkstormRoad';
import { createInkstormFoundations } from './InkstormFoundations';
import { createInkstormBridge } from './InkstormBridge';
import { createInkstormFoundry } from './InkstormFoundry';
import { getInkstormFoundryCorridorPlan } from './InkstormFoundryCorridor';
import { createInkstormForkWayfinding } from './InkstormForkWayfinding';
import { createInkstormVista, type VistaLandform } from './InkstormVista';
import { groundInkstormButtress } from './InkstormRockGrounding';
import { InkstormTerrainShadow } from './InkstormTerrainShadow';
import { CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY } from '../post/CelPrepassMaterial';
import { smoothStoneNormals } from '../saltDusk/StoneNormals';
import { createSaltDuskScenery, retainSaltDuskPlacement } from '../saltDusk/SaltDuskScenery';

import { INKSTORM_FAMILIES as families, getInkstormLayout } from '../../game/race/inkstormLayout';
import { INKSTORM_SERVICE_GANTRY, inkstormRenderFamily, type InkstormRenderFamily as Family } from './InkstormGantryAppearance';
const matrix=new Matrix4(), position=new Vector3(), rotation=new Quaternion(), scale=new Vector3(), up=new Vector3(0,1,0);
function disposeMesh(mesh:Mesh):void{
  if(mesh instanceof InstancedMesh)mesh.dispose();
  mesh.geometry.dispose();
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();
}

/** Course-authored placements and shared glTF families; no simulation authority. */
export class InkstormWorld extends Group {
  readonly ready: Promise<void>;
  loaded = false;
  shadowRevision = 0;
  error: string | null = null;
  readonly detailReceipt = { highInstances: 0, lowInstances: 0, instancedTriangles: 0 };
  private course: PodraceCourse | null = null;
  private dead = false;
  private workshopTexture: Texture | null = null;
  private readonly roads:Mesh[]=[];
  private readonly terrainShadow = new InkstormTerrainShadow();
  readonly terrainShadowReceipt = this.terrainShadow.receipt;
  private readonly batches = new Map<Family, InstancedMesh>();
  private readonly distantBatches = new Map<Family, InstancedMesh>();
  private readonly instances: { family:Family; matrix:Matrix4; sphere:Sphere }[]=[];
  private readonly frustum=new Frustum();
  private readonly cameraMatrix=new Matrix4();
  constructor(private readonly heightAt:(x:number,z:number)=>number, private readonly gulfUniforms:CourseGulfUniforms=createCourseGulfUniforms(),
    private readonly pitAnchorHeight?: (id: string) => number | undefined) {
    super(); this.name='Inkstorm authored circuit';
    this.ready=this.load().catch((error:unknown)=>{this.error=String(error);this.dispose();console.error('Inkstorm world assets failed',error);});
  }
  private async load():Promise<void>{
    const loader=new GLTFLoader();
    await loadInkstormPaint();
    if(this.dead)return;
    const modelIds=[...families, INKSTORM_SERVICE_GANTRY, 'canyon-buttress-lod', 'sandstone-scree-lod', 'fractured-spire-lod'];
    // The versioned pit geometry and atlas are a pair: UVs belong to this bake.
    // Wait for all requests so failures/disposal cannot orphan a late texture.
    const [modelResults, textureResult] = await Promise.all([
      Promise.allSettled(modelIds.map(id=>loader.loadAsync(`/assets/inkstorm/${id==='canyon-arch'?'canyon-arch-dusk-v1':id==='wind-blade'?'wind-blade-dusk-v1':id==='pit-complex'?'pit-complex-light-v1':id==='pipe-bank'?'pipe-bank-detail-v1':id}.glb`))),
      new TextureLoader().loadAsync('/assets/inkstorm/pit-complex-light-v1.png')
        .then(texture=>({texture,error:null})).catch((error:unknown)=>({texture:null,error})),
    ]);
    const failedModel=modelResults.find(result=>result.status==='rejected');
    const pitResult=modelResults[modelIds.indexOf('pit-complex')];
    let missingPitUv=false;
    if(pitResult?.status==='fulfilled')pitResult.value.scene.traverse(object=>{
      if(object instanceof Mesh&&!object.geometry.hasAttribute('uv1'))missingPitUv=true;
    });
    if(this.dead || failedModel || !textureResult.texture || missingPitUv){
      textureResult.texture?.dispose();
      for(const result of modelResults)if(result.status==='fulfilled')result.value.scene.traverse(object=>{if(object instanceof Mesh)disposeMesh(object);});
      if(this.dead)return;
      if(missingPitUv)throw new Error('Pit lighting geometry is missing its paired uv1 atlas');
      throw new Error(`Inkstorm workshop asset pair failed: ${String(failedModel?.status==='rejected'?failedModel.reason:textureResult.error)}`);
    }
    this.workshopTexture=textureResult.texture;
    this.workshopTexture.colorSpace=SRGBColorSpace;
    this.workshopTexture.flipY=false;
    const models=modelResults.map(result=>{if(result.status!=='fulfilled')throw result.reason;return result.value;});
    for(let i=0;i<models.length;i++){
      const model=models[i]!;model.scene.updateMatrixWorld(true);
      const geometries:BufferGeometry[]=[];
      model.scene.traverse(object=>{
        if(!(object instanceof Mesh))return;
        const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
        geometry.clearGroups();geometries.push(geometry);
        for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();
        object.geometry.dispose();
      });
      const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();
      if(!geometry)throw new Error(`Could not merge ${modelIds[i]}`);
      geometry.computeBoundingSphere();
      if(this.dead){geometry.dispose();continue;}
      const family=modelIds[i]!.replace('-lod','') as Family;
      if(family==='pit-complex'&&!geometry.hasAttribute('uv1')){
        geometry.dispose();throw new Error('Pit lighting geometry is missing its paired uv1 atlas');
      }
      const distant=modelIds[i]!.endsWith('-lod');
      const stone=i<5||family==='canyon-buttress'||family==='sandstone-scree'||family==='fractured-spire';
      if(stone)smoothStoneNormals(geometry);
      const batch=new InstancedMesh(geometry,new InkstormSurfaceMaterial(stone, family==='pit-complex'||family==='pit-district'?family:null,
        family==='pit-complex'?{texture:this.workshopTexture,decodeRange:4,intensity:4}:null,
        family===INKSTORM_SERVICE_GANTRY),512);
      batch.name=`Inkstorm / ${modelIds[i]}`;batch.count=0;
      batch.userData[CEL_TERRAIN_EDGE_SUPPRESS_USER_DATA_KEY]=true;
      (distant?this.distantBatches:this.batches).set(family,batch);this.add(batch);
    }
    if(this.dead)return;
    this.loaded=true;if(this.course)this.setCourse(this.course);
  }
  setCourse(course:PodraceCourse):void{
    this.course=course;
    for(const road of this.roads){this.remove(road);disposeMesh(road);}this.roads.length=0;
    const roadData=course.getRenderData(1536);this.roads.push(createInkstormRoad(roadData.points,true,false,this.gulfUniforms));
    for(const branch of roadData.branches??[]){
      this.roads.push(createInkstormRoad(branch.points.map(p=>({...p,progress:p.canonicalProgress,tag:'recovery-straight' as const})),false,branch.elevated,this.gulfUniforms));
      if(branch.elevated)this.roads.push(createInkstormBridge(branch,this.heightAt,course));
    }
    this.roads.push(createInkstormFoundations(getInkstormLayout(course), this.heightAt, this.pitAnchorHeight));
    const vistas=createInkstormVista(course, this.heightAt);
    this.roads.push(...vistas);
    this.roads.push(...createSaltDuskScenery(course, this.heightAt));
    const foundry = createInkstormFoundry(course, this.heightAt);
    if (foundry) this.roads.push(foundry);
    const forkGuidance = createInkstormForkWayfinding(course, this.heightAt);
    if (forkGuidance) this.roads.push(forkGuidance);
    this.add(...this.roads);if(!this.loaded)return;
    // Build once when this course revision is ready; asynchronous asset loading
    // may call setCourse again for the same initial course.
    const gulfBounds = this.gulfUniforms.uCourseGulfBounds0.value;
    this.terrainShadow.setCourse(course, this.heightAt, gulfBounds.w >= 2 ? {
      minX: gulfBounds.x, minZ: gulfBounds.y, cellSize: gulfBounds.z, size: gulfBounds.w,
    } : null);
    for(const batch of this.batches.values())batch.count=0;
    this.instances.length=0;
    const placements=[...getInkstormLayout(course)];
    const foundryCorridor = getInkstormFoundryCorridorPlan(course, this.heightAt);
    const groundedFoundryForms = new Map(foundryCorridor.landforms.map(form => [form.id, form]));
    // Decorative forms use the same instancing, LOD and full-placement shadow
    // ownership as other cliffs. Their accepted toes are already grounded.
    placements.push(...foundryCorridor.landforms);
    const fixedRockCrowns=new Map<string,number>();
    const citadel=vistas.find(mesh=>mesh.userData.inkstormVistaLaunch);
    if(citadel){
      // The broad physical landscape drops beneath the settlement. Scenery
      // cliff cores now reach the short metal terraces instead of leaving tall
      // rectangular foundations exposed over the basin. Their entire X/Z box
      // fits inside the cleared citadel disk, including the lower front buttress.
      const supports=citadel.userData.inkstormVistaRockSupports as readonly {x:number;z:number;top:number;yaw:number;sx:number;sz:number}[];
      for(const [i,support] of supports.entries()){
        const id=`citadel-rock-${i}`;
        const sy=Math.max(.4,(support.top-this.heightAt(support.x,support.z)+1.5)/120);
        placements.push({id,family:'canyon-buttress',progress:0,
          x:support.x,z:support.z,yaw:support.yaw,sx:support.sx,sy,sz:support.sz});
        fixedRockCrowns.set(id,support.top);
      }
      for(const form of citadel.userData.inkstormVistaLandforms as readonly VistaLandform[]){
        // Retain the founded settlement rock. Isolated decorative skyline
        // repeats are replaced by continuous distant range surfaces.
        if(!form.settlement)continue;
        placements.push({id:form.id,family:form.family,progress:0,x:form.x,z:form.z,
          yaw:form.yaw,sx:form.sx,sy:form.sy,sz:form.sz});
        // Vista's five-metre deck keeps its original world height. Always use
        // authored sy here; the buried render scale must not lift the outpost.
        if(form.settlement)fixedRockCrowns.set(form.id,this.heightAt(form.x,form.z)+121*form.sy-2.5);
      }
    }
    for(const p of placements){
      if(!retainSaltDuskPlacement(p,course))continue;
      const renderFamily=inkstormRenderFamily(p);
      const batch=this.batches.get(renderFamily)!;if(batch.count>=512)continue;
      // District crew stand on the founded service apron; sinking this family
      // like a rock would bury every person beneath its platform.
      // Only the three new launch spires use the matching full-volume scan
      // grounding. Keep all other existing spire transforms unchanged.
      const needsGrounding=p.family==='canyon-buttress'
        ||(p.family==='fractured-spire'&&p.id.startsWith('launch-composition-'));
      const grounded=groundedFoundryForms.get(p.id)
        ??(needsGrounding?groundInkstormButtress(p,this.heightAt,fixedRockCrowns.get(p.id)):null);
      // The pit slab starts at local Y=0. Seat it 5 cm into the foundation
      // top (+1.5); the former -1.5 transform buried the pad and repair gear.
      const anchor = (p.family === 'pit-complex' || p.family === 'pit-district') ? this.pitAnchorHeight?.(p.id) : undefined;
      position.set(p.x,grounded?.baseY??(anchor??this.heightAt(p.x,p.z))+(p.family==='pit-district'?1.55:p.family==='pit-complex'?1.45:-1.5),p.z);
      rotation.setFromAxisAngle(up,p.yaw);scale.set(p.sx,grounded?.scaleY??p.sy,p.sz);
      matrix.compose(position,rotation,scale);batch.setMatrixAt(batch.count++,matrix);
      this.instances.push({family:renderFamily,matrix:matrix.clone(),sphere:batch.geometry.boundingSphere!.clone().applyMatrix4(matrix)});
    }
    for(const batch of this.batches.values()){batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();}
    // Both LODs cover the same authored placements; only their per-frame counts differ.
    for(const [family,batch] of this.distantBatches){batch.count=0;batch.boundingSphere=this.batches.get(family)!.boundingSphere!.clone();}
    this.shadowRevision++;
  }
  /** Independent full-placement buffers; casting is never culled by the racing camera. */
  createShadowCasters():Group{
    const group=new Group();
    const terrainCaster = this.terrainShadow.createCaster();
    if (terrainCaster) group.add(terrainCaster);
    for(const [family,source] of this.batches){
      const items=this.instances.filter(item=>item.family===family);
      if(!items.length)continue;
      const mesh=new InstancedMesh(source.geometry,source.material,items.length);
      items.forEach((item,index)=>mesh.setMatrixAt(index,item.matrix));
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
    }
    for(const source of this.roads){
      // The ground ribbons use shader displacement. Only real structural
      // meshes cast here; terrain's own directional normal shading is separate.
      if(source.name==='Compacted road and worn racing grooves'||source.name==='Directional cliff and machinery shadows')continue;
      const clone=source.clone();clone.geometry=source.geometry;clone.material=source.material;
      group.add(clone);
    }
    return group;
  }
  setSunShadowsEnabled(enabled:boolean):void{
    for(const mesh of this.roads)if(mesh.name==='Directional cliff and machinery shadows')mesh.visible=!enabled;
  }
  update(camera:Camera):void{
    if(!this.loaded)return;
    camera.updateMatrixWorld();
    this.frustum.setFromProjectionMatrix(this.cameraMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    for(const batch of this.batches.values())batch.count=0;
    for(const batch of this.distantBatches.values())batch.count=0;
    for(const item of this.instances){
      if(!this.frustum.intersectsSphere(item.sphere))continue;
      const distance=camera.position.distanceTo(item.sphere.center);
      if(item.family==='sandstone-scree'&&distance>650)continue;
      // A kilometre-distant cliff can still fill a quarter of the racing view.
      // Keep its measured fractures until its projected diameter falls below
      // about 15% of screen height; tiny ground scatter uses the cheaper cutoff.
      const projectedDetailDistance=item.sphere.radius*Math.abs(camera.projectionMatrix.elements[5]!)/.15;
      const detailDistance=item.family==='sandstone-scree'?100:Math.max(240,projectedDetailDistance);
      const useDistant=distance>detailDistance;
      const batch=(useDistant?this.distantBatches.get(item.family):null)??this.batches.get(item.family)!;
      batch.setMatrixAt(batch.count++,item.matrix);
    }
    this.detailReceipt.highInstances=0;this.detailReceipt.lowInstances=0;this.detailReceipt.instancedTriangles=0;
    for(const batch of this.batches.values()){
      batch.instanceMatrix.needsUpdate=true;this.detailReceipt.highInstances+=batch.count;
      this.detailReceipt.instancedTriangles+=batch.count*(batch.geometry.index?.count??batch.geometry.getAttribute('position').count)/3;
    }
    for(const batch of this.distantBatches.values()){
      batch.instanceMatrix.needsUpdate=true;this.detailReceipt.lowInstances+=batch.count;
      this.detailReceipt.instancedTriangles+=batch.count*(batch.geometry.index?.count??batch.geometry.getAttribute('position').count)/3;
    }
  }
  dispose():void{this.dead=true;this.terrainShadow.dispose();for(const road of this.roads)disposeMesh(road);this.roads.length=0;for(const batch of [...this.batches.values(),...this.distantBatches.values()])disposeMesh(batch);this.batches.clear();this.distantBatches.clear();this.workshopTexture?.dispose();this.workshopTexture=null;this.clear();}
}
