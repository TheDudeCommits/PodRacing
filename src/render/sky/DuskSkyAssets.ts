import { LinearMipmapLinearFilter, RepeatWrapping, type Texture } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { DUSK_SKY_EXPOSURE, DUSK_SKY_ROTATION, DUSK_SKY_SUN } from './DuskSkyShader';

export const DUSK_SKY_URL = '/assets/salt-dusk-v2/environment/kloppenheim-dusk-4k.hdr';

const uniforms = {
  uDuskSun: { value: DUSK_SKY_SUN.clone() },
  uDuskEnvironment: { value: null as Texture | null },
  uDuskEnvironmentReady: { value: 0 },
  uDuskEnvironmentRotation: { value: DUSK_SKY_ROTATION },
  uDuskEnvironmentExposure: { value: DUSK_SKY_EXPOSURE },
};

/** Materials borrow uniform references; only a lease owns the HDR texture. */
export function duskSkyUniforms() { return { ...uniforms }; }
export const duskSkyAssetReceipt = { loaded: [] as string[], failures: [] as string[] };

let owners = 0;
let generation = 0;
let loading: Promise<void> | null = null;

function loadDuskSky(): Promise<void> {
  if (loading) return loading;
  if (typeof document === 'undefined') return Promise.resolve();
  const epoch = generation;
  duskSkyAssetReceipt.loaded.length = 0;
  duskSkyAssetReceipt.failures.length = 0;
  loading = new HDRLoader().loadAsync(DUSK_SKY_URL).then(texture => {
    if (epoch !== generation) { texture.dispose(); return; }
    texture.wrapS = RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = LinearMipmapLinearFilter;
    uniforms.uDuskEnvironment.value = texture;
    uniforms.uDuskEnvironmentReady.value = 1;
    duskSkyAssetReceipt.loaded.push(DUSK_SKY_URL);
  }).catch(() => {
    if (epoch === generation) duskSkyAssetReceipt.failures.push(DUSK_SKY_URL);
  });
  return loading;
}

/** Loads only the approved sky photograph. Late downloads from a disposed app
 * cannot republish into a new app, and repeated releases are safe. */
export function acquireDuskSkyAssets(): { ready: Promise<void>; release(): void } {
  owners++;
  const ready = loadDuskSky();
  let released = false;
  return {
    ready,
    release() {
      if (released) return;
      released = true;
      if (--owners > 0) return;
      generation++;
      loading = null;
      uniforms.uDuskEnvironment.value?.dispose();
      uniforms.uDuskEnvironment.value = null;
      uniforms.uDuskEnvironmentReady.value = 0;
      duskSkyAssetReceipt.loaded.length = 0;
      duskSkyAssetReceipt.failures.length = 0;
    },
  };
}
