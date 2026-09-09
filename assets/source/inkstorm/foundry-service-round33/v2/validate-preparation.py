"""V2 CPU-only preparation audit; never imports bpy or executes the MCP entrypoint.

Pure helper declarations are discovered before positional_components. Only
literal constants, vetted arithmetic functions and a restricted namespace run.
Run only after the geometry author reports ready. Receipt writing is opt-in.
"""
import argparse
import ast
import builtins
import collections
import hashlib
import json
import math
from pathlib import Path
import struct

FOLDER = Path(__file__).resolve().parent
BASE = FOLDER.parent
ROOT = BASE.parents[3]
SAFE_BUILTINS = {name: getattr(builtins,name) for name in (
    'abs','all','any','bool','dict','enumerate','float','int','isinstance','len','list','max','min',
    'range','reversed','round','set','sorted','str','sum','tuple','zip',
)}
MATH_ATTRIBUTES = {'acos','asin','atan','atan2','ceil','cos','degrees','floor','hypot',
                   'isfinite','pi','radians','sin','sqrt','tan','tau'}
CONTAINER_METHODS = {'append','clear','copy','extend','get','items','keys','pop','update','values'}
FORBIDDEN_NAMES = {'open','exec','eval','compile','__import__','Path','hashlib','os','subprocess',
                   'getattr','setattr','delattr','globals','locals','vars','input','breakpoint'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_payload(text, expected_imports):
    tree = ast.parse(text)
    require(not any(isinstance(node,ast.Name) and node.id in FORBIDDEN_NAMES for node in ast.walk(tree)), 'Forbidden API in MCP payload')
    require(not any(isinstance(node,ast.Attribute) and node.attr.startswith('__') for node in ast.walk(tree)), 'Dunder access in MCP payload')
    actual = [(alias.name,alias.asname) for node in tree.body if isinstance(node,ast.Import) for alias in node.names]
    require(actual==[(name,None) for name in expected_imports], ('Unexpected MCP imports',actual))
    from_imports = [(node.module,[(alias.name,alias.asname) for alias in node.names]) for node in tree.body if isinstance(node,ast.ImportFrom)]
    require(from_imports==[('mathutils',[('Vector',None),('Matrix',None)])], ('Unexpected MCP from-import',from_imports))
    return tree


def pure_arithmetic(tree):
    markers = [i for i,node in enumerate(tree.body) if isinstance(node,ast.FunctionDef) and node.name=='positional_components']
    require(len(markers)==1, 'Missing/duplicate positional_components boundary')
    prefix = tree.body[:markers[0]]
    functions = [node for node in prefix if isinstance(node,ast.FunctionDef)]
    names = {node.name for node in functions}
    require(len(names)==len(functions) and {'build_service_geometry','geometry_summary','cross','sub','dot'}<=names, 'Missing/duplicate pure geometry helpers')
    require(not (names & (set(SAFE_BUILTINS)|{'math','collections'})), 'Pure helper shadows a safe global')
    constants = {}
    for node in prefix:
        if isinstance(node,ast.Assign):
            require(len(node.targets)==1 and isinstance(node.targets[0],ast.Name), 'Nonliteral/global assignment before pure boundary')
            name = node.targets[0].id
            require(name not in constants and name not in names and name not in SAFE_BUILTINS and name not in {'math','collections'}, 'Global shadow/duplicate')
            try:
                constants[name] = ast.literal_eval(node.value)
            except (ValueError,TypeError) as error:
                raise ValueError('Nonliteral preparation constant: '+name) from error
        elif not isinstance(node,(ast.Import,ast.ImportFrom,ast.FunctionDef)):
            require(isinstance(node,ast.Expr) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str), 'Executable statement before pure boundary')
    require(constants.get('EXPORT_CANDIDATE') is False, 'Prepared author must not export')
    require(constants.get('RETAINED_TRIANGLES')==3940 and constants.get('TRIANGLE_CAP')==20000, 'V2 frozen source/cap contract drift')
    banned_nodes = (ast.Import,ast.ImportFrom,ast.Global,ast.Nonlocal,ast.ClassDef,ast.AsyncFunctionDef,
                    ast.Await,ast.Yield,ast.YieldFrom,ast.With,ast.AsyncWith,ast.Lambda)
    for function in functions:
        require(not function.decorator_list, 'Pure helper decorators forbidden')
        for node in ast.walk(function):
            require(not isinstance(node,banned_nodes), 'Non-arithmetic declaration in '+function.name)
            if isinstance(node,ast.Name):
                require(node.id not in FORBIDDEN_NAMES|{'bpy','Vector','Matrix','json'} and not node.id.startswith('__'), 'Non-arithmetic name in '+function.name)
            if isinstance(node,ast.Attribute):
                if isinstance(node.value,ast.Name) and node.value.id=='math':
                    require(node.attr in MATH_ATTRIBUTES, 'Unapproved math attribute: '+node.attr)
                elif isinstance(node.value,ast.Name) and node.value.id=='collections':
                    require(node.attr in {'Counter','defaultdict'}, 'Unapproved collections attribute')
                else:
                    require(node.attr in CONTAINER_METHODS, 'Unapproved object attribute: '+node.attr)
            if isinstance(node,ast.Call):
                require(isinstance(node.func,(ast.Name,ast.Attribute)), 'Indirect pure-function call')
                if isinstance(node.func,ast.Name):
                    require(node.func.id in names|set(SAFE_BUILTINS), 'Unapproved pure-function call: '+node.func.id)
    namespace = {'__builtins__':SAFE_BUILTINS,'math':math,'collections':collections,**constants}
    exec(compile(ast.Module(body=functions,type_ignores=[]),'V2 vetted geometry arithmetic only','exec'),namespace)
    return namespace, sorted(names), sorted(constants)


def clipped_clearance(vertices, faces):
    minimum = math.inf
    # Clip individual triangles, so polygon concavity cannot hide a low segment.
    for face in faces:
        for i in range(1,len(face)-1):
            polygon = [vertices[index] for index in (face[0],face[i],face[i+1])]
            for boundary,sign in ((-39.999999,1),(39.999999,-1)):
                clipped = []
                for a,b in zip(polygon,polygon[1:]+polygon[:1]):
                    inside_a,inside_b = (a[0]-boundary)*sign>=0,(b[0]-boundary)*sign>=0
                    if inside_a: clipped.append(a)
                    if inside_a!=inside_b:
                        t = (boundary-a[0])/(b[0]-a[0])
                        clipped.append(tuple(a[k]+t*(b[k]-a[k]) for k in range(3)))
                polygon = clipped
                if not polygon: break
            if polygon: minimum = min(minimum,min(point[2] for point in polygon))
    require(math.isfinite(minimum), 'No added geometry crosses the corridor')
    return minimum


def validate():
    script = FOLDER/'author-service-gantry-mcp-safe.py'
    renderer = FOLDER/'export-render-service-gantry-mcp-safe.py'
    tree = check_payload(script.read_text(),['bpy','math','json','collections'])
    render_text = renderer.read_text()
    check_payload(render_text,['bpy','json','math'])
    require("source.get('sourcePreflightPassed') is True" in render_text, 'Missing source export guard')
    require("camera_data.sensor_fit = 'HORIZONTAL'" in render_text and 'max(width,height*aspect)*1.14' in render_text, 'Camera-fit contract drift')
    require("recorded_count==triangle_count" in render_text and 'sourceTriangleCap' in render_text, 'Export must check the actual authored count')
    arithmetic,function_names,constant_names = pure_arithmetic(tree)
    require(arithmetic.get('FAMILY')=='foundry-service-gantry-v2' and arithmetic.get('STAGE')=='PodRacing — Foundry service gantry round33 V2', 'Wrong authoring version')
    data = arithmetic['build_service_geometry']()
    summary = arithmetic['geometry_summary'](data)
    require(len(data['faces'])==len(data['colors'])==len(data['smooth'])==len(data['groups']), 'Per-face metadata count drift')
    require(all(len(point)==3 and all(math.isfinite(value) for value in point) for point in data['vertices']), 'Invalid/nonfinite vertex')
    require(all(-52<=p[0]<=52 and -7<=p[1]<=7 and -25<=p[2]<=61.450001 for p in data['vertices']), 'New geometry exceeds the source envelope')
    require(all(len(face)>=3 and len(set(face))==len(face) and all(isinstance(i,int) and 0<=i<len(data['vertices']) for i in face) for face in data['faces']), 'Invalid face index')
    require(all(len(color)==4 and all(math.isfinite(c) and 0<=c<=1 for c in color) and color[3]==1 for color in data['colors']), 'Invalid/nonopaque paint')
    triangle_count = sum(len(face)-2 for face in data['faces'])
    require(summary['triangles']==triangle_count and summary['candidateTriangles']==3940+triangle_count, 'Summary arithmetic drift')
    require(3940<summary['candidateTriangles']<=arithmetic['TRIANGLE_CAP'], 'V2 triangle cap exceeded')
    areas = []; volumes = collections.defaultdict(float); edges = collections.defaultdict(collections.Counter)
    paint_faces = 0
    for face,group in zip(data['faces'],data['groups']):
        coordinates = [data['vertices'][i] for i in face]
        for a,b in zip(coordinates,coordinates[1:]+coordinates[:1]):
            edges[group][tuple(sorted(tuple(round(c,5) for c in p) for p in (a,b)))] += 1
        if group=='edge_wear':
            require(len(face)==3, 'Paint flakes must be projected triangles')
            paint_faces += 1
        for i in range(1,len(face)-1):
            a,b,c = [data['vertices'][j] for j in (face[0],face[i],face[i+1])]
            normal = arithmetic['cross'](arithmetic['sub'](b,a),arithmetic['sub'](c,a))
            areas.append(math.sqrt(arithmetic['dot'](normal,normal))*.5)
            volumes[group] += arithmetic['dot'](a,arithmetic['cross'](b,c))/6
    require(areas and min(areas)>1e-6, 'Degenerate/sliver triangle')
    require(all(volume>0 for group,volume in volumes.items() if group!='edge_wear'), ('Inverted closed construction group',dict(volumes)))
    boundaries = {group:sum(count==1 for count in counter.values()) for group,counter in edges.items()}
    require(boundaries.get('edge_wear',0)==paint_faces*3, 'Paint flake open-edge count drift')
    require(all(count==0 for group,count in boundaries.items() if group!='edge_wear'), ('Open construction boundaries',boundaries))
    clearance = clipped_clearance(data['vertices'],data['faces'])
    require(arithmetic['PRACTICAL_CLEARANCE']==39.60 and clearance>=39.60, 'New construction crosses the preserved open corridor')
    require(summary['boundsBlender'][2][1]<=61.450001, 'Upper envelope drift')
    contract = json.loads((BASE/'source-contract.json').read_text())
    predecessor = (ROOT/contract['preservedCopy']).read_bytes()
    public = (ROOT/contract['source']).read_bytes()
    source_sha = hashlib.sha256(predecessor).hexdigest()
    require(public==predecessor and source_sha==contract['sourceSha256'], 'Frozen predecessor drift')
    header = json.loads(predecessor[20:20+struct.unpack_from('<I',predecessor,12)[0]])
    require(len(header['meshes'])==1 and len(header['meshes'][0]['primitives'])==1, 'Source mesh contract drift')
    primitive = header['meshes'][0]['primitives'][0]
    require(header['accessors'][primitive['indices']]['count']==6300*3 and set(primitive['attributes'])=={'POSITION','NORMAL','COLOR_0'}, 'Source geometry format drift')
    require(len(header['materials'])==1 and not header.get('images') and not header.get('textures'), 'Source material format drift')
    for reference in contract['references']:
        require(hashlib.sha256((ROOT/reference['path']).read_bytes()).hexdigest()==reference['sha256'], 'Reference drift: '+reference['path'])
    return {'status':'CPU preparation arithmetic and preserved-input checks PASS; Blender authoring/export/render not executed by this check',
            'authoringScriptSha256':hashlib.sha256(script.read_bytes()).hexdigest(),
            'exportRenderScriptSha256':hashlib.sha256(renderer.read_bytes()).hexdigest(),
            'validatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'bothMcpPayloadsAstChecked':True,'thisValidationExecutedMcpPayloads':False,
            'pureFunctionsDiscovered':function_names,'literalConstantsDiscovered':constant_names,
            'sourceGlbSha256':source_sha,'sourcePublicAndPreservedCopyByteExact':True,
            'sourceTriangles':6300,'signalTrianglesScheduledForRemoval':2360,'retainedTriangles':3940,
            'addedGeometry':summary,'candidateTriangleCap':arithmetic['TRIANGLE_CAP'],
            'minimumAddedTriangleArea':min(areas),'addedClippedCorridorMinimumZ':clearance,
            'knownRetainedClippedCorridorMinimumZ':39.66999816894531,
            'expectedFinalClippedCorridorMinimumZ':min(clearance,39.66999816894531),
            'closedNewConstructionGroups':True,'openBoundaryEdgesByGroup':boundaries,
            'paintFlakes':{'triangles':paint_faces,'intentionalOpenEdges':paint_faces*3},
            'newGeometryHorizontalEnvelopeInsideOriginal':True,
            'newLowConstructionPermittedOnlyOutsideOpenCorridor':True,
            'prospectiveFinalBoundsBlender':[[-52,52],[-7,7],[-25,max(54.30417251586914,summary['boundsBlender'][2][1])]],
            'expectedMeshes':1,'expectedMaterialSlots':1,'expectedImages':0,
            'BlenderImportedGeometryNotVerifiedByThisCheck':True,'KhronosExportNotVerifiedByThisCheck':True,
            'actualSourceViewReviewNotVerifiedByThisCheck':True,'actualWorldReviewNotVerifiedByThisCheck':True,
            'runtimeNotMutatedByThisCheck':True}


if __name__=='__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--write-receipt',action='store_true')
    args = parser.parse_args()
    receipt = validate()
    if args.write_receipt:
        (FOLDER/'preparation-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,indent=2))
