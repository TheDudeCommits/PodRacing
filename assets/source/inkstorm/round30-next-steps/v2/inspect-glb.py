from pathlib import Path
import json,struct,hashlib,math
p=Path('public/assets/inkstorm/pipe-bank.glb');raw=p.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+jl]);offset=20+jl;bl,bt=struct.unpack_from('<II',raw,offset);binary=raw[offset+8:offset+8+bl]
def accessor(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];fmt={5126:'f',5123:'H'}[a['componentType']];size=struct.calcsize(fmt)*n;start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',size)
 return [struct.unpack_from('<'+fmt*n,binary,start+k*stride) for k in range(a['count'])]
prim=j['meshes'][0]['primitives'][0];pos=accessor(prim['attributes']['POSITION']);colors=accessor(prim['attributes']['COLOR_0']);indices=[x[0] for x in accessor(prim['indices'])]
caps=[]
for expected,radius in [((-42,7,9),3),((-38,19,13),1.8),((8,30,10),2.25)]:
 found=[];ids=set()
 for i in range(0,len(indices),3):
  tri=indices[i:i+3]
  if all(abs(pos[k][0]-expected[0])<.0001 and math.hypot(pos[k][1]-expected[1],pos[k][2]-expected[2])<radius+.001 for k in tri):
   found.append(i//3);ids.update(tri)
 points=[pos[k] for k in ids]
 centroid=[(min(v[d] for v in points)+max(v[d] for v in points))/2 for d in range(3)]
 a,b,c=[pos[k] for k in indices[found[0]*3:found[0]*3+3]]
 u=[b[d]-a[d] for d in range(3)];v=[c[d]-a[d] for d in range(3)];normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];length=math.sqrt(sum(x*x for x in normal));normal=[x/length for x in normal]
 caps.append({'expected':expected,'derivedCenter':centroid,'triangles':found,'vertexIds':sorted(ids),'radius':radius,'maximumCenterError':max(abs(a-b) for a,b in zip(expected,centroid)),'bounds':[[min(v[d] for v in points),max(v[d] for v in points)]for d in range(3)],'meanVertexColor':[sum(colors[k][d] for k in ids)/len(ids) for d in range(3)],'outwardNormal':normal})
r={'file':str(p),'sha256':hashlib.sha256(raw).hexdigest(),'nodes':j['nodes'],'caps':caps,'scope':'Actual exported indexed geometry, no Blender/browser/GPU.'}
Path('assets/source/inkstorm/round30-next-steps/v2/glb-socket-receipt.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
