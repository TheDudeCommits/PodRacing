"""Repack only the four new runtime GLBs; requires Pillow, leaves preserved sources untouched."""
import io,json,struct,hashlib,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2]
for receipt in (root/'assets/source/inkstorm/roster-round46').glob('*.json'):
 if sys.argv[1:] and receipt.stem not in sys.argv[1:]:continue
 r=json.loads(receipt.read_text())
 for variant in r['variants'].values():
  path=root/variant['path'];data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);binary=data[28+n:]
  for tex in doc.get('textures',[]):
   ext=tex.get('extensions',{}).pop('EXT_texture_webp',None)
   if ext is not None:tex['source']=ext['source']
   if tex.get('extensions')=={}:tex.pop('extensions')
  for key in ['extensionsUsed','extensionsRequired']:
   if key in doc:doc[key]=[x for x in doc[key] if x!='EXT_texture_webp']
  images={im['bufferView']:im for im in doc.get('images',[]) if 'bufferView' in im};new=bytearray()
  for i,view in enumerate(doc['bufferViews']):
   start=view.get('byteOffset',0);block=binary[start:start+view['byteLength']]
   if i in images:
    meta=images[i];im=Image.open(io.BytesIO(block));im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
    out=io.BytesIO()
    # Keep normal/ORM maps lossless; opaque albedo and pilot pigment can use JPEG.
    is_color=any(t.get('pbrMetallicRoughness',{}).get('baseColorTexture',{}).get('index') in [j for j,x in enumerate(doc.get('textures',[])) if x.get('source')==doc['images'].index(meta)] for t in doc.get('materials',[]))
    if is_color:im.convert('RGB').save(out,format='JPEG',quality=92,subsampling=0);meta['mimeType']='image/jpeg'
    else:
     limit=512 if 'rival' in path.name else 768
     im.thumbnail((limit,limit),Image.Resampling.LANCZOS);im.save(out,format='PNG',optimize=True);meta['mimeType']='image/png'
    block=out.getvalue()
   while len(new)%4:new.append(0)
   view['byteOffset']=len(new);view['byteLength']=len(block);new.extend(block)
  while len(new)%4:new.append(0)
  doc['buffers'][0]['byteLength']=len(new);js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
  out=struct.pack('<III',0x46546c67,2,28+len(js)+len(new))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(new),0x004e4942)+new
  path.write_bytes(out);variant.update(bytes=len(out),sha256=hashlib.sha256(out).hexdigest(),textureLimit=1024)
 receipt.write_text(json.dumps(r,indent=2)+'\n')
 print(r['id'],{k:v['bytes'] for k,v in r['variants'].items()})
