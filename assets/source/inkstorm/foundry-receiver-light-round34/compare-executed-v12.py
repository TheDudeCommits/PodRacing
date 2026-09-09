import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

repo = Path('/Users/amir/Projects/PodRacing')
before = repo / 'output/gauntlet/round34-pilot-separation-v10/captures'
after = repo / 'output/gauntlet/round34-foundry-finish-v12/captures'
a = json.loads((before / 'receipts.json').read_text())
b = json.loads((after / 'receipts.json').read_text())
def indexed(receipt):
    return {row.get('section', row.get('view'))['id']: row for row in receipt['receipts'] + receipt['supplemental']}
aa, bb = indexed(a), indexed(b)
assert aa.keys() == bb.keys()
rows = []
for key in aa:
    x, y = aa[key], bb[key]
    fields = ['position', 'cameraPosition', 'cameraFocusPosition', 'yaw', 'speed', 'renderedRacerPositions']
    same = {field: x['game'][field] == y['game'][field] for field in fields}
    assert all(same.values()), (key, same)
    assert x['raceTime'] == y['raceTime'] == 0
    draw = {field: {'before': x['renderer'][field], 'after': y['renderer'][field]} for field in ['calls', 'triangles', 'width', 'height', 'pixelRatio']}
    assert all(v['before'] == v['after'] for v in draw.values())
    p, q = before / (key + '.png'), after / (key + '.png')
    px, py = np.asarray(Image.open(p).convert('RGB')).astype(np.int16), np.asarray(Image.open(q).convert('RGB')).astype(np.int16)
    delta = np.abs(px - py)
    rows.append({'id': key, 'samePose': same, 'render': draw, 'resourceBefore': x['renderer']['memory'], 'resourceAfter': y['renderer']['memory'], 'pixels': int(delta.shape[0]*delta.shape[1]), 'changedPixels': int(np.any(delta != 0, axis=2).sum()), 'meanAbsoluteRgbDelta': float(delta.mean()), 'beforeSha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'afterSha256': hashlib.sha256(q.read_bytes()).hexdigest()})
report = {'candidate': 'V12 Foundry contact and local receiver wash; retained V10 vehicle style and wider camera, V8 GLBs', 'environment': b['environment'], 'rows': rows, 'shortLivePerformance': b['performance'], 'errors': b['errors'], 'limits': 'Staged poses are for visual comparison. Short live driving is not a full-race or mixed-combat benchmark. Startup resource baselines differ, so these counts establish neither a resource regression nor its absence. All matched draw, triangle and renderer-resolution counts equal. Owned gauntlet browser closed and port5186 no listener after completion.'}
(after.parent / 'matched-v10-v12.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'poses': len(rows), 'changedPixels': {r['id']: r['changedPixels'] for r in rows}, 'errors': b['errors']}, indent=2))
