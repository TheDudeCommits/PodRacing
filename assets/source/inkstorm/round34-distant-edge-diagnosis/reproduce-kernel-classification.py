"""Small numeric Sobel-classification analysis, not a renderer or gameplay test.
Uses synthetic 3x3 normal/depth/class samples. No browser, GPU, image or src edit.
"""
from pathlib import Path
import json
import math

OUT = Path(__file__).resolve().parent
CROSS = (1, 3, 4, 5, 7)
DIAGONALS = (0, 2, 6, 8)
GX = (-1, 0, 1, -2, 0, 2, -1, 0, 1)
GY = (-1, -2, -1, 0, 0, 0, 1, 2, 1)
CONFIG = {'normalWeight': .38, 'depthWeight': 7.2, 'edgeThreshold': .16,
          'edgeSoftness': .022, 'opacity': .74, 'hullSuppression': .08,
          'silhouetteDepthThreshold': .12, 'terrainSuppression': .08}


def smoothstep(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def evaluate(geometry, geometry_class=.5, geometry_depth=.25):
    normal = [(0, 1, 0) if present else (0, 0, 1) for present in geometry]
    depth = [geometry_depth if present else 1 for present in geometry]
    classes = [geometry_class if present else 0 for present in geometry]
    nx = [sum(normal[i][k] * GX[i] for i in range(9)) for k in range(3)]
    ny = [sum(normal[i][k] * GY[i] for i in range(9)) for k in range(3)]
    normal_edge = (math.sqrt(sum(v*v for v in nx)) + math.sqrt(sum(v*v for v in ny))) * .125
    raw_depth = (abs(sum(depth[i]*GX[i] for i in range(9))) + abs(sum(depth[i]*GY[i] for i in range(9)))) * .125
    depth_edge = raw_depth / max(min(depth[i] for i in CROSS), .002)
    combined = normal_edge*.38 + depth_edge*7.2
    base_edge = smoothstep(.16, .182, combined)
    silhouette = max(float(max(depth[i] for i in DIAGONALS) >= .999), float(depth_edge >= .12))
    def classified_ink(edge_class):
        hull = float(edge_class >= .75)
        terrain = float(edge_class >= .25) * (1-hull)
        suppression = 1 + (.08-1)*hull*silhouette
        return base_edge * suppression * (1+(.08-1)*terrain) * .74
    old_class = max(classes[i] for i in CROSS)
    new_class = max(classes)
    return {'oldClass': old_class, 'newClass': new_class, 'normalEdge': normal_edge,
            'relativeDepthEdge': depth_edge, 'combinedEdge': combined,
            'oldInkWeight': classified_ink(old_class), 'newInkWeight': classified_ink(new_class),
            'centreIsSky': not geometry[4]}


single_corner = [i == 0 for i in range(9)]
example = evaluate(single_corner)
assert example['oldClass'] == 0 and example['newClass'] == .5
assert abs(example['oldInkWeight'] - .74) < 1e-12
assert abs(example['newInkWeight'] - .0592) < 1e-12
rows = []
for geometry_class in (0, .5, 1):
    changed = []
    visible_leaks = []
    for bits in range(512):
        geometry = [bool(bits & (1 << i)) for i in range(9)]
        result = evaluate(geometry, geometry_class)
        if result['oldClass'] != result['newClass']:
            changed.append(bits)
        if result['oldClass'] == 0 and result['newClass'] > 0 and result['oldInkWeight'] > .0592 + 1e-12:
            visible_leaks.append({'occupancyBits': bits, **result})
        if any(geometry[i] for i in CROSS):
            assert result['oldClass'] == result['newClass']
        if geometry_class == 0:
            assert result['oldInkWeight'] == result['newInkWeight']
        assert result['newInkWeight'] <= result['oldInkWeight'] + 1e-12
    rows.append({'class': geometry_class, 'syntheticNeighborhoods': 512,
                 'changedClassificationCount': len(changed),
                 'unsuppressedVisibleDiagonalNeighborhoods': len(visible_leaks),
                 'examples': visible_leaks[:4]})
assert rows[0]['changedClassificationCount'] == 0
assert rows[1]['changedClassificationCount'] == rows[2]['changedClassificationCount'] == 15
report = {'scope': 'Synthetic 3x3 scalar/vector evaluation of the source equations; no actual G-buffer or GPU output sampled. Establishes the code mechanism, not complete attribution of a screenshot.',
          'configFromGameApp': CONFIG, 'geometryDepth': .25,
          'normalGeometry': [0, 1, 0], 'normalBackground': [0, 0, 1],
          'stencilOrder': [['00','10','20'],['01','11','21'],['02','12','22']],
          'legacyClassSamples': ['10','01','11','21','12'], 'candidateClassSamples': ['00','10','20','01','11','21','02','12','22'],
          'singleUpperLeftGeometrySample': example,
          'legacyVsCandidateInkRatio': example['oldInkWeight']/example['newInkWeight'],
          'enumeration': rows,
          'checks': {'genericClassUnchangedForAll512Neighborhoods': True,
                     'existingAxialOrCenterClassUnchanged': True,
                     'noNewInkWeightIncreaseInHomogeneousClassCases': True},
          'sourceTextureInvocationsPerMainExcludingContactFunction': {'legacy':23,'candidate':18,
            'scope':'Counts explicit helper-expanded source lookups; compiler CSE may already remove duplicates. No GPU speedup claim.'}}
p = OUT / 'numeric-reproduction.json'
assert not p.exists()
p.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'singleCorner':example,'ratio':report['legacyVsCandidateInkRatio'],'enumeration':[{'class':r['class'],'changed':r['changedClassificationCount'],'visibleLeak':r['unsuppressedVisibleDiagonalNeighborhoods']} for r in rows]},indent=2))
