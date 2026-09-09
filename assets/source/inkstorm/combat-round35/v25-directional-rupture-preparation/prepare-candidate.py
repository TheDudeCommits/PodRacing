from pathlib import Path
b=Path(__file__).resolve().parent
p=b/'candidate/src/render/galactic/GalacticEffectsView.ts'
s=(b/'before/src/render/galactic/GalacticEffectsView.ts').read_text()
def replace(a,z):
 global s
 assert a in s,a[:80]
 s=s.replace(a,z)
replace('  contactSpark: boolean;\n', '  contactSpark: boolean;\n  authoredEjection: boolean;\n')
replace('contactSpark: false, emberPhase:', 'contactSpark: false, authoredEjection: false, emberPhase:')
replace('      float paintNoise(vec2 p) {', '''      // Tapered pressure tongues share a tight root; the ends have distinct
      // lengths/directions instead of repeating a radial glow.
      float ruptureTongue(vec2 p, vec2 tip, float width) {
        float travel = clamp(dot(p, tip) / dot(tip, tip), 0.0, 1.0);
        return length(p - tip * travel) / max(0.022, width * (1.0 - travel * 0.91));
      }
      float paintNoise(vec2 p) {''')
replace('      if (vEffectSurface.x > 3.5) {', '''      if (vEffectSurface.x > 7.5) {
        // Authored smoke has a dense torn belly and two unequal billows.
        // It stays local to the actual tear; no full-screen wash is added.
        float belly = length((p - vec2(-0.10, -0.24)) * vec2(1.30, 1.55));
        float crown = length((p - vec2(0.12, 0.22)) * vec2(1.24, 1.20));
        float shoulder = length((p - vec2(-0.33, 0.18)) * vec2(1.90, 1.80));
        float billow = min(belly, min(crown, shoulder)) + brush * 0.15 + grain * 0.025;
        alpha = (1.0 - smoothstep(0.59, 0.82, billow))
          * smoothstep(-1.0, -0.82, p.y) * (0.91 + brush * 0.09);
        diffuseColor.rgb *= mix(0.56, 1.28, smoothstep(-0.65, 0.75, p.y))
          * (0.87 + grain * 0.18);
      } else if (vEffectSurface.x > 5.5) {
        // +X follows the projected world cut normal. Three asymmetric tongues
        // form one pressure release; the short fourth lobe marks its birth.
        vec2 q = p;
        float upper = ruptureTongue(q, vec2(0.83, 0.39), 0.20);
        float mainTongue = ruptureTongue(q, vec2(1.02, 0.04), 0.24);
        float lower = ruptureTongue(q, vec2(0.68, -0.36), 0.17);
        float contour = min(mainTongue, min(upper, lower));
        if (vEffectSurface.x < 6.5) contour = min(contour,
          ruptureTongue(q, vec2(0.36, 0.63), 0.21));
        float eroded = contour + brush * 0.22 + grain * 0.06;
        float edge = 1.0 - smoothstep(0.65, 1.10, eroded);
        float core = 1.0 - smoothstep(0.18, 0.69, eroded);
        diffuseColor.rgb = mix(vec3(1.0, 0.22, 0.025), vec3(1.0, 0.98, 0.80), core);
        alpha = edge * (1.0 - smoothstep(0.88, 1.0, abs(p.x)))
          * (1.0 - smoothstep(0.82, 1.0, abs(p.y)));
      } else if (vEffectSurface.x > 3.5) {''')
replace("'painterly-atmosphere-contact-v6'", "'painterly-atmosphere-directional-rupture-v7'")
replace('        const cone = .18 + hash01(seed + 16) * .32, azimuth = hash01(seed + 17) * Math.PI * 2;', '''        // Stratified sectors prevent a thin rising column when the source
        // normal points upward. Every fragment remains in its outward half-space.
        const cone = .42 + hash01(seed + 16) * .58;
        const azimuth = (fragment % 6 + .15 + hash01(seed + 17) * .7) * Math.PI / 3;''')
replace('      slot.contactSpark = false;\n', '      slot.contactSpark = false;\n      slot.authoredEjection = authoredSurface;\n')
replace('      if (ember) {\n        slot.vx', '''      if (authoredSurface && !spark) {
        // Three casing plates carry the silhouette; smaller satellites reveal
        // the direction without making every fragment the same black block.
        slot.scale = (fragment % 6 === 1 ? .91 + hash01(seed + 10) * .16
          : .27 + hash01(seed + 10) * .28) * Math.sqrt(severity);
      }
      if (ember) {
        slot.vx''')
replace('slot.groundY = origin.y; slot.metal = false; slot.spark = true; slot.contactSpark = true;', 'slot.groundY = origin.y; slot.metal = false; slot.spark = true; slot.contactSpark = true; slot.authoredEjection = false;')
# Authored paths have local changes only; legacy emitter remains unchanged.
replace('        slot.scale = severity * [RUPTURE_FLASH_SCALE, tracked ? 1.25 : 3.5, 2.7, 3.2][plate]!;', '''        slot.scale = severity * [RUPTURE_FLASH_SCALE,
          authoredSurface ? 2.45 : tracked ? 1.25 : 3.5, 2.7, 3.2][plate]!;''')
replace('      const motionAge = slot.ember ? (age + slot.emberPhase) % .42 : age;\n      const x = slot.x + slot.vx * motionAge;', '''      const motionAge = slot.ember ? (age + slot.emberPhase) % .42 : age;
      // Free casing loses horizontal velocity, then falls. Its actual birth
      // impulse remains distinct from the two retained moving-root embers.
      const travelAge = slot.authoredEjection && slot.metal
        ? -Math.expm1(-2.2 * motionAge) / 2.2 : motionAge;
      const x = slot.x + slot.vx * travelAge;''')
replace('      const y = slot.ember ? slot.y + Math.max(0, slot.vy) * motionAge - 1.5 * motionAge * motionAge\n        : Math.max(slot.groundY + 0.04, slot.y + slot.vy * motionAge - 7.2 * motionAge * motionAge);\n      const z = slot.z + slot.vz * motionAge;\n      if (!this.isVisible(x, y, z, slot.scale * 1.4, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;', '''      let y = slot.ember ? slot.y + Math.max(0, slot.vy) * motionAge - 1.5 * motionAge * motionAge
        : Math.max(slot.groundY + 0.04, slot.y + slot.vy * motionAge
          - (slot.authoredEjection && slot.metal ? 17 : 7.2) * motionAge * motionAge);
      const z = slot.z + slot.vz * travelAge;''')
replace('      this.writeInstance(this.crashDebris, debrisCount, x, y, z, this.tempQuaternion,', '''      if (slot.authoredEjection && slot.metal) {
        // Analytic support of the existing bent primitive's local bounds:
        // x±.5, y±.332, z±.85. No vertex scan or terrain query per frame.
        this.tempMatrix.makeRotationFromQuaternion(this.tempQuaternion);
        const e = this.tempMatrix.elements;
        const support = size * (Math.abs(e[1]!) * .5 + Math.abs(e[5]!) * .332 * .65 + Math.abs(e[9]!) * .85);
        y = Math.max(y, slot.groundY + .04 + support);
      }
      if (!this.isVisible(x, y, z, slot.scale * 1.4, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
      this.writeInstance(this.crashDebris, debrisCount, x, y, z, this.tempQuaternion,''')
replace('        if (slot.contactLayer >= 0) {\n          const smoke', '''        if (slot.authoredSurface && slot.contactLayer >= 0) {
          const smoke = slot.contactLayer > 1, flash = slot.contactLayer === 0;
          const size = slot.scale * (smoke ? .74 + progress * .62 : flash ? .78 + progress * .22 : .90 + Math.sin(age * 19) * .05);
          const lift = smoke ? size * (slot.contactLayer === 2 ? .46 : .72) + progress * 1.2 : 0;
          const x = slot.x + slot.vx * age, y = slot.y + lift, z = slot.z + slot.vz * age;
          if (!this.isVisible(x, y, z, size * 1.9, EFFECT_VISIBILITY_DISTANCE.crashes)) continue;
          let rotation = this.billboardQuaternion;
          if (!smoke) {
            // Rotate within the camera plane: local +X follows the *actual*
            // normal's projection. It stays stable for a fixed camera/normal.
            this.ruptureRotation.copy(this.billboardQuaternion).invert();
            this.ruptureAxis.set(slot.nx, slot.ny, slot.nz).applyQuaternion(this.ruptureRotation);
            const angle = Math.hypot(this.ruptureAxis.x, this.ruptureAxis.y) > .001
              ? Math.atan2(this.ruptureAxis.y, this.ruptureAxis.x) : 0;
            this.tempQuaternion.setFromAxisAngle(FORWARD, angle).premultiply(this.billboardQuaternion);
            rotation = this.tempQuaternion;
          }
          const opacity = (smoke ? .90 : 1)
            * (1 - MathUtils.smoothstep(progress, smoke ? .68 : flash ? .10 : .78, 1));
          this.writeInstance(this.explosionPlates, plateCount, x, y, z, rotation,
            size, size * (smoke ? 1.22 : flash ? .82 : .70), size, slot.r, slot.g, slot.b);
          this.writeEffectSurface(plateCount, smoke ? 8 : flash ? 6 : 7, opacity,
            slot.startTime * 1.37 + (smoke ? age * .32 : age * 1.8));
          plateCount++;
          continue;
        }
        if (slot.contactLayer >= 0) {
          const smoke''')
p.write_text(s)
t=b/'candidate/tests/combat/AuthoredAftermath.test.ts'
x=t.read_text().replace('keeps smaller hot face, smoke', 'keeps directional hot tongues, smoke').replace('surface.getX(i) === 2', 'surface.getX(i) === 7')
t.write_text(x)
