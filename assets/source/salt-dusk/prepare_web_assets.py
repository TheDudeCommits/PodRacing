"""Technical format/size optimization only; preserves photogrammetry artwork and UV alignment."""
from pathlib import Path
from PIL import Image
import hashlib,json,shutil,numpy as np
root=Path(__file__).resolve().parents[3]
source=root/'assets/source/salt-dusk';public=root/'public/assets/salt-dusk'
records=json.loads((source/'original-downloads.json').read_text());out=[]
for r in records:
 src=root/r['path'];role=r['role'];asset=r['asset']
 if asset=='sunset_in_the_chalk_quarry':
  folder=public/'environment'; name='sunset-quarry-1k.hdr' if role=='hdri' else 'sunset-quarry-2k.jpg'
 else:
  folder=public/('rock' if asset=='rock_06' else 'ground');name={'Diffuse':'albedo.jpg','nor_gl':'normal-gl.png','Rough':'roughness.jpg'}[role]
 folder.mkdir(parents=True,exist_ok=True);dst=folder/name
 extra={}
 if role=='hdri':shutil.copyfile(src,dst);dims=[1024,512];operation='byte-identical upstream Radiance HDR'
 else:
  im=Image.open(src); original_size=list(im.size)
  if role=='nor_gl':
   if im.mode=='RGBA':extra['original_alpha_minmax']=im.getchannel('A').getextrema()
   im=im.convert('RGB');im.save(dst,optimize=True,compress_level=9);operation='RGB8 PNG; remove metadata/unused alpha; no spatial resize, green inversion, or color transform'
  elif role=='tonemapped':
   im=im.convert('RGB').resize((2048,1024),Image.Resampling.LANCZOS);im.save(dst,quality=90,optimize=True,progressive=True,subsampling=0);operation='upstream tonemapped panorama resized 8192x4096 to 2048x1024 Lanczos; JPEG quality90 4:4:4, no added tone/color manipulation'
  else:
   im=im.convert('RGB' if role=='Diffuse' else 'L');im.save(dst,quality=88 if role=='Diffuse' else 92,optimize=True,progressive=True,subsampling=0);operation='same resolution; JPEG recompression quality88 albedo /92 roughness; no color transform'
  dims=list(im.size);a=np.asarray(Image.open(dst));extra['encoded_channel_means']=np.mean(a,axis=(0,1)).tolist();extra['source_dimensions']=original_size
  if role=='nor_gl':
   n=a.astype(float)/127.5-1;length=np.linalg.norm(n,axis=2);extra['decoded_normal_length_min_mean_max']=[float(length.min()),float(length.mean()),float(length.max())]
 data=dst.read_bytes();out.append(dict(path=str(dst.relative_to(root)),url='/'+str(dst.relative_to(root/'public')),bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),dimensions=dims,source=r['path'],source_sha256=r['sha256'],role=role,asset=asset,operation=operation,**extra))
(source/'prepared-assets.json').write_text(json.dumps({'assets':out,'total_public_bytes':sum(x['bytes'] for x in out)},indent=2)+'\n')
print(json.dumps({'assets':[{k:r[k] for k in ['url','dimensions','bytes']} for r in out],'total_bytes':sum(x['bytes'] for x in out)},indent=2))
