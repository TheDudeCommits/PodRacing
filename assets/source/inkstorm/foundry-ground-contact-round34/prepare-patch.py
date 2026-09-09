from pathlib import Path
import difflib,hashlib,json
ROOT=Path('/Users/amir/Projects/PodRacing');OUT=Path(__file__).resolve().parent
FILES=['src/render/inkstorm/InkstormFoundations.ts','src/render/inkstorm/InkstormFoundry.ts','src/render/inkstorm/InkstormWorld.ts']
before={};after={}
def replace(s,a,b):
 assert s.count(a)==1,(a[:90],s.count(a));return s.replace(a,b)
for n in FILES:
 p=OUT/'baseline'/n;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():p.write_bytes((ROOT/n).read_bytes())
 assert p.read_bytes()==(ROOT/n).read_bytes(),'Live input changed: '+n
 before[n]=p.read_text();after[n]=before[n]
s=after[FILES[0]]
s=replace(s,'  pitAnchorHeight?: (id: string) => number | undefined): InstancedMesh {','  pitAnchorHeight?: (id: string) => number | undefined, replacedPipeBankIds?: ReadonlySet<string>): InstancedMesh {')
s=replace(s,'  for (const p of placements) {','''  for (const p of placements) {
    // Only IDs actually merged into the live Foundry mesh may omit a box.
    if (p.family === 'pipe-bank' && replacedPipeBankIds?.has(p.id)) continue;''')
after[FILES[0]]=s
s=after[FILES[1]]
s=replace(s,"import { createInkstormPipeJoint } from './InkstormPipeJoint';","import { createInkstormPipeJoint } from './InkstormPipeJoint';\nimport type { FoundationContactPlan } from './InkstormFoundationContact';")
s=replace(s,'export function createInkstormFoundry(course: PodraceCourse, heightAt: HeightAt): Mesh | null {', '''export function createInkstormFoundry(course: PodraceCourse, heightAt: HeightAt, contact?: FoundationContactPlan): Mesh | null {
  try { return createInkstormFoundryMesh(course, heightAt, contact); }
  finally { contact?.geometry?.dispose(); }
}

function createInkstormFoundryMesh(course: PodraceCourse, heightAt: HeightAt, contact?: FoundationContactPlan): Mesh | null {''')
s=replace(s,'''  const geometry = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  if (!geometry) throw new Error('Could not merge the foundry service network.');
  geometry.computeBoundingSphere(); geometry.computeBoundingBox();''','''  let geometry = mergeGeometries(parts, false);
  parts.forEach(part => part.dispose());
  if (!geometry) throw new Error('Could not merge the foundry service network.');
  let replacedPipeBankIds: ReadonlySet<string> = new Set<string>();
  let contactFailure: string | null = null;
  if (contact?.geometry) {
    // Failure retains the old service mesh and an empty omission set. The
    // caller therefore keeps every complete original foundation box.
    try {
      const merged = mergeGeometries([geometry, contact.geometry], false);
      if (merged) { geometry.dispose(); geometry = merged; replacedPipeBankIds = new Set(contact.replacedIds); }
      else contactFailure = 'Contact merge rejected; original boxes retained.';
    } catch (error) { contactFailure = String(error); }
  }
  geometry.computeBoundingSphere(); geometry.computeBoundingBox();''')
s=replace(s,'  mesh.userData.inkstormFoundryPlan = plan;','''  mesh.userData.inkstormFoundryPlan = plan;
  mesh.userData.inkstormFoundationReplacementIds = replacedPipeBankIds;
  mesh.userData.inkstormFoundationContact = { banks: contact?.banks ?? [], rejected: contact?.rejected ?? [],
    installedIds: [...replacedPipeBankIds], mergeFailure: contactFailure };''')
after[FILES[1]]=s
s=after[FILES[2]]
s=replace(s,"import { createInkstormFoundations } from './InkstormFoundations';","import { createInkstormFoundations } from './InkstormFoundations';\nimport { createInkstormFoundationContactPlan } from './InkstormFoundationContact';")
s=replace(s,'''    this.roads.push(createInkstormFoundations(getInkstormLayout(course), this.heightAt, this.pitAnchorHeight));
    const vistas=createInkstormVista(course, this.heightAt);
    this.roads.push(...vistas);
    const foundry = createInkstormFoundry(course, this.heightAt);
    if (foundry) this.roads.push(foundry);''','''    const foundationContact = createInkstormFoundationContactPlan(course, this.heightAt);
    const foundry = createInkstormFoundry(course, this.heightAt, foundationContact);
    const replacedPipeBankIds = foundry?.userData.inkstormFoundationReplacementIds as ReadonlySet<string> | undefined;
    this.roads.push(createInkstormFoundations(getInkstormLayout(course), this.heightAt, this.pitAnchorHeight, replacedPipeBankIds));
    const vistas=createInkstormVista(course, this.heightAt);
    this.roads.push(...vistas);
    if (foundry) this.roads.push(foundry);''')
after[FILES[2]]=s
for n,s in after.items():
 p=OUT/'candidate'/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s)
for new in ['src/render/inkstorm/InkstormFoundationContact.ts','tests/render/inkstormFoundationContact.test.ts']:
 after[new]=(OUT/'candidate'/new).read_text()
patch=''.join(''.join(difflib.unified_diff(before.get(n,'').splitlines(True),s.splitlines(True),fromfile='a/'+n if n in before else '/dev/null',tofile='b/'+n)) for n,s in after.items())
(OUT/'foundation-contact-v1.patch').write_text(patch)
def rec(n,s):return {'path':n,'bytes':len(s.encode()),'sha256':hashlib.sha256(s.encode()).hexdigest()}
(OUT/'candidate-inputs.json').write_text(json.dumps({'status':'PREPARED, unexecuted','baseline':[rec(n,s) for n,s in before.items()],'candidate':[rec(n,s) for n,s in after.items()],'patch':rec('foundation-contact-v1.patch',patch)},indent=2)+'\n')
print('Prepared source patch',len(patch.encode()),'bytes')
