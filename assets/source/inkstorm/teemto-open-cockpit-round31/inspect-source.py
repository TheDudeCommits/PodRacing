"""Header-only source/material comparison plus streaming preservation receipt."""
from pathlib import Path
import hashlib
import json
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
VEHICLE = ROOT / 'assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90'
FILES = {
    'importedSource': VEHICLE / 'imported-source.glb',
    'v4cSource': VEHICLE / 'processed/pilot-v4c/teemto-pilot-v4c-runtime.glb',
    'v4cPublic': ROOT / 'public/assets/inkstorm/vehicles/teemto-hero-v4c.glb',
}

def inspect(path):
    with path.open('rb') as file:
        magic, version, total = struct.unpack('<III', file.read(12))
        assert magic == 0x46546C67 and version == 2
        length, kind = struct.unpack('<II', file.read(8))
        assert kind == 0x4E4F534A
        doc = json.loads(file.read(length))
    digest = hashlib.sha256()
    with path.open('rb') as file:
        for chunk in iter(lambda: file.read(1048576), b''):
            digest.update(chunk)
    return {'path': str(path.relative_to(ROOT)), 'bytes': total,
            'sha256': digest.hexdigest(), 'materials': doc['materials'],
            'meshNodes': [n.get('name') for n in doc['nodes'] if 'mesh' in n],
            'generator': doc['asset'].get('generator')}

if __name__ == '__main__':
    result = {name: inspect(path) for name, path in FILES.items()}
    assert result['v4cSource']['sha256'] == 'f3eb56a54b7dbb8f4a26263fb26f1f88b188db6bcc409910a3561ae939f1eef1'
    assert result['importedSource']['sha256'] == 'b7e2cc046fd392659886b1af88bdda1117037009351493f69dccdf78c4c53836'
    assert result['v4cSource']['sha256'] == result['v4cPublic']['sha256']
    result['diagnosis'] = {
        'sourceCabinaAlphaMode': 'OPAQUE (glTF default)',
        'sourceCabinaTransmission': False,
        'v4cCabinaAlphaMode': 'OPAQUE (glTF default)',
        'sourceOnlyBlendMaterial': 'Rayos',
        'inference': 'Available source records a solid opaque cockpit material; existing review images show a roof. This is not a confirmed glass-to-opaque regression.',
        'scope': 'The original vendor archive is unavailable. Connector-normalized imported-source and V4C files are preserved byte-exact; no vendor shader parity claim.',
    }
    output = HERE / 'source-preservation-and-material-diagnosis.json'
    output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'receipt': str(output), 'preserved': {k:v['sha256'] for k,v in result.items() if k!='diagnosis'}}, indent=2))
