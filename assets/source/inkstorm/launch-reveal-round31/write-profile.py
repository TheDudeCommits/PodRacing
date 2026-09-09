"""Write a small vector profile figure from already measured CPU samples.

No terrain evaluation, geometry bake, renderer, image processing or test run.
"""
from pathlib import Path
import csv
import json

folder = Path(__file__).parent
rows = json.loads((folder / 'longitudinal.json').read_text())
with (folder / 'longitudinal.csv').open('w') as handle:
    writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

W, H = 1120, 630
left, right = 86, 1080
xmin, xmax = rows[0]['distance'], rows[-1]['distance']
def x(value):
    return left + (value - xmin) / (xmax - xmin) * (right - left)
def y(value, low, high, top, bottom):
    return bottom - (value - low) / (high - low) * (bottom - top)

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
       '<rect width="100%" height="100%" fill="#faf8f4"/>',
       '<style>text{font-family:system-ui,sans-serif;fill:#34333a} .minor{font-size:12px;fill:#66616a}</style>',
       '<text x="86" y="35" font-size="23" font-weight="650">Launch: convex shelf → concave escarpment</text>',
       '<text x="86" y="58" class="minor">CPU profile at fixed horizontal route • source candidate only • actual image and driving acceptance pending</text>']
for label, top, bottom, low, high, ticks in [
    ('Road height (m)', 96, 330, -170, 20, [-150, -100, -50, 0]),
    ('Candidate grade (%)', 400, 552, -55, 45, [-50, -25, 0, 25]),
]:
    svg.append(f'<text x="86" y="{top-14}" font-size="14" font-weight="600">{label}</text>')
    for tick in ticks:
        yy = y(tick, low, high, top, bottom)
        svg.extend([f'<line x1="{left}" y1="{yy:.2f}" x2="{right}" y2="{yy:.2f}" stroke="#d8d3ca"/>',
                    f'<text x="72" y="{yy+4:.2f}" text-anchor="end" class="minor">{tick}</text>'])
    for tick in range(1200, 2900, 200):
        xx = x(tick)
        svg.extend([f'<line x1="{xx:.2f}" y1="{top}" x2="{xx:.2f}" y2="{bottom}" stroke="#e8e3db"/>',
                    f'<text x="{xx:.2f}" y="{bottom+20}" text-anchor="middle" class="minor">{tick}</text>'])
    series = [('baseline', '#817e8a', 1), ('candidate', '#b54829', 1)] if top == 96 else [('grade', '#b54829', 100)]
    for key, color, scale in series:
        points = ' '.join(f"{x(row['distance']):.2f},{y(row[key]*scale, low, high, top, bottom):.2f}" for row in rows)
        svg.append(f'<polyline points="{points}" fill="none" stroke="{color}" stroke-width="2.2"/>')
    for value, color in [(1293.7588430595824, '#b54829'), (1313.7588430595824, '#817e8a')]:
        xx = x(value)
        svg.append(f'<line x1="{xx:.2f}" y1="{top}" x2="{xx:.2f}" y2="{bottom}" stroke="{color}" stroke-dasharray="4 5" opacity=".6"/>')
svg.extend(['<text x="810" y="84" fill="#817e8a" font-size="13">— Baseline course8</text>',
            '<text x="948" y="84" fill="#b54829" font-size="13">— Candidate course9</text>',
            '<text x="86" y="602" class="minor">Horizontal axis: course distance (m). Samples every2m; grade/curvature over8m windows. No camera modification.</text>',
            '</svg>'])
(folder / 'profile.svg').write_text('\n'.join(svg) + '\n')
