"""Produce isolated candidate snapshots/patches; never modify runtime or assets."""
from pathlib import Path
import difflib
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]

def replace_once(text, old, new):
    assert text.count(old) == 1, old
    return text.replace(old, new, 1)

material_path = ROOT / 'src/render/inkstorm/InkstormSurfaceMaterial.ts'
world_path = ROOT / 'src/render/inkstorm/InkstormWorld.ts'
material = material_path.read_text()
world = world_path.read_text()
shader = (HERE / 'workshop-lighting.glsl').read_text()

candidate = replace_once(material, 'constructor(stone = true) {',
    "constructor(stone = true, workshopFamily: 'pit-complex' | 'pit-district' | null = null) {")
candidate = replace_once(candidate, 'vertexColors: true, toneMapped: false,',
    "vertexColors: true, toneMapped: false,\n"
    "      defines: !stone && workshopFamily ? { INKSTORM_WORKSHOP_FAMILY: workshopFamily === 'pit-complex' ? 1 : 2 } : {},")
candidate = replace_once(candidate,
    'varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vPaintNormal;',
    'varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec3 vPaintNormal;\n'
    '        #ifdef INKSTORM_WORKSHOP_FAMILY\n'
    '        varying vec3 vWorkshopScale;\n'
    '        #endif')
candidate = replace_once(candidate, 'gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);',
    '/* The existing instance transforms are orthogonal TRS, without shear. */\n'
    '          #ifdef INKSTORM_WORKSHOP_FAMILY\n'
    '          mat4 workshopTransform=modelMatrix;\n'
    '          #ifdef USE_INSTANCING\n'
    '          workshopTransform=modelMatrix*instanceMatrix;\n'
    '          #endif\n'
    '          vWorkshopScale=vec3(length(workshopTransform[0].xyz),length(workshopTransform[1].xyz),length(workshopTransform[2].xyz));\n'
    '          #endif\n'
    '          gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);')
fragment_start = '        void main(){\n          vec3 n=normalize(vNormal);'
candidate = replace_once(candidate, fragment_start,
    shader + '\n' + fragment_start)
candidate = replace_once(candidate,
    '          color=mix(color,base*1.12,service*.72);',
    '          color=mix(color,base*1.12,service*.72);\n'
    '          #ifdef INKSTORM_WORKSHOP_FAMILY\n'
    '          vec2 workshop=inkstormWorkshopLight();\n'
    '          color+=base*vec3(1.,.74,.43)*workshop.x*(1.-service);\n'
    '          color=mix(color,max(color,vec3(.54,.31,.105)),workshop.y);\n'
    '          #endif')
world_candidate = replace_once(world,
    'new InkstormSurfaceMaterial(stone),512)',
    "new InkstormSurfaceMaterial(stone, family==='pit-complex'||family==='pit-district'?family:null),512)")

def diff(before, after, relative):
    return ''.join(difflib.unified_diff(before.splitlines(True), after.splitlines(True),
        fromfile='a/' + relative, tofile='b/' + relative))

(HERE / 'InkstormSurfaceMaterial.ts.candidate').write_text(candidate)
(HERE / 'InkstormWorld.ts.candidate').write_text(world_candidate)
(HERE / 'runtime-lighting.patch').write_text(
    diff(material, candidate, str(material_path.relative_to(ROOT))) +
    diff(world, world_candidate, str(world_path.relative_to(ROOT))))

builder_path = ROOT / 'assets/source/inkstorm/grid-construction-round29/build_grid_detail.py'
anchor_path = builder_path.parent / 'task-light-anchors.json'
anchors = json.loads(anchor_path.read_text())

paths = [material_path, world_path, builder_path,
    ROOT / 'assets/source/inkstorm/build_industrial_revision.py',
    ROOT / 'assets/source/inkstorm/build_pit_district.py',
    ROOT / 'public/assets/inkstorm/pit-complex.glb',
    ROOT / 'public/assets/inkstorm/pit-district.glb', anchor_path]
manifest = {
    'status': 'SOURCE_ONLY_CANDIDATE_NOT_VISUALLY_ACCEPTED',
    'dependency': 'Use construction v3 corrected below-awning district fixtures before any shader integration.',
    'sourceSnapshots': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
    'emitterCoordinatesGLB': {family: [f['emitterGLB'] for f in anchors['fixtures'] if f['family'] == family]
        for family in ['pit-complex', 'pit-district']},
    'runtimeChangesStagedOnly': ['src/render/inkstorm/InkstormSurfaceMaterial.ts', 'src/render/inkstorm/InkstormWorld.ts'],
    'additionalTrianglesPerFamily': {'pit-complex': 72, 'pit-district': 72},
    'additionalRuntimeDraws': 0, 'additionalRuntimeTextures': 0, 'additionalRenderPasses': 0,
    'additionalMaterials': 0, 'additionalFamilyShaderVariants': 2,
    'extraPerFrameCpuAllocations': 0,
    'browserOrBlenderUsed': False,
}
(HERE / 'staging-receipt.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'status':manifest['status'], 'patches':['runtime-lighting.patch']}, indent=2))
