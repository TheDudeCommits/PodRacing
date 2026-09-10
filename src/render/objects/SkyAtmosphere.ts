import { BackSide, Group, Mesh, ShaderMaterial, SphereGeometry, type Camera } from 'three';
import type { DesertRegionProfile } from '../../game/race/regions';
import type { DesertRegionId } from '../../game/race/types';
import { acquireSaltDuskAssets, saltDuskUniforms } from '../saltDusk/SaltDuskAssets';
import { SALT_DUSK_LIGHT_GLSL, SALT_DUSK_SUN } from '../saltDusk/SaltDuskLighting';

/** Photographed dusk sky and its matching reflection source. The lower horizon
 * is blended into mineral haze so the photograph never supplies fake terrain. */
export class SkyAtmosphere extends Group {
  readonly ready: Promise<void>;
  private readonly assets=acquireSaltDuskAssets();
  private readonly material=new ShaderMaterial({
    name:'Salt flats photographic dusk sky', side:BackSide,depthWrite:false,depthTest:false,toneMapped:false,
    uniforms:saltDuskUniforms(),
    vertexShader:`varying vec3 vDirection;
      void main(){vDirection=normalize((modelMatrix*vec4(position,1.)).xyz-cameraPosition);
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vDirection;
      ${SALT_DUSK_LIGHT_GLSL}
      void main(){vec3 dir=normalize(vDirection);
      vec3 sky=mix(vec3(.42,.30,.22),vec3(.14,.23,.35),smoothstep(0.,.65,dir.y));
      if(uDuskEnvironmentReady>.5){
        vec2 uv=duskEnvironmentUv(dir),dx=dFdx(uv),dy=dFdy(uv);
        dx.x-=floor(dx.x+.5);dy.x-=floor(dy.x+.5);
        sky=textureGrad(uDuskEnvironment,uv,dx,dy).rgb*uDuskEnvironmentExposure;
      }
      // The original quarry rises above its photographed horizon. Mask that
      // capture-location geometry; only the game may supply visible landforms.
      float sunFacing=pow(max(0.,dot(dir,normalize(uDuskSun))),10.);
      vec3 horizon=mix(vec3(.29,.26,.27),vec3(.71,.38,.16),sunFacing);
      sky=mix(horizon,sky,smoothstep(.205,.32,dir.y));
      float sunDisc=1.-smoothstep(.0042,.0062,acos(clamp(dot(dir,normalize(uDuskSun)),-1.,1.)));
      sky+=vec3(16.,11.,5.)*sunDisc;
      sky=mix(vec3(.31,.30,.33),sky,smoothstep(-.04,.0,dir.y));
      gl_FragColor=vec4(duskTone(sky),1.);
      #include <colorspace_fragment>
      }`,
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
  dispose():void {this.assets.release();this.dome.geometry.dispose();this.material.dispose();this.clear();}
}
export const PRIMARY_SUN_DIRECTION=SALT_DUSK_SUN;
