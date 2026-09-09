"""Compare the two preserved CPU terrain first-hit studies; no image editing."""
import json
import sys
from pathlib import Path

directory = Path('assets/source/inkstorm/launch-escarpment-v27')
mode = sys.argv[1] if len(sys.argv) > 1 else 'candidate'
before = json.loads((directory / 'round26-roi.json').read_text())
after = json.loads((directory / f'{mode}-roi.json').read_text())
regions, witnesses = [], []
for old, new in zip(before['results'], after['results']):
    assert old['id'] == new['id']
    pairs = [(b['hit']['distance'] - a['hit']['distance'], a, b)
             for a, b in zip(old['samples'], new['samples']) if a['hit'] and b['hit']]
    errors = sorted(abs(b['hit']['height'] - b['hit']['physicalHeight']) for _, _, b in pairs)
    regions.append({
        'id': old['id'], 'sampledRays': len(old['samples']), 'bothHit': len(pairs),
        'changed5m': sum(abs(d) > 5 for d, _, _ in pairs),
        'deeper25m': sum(d > 25 for d, _, _ in pairs),
        'maxRecess': max(d for d, _, _ in pairs), 'maxAdvance': min(d for d, _, _ in pairs),
        'maxBaselineInterpolationError': max(abs(a['hit']['height'] - a['hit']['physicalHeight']) for _, a, _ in pairs),
        'maxCandidateInterpolationError': max(errors),
        'p95CandidateInterpolationError': errors[int(.95 * (len(errors) - 1))],
    })
    for distance, a, b in sorted(pairs, reverse=True, key=lambda p: p[0])[:2]:
        witnesses.append({'roi': old['id'], 'u': a['u'], 'v': a['v'], 'recession': distance,
                          'before': a['hit'], 'after': b['hit']})
report = {'regions': regions, 'sourceSha256': after['sourceSha256'], 'witnesses': witnesses}
(directory / f'{mode}-roi-comparison.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({'regions': regions, 'sourceSha256': after['sourceSha256']}, indent=2))
