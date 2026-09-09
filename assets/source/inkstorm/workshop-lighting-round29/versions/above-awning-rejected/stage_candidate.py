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

fixture_body = '''\n\ndef task_fixture(m, x, y, emitter_z):
    # Original downward task strip seated under an existing supported crossbeam.
    # The lower warm face is exactly emitter_z; shader source matches this face.
    box(m, (x, y, emitter_z + .20), (2.6, .95, .32), 'ink')
    box(m, (x, y, emitter_z + .035), (2.1, .68, .07), 'warm')
'''
builder_path = ROOT / 'assets/source/inkstorm/grid-construction-round29/build_grid_detail.py'
builder = builder_path.read_text()
fixture_candidate = replace_once(builder, '\ndef pit_detail():', fixture_body + '\n\ndef pit_detail():')
fixture_candidate = replace_once(fixture_candidate,
    "    engine(m,-47,-10,1,1.05,'coral')",
    "    for x, y in [(-47,4),(-5,4),(39,7)]: task_fixture(m,x-3,y-1,9.44)\n"
    "    engine(m,-47,-10,1,1.05,'coral')")
fixture_candidate = replace_once(fixture_candidate,
    '    engine(m,-37,-5,.4,.72)',
    '    for x, back, h in [(-39,13,12),(-2,17,17),(38,10,13.8)]: task_fixture(m,x+3,back-11,h-.62)\n'
    '    engine(m,-37,-5,.4,.72)')
(HERE / 'build_grid_detail.py.candidate').write_text(fixture_candidate)
(HERE / 'fixture-source.patch').write_text(diff(builder, fixture_candidate, str(builder_path.relative_to(ROOT))))

paths = [material_path, world_path, builder_path,
    ROOT / 'assets/source/inkstorm/build_industrial_revision.py',
    ROOT / 'assets/source/inkstorm/build_pit_district.py',
    ROOT / 'public/assets/inkstorm/pit-complex.glb',
    ROOT / 'public/assets/inkstorm/pit-district.glb']
manifest = {
    'status': 'SOURCE_ONLY_CANDIDATE_NOT_VISUALLY_ACCEPTED',
    'dependency': 'Re-export and validate the six visible fixture bodies before any shader integration.',
    'sourceSnapshots': {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
    'emitterCoordinatesGLB': {'pit-complex': [[-50,9.44,-3],[-8,9.44,-3],[36,9.44,-6]],
        'pit-district': [[-36,11.38,-2],[1,16.38,-6],[41,13.18,1]]},
    'runtimeChangesStagedOnly': ['src/render/inkstorm/InkstormSurfaceMaterial.ts', 'src/render/inkstorm/InkstormWorld.ts'],
    'additionalTrianglesPerFamily': {'pit-complex': 72, 'pit-district': 72},
    'additionalRuntimeDraws': 0, 'additionalRuntimeTextures': 0, 'additionalRenderPasses': 0,
    'additionalMaterials': 0, 'additionalFamilyShaderVariants': 2,
    'extraPerFrameCpuAllocations': 0,
    'browserOrBlenderUsed': False,
}
(HERE / 'staging-receipt.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'status':manifest['status'], 'patches':['runtime-lighting.patch','fixture-source.patch']}, indent=2))
