"""External conservative bent-control diagnostic. Source only; no pose/export."""
from control_clearance_geometry_helpers import *
import numpy as np
output=HERE/'cranked-control-clearance-analysis.json'; assert not output.exists()
blob=SOURCE.read_bytes();assert hashlib.sha256(blob).hexdigest()==EXPECTED_SHA
hands=json.loads((HERE/'hand-grip-cylinder-analysis-v2.json').read_text()); meshes=read_glb(blob); controls={h['controlObject'] for h in hands['hands'].values()}
triangles=[]; labels=[]
for name,mesh in meshes.items():
 if name in controls:continue
 seen=set()
 for i,face in enumerate(mesh['faces']):
  triangle=tuple(mesh['positions'][v] for v in face); key=tuple(sorted(triangle))
  if key in seen:continue
  seen.add(key);triangles.append(triangle);labels.append((name,i))
array=np.asarray(triangles); lows=array.min(axis=1); highs=array.max(axis=1)

def check_segment(p,q,radius):
 box=np.array([[min(p[k],q[k])-radius-.025 for k in range(3)],[max(p[k],q[k])+radius+.025 for k in range(3)]])
 indices=np.nonzero(np.all(lows<=box[1],axis=1)&np.all(highs>=box[0],axis=1))[0]
 contacts=[]; nearest=None; by_object={}
 for i in indices:
  ds,a,s=segment_triangle(p,q,*triangles[i]);distance=math.sqrt(ds); name,fi=labels[i]
  row={'object':name,'sourceTriangleIndex':fi,'axisDistance':distance,'capsuleClearance':distance-radius,'axisPoint':a,'surfacePoint':s}
  if nearest is None or distance<nearest['axisDistance']:nearest=row
  if distance<radius:
   contacts.append(row);by_object[name]=by_object.get(name,0)+1
 return {'capsuleRadius':radius,'broadphasePadding':.025,'exactTriangleTests':len(indices),'contacts':contacts,'countsByObject':by_object,'closestSurfaceWithinPaddedBroadphase':nearest}

results=[]
for side,hand in hands['hands'].items():
 grip=hand['selectedInnerCylinderCandidate'];center=tuple(grip['centerAtClawDepthMidpoint']);axis=tuple(grip['axisUnitUp']);base=tuple(hand['originalControlBaseCenter']);radius=hand['originalControlShaftRadius']
 points=[base,(base[0],base[1],2.16),add(center,mul(axis,-.14)),add(center,mul(axis,.17))]
 segments=[]
 for label,p,q in zip(['stem','bridge','grip'],points,points[1:]):
  row=check_segment(p,q,radius);row.update({'label':label,'p':p,'q':q});segments.append(row)
 results.append({'side':side,'controlObject':hand['controlObject'],'points':points,'profileSides':20,'sourceShaftRadius':radius,'segments':segments,'cornerJointPolicy':'Union of adjoining segment capsules includes a full-radius sphere at each junction. It conservatively bounds round joints but does not prove a miter flare is contained.'})
assert SOURCE.read_bytes()==blob
r={'sourceSha256':EXPECTED_SHA,'sourceUnchanged':True,'scope':'External original-source capsules; source pilot unchanged; no Blender/geometry export; candidate not yet accepted. Exact source duplicate triangle positions counted once. Capsule ends overestimate flat/tapered ends.','results':results}
output.write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'output':str(output),'results':[{'side':r['side'],'points':r['points'],'segments':[{'label':s['label'],'counts':s['countsByObject'],'nearest':s['closestSurfaceWithinPaddedBroadphase']} for s in r['segments']]} for r in results]},indent=2))
