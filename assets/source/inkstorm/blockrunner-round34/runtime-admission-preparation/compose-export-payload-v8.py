#!/usr/bin/env python3
"""Read actual V8 contact atlas receipts and compose an explicitly guarded MCP payload. Never executes Blender."""
import argparse, ast, hashlib, json
from pathlib import Path
HERE = Path(__file__).resolve().parent
BASE = HERE.parent

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--state',type=Path,required=True)
    p.add_argument('--token',required=True)
    p.add_argument('--output',type=Path,required=True)
    a=p.parse_args()
    assert a.output.resolve().is_relative_to(BASE) and not a.output.exists()
    assert 6<=len(a.token)<=48 and all(c.isascii() and (c.isalnum() or c=='-') for c in a.token)
    export=BASE/'exports'/('blockrunner-'+a.token+'-normalized-master.glb')
    assert not export.exists(), 'Never overwrite a normalized export; choose a fresh token.'
    state=json.loads(a.state.read_text())
    assert state['sourceUid']=='a6f14ae799ab40d7ac425f043f824ff8'
    assert state['normalized'] is False and state['meshObjects']==2 and state['triangles']==44028
    assert state['materialSlots']=={'body':1,'pilot':4}
    assert state['materialDrawsBeforeAdditionalRenderPasses']==5
    for key in ['paintSignature','paintCornerNormalSignature','linkedPaintImages','bodyMeshName','pilotMeshName','targetScene','objectLineage']: assert key in state
    audit=json.loads((BASE/'mcp-safe/audit-receipt.json').read_text())
    fit=json.loads((BASE/'mcp-safe/control-fit-v1-receipt.json').read_text())
    state_keys=['sourceUid','meshObjects','triangles','materialSlots','materialDrawsBeforeAdditionalRenderPasses','normalized','targetScene','bodyMeshName','pilotMeshName','paintSignature','paintCornerNormalSignature','linkedPaintImages','objectLineage']
    for key in ['paintAttributeSignatures','atlasGraphSignatures','atlasPackedImageRecords']: assert key in state
    state_keys += ['paintAttributeSignatures','atlasGraphSignatures','atlasPackedImageRecords']
    assert len(state['atlasGraphSignatures']) == 5 and len(state['atlasPackedImageRecords']) == 4
    assert state['stage'] == 'copy-finalize-atlas-materials' and state['newSceneRetained']
    assert state['allTenAtlasNodesClamped'] and state['nonColorPrincipledResponsesMatchV6']
    assert state['proceduralContactGraphsMasksPackedImagesPreserved'] and state['v4bGeometryNormalsMasksGraphsAndImagesPreserved'] and state['v6AtlasPreserved']
    assert state['targetScene'] == 'PodRacing — Blockrunner Inkstorm finalized atlas round34 V8'
    v7=json.loads((BASE/'mcp-safe/bake-v7-pilot-color-receipt.json').read_text())
    v4b=json.loads((BASE/'mcp-safe/bake-v4b-pilot-roughness-receipt.json').read_text())
    v6=json.loads((BASE/'mcp-safe/atlas-clamp-v6-receipt.json').read_text())
    histories=[]
    for record, kind, graphs, images in [(v7,'contact',v7['contactGraphSignatures'],v7['packedImageRecords']),
                                        (v4b,'contact',None,v6['atlasPackedImageRecords']),
                                        (v6,'atlas',v6['atlasGraphSignatures'],v6['atlasPackedImageRecords'])]:
        guard={key:record[key] for key in ['targetScene','paintSignature','paintCornerNormalSignature','paintAttributeSignatures']}
        guard.update(graphKind=kind,graphs=graphs,packedImages=images)
        histories.append(guard)
    assignments={'BLOCKRUNNER_AUDIT':{'sourceSignature':audit['sourceSignature']},
                 'BLOCKRUNNER_FIT':{k:fit[k] for k in ['targetScene','fitSignature','fitCornerNormalSignature']},
                 'BLOCKRUNNER_PAINT_STATE':{k:state[k] for k in state_keys},
                 'BLOCKRUNNER_NORMALIZATION':json.loads((BASE/'normalization-candidate-v1.json').read_text()),
                 'BLOCKRUNNER_EXPORT_TOKEN':a.token,
                 'BLOCKRUNNER_V8_HISTORY_GUARDS':histories,
                 'BLOCKRUNNER_REUSED_ROUGHNESS':state['reusedRoughnessMasterAuthority'],
                 'BLOCKRUNNER_CONTACT_SETTINGS':state['contactSettingsBakedIntoColor']}
    text='\n'.join((BASE/'mcp-safe'/f).read_text() for f in ['00-source-reference.py','01-source-guard.py','13-v4-attribute-signatures.py','14-atlas-wrap-guards.py','15d-ao-contact-guards.py'])+'\n'
    text+='\n'.join(name+' = json.loads('+repr(json.dumps(value,allow_nan=False,separators=(',',':')))+')' for name,value in assignments.items())+'\n'
    text+=(HERE/'12-copy-normalize-export-v8.py').read_text()
    tree=ast.parse(text)
    for node in ast.walk(tree):
        assert not isinstance(node,ast.Lambda)
        if isinstance(node,ast.Import): assert all(x.name in {'bpy','math','json','collections','mathutils'} for x in node.names)
        if isinstance(node,ast.ImportFrom): assert node.module in {'bpy','math','json','collections','mathutils'}
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id in {'getattr','hasattr','setattr'}:
            assert isinstance(node.args[1],ast.Constant) and isinstance(node.args[1].value,str)
        if isinstance(node,ast.Name):
            assert node.id not in {'open','exec','eval','globals','locals','Path','os','hashlib','traceback'} and not node.id.startswith('__')
        if isinstance(node,ast.Attribute): assert not node.attr.startswith('__')
    assert len(text.encode('utf-8'))<200000, 'MCP payload exceeds 200000-byte budget.'
    export.parent.mkdir(exist_ok=True)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    with a.output.open('x') as f:f.write(text)
    receipt={'status':'prepared only; not executed','payload':str(a.output),'bytes':len(text.encode()),'sha256':hashlib.sha256(text.encode()).hexdigest(),'state':str(a.state),'stateSha256':hashlib.sha256(a.state.read_bytes()).hexdigest(),'expectedNewExport':str(export),'preservedHistories':['source','fit','V4B','V6 atlas','V7 procedural','V8 atlas','all preexisting scene memberships/context'],'normalization':'Existing V1 candidate applied exactly once as positive object transforms on new mesh copies; two named authoring masks removed only on export copies','colorSource':'Actual V7 new color masters; original V4B roughness masters reused','noNewLodSolve':True}
    preparation=a.output.with_suffix('.preparation.json')
    assert not preparation.exists()
    with preparation.open('x') as handle: json.dump(receipt,handle,indent=2);handle.write('\n')
    print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
