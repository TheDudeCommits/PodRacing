#!/usr/bin/env python3
"""CPU-only source preflight. Does not import bpy or create a candidate GLB."""
import ast
import collections
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
AUTHOR = HERE/'author-pipe-detail-mcp-safe.py'
EXPORT = HERE/'export-render-pipe-detail-mcp-safe.py'


def load_cpu_source():
    tree = ast.parse(AUTHOR.read_text())
    allowed_imports = {'bpy','math','json','collections','mathutils'}
    forbidden_names = {'open','eval','exec','compile','getattr','setattr','os','Path','hashlib','subprocess'}
    for path in [AUTHOR,EXPORT]:
        parsed = ast.parse(path.read_text())
        compile(parsed,str(path),'exec')
        for node in ast.walk(parsed):
            if isinstance(node,ast.Import): assert all(n.name in allowed_imports for n in node.names)
            if isinstance(node,ast.ImportFrom): assert node.module in allowed_imports
            if isinstance(node,ast.Name): assert node.id not in forbidden_names and '__' not in node.id, (path,node.id)
            if isinstance(node,ast.Attribute): assert '__' not in node.attr and node.attr not in {'save_as_mainfile','save_mainfile','normals_split_custom_set'}
            assert not isinstance(node,ast.Lambda)
    # Pure arithmetic definitions are isolated from imports and the final Blender
    # invocation. Defining the Blender function body does not evaluate it.
    pure = ast.Module(body=[n for n in tree.body if isinstance(n,(ast.Assign,ast.FunctionDef))],type_ignores=[])
    scope = {'math':math,'json':json,'collections':collections}
    exec(compile(pure,str(AUTHOR),'exec'),scope)
    return scope


def decode_source():
    spec = importlib.util.spec_from_file_location('pipe_source_packer',HERE/'preserve-retained-gltf.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    raw = module.SOURCE.read_bytes()
    assert module.sha(raw)==module.SOURCE_SHA256
    source = module.decode(raw)
    assert len(source['triangles'])==7160
    return module,raw,source


def main():
    scope = load_cpu_source()
    module,raw,source = decode_source()
    predecessor = json.loads((HERE/'predecessor-receipt.json').read_text())
    for original,receipt in predecessor.items():
        live = (ROOT/original).read_bytes(); copy = (ROOT/receipt['copy']).read_bytes()
        assert live==copy and len(live)==receipt['bytes']
        assert hashlib.sha256(live).hexdigest()==receipt['sha256']
    data = scope['build_pipe_detail_geometry']()
    summary = scope['geometry_summary'](data)
    assert summary['candidateTriangles']==19960 and summary['candidateTriangles']<=scope['TRIANGLE_CAP']
    assert len(data['faces'])==len(data['colors'])==len(data['smooth'])==len(data['groups'])
    assert all(scope['BOUNDS'][k][0]<=p[k]<=scope['BOUNDS'][k][1] for p in data['vertices'] for k in range(3))
    assert summary['floorMinimumZ']>=1.2
    assert all(math.isfinite(c) for p in data['vertices'] for c in p)
    assert all(all(0<=c<=1 for c in color) and color[3]==1 for color in data['colors'])
    minimum_area = math.inf; triangles = []
    for face,group in zip(data['faces'],data['groups']):
        assert len(face)>=3 and len(set(face))==len(face)
        assert min(face)>=0 and max(face)<len(data['vertices'])
        for i in range(1,len(face)-1):
            ids = [face[0],face[i],face[i+1]]
            a,b,c = [data['vertices'][j] for j in ids]
            normal = scope['cross'](scope['sub'](b,a),scope['sub'](c,a))
            double_area = math.sqrt(scope['dot'](normal,normal))
            assert double_area>1e-7, (group,ids,double_area)
            minimum_area = min(minimum_area,double_area*.5)
            triangles.append(ids)
    assert len(triangles)==12800
    clearance = scope['detail_clearance_receipt'](data)
    points = [(x,-z,y) for x,y,z in source['attributes']['POSITION']]
    terminal_receipts = []
    for kind,items in [('connected',scope['SOCKETS']),('free',scope['TERMINALS'])]:
        for (center,axis,radius),expected in zip(items,[14,10,12]):
            indices = [n for n,t in enumerate(source['triangles']) if all(
                abs(scope['dot'](scope['sub'](points[i],center),axis))<2e-4
                and scope['dot'](scope['sub'](points[i],center),scope['sub'](points[i],center))<=(radius+.0002)**2 for i in t)]
            assert len(indices)==expected
            terminal_receipts.append({'kind':kind,'centerBlender':center,'axisBlender':axis,'radius':radius,
                                      'sourceTriangles':indices,'sourcePreserved':True,
                                      'addedTreatment':'none' if kind=='connected' else 'paired annular flanges and inset pressure dish'})
    # Exercise the external byte-preservation classifier/packer in memory using
    # exact predecessor records plus CPU-generated geometry. No candidate GLB is
    # written, and this does not simulate Blender import/export acceptance.
    extra_positions = [(x,z,-y) for x,y,z in data['vertices']]
    positions = source['attributes']['POSITION']+extra_positions
    raw_attributes = {key:list(rows) for key,rows in source['rawAttributes'].items()}
    raw_attributes['POSITION'] += [struct.pack('<3f',*p) for p in extra_positions]
    raw_attributes['NORMAL'] += [struct.pack('<3f',0,1,0) for _ in extra_positions]
    raw_attributes['COLOR_0'] += [struct.pack('<3f',.2,.3,.4) for _ in extra_positions]
    attrs = {key:[struct.unpack('<3f',row) for row in rows] for key,rows in raw_attributes.items()}
    offset = len(source['attributes']['POSITION'])
    native = {'document':json.loads(json.dumps(source['document'])),'attributes':attrs,'rawAttributes':raw_attributes,
              'formats':source['formats'],'triangles':source['triangles']+[tuple(i+offset for i in t) for t in triangles]}
    native['document']['nodes'][0]['name'] = scope['FAMILY']
    additions,classifier = module.classify(source,native)
    assert classifier['nativeRetainedAttributesExact'] and len(additions)==12800
    packed,proof = module.reconstruct(source,native,additions)
    assert proof['retainedPositionNormalColorBytesExact'] and proof['additionAttributesAndWindingPreserved']
    # Reject a true missing retained face, reversed retained face and moved face.
    mutation_results = {}
    for label,triangle in [('reversed',tuple(reversed(native['triangles'][0]))),('duplicate',native['triangles'][1])]:
        changed = dict(native); changed['triangles']=list(native['triangles']); changed['triangles'][0]=triangle
        try: module.classify(source,changed)
        except ValueError: mutation_results[label]='rejected'
        else: raise AssertionError('Classifier accepted '+label)
    bounds = [[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
    attribution_path = ROOT/'output/gauntlet/foundry-round33-attribution.json'
    placements = json.loads(attribution_path.read_text())['geometry']['placements']
    count = sum(p['family']=='pipe-bank' for p in placements)
    assert count==18
    receipt = {'status':'CPU source preparation PASS; Blender has not been invoked','sourceSha256':module.sha(raw),
               'sourceBytes':len(raw),'sourceTriangles':7160,'sourceBoundsBlender':bounds,
               'sourceMaterialSlots':1,'sourcePrimitives':1,'sourceTextures':0,
               'newGeometry':summary,'minimumAddedTriangleArea':minimum_area,'newGeometryClearance':clearance,
               'terminalAttribution':terminal_receipts,'safeModeAST':'pass; no filesystem/dynamic-code/bake/save APIs in MCP payloads',
               'mcpScriptsSha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [AUTHOR,EXPORT]},
               'packerCPUSelftest':{'scope':'Synthetic in-memory geometry only; not Blender-produced artifact or visual evidence.',
                                   'classifier':classifier,'exactRecordProof':proof,'mutationRejection':mutation_results,
                                   'inMemoryPackedBytes':len(packed),'noCandidateGLBWritten':True},
               'instanceBudget':{'authoritativeSource':str(attribution_path.relative_to(ROOT)),
                                 'sourceSha256':hashlib.sha256(attribution_path.read_bytes()).hexdigest(),
                                 'pipeBankPlacements':count,'allInstancesSinglePassTriangles':count*19960,
                                 'allInstancesSinglePassAddedTriangles':count*12800,
                                 'additionalDrawCalls':0,'additionalMaterials':0,'newTextures':0,
                                 'limit':'Upper bound assumes all18 banks visible; shadow/other passes multiply work. FPS still unmeasured.'},
               'runtimeInstalled':False,'BlenderInvoked':False,'renderedAcceptance':False,
               'preservation':'All original geometry, source paint, exact foundation/asset envelope and connected socket regions retained.'}
    (HERE/'preparation-receipt.json').write_text(json.dumps(receipt,indent=2,sort_keys=True)+'\n')
    print(json.dumps({'status':receipt['status'],'candidateTriangles':summary['candidateTriangles'],
                      'collectorIntersections':clearance['reservedCollectorAddedPolygonIntersections'],
                      'retainedTriangles':7160,'sourceBanks':count,'receipt':str(HERE/'preparation-receipt.json')},indent=2))


if __name__=='__main__': main()
