"""One independent image-only critic; preserve exact attachments and raw events."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
release = json.loads((root / 'RELEASE.json').read_text())
assert release.get('released') is True, 'Root release is required'
inventory = json.loads((root / 'inventory.json').read_text())
assert inventory['buildSha256'] == release['expectedBuildSha256']
assert inventory['releaseSha256'] == sha(root / 'RELEASE.json')
assert len(inventory['images']) == 7
assert sha(Path(inventory['captureReceipt'])) == inventory['captureReceiptSha256']
for entry in inventory['images']:
    for key in ('original', 'attachment'):
        assert sha(Path(entry[key])) == entry['sha256']
prompt = (root / 'prompt.txt').read_text()
assert hashlib.sha256(prompt.encode()).hexdigest() == inventory['promptSha256']
assert {path.name for path in Path(inventory['workdir']).iterdir()} == {f'image-{i}.png' for i in range(1, 8)}
out = root / 'cli-critic-attempt1'
out.mkdir(exist_ok=False)
args = ['/Users/amir/.local/bin/codex', 'exec', '--sandbox', 'read-only', '--cd', inventory['workdir'], '--skip-git-repo-check', '--ephemeral', '--json', '--color', 'never', '--output-last-message', str(out / 'review.md')]
for entry in inventory['images']:
    args.extend(['--image', entry['attachment']])
args.append('-')
record = {'started': datetime.now(timezone.utc).isoformat(), 'argv': args, 'promptSha256': inventory['promptSha256'], 'attachmentCount': len(inventory['images']), 'buildSha256': inventory['buildSha256'], 'notes': 'Independent ephemeral CLI with default user model configuration. Only seven neutral image filenames and the exact V10 prompt are supplied. Generic user configuration may load; audit raw events for extra retrieval before asserting blind review.'}
(out / 'invocation.json').write_text(json.dumps(record, indent=2) + '\n')
try:
    with (out / 'events.jsonl').open('w') as stdout, (out / 'stderr.log').open('w') as stderr:
        result = subprocess.run(args, input=prompt, text=True, stdout=stdout, stderr=stderr, check=False, timeout=900)
    record['returncode'] = result.returncode
except subprocess.TimeoutExpired:
    record['returncode'] = 124
    record['error'] = 'CLI critic exceeded the 900-second bound; raw record preserved'
finally:
    record['completed'] = datetime.now(timezone.utc).isoformat()
    (out / 'invocation.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
raise SystemExit(record['returncode'])
