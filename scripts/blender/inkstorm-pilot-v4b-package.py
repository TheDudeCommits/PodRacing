"""Package only the isolated V4B GLB; preserve geometry and public assets."""
from pathlib import Path
import hashlib
import json
import struct
import subprocess

ROOT = Path('/Users/amir/Projects/PodRacing')
BASE = ROOT / 'assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4b'
CLI = '/Users/amir/.npm/_npx/6e1a7b84fabb98f4/node_modules/@gltf-transform/cli/bin/cli.js'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rename_runtime_nodes(source, destination):
    data = source.read_bytes()
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(data[20:20 + length])
    names = {
        'teemto-cockpit-body.004': 'teemto-cockpit-body',
        'teemto-cockpit-construction-v4b': 'teemto-cockpit.001',
        'teemto-engine-left-body.004': 'teemto-engine-left-body',
        'teemto-engine-left-construction-v4b': 'teemto-engine-left.001',
        'teemto-engine-right-body.004': 'teemto-engine-right-body',
        'teemto-engine-right-construction-v4b': 'teemto-engine-right.001',
    }
    assert all(sum(node.get('name') == name for node in doc['nodes']) == 1 for name in names)
    for node in doc['nodes']:
        node['name'] = names.get(node.get('name'), node.get('name'))
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    remaining = data[20 + length:]
    destination.write_bytes(struct.pack('<III', 0x46546C67, 2, 20 + len(encoded) + len(remaining))
                            + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded + remaining)
    return names


if __name__ == '__main__':
    native = BASE / 'teemto-pilot-material-v4b-normalized.glb'
    contract = BASE / 'teemto-pilot-v4b-contract.glb'
    tangent = BASE / 'teemto-pilot-v4b-tangents.glb'
    dedup = BASE / 'teemto-pilot-v4b-dedup.glb'
    runtime = BASE / 'teemto-pilot-v4b-runtime.glb'
    native_hash = digest(native)
    renamed = rename_runtime_nodes(native, contract)
    commands = [
        ['dedup', str(tangent), str(dedup), '--materials', 'false', '--meshes', 'false', '--skins', 'false'],
        ['webp', str(dedup), str(runtime), '--slots', 'baseColorTexture', '--quality', '88'],
    ]
    subprocess.run(['node', str(ROOT / 'scripts/blender/inkstorm-pilot-v4b-tangents.mjs')], check=True)
    for command in commands:
        subprocess.run(['node', CLI, *command], check=True)
    assert digest(native) == native_hash
    receipt = {
        'nativePreserved': True,
        'nodeRenames': renamed,
        'commands': commands,
        'geometrySimplified': False,
        'materialsDeduplicated': False,
        'files': [{'path': str(path.relative_to(ROOT)), 'bytes': path.stat().st_size, 'sha256': digest(path)}
                  for path in [native, contract, tangent, dedup, runtime]],
    }
    (BASE / 'package-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))
