#!/usr/bin/env python3
"""Validate only the two declared color-atlas changes against the shipped V6 assets."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
spec = importlib.util.spec_from_file_location('v6_compare', HERE / 'verify-sampler-only-package-v6.py')
compare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compare)
REFERENCE_HASHES = {
    'hero': '7eeca075e2a8ea9b1b11e381ff447d6ec7bb83d8f73f6ddb41f843b4cbadfeb4',
    'rival': 'ae90b8f56c2ebca7e128aeee14c6a6e5c59d473a6a0898f8fc64dfbfc283342a',
}

def sha(data):
    return hashlib.sha256(data).hexdigest()

def normalize_color_payloads(materials):
    result = copy.deepcopy(materials)
    for material in result.values():
        texture = material['pbrMetallicRoughness']['baseColorTexture']['resolvedTexture']
        assert texture['image']['mimeType'] == 'image/png'
        texture['image'] = {'mimeType': 'image/png', 'payload': 'declared new contact color atlas'}
    return result

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--package-directory', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    output = args.output.resolve()
    assert output.is_relative_to(BASE) and not output.exists()
    masters = {}
    for owner in ('body', 'pilot'):
        bake_path = BASE / 'mcp-safe' / ('bake-v7-' + owner + '-color-receipt.json')
        bake = json.loads(bake_path.read_text())
        assert bake['newImageRetained'] and bake['extendedContactGraphsRestored']
        assert bake['sourcePreservation'] and bake['paintCornerNormalsPreserved']
        source = Path(bake['path'])
        masters[owner] = {'path': str(source), 'sha256': sha(source.read_bytes()),
                         'bakeReceiptSha256': sha(bake_path.read_bytes())}
    result = {'outcome': 'FAIL', 'scope': 'CPU structural and color-master lineage comparison; no art or runtime acceptance.',
              'colorMasters': masters, 'packages': {}}
    try:
        for role, expected in REFERENCE_HASHES.items():
            reference = HERE / 'packaged-atlas-v6-v1' / ('blockrunner-' + role + '-v1.glb')
            candidate = args.package_directory.resolve() / reference.name
            assert candidate.is_relative_to(BASE) and candidate != reference
            old_raw, old_doc, old_binary = compare.read_glb(reference)
            raw, doc, binary = compare.read_glb(candidate)
            assert sha(old_raw) == expected
            old = compare.semantic(old_doc, old_binary)
            new = compare.semantic(doc, binary)
            row = {'referenceSha256': expected, 'candidateSha256': sha(raw), 'candidateBytes': len(raw)}
            result['packages'][role] = row
            assert doc.get('samplers') and all(s.get('wrapS') == 33071 and s.get('wrapT') == 33071 for s in doc['samplers'])
            assert old_doc['samplers'] == doc['samplers'], 'Sampler properties changed'
            assert old['geometry'] == new['geometry'], 'Geometry, normals, UVs, topology, roots or material association changed'
            assert old['extensionsUsed'] == new['extensionsUsed'] and old['extensionsRequired'] == new['extensionsRequired']
            assert normalize_color_payloads(old['materials']) == normalize_color_payloads(new['materials']), 'Non-color material semantics changed'
            package_receipt = json.loads(candidate.with_suffix('.package-receipt.json').read_text())
            assert package_receipt['sha256'] == sha(raw) and package_receipt['profile'] == role
            images = package_receipt['textureImages']
            assert len(images) == 4
            assert {(i['owner'], i['role']) for i in images} == {(o, r) for o in ('body', 'pilot') for r in ('baseColor', 'roughnessG')}
            changed = []
            for item in images:
                actual = new['images'][item['image']]
                assert actual['sha256'] == item['sha256'] and actual['bytes'] == item['bytes']
                if item['role'] == 'baseColor':
                    # Rival input comes from the hero's already resized image.
                    if role == 'hero':
                        assert item['inputSha256'] == masters[item['owner']]['sha256'], 'Wrong actual V7 color master'
                    else:
                        hero_receipt = json.loads((args.package_directory / 'blockrunner-hero-v1.package-receipt.json').read_text())
                        hero_image = next(i for i in hero_receipt['textureImages'] if i['owner'] == item['owner'] and i['role'] == 'baseColor')
                        assert item['inputSha256'] == hero_image['sha256'], 'Rival color not derived from actual hero'
                    changed.append({'owner': item['owner'], 'image': item['image'], 'newSha256': actual['sha256']})
            assert len(changed) == 2
            # Resolve by material role, independent of image ordering.
            for name in old['materials']:
                old_pbr = old['materials'][name]['pbrMetallicRoughness']
                new_pbr = new['materials'][name]['pbrMetallicRoughness']
                assert old_pbr['metallicRoughnessTexture'] == new_pbr['metallicRoughnessTexture'], 'Roughness payload/response changed'
                assert old_pbr['baseColorTexture']['resolvedTexture']['image']['sha256'] != new_pbr['baseColorTexture']['resolvedTexture']['image']['sha256']
            assert reference.read_bytes() == old_raw and candidate.read_bytes() == raw
            row.update(outcome='PASS', changedColorImages=changed, geometryNormalUvIndexArraysExact=True,
                       rootTransformsExact=True, roughnessPayloadsExact=True, nonColorMaterialSemanticsExact=True,
                       samplersExact=True, everySamplerClampsBothAxes=True)
        result['outcome'] = 'PASS'
    except BaseException as error:
        result['error'] = str(error)
        raise
    finally:
        output.write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
