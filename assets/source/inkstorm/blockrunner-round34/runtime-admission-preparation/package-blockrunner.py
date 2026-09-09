#!/usr/bin/env python3
"""PREPARED ONLY: normalize POSITION once, canonicalize five rigid atlas primitives,
resize four atlases, and write NEW private hero/rival candidates. No Blender or
public/runtime writes. Bundled workspace Python requires Pillow + numpy.
"""
import argparse, copy, hashlib, importlib.util, io, json, math, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent; BASE=HERE.parent; REPO=BASE.parents[3]
SUPPORT=REPO/'assets/source/inkstorm/polwo-driver-round32'
sys.path.insert(0,str(SUPPORT))
from _polwo_glb import read_glb, write_glb_bytes, accessor_bytes, accessor_values, view_bytes, texture_infos, image_source, mip_bytes, sha
# Shared color/data filtering implementation; this module has no top-level writes.
spec=importlib.util.spec_from_file_location('_blockrunner_resize_support',SUPPORT/'package-polwo-runtime.py')
resize_support=importlib.util.module_from_spec(spec);spec.loader.exec_module(resize_support)
ROLES=('suit','helmet','visor','gloves')
MATERIALS=['Blockrunner Inkstorm body atlas v1']+['Blockrunner Inkstorm pilot '+r+' atlas v1' for r in ROLES]
NAMES=['blockrunner-body']+['blockrunner-pilot-'+r for r in ROLES]

def normalize(doc,binary,receipt,profile):
    original=copy.deepcopy(doc); values={i:accessor_bytes(doc,binary,i) for i in range(len(doc['accessors']))}
    position_indices=set();maximum_error=0.0;candidate_transform_delta=0.0;transform_rows=[];new_nodes=[];new_meshes=[];role_by_material={}
    expected={row['role']:row for row in receipt['ownerCopies']}
    if profile=='hero':
        assert len(doc['nodes'])==2 and len(doc['meshes'])==2 and len(doc['scenes'])==1
        assert sorted(doc['scenes'][doc.get('scene',0)]['nodes'])==[0,1]
        nodes={n['name']:n for n in doc['nodes']}
        ordered=[(role,nodes[expected[role]['exportObject']]) for role in ('body','pilot')]
    else:
        assert len(doc['nodes'])==5 and len(doc['meshes'])==5
        nodes={n['name']:n for n in doc['nodes']};assert set(nodes)==set(NAMES)
        ordered=[('body' if i==0 else ROLES[i-1],nodes[n]) for i,n in enumerate(NAMES)]
    transformed={}
    for role,node in ordered:
        assert not node.get('children') and 'skin' not in node and 'matrix' not in node
        assert node.get('rotation',[0,0,0,1])==[0,0,0,1]
        scale=node.get('scale',[1,1,1]);translation=node.get('translation',[0,0,0])
        assert all(math.isfinite(x) for x in [*scale,*translation]) and min(scale)>0
        assert max(scale)-min(scale)<=1e-7, 'Nonuniform transforms need explicit normal handling.'
        if profile=='hero':assert max(abs(x-1.6) for x in scale)<=1e-6
        else:assert scale==[1,1,1] and translation==[0,0,0]
        transform_rows.append({'sourceNode':node['name'],'encodedScale':scale,'encodedTranslation':translation})
        primitives=doc['meshes'][node['mesh']]['primitives']
        assert len(primitives)==(4 if profile=='hero' and role=='pilot' else 1)
        for prim in primitives:
            assert prim.get('mode',4)==4 and not prim.get('targets')
            assert not any(s.startswith('COLOR_') for s in prim['attributes']), 'Authoring mask vertex colors must not ship or tint the atlas.'
            material_index=prim['material'];material=doc['materials'][material_index]
            if profile=='hero':
                source_material=material.get('name')
                if role=='body':assert source_material==expected['body']['materials'][0];canonical=0
                else:canonical=1+expected['pilot']['materials'].index(source_material)
            else:canonical=MATERIALS.index(material['name'])
            if material_index in role_by_material:assert role_by_material[material_index]==canonical
            role_by_material[material_index]=canonical
            ai=prim['attributes']['POSITION'];accessor=doc['accessors'][ai]
            assert accessor['componentType']==5126 and accessor['type']=='VEC3'
            matrix_key=tuple(scale+translation)
            if ai in transformed:assert transformed[ai]==matrix_key
            else:
                before=list(accessor_values(original,binary,ai));points=[]
                for p in before:
                    exact=tuple(p[k]*scale[k]+translation[k] for k in range(3))
                    if profile=='hero':
                        t=receipt['normalization']['blenderWorldTranslation'];nominal_t=(t[0],t[2],-t[1])
                        nominal=tuple(p[k]*receipt['normalization']['blenderWorldUniformScale']+nominal_t[k] for k in range(3))
                        candidate_transform_delta=max(candidate_transform_delta,*[abs(exact[k]-nominal[k]) for k in range(3)])
                    after=struct.unpack('<fff',struct.pack('<fff',*exact));points.append(after)
                    maximum_error=max(maximum_error,*[abs(after[k]-exact[k]) for k in range(3)])
                assert maximum_error<=1e-6, 'POSITION float32 conversion exceeded 1 micrometre.'
                values[ai]=b''.join(struct.pack('<fff',*p) for p in points)
                accessor['min']=[min(p[k] for p in points) for k in range(3)]
                accessor['max']=[max(p[k] for p in points) for k in range(3)]
                position_indices.add(ai);transformed[ai]=matrix_key
            new_meshes.append({'name':NAMES[canonical],'primitives':[copy.deepcopy(prim)]})
            new_nodes.append({'name':NAMES[canonical],'mesh':len(new_meshes)-1})
    assert {n['name'] for n in new_nodes}==set(NAMES) and len(new_nodes)==5
    assert len(role_by_material)==5 and set(role_by_material.values())==set(range(5))
    for i,canonical in role_by_material.items():doc['materials'][i]['name']=MATERIALS[canonical]
    doc['nodes']=new_nodes;doc['meshes']=new_meshes;doc['scenes']=[{'name':'Blockrunner normalized '+profile,'nodes':list(range(5))}];doc['scene']=0
    return values,position_indices,maximum_error,role_by_material,candidate_transform_delta,transform_rows

def package(args):
    source=args.input.resolve();output=args.output.resolve();receipt_path=output.with_suffix('.package-receipt.json')
    assert output.is_relative_to(BASE) and source!=output and not output.exists() and not receipt_path.exists()
    raw,original,binary=read_glb(source);assert sha(raw)==args.expected_input_sha256
    export=json.loads(args.export_receipt.read_text());assert export['normalized'] and export['normalizationAppliedExactlyOnce']
    assert export['triangles']==44028 and export['meshObjects']==2
    assert all(export[k] for k in ['sourcePreservation','fitPreservation','paintPreservation','paintCornerNormalsPreserved','paintImageIdentitiesPreserved'])
    if args.profile=='hero':assert Path(export['path']).resolve()==source
    else:
        assert args.lod_receipt is not None
        lod=json.loads(args.lod_receipt.read_text());assert lod['outputSha256']==sha(raw)
        assert lod['pilotAccessorBytesExact'] and lod['protectedSurfaceTrianglesExact']
    assert not original.get('animations') and not original.get('skins')
    doc=copy.deepcopy(original)
    values,changed_positions,error,owners,candidate_transform_delta,transform_rows=normalize(doc,binary,export,args.profile)
    images_roles={}
    for mi,m in enumerate(doc['materials']):
        owner='body' if owners[mi]==0 else 'pilot'
        assert m.get('alphaMode','OPAQUE')=='OPAQUE'
        assert m.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1])==[1,1,1,1]
        slots=list(texture_infos(m));assert {k for k,v in slots}=={'baseColorTexture','metallicRoughnessTexture'}
        for slot,info in slots:
            image=image_source(doc['textures'][info['index']]);role='color' if slot=='baseColorTexture' else 'data'
            if image in images_roles:assert images_roles[image]==(owner,role)
            images_roles[image]=(owner,role)
    assert len(doc['images'])==len(images_roles)==4
    images=[];encoded_images={}
    for i,im in enumerate(doc['images']):
        assert 'bufferView'in im and 'uri' not in im
        payload=view_bytes(original,binary,im['bufferView']);owner,role=images_roles[i]
        cap=(1024 if role=='color' else 512) if args.profile=='hero' else (512 if role=='color' else 256)
        resized,before,after=resize_support.resize_image(payload,role,cap)
        assert tuple(after)==(cap,cap), 'Require full square owner image cap; do not silently upscale.'
        encoded_images[i]=resized;im['mimeType']='image/png'
        images.append({'image':i,'owner':owner,'role':'baseColor' if role=='color' else 'roughnessG','beforeSize':before,'size':after,'inputSha256':sha(payload),'sha256':sha(resized),'bytes':len(resized),'rgba8FullMipBytes':mip_bytes(*after)})
    # Rebuild compact views. POSITION alone changes; every NORMAL/UV/index accessor is exact.
    packed=bytearray();views=[]
    def append(data,target=None):
        packed.extend(b'\0'*(-len(packed)%4));v={'buffer':0,'byteOffset':len(packed),'byteLength':len(data)}
        if target:v['target']=target
        views.append(v);packed.extend(data);return len(views)-1
    for i,accessor in enumerate(doc['accessors']):
        oldview=original['bufferViews'][original['accessors'][i]['bufferView']]
        accessor['bufferView']=append(values[i],oldview.get('target'));accessor.pop('byteOffset',None)
    for i,im in enumerate(doc['images']):im['bufferView']=append(encoded_images[i])
    doc['bufferViews']=views;doc['buffers']=[{'byteLength':len(packed)}]
    triangles=body=pilot=0
    for node in doc['nodes']:
        prim=doc['meshes'][node['mesh']]['primitives'][0]
        n=doc['accessors'][prim['indices']]['count'];assert n%3==0
        triangles+=n//3
        if node['name']=='blockrunner-body':body+=n//3
        else:pilot+=n//3
    assert pilot==4128 and triangles<= (60000 if args.profile=='hero' else 30000)
    if args.profile=='hero':assert body==39900 and triangles==44028
    decoded=sum(i['rgba8FullMipBytes'] for i in images);assert decoded<=(24 if args.profile=='hero' else 6)*1048576
    final=write_glb_bytes(doc,bytes(packed));assert len(final)<=12*1048576
    for i in range(len(doc['accessors'])):
        assert accessor_bytes(doc,bytes(packed),i)==values[i]
        if i not in changed_positions:assert values[i]==accessor_bytes(original,binary,i)
    assert source.read_bytes()==raw
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('xb') as f:f.write(final)
    result={'status':'private package candidate; actual asset/lifecycle/art validation pending','profile':args.profile,
        'path':str(output),'sha256':sha(final),'bytes':len(final),'triangles':triangles,'bodyTriangles':body,'pilotTriangles':pilot,
        'draws':5,'bodyDraws':1,'pilotDraws':4,'input':str(source),'inputSha256':sha(raw),
        'exportReceipt':str(args.export_receipt.resolve()),'exportReceiptSha256':sha(args.export_receipt.read_bytes()),
        'maximumPositionFloat32ErrorMeters':error,
        'maximumEncodedBlenderObjectTransformVsNominalCandidateCoordinateDeltaMeters':candidate_transform_delta,
        'encodedSourceNodeTransforms':transform_rows,
        'coordinateComparisonScope':'POSITION float32 write error <=1e-6 relative to actual encoded transform. Encoded Blender transform versus nominal double-precision candidate reported separately without conflating it with this bound.','allMeshRootTransformsIdentity':True,'normalUvIndexAccessorBytesExact':True,
        'textureImages':images,'rgba8FullMipBytes':decoded,'runtimeReady':False,
        'textureFiltering':'linear-light sRGB color; linear scalar RGB data; G roughness retained; no repaint/normal map',
        'embeddedPilotNodePrefix':'blockrunner-pilot-','materialNames':MATERIALS,
        'attachments':{'pilot':{'position':export['normalization']['candidatePilotGame']},
            'exhaustLeft':{'position':export['normalization']['nozzles'][0]['candidateGameCenter']},
            'exhaustRight':{'position':export['normalization']['nozzles'][1]['candidateGameCenter']}},
        'exhaustApertureRadius':.34,'couplingOmitted':'Source rigid crossbeam already connects engines; no duplicate animated tube.',
        'sourceLineage':export['objectLineage']}
    with receipt_path.open('x') as f:json.dump(result,f,indent=2);f.write('\n')
    print(json.dumps({k:result[k] for k in ['path','sha256','bytes','triangles','draws','runtimeReady']},indent=2))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',required=True,type=Path);p.add_argument('--expected-input-sha256',required=True)
    p.add_argument('--export-receipt',required=True,type=Path);p.add_argument('--output',required=True,type=Path)
    p.add_argument('--profile',choices=['hero','rival'],required=True);p.add_argument('--lod-receipt',type=Path)
    package(p.parse_args())
if __name__=='__main__':main()
