import { BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GhostPose } from '../../game/mastery';
import type { GalacticVehicleClass } from '../../game/galactic/types';
import { GALACTIC_VEHICLE_ORDER } from '../../game/galactic/catalog';
import { PodracerView } from '../objects/PodracerView';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../materials/InvertedHullOutline';

/** Non-colliding personal-best replay; one owned draw surface per active class. */
export class InkstormGhostView extends Group {
  private readonly material = new MeshBasicMaterial({color:'#88fff0',transparent:true,opacity:.3,depthWrite:false});
  private readonly geometries = new Map<GalacticVehicleClass,BufferGeometry>();
  private readonly body:Mesh;

  constructor(){
    super();this.name='Personal best ghost';
    const sourceMaterial=new MeshBasicMaterial();
    const source=new PodracerView({shell:sourceMaterial,secondary:sourceMaterial,metal:sourceMaterial,ink:sourceMaterial,canopy:sourceMaterial,accent:sourceMaterial},0);
    try {
      // A ghost has no opaque MRT registration. Bake its actual reduced body
      // instead of selecting the normal racer's unbuilt silhouette proxy.
      source.setLodMode('simplified');
      for(const vehicleClass of GALACTIC_VEHICLE_ORDER){
        source.setVehicleClass(vehicleClass);source.updateMatrixWorld(true);
        const pieces:BufferGeometry[]=[];
        source.traverseVisible(object=>{
          if(!(object instanceof Mesh)||object.material!==sourceMaterial)return;
          const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
          for(const name of Object.keys(geometry.attributes))if(name!=='position')geometry.deleteAttribute(name);
          geometry.clearGroups();geometry.applyMatrix4(object.matrixWorld);pieces.push(geometry);
        });
        const geometry=mergeGeometries(pieces,false);
        for(const piece of pieces)piece.dispose();
        if(!geometry)throw new Error(`Unable to build ${vehicleClass} ghost`);
        geometry.computeBoundingSphere();this.geometries.set(vehicleClass,geometry);
      }
    } finally {source.dispose();}
    this.body=new Mesh(this.geometries.get('podracer')!,this.material);
    this.body.name='Translucent personal-best vehicle';
    this.body.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]=true;
    this.add(this.body);this.visible=false;
  }

  setVehicleClass(value:GalacticVehicleClass):void{this.body.geometry=this.geometries.get(value)!;}
  setPose(pose:GhostPose|null):void{this.visible=!!pose;if(!pose)return;this.position.set(pose.x,pose.y,pose.z);this.rotation.set(pose.pitch,pose.yaw,pose.roll+pose.bank,'YXZ');}
  dispose():void{for(const geometry of this.geometries.values())geometry.dispose();this.geometries.clear();this.material.dispose();this.clear();}
}
