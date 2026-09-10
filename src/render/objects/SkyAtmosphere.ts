import { BackSide, Group, Mesh, ShaderMaterial, SphereGeometry, Vector3, type Camera } from 'three';
import type { DesertRegionProfile } from '../../game/race/regions';
import type { DesertRegionId } from '../../game/race/types';
import { acquireDuskSkyAssets, duskSkyUniforms } from '../sky/DuskSkyAssets';
import { DUSK_SKY_FRAGMENT, DUSK_SKY_VERTEX } from '../sky/DuskSkyShader';

/** Keep the approved photographic sky above the restored Production renderer.
 * Sky resources and grading are isolated from surface lighting and materials. */
export class SkyAtmosphere extends Group {
  readonly ready: Promise<void>;
  private readonly assets=acquireDuskSkyAssets();
  private disposed=false;
  private readonly material=new ShaderMaterial({
    name:'Salt flats photographic dusk sky', side:BackSide,depthWrite:false,depthTest:false,toneMapped:false,
    uniforms:duskSkyUniforms(),
    vertexShader:DUSK_SKY_VERTEX,
    fragmentShader:DUSK_SKY_FRAGMENT,
  });
  private readonly dome=new Mesh(new SphereGeometry(14000,48,24),this.material);
  constructor(_region: DesertRegionId='sunscar-dunes') {
    super();this.name='SkyAtmosphere';this.renderOrder=-100;
    this.dome.frustumCulled=false;this.dome.renderOrder=-100;this.add(this.dome);
    this.ready=this.assets.ready;
  }
  /** A single time of day keeps all connected race regions coherent. */
  setRegion(_region: DesertRegionId|DesertRegionProfile): void {}
  update(_time:number,camera:Camera):void {this.position.copy(camera.position);}
  dispose():void {
    if(this.disposed)return;
    this.disposed=true;
    this.assets.release();this.dome.geometry.dispose();this.material.dispose();this.clear();
  }
}
/** Existing Production surface/shadow consumers retain their original light. */
export const PRIMARY_SUN_DIRECTION=new Vector3(-0.42,0.76,-0.5).normalize();
