"""External conservative bent-control diagnostic. Source only; no pose/export."""
from control_clearance_geometry_helpers import *
import numpy as np
output=HERE/'sidewall-control-clearance-analysis.json'; assert not output.exists()
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
 grip=hand['selectedInnerCylinderCandidate'];center=tuple(grip['centerAtClawDepthMidpoint']);axis=tuple(grip['axisUnitUp']);radius=hand['originalControlShaftRadius'];sign=-1 if side=='negativeX' else 1
 bottom=add(center,mul(axis,-.20));top=add(center,mul(axis,.15));joint=add(bottom,mul(axis,.015));raytip=(sign*2.2,joint[1],joint[2]); rayhits=[]
 raybox=np.array([[min(joint[k],raytip[k]) for k in range(3)],[max(joint[k],raytip[k]) for k in range(3)]])
 indices=np.nonzero(np.all(lows<=raybox[1],axis=1)&np.all(highs>=raybox[0],axis=1))[0]
 for i in indices:
  distance2,a,s=segment_triangle(joint,raytip,*triangles[i])
  if distance2<1e-18:
   name,fi=labels[i];rayhits.append({'object':name,'sourceTriangleIndex':fi,'point':s,'distanceAlongRay':math.sqrt(dot(sub(s,joint),sub(s,joint))),'triangle':triangles[i]})
 rayhits.sort(key=lambda a:a['distanceAlongRay']); wallhits=[h for h in rayhits if 'polySurface97' in h['object']];assert wallhits
 hit=wallhits[0];contact=tuple(hit['point']);support_radius=.035
 # End axis at actual inner wall surface. Full capsule intentionally embeds
 # a half-round end into the wall by its radius; its counts remain explicit.
 checks=[]
 for label,p,q,r in [('grip',bottom,top,radius),('wall_support',joint,contact,support_radius)]:
  check=check_segment(p,q,r);check.update({'label':label,'p':p,'q':q});checks.append(check)
 results.append({'side':side,'controlObject':hand['controlObject'],'gripBottom':bottom,'gripTop':top,'gripAxis':axis,'gripLength':.35,'gripRadius':radius,'profileSides':20,'endBevelLength':.01183,'mountJoint':joint,'mountRadius':support_radius,'wallContact':hit,'wallRayHits':rayhits,'supportAxisLength':hit['distanceAlongRay'],'segments':checks,'mountContactPolicy':'Support stops at measured inner wall surface; capsule overlap with that exact wall is intended contact and is reported. Other surfaces are unexpected. Support-to-grip overlap is deliberate mechanical engagement.'})
assert SOURCE.read_bytes()==blob
r={'sourceSha256':EXPECTED_SHA,'sourceUnchanged':True,'scope':'External original-source capsule diagnostic. No Blender/mesh/runtime edits. Capsule ends conservatively overestimate source flat/tapered control ends. Full-radius support joints included. Candidate still needs actual derivative mesh and render review.','results':results}
output.write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({'output':str(output),'results':[{'side':r['side'],'gripBottom':r['gripBottom'],'gripTop':r['gripTop'],'mountJoint':r['mountJoint'],'mountRadius':r['mountRadius'],'wallContact':r['wallContact'],'supportAxisLength':r['supportAxisLength'],'segments':[{'label':s['label'],'counts':s['countsByObject'],'nearest':s['closestSurfaceWithinPaddedBroadphase']} for s in r['segments']]} for r in results]},indent=2))
