"""External, read-only geometry/image diagnosis. No Blender or source mutation."""
import io, json, struct, hashlib, math
from pathlib import Path
import numpy as np
from PIL import Image
B=Path(__file__).resolve().parent
G=B/'exports/blockrunner-atlas-v5-round34-export-v1-normalized-master.glb'
C=B/'mcp-safe/atlas-v5-driver-render-receipt.json'
E=B/'runtime-admission-preparation/export-atlas-v5-v1-receipt.json'
b=G.read_bytes(); n=struct.unpack_from('<I',b,12)[0]; d=json.loads(b[20:20+n]); z=b[28+n:]
def acc(i):
 a=d['accessors'][i]; v=d['bufferViews'][a['bufferView']]; typ={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]; dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]; dt=np.dtype(typ); off=v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.ndarray((a['count'],dims),dtype=dt,buffer=z,offset=off,strides=(v.get('byteStride',dims*dt.itemsize),dt.itemsize)).copy()
c=json.loads(C.read_text())['camera']; er=json.loads(E.read_text()); tri=[]; tuv=[]; rows=[]
for ni,node in enumerate(d['nodes']):
 assert 'rotation' not in node and 'matrix' not in node
 assert np.max(np.abs(np.array(node['scale'])-1.6))<1e-6
 for pi,p in enumerate(d['meshes'][node['mesh']]['primitives']):
  pos=acc(p['attributes']['POSITION']).astype(float); pos=pos[:,[0,2,1]]*np.array([1,-1,1]); uv=acc(p['attributes']['TEXCOORD_0']); ids=acc(p['indices']).reshape(-1,3)
  # Export node carries normalization, so local accessor position remains source world in glTF basis.
  for fi,inds in enumerate(ids): rows.append({'node':node['name'],'primitive':pi,'primitiveTriangle':fi,'material':p['material']})
  tri.append(pos[ids]); tuv.append(uv[ids])
tri=np.concatenate(tri); tuv=np.concatenate(tuv)
topology=json.loads((B/'mcp-safe/paint-v2-wear-topology-receipt.json').read_text())
body_topology=topology['meshes'][0]
assert body_topology['name']=='blockrunner-body-paint-v2'
old_body_tri=np.array(body_topology['vertices'])[np.array(body_topology['polygons'])[:,:3]]
body_delta=float(np.max(np.abs(old_body_tri-tri[:39900])))
assert body_delta<1e-6, 'Export body ordered geometry does not match actual source lineage'
x,y,q=c['rotationEuler']; rx=np.array([[1,0,0],[0,math.cos(x),-math.sin(x)],[0,math.sin(x),math.cos(x)]]); ry=np.array([[math.cos(y),0,math.sin(y)],[0,1,0],[-math.sin(y),0,math.cos(y)]]); rz=np.array([[math.cos(q),-math.sin(q),0],[math.sin(q),math.cos(q),0],[0,0,1]]); r=rz@ry@rx
loc=np.array(c['location']); direction=-r[:,2]; width,height=c['resolution']; span=c['orthoScale']; e1=tri[:,1]-tri[:,0]; e2=tri[:,2]-tri[:,0]; h=np.cross(direction,e2); det=np.einsum('ij,ij->i',e1,h); inv=np.divide(1,det,out=np.zeros_like(det),where=np.abs(det)>1e-12)
imgs=[]
for im in d['images']:
 v=d['bufferViews'][im['bufferView']]; raw=z[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]; imgs.append(np.array(Image.open(io.BytesIO(raw)).convert('RGB')))
render=np.array(Image.open(B/'paint-v1-driver-20260908-round34-atlas-v5.png').convert('RGB'))
lineage=[l for l in er['objectLineage'] if l['copiedObject'].endswith('body-paint-v2')]
def sample_uv(im,uv,wrap):
 hh,ww=im.shape[:2]; coords=np.array(uv)*[ww,hh]-.5; xy=np.floor(coords).astype(int); f=coords-xy; col=np.zeros(3)
 for dy in range(2):
  for dx in range(2):
   xx,yy=xy+[dx,dy]
   if wrap: xx%=ww; yy%=hh
   else: xx=np.clip(xx,0,ww-1);yy=np.clip(yy,0,hh-1)
   col+=im[yy,xx]*((1-f[0]) if dx==0 else f[0])*((1-f[1]) if dy==0 else f[1])
 return col.tolist()
def sample_linear_rgb(im,uv,wrap):
 rgb=im.astype(float)/255
 linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
 sampled=np.array(sample_uv(linear,uv,wrap))
 encoded=np.where(sampled<=.0031308,12.92*sampled,1.055*sampled**(1/2.4)-.055)
 return (encoded*255).tolist()
def ray(px,py):
 origin=loc+r[:,0]*((px+.5)/width-.5)*span+r[:,1]*(.5-(py+.5)/height)*(span/(width/height)); ss=origin-tri[:,0]; u=np.einsum('ij,ij->i',ss,h)*inv; qq=np.cross(ss,e1); v=qq@direction*inv; t=np.einsum('ij,ij->i',e2,qq)*inv; hit=np.where((np.abs(det)>1e-12)&(u>=0)&(v>=0)&(u+v<=1)&(t>0))[0]
 if not len(hit): return {'pixel':[px,py],'hit':False}
 i=int(hit[np.argmin(t[hit])]); bary=np.array([1-u[i]-v[i],u[i],v[i]]); uv=bary@tuv[i]; out={**rows[i],'pixel':[px,py],'globalTriangle':i,'barycentric':bary.tolist(),'sourcePosition':(bary@tri[i]).tolist(),'gltfUV':uv.tolist(),'triangleUV':tuv[i].tolist(),'distanceToAtlasBorderTexels':(np.minimum(uv,1-uv)*[2048,2048]).tolist(),'renderRGB':render[py,px].tolist()}
 if rows[i]['material']==0:
  for l in lineage:
   if l['firstCopiedPolygon']<=i<l['firstCopiedPolygon']+l['polygonCount']: out['sourceObject']=l['sourceObject'];out['sourceObjectPolygon']=i-l['firstCopiedPolygon'];break
 mat=d['materials'][rows[i]['material']]; ii=d['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source'];out['atlasBilinearRepeatRGB']=sample_uv(imgs[ii],uv,True);out['atlasBilinearClampRGB']=sample_uv(imgs[ii],uv,False)
 return out
points=[(px,py) for py in [600,610,615,620] for px in [163,167,170,172,173,174,175,177,180]]
result={'scope':'External geometry ray sampling; source camera from actual render, source-world vertices from actual master GLB local coordinates, no edits. Bilinear base RGB sampling tests wrap only; does not simulate Cycles shading or filtering. Ray pixel coordinates are top-left origin with pixel-center offset.','glb':str(G),'glbSha256':hashlib.sha256(b).hexdigest(),'cameraReceipt':str(C),'samplers':d.get('samplers'),'sourceBounds': [tri.reshape(-1,3).min(0).tolist(),tri.reshape(-1,3).max(0).tolist()],'triangleCount':len(tri),'bodyOrderedPositionMaximumDifferenceFromActualV2Topology':body_delta,'rays':[ray(*p) for p in points]}
center=ray(170,615); center_uv=center['gltfUV']; im=imgs[0]; ix=int(center_uv[0]*im.shape[1]);
result['seamCenter']=center
result['seamCenterAtlasEdgeEvidence']={'image':d['images'][0]['name'],'size':[im.shape[1],im.shape[0]],'sampleColumn':ix,'lastImageRowRGB':im[-1,ix].tolist(),'firstOppositeImageRowRGB':im[0,ix].tolist(),'bilinearDecodedLinearThenSrgbRepeatRGB':sample_linear_rgb(im,center_uv,True),'bilinearDecodedLinearThenSrgbClampRGB':sample_linear_rgb(im,center_uv,False),'physicalInterpretation':'These two decoded-linear samples differ only by sampler wrap. No lighting, material response, geometry, normals, UV or atlas pixels have been changed.'}
(B/'v5-stud-seam-external-diagnosis.json').write_text(json.dumps(result,indent=2)+'\n')
for q in result['rays']:
 print(q['pixel'],q.get('sourceObject'),q.get('sourceObjectPolygon'),q.get('gltfUV'),q.get('distanceToAtlasBorderTexels'),q.get('renderRGB'),q.get('atlasBilinearRepeatRGB'))
print('Wrote',B/'v5-stud-seam-external-diagnosis.json')
