"""External read-only matched-image measurement; no image edits."""
import hashlib,json,struct
from pathlib import Path
import numpy as np
from PIL import Image
B=Path(__file__).resolve().parent
old=B/'paint-v1-driver-20260908-round34-atlas-v5.png';new=B/'paint-v1-driver-20260908-round34-clamp-v6.png'
a=np.array(Image.open(old).convert('RGB')).astype(float);b=np.array(Image.open(new).convert('RGB')).astype(float);assert a.shape==b.shape==(960,1280,3)
regions={'seam_strip':[169,600,177,621],'left_ivory_flank':[163,600,168,621],'right_ivory_flank':[177,600,182,621],'whole_stud':[118,567,210,627],'pilot_control_region':[425,145,890,737]}
rows={}
for name,(x0,y0,x1,y1) in regions.items():
 aa=a[y0:y1,x0:x1];bb=b[y0:y1,x0:x1];diff=bb-aa;rows[name]={'xyxyExclusive':[x0,y0,x1,y1],'pixelCount':aa.shape[0]*aa.shape[1],'v5MeanRGB':aa.mean((0,1)).tolist(),'v6MeanRGB':bb.mean((0,1)).tolist(),'meanAbsoluteChannelDifference':float(np.abs(diff).mean()),'maxAbsoluteChannelDifference':float(np.abs(diff).max())}
def lum(rgb):return float(np.array(rgb)@np.array([.2126,.7152,.0722]))
contrasts={}
for ver in ['v5','v6']:
 left=lum(rows['left_ivory_flank'][ver+'MeanRGB']);right=lum(rows['right_ivory_flank'][ver+'MeanRGB']);strip=lum(rows['seam_strip'][ver+'MeanRGB']);ref=(left+right)/2
 contrasts[ver]={'lumaSeam':strip,'lumaAdjacentFlankMean':ref,'darkDeficit':ref-strip,'deficitPercentOfFlanks':100*(ref-strip)/ref}
x=(b-a);result={'scope':'Implementation-aware matched actual source render assessment; pixel metrics do not establish runtime acceptance. No image modifications.','v5Image':str(old),'v6Image':str(new),'resolution':[1280,960],'wholeFrameMeanAbsoluteChannelDifference':float(np.abs(x).mean()),'regions':rows,'seamContrast':contrasts,'centerPixel':{'xy':[170,615],'v5RGB':a[615,170].tolist(),'v6RGB':b[615,170].tolist()},'row615Samples':[{'x':i,'v5':a[615,i].tolist(),'v6':b[615,i].tolist()} for i in [163,167,169,170,172,174,176,177,180]],'visuallyInspectedIndividually':True}
assert json.loads((B/'mcp-safe/atlas-v5-driver-render-receipt.json').read_text())['camera']==json.loads((B/'mcp-safe/atlas-clamp-v6-driver-render-receipt.json').read_text())['camera']
result['actualCameraRecordsExactlyEqual']=True
master=B/'exports/blockrunner-atlas-v6-round34-export-v1-normalized-master.glb';raw=master.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);result['v6MasterSamplers']=g.get('samplers');assert all(s.get('wrapS')==33071 and s.get('wrapT')==33071 for s in g['samplers'])
(B/'v6-stud-seam-roi-assessment.json').write_text(json.dumps(result,indent=2)+'\n')
files=[old,new,master,B/'mcp-safe/atlas-finalize-v5-receipt.json',B/'mcp-safe/atlas-v5-driver-render-receipt.json',B/'mcp-safe/atlas-clamp-v6-receipt.json',B/'mcp-safe/atlas-clamp-v6-driver-render-receipt.json',B/'runtime-admission-preparation/export-atlas-v6-v1-receipt.json',B/'v5-stud-seam-external-diagnosis.json',B/'v6-stud-seam-roi-assessment.json']
for im in json.loads((B/'mcp-safe/atlas-clamp-v6-receipt.json').read_text())['linkedPaintImages'].values():files.append(Path(im['filepath']))
records=[]
for p in files:
 data=p.read_bytes();records.append({'path':str(p),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
(B/'source-clamp-v6-actual-inventory.json').write_text(json.dumps({'scope':'Actual V6 source correction and private export evidence, not runtime admission. Prior inventories remain immutable.','artifacts':records},indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['regions','row615Samples']},indent=2));print('inventory files',len(records))
