import { FrontSide, MeshBasicMaterial } from 'three';

/** Opaque pooled props share the world's sun direction and broad violet shade. */
export function createSolidEffectMaterial(hardware = false): MeshBasicMaterial {
  const result = new MeshBasicMaterial({
    color: '#ffffff', vertexColors: false, transparent: false,
    depthWrite: true, side: FrontSide, toneMapped: false,
  });
  result.name = hardware ? 'Inkstorm salvage casing and inset signals' : 'Inkstorm solid rubble';
  result.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      varying vec3 vSolidNormal;
      ${hardware
        ? 'attribute float aHardwareSignal; varying float vHardwareSignal; attribute float aHardwareSurface; varying float vHardwareSurface;'
        : 'attribute float aSolidFacet; varying float vSolidFacet;'}
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec3 solidNormal = normal;
      #ifdef USE_INSTANCING
        mat3 solidInstance = mat3(instanceMatrix);
        solidNormal = solidInstance * (solidNormal / max(vec3(
          dot(solidInstance[0], solidInstance[0]),
          dot(solidInstance[1], solidInstance[1]),
          dot(solidInstance[2], solidInstance[2])), vec3(0.000001)));
      #endif
      // Effects use rigid scene transforms and positive orthogonal TRS instances.
      vSolidNormal = normalize(mat3(modelMatrix) * solidNormal);
      ${hardware ? 'vHardwareSignal = aHardwareSignal; vHardwareSurface = aHardwareSurface;' : 'vSolidFacet = aSolidFacet;'}
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec3 vSolidNormal;
      ${hardware ? 'varying float vHardwareSignal; varying float vHardwareSurface;' : 'varying float vSolidFacet;'}
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 solidNormal = normalize(vSolidNormal);
      float incidence = dot(solidNormal, normalize(vec3(-.42, .76, -.5)));
      float skyFill = clamp(solidNormal.y * .5 + .5, 0., 1.);
      float direct = max(0., incidence);
      ${hardware ? `
        // Neutral metal owns the silhouette; state color occupies small inset
        // bars. Separate receiver, machined lip, and painted casing values.
        float machined = step(.5, vHardwareSurface) * (1. - step(1.5, vHardwareSurface));
        float receiver = step(1.5, vHardwareSurface);
        vec3 hardwareColor = mix(vec3(.15, .18, .22), diffuseColor.rgb * .20, .12);
        hardwareColor = mix(hardwareColor, vec3(.38, .40, .40), machined);
        hardwareColor = mix(hardwareColor, vec3(.027, .038, .048), receiver);
        vec3 chassis = hardwareColor * (.20 + .12 * skyFill + .78 * direct);
        vec3 signal = diffuseColor.rgb * (.78 + .22 * direct);
        diffuseColor.rgb = mix(chassis, signal, vHardwareSignal);
      ` : `
        // Flat geometric normals define each rock plane. A continuous direct
        // response avoids broad equal-value bands across adjacent facets.
        vec3 shade = vec3(.022, .014, .051) + diffuseColor.rgb * vec3(.10, .08, .19);
        vec3 sun = diffuseColor.rgb * vec3(1.04, .91, .79);
        float lit = pow(clamp((incidence + .18) / 1.18, 0., 1.), 1.15);
        diffuseColor.rgb = mix(shade * (.76 + .24 * skyFill), sun, lit) * vSolidFacet;
      `}
    `);
  };
  result.customProgramCacheKey = () => hardware ? 'inkstorm-solid-hardware-v2' : 'inkstorm-solid-rubble-v2';
  return result;
}

/** Dense rolling dust cores share actual depth and sun-facing volume shade.
 * Their lifetime contracts the geometry; no alpha curtain or opacity wash. */
export function createContactDustMaterial(): MeshBasicMaterial {
  const result = new MeshBasicMaterial({ color: '#ffffff', transparent: false,
    depthTest: true, depthWrite: true, side: FrontSide, toneMapped: false });
  result.name = 'Inkstorm rolling ochre contact volume';
  result.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute float aContactAge;
      varying float vContactAge;
      varying vec3 vContactNormal;
      varying vec3 vContactLocal;
      varying vec3 vContactWorld;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vContactLocal = position;
      vContactAge = aContactAge;
      vec3 contactNormal = normal;
      vec4 contactWorld = vec4(position, 1.);
      #ifdef USE_INSTANCING
        mat3 m = mat3(instanceMatrix);
        // Adjugate-transpose handles the fitted terrain shear as well as
        // nonuniform scale; positive determinant needs no sign correction.
        mat3 cofactors = mat3(cross(m[1], m[2]), cross(m[2], m[0]), cross(m[0], m[1]));
        contactNormal = cofactors * contactNormal;
        contactWorld = instanceMatrix * contactWorld;
      #endif
      vContactNormal = normalize(mat3(modelMatrix) * contactNormal);
      vContactWorld = (modelMatrix * contactWorld).xyz;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying float vContactAge;
      varying vec3 vContactNormal;
      varying vec3 vContactLocal;
      varying vec3 vContactWorld;
      float contactHash(vec3 p) {
        p = fract(p * .3183099 + vec3(.11, .37, .71));
        p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float contactNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(contactHash(i), contactHash(i + vec3(1,0,0)), f.x),
          mix(contactHash(i + vec3(0,1,0)), contactHash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(contactHash(i + vec3(0,0,1)), contactHash(i + vec3(1,0,1)), f.x),
          mix(contactHash(i + vec3(0,1,1)), contactHash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      // Game-clock age rolls small billows up the closed core. No vertex
      // displacement changes the grounded shell or its shared depth passes.
      vec3 p = vContactLocal * vec3(3.2, 4., 3.2) - vec3(0., vContactAge * 1.3, 0.);
      float billow = contactNoise(p) * .88 + contactNoise(p * 2.3 + 9.) * .12;
      vec3 n = normalize(vContactNormal);
      vec3 dx = dFdx(vContactWorld), dy = dFdy(vContactWorld);
      vec3 r1 = cross(dy, n), r2 = cross(n, dx);
      float det = dot(dx, r1);
      vec3 gradient = sign(det) * (dFdx(billow) * r1 + dFdy(billow) * r2);
      n = normalize(n - .035 * (1. - smoothstep(.8, 1.5, vContactAge))
        * gradient / max(abs(det), .000001));
      float direct = dot(n, normalize(vec3(-.42, .76, -.5)));
      float crown = smoothstep(.05, .8, vContactLocal.y);
      float light = smoothstep(-.24, .92, direct) * (.65 + .35 * crown);
      vec3 trough = diffuseColor.rgb * vec3(.30, .23, .18);
      vec3 lit = diffuseColor.rgb * vec3(1.38, 1.19, .94);
      diffuseColor.rgb = mix(trough, lit, light) * (.88 + .24 * billow);
    `);
  };
  result.customProgramCacheKey = () => 'inkstorm-closed-contact-volume-v2';
  return result;
}
