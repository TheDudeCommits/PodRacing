import hashlib
import json
from pathlib import Path
import shutil
import tempfile

repo = Path('/Users/amir/Projects/PodRacing')
root = Path(__file__).resolve().parent / 'blind-runtime-v12'
root.mkdir(exist_ok=False)
work = Path(tempfile.mkdtemp(prefix='podracing-foundry-blind-'))
versions = {'v10': 'round34-pilot-separation-v10', 'v12': 'round34-foundry-finish-v12'}
images = []
for scene, order in [('06-foundry', ['v12', 'v10']), ('foundry-near-span', ['v10', 'v12']), ('foundry-middle', ['v12', 'v10']), ('foundry-exit', ['v10', 'v12'])]:
    for version in order:
        original = repo / 'output/gauntlet' / versions[version] / 'captures' / (scene + '.png')
        attachment = work / ('frame-%02d.png' % (len(images) + 1))
        shutil.copyfile(original, attachment)
        images.append({'original': str(original), 'attachment': str(attachment), 'sha256': hashlib.sha256(original.read_bytes()).hexdigest(), 'scene': scene, 'privateVersion': version})
for name in ['06-foundry.png', '11-foundry-construction-round33.png']:
    original = repo / 'docs/inkstorm-overhaul/concepts' / name
    attachment = work / ('frame-%02d.png' % (len(images) + 1))
    shutil.copyfile(original, attachment)
    images.append({'original': str(original), 'attachment': str(attachment), 'sha256': hashlib.sha256(original.read_bytes()).hexdigest(), 'kind': 'generatedconcept'})
(root / 'inventory.json').write_text(json.dumps({'workdir': str(work), 'images': images}, indent=2) + '\n')
prompt = '''Act as a fresh independent game-environment art critic. Use only the ten attached images. Do not retrieve history or memory, read files, browse, use tools, inspect code, or consult prior reviews. No version order or intended improvement is supplied.
Images 1+2, 3+4, 5+6 and 7+8 are four pairs of actual same-location gameplay views. Ordering differs between pairs. Images 9+10 are generated art targets, not game screenshots or exact geometry requirements. Inspect all actual frames separately. Evaluate lighting and material finish, legibility of equipment construction and recesses, visual hierarchy, believable integration with the terrain, road readability and spectacle. Identify visible tint, repeated shading, light bleed or flattened construction only if evidenced in the images. Do not infer frame rate, motion behavior, gameplay quality or technical correctness from stills.
Give one concise observation and material/environment score out of 10 per actual image. For each pair choose the preferable numbered image or TIE, with confidence, visible evidence and tradeoffs. State whether either treatment reaches 8/10 relative to the targets, and give the three highest-impact next corrections. Explicitly declare how many images you examined.
'''
(root / 'prompt.txt').write_text(prompt)
shutil.copyfile(repo / 'assets/source/inkstorm/blockrunner-round34/contact-color-v1-blind-review/run-image-critic.py', root / 'run-image-critic.py')
print(json.dumps({'root': str(root), 'images': len(images)}))
