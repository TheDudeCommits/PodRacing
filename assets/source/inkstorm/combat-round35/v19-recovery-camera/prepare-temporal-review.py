"""CPU-only evidence extraction after root releases native capture.

The caller must first visually establish --cut-frame from a locator decode.
That explicit source frame, not the native wall clock, pins the unchanged phases.
No browser, game launch, runtime mutation or critic execution is performed here.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from PIL import Image, ImageDraw

parser = argparse.ArgumentParser()
parser.add_argument('--receipt', type=Path, required=True)
parser.add_argument('--cut-frame', type=int, required=True)
parser.add_argument('--case', default='solo-chase')
args = parser.parse_args()
receipt = json.loads(args.receipt.read_text())
case = next(row for row in receipt['cases'] if row['id'] == args.case)
video = Path(case['video'])
root = args.receipt.resolve().parent
out = root / 'temporal-review'
out.mkdir(exist_ok=False)
commands = []

def run(command):
    commands.append(command)
    (out / 'extraction-commands.json').write_text(json.dumps(commands, indent=2) + '\n')
    return subprocess.run(command, capture_output=True, text=True, check=True)

probe = run(['/opt/homebrew/bin/ffprobe', '-v', 'error', '-show_streams', '-show_format', '-show_frames', '-select_streams', 'v:0', '-show_entries', 'frame=best_effort_timestamp_time,key_frame', '-of', 'json', str(video)])
(out / 'source-video-probe.json').write_text(probe.stdout)
frames = json.loads(probe.stdout)['frames']
pts = [float(row['best_effort_timestamp_time']) for row in frames]
assert len(pts) > args.cut_frame + 72 and all(abs(value - index * .04) < 1e-6 for index, value in enumerate(pts)), 'Stop: actual source is not the unchanged 25 fps phase contract.'
first = max(0, args.cut_frame - 18)
last = min(len(pts) - 1, args.cut_frame + 180)
run(['/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-threads', '1', '-i', str(video), '-vf', f'select=between(n\\,{first}\\,{last})', '-fps_mode', 'passthrough', '-threads', '1', str(out / 'temporal-%03d.png')])
files = sorted(out.glob('temporal-*.png'))
assert len(files) == last - first + 1
for start in range(0, len(files), 16):
    sheet = Image.new('RGB', (1440, 980), (20, 20, 20))
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(files[start:start + 16]):
        source_index = first + start + index
        image = Image.open(path).convert('RGB')
        image.thumbnail((360, 225))
        x, y = index % 4 * 360, index // 4 * 245
        sheet.paste(image, (x, y))
        draw.text((x + 6, y + 227), f'frame {source_index} / PTS {pts[source_index]:.2f}s', fill='white')
    sheet.save(out / f'dense-sheet-{start // 16 + 1:02d}.jpg', quality=94)
phases = []
for name, offset in [('entry', 0), ('early-impact', 1), ('hold', 13), ('debris-return', 26), ('settled', 46), ('recovery', 72)]:
    source_index = args.cut_frame + offset
    source = out / f'temporal-{source_index - first + 1:03d}.png'
    target = out / f'{name}-pts{pts[source_index]:.2f}.png'
    shutil.copyfile(source, target)
    phases.append({'phase': name, 'sourceFrameIndex': source_index, 'sourcePTS': pts[source_index], 'offsetFromFirstVisibleCutSeconds': offset * .04, 'path': str(target), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
run(['/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-threads', '1', '-i', str(video), '-ss', str(pts[first]), '-t', str(pts[last] - pts[first] + .04), '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '18', '-threads', '1', str(out / 'solo-chase-through-driving-clip.mp4')])
(out / 'extraction-receipt.json').write_text(json.dumps({'sourceVideo': str(video), 'sourceVideoSha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'sourceFrameIndices': [first, last], 'sourcePTS': [pts[first], pts[last]], 'cutFrameSuppliedAfterVisualLocator': args.cut_frame, 'phaseFrames': phases, 'viewingStatus': 'EXTRACTED ONLY; human/model viewing and critic/raw audit still required', 'notes': 'No retiming, audio claim, native-FPS claim or automatic visual acceptance.'}, indent=2) + '\n')
print(f'Extracted {len(files)} consecutive frames; actual viewing/critic pending: {out}')
