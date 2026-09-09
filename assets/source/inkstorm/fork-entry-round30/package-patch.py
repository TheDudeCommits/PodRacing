from pathlib import Path
import difflib
root=Path.cwd(); folder=root/'assets/source/inkstorm/fork-entry-round30'
bridgePath=Path('src/render/inkstorm/InkstormBridge.ts'); worldPath=Path('src/render/inkstorm/InkstormWorld.ts')
bridge=(root/bridgePath).read_text()
bridge=bridge.replace("import type { CourseRenderBranch } from '../../game/race/types';", "import type { CourseRenderBranch } from '../../game/race/types';\nimport type { PodraceCourse } from '../../game/race/course';\nimport { createInkstormForkFoundation } from './InkstormForkFoundation';")
bridge=bridge.replace('heightAt: (x: number, z: number) => number): InstancedMesh', 'heightAt: (x: number, z: number) => number, course?: PodraceCourse): InstancedMesh')
bridge=bridge.replace("  const mesh = new InstancedMesh(geometry, new InkstormSurfaceMaterial(false), 1);", """  const foundation = course ? createInkstormForkFoundation(branch, heightAt, course) : null;
  const joined = foundation ? mergeGeometries([geometry, foundation], true) : geometry;
  if (!joined) throw new Error('Unable to join the Inkstorm fork foundation.');
  if (foundation) { geometry.dispose(); foundation.dispose(); }
  // Original bridge geometry and paint occupy group 0 without alteration.
  // One added stone group uses the existing rock shader and shared paint.
  const material = foundation
    ? [new InkstormSurfaceMaterial(false), new InkstormSurfaceMaterial(true)]
    : new InkstormSurfaceMaterial(false);
  const mesh = new InstancedMesh(joined, material, 1);""")
world=(root/worldPath).read_text(); worldAfter=world.replace('createInkstormBridge(branch,this.heightAt)', 'createInkstormBridge(branch,this.heightAt,course)')
assert world!=worldAfter
files={str(bridgePath):bridge,str(worldPath):worldAfter,'src/render/inkstorm/InkstormForkFoundation.ts':(folder/'InkstormForkFoundation.ts').read_text().replace("../../../../src/game/", "../../game/").replace("../../../../src/render/inkstorm/", "./"),'src/render/inkstorm/ForkIslandContacts.ts':(folder/'ForkIslandContacts.ts').read_text()}
patch=[]
for path,after in files.items():
 before=(root/path).read_text() if (root/path).exists() else ''
 patch.extend(difflib.unified_diff(before.splitlines(keepends=True),after.splitlines(keepends=True),fromfile='a/'+path if before else '/dev/null',tofile='b/'+path,n=3))
(folder/'runtime-candidate.patch').write_text(''.join(patch))
# Executable source-only candidate imports the real existing shader and road.
(folder/'InkstormBridge.candidate.ts').write_text(bridge.replace("'../../game/", "'../../../../src/game/").replace("'./InkstormSurfaceMaterial'", "'../../../../src/render/inkstorm/InkstormSurfaceMaterial'").replace("'./InkstormRoad'", "'../../../../src/render/inkstorm/InkstormRoad'"))
(folder/'InkstormWorld.integration-line.txt').write_text('if(branch.elevated)this.roads.push(createInkstormBridge(branch,this.heightAt,course));\n')
print('Staged narrow patch: original bridge plus two new helper modules; World changes one call only.')
