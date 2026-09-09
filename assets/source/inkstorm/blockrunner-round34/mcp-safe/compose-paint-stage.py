"""Compose small, receipt-driven Blender MCP payloads externally; never execute Blender."""
import argparse
import ast
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent


def read(name):
    return json.loads((BASE / name).read_text())


def subset(data, keys):
    return {key: data[key] for key in keys.split()}


def fnv(value):
    result = 14695981039346656037
    for character in json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False, ensure_ascii=True):
        result = ((result ^ ord(character)) * 1099511628211) & 18446744073709551615
    return format(result, '016x')


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode', choices=['bake', 'render', 'atlas'])
parser.add_argument('--state', required=True)
parser.add_argument('--token', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--owner', choices=['body', 'pilot'])
parser.add_argument('--channel', choices=['color', 'roughness'])
parser.add_argument('--view', choices=['fullcraft', 'driver', 'front', 'rear'])
parser.add_argument('--author')
parser.add_argument('--bakes', nargs=4)
parser.add_argument('--from-version')
parser.add_argument('--to-version', type=int)
args = parser.parse_args()
assert 6 <= len(args.token) <= 32 and all(c.isascii() and (c.isalnum() or c == '-') for c in args.token)
output = BASE / args.output
assert output.resolve().is_relative_to(BASE) and not output.exists()
state = read(args.state)
assert state['sourceUid'] == 'a6f14ae799ab40d7ac425f043f824ff8'
assert state['meshObjects'] == 2 and state['triangles'] == 44028
audit = read('audit-receipt.json')
fit = read('control-fit-v1-receipt.json')
prefix = '\n'.join((BASE / name).read_text() for name in ['00-source-reference.py', '01-source-guard.py']) + '\n'
values = {'BLOCKRUNNER_AUDIT': subset(audit, 'sourceSignature'),
          'BLOCKRUNNER_FIT': subset(fit, 'targetScene fitSignature fitCornerNormalSignature'),
          'BLOCKRUNNER_PAINT_STATE': subset(state, 'sourceUid meshObjects triangles targetScene bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature')}
if 'linkedPaintImages' in state:
    values['BLOCKRUNNER_PAINT_STATE']['linkedPaintImages'] = state['linkedPaintImages']
if 'paintAttributeSignatures' in state:
    values['BLOCKRUNNER_PAINT_STATE']['paintAttributeSignatures'] = state['paintAttributeSignatures']
    prefix += (BASE / '13-v4-attribute-signatures.py').read_text() + '\n'

if args.mode == 'bake':
    assert args.owner and args.channel
    expected = BASE.parent / f'blockrunner-{args.owner}-{args.channel}-v1-{args.token}.png'
    assert not expected.exists()
    values.update(BLOCKRUNNER_ATLAS_OWNER=args.owner, BLOCKRUNNER_ATLAS_CHANNEL=args.channel, BLOCKRUNNER_BAKE_TOKEN=args.token)
    fragment = (BASE / '10-bake-atlas-channel-v1.py').read_text()
elif args.mode == 'render':
    assert args.view
    expected = BASE.parent / f'paint-v1-{args.view}-{args.token}.png'
    assert not expected.exists()
    values.pop('BLOCKRUNNER_FIT')
    values['BLOCKRUNNER_AUDIT'] = subset(audit, 'status sourcePreservation sourceUid sourceReference globalPreservation sourceSignature')
    values['BLOCKRUNNER_CONTROL_FIT_RECEIPT'] = subset(fit, 'sourceUid sourcePreservation sourceCornerNormalsPreserved newSceneRetained cleanupPreservation cleanupCornerNormalsPreserved status globalPreservation targetScene fitSignature fitCornerNormalSignature')
    camera = read(f'paint-procedural-v2-{args.view}-render-receipt.json')
    values['BLOCKRUNNER_SOURCE_RENDER'] = subset(camera, 'view sourceUid sourcePreservation camera lighting sourceBounds path')
    values.update(BLOCKRUNNER_VIEW=args.view, BLOCKRUNNER_RENDER_TOKEN=args.token)
    fragment = (BASE / 'render-paint-comparison-v1.py').read_text()
else:
    assert args.author and args.bakes and args.from_version and args.to_version
    author = read(args.author)
    bakes = [read(name) for name in args.bakes]
    assert bakes[-1]['paintSignature'] == state['paintSignature']
    assert [(b['owner'], b['channel']) for b in bakes] == [('body', 'color'), ('body', 'roughness'), ('pilot', 'color'), ('pilot', 'roughness')]
    assert author['targetScene'] == state['targetScene']
    assert len(state['linkedPaintImages']) == 4
    prefix += (BASE / 'pilot-paint-reference-v1.py').read_text() + '\n'
    values['BLOCKRUNNER_PAINT_AUTHOR'] = subset(author, 'targetScene paintSignature bodyMeshName pilotMeshName paintCornerNormalSignature objectLineage normalEncodingBudget paintBounds')
    values['BLOCKRUNNER_ATLAS_RECEIPTS'] = bakes
    fragment = (BASE / '11b-copy-finalize-atlas-v3-socket-iteration.py').read_text()
    fragment = fragment.replace('V3', f'V{args.to_version}').replace('v3', f'v{args.to_version}')
    assert args.from_version.isascii() and args.from_version.isalnum()
    fragment = fragment.replace('V2', f'V{args.from_version.upper()}').replace('v2', f'v{args.from_version.lower()}')
    # Pin the exact actual records used by this invocation, never a live-scene fallback.
    fragment = fragment.replace('c8da6bd752d2485a', author['paintSignature']['objectsFnv1a64'])
    fragment = fragment.replace('9e45fb9bc1a499ab', fnv(state['paintSignature']))
    fragment = fragment.replace('c255745cce8c26bb', fnv(state['linkedPaintImages']))
    fragment = fragment.replace("['50215ec1a66752e0', '94619d1924f81486', '6342d00416aae43f', 'd16671acbb97f8d5']", repr([fnv(b) for b in bakes]))
    # The V4 author uses a descriptive scene name; pin that actual name exactly.
    fragment = fragment.replace(f'PodRacing — Blockrunner Inkstorm atlas paint round34 V{args.from_version.upper()}', author['targetScene'])

if 'paintAttributeSignatures' in state:
    scene_variable = 'cleanup' if args.mode == 'render' else 'paint'
    guard_line = ('    cleanup_before = source_signature(cleanup)' if args.mode == 'render'
                  else '    paint_before = source_signature(paint)')
    assert fragment.count(guard_line) == 1
    fragment = fragment.replace(guard_line, guard_line + '\n    assert paint_attribute_signatures(' + scene_variable + ") == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures'], 'Authoring mask values changed since actual state.'")
    final_guard = "    if " + scene_variable + " is not None:\n        report['parentPaintAttributeValuesPreserved'] = paint_attribute_signatures(" + scene_variable + ") == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']\n        assert report['parentPaintAttributeValuesPreserved']\n"
    if args.mode == 'atlas':
        point = "    report['paintSignature'] = source_signature(target)"
        assert point in fragment
        check = "    report['paintAttributeSignatures'] = paint_attribute_signatures(target)\n    for old_name, new_name in [(BLOCKRUNNER_PAINT_STATE['bodyMeshName'], BODY_NAME), (BLOCKRUNNER_PAINT_STATE['pilotMeshName'], PILOT_NAME)]:\n        assert report['paintAttributeSignatures'][new_name] == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures'][old_name]\n"
        fragment = fragment.replace(point, check + point)
    else:
        final_guard += "        report['paintAttributeSignatures'] = paint_attribute_signatures(" + scene_variable + ")\n"
    assert fragment.count('    print_receipt(report)') == 1
    fragment = fragment.replace('    print_receipt(report)', final_guard + '    print_receipt(report)')

payload = prefix + '\n'.join(name + ' = json.loads(' + repr(json.dumps(value, separators=(',', ':'), allow_nan=False)) + ')' for name, value in values.items()) + '\n' + fragment
ast.parse(payload)
assert len(payload.encode()) < 200000
with output.open('x') as handle:
    handle.write(payload)
print(payload)
