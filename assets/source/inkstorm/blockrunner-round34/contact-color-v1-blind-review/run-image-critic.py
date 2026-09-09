"""One isolated, image-only critic; preserve the exact attachments and raw events."""
import hashlib
import json
from pathlib import Path
import subprocess
from datetime import datetime, timezone

root = Path(__file__).resolve().parent
inventory = json.loads((root / 'inventory.json').read_text())
out = root / 'cli-critic-attempt1'
out.mkdir(exist_ok=False)
for entry in inventory['images']:
    for key in ('original', 'attachment'):
        assert hashlib.sha256(Path(entry[key]).read_bytes()).hexdigest() == entry['sha256']
prompt = (root / 'prompt.txt').read_text()
args = ['/Users/amir/.local/bin/codex', 'exec', '--sandbox', 'read-only', '--cd', inventory['workdir'], '--skip-git-repo-check', '--ephemeral', '--json', '--color', 'never', '--output-last-message', str(out / 'review.md')]
for entry in inventory['images']:
    args.extend(['--image', entry['attachment']])
args.append('-')
started = datetime.now(timezone.utc).isoformat()
with (out / 'events.jsonl').open('w') as stdout, (out / 'stderr.log').open('w') as stderr:
    result = subprocess.run(args, input=prompt, text=True, stdout=stdout, stderr=stderr, check=False, timeout=900)
record = {'started': started, 'completed': datetime.now(timezone.utc).isoformat(), 'returncode': result.returncode, 'argv': args, 'promptSha256': hashlib.sha256(prompt.encode()).hexdigest(), 'attachmentCount': len(inventory['images']), 'notes': 'Separate ephemeral CLI process because collaboration spawn returned agent thread limit reached. Generic user configuration may load; inspect events for extra retrieval before asserting blind review.'}
(out / 'invocation.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(record, indent=2))
raise SystemExit(result.returncode)
