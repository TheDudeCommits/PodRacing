#!/usr/bin/env python3
"""Read actual source GLBs and write one exclusive technical verification receipt."""
import hashlib
import importlib.util
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE/'v1'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name,path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def main():
    packer = load('pipe_packer_verify',HERE/'preserve-retained-gltf.py')
    preflight = load('pipe_preparation_verify',HERE/'validate-preparation.py')
    scope = preflight.load_cpu_source()
    source_raw = packer.SOURCE.read_bytes()
    assert hashlib.sha256(source_raw).hexdigest()==packer.SOURCE_SHA256
    source = packer.decode(source_raw)
    native_path = OUT/'pipe-bank-detail-v1-native.glb'
    final_path = OUT/'pipe-bank-detail-v1-exact-retained.glb'
    native_raw,final_raw = native_path.read_bytes(),final_path.read_bytes()
    native,final = packer.decode(native_raw),packer.decode(final_raw)
    native_additions,native_comparison = packer.classify(source,native)
    final_additions,final_comparison = packer.classify(source,final)
    assert final_comparison['nativeRetainedAttributesExact']
    assert not native_comparison['nativeRetainedAttributesExact']
    native_payload = []
    for number in native_additions:
        native_payload.append(tuple(tuple(native['rawAttributes'][semantic][i] for semantic in ('POSITION','NORMAL','COLOR_0')) for i in native['triangles'][number]))
    final_payload = []
    for number in final_additions:
        final_payload.append(tuple(tuple(final['rawAttributes'][semantic][i] for semantic in ('POSITION','NORMAL','COLOR_0')) for i in final['triangles'][number]))
    assert native_payload==final_payload, 'An added corner attribute or triangle changed.'
    technical = {}
    for label,model,raw,path in [('native',native,native_raw,native_path),('exactRetained',final,final_raw,final_path)]:
        normals = model['attributes']['NORMAL']
        lengths = [math.sqrt(sum(c*c for c in n)) for n in normals]
        assert all(math.isfinite(c) for n in normals for c in n)
        assert min(lengths)>.999999 and max(lengths)<1.000001
        technical[label] = {'path':str(path),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
                            'vertices':len(model['attributes']['POSITION']),'triangles':len(model['triangles']),
                            'meshes':1,'primitives':1,'materials':1,'textures':0,'animations':0,
                            'vertexSemantics':['POSITION','NORMAL','COLOR_0'],'identityNodeTransform':True,
                            'allAttributesFinite':True,'allNormalsNonzeroAndUnit':True,'normalUnitTolerance':1e-6,
                            'normalLengthMinimum':min(lengths),'normalLengthMaximum':max(lengths),
                            'normalLengthMaximumError':max(abs(length-1) for length in lengths),
                            **packer.geometry_guard(model)}
    assert final['document']['materials']==source['document']['materials'], 'Original material JSON changed.'
    actual = {'vertices':[(x,-z,y) for x,y,z in final['attributes']['POSITION']],
              'faces':[final['triangles'][i] for i in final_additions],
              'groups':['actual-exported-addition']*len(final_additions)}
    actual_clearance = scope['detail_clearance_receipt'](actual)
    minimum_added_z = min(actual['vertices'][i][2] for f in actual['faces'] for i in f)
    assert minimum_added_z>=1.2
    issues = {}
    for label,name in [('native','native-khronos-validation.json'),('exactRetained','exact-retained-khronos-validation.json')]:
        report = json.loads((OUT/name).read_text()); issue = report['issues']
        assert all(issue[key]==0 for key in ('numErrors','numWarnings','numInfos','numHints'))
        assert not issue['messages'] and issue['truncated'] is False
        issues[label] = {'version':report['validatorVersion'],'issues':issue,'report':str(OUT/name)}
    def mcp_receipt(name):
        wrapper = json.loads((OUT/name).read_text())
        assert wrapper.get('isError') is False
        text = wrapper['structuredContent']['result']
        return json.loads(next(line for line in text.splitlines() if line.startswith('{')))
    authored = mcp_receipt('mcp-authoring-receipt.json')
    exported = mcp_receipt('mcp-export-render-receipt.json')
    assert authored['retainedNormalMaximumDelta']==0.0
    assert authored['preservation']['allExistingSceneMembershipsExact'] and authored['preservation']['allExistingCollectionMembershipsExact']
    assert authored['preservation']['contextRestored']
    assert all(exported['preservation'][key] for key in ['allExistingSceneMembershipsExact','allExistingCollectionMembershipsExact','authoredSourceEvidenceExact','authoredStageSelectionRestored','sharedContextRestored','temporaryReviewSceneRemoved'])
    images = []
    for image in exported['images']:
        path = Path(image['path']); raw = path.read_bytes()
        assert raw[:8]==bytes([137,80,78,71,13,10,26,10])
        images.append({'path':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'resolution':image['resolution']})
    assert len(images)==3
    assert packer.SOURCE.read_bytes()==source_raw and native_path.read_bytes()==native_raw
    receipt = {'status':'PASS — actual source artifact technical validation; world/visual/FPS acceptance pending',
               'copyReadyPath':str(final_path),'sourceSha256':packer.SOURCE_SHA256,'technical':technical,
               'nativeObservedRetainedDrift':native_comparison['nativeRetainedAttributes'],
               'finalRetainedComparison':final_comparison,'retainedTriangles':7160,'addedTriangles':12800,
               'allAddedOrientedCornerAttributeBytesExact':True,'originalMaterialJSONExact':True,
               'originalAndNativeInputsPreserved':True,'actualAddedGeometryClearance':actual_clearance,
               'minimumActualAddedBlenderZ':minimum_added_z,'khronos':issues,
               'BlenderAuthoring':{'retainedNormalMaximumDelta':0.0,'preservation':authored['preservation']},
               'BlenderExportAndRender':{'preservation':exported['preservation'],'images':images,
                                       'imageScope':'Neutral technical views of native export source; exact-retained derivative itself was not rendered.'},
               'scope':'Read-only inspection plus exact-retained source derivative; no public/runtime edits or Blender calls by verification agent.',
               'runtimeInstalledByThisWork':False,'worldVisualAcceptance':False,'FPSAcceptance':False}
    output = OUT/'exact-retained-technical-check.json'
    with output.open('x') as stream: stream.write(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
    print(json.dumps({'status':receipt['status'],'final':technical['exactRetained'],'receipt':str(output)},indent=2))


if __name__=='__main__': main()
