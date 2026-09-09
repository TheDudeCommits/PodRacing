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

/** Porous contact cloud cards keep terrain/casing depth tests, but never
 * write a solid surface into beauty depth or opaque ink prepasses. */
export function createContactDustMaterial(): MeshBasicMaterial {
  const result = new MeshBasicMaterial({ color: '#ffffff', transparent: true,
    depthTest: true, depthWrite: false, side: FrontSide, toneMapped: false });
  result.name = 'Inkstorm porous ochre contact billows';
  result.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute vec4 aContactState;
      varying vec4 vContactState;
      varying vec2 vContactUv;
      varying vec3 vContactRight;
      varying vec3 vContactFacing;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vContactUv = vec2(position.x + .5, position.y);
      vContactState = aContactState;
      vContactRight = vec3(1., 0., 0.);
      vContactFacing = vec3(0., 0., 1.);
      #ifdef USE_INSTANCING
        vContactRight = normalize(vec3(instanceMatrix[0].x, 0., instanceMatrix[0].z));
        vContactFacing = normalize(vec3(instanceMatrix[2].x, 0., instanceMatrix[2].z));
      #endif
      vContactRight = normalize(mat3(modelMatrix) * vContactRight);
      vContactFacing = normalize(mat3(modelMatrix) * vContactFacing);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec4 vContactState;
      varying vec2 vContactUv;
      varying vec3 vContactRight;
      varying vec3 vContactFacing;
      float contactHash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      float contactNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(contactHash(i), contactHash(i + vec2(1,0)), f.x),
          mix(contactHash(i + vec2(0,1)), contactHash(i + vec2(1,1)), f.x), f.y);
      }
      float contactUnion(float a, float b) {
        float h = clamp(.5 + .5 * (b - a) / .22, 0., 1.);
        return mix(b, a, h) - .22 * h * (1. - h);
      }
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      float age = vContactState.x, seed = vContactState.y, layer = vContactState.w;
      vec2 q = vContactUv * 2. - 1.;
      q.x += sin(age * 3. + seed) * .10 * vContactUv.y;
      // Unequal overlapping rounded lobes have porous feathered boundaries;
      // the quad edge is never the visible silhouette, including its base.
      float a = length((q - vec2(-.28, -.28)) / vec2(.62, .66)) - 1.;
      float b = length((q - vec2(.32, -.20)) / vec2(.55, .73)) - 1.;
      float c = length((q - vec2(-.04, .31)) / vec2(.55, .58)) - 1.;
      float envelope = contactUnion(contactUnion(a, b), c);
      vec2 flow = vec2(seed + layer * 4.1, -age * .9);
      float coarse = contactNoise(q * 3.2 + flow);
      float fine = contactNoise(q * 8.5 + flow * 1.6);
      float turbulence = coarse * .74 + fine * .26;
      float brokenEdge = envelope + (turbulence - .5) * .30;
      float silhouette = 1. - smoothstep(-.10, .22, brokenEdge);
      float border = smoothstep(0., .12, vContactUv.x) * smoothstep(0., .12, 1. - vContactUv.x)
        * smoothstep(0., .10, vContactUv.y) * smoothstep(0., .10, 1. - vContactUv.y);
      float pores = smoothstep(.12, .62, turbulence);
      float density = silhouette * border * (.22 + .78 * pores);
      float birth = smoothstep(0., .05, age);
      float extinction = (1. - exp(-density * 1.5)) * birth * vContactState.z * (layer < .5 ? .72 : .53);
      diffuseColor.a *= extinction;
      if (diffuseColor.a < .004) discard;
      // An analytic rounded volume normal gives sunlit crowns, with broad
      // low-contrast turbulence inside. No rock normal-map microcontrast.
      vec3 localNormal = normalize(vec3(q.x * .55, (q.y + .45) * .80,
        sqrt(max(.12, 1. - dot(q * .65, q * .65)))));
      vec3 worldNormal = normalize(vContactRight * localNormal.x + vec3(0., localNormal.y, 0.)
        + vContactFacing * localNormal.z);
      float light = smoothstep(-.25, .9, dot(worldNormal, normalize(vec3(-.42, .76, -.5))));
      vec3 trough = diffuseColor.rgb * vec3(.48, .40, .32);
      vec3 crown = diffuseColor.rgb * vec3(1.25, 1.17, 1.05);
      diffuseColor.rgb = mix(trough, crown, light) * (.84 + .28 * coarse);
    `);
  };
  result.customProgramCacheKey = () => 'inkstorm-porous-contact-billows-v1';
  return result;
}
