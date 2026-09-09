"""CPU-only preparation checks. Does not import bpy or run the authoring entrypoint.

This local preflight may use pathlib/hashlib. It is NOT the Blender MCP payload.
"""
import argparse
import ast
import collections
import hashlib
import json
import math
from pathlib import Path
import struct

FOLDER = Path(__file__).resolve().parent
ROOT = FOLDER.parents[3]
PURE_FUNCTIONS = {
    'add','sub','mul','dot','cross','unit','frame','new_geometry','part','box','tube','beam',
    'ring','sweep','wedge','bolt_circle','surface_point','build_service_geometry',
    'geometry_summary','clipped_clearance',
}
PURE_CONSTANTS = {'PAINT','RETAINED_TRIANGLES','PRACTICAL_CLEARANCE','TRIANGLE_CAP'}


def validate():
    script = FOLDER/'author-service-gantry-mcp-safe.py'
    text = script.read_text()
    tree = ast.parse(text)
    forbidden = {'open','exec','eval','compile','__import__','Path','hashlib','os','subprocess'}
    assert not any(isinstance(n,ast.Name) and n.id in forbidden for n in ast.walk(tree))
    imports = [n.names[0].name for n in tree.body if isinstance(n,ast.Import)]
    assert imports==['bpy','math','json','collections'], imports
    export_flag = next(n for n in tree.body if isinstance(n,ast.Assign)
                       and any(isinstance(t,ast.Name) and t.id=='EXPORT_CANDIDATE' for t in n.targets))
    assert ast.literal_eval(export_flag.value) is False, 'Prepared default must not export.'
    renderer = FOLDER/'export-render-service-gantry-mcp-safe.py'
    render_tree = ast.parse(renderer.read_text())
    assert not any(isinstance(n,ast.Name) and n.id in forbidden for n in ast.walk(render_tree))
    assert [n.names[0].name for n in render_tree.body if isinstance(n,ast.Import)]==['bpy','json','math']
    assert "source.get('sourcePreflightPassed') is True" in renderer.read_text()
    assert "camera_data.sensor_fit = 'HORIZONTAL'" in renderer.read_text()
    assert 'max(width,height*aspect)*1.14' in renderer.read_text()
    chosen = [n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in PURE_FUNCTIONS
              or isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in PURE_CONSTANTS for t in n.targets)]
    assert {n.name for n in chosen if isinstance(n,ast.FunctionDef)}==PURE_FUNCTIONS
    assert not any(isinstance(n,ast.Name) and n.id in {'bpy','Vector','Matrix'} for node in chosen for n in ast.walk(node))
    arithmetic = {'math':math,'collections':collections}
    exec(compile(ast.Module(body=chosen,type_ignores=[]),'gantry pure arithmetic only','exec'),arithmetic)
    data = arithmetic['build_service_geometry']()
    summary = arithmetic['geometry_summary'](data)
    assert summary['candidateTriangles']<=arithmetic['TRIANGLE_CAP']
    assert summary['candidateTriangles']==6500 and summary['triangles']==2560
    assert len(data['faces'])==len(data['colors'])==len(data['smooth'])==len(data['groups'])
    assert all(math.isfinite(c) for p in data['vertices'] for c in p)
    assert all(-52<=p[0]<=52 and -7<=p[1]<=7 for p in data['vertices'])
    assert all(len(f)>=3 and len(set(f))==len(f) for f in data['faces'])
    areas = []; volumes = collections.defaultdict(float); edges = collections.defaultdict(collections.Counter)
    for face, group in zip(data['faces'],data['groups']):
        coordinates = [data['vertices'][i] for i in face]
        for a,b in zip(coordinates,coordinates[1:]+coordinates[:1]):
            key = tuple(sorted(tuple(round(c,5) for c in p) for p in (a,b)))
            edges[group][key] += 1
        for i in range(1,len(face)-1):
            a,b,c = [data['vertices'][j] for j in (face[0],face[i],face[i+1])]
            normal = arithmetic['cross'](arithmetic['sub'](b,a),arithmetic['sub'](c,a))
            areas.append(math.sqrt(arithmetic['dot'](normal,normal))*.5)
            volumes[group] += arithmetic['dot'](a,arithmetic['cross'](b,c))/6
    assert min(areas)>1e-6
    assert all(volume>0 for group,volume in volumes.items() if group!='edge_wear'), volumes
    boundaries = {group:sum(n==1 for n in counter.values()) for group,counter in edges.items()}
    assert boundaries['edge_wear']==24
    assert all(count==0 for group,count in boundaries.items() if group!='edge_wear'), boundaries
    clearance = arithmetic['clipped_clearance'](data['vertices'],data['faces'])
    assert clearance>=arithmetic['PRACTICAL_CLEARANCE']
    contract = json.loads((FOLDER/'source-contract.json').read_text())
    predecessor = (ROOT/contract['preservedCopy']).read_bytes()
    public = (ROOT/contract['source']).read_bytes()
    source_sha = hashlib.sha256(predecessor).hexdigest()
    assert public==predecessor and source_sha==contract['sourceSha256']
    header = json.loads(predecessor[20:20+struct.unpack_from('<I',predecessor,12)[0]])
    assert len(header['meshes'])==1 and len(header['meshes'][0]['primitives'])==1
    primitive = header['meshes'][0]['primitives'][0]
    assert header['accessors'][primitive['indices']]['count']==6300*3
    assert set(primitive['attributes'])=={'POSITION','NORMAL','COLOR_0'}
    assert len(header['materials'])==1 and not header.get('images') and not header.get('textures')
    for reference in contract['references']:
        assert hashlib.sha256((ROOT/reference['path']).read_bytes()).hexdigest()==reference['sha256']
    return {
        'status':'CPU preparation arithmetic and preserved-input checks PASS; this validation does not execute or verify Blender authoring/export/render',
        'authoringScriptSha256':hashlib.sha256(script.read_bytes()).hexdigest(),
        'exportRenderScriptSha256':hashlib.sha256(renderer.read_bytes()).hexdigest(),
        'bothMcpPayloadsAstChecked':True,
        'thisValidationExecutedMcpPayloads':False,
        'sourceGlbSha256':source_sha,'sourcePublicAndPreservedCopyByteExact':True,
        'sourceTriangles':6300,'signalTrianglesScheduledForRemoval':2360,
        'retainedTriangles':3940,'addedGeometry':summary,'candidateTriangleCap':6500,
        'minimumAddedTriangleArea':min(areas),'addedClippedCorridorMinimumZ':clearance,
        'knownRetainedClippedCorridorMinimumZ':39.66999816894531,
        'expectedFinalClippedCorridorMinimumZ':min(clearance,39.66999816894531),
        'closedNewConstructionGroups':all(n==0 for g,n in boundaries.items() if g!='edge_wear'),
        'paintFlakes':{'triangles':8,'intentionalOpenEdges':24,'support':'ray projected to actual pipe facets with 0.003 surface offset'},
        'newGeometryHorizontalEnvelopeInsideOriginal':True,
        'prospectiveFinalBoundsBlender':[[-52,52],[-7,7],[-25,summary['boundsBlender'][2][1]]],
        'expectedMeshes':1,'expectedMaterialSlots':1,'expectedImages':0,
        'BlenderImportedGeometryNotVerifiedByThisCheck':True,'KhronosExportNotVerifiedByThisCheck':True,
        'actualSourceViewReviewNotVerifiedByThisCheck':True,'actualWorldReviewNotVerifiedByThisCheck':True,'runtimeNotMutatedByThisCheck':True,
    }


if __name__=='__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--write-receipt',action='store_true')
    args = parser.parse_args()
    receipt = validate()
    if args.write_receipt:
        (FOLDER/'preparation-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
