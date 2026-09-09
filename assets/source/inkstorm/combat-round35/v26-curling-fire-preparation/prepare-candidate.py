from pathlib import Path
import shutil
r=Path.cwd();b=Path(__file__).resolve().parent
files=['src/render/galactic/GalacticEffectsView.ts','tests/render/DirectionalRuptureLifecycle.test.ts','tests/render/AuthoredRuptureBeat.test.ts']
for rel in files:
 old=b/'before'/rel;old.parent.mkdir(parents=True,exist_ok=True)
 if not old.exists():shutil.copy2(r/rel,old)
 new=b/'candidate'/rel;new.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(old,new)
p=b/'candidate'/files[0];s=p.read_text()
a=s.index('      // Tapered pressure tongues');z=s.index('      float paintNoise',a);s=s[:a]+s[z:]
a=s.index('      if (vEffectSurface.x > 7.5) {');z=s.index('      } else if (vEffectSurface.x > 3.5) {',a)
s=s[:a]+'''      if (vEffectSurface.x > 7.5) {
        // Two bounded smoke plates, each a different collection of billows.
        // The winning lobe supplies a curved light response, rather than one
        // height ramp across an opaque column. This is authored sprite shading,
        // not a new scene light or a volumetric simulation.
        float age = vEffectSurface.z;
        float layer = step(8.5, vEffectSurface.x);
        vec2 q = p;
        q.x += (paintNoise(p * vec2(3.0, 4.0) + vec2(age * 0.42, -age * 0.8)) - 0.5) * 0.16;
        q.y += (paintNoise(p * vec2(4.0, 3.0) + vec2(-age * 0.3, -age * 0.6)) - 0.5) * 0.12;
        q.x = mix(q.x, -q.x, layer);
        vec2 a = (q - vec2(-0.28, -0.06)) / vec2(0.39, 0.37);
        vec2 b = (q - vec2(0.22, 0.27 + layer * 0.07)) / vec2(0.38, 0.39);
        vec2 c = (q - vec2(0.48, -0.07)) / vec2(0.25, 0.27);
        vec2 lobe = a;
        if (dot(b, b) < dot(lobe, lobe)) lobe = b;
        if (dot(c, c) < dot(lobe, lobe)) lobe = c;
        float distanceToBillow = length(lobe);
        float broken = paintNoise(q * vec2(6.0, 5.0) + vec2(age * 0.3, -age * 0.5));
        float edge = distanceToBillow + (broken - 0.5) * 0.18;
        float density = smoothstep(0.19, 0.62, broken + (1.0 - distanceToBillow) * 0.20);
        // Separate rounded heads leave open channels; the lower skirt cannot
        // grow into a full opaque mask over the informative cut face.
        alpha = (1.0 - smoothstep(0.78, 1.0, edge))
          * smoothstep(-0.63, -0.31, p.y) * (0.36 + density * 0.64);
        vec3 formNormal = normalize(vec3(lobe * 0.75,
          sqrt(max(0.04, 1.0 - dot(lobe, lobe)))));
        float light = clamp(dot(formNormal, normalize(vec3(-0.45, 0.55, 0.70))), 0.0, 1.0);
        float warm = smoothstep(0.06, 0.70, -lobe.y)
          * (1.0 - smoothstep(-0.12, 0.55, p.y));
        diffuseColor.rgb = mix(vec3(0.017, 0.013, 0.016), vec3(0.12, 0.095, 0.073), light)
          + vec3(0.16, 0.045, 0.008) * warm;
        diffuseColor.rgb *= 0.82 + broken * 0.28;
      } else if (vEffectSurface.x > 5.5) {
        // Local +X still follows the real projected cut normal. Pressure birth
        // is a short connected gas mass; retained fire curls and sheds uneven
        // hot pockets. No closest-point tapered rays remain in either phase.
        float age = vEffectSurface.z;
        vec2 q = p;
        float warp = smoothstep(0.04, 0.40, length(p));
        q += vec2(paintNoise(p * vec2(3.5, 4.0) + vec2(-age * 2.6, age * 0.8)) - 0.5,
          paintNoise(p * vec2(4.0, 3.0) + vec2(-age * 1.7, -age * 1.3)) - 0.5) * warp * 0.25;
        float contour;
        float pockets;
        if (vEffectSurface.x < 6.5) {
          // Unequal overlapping lobes produce a broad short pressure pulse.
          float root = length(q / vec2(0.27, 0.40));
          float shoulder = length((q - vec2(0.26, 0.18)) / vec2(0.34, 0.31));
          float lower = length((q - vec2(0.35, -0.18)) / vec2(0.32, 0.24));
          contour = min(root, min(shoulder, lower));
          pockets = 0.8;
        } else {
          float travel = clamp(q.x, 0.0, 1.0);
          // Curvature has zero displacement at the fixed hot root. Advection
          // moves the bends themselves, not just a hash painted on a triangle.
          q.y -= warp * (0.16 * sin(travel * 8.0 - age * 5.0) + travel * travel * 0.27);
          float root = length(q / vec2(0.19, 0.24));
          float body = length((q - vec2(0.26, 0.01)) / vec2(0.30, 0.23));
          float curl = length((q - vec2(0.56, 0.15)) / vec2(0.24, 0.26));
          float tip = length((q - vec2(0.70, 0.31)) / vec2(0.18, 0.15));
          contour = min(root, min(body, min(curl, tip)));
          // A notch and rolling cool channels make irregular separated cores,
          // while the outer gas still gives an attached directional silhouette.
          float notch = length((q - vec2(0.48, 0.28)) / vec2(0.13, 0.15));
          contour = max(contour, (1.0 - notch) * 1.08);
          pockets = paintNoise(q * vec2(7.0, 5.0) + vec2(-age * 3.0, age * 0.7));
        }
        float eroded = contour + (paintNoise(q * vec2(8.0, 6.0)
          + vec2(-age * 2.0, age)) - 0.5) * 0.20;
        float edge = 1.0 - smoothstep(0.77, 1.04, eroded);
        float rootCore = 1.0 - smoothstep(0.045, 0.14, length(p));
        float core = max(rootCore, (1.0 - smoothstep(0.26, 0.73, eroded))
          * smoothstep(0.34, 0.72, pockets));
        diffuseColor.rgb = mix(vec3(1.0, 0.15, 0.012), vec3(1.0, 0.95, 0.73), core);
        alpha = edge * (1.0 - smoothstep(0.88, 1.0, abs(p.x)))
          * (1.0 - smoothstep(0.82, 1.0, abs(p.y)));
''' +s[z:]
s=s.replace("'painterly-atmosphere-directional-rupture-v7'","'painterly-atmosphere-curling-rupture-v8'")
s=s.replace('slot.startTime = finite(event.time, 0) + (plate === 0 ? 0 : plate * 0.025);','slot.startTime = finite(event.time, 0) + (authoredSurface && plate === 1 ? .065 : plate === 0 ? 0 : plate * 0.025);')
s=s.replace('slot.duration = (tracked ? [.24, 2.05, 2.05, 2.15] : [.22, .42, 1.6, 1.9])[plate]!;','slot.duration = (tracked ? [.24, 2.05, 2.05, 2.15] : [.22, .42, 1.6, 1.9])[plate]!;\n        // End the authored pressure peak before the retained aftermath. Fire\n        // starts at .065 s, providing a short overlap without a dark gap.\n        if (authoredSurface && plate === 0) slot.duration = .085;')
s=s.replace('this.writeEffectSurface(plateCount, smoke ? 8 : flash ? 6 : 7, opacity,\n            slot.startTime * 1.37 + (smoke ? age * .32 : age * 1.8));','// Authored branches consume actual event age, so a moving root cannot\n          // restart the pressure/fire progression. Legacy seed semantics stay unchanged.\n          this.writeEffectSurface(plateCount, smoke ? (slot.contactLayer === 2 ? 8 : 9) : flash ? 6 : 7, opacity, age);')
p.write_text(s)
p=b/'candidate'/files[1];s=p.read_text();s=s.replace('keeps ownership and original expiry','keeps ownership and retained expiry').replace('view.update(4.1, camera);','view.update(4.08, camera);').replace('[8, 8, 6, 7]','[8, 9, 6, 7]');p.write_text(s)
p=b/'candidate'/files[2];s=p.read_text().replace('view.update(3.1);','view.update(3.08);');p.write_text(s)
