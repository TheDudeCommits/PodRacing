"""External conservative bent-control diagnostic. Source only; no pose/export."""
from control_clearance_geometry_helpers import *
import numpy as np
output=HERE/'sidewall-control-clearance-analysis-v2.json'; assert not output.exists()
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

report=json.loads((HERE/'sidewall-control-clearance-analysis.json').read_text())
for row in report['results']:
 wall=row['wallContact']['object']
 support=row['segments'][1];p=tuple(support['p']);q=tuple(support['q']);radius=support['capsuleRadius'];search=.25
 box=np.array([[min(p[k],q[k])-search for k in range(3)],[max(p[k],q[k])+search for k in range(3)]])
 ids=np.nonzero(np.all(lows<=box[1],axis=1)&np.all(highs>=box[0],axis=1))[0]; nearest=None
 for i in ids:
  name,fi=labels[i]
  if name==wall:continue
  ds,a,s=segment_triangle(p,q,*triangles[i]);distance=math.sqrt(ds)
  if nearest is None or distance<nearest['axisDistance']:nearest={'object':name,'sourceTriangleIndex':fi,'axisDistance':distance,'capsuleClearance':distance-radius,'axisPoint':a,'surfacePoint':s}
 assert nearest and nearest['axisDistance']<search
 row['nearestUnexpectedSupportSurface']=nearest
 row['nearestUnexpectedSupportSurfaceIsGlobalMinimum']=True
 row['globalNearestProof']='Every triangle with distance below 0.25m must overlap the segment AABB expanded by 0.25m. All such triangles except the intentionally contacted wall were tested, and the reported minimum is below 0.25m.'
 row['unexpectedContactCount']=sum(sum(n for name,n in s['countsByObject'].items() if not(s['label']=='wall_support' and name==wall)) for s in row['segments'])
 row['sidewallThicknessAlongSupportAxis']=abs(row['wallRayHits'][1]['point'][0]-row['wallContact']['point'][0])
 row['jointEnvelope']='Full-radius spheres are already included at both support endpoints and both grip endpoints. The intended support/grip joint lies within the grip segment. Any derivative fillet, collar or miter must remain inside these tested capsule envelopes or receive a fresh check.'
report['sourceUnchanged']=SOURCE.read_bytes()==blob;assert report['sourceUnchanged']
output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'output':str(output),'results':[{'side':r['side'],'unexpectedContacts':r['unexpectedContactCount'],'nearestUnexpectedSupportSurface':r['nearestUnexpectedSupportSurface'],'sidewallThickness':r['sidewallThicknessAlongSupportAxis']} for r in report['results']]},indent=2))
