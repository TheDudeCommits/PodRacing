import { describe, expect, it } from 'vitest';
import {
  BackSide,
  Bone,
  BoxGeometry,
  GLSL3,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Skeleton,
  SkinnedMesh,
} from 'three';

import {
  CEL_HULL_OUTLINE_USER_DATA_KEY,
  CEL_OUTLINE_NORMAL_ATTRIBUTE,
  CEL_PALETTES,
  CEL_POST_EXCLUDE_USER_DATA_KEY,
  CelMaterial,
  InvertedHullMaterial,
  createCelRampTexture,
  createGraphicMatcapTexture,
  createInvertedHullOutline,
  validateCelRampConfig,
} from '../../src/render/materials';
import { CelPrepassMaterial } from '../../src/render/post';

function textureBytes(texture: ReturnType<typeof createCelRampTexture>): Uint8Array {
  const { data } = texture.image;
  if (!(data instanceof Uint8Array)) throw new Error('Expected byte-backed ramp texture.');
  return data;
}

describe('cel ramp generation', () => {
  it('places hard transitions at explicitly tuned thresholds', () => {
    const texture = createCelRampTexture({
      bands: ['#000000', '#ff0000', '#00ff00', '#ffffff'],
      thresholds: [0.2, 0.5, 0.8],
      resolution: 100,
    });
    const bytes = textureBytes(texture);
    const rgb = (x: number): number[] => Array.from(bytes.slice(x * 4, x * 4 + 3));

    expect(rgb(19)).toEqual([0, 0, 0]);
    expect(rgb(20)).toEqual([255, 0, 0]);
    expect(rgb(49)).toEqual([255, 0, 0]);
    expect(rgb(50)).toEqual([0, 255, 0]);
    expect(rgb(80)).toEqual([255, 255, 255]);
    expect(texture.minFilter).toBe(NearestFilter);
    expect(texture.magFilter).toBe(NearestFilter);
    expect(texture.generateMipmaps).toBe(false);
    texture.dispose();
  });

  it('rejects mush-prone or ambiguous ramp contracts', () => {
    expect(() => validateCelRampConfig({
      bands: ['#000', '#777', '#fff'],
      thresholds: [0.6, 0.4],
    })).toThrow(/increasing/);
    expect(() => validateCelRampConfig({
      bands: ['#000', '#777', '#fff'],
      thresholds: [0.5],
    })).toThrow(/one fewer threshold/);
    expect(() => validateCelRampConfig({
      bands: ['#000', '#777', '#fff'],
      thresholds: [0, 0.7],
    })).toThrow(/strictly between/);
  });

  it('generates a nearest-filtered, hard-banded fake matcap', () => {
    const texture = createGraphicMatcapTexture({ resolution: 16 });
    const { data } = texture.image;
    if (!(data instanceof Uint8Array)) throw new Error('Expected byte-backed matcap texture.');
    const values = new Set<number>();
    for (let offset = 0; offset < data.length; offset += 4) values.add(data[offset] ?? -1);
    expect(values.size).toBeGreaterThanOrEqual(3);
    expect(values.size).toBeLessThanOrEqual(4);
    expect(texture.minFilter).toBe(NearestFilter);
    texture.dispose();
  });
});

describe('cel material contracts', () => {
  it('keeps diffuse, specular, reflection and rim treatments explicitly non-PBR', () => {
    const material = new CelMaterial({ palette: CEL_PALETTES.player });
    expect(material.diffuseThresholds).toEqual([0.16, 0.46, 0.74]);
    expect(material.fragmentShader).toContain('step(uSpecularCutoff');
    expect(material.fragmentShader).toContain('step(uRimCutoff');
    expect(material.fragmentShader).toContain('texture2D(uMatcap');
    expect(material.fragmentShader).not.toMatch(/samplerCube|roughness|metalness/i);
    material.setPalette(CEL_PALETTES.rivalTeal);
    expect(material.palette).toBe(CEL_PALETTES.rivalTeal);
    material.dispose();
  });

  it('exposes a displacement-compatible MRT material contract', () => {
    const material = new CelPrepassMaterial({
      vertexPreamble: 'float terrainHeight(vec2 p) { return p.x; }',
      vertexTransform: 'transformed.y += 1.0;',
      normalTransform: 'objectNormal = normalize(objectNormal);',
      uniforms: { uTerrainTime: { value: 0 } },
    });
    expect(material.glslVersion).toBe(GLSL3);
    expect(material.vertexShader).toContain('float terrainHeight');
    expect(material.vertexShader).toContain('transformed.y += 1.0;');
    expect(material.fragmentShader).toContain('layout(location = 1) out vec4 outDepthMask');
    material.dispose();
    expect(() => new CelPrepassMaterial({
      uniforms: { uCameraNear: { value: 1 } },
    })).toThrow(/reserved/);
  });
});

describe('inverted hull outline contracts', () => {
  it('converts CSS width to device pixels while retaining a projected viewport', () => {
    const material = new InvertedHullMaterial({ widthPx: 2, pixelRatio: 2 });
    expect(material.uniforms['uLineWidth']?.value).toBe(4);
    material.setViewport(800, 450, 1.5);
    expect(material.uniforms['uLineWidth']?.value).toBe(3);
    expect(material.uniforms['uViewport']?.value.toArray()).toEqual([1200, 675]);
    expect(material.side).toBe(BackSide);
    expect(material.depthWrite).toBe(false);
    material.dispose();
  });

  it('shares instancing state and marks only the source for Sobel suppression', () => {
    const geometry = new BoxGeometry();
    const beauty = new MeshBasicMaterial();
    const source = new InstancedMesh(geometry, beauty, 2);
    const handle = createInvertedHullOutline(source);

    expect(handle.mesh).toBeInstanceOf(InstancedMesh);
    expect((handle.mesh as InstancedMesh).instanceMatrix).toBe(source.instanceMatrix);
    expect(source.userData[CEL_HULL_OUTLINE_USER_DATA_KEY]).toBe(true);
    const outlineNormal = geometry.getAttribute(CEL_OUTLINE_NORMAL_ATTRIBUTE);
    const position = geometry.getAttribute('position');
    expect(outlineNormal).toBeDefined();
    const positiveCornerNormals: number[][] = [];
    for (let index = 0; index < position.count; index += 1) {
      if (position.getX(index) === 0.5 && position.getY(index) === 0.5 && position.getZ(index) === 0.5) {
        positiveCornerNormals.push([
          outlineNormal?.getX(index) ?? 0,
          outlineNormal?.getY(index) ?? 0,
          outlineNormal?.getZ(index) ?? 0,
        ]);
      }
    }
    expect(positiveCornerNormals.length).toBeGreaterThan(1);
    for (const normal of positiveCornerNormals) {
      expect(normal[0]).toBeCloseTo(1 / Math.sqrt(3), 5);
      expect(normal[1]).toBeCloseTo(1 / Math.sqrt(3), 5);
      expect(normal[2]).toBeCloseTo(1 / Math.sqrt(3), 5);
    }
    expect(handle.mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY]).toBe(true);
    expect(source.children).toContain(handle.mesh);

    handle.dispose();
    expect(source.userData[CEL_HULL_OUTLINE_USER_DATA_KEY]).toBeUndefined();
    expect(source.children).not.toContain(handle.mesh);
    geometry.dispose();
    beauty.dispose();
  });

  it('generates normals for procedural geometry before attaching the hull', () => {
    const geometry = new BoxGeometry().toNonIndexed();
    geometry.deleteAttribute('normal');
    const source = new Mesh(geometry, new MeshBasicMaterial());
    const handle = createInvertedHullOutline(source);
    expect(geometry.getAttribute('normal')).toBeDefined();
    handle.dispose();
    geometry.dispose();
    (source.material as MeshBasicMaterial).dispose();
  });

  it('shares an in-code pilot skeleton with its outline hull', () => {
    const geometry = new BoxGeometry();
    const beauty = new MeshBasicMaterial();
    const source = new SkinnedMesh(geometry, beauty);
    const hip = new Bone();
    const shoulder = new Bone();
    hip.add(shoulder);
    source.add(hip);
    source.bind(new Skeleton([hip, shoulder]));
    const handle = createInvertedHullOutline(source);

    expect(handle.mesh).toBeInstanceOf(SkinnedMesh);
    expect((handle.mesh as SkinnedMesh).skeleton).toBe(source.skeleton);
    handle.dispose();
    geometry.dispose();
    beauty.dispose();
  });

  it('does not dispose a shared hull material owned by the caller', () => {
    const shared = new InvertedHullMaterial();
    let disposeEvents = 0;
    shared.addEventListener('dispose', () => { disposeEvents += 1; });
    const source = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    const handle = createInvertedHullOutline(source, { material: shared });
    handle.dispose();
    expect(disposeEvents).toBe(0);
    shared.dispose();
    expect(disposeEvents).toBe(1);
    source.geometry.dispose();
    (source.material as MeshBasicMaterial).dispose();
  });
});
