"""Private static preparation only; never modifies src or runs a build/browser."""
from pathlib import Path
import difflib
import hashlib
import json

ROOT = Path('/Users/amir/Projects/PodRacing')
OUT = ROOT / 'assets/source/inkstorm/round34-distant-edge-diagnosis'
source = ROOT / 'src/render/post/sobelShader.ts'
frozen = ROOT / 'output/gauntlet/round34-blockrunner-material-framing-v5-attempt1-frozen-runtime/src/render/post/sobelShader.ts'
original = source.read_text()
assert source.read_bytes() == frozen.read_bytes()
assert hashlib.sha256(source.read_bytes()).hexdigest() == '11fd6df224b590c1c2de291e196d2543d321f70ddd6995163f2c16b4272af053'
candidate = original
needle = '''float readDepth(vec2 uv) {
  return unpackDepth24(texture2D(uDepthMask, uv).rgb);
}
'''
assert candidate.count(needle) == 1
candidate = candidate.replace(needle, needle + '''
vec2 readDepthClass(vec2 uv) {
  vec4 depthMask = texture2D(uDepthMask, uv);
  return vec2(unpackDepth24(depthMask.rgb), depthMask.a);
}
''')
coordinates = [('00', 'vUv - x - y'), ('10', 'vUv - y'), ('20', 'vUv + x - y'),
               ('01', 'vUv - x'), ('21', 'vUv + x'), ('02', 'vUv - x + y'),
               ('12', 'vUv + y'), ('22', 'vUv + x + y')]
old = '\n'.join(f'  float d{name} = readDepth({coord});' for name, coord in coordinates)
new = '\n'.join(f'  vec2 depthClass{name} = readDepthClass({coord});' for name, coord in coordinates)
new += '\n  vec2 depthClass11 = readDepthClass(vUv);\n\n'
new += '\n'.join(f'  float d{name} = depthClass{name}.x;' for name, _ in coordinates)
assert candidate.count(old) == 1
candidate = candidate.replace(old, new)
needle = 'float localDepth = min(readDepth(vUv), min(min(d01, d21), min(d10, d12)));'
assert candidate.count(needle) == 1
candidate = candidate.replace(needle, 'float localDepth = min(depthClass11.x, min(min(d01, d21), min(d10, d12)));')
a = candidate.index('  float edgeClass = texture2D(uDepthMask, vUv).a;')
b = candidate.index('  float hullMask =', a)
candidate = candidate[:a] + '''  // Classify the same complete stencil that contributes to the Sobel edge.
  // Omitting diagonal classes gives isolated skyline samples full-strength ink
  // while neighboring samples correctly receive terrain/hull suppression.
  float edgeClass = max(depthClass11.y, max(depthClass00.y, depthClass20.y));
  edgeClass = max(edgeClass, max(depthClass02.y, depthClass22.y));
  edgeClass = max(edgeClass, max(depthClass01.y, depthClass21.y));
  edgeClass = max(edgeClass, max(depthClass10.y, depthClass12.y));
''' + candidate[b:]
# The contact-shading function, normals/depth gradient formulas and all style
# settings are unchanged; only cached sampling/classification is different.
assert candidate[candidate.index('vec3 contactPosition'):candidate.index('void main() {',candidate.index('vec3 contactPosition'))] == original[original.index('vec3 contactPosition'):original.index('void main() {',original.index('vec3 contactPosition'))]
assert candidate[candidate.index('  float hullMask ='):] == original[original.index('  float hullMask ='):]
assert candidate[candidate.index('  vec3 normalGx ='):candidate.index('  float localDepth =')] == original[original.index('  vec3 normalGx ='):original.index('  float localDepth =')]
target = OUT / 'candidate/sobelShader.ts'
patch = OUT / 'sobel-complete-stencil-classification.patch'
assert not target.exists() and not patch.exists()
target.write_text(candidate)
patch.write_text(''.join(difflib.unified_diff(original.splitlines(keepends=True), candidate.splitlines(keepends=True), fromfile='a/src/render/post/sobelShader.ts', tofile='b/src/render/post/sobelShader.ts')))
assert source.read_text() == original and source.read_bytes() == frozen.read_bytes()
print(json.dumps({'status':'private candidate only; not applied', 'candidateBytes':target.stat().st_size, 'candidateSha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'patchBytes':patch.stat().st_size,'patchSha256':hashlib.sha256(patch.read_bytes()).hexdigest(), 'sourceUnchanged':True},indent=2))
