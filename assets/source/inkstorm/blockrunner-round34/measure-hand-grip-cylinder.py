"""External hand/control diagnostic only. Does not write GLB/Blender/runtime assets."""
from source_geometry_analysis_helpers import read_glb, SOURCE, EXPECTED_SHA, PILOT
import hashlib, json, math, random
from pathlib import Path
import numpy as np
blob=SOURCE.read_bytes(); assert hashlib.sha256(blob).hexdigest()==EXPECTED_SHA
meshes=read_glb(blob); mesh=meshes[PILOT]; p=np.asarray(mesh['positions']); rng=random.Random(34)
result={'sourceSha256':EXPECTED_SHA,'coordinateBasis':'Original Blender source metres','scope':'External geometric diagnostic only; no source/pose changes','hands':{}}
for side,sign,control in [('negativeX',-1,'pasted__brick230_phongE2_0'),('positiveX',1,'pasted__pasted__brick230_phongE2_0')]:
 selected={i for i,q in enumerate(p) if q[0]*sign>.15 and q[1]<-20.49 and 2.29<q[2]<2.58}
 edges=set()
 for f in mesh['faces']:
  for a,b in zip(f,f[1:]+f[:1]):
   if a in selected and b in selected: edges.add(tuple(sorted((tuple(p[a]),tuple(p[b])))))
 axial=[]
 for a,b in edges:
  d=np.asarray(b)-a; length=np.linalg.norm(d)
  if length>.1 and abs(d[2])/length>.9:
   if d[2]<0:d=-d
   axial.append(d/length)
 # Largest near-parallel mode, then refine from that mode only.
 scores=[sum(abs(np.dot(a,b))>.999999 for b in axial) for a in axial]; initial=axial[int(np.argmax(scores))]
 selected_axes=[a for a in axial if np.dot(a,initial)>.999999]
 axis=np.mean(selected_axes,axis=0); axis/=np.linalg.norm(axis)
 u=np.cross(axis,[0,1,0]); u/=np.linalg.norm(u); v=np.cross(axis,u)
 center0=np.mean(p[list(selected)],axis=0)
 raw=p[list(selected)]-center0
 projected=raw@np.stack([u,v],axis=1)
 unique={tuple(np.round(q,4)) for q in projected}; q=np.asarray(sorted(unique))
 # RANSAC on the projected round claw: separate inner/outer cylinder radii.
 fits=[]
 for _ in range(5000):
  ids=rng.sample(range(len(q)),3); pts=q[ids]; A=2*(pts[1:]-pts[0]); b=np.sum(pts[1:]**2,axis=1)-np.sum(pts[0]**2)
  if abs(np.linalg.det(A))<1e-7:continue
  c=np.linalg.solve(A,b); radius=np.linalg.norm(pts[0]-c)
  if not .05<radius<.13 or np.linalg.norm(c)>.15:continue
  errors=np.abs(np.linalg.norm(q-c,axis=1)-radius); inliers=errors<.0002
  if inliers.sum()<10:continue
  pts=q[inliers]; A=np.column_stack([2*pts,np.ones(len(pts))]); rhs=np.sum(pts**2,axis=1)
  x=np.linalg.lstsq(A,rhs,rcond=None)[0]; c=x[:2];radius=math.sqrt(x[2]+np.dot(c,c)); errors=np.abs(np.linalg.norm(q-c,axis=1)-radius);inliers=errors<.0002
  fits.append((int(inliers.sum()),float(np.sqrt(np.mean(errors[inliers]**2))),c,radius))
 fits.sort(key=lambda a:(-a[0],a[1])); distinct=[]
 for f in fits:
  if not any(abs(f[3]-g[3])<.001 and np.linalg.norm(f[2]-g[2])<.001 for g in distinct): distinct.append(f)
 distinct=distinct[:5]
 candidates=[]
 bar=np.asarray(meshes[control]['positions']); zlo=float(bar[:,2].min()); zhi=float(bar[:,2].max()); end=bar[np.abs(bar[:,2]-zlo)<1e-5];base=np.array([(end[:,0].min()+end[:,0].max())/2,(end[:,1].min()+end[:,1].max())/2,zlo]);bar_radius=float(np.max(np.linalg.norm(end[:,:2]-base[:2],axis=1)))
 for count,rms,c,radius in distinct:
  center=center0+u*c[0]+v*c[1]
  radial_error=np.abs(np.linalg.norm(projected-c,axis=1)-radius); inliers=radial_error<.00025
  depths=raw[inliers]@axis; low=float(depths.min());high=float(depths.max());center=center+axis*(low+high)/2
  toward=center-base; distance=float(np.linalg.norm(toward)); direction=toward/distance; angle=math.degrees(math.acos(float(np.clip(np.dot(direction,axis),-1,1))))
  base_axis_distance=float(np.linalg.norm((base-center)-axis*np.dot(base-center,axis)))
  candidates.append({'projectedInlierPoints':count,'circleRadius':radius,'circleFitRms':rms,'axisUnitUp':axis.tolist(),'centerAtClawDepthMidpoint':center.tolist(),'cylinderDepthRange':[low,high],'depthSpan':high-low,'baseToCenterUnit':direction.tolist(),'baseToCenterDistance':distance,'baseToCenterAngleAgainstGripAxisDegrees':angle,'baseDistanceFromGripInfiniteAxis':base_axis_distance,'barExcessLengthBeyondCenter':zhi-zlo-distance})
 result['hands'][side]={'controlObject':control,'originalControlBaseCenter':base.tolist(),'originalControlRadius':bar_radius,'originalControlLength':zhi-zlo,'parallelAxialEdgesUsed':len(selected_axes),'circleCandidates':candidates}
assert SOURCE.read_bytes()==blob
out=Path(__file__).parent/'hand-grip-cylinder-analysis.json';assert not out.exists();out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
