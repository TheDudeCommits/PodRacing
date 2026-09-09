"""Read-only source geometry, enriched diagnostic report. No pose/mesh mutation."""
from source_geometry_analysis_helpers import read_glb, SOURCE, EXPECTED_SHA
from pathlib import Path
import hashlib,json,math,numpy as np
here=Path(__file__).parent; blob=SOURCE.read_bytes(); assert hashlib.sha256(blob).hexdigest()==EXPECTED_SHA
meshes=read_glb(blob); r=json.loads((here/'hand-grip-cylinder-analysis.json').read_text())
r['scope']='External geometric fit diagnostic; approximate circle fitting to polygonal hand, no collision acceptance or source/pose mutation'
for row in r['hands'].values():
 p=np.asarray(sorted(set(meshes[row['controlObject']]['positions']))); c=(p[:,:2].min(axis=0)+p[:,:2].max(axis=0))/2; radial=np.linalg.norm(p[:,:2]-c,axis=1); shaft=float(radial.max())
 row['originalControlEndRingRadius']=row.pop('originalControlRadius'); row['originalControlShaftRadius']=shaft
 row['controlProfile']=[{'z':float(z),'vertices':int(sum(abs(p[:,2]-z)<1e-5)),'radiusRange':[float(radial[abs(p[:,2]-z)<1e-5].min()),float(radial[abs(p[:,2]-z)<1e-5].max())]} for z in sorted(set(round(v,6) for v in p[:,2]))]
 inner=min(row['circleCandidates'],key=lambda a:abs(a['circleRadius']-.07));row['selectedInnerCylinderCandidate']=inner
 center=np.asarray(inner['centerAtClawDepthMidpoint']); axis=np.asarray(inner['axisUnitUp']);base=np.asarray(row['originalControlBaseCenter']);t=(center[2]-base[2])/axis[2];relocated=center-t*axis
 row['sameBaseZCoaxialRelocationCandidate']={'newBaseCenter':relocated.tolist(),'displacement':(relocated-base).tolist(),'distance':float(np.linalg.norm(relocated-base)),'grabDistanceAboveNewBase':float(t),'fullCraftCollisionChecked':False}
 row['nominalRadialClearance']=inner['circleRadius']-shaft
 row['closedCircularApertureThinPlaneTiltUpperBoundDegrees']=math.degrees(math.acos(shaft/inner['circleRadius']))
 row['fixedBaseConclusion']='Cannot rigidly align existing straight bar coaxially with this hand while retaining its current base. A base-to-grip-center pivot is roughly 46 degrees off the measured hole axis. The real claw has an open slot; exact global collision or partial edge contact has not been accepted.'
r['sourceUnchanged']=SOURCE.read_bytes()==blob
out=here/'hand-grip-cylinder-analysis-v2.json';assert not out.exists();out.write_text(json.dumps(r,indent=2)+'\n')
print(json.dumps({s:{k:v[k] for k in ['originalControlShaftRadius','nominalRadialClearance','closedCircularApertureThinPlaneTiltUpperBoundDegrees','sameBaseZCoaxialRelocationCandidate']} for s,v in r['hands'].items()},indent=2))
