"""External read-only GLB comparison. Copies arrays only; no source or Blender edits."""
import collections,hashlib,itertools,json,struct
from pathlib import Path
import numpy as np
from source_geometry_analysis_helpers import node_matrix
B=Path(__file__).resolve().parent
UIDS=['a6f14ae799ab40d7ac425f043f824ff8','e42fb924b344481ea013c58cb0f52ad7']
BASIS=np.array([[1,0,0],[0,0,-1],[0,1,0]],float)
def sha(data):return hashlib.sha256(data).hexdigest()
def parse(uid):
 path=B.parent/'vehicles'/uid/'source-imported.glb';raw=path.read_bytes();jn=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+jn]);binary=raw[28+jn:]
 def accessor(i):
  a=d['accessors'][i];assert not a.get('sparse');v=d['bufferViews'][a['bufferView']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]);dim={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  return np.ndarray((a['count'],dim),dtype=dt,buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',dim*dt.itemsize),dt.itemsize)).copy()
 rows=[]; tris=[];norms=[];uvs=[];names=[];raw_records=[]
 def visit(i,parent,parent_name):
  node=d['nodes'][i];local=np.array(node_matrix(node));world=parent@local
  if 'mesh' in node:
   mesh=d['meshes'][node['mesh']];parts=[];start=sum(len(t) for t in tris)
   for pi,p in enumerate(mesh['primitives']):
    assert p.get('mode',4)==4;pos=accessor(p['attributes']['POSITION']);n=accessor(p['attributes']['NORMAL']);has_uv='TEXCOORD_0' in p['attributes'];uv=accessor(p['attributes']['TEXCOORD_0']) if has_uv else np.full((len(pos),2),np.nan);ix=accessor(p['indices']).reshape(-1,3);pw=(pos@world[:3,:3].T+world[:3,3])@BASIS.T;nw=n@np.linalg.inv(world[:3,:3]);nw=nw@BASIS.T;nw/=np.linalg.norm(nw,axis=1,keepdims=True)
    # Match visible effective front-face winding for negative source transforms.
    if np.linalg.det(world[:3,:3])<0:ix=ix[:,[0,2,1]]
    tris.append(pw[ix]);norms.append(nw[ix]);uvs.append(uv[ix]);names.extend([node['name']]*len(ix))
    row={'primitive':pi,'triangles':len(ix),'vertices':len(pos),'rawPositionSha256':sha(pos.tobytes()),'rawNormalSha256':sha(n.tobytes()),'rawUvSha256':sha(uv.tobytes()) if has_uv else None,'rawIndexSha256':sha(accessor(p['indices']).tobytes()),'material':d['materials'][p['material']]['name'],'rawUvRange':[uv.min(0).tolist(),uv.max(0).tolist()] if has_uv else None};parts.append(row)
    raw_records.append({'node':node['name'],**row})
   rows.append({'nodeIndex':i,'name':node['name'],'parentName':parent_name,'meshName':mesh['name'],'localMatrix':local.tolist(),'worldMatrix':world.tolist(),'determinant':float(np.linalg.det(world[:3,:3])),'firstTriangle':start,'triangles':sum(p['triangles'] for p in parts),'primitives':parts})
  for child in node.get('children',[]):visit(child,world,node['name'])
 for i in d['scenes'][d.get('scene',0)]['nodes']:visit(i,np.eye(4),None)
 tris=np.concatenate(tris);norms=np.concatenate(norms);uvs=np.concatenate(uvs);bounds=[tris.reshape(-1,3).min(0),tris.reshape(-1,3).max(0)];center=(bounds[0]+bounds[1])/2;extent=bounds[1]-bounds[0]
 result={'uid':uid,'path':str(path),'bytes':len(raw),'sha256':sha(raw),'nodes':len(d['nodes']),'meshDefinitions':len(d['meshes']),'meshOccurrences':len(rows),'materials':len(d['materials']),'images':len(d.get('images',[])),'triangles':len(tris),'sourceBlenderWorldBounds':[a.tolist() for a in bounds],'sourceDimensions':extent.tolist(),'center':center.tolist(),'mirroredOccurrences':sum(r['determinant']<0 for r in rows),'meshRows':rows,'materialRecords':d['materials']}
 return result,{'triangles':tris,'normals':norms,'uvs':uvs,'triangleNodeNames':names,'rawRecords':raw_records,'document':d,'center':center,'extent':extent}
ra,a=parse(UIDS[0]);rb,b=parse(UIDS[1]);result={'scope':'Read-only original GLB comparison; original arrays remain intact. No rendered-image inference, DCC call, new acquisition, runtime or source edit. Raw mesh/transform/normal identities and optional normalized geometric proximity are separate results.','sources':[ra,rb]}
namea={r['name']:r for r in ra['meshRows']};nameb={r['name']:r for r in rb['meshRows']};common=sorted(set(namea)&set(nameb));matched=[]
for name in common:
 x=namea[name];y=nameb[name];matched.append({'name':name,'colorTriangles':x['triangles'],'ivoryTriangles':y['triangles'],'localTransformsExactlyEqual':x['localMatrix']==y['localMatrix'],'worldTransformsExactlyEqual':x['worldMatrix']==y['worldMatrix'],'primitiveRawIdentityEqual':[p for p in x['primitives']]==[p for p in y['primitives']]})
result['sameNamedOccurrenceComparison']=matched
result['nameInventory']={'sharedMeshOccurrenceNames':common,'colorOnlyMeshOccurrenceNames':sorted(set(namea)-set(nameb)),'ivoryOnlyMeshOccurrenceNames':sorted(set(nameb)-set(namea))}
# Hash-based exact local attribute correspondences, independent of material/name/index offsets.
for attr in ['rawPositionSha256','rawNormalSha256','rawUvSha256','rawIndexSha256']:
 ca=collections.Counter(r[attr] for r in a['rawRecords'] if r[attr] is not None);cb=collections.Counter(r[attr] for r in b['rawRecords'] if r[attr] is not None);result[attr+'MultisetComparison']={'colorPrimitiveWithAttributeCount':sum(ca.values()),'ivoryPrimitiveWithAttributeCount':sum(cb.values()),'matchingPrimitiveCount':sum((ca&cb).values()),'exactPresentAttributeMultisetEqual':ca==cb}
# Analysis-only placement alignment, not normalization or editing of either GLB.
translation=a['center']-b['center']; at=a['triangles'];bt=b['triangles']+translation
tolerance=3e-5;ac=at.mean(1);bc=bt.mean(1);grid=collections.defaultdict(list)
for j,cell in enumerate(np.floor(bc/tolerance).astype(int)):grid[tuple(cell)].append(j)
offsets=list(itertools.product([-1,0,1],repeat=3));candidate_lists=[]
for center in ac:
 cell=np.floor(center/tolerance).astype(int);candidates=[]
 for dx,dy,dz in offsets:
  for j in grid.get((cell[0]+dx,cell[1]+dy,cell[2]+dz),[]):
   if np.linalg.norm(bc[j]-center)<=tolerance:candidates.append(j)
 candidate_lists.append(candidates)
perms=np.array([(0,1,2),(1,2,0),(2,0,1),(0,2,1),(2,1,0),(1,0,2)])
mapping=np.full(len(at),-1,int);permutation=np.full(len(at),-1,int);distances=np.full(len(at),np.nan);normal_chords=np.full(len(at),np.nan);used=set();unmatched=[]
for i,candidates in enumerate(candidate_lists):
 options=[]
 for j in candidates:
  if j in used:continue
  deltas=np.linalg.norm(bt[j][perms]-at[i],axis=2).max(1)
  for p in np.flatnonzero(deltas<=tolerance):
   chord=float(np.linalg.norm(b['normals'][j][perms[p]]-a['normals'][i],axis=1).max())
   options.append((int(p>=3),chord,float(deltas[p]),j,int(p)))
 if not options:unmatched.append(i);continue
 # Prefer effective front-face winding, then requested normals, within strict
 # geometric tolerance. Degenerate triangles can have ambiguous winding.
 option=min(options);reverse,chord,distance,j,p=option;used.add(j);mapping[i]=j;permutation[i]=p;distances[i]=distance;normal_chords[i]=chord
mapping_rows=[]
for row in ra['meshRows']:
 ix=np.arange(row['firstTriangle'],row['firstTriangle']+row['triangles']);good=ix[mapping[ix]>=0];counts=collections.Counter(b['triangleNodeNames'][mapping[i]] for i in good)
 mapping_rows.append({'colorObject':row['name'],'colorFirstTriangle':row['firstTriangle'],'colorTriangleCount':row['triangles'],'matchedTriangles':len(good),'ivoryObjectTriangleCounts':dict(counts),'maxCornerPositionDifference':float(distances[good].max()) if len(good) else None,'maxWorldNormalChord':float(normal_chords[good].max()) if len(good) else None,'reversedEffectiveWindingCount':int((permutation[good]>=3).sum())})
valid=mapping>=0;cross=np.linalg.norm(np.cross(at[:,1]-at[:,0],at[:,2]-at[:,0]),axis=1)
result['worldSurfaceCorrespondence']={'method':'Apply only bbox-center translation to ivory analysis arrays, then one-to-one triangle corner matching within 0.00003 source meters. Prefer effective winding and normal correspondence for coincident duplicates. No rotation, uniform or nonuniform scaling, remeshing, source edit, DCC operation or ICP.','ivoryToColorTranslation':translation.tolist(),'positionToleranceSourceMeters':tolerance,'matchedTriangles':int(valid.sum()),'colorUnmatchedTriangles':unmatched,'ivoryUnmatchedTriangles':sorted(set(range(len(bt)))-used),'allTrianglesBijective':bool(valid.all() and len(used)==len(bt)),'maxCornerPositionDifference':float(distances[valid].max()),'meanTriangleMaximumCornerDifference':float(distances[valid].mean()),'positionDifferenceQuantiles':np.quantile(distances[valid],[0,.5,.95,.99,1]).tolist(),'worldNormalMaximumChord':float(normal_chords[valid].max()),'worldNormalMaximumDegrees':float(np.degrees(2*np.arcsin(np.clip(normal_chords[valid].max()/2,0,1)))),'normalMaximumChordQuantiles':np.quantile(normal_chords[valid],[0,.5,.95,.99,1]).tolist(),'trianglesWithWorldNormalMaxChordAtMost1eMinus5':int((normal_chords[valid]<=1e-5).sum()),'trianglesRequiringReversedEffectiveWinding':int((permutation[valid]>=3).sum()),'nondegenerateTrianglesRequiringReversedEffectiveWinding':int(((permutation>=3)&(cross>1e-12)).sum()),'sourceObjectMapping':mapping_rows}
np.savez(B/'original-variant-correspondence-analysis-copy.npz',colorToIvoryTriangle=mapping,colorToIvoryCornerPermutationIndex=permutation,cornerPermutations=perms,maxCornerPositionDifference=distances,maxWorldNormalChord=normal_chords,ivoryToColorTranslation=translation)
np.savez(B/'original-variant-comparison-analysis-copy.npz',colorTriangles=a['triangles'],ivoryTriangles=b['triangles'],colorNormals=a['normals'],ivoryNormals=b['normals'],colorUvs=a['uvs'],ivoryUvs=b['uvs'])
(B/'original-variant-comparison.json').write_text(json.dumps(result,indent=2)+'\n')
for r in [ra,rb]:print(json.dumps({k:v for k,v in r.items() if k not in ['meshRows','materialRecords']},indent=2))
print('same names',len(common));print('raw identity counts',{k:v for k,v in result.items() if k.endswith('Comparison') and isinstance(v,dict)})
print('SURFACE',json.dumps({k:v for k,v in result['worldSurfaceCorrespondence'].items() if k not in ['sourceObjectMapping','colorUnmatchedTriangles','ivoryUnmatchedTriangles']},indent=2))
