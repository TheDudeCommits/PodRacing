import { expect, it } from 'vitest';
import { InstancedMesh } from 'three';
import { GalacticEffectsView as Candidate } from './test-runtime/GalacticEffectsView';
import { GalacticEffectsView as Baseline } from './before-runtime/GalacticEffectsView';
function state(view: Candidate | Baseline) {
  return view.children.map(child => {
    const mesh = child as InstancedMesh;
    return [mesh.count, Array.from(mesh.instanceMatrix.array.slice(0,mesh.count*16)),
      Array.from(mesh.instanceColor!.array.slice(0,mesh.count*3)),
      Array.from(mesh.geometry.getAttribute('aEffectSurface')?.array.slice(0,mesh.count*3)??[]),
      Array.from(mesh.geometry.getAttribute('aFragmentMetal')?.array.slice(0,mesh.count)??[])];
  });
}
it('retains exact visible arrays for every unowned legacy effect style and ground-contact reuse', () => {
  for (const style of ['crash','redline','mine','sand','rock','reward','energy','recovery'] as const) {
    const a=new Candidate(),b=new Baseline();
    for(const v of [a,b]) {v.setShields([{position:{x:3,y:8,z:2},radius:4}]);v.emitWreckGroundContact(1,{x:3,y:0,z:8},{x:1,y:0,z:0});
      v.emitCrash({type:'crash',time:1,position:{x:3,y:8,z:2},velocity:{x:10,y:2,z:8},groundY:0,severity:2,style});}
    for(const age of [0,.08,.3,.7,1.2,2.4]) {a.update(1+age);b.update(1+age);expect(state(a),style+' '+age).toEqual(state(b));}
    a.dispose();b.dispose();
  }
});
