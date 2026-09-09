import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BLOCKRUNNER_ART_DEFINITIONS } from '../../src/game/vehicleAppearance';

// Checked-in fixture pins actual final public bytes; ordinary npm verify needs no external environment.
const receipt = JSON.parse(readFileSync(new URL('../fixtures/blockrunnerPackage.json', import.meta.url), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function imageSize(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Expected embedded PNG/WebP.');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (type === 'VP8X') return [1 + bytes.readUIntLE(start + 4, 3), 1 + bytes.readUIntLE(start + 7, 3)];
    if (type === 'VP8 ') return [bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff];
    if (type === 'VP8L') { const value = bytes.readUInt32LE(start + 1); return [(value & 0x3fff) + 1, ((value >>> 14) & 0x3fff) + 1]; }
    offset = start + length + (length % 2);
  }
  throw new Error('Missing WebP dimensions.');
}

describe('final Blockrunner package bytes and restrictive asset contract', () => {
  it.each(['hero', 'rival'])('verifies real %s bytes, five submissions and owner-specific atlas sizes', lod => {
    const packageReceipt = receipt.packages?.[lod];
    expect(packageReceipt).toBeDefined();
    expect(packageReceipt.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(packageReceipt.publicUrl).toBe(BLOCKRUNNER_ART_DEFINITIONS[lod].url);
    const bytes = readFileSync(new URL(`../../public${BLOCKRUNNER_ART_DEFINITIONS[lod].url}`, import.meta.url));
    expect(bytes.length).toBe(packageReceipt.bytes); expect(sha(bytes)).toBe(packageReceipt.sha256);
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67); expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length); expect(bytes.readUInt32LE(16)).toBe(0x4e4f534a);
    const length = bytes.readUInt32LE(12), gltf = JSON.parse(bytes.toString('utf8', 20, 20 + length));
    expect(bytes.readUInt32LE(24 + length)).toBe(0x004e4942);
    const binary = bytes.subarray(28 + length), meshNodes = gltf.nodes.filter(node => node.mesh !== undefined);
    const expectedNames = ['blockrunner-body', ...['suit', 'helmet', 'visor', 'gloves'].map(role => `blockrunner-pilot-${role}`)];
    expect(meshNodes.map(node => node.name).toSorted()).toEqual(expectedNames.toSorted());
    expect(gltf.meshes).toHaveLength(5); expect(gltf.materials).toHaveLength(5); expect(gltf.images).toHaveLength(4);
    expect(gltf.skins ?? []).toHaveLength(0); expect(gltf.animations ?? []).toHaveLength(0);
    for (const node of gltf.nodes) {
      expect(node.translation ?? [0, 0, 0]).toEqual([0, 0, 0]); expect(node.rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
      expect(node.scale ?? [1, 1, 1]).toEqual([1, 1, 1]);
      if (node.matrix) expect(node.matrix).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    }
    const imageIndex = textureIndex => {
      const texture = gltf.textures[textureIndex]; return texture.extensions?.EXT_texture_webp?.source ?? texture.source;
    };
    const sizes = gltf.images.map(image => {
      expect(image.uri).toBeUndefined(); const view = gltf.bufferViews[image.bufferView];
      return imageSize(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
    });
    let bodyTriangles = 0, pilotTriangles = 0;
    const baseImages = { body: new Set(), pilot: new Set() }, roughImages = { body: new Set(), pilot: new Set() };
    for (const node of meshNodes) {
      const primitives = gltf.meshes[node.mesh].primitives; expect(primitives).toHaveLength(1);
      const primitive = primitives[0], material = gltf.materials[primitive.material], body = node.name === 'blockrunner-body';
      const role = body ? 'body' : `pilot ${node.name.slice('blockrunner-pilot-'.length)}`;
      expect(material.name).toBe(`Blockrunner Inkstorm ${role} atlas v1`);
      expect((primitive.mode ?? 4)).toBe(4); expect(material.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      expect(primitive.targets).toBeUndefined(); expect(material.normalTexture).toBeUndefined();
      expect(Object.keys(primitive.attributes).filter(name => name.startsWith('COLOR_'))).toEqual([]);
      const positions = gltf.accessors[primitive.attributes.POSITION], normals = gltf.accessors[primitive.attributes.NORMAL];
      expect(normals.count).toBe(positions.count); expect(normals.type).toBe('VEC3'); expect(normals.componentType).toBe(5126);
      const triangles = gltf.accessors[primitive.indices].count / 3; expect(Number.isInteger(triangles)).toBe(true);
      if (body) bodyTriangles += triangles; else pilotTriangles += triangles;
      const pbr = material.pbrMetallicRoughness;
      expect(pbr.baseColorFactor ?? [1, 1, 1, 1]).toEqual([1, 1, 1, 1]); expect(pbr.roughnessFactor ?? 1).toBe(1);
      for (const [kind, binding, expectedSize, owners] of [
        ['base', pbr.baseColorTexture, lod === 'hero' ? 1024 : 512, baseImages],
        ['roughness', pbr.metallicRoughnessTexture, lod === 'hero' ? 512 : 256, roughImages],
      ]) {
        expect(binding, kind).toBeDefined(); expect(primitive.attributes[`TEXCOORD_${binding.texCoord ?? 0}`]).toBeTypeOf('number');
        const index = imageIndex(binding.index); expect(sizes[index]).toEqual([expectedSize, expectedSize]); owners[body ? 'body' : 'pilot'].add(index);
      }
    }
    for (const owners of [baseImages, roughImages]) {
      expect(owners.body.size).toBe(1); expect(owners.pilot.size).toBe(1);
      expect([...owners.body][0]).not.toBe([...owners.pilot][0]);
    }
    expect(new Set([...baseImages.body, ...baseImages.pilot, ...roughImages.body, ...roughImages.pilot]).size).toBe(4);
    expect(pilotTriangles).toBe(4128); expect(bodyTriangles).toBe(packageReceipt.bodyTriangles);
    expect(bodyTriangles + pilotTriangles).toBe(packageReceipt.triangles);
    if (lod === 'hero') expect(bodyTriangles).toBe(39900);
    else expect(bodyTriangles + pilotTriangles).toBeLessThanOrEqual(30000);
    expect(BLOCKRUNNER_ART_DEFINITIONS[lod].attachments.couplingLeft).toBeUndefined();
    expect(BLOCKRUNNER_ART_DEFINITIONS[lod].attachments.couplingRight).toBeUndefined();
  });
});
