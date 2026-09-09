"""Compose reviewable private patches; never apply to the running checkout."""
from pathlib import Path
import difflib
import hashlib
import json
import subprocess

root = Path(__file__).resolve().parent
project = root.parents[4]
changed = ['src/camera/CinematicCamera.ts', 'src/render/combat/WreckVisualPose.ts',
           'src/render/combat/TeemtoAuthoredDamage.ts']
added = ['tests/camera/TeemtoImpactFraming.test.ts', 'tests/fixtures/teemtoActualCamera.ts']
adapter = 'src/render/app/GameApp.ts'


def delta(path, new=False):
    before = [] if new else (root / 'before' / path).read_text().splitlines(True)
    after = (root / 'candidate' / path).read_text().splitlines(True)
    return ''.join(difflib.unified_diff(before, after, fromfile='/dev/null' if new else f'a/{path}', tofile=f'b/{path}'))


def record(path):
    data = path.read_bytes()
    return {'path': str(path), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


for path in changed:
    assert (project / path).read_bytes() == (root / 'before' / path).read_bytes(), path
for path in added:
    assert not (project / path).exists(), path
main = root / 'v24-impact-camera.patch'
gameapp = root / 'v24-gameapp-impact-adapter.patch'
main.write_text(''.join(delta(path) for path in changed) + ''.join(delta(path, True) for path in added))
gameapp.write_text(delta(adapter))
result = subprocess.run(['git', 'apply', '--check', str(main), str(gameapp)], cwd=project, capture_output=True, text=True)
(root / 'apply-check.log').write_text(result.stdout + result.stderr + f'\nexitCode={result.returncode}\n')
assert result.returncode == 0
paths = [main, gameapp, root / 'input-inventory.json', root / 'same-snapshot-metrics.json',
         root / 'HANDOFF.md', root / 'focused-final.log', root / 'typecheck-final.log', root / 'apply-check.log']
paths += [root / 'candidate' / path for path in changed + added + [adapter]]
(root / 'final-inventory.json').write_text(json.dumps({
    'scope': 'PRIVATE ONLY; git apply --check passed, no live apply or native visual acceptance.',
    'files': [record(path) for path in paths],
    'gameAppLiveInput': record(project / adapter),
    'gameAppNote': 'Root owns concurrent HUD changes. Adapter is two added optional-field assignments; dry apply checked against the current live GameApp without overwriting it.'
}, indent=2) + '\n')
for path in [main, gameapp, root / 'HANDOFF.md', root / 'final-inventory.json']:
    print(json.dumps(record(path)))
