"""Freeze seven actual images only after the root explicitly releases the capture."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import struct
import tempfile

root = Path(__file__).resolve().parent
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
release = json.loads((root / 'RELEASE.json').read_text())
assert release.get('released') is True, 'Root release is required'
assert not (root / 'inventory.json').exists(), 'Do not replace an existing frozen inventory'
plan = json.loads((root / 'inventory-plan.json').read_text())
assert sha(root / 'prompt.txt') == plan['promptSha256']
receipt_path = Path(plan['captureReceipt'])
receipt = json.loads(receipt_path.read_text())
assert receipt['cleanup']['browserClosed'] is True
assert receipt['cleanup']['serverExited'] is True
assert not receipt['cleanup']['errors']
scripts = receipt['environment']['scripts']
assert len(scripts) == 1, 'Expected one native bundle receipt'
assert scripts[0]['sha256'] == release['expectedBuildSha256']
captured = {entry['name'] for entry in receipt['captures']}
assert len(plan['images']) == 7
for entry in plan['images']:
    original = Path(entry['original'])
    data = original.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    if entry['expectedReferenceSha256']:
        assert sha(original) == entry['expectedReferenceSha256']
    else:
        assert original.stem in captured, f'Missing native capture receipt: {original.name}'
workdir = Path(tempfile.mkdtemp(prefix='inkstorm-ui-critic-v14-'))
images = []
for entry in plan['images']:
    original = Path(entry['original'])
    attachment = workdir / f"image-{entry['image']}.png"
    shutil.copy2(original, attachment)
    digest = sha(original)
    assert sha(attachment) == digest
    width, height = struct.unpack('>II', original.read_bytes()[16:24])
    images.append({'original': str(original), 'attachment': str(attachment), 'sha256': digest, 'width': width, 'height': height})
inventory = {
    'preparedAt': datetime.now(timezone.utc).isoformat(),
    'workdir': str(workdir),
    'buildSha256': scripts[0]['sha256'],
    'captureReceipt': str(receipt_path),
    'captureReceiptSha256': sha(receipt_path),
    'promptSha256': plan['promptSha256'],
    'releaseSha256': sha(root / 'RELEASE.json'),
    'images': images,
}
(root / 'inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
print(json.dumps(inventory, indent=2))
