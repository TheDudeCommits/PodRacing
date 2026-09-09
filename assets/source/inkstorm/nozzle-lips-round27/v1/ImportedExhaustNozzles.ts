import { Float32BufferAttribute, InstancedMesh, LatheGeometry, Matrix4, Vector2, Vector3, type Object3D } from 'three';
import { CelMaterial } from '../materials/CelMaterial';
import { CEL_PALETTES } from '../materials/celPalette';

/** A closed metal lip and recessed throat around the existing authored hot core.
 * Local +Z points into the engine; zero remains the original exhaust anchor. */
export function createImportedNozzleGeometry(): LatheGeometry {
  const profile = [
    [.90, .14], [.95, -.11], [.88, -.27], [.70, -.27],
    [.64, -.16], [.44, -.02], [.44, .08], [.72, .18], [.90, .14],
  ].reverse().map(([radius, depth]) => new Vector2(radius!, depth!));
  const geometry = new LatheGeometry(profile, 24);
  geometry.rotateX(Math.PI / 2);
  const position = geometry.getAttribute('position');
  const colors: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const radius = Math.hypot(position.getX(i), position.getY(i));
    // The throat is heat-darkened metal; the broad mouth bevel catches the sun.
    const value = radius < .66 ? .25 : radius < .74 ? .55 : 1;
    colors.push(value, value, value);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  return geometry;
}

/** Both nozzles share one geometry, material and draw submission per racer. */
export class ImportedExhaustNozzles extends InstancedMesh<LatheGeometry, CelMaterial> {
  private released = false;
  constructor() {
    super(createImportedNozzleGeometry(), new CelMaterial({
      name: 'Inkstorm heat-darkened nozzle metal',
      palette: { ...CEL_PALETTES.machinery, diffuseBands: ['#07101b', '#172633', '#394650', '#9b8c72'] },
      lightDirection: new Vector3(-.42, .76, -.5).normalize(),
      vertexColors: true, specularStrength: .12, rimStrength: .025, reflectionStrength: .025, wear: .18,
    }), 2);
    this.name = 'imported-engine-nozzle-lips';
    // Small rigid attachments receive the ordinary MRT pass. The existing body
    // shadow budget remains body-only; these two sub-metre rims add no shadow draw.
    this.userData.inkstormRacerShadowExclude = true;
    this.visible = false;
  }

  setAnchors(left?: Object3D, right?: Object3D): void {
    this.visible = Boolean(left && right);
    if (!left || !right) return;
    const matrix = new Matrix4(), unitScale = new Vector3(1, 1, 1);
    for (const [index, anchor] of [left, right].entries()) {
      matrix.compose(anchor.position, anchor.quaternion, unitScale);
      this.setMatrixAt(index, matrix);
    }
    this.instanceMatrix.needsUpdate = true;
    this.computeBoundingBox();
    this.computeBoundingSphere();
  }

  override dispose(): void {
    if (this.released) return;
    this.released = true;
    this.geometry.dispose();
    this.material.dispose();
    super.dispose();
  }
}
