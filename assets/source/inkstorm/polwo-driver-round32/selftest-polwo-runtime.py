#!/usr/bin/env python3
"""Small synthetic checks for packaging's lossy boundaries and fail-closed guards."""
import copy
import importlib.util
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image

from _polwo_glb import budget_check, mip_bytes, read_glb, write_glb_bytes

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('polwo_package', ROOT / 'package-polwo-runtime.py')
package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(package)


def encoded(array):
    stream = io.BytesIO()
    Image.fromarray(np.array(array, dtype=np.uint8), 'RGBA').save(stream, format='PNG')
    return stream.getvalue()


def resized(array, role, cap=1):
    result, _, _ = package.resize_image(encoded(array), role, cap)
    return np.asarray(Image.open(io.BytesIO(result)))


checks = []
# A linear-light average should retain brightness, not average gamma-coded 0/255 to 128.
sample = resized([[[0, 0, 0, 255], [255, 255, 255, 255]]], 'color')
assert 185 <= sample[0, 0, 0] <= 190, sample
assert sample[0, 0, 3] == 255
checks.append('sRGB downsampling averages in linear light and preserves opaque alpha')
# ORM is scalar data: red/green/blue channels must not be swapped or gamma-converted.
sample = resized([[[20, 80, 240, 255], [40, 120, 160, 255]]], 'data')
assert np.max(np.abs(sample[0, 0, :3].astype(int) - np.array([30, 100, 200]))) <= 1, sample
checks.append('ORM channel identity and scalar filtering preserved')
sample = resized([[[218, 128, 218, 255], [128, 218, 218, 255]]], 'normal')
normal = sample[0, 0, :3].astype(float) / 255 * 2 - 1
assert .985 <= np.linalg.norm(normal) <= 1.015 and normal[2] > .7, normal
checks.append('normal filtering renormalizes vectors without reversing green')
assert 4 * mip_bytes(1024, 1024) + 2 * mip_bytes(512, 512) == 25_165_816
checks.append('full-mip estimate includes down to 1x1 and meets 24 MiB default')
doc = {'nodes': [{'mesh': i, 'name': name} for i, name in enumerate(
    ['polwo-body-0 fit-v3 paint-v1 repair-v1', 'polwo-body-1 fit-v3 paint-v1 repair-v1']
    + ['polwo-pilot-' + p + '.014 fit-v3 paint-v1 repair-v1' for p in package.PARTS])],
    'materials': [{'name': 'Pilot atlas v4c runtime ' + p + '.009'} for p in package.PARTS]}
package.canonical_names(doc)
assert len({n['name'] for n in doc['nodes']}) == 8 and doc['nodes'][0]['name'] == 'polwo-body-0'
assert all('.' not in m['name'] for m in doc['materials'])
checks.append('fit/paint/repair suffixes normalize to stable exact node/material contracts')
bad = copy.deepcopy(doc)
bad['nodes'][1]['name'] = bad['nodes'][0]['name']
try:
    package.canonical_names(bad)
except ValueError:
    checks.append('duplicate canonical node names rejected')
else:
    raise AssertionError('Duplicate node admitted')
stats = {'triangles': 48843, 'bodyDraws': 2, 'pilotDraws': 6, 'opaqueDraws': 8,
         'rgba8FullMipBytes': 25_165_816, 'allMeshDefinitionsReferenced': True}
budget_check(stats)
for key, value in [('triangles', 60001), ('bodyDraws', 7), ('pilotDraws', 7), ('opaqueDraws', 13),
                   ('rgba8FullMipBytes', 24 * 1048576 + 1), ('allMeshDefinitionsReferenced', False)]:
    try:
        budget_check({**stats, key: value})
    except ValueError:
        pass
    else:
        raise AssertionError('Budget guard not enforced: ' + key)
checks.append('triangle/body/pilot/draw/decoded-image/unused-mesh limits all fail closed')
print(json.dumps({'syntheticSelftestPass': True, 'checks': checks, 'assetFilesReadOrWritten': False}, indent=2))
