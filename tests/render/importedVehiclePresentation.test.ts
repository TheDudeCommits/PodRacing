import { Color, Float32BufferAttribute, Group, Matrix3, MeshStandardMaterial, ObjectSpaceNormalMap,
  SRGBColorSpace, Texture, Vector2, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CelMaterial } from '../../src/render/materials/CelMaterial';
import { CEL_PALETTES } from '../../src/render/materials/celPalette';
import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../../src/render/materials/InvertedHullOutline';
import { CelPrepassMaterial } from '../../src/render/post/CelPrepassMaterial';
import { ImportedVehiclePresentation, VehicleArtLibrary, type VehicleArtSurfaceStyle } from '../../src/render/vehicles';
import { artFixture, deferred, source } from './vehicleArtFixtures';

describe('imported vehicle presentation lifecycle', () => {
  it('does not activate assets by construction and keeps a procedural-fallback-compatible empty state on missing art', async () => {
    const load = vi.fn().mockRejectedValue(new Error('404: model is not published'));
    const library = new VehicleArtLibrary({ load });
    const presentation = new ImportedVehiclePresentation(library);
    expect(load).not.toHaveBeenCalled();
    expect(presentation.getShadowRoot()).toBeNull();
    expect(await presentation.setSource(source('missing'))).toBe('error');
    expect(presentation.error?.message).toContain('404');
    expect(presentation.activeSource).toBeNull();
    expect(presentation.geometryRevision).toBe(0);
    expect(presentation.children).toHaveLength(0);
    presentation.dispose(); library.dispose();
  });

  it('accepts only the latest requested model when loads finish out of order', async () => {
    const a = artFixture(), b = artFixture();
    const aLoad = deferred<Group>(), bLoad = deferred<Group>();
    const changed = vi.fn();
    const library = new VehicleArtLibrary({ maxIdleEntries: 0,
      load: (url) => url.includes('/a.') ? aLoad.promise : bLoad.promise });
    const presentation = new ImportedVehiclePresentation(library, { onGeometryChanged: changed });
    const first = presentation.setSource(source('a'));
    const second = presentation.setSource(source('b'));
    bLoad.resolve(b.root);
    expect(await second).toBe('ready');
    aLoad.resolve(a.root);
    await first;
    await vi.waitFor(() => expect(a.disposed.geometry).toHaveBeenCalledTimes(1));
    expect(presentation.activeSource?.id).toBe('b');
    expect(presentation.geometryMeshes[0]?.geometry).toBe(b.geometry);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(presentation.geometryRevision).toBe(1);
    presentation.dispose(); library.dispose();
    expect(b.disposed.geometry).toHaveBeenCalledTimes(1);
  });

  it('keeps the prior ready art on replacement failure and retires its registrations before releasing resources', async () => {
    const a = artFixture(), b = artFixture();
    const load = vi.fn().mockResolvedValueOnce(a.root).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(b.root);
    const library = new VehicleArtLibrary({ load, maxIdleEntries: 0 });
    let priorMaterial: CelMaterial | undefined;
    let materialDisposed = false;
    const changed = vi.fn((change) => {
      if (change.revision === 2) {
        expect(change.previousPrepassMeshes).toHaveLength(2);
        expect(change.prepassMeshes).toHaveLength(2);
        expect(a.disposed.geometry).not.toHaveBeenCalled();
        expect(materialDisposed).toBe(false);
      }
    });
    const presentation = new ImportedVehiclePresentation(library, { onGeometryChanged: changed });
    await presentation.setSource(source('a'));
    const previous = presentation.geometryMeshes;
    priorMaterial = presentation.materials[0];
    priorMaterial?.addEventListener('dispose', () => { materialDisposed = true; });
    expect(await presentation.setSource(source('missing'))).toBe('error');
    expect(presentation.activeSource?.id).toBe('a');
    expect(presentation.requestedSource?.id).toBe('missing');
    expect(presentation.geometryMeshes).toBe(previous);
    expect(changed).toHaveBeenCalledTimes(1);
    await presentation.setSource(source('b'));
    expect(materialDisposed).toBe(true);
    expect(a.disposed.geometry).toHaveBeenCalledTimes(1);
    presentation.dispose(); library.dispose();
  });

  it.each(['clear', 'dispose'] as const)('prevents a late successful load resurrecting art after %s', async (action) => {
    const f = artFixture(), load = deferred<Group>();
    const library = new VehicleArtLibrary({ load: () => load.promise, maxIdleEntries: 0 });
    const changed = vi.fn();
    const presentation = new ImportedVehiclePresentation(library, { onGeometryChanged: changed });
    const loading = presentation.setSource(source('a'));
    if (action === 'clear') presentation.clearArt();
    else presentation.dispose();
    load.resolve(f.root);
    await loading;
    await vi.waitFor(() => expect(f.disposed.geometry).toHaveBeenCalledTimes(1));
    expect(presentation.status).toBe(action === 'clear' ? 'empty' : 'disposed');
    expect(presentation.children).toHaveLength(0);
    expect(changed).not.toHaveBeenCalled();
    presentation.dispose(); library.dispose();
  });

  it('borrows actual body and driver geometry for live prepasses, following engine transforms and all ancestor visibility', async () => {
    const f = artFixture(3, 4);
    const library = new VehicleArtLibrary({ load: async () => f.root, maxIdleEntries: 0 });
    const presentation = new ImportedVehiclePresentation(library);
    const wrapper = new Group(); wrapper.add(presentation);
    wrapper.position.set(20, 7, -13); wrapper.rotation.y = .75; wrapper.scale.set(1, 1.1, .9);
    expect(await presentation.setSource({ ...source('a'), embeddedPilotNodePrefix: 'test-pilot-', attachments: {
      pilot: { position: [0, .7, 0] }, exhaustLeft: { node: 'engine-left', position: [0, 0, -2] },
    } })).toBe('ready');
    expect(presentation.hasEmbeddedPilot).toBe(true);
    expect(presentation.statistics).toEqual({ meshes: 7, opaqueDraws: 7, bodyDraws: 3, pilotDraws: 4,
      triangles: 84, prepassDraws: 7, shadowSourceMeshes: 3 });
    expect(presentation.getShadowMeshes()).toHaveLength(3);
    const driver = presentation.geometryMeshes.find((mesh) => mesh.name.startsWith('test-pilot-'))!;
    expect(driver.userData.inkstormRacerShadowExclude).toBe(true);
    const body = presentation.geometryMeshes[0]!;
    const proxy = presentation.prepassMeshes[0]!;
    expect(proxy.geometry).toBe(body.geometry);
    expect(body.geometry).toBe(f.geometry);
    expect(proxy.parent).toBe(body);
    expect((proxy.material as MeshStandardMaterial).visible).toBe(false);
    expect(proxy.userData.inkstormRacerShadowExclude).toBe(true);
    expect(body.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]).toBe(true);
    expect(f.meshes[0]?.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]).toBeUndefined();
    const mrt = new CelPrepassMaterial();
    mrt.setObjectFlags(body);
    expect(mrt.uniforms.uExcluded?.value).toBe(1);
    mrt.setObjectFlags(proxy);
    expect(mrt.uniforms.uExcluded?.value).toBe(0);
    const engine = presentation.getNode('engine-left')!;
    engine.rotation.x += .2; engine.position.y += .3;
    wrapper.updateMatrixWorld(true);
    proxy.updateWorldMatrix(true, false);
    expect(proxy.matrixWorld).toEqual(body.matrixWorld);
    const sourceNormalMatrix = new Matrix3().getNormalMatrix(body.matrixWorld);
    const proxyNormalMatrix = new Matrix3().getNormalMatrix(proxy.matrixWorld);
    expect(proxyNormalMatrix).toEqual(sourceNormalMatrix);
    expect(presentation.getAttachment('exhaustLeft')?.parent).toBe(engine);
    expect(presentation.getAttachment('pilot')?.position.toArray()).toEqual([0, .7, 0]);
    const point = new Vector3().setFromMatrixPosition(proxy.matrixWorld);
    expect(point.length()).toBeGreaterThan(10);
    engine.visible = false;
    presentation.syncPrepassVisibility();
    expect(proxy.visible).toBe(false);
    expect(presentation.prepassMeshes[1]?.visible).toBe(true);
    engine.visible = true; wrapper.visible = false;
    presentation.syncPrepassVisibility();
    expect(presentation.prepassMeshes.every((mesh) => !mesh.visible)).toBe(true);
    wrapper.visible = true; presentation.syncPrepassVisibility();
    expect(presentation.prepassMeshes.every((mesh) => mesh.visible)).toBe(true);
    expect(presentation.prepassMeshes[0]).toBe(proxy);
    mrt.dispose(); presentation.dispose(); library.dispose();
    expect(f.disposed.geometry).toHaveBeenCalledTimes(1);
  });

  it('converts materials per lease without losing source maps, tint or authored UV transforms', async () => {
    const f = artFixture();
    f.map.offset.set(.2, .3); f.map.repeat.set(2, 3); f.map.rotation = .25;
    const originalMatrix = f.map.matrix.clone();
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const a = new ImportedVehiclePresentation(library), b = new ImportedVehiclePresentation(library);
    await Promise.all([a.setSource(source('a')), b.setSource(source('a'))]);
    expect(a.materials).toHaveLength(1);
    expect(a.materials[0]).not.toBe(b.materials[0]);
    expect(a.materials[0]?.uniforms.uBaseColorMap?.value).toBe(f.map);
    expect(a.materials[0]?.uniforms.uTint?.value).toEqual(f.material.color);
    expect(f.meshes[0]?.material).toBe(f.material);
    expect(f.map.matrix).toEqual(originalMatrix);
    a.dispose();
    expect(f.disposed.map).not.toHaveBeenCalled();
    expect(f.disposed.material).not.toHaveBeenCalled();
    expect(b.geometryMeshes[0]?.geometry).toBe(f.geometry);
    b.dispose(); library.dispose();
    for (const spy of Object.values(f.disposed)) expect(spy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['too many body draws', () => artFixture(7), /budget/],
    ['too many driver draws', () => artFixture(3, 7), /budget/],
    ['missing seat parent', () => artFixture(), /unambiguous/],
    ['transparent geometry', () => { const f = artFixture(); f.material.transparent = true; return f; }, /opaque/],
    ['alpha cutout', () => { const f = artFixture(); f.material.alphaTest = .5; return f; }, /opaque/],
    ['missing UVs', () => { const f = artFixture(); f.geometry.deleteAttribute('uv'); return f; }, /missing uv/],
  ] as const)('reports %s as an admission failure with resources released', async (reason, make, message) => {
    const f = make();
    const library = new VehicleArtLibrary({ load: async () => f.root, maxIdleEntries: 0 });
    const presentation = new ImportedVehiclePresentation(library);
    const definition = { ...source('a'), embeddedPilotNodePrefix: 'test-pilot-',
      ...(reason === 'missing seat parent' ? { attachments: { pilot: { node: 'no-such-node', position: [0, 0, 0] as const } } } : {}),
    };
    expect(await presentation.setSource(definition)).toBe('error');
    expect(presentation.error?.message).toMatch(message);
    expect(presentation.geometryMeshes).toHaveLength(0);
    expect(presentation.geometryRevision).toBe(0);
    for (const spy of Object.values(f.disposed)) expect(spy).toHaveBeenCalledTimes(1);
    presentation.dispose(); library.dispose();
  });

  it('applies an explicit rival triangle budget instead of claiming arbitrary downloaded geometry is affordable', async () => {
    const f = artFixture();
    const library = new VehicleArtLibrary({ load: async () => f.root, maxIdleEntries: 0 });
    const presentation = new ImportedVehiclePresentation(library, { maxTriangles: 12 });
    expect(await presentation.setSource(source('a'))).toBe('error');
    expect(presentation.error?.message).toContain('24/12 triangles');
    presentation.dispose(); library.dispose();
  });
});

describe('imported authored surface maps', () => {
  it('preserves loader UV channels, texture transforms, signed normal scale and roughness factor across leases', async () => {
    const f = artFixture();
    const normal = new Texture(), roughness = new Texture();
    normal.channel = 1; roughness.channel = 2;
    normal.offset.set(.1, .3); normal.repeat.set(2, -1); normal.rotation = .2;
    roughness.matrixAutoUpdate = false;
    roughness.matrix.set(3, 0, .2, 0, 2, .1, 0, 0, 1);
    f.geometry.setAttribute('uv1', f.geometry.getAttribute('uv').clone());
    f.geometry.setAttribute('uv2', f.geometry.getAttribute('uv').clone());
    f.material.normalMap = normal; f.material.normalScale.set(.65, -.65);
    f.material.roughnessMap = roughness; f.material.roughness = .72;
    const disposeNormal = vi.spyOn(normal, 'dispose'), disposeRoughness = vi.spyOn(roughness, 'dispose');
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const a = new ImportedVehiclePresentation(library), b = new ImportedVehiclePresentation(library);
    expect(await a.setSource(source('mapped'))).toBe('ready');
    expect(await b.setSource(source('mapped'))).toBe('ready');
    const material = a.materials[0]!;
    expect(material.defines).toMatchObject({ CEL_NORMAL_UV: 'uv1', USE_UV1: '',
      CEL_ROUGHNESS_UV: 'uv2', USE_UV2: '', USE_CEL_ROUGHNESS: '' });
    expect(material.uniforms.uNormalMap?.value).toBe(normal);
    expect(material.uniforms.uRoughnessMap?.value).toBe(roughness);
    expect(material.uniforms.uNormalUvTransform?.value).toEqual(new Matrix3().setUvTransform(.1, .3, 2, -1, .2, 0, 0));
    expect(material.uniforms.uRoughnessUvTransform?.value).toEqual(roughness.matrix);
    expect(material.uniforms.uNormalScale?.value).toEqual(new Vector2(.65, -.65));
    expect(material.uniforms.uRoughness?.value).toBe(.72);
    expect(a.statistics.opaqueDraws).toBe(2);
    expect(a.statistics.prepassDraws).toBe(2);
    a.dispose();
    expect(disposeNormal).not.toHaveBeenCalled(); expect(disposeRoughness).not.toHaveBeenCalled();
    expect(b.materials[0]?.uniforms.uNormalMap?.value).toBe(normal);
    b.dispose(); library.dispose();
    expect(disposeNormal).toHaveBeenCalledTimes(1); expect(disposeRoughness).toHaveBeenCalledTimes(1);
  });

  it('selects authored tangents and preserves loader scale without changing the borrowed scale', async () => {
    const f = artFixture();
    const normal = new Texture();
    f.material.normalMap = normal; f.material.normalScale.set(.6, .4);
    const tangents = new Float32Array(f.geometry.getAttribute('position').count * 4);
    for (let offset = 0; offset < tangents.length; offset += 4) tangents.set([1, 0, 0, 1], offset);
    f.geometry.setAttribute('tangent', new Float32BufferAttribute(tangents, 4));
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const presentation = new ImportedVehiclePresentation(library);
    expect(await presentation.setSource(source('tangents'))).toBe('ready');
    expect(presentation.materials[0]?.defines.USE_TANGENT).toBe('');
    expect(presentation.materials[0]?.uniforms.uNormalScale?.value.toArray()).toEqual([.6, .4]);
    expect(f.material.normalScale.toArray()).toEqual([.6, .4]);
    presentation.dispose(); library.dispose();
  });

  it('does not activate roughness damping for legacy map-only materials, even with a standard-material default', async () => {
    const f = artFixture();
    f.material.roughness = 1;
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const presentation = new ImportedVehiclePresentation(library);
    expect(await presentation.setSource(source('legacy'))).toBe('ready');
    expect(presentation.materials[0]?.defines.USE_CEL_ROUGHNESS).toBeUndefined();
    expect(presentation.materials[0]?.defines.USE_CEL_NORMAL_MAP).toBeUndefined();
    presentation.dispose(); library.dispose();
  });

  it.each(['normalMap', 'roughnessMap'] as const)('rejects missing independent UVs for %s while retaining prior live art', async (slot) => {
    const prior = artFixture(), bad = artFixture();
    const map = new Texture(); map.channel = 3;
    bad.material[slot] = map;
    const dispose = vi.spyOn(map, 'dispose');
    const library = new VehicleArtLibrary({ load: vi.fn().mockResolvedValueOnce(prior.root).mockResolvedValueOnce(bad.root), maxIdleEntries: 0 });
    const presentation = new ImportedVehiclePresentation(library);
    await presentation.setSource(source('prior'));
    const live = presentation.geometryMeshes;
    expect(await presentation.setSource(source('bad'))).toBe('error');
    expect(presentation.error?.message).toContain('map is missing uv3');
    expect(presentation.geometryRevision).toBe(1);
    expect(presentation.geometryMeshes).toBe(live);
    expect(presentation.activeSource?.id).toBe('prior');
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(prior.disposed.map).not.toHaveBeenCalled();
    presentation.dispose(); library.dispose();
  });

  it.each([
    ['short UV buffer', (f: ReturnType<typeof artFixture>) => {
      f.geometry.setAttribute('uv1', new Float32BufferAttribute([0, 0], 2));
    }, /complete two-component/],
    ['non-finite UV', (f: ReturnType<typeof artFixture>) => {
      const uv = f.geometry.getAttribute('uv').clone(); uv.setX(0, Number.NaN); f.geometry.setAttribute('uv1', uv);
    }, /non-finite uv1/],
    ['sRGB normal data', (f: ReturnType<typeof artFixture>) => {
      f.material.normalMap!.colorSpace = SRGBColorSpace;
    }, /linear data/],
    ['object-space normal data', (f: ReturnType<typeof artFixture>) => {
      f.material.normalMapType = ObjectSpaceNormalMap;
    }, /tangent-space/],
    ['zero authored tangent', (f: ReturnType<typeof artFixture>) => {
      f.geometry.setAttribute('tangent', new Float32BufferAttribute(new Float32Array(f.geometry.getAttribute('position').count * 4), 4));
    }, /finite nonzero directions/],
  ] as const)('rejects %s before material conversion and releases the failed template', async (_label, change, message) => {
    const f = artFixture();
    f.geometry.setAttribute('uv1', f.geometry.getAttribute('uv').clone());
    const normal = new Texture(); normal.channel = 1; f.material.normalMap = normal;
    const dispose = vi.spyOn(normal, 'dispose');
    change(f);
    const library = new VehicleArtLibrary({ load: async () => f.root, maxIdleEntries: 0 });
    const presentation = new ImportedVehiclePresentation(library);
    expect(await presentation.setSource(source('invalid-data'))).toBe('error');
    expect(presentation.error?.message).toMatch(message);
    expect(presentation.geometryRevision).toBe(0);
    expect(presentation.materials).toHaveLength(0);
    expect(dispose).toHaveBeenCalledTimes(1);
    presentation.dispose(); library.dispose();
  });
});

describe('exact authored material surface styles', () => {
  it('styles only the exact named material while preserving original maps, transforms, tint and signed normal scales', async () => {
    const f = artFixture();
    const normal = new Texture(), roughness = new Texture();
    normal.offset.set(.2, .3); normal.repeat.set(2, -1); normal.rotation = .4;
    normal.channel = 1; roughness.channel = 1;
    f.geometry.setAttribute('uv1', f.geometry.getAttribute('uv').clone());
    f.material.name = 'Authored Cloth';
    f.material.normalMap = normal; f.material.normalScale.set(.8, -.6);
    f.material.roughnessMap = roughness; f.material.roughness = .7;
    const trim = f.material.clone(); trim.name = 'Authored Cloth trim';
    f.meshes[1]!.material = trim;
    const normalMatrix = normal.matrix.clone(), colorMatrix = f.map.matrix.clone();
    const normalDisposed = vi.spyOn(normal, 'dispose'), roughnessDisposed = vi.spyOn(roughness, 'dispose');
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const presentation = new ImportedVehiclePresentation(library, { materialOptions: {
      palette: CEL_PALETTES.player, specularStrength: .4, rimStrength: .3, reflectionStrength: .2,
      wear: .5, tint: '#a0c0e0', baseColorStrength: .6,
    } });
    expect(await presentation.setSource({ ...source('styled'), surfaceStyles: {
      'Authored Cloth': { palette: CEL_PALETTES.rivalTeal, specularStrength: .01,
        rimStrength: .02, reflectionStrength: .03, wear: .04, normalStrength: .25, baseColorStrength: .86 },
      'authored cloth trim': { specularStrength: 0, normalStrength: 0, baseColorStrength: .2 },
    } })).toBe('ready');
    const cloth = presentation.geometryMeshes[0]!.material as CelMaterial;
    const untouched = presentation.geometryMeshes[1]!.material as CelMaterial;
    expect(cloth.palette).toBe(CEL_PALETTES.rivalTeal);
    expect(untouched.palette).toBe(CEL_PALETTES.player);
    expect(cloth.uniforms.uBaseColorStrength?.value).toBe(.86);
    expect(untouched.uniforms.uBaseColorStrength?.value).toBe(.6);
    expect(['uSpecularStrength', 'uRimStrength', 'uReflectionStrength', 'uWear'].map((key) => cloth.uniforms[key]?.value)).toEqual([.01, .02, .03, .04]);
    expect(['uSpecularStrength', 'uRimStrength', 'uReflectionStrength', 'uWear'].map((key) => untouched.uniforms[key]?.value)).toEqual([.4, .3, .2, .5]);
    expect(cloth.uniforms.uNormalScale?.value.toArray()).toEqual([.2, -.15]);
    expect(untouched.uniforms.uNormalScale?.value.toArray()).toEqual([.8, -.6]);
    for (const material of [cloth, untouched]) {
      expect(material.uniforms.uBaseColorMap?.value).toBe(f.map);
      expect(material.uniforms.uNormalMap?.value).toBe(normal);
      expect(material.uniforms.uRoughnessMap?.value).toBe(roughness);
      expect(material.uniforms.uRoughness?.value).toBe(.7);
      expect(material.uniforms.uTint?.value).toEqual(new Color('#a0c0e0').multiply(f.material.color));
      expect(material.defines.CEL_NORMAL_UV).toBe('uv1');
      expect(material.uniforms.uNormalUvTransform?.value).toEqual(new Matrix3().setUvTransform(.2, .3, 2, -1, .4, 0, 0));
    }
    expect(f.material.normalScale.toArray()).toEqual([.8, -.6]);
    expect(trim.normalScale.toArray()).toEqual([.8, -.6]);
    expect(normal.matrix).toEqual(normalMatrix); expect(f.map.matrix).toEqual(colorMatrix);
    expect(presentation.statistics.opaqueDraws).toBe(2);
    expect(presentation.statistics.triangles).toBe(24);
    presentation.dispose();
    expect(normalDisposed).not.toHaveBeenCalled(); expect(roughnessDisposed).not.toHaveBeenCalled();
    library.dispose();
    expect(normalDisposed).toHaveBeenCalledTimes(1); expect(roughnessDisposed).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['normalStrength', -1], ['specularStrength', Number.NaN], ['rimStrength', Number.POSITIVE_INFINITY],
    ['reflectionStrength', -.1], ['wear', Number.NaN],
  ] as const)('rejects invalid %s before replacing prior art', async (key, value) => {
    const prior = artFixture(), candidate = artFixture();
    candidate.material.name = 'Authored Cloth';
    const library = new VehicleArtLibrary({ load: vi.fn().mockResolvedValueOnce(prior.root).mockResolvedValueOnce(candidate.root), maxIdleEntries: 0 });
    const changed = vi.fn();
    const presentation = new ImportedVehiclePresentation(library, { onGeometryChanged: changed });
    await presentation.setSource(source('prior'));
    const liveMeshes = presentation.geometryMeshes;
    expect(await presentation.setSource({ ...source('invalid-style'), surfaceStyles: {
      'Authored Cloth': { [key]: value },
    } })).toBe('error');
    expect(presentation.error?.message).toContain(`${key} must be finite and nonnegative`);
    expect(presentation.activeSource?.id).toBe('prior');
    expect(presentation.geometryMeshes).toBe(liveMeshes);
    expect(presentation.geometryRevision).toBe(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(prior.disposed.map).not.toHaveBeenCalled();
    for (const disposed of Object.values(candidate.disposed)) expect(disposed).toHaveBeenCalledTimes(1);
    presentation.dispose(); library.dispose();
  });

  it.each([0, 1])('accepts atlas modulation boundary %s without changing another lease or the source maps', async (strength) => {
    const f = artFixture(); f.material.name = 'Authored Cloth';
    const roughness = new Texture(); f.material.roughnessMap = roughness; f.material.roughness = .7;
    const roughnessDisposed = vi.spyOn(roughness, 'dispose');
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const styled = new ImportedVehiclePresentation(library);
    const unstyled = new ImportedVehiclePresentation(library);
    expect(await styled.setSource({ ...source('shared'), surfaceStyles: {
      'Authored Cloth': { baseColorStrength: strength },
    } })).toBe('ready');
    expect(await unstyled.setSource(source('shared'))).toBe('ready');
    expect(styled.materials[0]!.uniforms.uBaseColorStrength?.value).toBe(strength);
    expect(unstyled.materials[0]!.uniforms.uBaseColorStrength?.value).toBe(1);
    expect(styled.materials[0]).not.toBe(unstyled.materials[0]);
    for (const presentation of [styled, unstyled]) {
      expect(presentation.geometryMeshes[0]!.geometry).toBe(f.geometry);
      expect(presentation.materials[0]!.uniforms.uBaseColorMap?.value).toBe(f.map);
      expect(presentation.materials[0]!.uniforms.uRoughnessMap?.value).toBe(roughness);
      expect(presentation.materials[0]!.uniforms.uRoughness?.value).toBe(.7);
    }
    expect(f.material.map).toBe(f.map); expect(f.material.roughnessMap).toBe(roughness);
    styled.dispose();
    expect(f.disposed.map).not.toHaveBeenCalled(); expect(roughnessDisposed).not.toHaveBeenCalled();
    expect(unstyled.status).toBe('ready');
    unstyled.dispose(); library.dispose();
    expect(f.disposed.map).toHaveBeenCalledTimes(1); expect(roughnessDisposed).toHaveBeenCalledTimes(1);
  });

  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects atlas modulation %s before replacing prior ready art', async (baseColorStrength) => {
      const prior = artFixture(), candidate = artFixture();
      candidate.material.name = 'Authored Cloth';
      const library = new VehicleArtLibrary({ load: vi.fn().mockResolvedValueOnce(prior.root).mockResolvedValueOnce(candidate.root), maxIdleEntries: 0 });
      const changed = vi.fn();
      const presentation = new ImportedVehiclePresentation(library, { onGeometryChanged: changed });
      await presentation.setSource(source('prior'));
      const liveMeshes = presentation.geometryMeshes;
      expect(await presentation.setSource({ ...source('bad-modulation'), surfaceStyles: {
        'Authored Cloth': { baseColorStrength },
      } })).toBe('error');
      expect(presentation.error?.message).toContain('baseColorStrength must be finite and between 0 and 1');
      expect(presentation.activeSource?.id).toBe('prior');
      expect(presentation.geometryMeshes).toBe(liveMeshes);
      expect(presentation.geometryRevision).toBe(1); expect(changed).toHaveBeenCalledTimes(1);
      expect(prior.disposed.map).not.toHaveBeenCalled();
      for (const disposed of Object.values(candidate.disposed)) expect(disposed).toHaveBeenCalledTimes(1);
      presentation.dispose(); library.dispose();
    },
  );

  it('does not admit untyped texture/source knobs in a surface style', async () => {
    const f = artFixture(); f.material.name = 'Authored Cloth';
    const library = new VehicleArtLibrary({ load: async () => f.root, maxIdleEntries: 0 });
    const presentation = new ImportedVehiclePresentation(library);
    const unsafe = { baseColorMap: f.map } as unknown as VehicleArtSurfaceStyle;
    expect(await presentation.setSource({ ...source('unsafe-style'), surfaceStyles: { 'Authored Cloth': unsafe } })).toBe('error');
    expect(presentation.error?.message).toContain('unsupported field "baseColorMap"');
    expect(presentation.geometryRevision).toBe(0);
    presentation.dispose(); library.dispose();
  });
});

describe('exact authored material painted shading', () => {
  it('applies softness only to the exact material name and preserves fallback values for case and suffix mismatches', async () => {
    const f = artFixture(); f.material.name = 'Authored Cloth';
    const trim = f.material.clone(); trim.name = 'Authored Cloth trim';
    f.meshes[1]!.material = trim;
    const library = new VehicleArtLibrary({ load: async () => f.root });
    const presentation = new ImportedVehiclePresentation(library, { materialOptions: {
      paintedShadingSoftness: .2, wear: .4, specularStrength: .32,
    } });
    expect(await presentation.setSource({ ...source('painted-name-match'), surfaceStyles: {
      'Authored Cloth': { paintedShadingSoftness: .8 },
      'authored cloth trim': { paintedShadingSoftness: 1 },
    } })).toBe('ready');
    const cloth = presentation.geometryMeshes[0]!.material as CelMaterial;
    const untouched = presentation.geometryMeshes[1]!.material as CelMaterial;
    expect(cloth.uniforms.uPaintedShadingSoftness?.value).toBe(.8);
    expect(untouched.uniforms.uPaintedShadingSoftness?.value).toBe(.2);
    for (const material of [cloth, untouched]) {
      expect(material.uniforms.uBaseColorMap?.value).toBe(f.map);
      expect(material.uniforms.uWear?.value).toBe(.4);
      expect(material.uniforms.uSpecularStrength?.value).toBe(.32);
    }
    expect(presentation.statistics.opaqueDraws).toBe(2);
    expect(presentation.statistics.triangles).toBe(24);
    presentation.dispose(); library.dispose();
  });

  it.each([0, 1])('accepts painted softness boundary %s without changing another lease or its borrowed maps', async (paintedShadingSoftness) => {
    const f = artFixture(); f.material.name = 'Authored Cloth';
    const roughness = new Texture(); f.material.roughnessMap = roughness; f.material.roughness = .7;
    f.map.offset.set(.2, .3); f.map.repeat.set(2, -1);
    roughness.matrixAutoUpdate = false; roughness.matrix.set(2, 0, .1, 0, 3, .2, 0, 0, 1);
    const originalMapMatrix = f.map.matrix.clone(), originalRoughnessMatrix = roughness.matrix.clone();
    const roughnessDisposed = vi.spyOn(roughness, 'dispose');
    const load = vi.fn().mockResolvedValue(f.root);
    const library = new VehicleArtLibrary({ load });
    const styled = new ImportedVehiclePresentation(library);
    const unstyled = new ImportedVehiclePresentation(library);
    expect(await styled.setSource({ ...source('shared-paint'), surfaceStyles: {
      'Authored Cloth': { paintedShadingSoftness },
    } })).toBe('ready');
    expect(await unstyled.setSource(source('shared-paint'))).toBe('ready');
    expect(load).toHaveBeenCalledTimes(1);
    const painted = styled.materials[0]!, legacy = unstyled.materials[0]!;
    expect(painted.uniforms.uPaintedShadingSoftness?.value).toBe(paintedShadingSoftness === 0 ? undefined : paintedShadingSoftness);
    expect(legacy.uniforms.uPaintedShadingSoftness).toBeUndefined();
    expect(painted).not.toBe(legacy);
    expect(painted.uniforms.uRamp?.value).not.toBe(legacy.uniforms.uRamp?.value);
    const legacyBytes = (legacy.uniforms.uRamp?.value.image.data as Uint8Array).slice();
    for (const presentation of [styled, unstyled]) {
      const material = presentation.materials[0]!;
      expect(presentation.geometryMeshes[0]!.geometry).toBe(f.geometry);
      expect(material.uniforms.uBaseColorMap?.value).toBe(f.map);
      expect(material.uniforms.uRoughnessMap?.value).toBe(roughness);
      expect(material.uniforms.uRoughness?.value).toBe(.7);
      expect(material.uniforms.uBaseColorStrength?.value).toBe(1);
      expect(material.uniforms.uBaseColorUvTransform?.value).toEqual(new Matrix3().setUvTransform(.2, .3, 2, -1, 0, 0, 0));
      expect(material.uniforms.uRoughnessUvTransform?.value).toEqual(originalRoughnessMatrix);
    }
    if (paintedShadingSoftness === 0) {
      expect(painted.fragmentShader).toBe(legacy.fragmentShader);
      expect(painted.uniforms.uRamp?.value.image.data).toEqual(legacyBytes);
    } else {
      expect(painted.fragmentShader).not.toBe(legacy.fragmentShader);
      expect(painted.uniforms.uRamp?.value.image.data).not.toEqual(legacyBytes);
    }
    painted.setPalette(CEL_PALETTES.rivalTeal);
    expect(legacy.uniforms.uRamp?.value.image.data).toEqual(legacyBytes);
    expect(f.material.map).toBe(f.map); expect(f.material.roughnessMap).toBe(roughness);
    expect(f.map.matrix).toEqual(originalMapMatrix); expect(roughness.matrix).toEqual(originalRoughnessMatrix);
    styled.dispose();
    expect(f.disposed.map).not.toHaveBeenCalled(); expect(roughnessDisposed).not.toHaveBeenCalled();
    expect(unstyled.status).toBe('ready');
    unstyled.dispose(); library.dispose();
    expect(f.disposed.map).toHaveBeenCalledTimes(1); expect(roughnessDisposed).toHaveBeenCalledTimes(1);
  });

  it.each([-.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects painted softness %s before replacing prior ready art and releases the failed lease', async (paintedShadingSoftness) => {
      const prior = artFixture(), candidate = artFixture(); candidate.material.name = 'Authored Cloth';
      const library = new VehicleArtLibrary({
        load: vi.fn().mockResolvedValueOnce(prior.root).mockResolvedValueOnce(candidate.root), maxIdleEntries: 0,
      });
      const changed = vi.fn();
      const presentation = new ImportedVehiclePresentation(library, { onGeometryChanged: changed });
      await presentation.setSource(source('prior'));
      const liveMeshes = presentation.geometryMeshes;
      expect(await presentation.setSource({ ...source('bad-paint-softness'), surfaceStyles: {
        'Authored Cloth': { paintedShadingSoftness },
      } })).toBe('error');
      expect(presentation.error?.message).toContain('paintedShadingSoftness must be finite and between 0 and 1');
      expect(presentation.activeSource?.id).toBe('prior');
      expect(presentation.geometryMeshes).toBe(liveMeshes);
      expect(presentation.geometryRevision).toBe(1); expect(changed).toHaveBeenCalledTimes(1);
      expect(prior.disposed.map).not.toHaveBeenCalled();
      for (const disposed of Object.values(candidate.disposed)) expect(disposed).toHaveBeenCalledTimes(1);
      presentation.dispose(); library.dispose();
    },
  );
});
