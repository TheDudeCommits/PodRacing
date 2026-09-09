from pathlib import Path
import shutil
b=Path(__file__).resolve().parent;r=Path('/Users/amir/Projects/PodRacing')
rels=['src/camera/CinematicCamera.ts','src/render/combat/TeemtoAuthoredDamage.ts','src/render/combat/WreckVisualPose.ts','tests/camera/TeemtoImpactFraming.test.ts']
def replace(s,a,z):
 assert s.count(a)==1,(a,s.count(a));return s.replace(a,z)
for rel in rels:
 p=b/'before'/rel;p.parent.mkdir(parents=True,exist_ok=True)
 if not p.exists():shutil.copy2(r/rel,p)
 assert p.read_bytes()==(r/rel).read_bytes(),'live source moved: '+rel
 q=b/'candidate'/rel;q.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,q)
p=b/'candidate/src/render/combat/WreckVisualPose.ts';s=p.read_text();s=replace(s,'impactFraming?: { readonly center: Vector3; readonly bounds: readonly Vector3[] };','''impactFraming?: { readonly center: Vector3; readonly bounds: readonly Vector3[];
    /** Authoritative wreck timer expressed as presentation age; never advances simulation. */
    readonly ageSeconds?: number };''');p.write_text(s)
p=b/'candidate/src/render/combat/TeemtoAuthoredDamage.ts';s=p.read_text();s=replace(s,'private readonly impactFraming: { center: Vector3; bounds: Vector3[] };','private readonly impactFraming: { center: Vector3; bounds: Vector3[]; ageSeconds: number };')
s=replace(s,'''    // First three moving source boxes are the actual engines. Two reused
    // witness slots include the fracture and real contact without the pilot or
    // long severed rods expanding the screen-fit rectangle. Full bounds stay intact.
    this.impactFraming = { center: new Vector3(), bounds: [
      ...this.bounds.slice(8, 32), new Vector3(), new Vector3(),
    ] };''','''    // First beat: the two torn right-engine boxes and two actual witnesses.
    // Eight preallocated points reveal the left engine during the later beat;
    // their initial collapsed positions cannot enlarge the early fit. The full
    // stationary/engine/tether bounds remain unchanged for lens safety.
    this.impactFraming = { center: new Vector3(), ageSeconds: 0, bounds: [
      ...this.bounds.slice(16, 32), new Vector3(), new Vector3(),
      ...Array.from({ length: 8 }, () => new Vector3()),
    ] };''')
s=replace(s,'''    this.impactFraming.bounds[24]!.copy(this.rupture.position);
    this.impactFraming.bounds[25]!.copy(this.contactPose === pose ? this.contact.position : this.rupture.position);
    this.impactBox.makeEmpty();
    for (const bound of this.impactFraming.bounds) this.impactBox.expandByPoint(bound);
    this.impactBox.getCenter(this.impactFraming.center);''','''    this.impactFraming.ageSeconds = age;
    this.impactFraming.bounds[16]!.copy(this.rupture.position);
    this.impactFraming.bounds[17]!.copy(this.contactPose === pose ? this.contact.position : this.rupture.position);
    this.impactBox.makeEmpty();
    for (let index = 0; index < 18; index++) this.impactBox.expandByPoint(this.impactFraming.bounds[index]!);
    this.impactBox.getCenter(this.impactFraming.center);
    // Keep the torn pair dominant through its catch, then reveal settled context
    // without switching arrays or creating a discontinuous aim rectangle.
    const contextBlend = smooth((age - .65) / .30);
    for (let index = 0; index < 8; index++) {
      const bound = this.impactFraming.bounds[18 + index]!;
      bound.copy(this.impactFraming.center).lerp(this.bounds[8 + index]!, contextBlend);
      this.impactBox.expandByPoint(bound);
    }
    this.impactBox.getCenter(this.impactFraming.center);''');p.write_text(s)
p=b/'candidate/src/camera/CinematicCamera.ts';s=p.read_text()
s=replace(s,'combatImpactFraming?: { readonly center: Vector3; readonly bounds: readonly Vector3[] };','''combatImpactFraming?: { readonly center: Vector3; readonly bounds: readonly Vector3[];
    /** Optional authored wreck age. Omission preserves the locked legacy shot. */
    readonly ageSeconds?: number };''')
s=replace(s,'  private hasImpactCombatBack = false;','  private hasImpactCombatBack = false;\n  private impactArcSign = 0;')
s=replace(s,'''      this.hasAuthoredCombatBack = false; this.hasImpactCombatBack = false;
    }
    this.combatFraming = enabled;''','''      this.hasAuthoredCombatBack = false; this.hasImpactCombatBack = false; this.impactArcSign = 0;
    }
    this.combatFraming = enabled;''')
s=replace(s,'''      this.boundsBack.copy(this.authoredCombatBack);
      return;''','''      this.boundsBack.copy(this.authoredCombatBack);
      this.applyAuthoredImpactArc(subject, impactFrame);
      return;''')
s=replace(s,'''    if (authored && impactFrame) {
      // Existing racer shadows''','''    this.impactArcSign = 0;
    if (authored && impactFrame) {
      // Existing racer shadows''')
s=replace(s,'''      // one modest 20-degree offset away from that direction, on the same
      // tear side. Lock it for this identity: no orbit as the pieces settle.''','''      // one modest 20-degree initial offset away from that direction, on the
      // same tear side. An age-bearing authored frame may add a bounded arc.''')
s=replace(s,'''      this.hasImpactCombatBack = true;
    }
    if (authored) {
      this.authoredCombatBack.copy(this.boundsBack);
      this.hasAuthoredCombatBack = true;
    }
  }

  private fitCombatBounds''','''      this.hasImpactCombatBack = true;
      if (Number.isFinite(impactFrame.ageSeconds) && !this.comfort.reducedMotion) {
        // Pick one direction for this victim identity. Both endpoints remain
        // on the exposed tear side; no angle accumulates from prior frames.
        const arc = Math.PI * 14 / 180, c = Math.cos(arc), sn = Math.sin(arc);
        const baseX = this.boundsBack.x, baseZ = this.boundsBack.z;
        let bestArc = Infinity;
        for (let sign = -1; sign <= 1; sign += 2) {
          this.impactAzimuthCandidate.set(baseX * c + baseZ * sn * sign, this.boundsBack.y,
            baseZ * c - baseX * sn * sign);
          const score = this.impactAzimuthCandidate.x * .42 + this.impactAzimuthCandidate.z * .50;
          if (score < bestArc && this.impactAzimuthCandidate.dot(right) * Math.sign(side) > .35) {
            bestArc = score; this.impactArcSign = sign;
          }
        }
      }
    }
    if (authored) {
      this.authoredCombatBack.copy(this.boundsBack);
      this.hasAuthoredCombatBack = true;
      this.applyAuthoredImpactArc(subject, impactFrame);
    }
  }

  private applyAuthoredImpactArc(subject: CameraSubject, frame: CameraSubject['combatImpactFraming']): void {
    if (!this.impactArcSign || this.comfort.reducedMotion) return;
    // Protected intact recovery retains the terminal angle, rather than
    // rotating back through the craft when the authored metadata disappears.
    const progress = subject.wreckRecovery ? 1
      : Number.isFinite(frame?.ageSeconds) ? MathUtils.smoothstep(frame!.ageSeconds!, .10, .65) : 0;
    const angle = this.impactArcSign * Math.PI * 14 / 180 * progress;
    const c = Math.cos(angle), sn = Math.sin(angle), x = this.boundsBack.x, z = this.boundsBack.z;
    this.boundsBack.set(x * c + z * sn, this.boundsBack.y, z * c - x * sn);
  }

  private fitCombatBounds''');p.write_text(s)
print('Prepared private three-source V29; existing GameApp forwards framing object including optional age.')
