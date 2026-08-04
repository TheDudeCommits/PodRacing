import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';

const position = new Vector3();
const rotation = new Quaternion();
const scale = new Vector3();
const matrix = new Matrix4();
const euler = new Euler(0, 0, 0, 'YXZ');

/** Three separated hard-edged footprints in one geometry and one draw. */
function createPodContactGeometry(): BufferGeometry {
  const segments = 16;
  const positions: number[] = [];
  const indices: number[] = [];

  const appendEllipse = (
    centerX: number,
    centerZ: number,
    radiusX: number,
    radiusZ: number,
    shear: number,
  ): void => {
    const center = positions.length / 3;
    positions.push(centerX, 0, centerZ);
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      const z = Math.sin(angle) * radiusZ;
      positions.push(
        centerX + Math.cos(angle) * radiusX + z * shear,
        0,
        centerZ + z,
      );
    }
    for (let segment = 0; segment < segments; segment += 1) {
      // Counter-clockwise from above: the ground-facing silhouette remains
      // visible with the material's default front-side culling.
      indices.push(center, center + segment + 2, center + segment + 1);
    }
  };

  // Engine pods sit forward and wide; the smaller cockpit footprint trails
  // behind. Gaps between lobes keep clustered racers from merging into one
  // amorphous maroon puddle.
  appendEllipse(-7.1, 2.7, 2.75, 5.8, -0.04);
  appendEllipse(7.1, 2.7, 2.75, 5.8, 0.04);
  appendEllipse(0, -4.7, 2.65, 4.35, 0);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** One hard-edged, instanced anime contact shape per racer. */
export class GroundContactShadows {
  readonly mesh: InstancedMesh;

  constructor(maxRacers = 4) {
    const material = new MeshBasicMaterial({
      name: 'Graphic repulsorlift contact shadow',
      color: new Color('#4d2432'),
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new InstancedMesh(createPodContactGeometry(), material, maxRacers);
    this.mesh.name = 'Repulsorlift contact shadows';
    this.mesh.count = maxRacers;
    this.mesh.renderOrder = 5;
    // Instance transforms travel kilometres; Three's lazily cached bounds do
    // not follow those updates. One four-instance draw is cheaper and safer
    // than recomputing a bounding sphere every frame.
    this.mesh.frustumCulled = false;
  }

  update(
    racerIndex: number,
    x: number,
    groundY: number,
    z: number,
    yaw: number,
    clearance: number,
    normalizedSpeed: number,
  ): void {
    const contact = Math.max(0.04, Math.min(1, 1 - Math.max(0, clearance - 1.2) / 10));
    const contactScale = 0.18 + Math.pow(contact, 0.6) * 0.82;
    const lengthStretch = 1 + Math.max(0, Math.min(1, normalizedSpeed)) * 0.08;
    position.set(x, groundY + 0.09, z);
    euler.set(0, yaw, 0, 'YXZ');
    rotation.setFromEuler(euler);
    scale.set(contactScale, 1, contactScale * lengthStretch);
    matrix.compose(position, rotation, scale);
    this.mesh.setMatrixAt(racerIndex, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const materials = Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material];
    for (const material of materials) material.dispose();
  }
}
