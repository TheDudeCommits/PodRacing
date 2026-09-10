import { Box3, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial,
  PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { VehicleCardPreviewRenderer } from '../../src/ui/VehicleCardPreview';

// Real packaged positions and node transforms; no image/texture decoding or GPU.
const fileModule: string = 'node:fs';
const { readFileSync } = await import(fileModule);
const bytes = readFileSync(new URL('../../public/assets/inkstorm/vehicles/polwo-hero-v1.glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
const binaryStart = 28 + jsonLength;
const material = new MeshBasicMaterial();
const geometries = gltf.meshes.map((mesh: any) => mesh.primitives.map((primitive: any) => {
  const accessor = gltf.accessors[primitive.attributes.POSITION];
  const view = gltf.bufferViews[accessor.bufferView];
  const offset = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? 12;
  expect(accessor.componentType).toBe(5126);
  const positions = new Float32Array(accessor.count * 3);
  for (let vertex = 0; vertex < accessor.count; vertex++) {
    for (let axis = 0; axis < 3; axis++) positions[vertex * 3 + axis] = bytes.readFloatLE(offset + vertex * stride + axis * 4);
  }
  return new BufferGeometry().setAttribute('position', new Float32BufferAttribute(positions, 3));
}));

function frame(appearance: string, aspect: number, angle: number) {
  const vehicle = Object.assign(new Group(), {
    activeAppearanceId: appearance, racerIndex: 0,
    syncVisibility() {},
    update(this: Group, pose: { pitch: number; yaw: number; roll: number }) {
      this.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
    },
  });
  const nodes = gltf.nodes.map((node: any) => {
    const group = new Group();
    if (node.matrix) { group.matrix.fromArray(node.matrix); group.matrix.decompose(group.position, group.quaternion, group.scale); }
    if (node.translation) group.position.fromArray(node.translation);
    if (node.rotation) group.quaternion.fromArray(node.rotation);
    if (node.scale) group.scale.fromArray(node.scale);
    if (node.mesh !== undefined) for (const geometry of geometries[node.mesh]) group.add(new Mesh(geometry, material));
    return group;
  });
  gltf.nodes.forEach((node: any, index: number) => {
    for (const child of node.children ?? []) nodes[index].add(nodes[child]);
  });
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) vehicle.add(nodes[index]);
  const scene = new Scene(); scene.add(vehicle);
  const camera = new PerspectiveCamera(30, aspect, .1, 500);
  const resources = { scene, camera, vehicles: new Map([['podracer', vehicle]]), pilots: new Map(),
    outlineMaterial: { setViewport() {} },
    renderer: { setSize() {}, clear() {}, render() { camera.updateMatrixWorld(true); },
      domElement: { toDataURL: () => 'cpu-framing-only' } } };
  // Exercise the actual render framing path; only the renderer is substituted.
  const previews = Object.create(VehicleCardPreviewRenderer.prototype) as any;
  previews.renderVehicle(resources, 'podracer', 700, 700 / aspect, angle);
  const projected = new Box3();
  const vertex = new Vector3();
  vehicle.traverseVisible(object => {
    if (!(object instanceof Mesh)) return;
    const position = object.geometry.getAttribute('position');
    for (let index = 0; index < position.count; index++) {
      vertex.fromBufferAttribute(position, index).applyMatrix4(object.matrixWorld).project(camera);
      projected.expandByPoint(vertex);
    }
  });
  return { projected, direction: camera.getWorldDirection(new Vector3()).negate() };
}

describe('Polwo garage framing', () => {
  it('uses the wide host to show the actual long silhouette without enlarging materials or geometry', () => {
    const before = frame('procedural', 3.5, 0).projected;
    const after = frame('polwo', 3.5, 0).projected;
    const beforeWidth = (before.max.x - before.min.x) / 2;
    const afterWidth = (after.max.x - after.min.x) / 2;
    expect(beforeWidth).toBeLessThan(.5);
    expect(afterWidth).toBeGreaterThan(.85);
    expect(afterWidth / beforeWidth).toBeGreaterThan(1.75);
  });

  it('contains every packaged vertex through all twelve inspection angles on tall, square and wide hosts', () => {
    for (const aspect of [.55, 1, 3.5]) {
      for (let angle = 0; angle < 360; angle += 30) {
        const { projected } = frame('polwo', aspect, angle);
        expect(projected.min.x).toBeGreaterThan(-.94);
        expect(projected.max.x).toBeLessThan(.94);
        expect(projected.min.y).toBeGreaterThan(-.82);
        expect(projected.max.y).toBeLessThan(.82);
        expect(projected.min.z).toBeGreaterThan(-1);
        expect(projected.max.z).toBeLessThan(1);
      }
    }
  });

  it('retains the shared view for Classic and Sebulba, including inspection rotation', () => {
    for (const appearance of ['procedural', 'sebulba']) {
      const direction = frame(appearance, 2, 90).direction;
      const expectedDirection = new Vector3(.7, .38, -1).normalize()
        .applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 2);
      expect(direction.distanceTo(expectedDirection)).toBeLessThan(1e-12);
    }
  });
});
