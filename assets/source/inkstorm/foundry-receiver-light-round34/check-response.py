from pathlib import Path
import json,struct,math,hashlib,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
lamps=json.loads(subprocess.check_output(['node','--input-type=module','-e',f"import {{ INKSTORM_FOUNDRY_STRIPS }} from '{HERE}/candidate/src/render/inkstorm/InkstormFoundryFinish.ts'; console.log(JSON.stringify(INKSTORM_FOUNDRY_STRIPS))"],text=True))
def clamp(x,a,b):return min(b,max(a,x))
def smooth(a,b,x):
 t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)
def norm(n):
 length=math.sqrt(sum(x*x for x in n));return [x/max(length,1e-12) for x in n]
def response(p,n,scale,family):
 light=0
 for lamp in lamps[family]:
  c=lamp['center'];d=[(c[0]+clamp(p[0]-c[0],-lamp['halfWidth'],lamp['halfWidth'])-p[0])*scale[0],(c[1]-p[1])*scale[1],(c[2]-p[2])*scale[2]]
  d2=max(sum(x*x for x in d),.04);nn=norm([x/s for x,s in zip(n,scale)])
  facing=max(0,sum(x*y for x,y in zip(nn,d))/math.sqrt(d2));cutoff=max(0,1-d2/(lamp['range']**2));envelope=1-smooth(1.2,2.5,abs((p[2]-c[2])*scale[2]))
  light+=facing*cutoff*cutoff*envelope/(1+d2/9)
 contact=0
 if family=='pipe-bank':
  for x,z,r,h,deck in [(-27,-7,10,32,24),(17,-8,13,44,35),(37,-11,6,22,13)]:
   shell=1-smooth(.12,.55,abs(math.hypot(p[0]-x,p[2]-z)-r));upright=1-smooth(.18,.55,abs(norm(n)[1]));bd=min(abs(p[1]-4),abs(p[1]-12),abs(p[1]-(h-7)))
   band=1-smooth(.24,1.35,bd);below=smooth(deck-2,deck-.45,p[1])*(1-smooth(deck-.35,deck+.1,p[1]));contact=max(contact,shell*upright*max(band,below))
 return [min(light,1),contact]
def decode(path):
 b=path.read_bytes();length=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+length]);start=28+length
 def acc(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt,w,mx={5126:('f',4,1),5123:('H',2,65535),5121:('B',1,255),5125:('I',4,4294967295)}[a['componentType']];step=v.get('byteStride',n*w);off=start+v.get('byteOffset',0)+a.get('byteOffset',0);den=mx if a.get('normalized') else 1
  return [tuple(x/den for x in struct.unpack_from('<'+fmt*n,b,off+j*step)) for j in range(a['count'])]
 m=d['meshes'][0]['primitives'][0];assert len(d['nodes'])==1 and all(k not in d['nodes'][0] for k in ['matrix','translation','rotation','scale'])
 return b,{k:acc(v) for k,v in m['attributes'].items()},[int(t[0]) for t in acc(m['indices'])]
records=[]
for family,name,scale in [('pipe-bank','pipe-bank-detail-v1',[1,1.15,1]),('pipe-bank','pipe-bank-detail-v1',[1,1.85,1]),('service-gantry','foundry-service-gantry-v3',[.78,1.05,1])]:
 path=ROOT/'public/assets/inkstorm'/f'{name}.glb';b,a,idx=decode(path);samples=[]
 for j in range(0,len(idx),3):
  ids=idx[j:j+3];p=[sum(a['POSITION'][i][k] for i in ids)/3 for k in range(3)];n=norm([sum(a['NORMAL'][i][k] for i in ids) for k in range(3)]);v=response(p,n,scale,family)
  assert all(math.isfinite(x) and 0<=x<=1 for x in v)
  col=[sum(a['COLOR_0'][i][k] for i in ids)/3 for k in range(3)];service=col[1]>=.5 and col[2]>=.45 and col[1]>=3*col[0] and col[2]>=3*col[0];warm=col[0]>=.98 and .5<=col[1]<.59 and col[2]<.12
  if service or (family=='service-gantry' and warm):v=[0,0]
  samples.append(v)
 records.append({'family':family,'scale':scale,'source':str(path.relative_to(ROOT)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'triangleCentroids':len(samples),'nonLampCentroidsWithCoolResponseAbove0_01':sum(v[0]>.01 for v in samples),'nonLampCentroidsWithContactAbove0_10':sum(v[1]>.1 for v in samples),'maxCool':max(v[0] for v in samples),'maxContact':max(v[1] for v in samples),'meanCool':sum(v[0] for v in samples)/len(samples),'meanContact':sum(v[1] for v in samples)/len(samples)})
# Finite support, back-face rejection and source-local anchoring at real front
# shell/plate points, with inverse-scale normals in metre falloff.
checks=[]
for family in lamps:
 for lamp in lamps[family]:
  c=lamp['center'];p=[c[0],c[1],c[2]-.30];light=response(p,[0,0,1],[1,1.6,1],family)[0];assert light>.8
  assert response(p,[0,0,-1],[1,1.6,1],family)[0]==0
  assert response([c[0],c[1],c[2]-3],[0,0,1],[1,1.6,1],family)[0]==0
  checks.append({'family':family,'source':c,'frontReceiver30cmResponse':light,'reversedNormal':0,'receiver3mBehindGlass':0})
assert response([-27,4,3],[0,0,1],[1,1,1],'pipe-bank')[1]>.99
assert response([-27,8,3],[0,0,1],[1,1,1],'pipe-bank')[1]==0
assert response([-27,4,3],[0,1,0],[1,1,1],'pipe-bank')[1]==0
for row in records:
 assert row['nonLampCentroidsWithCoolResponseAbove0_01']>5, row
 if row['family']=='pipe-bank':assert row['nonLampCentroidsWithContactAbove0_10']>100, row
out={'status':'PASS','scope':'Independent CPU analogue of staged local profile, evaluated at every original GLB triangle centroid. Not a raster shader compile, image/render or visual acceptance. Centroid counts are not screen area or coverage guarantees; actual occlusion and camera still need A/B.','records':records,'fixtureReceiverChecks':checks,'analyticChecks':['Finite normalized response on all centroids and specified actual instance scales','Original lens colors excluded from receiver/contact response','Front-normal response, reversed-normal zero, behind-envelope zero','Band contact versus blank shell and horizontal cap guards'],'budget':{'trianglesAdded':0,'drawCallsAdded':0,'texturesAdded':0,'newGLBOrGeometryAttributes':0,'newUniforms':0,'perFrameWorkAdded':0,'additionalVaryingFloatsPerOptedFamily':3,'shaderProgramCountExpectedDelta':1,'programExplanation':'Pipe-bank becomes a new variant; existing warm service-gantry variant is replaced by its finish variant. Existing generic machinery and original grid gantry are unchanged.','maxStripEvaluationsPerPipeFragment':4,'maxStripEvaluationsPerGantryFragment':2,'maxAnalyticContactShellEvaluationsPerPipeFragment':3}}
(HERE/'response-evidence.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
