from pathlib import Path
import re,json
b=Path(__file__).resolve().parent;root=Path.cwd();paths=['src/render/combat/TeemtoAuthoredDamage.ts','src/render/combat/WreckGroundContact.ts','src/render/galactic/GalacticEffectsView.ts','src/render/app/GameApp.ts']
(b/'test-runtime').mkdir(exist_ok=True)
owned={str(root/p):'./'+Path(p).stem for p in paths}
def rewrite(text,rel):
 def sub(m):
  target=str((root/rel).parent.joinpath(m[2]).resolve());return m[1]+owned.get(target,owned.get(target+'.ts',target))+m[3]
 return re.sub(r"(from\s+['\"])(\.[^'\"]+)(['\"])",sub,text)
for rel in paths:(b/'test-runtime'/Path(rel).name).write_text(rewrite((b/'candidate'/rel).read_text(),rel))
config=Path('assets/source/inkstorm/combat-round35/v21-principal-strike-preparation/vitest.config.ts').read_text().replace('v21-principal-strike-preparation','v22-ground-strike-preparation');a=config.index('const targets');z=config.index('export default')
config=config[:a]+"const targets = new Map("+json.dumps([[str(root/p),str(b/'test-runtime'/Path(p).name)] for p in paths])+');\n'+config[z:];(b/'vitest.config.ts').write_text(config)
(b/'tsconfig.candidate.json').write_text(json.dumps({'extends':str(root/'tsconfig.json'),'include':['test-runtime/*.ts']},indent=2))
orig=Path('tests/combat/TeemtoAuthoredDamage.test.ts').read_text();prefix=orig[:orig.index("describe('actual authored")]
prefix=re.sub(r"(from\s+['\"])(\.[^'\"]+)(['\"])",lambda m:m[1]+str((root/'tests/combat').joinpath(m[2]).resolve())+m[3],prefix)
(b/'broadSupport.test.ts').write_text(prefix+'''
describe('V22 source casing support rather than a single protrusion', () => {
  it.each(variants)('%s uses extended casing ground support, preserves every sampled source surface and restores intact geometry', name => {
    const art = fixture(name), sim = race(), point = new Vector3(), axis = new Vector3(), q = new Quaternion();
    const body = new Matrix4(), world = new Matrix4(), unit = new Vector3(1, 1, 1);
    const frames = new Set([910, 914, 919, 926, 932, 946, 984, 1018, 1110, 1158, 1168]);
    let minimum = Infinity, checked = 0, maxQueries = 0; const bands: unknown[] = [];
    const rest = matrices(art), pilots = art.original.filter(m => m.name.startsWith('teemto-pilot-'));
    const originalPilotMatrices = pilots.map(m => m.matrix.clone());
    try {
      for (let frame = 1; frame <= 1168; frame++) {
        step(sim, frame); if (!frames.has(frame)) continue;
        const e = sim.state.entries[0]!, before = JSON.stringify(sim.state);
        const pose = art.cache.update(e.vehicle, e.galactic!.wreck.timer, sim.terrain); let queries = 0;
        art.breakup.update(pose, e.galactic!.wreck.timer, { heightAt(x,z) { queries++; return sim.terrain.heightAt(x,z); } });
        maxQueries = Math.max(queries,maxQueries); art.root.updateMatrixWorld(true);
        body.compose(pose.position,q.setFromEuler(pose.rotation),unit);
        for (const mesh of art.all) if (mesh.visible) {
          world.multiplyMatrices(body,mesh.matrixWorld); axis.set(0,0,1).transformDirection(world).setY(0).normalize();
          const p=mesh.geometry.getAttribute('position'); let low=Infinity, hi=-Infinity, near=0;
          for (let i=0;i<p.count;i++) {
            point.fromBufferAttribute(p,i).applyMatrix4(world); const gap=point.y-sim.terrain.heightAt(point.x,point.z);
            minimum=Math.min(minimum,gap);checked++;
            expect(gap,`${name}/${frame}/${mesh.name}/${i}: no source burial`).toBeGreaterThanOrEqual(-1e-6);
            if (gap<=.45) {const along=point.x*axis.x+point.z*axis.z;low=Math.min(low,along);hi=Math.max(hi,along);near++;}
          }
          if ([984,1018].includes(frame) && (mesh.name==='teemto-engine-left-body'||mesh.name.includes('damage-right'))) {
            const length=hi-low;bands.push({frame,mesh:mesh.name,length,near});
            expect(length,`${name}/${mesh.name}: long casing contact band`).toBeGreaterThan(mesh.name.includes('rear')?6:mesh.name.includes('front')?4.5:8);
          }
        }
        if (pose.groundContact?.footprint) {
          const f=pose.groundContact.footprint;expect(f.center.y).toBeCloseTo(sim.terrain.heightAt(f.center.x,f.center.z),9);
          expect(f.halfLength).toBeGreaterThan(2);expect(f.axis.length()).toBeCloseTo(1,9);
        }
        for (let i=0;i<pilots.length;i++) expect(pilots[i]!.matrix.equals(originalPilotMatrices[i]!)).toBe(true);
        expect(JSON.stringify(sim.state)).toBe(before);
      }
      art.breakup.reset();expect(matrices(art)).toEqual(rest);expect(art.damage.every(m=>!m.visible)).toBe(true);
      expect(art.original.every(m=>m.visible)).toBe(true);
      console.info('V22 broad source support',JSON.stringify({name,minimum,checked,maxQueries,bands}));
    } finally {art.breakup.reset();}
  });
});
''')
