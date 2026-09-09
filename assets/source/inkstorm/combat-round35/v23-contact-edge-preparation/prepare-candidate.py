from pathlib import Path
b=Path(__file__).resolve().parent
paths=['src/render/combat/TeemtoAuthoredDamage.ts','src/render/combat/WreckGroundContact.ts','src/render/galactic/GalacticEffectsView.ts']
for rel in paths:
 p=b/'candidate'/rel;s=(b/'before'/rel).read_text()
 if rel.endswith('WreckGroundContact.ts'):
  old='  readonly halfWidth: number;';assert s.count(old)==1
  s=s.replace(old,old+'\n  /** Opposing actual casing extrema projected onto their sampled ground. */\n  readonly edges?: readonly [Vector3, Vector3];')
 elif rel.endswith('TeemtoAuthoredDamage.ts'):
  s=s.replace('footprint: { center: new Vector3(), axis: new Vector3(), halfLength: 0, halfWidth: 0 }','footprint: { center: new Vector3(), axis: new Vector3(), halfLength: 0, halfWidth: 0,\n      edges: [new Vector3(), new Vector3()] as const }')
  old='''    let minAlong = Infinity, maxAlong = -Infinity, minAcross = Infinity, maxAcross = -Infinity;
    for (let index = 0; index < part.samples.supportPoints.length; index++) {
      // This is a near-ground source surface band, not an invented collision
      // area. Reuse the already sampled gaps: no second terrain/vertex pass.
      if (part.groundGaps[index]! + correction > .45) continue;
      this.point.copy(part.samples.supportPoints[index]!).applyMatrix4(this.world).sub(this.contact.position);
      const along = this.point.x * ax + this.point.z * az, across = this.point.x * az - this.point.z * ax;
      minAlong = Math.min(minAlong, along); maxAlong = Math.max(maxAlong, along);
      minAcross = Math.min(minAcross, across); maxAcross = Math.max(maxAcross, across);
    }'''
  new='''    let minAlong = Infinity, maxAlong = -Infinity, minAcross = Infinity, maxAcross = -Infinity;
    let left = Infinity, right = -Infinity;
    footprint.edges[0].copy(this.contact.position); footprint.edges[1].copy(this.contact.position);
    for (let index = 0; index < part.samples.supportPoints.length; index++) {
      // Reuse the exact terrain samples from the grounding pass. The belly's
      // narrow contact band sits inside a much wider casing; placing both dust
      // planes there lets that casing depth-occlude the contact presentation.
      const gap = part.groundGaps[index]! + correction;
      this.point.copy(part.samples.supportPoints[index]!).applyMatrix4(this.world);
      const across = (this.point.x - this.contact.position.x) * az - (this.point.z - this.contact.position.z) * ax;
      if (Number.isFinite(gap)) {
        if (across < left) { left = across; footprint.edges[0].copy(this.point); footprint.edges[0].y -= gap; }
        if (across > right) { right = across; footprint.edges[1].copy(this.point); footprint.edges[1].y -= gap; }
      }
      // Preserve the existing near-ground band and minimum support witness.
      // Each edge retains an actual source vertex's XZ and its own ground Y;
      // no box corner, extra terrain query or new collision area is introduced.
      if (gap > .45) continue;
      this.point.sub(this.contact.position);
      const along = this.point.x * ax + this.point.z * az;
      minAlong = Math.min(minAlong, along); maxAlong = Math.max(maxAlong, along);
      minAcross = Math.min(minAcross, across); maxAcross = Math.max(maxAcross, across);
    }'''
  assert s.count(old)==1;s=s.replace(old,new)
 else:
  old='''    const origin = span?.center ?? position;
    this.eventSequence++;'''
  new='''    // A malformed optional edge pair falls back to the admitted centre fan.
    // Copy only bounded scalar data into the existing two slots; the producer
    // reuses these vectors on every rendered pose.
    let edges = span?.edges;
    if (edges) for (let index = 0; index < 2; index++) {
      const edge = edges[index], sign = index === 0 ? -1 : 1;
      const ex = edge ? edge.x - span!.center.x : NaN, ez = edge ? edge.z - span!.center.z : NaN;
      const along = ex * span!.axis.x + ez * span!.axis.z;
      const across = (ex * span!.axis.z - ez * span!.axis.x) * sign;
      if (!edge || !Number.isFinite(edge.x + edge.y + edge.z) || Math.abs(along) > span!.halfLength + 4
        || across < Math.max(.05, span!.halfWidth) || across > 6 || Math.abs(edge.y - span!.center.y) > 6) { edges = undefined; break; }
    }
    const origin = span?.center ?? position;
    this.eventSequence++;'''
  assert s.count(old)==1;s=s.replace(old,new)
  old='''      slot.x = origin.x + dx * index * .7; slot.z = origin.z + dz * index * .7;
      slot.y = origin.y + .08; slot.vx = dx * (index === 0 ? 3.2 : 4.8); slot.vz = dz * (index === 0 ? 3.2 : 4.8);'''
  new='''      const edge = edges?.[index], sign = index === 0 ? -1 : 1;
      const outX = edge ? span!.axis.z * sign : dx, outZ = edge ? -span!.axis.x * sign : dz;
      slot.x = edge?.x ?? origin.x + dx * index * .7; slot.z = edge?.z ?? origin.z + dz * index * .7;
      slot.y = (edge?.y ?? origin.y) + .08;
      slot.vx = outX * (index === 0 ? 3.2 : 4.8); slot.vz = outZ * (index === 0 ? 3.2 : 4.8);'''
  assert s.count(old)==1;s=s.replace(old,new)
 p.write_text(s)
print('Prepared three private source files; no live writes.')
