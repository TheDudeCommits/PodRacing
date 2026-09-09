#!/usr/bin/env python3
"""Validate a NEW private V6 package against immutable V5: only sampler wrap changes.

No writes to GLBs, source scenes, runtime or public. This is CPU structural evidence,
not proof that the visible seam is gone. Fresh render comparison remains required.
"""
import argparse, copy, hashlib, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
REPO = BASE.parents[3]
sys.path.insert(0, str(REPO / 'assets/source/inkstorm/polwo-driver-round32'))
from _polwo_glb import read_glb, accessor_bytes, view_bytes, image_source

REFERENCES = {
    'hero': '576c198464696004a46c8adc14f48d54004ea16bd1cb86b15ddeaad102a7c908',
    'rival': 'a411d5bee15f6b1d10fab253002aaef6f014e69055ce24bc001011c8d88b92dc',
}

def sha(value):
    return hashlib.sha256(value).hexdigest()

def digest(value):
    return sha(json.dumps(value, sort_keys=True, separators=(',', ':')).encode())

def semantic(doc, binary):
    images = []
    for image in doc['images']:
        assert 'bufferView' in image and 'uri' not in image
        images.append({'mimeType': image['mimeType'], 'bytes': len(view_bytes(doc, binary, image['bufferView'])),
                       'sha256': sha(view_bytes(doc, binary, image['bufferView']))})
    assert len(images) == 4

    def texture(index):
        value = doc['textures'][index]
        assert 'sampler' in value
        # Sampler identity/index is bookkeeping; every non-wrap setting is preserved.
        sampler = {key: val for key, val in doc['samplers'][value['sampler']].items()
                   if key not in ('wrapS', 'wrapT', 'name')}
        properties = {key: val for key, val in value.items() if key not in ('source', 'sampler', 'name')}
        return {'image': images[image_source(value)], 'samplerWithoutWrap': sampler, 'properties': properties}

    def material_value(value):
        if isinstance(value, list):
            return [material_value(item) for item in value]
        if not isinstance(value, dict):
            return value
        result = {}
        for key, child in value.items():
            if key.endswith('Texture') and isinstance(child, dict) and 'index' in child:
                result[key] = {**{k: v for k, v in child.items() if k != 'index'},
                               'resolvedTexture': texture(child['index'])}
            else:
                result[key] = material_value(child)
        return result

    materials = {material['name']: material_value(material) for material in doc['materials']}
    assert len(materials) == 5
    geometry = {}
    for node in doc['nodes']:
        assert not node.get('children') and 'skin' not in node and 'matrix' not in node
        assert node.get('translation', [0, 0, 0]) == [0, 0, 0]
        assert node.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
        assert node.get('scale', [1, 1, 1]) == [1, 1, 1]
        primitives = []
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            refs = {**primitive['attributes'], 'INDICES': primitive['indices']}
            assert not any(key.startswith('COLOR_') for key in refs)
            arrays = {}
            for name, index in refs.items():
                accessor = doc['accessors'][index]
                meta = {key: val for key, val in accessor.items() if key not in ('bufferView', 'byteOffset', 'name')}
                arrays[name] = {'metadata': meta, 'sha256': sha(accessor_bytes(doc, binary, index))}
            primitives.append({'arrays': arrays, 'material': doc['materials'][primitive['material']]['name'],
                               'properties': {key: val for key, val in primitive.items()
                                              if key not in ('attributes', 'indices', 'material')}})
        geometry[node['name']] = primitives
    assert len(geometry) == 5 and len(doc['nodes']) == 5
    assert set(geometry) == {'blockrunner-body', *('blockrunner-pilot-' + role for role in ('suit', 'helmet', 'visor', 'gloves'))}
    assert len(doc['scenes']) == 1 and sorted(doc['scenes'][doc.get('scene', 0)]['nodes']) == list(range(5))
    return {'images': images, 'materials': materials, 'geometry': geometry,
            'extensionsUsed': sorted(doc.get('extensionsUsed', [])),
            'extensionsRequired': sorted(doc.get('extensionsRequired', []))}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package-directory', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    assert output.is_relative_to(BASE) and not output.exists()
    result = {'scope': 'CPU sampler-only package comparison against immutable V5; no visible seam/art/runtime acceptance.',
              'outcome': 'FAIL', 'packages': {}}
    try:
        for role, expected in REFERENCES.items():
            reference = HERE / 'packaged-atlas-v5-v1' / ('blockrunner-' + role + '-v1.glb')
            candidate = args.package_directory.resolve() / ('blockrunner-' + role + '-v1.glb')
            assert candidate.is_relative_to(BASE) and candidate != reference
            old_raw, old_doc, old_bin = read_glb(reference)
            raw, doc, binary = read_glb(candidate)
            assert sha(old_raw) == expected, 'Immutable V5 reference drift'
            row = {'reference': str(reference), 'referenceSha256': expected, 'candidate': str(candidate),
                   'candidateSha256': sha(raw), 'candidateBytes': len(raw),
                   'previousSamplers': old_doc.get('samplers'), 'samplers': doc.get('samplers')}
            result['packages'][role] = row
            assert doc.get('samplers') and all(s.get('wrapS') == 33071 and s.get('wrapT') == 33071
                                              for s in doc['samplers']), 'Every V6 sampler must explicitly clamp both axes'
            before = semantic(old_doc, old_bin)
            after = semantic(doc, binary)
            row['comparisons'] = {key: {'exact': before[key] == after[key],
                                        'referenceSha256': digest(before[key]), 'candidateSha256': digest(after[key])}
                                  for key in before}
            assert all(item['exact'] for item in row['comparisons'].values()), 'Change outside declared sampler wraps; inspect receipt'
            row['atlasPayloads'] = after['images']
            assert reference.read_bytes() == old_raw and candidate.read_bytes() == raw
            row['outcome'] = 'PASS'
        result['outcome'] = 'PASS'
    except BaseException as error:
        result['error'] = str(error)
        raise
    finally:
        with output.open('x') as stream:
            json.dump(result, stream, indent=2)
            stream.write('\n')
        print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
