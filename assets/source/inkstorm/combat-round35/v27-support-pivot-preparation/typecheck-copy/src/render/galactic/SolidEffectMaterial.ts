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
