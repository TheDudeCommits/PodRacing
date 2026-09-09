"""Package a narrow patch from current World; never replace or edit runtime files."""
import difflib
from pathlib import Path

folder = Path(__file__).parent
runtime = Path('src/render/inkstorm/InkstormWorld.ts')
before = runtime.read_text()
assert 'createInkstormForkWayfinding' not in before, 'Guidance already integrated; inspect rather than duplicating'
after = before.replace("import { createInkstormFoundry } from './InkstormFoundry';", "import { createInkstormFoundry } from './InkstormFoundry';\nimport { createInkstormForkWayfinding } from './InkstormForkWayfinding';", 1)
anchor = '    if (foundry) this.roads.push(foundry);'
assert anchor in after
after = after.replace(anchor, anchor + '\n    const forkGuidance = createInkstormForkWayfinding(course, this.heightAt);\n    if (forkGuidance) this.roads.push(forkGuidance);', 1)
module = (folder / 'InkstormForkWayfinding.ts').read_text()
module = module.replace("'../../../../src/game/race/", "'../../game/race/")
module = module.replace("'../../../../src/render/inkstorm/", "'./")
new_path = 'src/render/inkstorm/InkstormForkWayfinding.ts'
patch = ''.join(difflib.unified_diff([], module.splitlines(keepends=True), fromfile='/dev/null', tofile=f'b/{new_path}'))
patch += ''.join(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True), fromfile=f'a/{runtime}', tofile=f'b/{runtime}'))
(folder / 'runtime-before-InkstormWorld.ts').write_text(before)
(folder / 'runtime-candidate.patch').write_text(patch)
