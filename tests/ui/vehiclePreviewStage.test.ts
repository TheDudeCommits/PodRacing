import { afterEach, describe, expect, it, vi } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene, Vector3, type WebGLRenderer } from 'three';
import { InkstormRacerShadow } from '../../src/render/inkstorm/InkstormRacerShadow';
import type { RacerPresentation } from '../../src/render/vehicles/RacerPresentation';
import { saltDuskUniforms } from '../../src/render/saltDusk/SaltDuskAssets';
import { VehiclePreviewStage } from '../../src/ui/VehiclePreviewStage';

afterEach(() => vi.restoreAllMocks());

describe('preview salt stage ownership', () => {
  it('fits below the supplied pod bounds without changing them or binding shadow uniforms to the scene', () => {
    // Substitute only GPU submission; real floor, bounds and shadow ownership run.
    const draw = vi.spyOn(InkstormRacerShadow.prototype, 'update').mockReturnValue(true);
    const bind = vi.spyOn(InkstormRacerShadow.prototype, 'bindReceivers');
    const refresh = vi.spyOn(InkstormRacerShadow.prototype, 'refreshCasters');
    const stage = new VehiclePreviewStage();
    const vehicle = Object.assign(new Group(), { geometryRevision: 1 });
    const hull = new Mesh(new BoxGeometry(8, 4, 24), new MeshBasicMaterial());
    vehicle.add(hull);
    const scene = new Scene(); scene.add(vehicle, stage.mesh);
    const bounds = new Box3(new Vector3(-4, -2, -12), new Vector3(4, 2, 12));
    const before = bounds.clone();
    const renderer = { getDrawingBufferSize: (target: { set(x: number, y: number): void }) => target.set(800, 450) } as unknown as WebGLRenderer;
    try {
      stage.update(renderer, vehicle as unknown as RacerPresentation, bounds);
      expect(bounds).toEqual(before);
      expect(stage.mesh.parent).toBe(scene);
      expect(vehicle.children).toEqual([hull]);
      expect(stage.mesh.position.y).toBeLessThan(bounds.min.y);
      expect(stage.mesh.scale.x).toBeGreaterThan(8);
      expect(stage.mesh.scale.y).toBeGreaterThan(24);
      expect(stage.mesh.material.uniforms.uStageViewport!.value.toArray()).toEqual([800, 450]);
      expect(draw).toHaveBeenLastCalledWith(renderer, vehicle, undefined, stage.mesh.position.y);
      expect(bind).not.toHaveBeenCalled();
      expect(stage.mesh.material.uniforms.uDuskGround).toBe(saltDuskUniforms().uDuskGround);
      stage.update(renderer, vehicle as unknown as RacerPresentation, bounds);
      expect(refresh).toHaveBeenCalledOnce();
      vehicle.geometryRevision++;
      stage.update(renderer, vehicle as unknown as RacerPresentation, bounds);
      expect(refresh).toHaveBeenCalledTimes(2);
      expect(draw).toHaveBeenCalledTimes(3);
      const disposeGeometry = vi.spyOn(stage.mesh.geometry, 'dispose');
      const disposeMaterial = vi.spyOn(stage.mesh.material, 'dispose');
      const disposeShadow = vi.spyOn(InkstormRacerShadow.prototype, 'dispose');
      stage.dispose(); stage.dispose();
      expect(disposeGeometry).toHaveBeenCalledOnce();
      expect(disposeMaterial).toHaveBeenCalledOnce();
      expect(disposeShadow).toHaveBeenCalledOnce();
      expect(stage.mesh.parent).toBeNull();
      stage.update(renderer, vehicle as unknown as RacerPresentation, bounds);
      expect(draw).toHaveBeenCalledTimes(3);
    } finally { stage.dispose(); hull.geometry.dispose(); hull.material.dispose(); }
  });
});
