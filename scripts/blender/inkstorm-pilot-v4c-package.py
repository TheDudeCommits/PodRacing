"""Material-only GLB sibling: preserve V4B geometry and map data exactly."""
from pathlib import Path
import hashlib
import json
import struct
import subprocess

ROOT=Path('/Users/amir/Projects/PodRacing')
BASE=ROOT/'assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c'
SOURCE=BASE.parent/'pilot-v4b/teemto-pilot-v4b-runtime.glb'
CLI='/Users/amir/.npm/_npx/6e1a7b84fabb98f4/node_modules/@gltf-transform/cli/bin/cli.js'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


if __name__=='__main__':
    data=SOURCE.read_bytes()
    length,kind=struct.unpack_from('<II',data,12)
    assert kind==0x4E4F534A
    doc=json.loads(data[20:20+length])
    binary=bytearray(data[28+length:])
    image_index=next(i for i,image in enumerate(doc['images']) if image['name']=='pilot-color-atlas-v4b')
    new_image=(BASE/'pilot-color-atlas-v4c.png').read_bytes()
    binary+=bytes(-len(binary)%4)
    image_offset=len(binary)
    binary+=new_image
    binary+=bytes(-len(binary)%4)
    view=doc['bufferViews'][doc['images'][image_index]['bufferView']]
    view['byteOffset']=image_offset
    view['byteLength']=len(new_image)
    doc['images'][image_index]['name']='pilot-color-atlas-v4c'
    doc['images'][image_index]['mimeType']='image/png'
    for texture in doc['textures']:
        ext=texture.get('extensions',{}).get('EXT_texture_webp')
        if ext and ext['source']==image_index:
            del texture['extensions']['EXT_texture_webp']
            if not texture['extensions']:del texture['extensions']
            texture['source']=image_index
    renamed=[]
    for material in doc['materials']:
        if material['name'].startswith('Pilot atlas v4b runtime '):
            material['name']=material['name'].replace('v4b','v4c')
            renamed.append(material['name'])
    assert len(renamed)==6
    doc['buffers'][0]['byteLength']=len(binary)
    encoded=json.dumps(doc,separators=(',',':')).encode()
    encoded+=b' '*(-len(encoded)%4)
    intermediate=BASE/'teemto-pilot-v4c-color-png.glb'
    intermediate.write_bytes(struct.pack('<III',0x46546C67,2,28+len(encoded)+len(binary))
        +struct.pack('<II',len(encoded),0x4E4F534A)+encoded
        +struct.pack('<II',len(binary),0x004E4942)+binary)
    runtime=BASE/'teemto-pilot-v4c-runtime.glb'
    command=['node',CLI,'webp',str(intermediate),str(runtime),'--slots','baseColorTexture',
             '--formats','png','--lossless','true','--effort','20']
    subprocess.run(command,check=True)
    receipt={'source':str(SOURCE),'sourceSha256':digest(SOURCE),'runtime':str(runtime),
             'sha256':digest(runtime),'bytes':runtime.stat().st_size,
             'materialNames':renamed,'colorConversion':'lossless WebP encoding only; no raster edits',
             'geometryRegenerated':False,'normalOrRoughnessRebaked':False,'command':command}
    (BASE/'package-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
