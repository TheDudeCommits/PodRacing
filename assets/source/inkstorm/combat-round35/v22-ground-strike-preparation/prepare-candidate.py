from pathlib import Path
import shutil
root=Path.cwd();b=Path(__file__).resolve().parent
paths=['src/render/combat/TeemtoAuthoredDamage.ts','src/render/combat/WreckGroundContact.ts','src/render/galactic/GalacticEffectsView.ts']
for rel in paths:
 for folder in ['before','candidate']:
  p=b/folder/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/rel,p)
p=b/'candidate'/paths[0];s=p.read_text()
s=s.replace('  readonly auto: boolean;','  readonly auto: boolean;\n  readonly groundGaps: Float64Array;')
s=s.replace('private readonly contact = { position: new Vector3(), direction: new Vector3() };','private readonly contact = { position: new Vector3(), direction: new Vector3(),\n    footprint: { center: new Vector3(), axis: new Vector3(), halfLength: 0, halfWidth: 0 } };')
s=s.replace('new WreckVisualPoseCache(index === 2)','new WreckVisualPoseCache(index === 1 || index === 2)')
s=s.replace('auto: node.matrixAutoUpdate };','auto: node.matrixAutoUpdate, groundGaps: new Float64Array(samples.supportPoints.length) };')
s=s.replace('this.axis.setFromAxisAngle(Z, index === 0 ? -Math.PI / 2 : index === 1 ? 1.3 : Math.PI / 2);','// Exact source surface bands: the rear belly supports ~10 m, the left\n    // shallow bank ~13 m, and the front roof ~7 m. A quarter-roll rested the\n    // rear on a 0.36 m protrusion while leaving most of its casing elevated.\n    this.axis.setFromAxisAngle(Z, index === 0 ? -Math.PI / 12 : index === 1 ? Math.PI * 11 / 12 : 0);')
s=s.replace('    let gap = Infinity;\n    for (const support of part.samples.supportPoints) {\n      this.point.copy(support).applyMatrix4(this.world);\n      const ground = terrain.heightAt(this.point.x, this.point.z), candidate = this.point.y - ground;\n      if (candidate < gap) { gap = candidate; if (index === 2) this.contact.position.set(this.point.x, ground, this.point.z); }\n    }','    let gap = Infinity, supportIndex = 0;\n    for (const support of part.samples.supportPoints) {\n      this.point.copy(support).applyMatrix4(this.world);\n      const ground = terrain.heightAt(this.point.x, this.point.z), candidate = this.point.y - ground;\n      part.groundGaps[supportIndex++] = candidate;\n      if (candidate < gap) { gap = candidate; if (index === 2) this.contact.position.set(this.point.x, ground, this.point.z); }\n    }')
s=s.replace('        this.writeStrikeDirection(part, pose, age);','        this.writeStrikeDirection(part, pose, age);\n        this.writeContactFootprint(part, correction, terrain);')
pos=s.index('  private writeStrikeDirection(')
s=s[:pos]+'''  private writeContactFootprint(part: Part, correction: number, terrain: { heightAt(x: number, z: number): number }): void {
    const footprint = this.contact.footprint;
    footprint.axis.set(0, 0, 1).applyQuaternion(this.rotation).setY(0).normalize();
    const ax = footprint.axis.x, az = footprint.axis.z;
    let minAlong = Infinity, maxAlong = -Infinity, minAcross = Infinity, maxAcross = -Infinity;
    for (let index = 0; index < part.samples.supportPoints.length; index++) {
      // This is a near-ground source surface band, not an invented collision
      // area. Reuse the already sampled gaps: no second terrain/vertex pass.
      if (part.groundGaps[index]! + correction > .45) continue;
      this.point.copy(part.samples.supportPoints[index]!).applyMatrix4(this.world).sub(this.contact.position);
      const along = this.point.x * ax + this.point.z * az, across = this.point.x * az - this.point.z * ax;
      minAlong = Math.min(minAlong, along); maxAlong = Math.max(maxAlong, along);
      minAcross = Math.min(minAcross, across); maxAcross = Math.max(maxAcross, across);
    }
    footprint.halfLength = Number.isFinite(minAlong + maxAlong) ? (maxAlong - minAlong) * .5 : 0;
    footprint.halfWidth = Number.isFinite(minAcross + maxAcross) ? (maxAcross - minAcross) * .5 : 0;
    footprint.center.copy(this.contact.position);
    if (footprint.halfLength > 0) {
      const along = (minAlong + maxAlong) * .5, across = (minAcross + maxAcross) * .5;
      footprint.center.x += ax * along + az * across; footprint.center.z += az * along - ax * across;
      const ground = terrain.heightAt(footprint.center.x, footprint.center.z);
      if (Number.isFinite(ground)) footprint.center.y = ground;
    }
  }

'''+s[pos:];p.write_text(s)
p=b/'candidate'/paths[1];s=p.read_text().replace('/** Sampled contact','export interface WreckGroundFootprint {\n  readonly center: Vector3;\n  readonly axis: Vector3;\n  readonly halfLength: number;\n  readonly halfWidth: number;\n}\n\n/** Sampled contact',1).replace('  readonly direction: Vector3;','  readonly direction: Vector3;\n  /** Cached near-ground source band; cosmetic ejecta extent, not collision state. */\n  readonly footprint?: WreckGroundFootprint;',1);p.write_text(s)
p=b/'candidate'/paths[2];s=p.read_text();s=s.replace("import { mergeGeometries }", "import type { WreckGroundFootprint } from '../combat/WreckGroundContact';\nimport { mergeGeometries }",1)
s=s.replace('  contactLayer: number;','  contactLayer: number;\n  contactHalfLength: number;\n  contactHalfWidth: number;',1).replace('      contactLayer: -1,','      contactLayer: -1, contactHalfLength: 0, contactHalfWidth: 0,',1)
s=s.replace('float spread = 0.08 + height * 0.86;','float spread = vEffectSurface.x > 4.5 ? 0.62 + height * 0.32 : 0.08 + height * 0.86;')
s=s.replace('painterly-atmosphere-contact-v5','painterly-atmosphere-contact-v6')
s=s.replace('emitWreckGroundContact(time: number, position: GalacticPoint, direction: GalacticPoint): void {','emitWreckGroundContact(time: number, position: GalacticPoint, direction: GalacticPoint, footprint?: WreckGroundFootprint): void {')
s=s.replace('    const heading = Math.atan2(dz, dx);\n    this.eventSequence++;','''    const heading = Math.atan2(dz, dx);
    const span = footprint && Number.isFinite(footprint.center.x + footprint.center.y + footprint.center.z
      + footprint.axis.x + footprint.axis.z + footprint.halfLength + footprint.halfWidth)
      && footprint.halfLength >= 1 && footprint.halfLength <= 12 && footprint.halfWidth >= 0 && footprint.halfWidth <= 6
      && Math.abs(Math.hypot(footprint.axis.x, footprint.axis.z) - 1) < .001 ? footprint : undefined;
    const origin = span?.center ?? position;
    this.eventSequence++;''',1)
s=s.replace('      slot.x = position.x; slot.y = position.y + .18; slot.z = position.z;','''      const along = span ? (index / 9 - .5) * span.halfLength * 1.8 : 0;
      slot.x = origin.x + (span?.axis.x ?? 0) * along;
      slot.y = origin.y + .18; slot.z = origin.z + (span?.axis.z ?? 0) * along;''',1)
s=s.replace('      slot.groundY = position.y; slot.metal = false; slot.spark = true; slot.contactSpark = true;','      slot.groundY = origin.y; slot.metal = false; slot.spark = true; slot.contactSpark = true;',1)
s=s.replace('      slot.x = position.x + dx * index * .7; slot.z = position.z + dz * index * .7;\n      slot.y = position.y + .08;', '      slot.x = origin.x + dx * index * .7; slot.z = origin.z + dz * index * .7;\n      slot.y = origin.y + .08;',1)
s=s.replace("      slot.style = 'sand'; slot.billboard = true; slot.contactLayer = 4 + index;","      slot.style = 'sand'; slot.billboard = true; slot.contactLayer = 4 + index;\n      slot.contactHalfLength = span?.halfLength ?? 0; slot.contactHalfWidth = span?.halfWidth ?? 0;\n      slot.nx = span?.axis.x ?? 0; slot.nz = span?.axis.z ?? 1;",1)
s=s.replace('          const width = slot.scale * (scrape ? .50 + progress * .70 : .30 + progress * .65);\n          const height = width * (scrape ? .18 : .54);','''          const broad = slot.contactHalfLength > 0;
          const width = broad ? slot.contactHalfLength * (scrape ? .95 + progress * .30 : .80 + progress * .40)
            : slot.scale * (scrape ? .50 + progress * .70 : .30 + progress * .65);
          const height = broad ? (scrape ? .35 + slot.contactHalfWidth * .4 + progress * .7 : 1.4 + progress * 1.8)
            : width * (scrape ? .18 : .54);''',1)
s=s.replace('          this.writeInstance(this.explosionPlates, plateCount, x, y, z,\n            this.billboardQuaternion, width, height, width, slot.r, slot.g, slot.b);\n          this.writeEffectSurface(plateCount, 4, .67 * (1 - MathUtils.smoothstep(progress, .25, 1)), slot.startTime * 1.37);','''          // Keep the ejecta root along the measured engine support line.
          // A point-shaped billboard under a ten-metre casing is easily hidden.
          if (broad) this.tempQuaternion.setFromAxisAngle(UP, Math.atan2(-slot.nz, slot.nx));
          this.writeInstance(this.explosionPlates, plateCount, x, y, z,
            broad ? this.tempQuaternion : this.billboardQuaternion, width, height, width, slot.r, slot.g, slot.b);
          this.writeEffectSurface(plateCount, broad ? 5 : 4, (broad ? .82 : .67)
            * (1 - MathUtils.smoothstep(progress, .25, 1)), slot.startTime * 1.37);''',1)
p.write_text(s)
# Parent owns GameApp; retain this adapter as an independently reviewable one-line patch.
a=root/'src/render/app/GameApp.ts';text=a.read_text();old='wreckPose.groundContact.position, wreckPose.groundContact.direction);';assert text.count(old)==1
for folder,content in [('before',text),('candidate',text.replace(old,'wreckPose.groundContact.position, wreckPose.groundContact.direction, wreckPose.groundContact.footprint);'))]:
 p=b/folder/'src/render/app/GameApp.ts';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
print('Prepared private broad-support geometry + footprint emitter + separate GameApp adapter')
