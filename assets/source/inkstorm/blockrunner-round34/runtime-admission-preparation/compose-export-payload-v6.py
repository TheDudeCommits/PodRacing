#!/usr/bin/env python3
"""Read actual V6 clamp receipts and compose an explicitly guarded MCP payload. Never executes Blender."""
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
    assignments={'BLOCKRUNNER_AUDIT':{'sourceSignature':audit['sourceSignature']},
                 'BLOCKRUNNER_FIT':{k:fit[k] for k in ['targetScene','fitSignature','fitCornerNormalSignature']},
                 'BLOCKRUNNER_PAINT_STATE':{k:state[k] for k in state_keys},
                 'BLOCKRUNNER_NORMALIZATION':json.loads((BASE/'normalization-candidate-v1.json').read_text()),
                 'BLOCKRUNNER_EXPORT_TOKEN':a.token}
    text='\n'.join((BASE/'mcp-safe'/f).read_text() for f in ['00-source-reference.py','01-source-guard.py','13-v4-attribute-signatures.py','14-atlas-wrap-guards.py'])+'\n'
    text+='\n'.join(name+' = json.loads('+repr(json.dumps(value,allow_nan=False,separators=(',',':')))+')' for name,value in assignments.items())+'\n'
    text+=(HERE/'12-copy-normalize-export-v6.py').read_text()
    ast.parse(text)
    assert len(text.encode('utf-8'))<200000, 'MCP payload exceeds 200000-byte budget.'
    export.parent.mkdir(exist_ok=True)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    with a.output.open('x') as f:f.write(text)
    print(json.dumps({'status':'prepared only; not executed','payload':str(a.output),'sha256':hashlib.sha256(text.encode()).hexdigest(),'state':str(a.state),'stateSha256':hashlib.sha256(a.state.read_bytes()).hexdigest(),'expectedNewExport':str(export)},indent=2))
if __name__=='__main__':main()
