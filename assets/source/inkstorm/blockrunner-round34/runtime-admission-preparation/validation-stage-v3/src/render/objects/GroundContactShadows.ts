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

/** Three softly feathered contact footprints in one geometry and one draw. */
function createPodContactGeometry(): BufferGeometry {
  const segments = 16;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const appendEllipse = (
    centerX: number,
    centerZ: number,
    radiusX: number,
    radiusZ: number,
    shear: number,
  ): void => {
    const center = positions.length / 3;
    positions.push(centerX, 0, centerZ); colors.push(1, 1, 1, 1);
    for (let ring = 0; ring < 2; ring++) {
      const radius = ring === 0 ? .68 : 1.2;
      for (let segment = 0; segment <= segments; segment++) {
        const angle = segment / segments * Math.PI * 2;
        const z = Math.sin(angle) * radiusZ * radius;
        positions.push(centerX + Math.cos(angle) * radiusX * radius + z * shear, 0, centerZ + z);
        colors.push(1, 1, 1, ring === 0 ? .68 : 0);
      }
    }
    for (let segment = 0; segment < segments; segment++) {
      const inner = center + segment + 1, outer = inner + segments + 1;
      indices.push(center, inner + 1, inner);
      indices.push(inner, inner + 1, outer, inner + 1, outer + 1, outer);
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
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 4));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/** One instanced contact shape per racer; feathered edges soften hover separation. */
export class GroundContactShadows {
  readonly mesh: InstancedMesh;

  constructor(maxRacers = 4) {
    const material = new MeshBasicMaterial({
      name: 'Feathered repulsorlift contact shadow',
      vertexColors: true,
      color: new Color('#4d2432'),
      transparent: true,
      opacity: 0.32,
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

  /** The actual player depth pass replaces only its matching fallback instance. */
  hide(racerIndex: number): void {
    matrix.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(racerIndex, matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.dispose();
    this.mesh.geometry.dispose();
    const materials = Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material];
    for (const material of materials) material.dispose();
  }
}
