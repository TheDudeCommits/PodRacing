#!/usr/bin/env python3
"""Lossless runtime texture transcode. Keeps original GLBs/geometry/nodes unchanged.
Requires Pillow with libwebp; emits exact hashes and verifies decoded pixel identity.
EXT_texture_webp (Khronos): textures reference WebP through the required extension.
"""
import io,json,struct,hashlib
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
NAMES=['teemto-hero-open-v2','teemto-rival','sebulba-hero','sebulba-rival','polwo-hero-v1','polwo-rival-v1','blockrunner-hero-v1','blockrunner-rival-v1']+[f'{p}-{lod}-v1' for p in ['verdigris','skybolt','needle','pog'] for lod in ['hero','rival']]
OUT=ROOT/'public/assets/inkstorm/vehicles/optimized';OUT.mkdir(exist_ok=True)
hash=lambda b:hashlib.sha256(b).hexdigest()
receipts=[]
for name in NAMES:
 source=ROOT/'public/assets/inkstorm/vehicles'/f'{name}.glb';raw=source.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);binary=raw[28+n:]
 replacements={};converted=set();images=[]
 for idx,img in enumerate(doc.get('images',[])):
  if 'bufferView' not in img:continue
  vi=img['bufferView'];v=doc['bufferViews'][vi];old=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  im=Image.open(io.BytesIO(old)).convert('RGBA');buf=io.BytesIO();im.save(buf,format='WEBP',lossless=True,method=6,exact=True);new=buf.getvalue()
  if len(new)>=len(old):continue
  assert Image.open(io.BytesIO(new)).convert('RGBA').tobytes()==im.tobytes()
  replacements[vi]=new;converted.add(idx);img['mimeType']='image/webp'
  images.append({'image':idx,'sourceBytes':len(old),'bytes':len(new),'decodedRgbaSha256':hash(im.tobytes())})
 for tex in doc.get('textures',[]):
  if tex.get('source') in converted:
   tex.setdefault('extensions',{})['EXT_texture_webp']={'source':tex.pop('source')}
 if converted:
  for key in ['extensionsUsed','extensionsRequired']:
   doc[key]=list(dict.fromkeys(doc.get(key,[])+['EXT_texture_webp']))
 chunks=[];length=0
 for idx,v in enumerate(doc['bufferViews']):
  payload=replacements.get(idx,binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
  pad=(-length)%4
  if pad:chunks.append(b'\0'*pad);length+=pad
  v['byteOffset']=length;v['byteLength']=len(payload);chunks.append(payload);length+=len(payload)
 outbin=b''.join(chunks);doc['buffers'][0]['byteLength']=len(outbin);outbin+=b'\0'*((-len(outbin))%4)
 outjson=json.dumps(doc,separators=(',',':')).encode();outjson+=b' '*((-len(outjson))%4)
 result=struct.pack('<III',0x46546c67,2,28+len(outjson)+len(outbin))+struct.pack('<II',len(outjson),0x4e4f534a)+outjson+struct.pack('<II',len(outbin),0x004e4942)+outbin
 target=OUT/f'{name}-r48.glb';target.write_bytes(result)
 receipt={'source':str(source.relative_to(ROOT)),'sourceSha256':hash(raw),'runtime':str(target.relative_to(ROOT)),'sha256':hash(result),'sourceBytes':len(raw),'bytes':len(result),'operation':'Lossless WebP with exact RGBA verification; geometry buffer views byte-identical','images':images}
 receipts.append(receipt);print(name,len(raw),'->',len(result),flush=True)
report=ROOT/'assets/source/inkstorm/runtime-round48.json';report.write_text(json.dumps(receipts,indent=2)+'\n')
print('TOTAL',sum(x['sourceBytes'] for x in receipts),'->',sum(x['bytes'] for x in receipts),flush=True)
