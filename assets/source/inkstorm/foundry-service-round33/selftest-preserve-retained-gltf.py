#!/usr/bin/env python3
"""Synthetic packer tests. No Blender/native-export or visual-acceptance claim."""
import argparse
import copy
import importlib.util
import json
from pathlib import Path
import random
import struct
import sys
import tempfile
import time

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('preserve_retained', HERE / 'preserve-retained-gltf.py')
packer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packer)


def fixture(source, *, drift=False, rgb8=False, mutation=None):
    rows = []
    for position, normal, color in zip(*(source['attributes'][key] for key in ('POSITION', 'NORMAL', 'COLOR_0'))):
        normal = list(normal)
        if drift:
            normal[0] += 0.00011573731899261475
            magnitude = sum(value * value for value in normal) ** .5
            normal = [value / magnitude for value in normal]
        rows.append(list(position) + list(normal) + list(color) + [1.0])
    triangles = [source['triangles'][index] for index in packer.RETAINED]
    for index in range(2560):
        x, z = -19.2 + (index % 64) * .6, -1.2 + (index // 64) * .06
        start = len(rows)
        for position in ((x, 61.45, z), (x, 61.45, z + .024), (x + .28, 61.45, z)):
            rows.append(list(position) + [0., 1., 0., .8, .2, .1, 1.])
        triangles.append((start, start + 1, start + 2))
    if mutation == 'reversed':
        triangles[0] = tuple(reversed(triangles[0]))
    elif mutation == 'duplicate':
        triangles[-1] = triangles[0]
    elif mutation == 'signal':
        triangles[-1] = source['triangles'][min(packer.REMOVED)]
    elif mutation == 'moved':
        rows[triangles[0][0]][0] += .001
    elif mutation == 'missing':
        triangles[0] = triangles[-1]
    elif mutation == 'false-match':
        start = len(rows)
        for old in triangles[0]:
            row = list(rows[old]); row[0] += .000005; rows.append(row)
        triangles[-1] = (start, start + 1, start + 2)
    elif mutation == 'alpha':
        rows[-1][-1] = .5
    elif mutation == 'low-addition':
        rows[-1][1] = 39.0
    # Deliberately invalidate source/native vertex IDs, triangle order and starting corners.
    rng = random.Random(330033)
    order = list(range(len(rows))); rng.shuffle(order)
    remap = {old: new for new, old in enumerate(order)}
    triangles = [tuple(remap[index] for index in triangle[i % 3:] + triangle[:i % 3]) for i, triangle in enumerate(triangles)]
    rng.shuffle(triangles)
    if rgb8:
        vertex = b''.join(struct.pack('<6f3Bx', *rows[index][:6], *(round(value * 255) for value in rows[index][6:9])) for index in order)
        stride, color_type, color_width = 28, 5121, 'VEC3'
    else:
        vertex = b''.join(struct.pack('<10f', *rows[index]) for index in order)
        stride, color_type, color_width = 40, 5126, 'VEC4'
    indices = struct.pack('<' + 'H' * 19500, *(index for triangle in triangles for index in triangle))
    document = {'asset': {'version': '2.0', 'generator': 'SYNTHETIC TEST ONLY'}, 'scene': 0,
                'scenes': [{'nodes': [0]}], 'nodes': [{'name': packer.FAMILY, 'mesh': 0}],
                'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'indices': 3, 'material': 0}]}],
                'materials': copy.deepcopy(source['document']['materials']),
                'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': len(vertex), 'byteStride': stride},
                                {'buffer': 0, 'byteOffset': len(vertex), 'byteLength': len(indices)}],
                'accessors': [{'bufferView': 0, 'byteOffset': offset, 'componentType': 5126, 'type': 'VEC3', 'count': len(rows)} for offset in (0, 12)]}
    document['accessors'].append({'bufferView': 0, 'byteOffset': 24, 'componentType': color_type, 'type': color_width, 'count': len(rows)})
    if rgb8:
        document['accessors'][2]['normalized'] = True
    document['accessors'].append({'bufferView': 1, 'componentType': 5123, 'type': 'SCALAR', 'count': 19500})
    return packer.make_glb(document, vertex + indices)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    packer.require(not args.receipt.exists() and args.receipt.parent.is_dir(), 'Receipt exists or parent missing')
    start = time.monotonic()
    source_raw = packer.SOURCE.read_bytes()
    source = packer.decode(source_raw)
    tests = []
    with tempfile.TemporaryDirectory(prefix='gantry-preservation-selftest-') as temporary:
        root = Path(temporary)
        native_raw = fixture(source, drift=True)
        native_path = root / 'synthetic-native.glb'
        native_path.write_bytes(native_raw)
        result, check = packer.analyze(source_raw, native_raw)
        assert result is None and not check['nativeRetainedAttributesExact']
        assert check['nativeRetainedAttributes']['POSITION']['exact'] and check['nativeRetainedAttributes']['COLOR_0']['exact']
        assert check['nativeRetainedAttributes']['NORMAL']['maximumComponentDelta'] > 3e-5
        tests.append({'test': 'check-only-detects-normal-drift-without-output', 'pass': True})
        packed, repaired = packer.analyze(source_raw, native_raw, repair=True)
        output = root / 'repaired.glb'; packer.write_new(output, packed)
        _, exact_recheck = packer.analyze(source_raw, output.read_bytes())
        assert exact_recheck['nativeRetainedAttributesExact'] and output.read_bytes() == packed
        assert repaired['final']['retainedInterleavedRecordsSha256'] == 'd8a036cd26111a5f1a4cdb8b2d14c76c15c975a069ec13ccd1e926261b463f28'
        tests.append({'test': 'repair-after-vertex-triangle-reorder-and-cyclic-rotation-restores-all-source-bytes-and-seams', 'pass': True})
        try:
            packer.write_new(output, b'overwrite')
            raise AssertionError('Existing output accepted')
        except FileExistsError:
            assert output.read_bytes() == packed
        tests.append({'test': 'existing-output-refused-without-changing-it', 'pass': True})
        _, exact = packer.analyze(source_raw, fixture(source))
        assert exact['nativeRetainedAttributesExact']
        tests.append({'test': 'exact-RGBA-native-needs-no-repair', 'pass': True})
        normalized_packed, normalized = packer.analyze(source_raw, fixture(source, rgb8=True), repair=True)
        assert normalized['final']['retainedPositionNormalColorBytesExact']
        _, normalized_check = packer.analyze(source_raw, normalized_packed)
        assert normalized_check['nativeRetainedAttributesExact']
        tests.append({'test': 'normalized-byte-native-color-converts-additions-and-restores-source-float-color', 'pass': True})
        expected = {'reversed': 'Reversed', 'duplicate': 'Duplicate', 'signal': 'Removed signal', 'moved': 'Missing/moved',
                    'missing': 'Missing/moved', 'false-match': 'Duplicate', 'alpha': 'Nonopaque', 'low-addition': 'clearance'}
        for mutation, message in expected.items():
            try:
                packer.analyze(source_raw, fixture(source, mutation=mutation), repair=True)
                raise AssertionError('Unsafe fixture accepted: ' + mutation)
            except ValueError as error:
                assert message.lower() in str(error).lower(), (mutation, str(error))
                tests.append({'test': 'reject-' + mutation, 'pass': True, 'observedError': str(error)})
        assert native_path.read_bytes() == native_raw and packer.SOURCE.read_bytes() == source_raw
        tests.append({'test': 'both-inputs-byte-preserved', 'pass': True})
        temporary_path = str(root)
    assert not Path(temporary_path).exists()
    report = {'status': 'PASS', 'scope': 'Synthetic fixtures only; actual native export and Khronos validation remain pending.',
              'testsPassed': len(tests), 'tests': tests, 'temporaryFixturesCleaned': True, 'sourceSha256': packer.sha(source_raw),
              'packerSha256': packer.sha((HERE / 'preserve-retained-gltf.py').read_bytes()),
              'selftestSha256': packer.sha(Path(__file__).read_bytes()), 'durationSeconds': round(time.monotonic() - start, 3),
              'syntheticNormalMaximumDelta': check['nativeRetainedAttributes']['NORMAL']['maximumComponentDelta'],
              'syntheticFinalProof': repaired['final']}
    packer.write_new(args.receipt, (json.dumps(report, indent=2, sort_keys=True) + '\n').encode())
    print(json.dumps({'status': 'PASS', 'testsPassed': len(tests), 'receipt': str(args.receipt), 'durationSeconds': report['durationSeconds']}))


if __name__ == '__main__':
    main()
