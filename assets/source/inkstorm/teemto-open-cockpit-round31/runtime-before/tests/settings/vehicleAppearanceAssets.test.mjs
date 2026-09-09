import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  TEEMTO_ART_DEFINITIONS,
  TEEMTO_BODY_GROUP_NODES,
  TEEMTO_BODY_NODES,
  SEBULBA_ART_DEFINITIONS,
  SEBULBA_BODY_NODES,
} from '../../src/game/vehicleAppearance';

// Node-only asset verification stays outside the browser TypeScript compilation.
describe('published vehicle appearance assets', () => {
  it.each(['hero', 'rival'])('matches the %s body and embedded driver contract using only its JSON header', (lod) => {
    const definition = TEEMTO_ART_DEFINITIONS[lod];
    const bytes = readFileSync(new URL(`../../public${definition.url}`, import.meta.url));
    expect(bytes.readUInt32LE(0)).toBe(0x46546c67);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const nodes = new Set(gltf.nodes.map((node) => node.name));
    for (const name of [...Object.values(TEEMTO_BODY_NODES), ...Object.values(TEEMTO_BODY_GROUP_NODES)]) {
      expect(nodes.has(name), name).toBe(true);
    }
    const pilotNodes = gltf.nodes.filter((node) => node.mesh !== undefined && node.name.startsWith(definition.embeddedPilotNodePrefix));
    expect(pilotNodes).toHaveLength(lod === 'hero' ? 6 : 4);
    const triangles = gltf.meshes.reduce((sum, mesh) => sum + mesh.primitives.reduce((n, primitive) => n + gltf.accessors[primitive.indices].count / 3, 0), 0);
    expect(triangles).toBe(lod === 'hero' ? 59_324 : 26_180);
    if (lod === 'hero') {
      expect(createHash('sha256').update(bytes).digest('hex')).toBe('f3eb56a54b7dbb8f4a26263fb26f1f88b188db6bcc409910a3561ae939f1eef1');
      for (const materialName of Object.keys(definition.surfaceStyles ?? {})) {
        expect(gltf.materials.some(material => material.name === materialName), materialName).toBe(true);
      }
      const pilotMaterials = new Set();
      for (const node of pilotNodes) {
        const primitive = gltf.meshes[node.mesh].primitives[0];
        const material = gltf.materials[primitive.material];
        expect(primitive.attributes.TANGENT).toBeTypeOf('number');
        expect(material.normalTexture?.index).toBeTypeOf('number');
        expect(material.pbrMetallicRoughness?.metallicRoughnessTexture?.index).toBeTypeOf('number');
        pilotMaterials.add(primitive.material);
      }
      expect(pilotMaterials.size).toBe(6);
    }
    expect(definition.attachments.pilot.position).toEqual([0, 2.2, -5.2]);
    expect(definition.attachments.exhaustLeft.position).toEqual([-4.075, 0.178, 5.638]);
    expect(definition.attachments.couplingRight.position).toEqual([1.325, 3.238, 18.941]);
  });

  it.each(['hero', 'rival'])('admits the published Sebulba %s with its exact static body, pilot and texture contract', (lod) => {
    const definition = SEBULBA_ART_DEFINITIONS[lod];
    const bytes = readFileSync(new URL(`../../public${definition.url}`, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(lod === 'hero'
      ? 'f4b31d9260e3272ec394161dea236c874d551b469f18a1d794ec85c05b625b7e'
      : '22e1adf8e3dd6562ce143132fb4e82cdb56e62696d9894804ca07b4a3552d951');
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const nodes = new Set(gltf.nodes.map(node => node.name));
    for (const name of Object.values(SEBULBA_BODY_NODES)) expect(nodes.has(name), name).toBe(true);
    expect(gltf.nodes.filter(node => node.mesh !== undefined && node.name.startsWith(definition.embeddedPilotNodePrefix))).toHaveLength(4);
    expect(gltf.meshes).toHaveLength(6);
    expect(gltf.animations ?? []).toHaveLength(0);
    expect(gltf.skins ?? []).toHaveLength(0);
    let triangles = 0;
    for (const mesh of gltf.meshes) {
      expect(mesh.primitives).toHaveLength(1);
      const primitive = mesh.primitives[0], material = gltf.materials[primitive.material];
      expect(primitive.attributes.POSITION).toBeTypeOf('number');
      expect(primitive.attributes.NORMAL).toBeTypeOf('number');
      expect(material.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      const baseMap = material.pbrMetallicRoughness?.baseColorTexture;
      if (baseMap) expect(primitive.attributes[`TEXCOORD_${baseMap.texCoord ?? 0}`]).toBeTypeOf('number');
      triangles += gltf.accessors[primitive.indices].count / 3;
    }
    expect(triangles).toBe(lod === 'hero' ? 54_522 : 24_559);
    expect(definition.attachments.pilot.position).toEqual([0, 1.366, -5.2]);
    expect(definition.attachments.exhaustLeft.position).toEqual([-4.426030636, 3.854108810, 3.669570684]);
    expect(definition.attachments.couplingRight.position).toEqual([2.767776728, 3.899995565, 10.019995689]);
  });
});
