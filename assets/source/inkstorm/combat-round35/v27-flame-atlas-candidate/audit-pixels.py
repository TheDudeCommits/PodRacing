"""Read-only PNG/metadata inspection. Never saves, crops, resizes or rewrites an image."""
from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib,re
b=Path(__file__).resolve().parent
helper=b.parent/'v27-flame-atlas-integration/candidate/src/render/galactic/RuptureFlameAtlas.ts'
frames=[{'rect':[int(x) for x in rect.split(',')],'root':[int(x) for x in root.split(',')]} for rect,root in re.findall(r'\{ rect: \[([0-9, ]+)\], root: \[([0-9, ]+)\] \}',helper.read_text())]
assert len(frames)==4
def record(p):
 data=p.read_bytes();return {'path':str(p),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
p=b/'flame-atlas-raw-v1.png';im=Image.open(p);assert im.mode=='RGBA' and im.size==(1254,1254)
assert record(p)['sha256']=='f14657a3388bf9618d0206806c7b9c54856bd7f54c98596ea1790d85c97dd4c5'
rgba=np.array(im);a=rgba[:,:,3];assigned=np.zeros_like(a,dtype=np.uint8);rows=[]
for f in frames:
 x0,y0,x1,y1=f['rect'];root=f['root'];sub=a[y0:y1,x0:x1];meaningful=sub>2
 assigned[y0:y1,x0:x1]+=meaningful
 ys,xs=np.where(meaningful);gx=xs+x0;gy=ys+y0
 dx=gx-root[0];dy=gy-root[1]
 row={**f,'meaningfulAlphaPixels':int(meaningful.sum()),'boundsAlphaAbove2':[int(gx.min()),int(gy.min()),int(gx.max()+1),int(gy.max()+1)],
  'borderMaximumAlpha':int(max(sub[0].max(),sub[-1].max(),sub[:,0].max(),sub[:,-1].max())),
  'rootRgba':rgba[root[1],root[0]].tolist(),'maximumAbsRootOffsetPixels':[int(abs(dx).max()),int(abs(dy).max())],
  'maximumRootRadiusPixels':float(np.hypot(dx,dy).max())}
 row['maximumRootRadiusMetresAtSeverity2']=row['maximumRootRadiusPixels']/120
 rows.append(row)
assert not np.any((a>2)&(assigned!=1));assert all(row['borderMaximumAlpha']<=2 for row in rows)
out={'outcome':'PASS for approved nonuniform metadata sampling; raw equal-grid/512 contract failed and is not relabeled',
 'source':record(p),'mode':im.mode,'width':im.width,'height':im.height,'alphaExtrema':list(im.getchannel('A').getextrema()),
 'alphaRule':'Source byte alpha<=2 is below existing shader .008 discard at maximum opacity. No source pixels edited.',
 'pixelsAbove2OutsideOrOverlappingFrames':int(np.count_nonzero((a>2)&(assigned!=1))),
 'outerEdgeMaximumAlpha':int(max(a[0].max(),a[-1].max(),a[:,0].max(),a[:,-1].max())),
 'separatorBandsMaximumAlpha':{'upperX716to723':int(a[:627,716:724].max()),'lowerX776to783':int(a[627:,776:784].max()),'Y623to630':int(a[623:631,:].max())},
 'frames':rows,'metadataAuthority':record(helper),
 'rootAuthority':'Visually selected left ignition witnesses near parent-suggested roots, refined to actual alpha>200 ivory pixels. These are authored sampling datums, not automatically discovered physical geometry.',
 'pixelScale':'severity/240 metres per PNG pixel; severity2=1/120m. Matrix pulses/stretch are canceled in source-coordinate spans; existing world matrices are unchanged.',
 'sampling':'flipY=false top-down pixel indices, plus half texel, per-frame clamp and transparent outside rectangle, linear sRGB sampling, no generated mipmaps',
 'limitations':'Still a private art trial. No native/GPU texture upload or visual acceptance in this audit. Tiny source alpha specks remain in immutable PNG.'}
(b/'raw-v1-metadata-audit.json').write_text(json.dumps(out,indent=2)+'\n')
p=b/'flame-atlas-raw-v2.png';im=Image.open(p)
original=Path('/Users/amir/.codex/generated_images/01a08094-5bf5-77e1-a26d-bb3689ac4568/exec-fb3dd468-5bd8-4c02-8f02-d55425cf8a90.png')
assert record(p)['sha256']==record(original)['sha256']
out={'outcome':'REJECTED: RGB checkerboard has no transparent alpha; retained unchanged', 'source':record(original),'copiedOutput':record(p),'mode':im.mode,'size':list(im.size),'hasAlpha':'A' in im.getbands(),
 'requestedMode':'built-in imagegen edit of local raw-v1, one targeted correction; no later generation', 'prompt':record(b/'edit-prompt-v2.txt'),
 'actualTileInspection':'All four quadrants viewed together at original resolution; baked checkerboard is visible throughout. This RGB output cannot be used as a transparent flame atlas.',
 'pixelOperations':'None. Both generated originals remain at their generated paths; project copies are byte-identical.'}
(b/'raw-v2-receipt.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({'metadataFrames':rows,'atlasSource':record(b/'flame-atlas-raw-v1.png')},indent=2))
