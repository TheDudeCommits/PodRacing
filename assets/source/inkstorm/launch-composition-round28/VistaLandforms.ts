/**
 * Staged round28 planner addition. Not imported by the live game.
 * Copy the constants/loop into InkstormVista after its existing five shoulder
 * forms. Tag with compositionLayer, not depthLayer or ridgeId, so the accepted
 * older groups retain their independent budgets and checks.
 */
import type {PodraceCourse} from '../../../../src/game/race/course';
import {getLaunchBasinAnchor} from '../../../../src/game/race/CourseGulfField';
import {LAUNCH_INDUSTRIAL_BENCHES} from './LaunchBasinPlan';
import {groundInkstormButtress} from '../../../../src/render/inkstorm/InkstormRockGrounding';
import type {VistaLandform} from '../../../../src/render/inkstorm/InkstormVista';

export type LaunchCompositionForm = VistaLandform & {compositionLayer:'middle'};
export const LAUNCH_COMPOSITION_FORMS = [
 {id:'west-descent-finger',forward:650,right:-240,scale:.58,yaw:-1.56},
 {id:'west-inset-spire',forward:880,right:-400,scale:.47,yaw:.65},
 {id:'east-inner-spire',forward:600,right:210,scale:.75,yaw:1.83},
] as const;

export function getLaunchCompositionForms(course:PodraceCourse,heightAt:(x:number,z:number)=>number):LaunchCompositionForm[]{
 const anchor=getLaunchBasinAnchor(course);
 if(!anchor)return [];
 const data=course.getRenderData(2048);
 const lines=[{points:data.points,closed:true},...(data.branches??[]).map(b=>({points:b.points,closed:false}))];
 const forms:LaunchCompositionForm[]=[];
 for(const form of LAUNCH_COMPOSITION_FORMS){
  const {forward,right,scale:size}=form;
  const x=anchor.x+anchor.tangentX*forward-anchor.rightX*right,z=anchor.z+anchor.tangentZ*forward-anchor.rightZ*right;
  const radius=Math.hypot(40*size,50*size);
  let clear=true;
  for(const line of lines)for(let i=0;i<line.points.length-(line.closed?0:1);i++){
   const a=line.points[i]!,b=line.points[(i+1)%line.points.length]!,dx=b.x-a.x,dz=b.z-a.z;
   const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
   if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<Math.max(a.width,b.width)+radius+9.6+7+2)clear=false;
  }
  if(!clear)continue;
  if(Math.abs(right)-radius<Math.tan(Math.PI/15)*(forward+radius))continue;
  if(LAUNCH_INDUSTRIAL_BENCHES.some(b=>Math.hypot(Math.max(0,Math.abs(forward-b.forward)-b.halfForward-8),
   Math.max(0,Math.abs(right-b.right)-b.halfRight-8))<=radius))continue;
  const placement={id:`launch-composition-${form.id}`,family:'fractured-spire' as const,x,z,radius,forward,
   yaw:Math.atan2(anchor.tangentX,anchor.tangentZ)+form.yaw,sx:size,sy:size,sz:size,settlement:false,compositionLayer:'middle' as const};
  if(groundInkstormButtress(placement,heightAt).scaleY/size>1.75)continue;
  forms.push(placement);
 }
 return forms;
}
