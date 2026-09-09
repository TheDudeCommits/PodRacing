import { describe, expect, it } from 'vitest';
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import { PodracerView, type RacerVehicleClass } from '../../src/render/objects/PodracerView';

function geometryStats(view: PodracerView) {
  let draws = 0;
  let triangles = 0;
  const solidBounds = new Box3();
  view.updateMatrixWorld(true);
  view.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    draws++;
    triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (!material?.transparent) solidBounds.union(new Box3().setFromObject(object));
  });
  return { draws, triangles, solidBounds };
}

// Recorded before the hero form revision, without the separately owned pilot.
// The visual redesign must fit those existing solid envelopes; it does not
// silently enlarge the apparent vehicle while physics retains the old shape.
const originalEnvelopes: Record<RacerVehicleClass, readonly [number, number, number, number, number, number]> = {
  podracer: [-10.47204, -.63, -8.60001, 10.47204, 4.59742, 15.17501],
  landspeeder: [-6.12553, -.78610, -5.39201, 6.12553, 3.37049, 12.94201],
  'speeder-bike': [-2.61818, .08265, -8.22201, 2.61818, 2.95385, 14.37751],
  'skim-speeder': [-8.29792, -.48441, -5.82801, 7.73010, 3.10919, 13.42051],
};

describe('hero craft geometry budget', () => {
  it('keeps all four solid silhouettes inside their previous visual envelopes', () => {
    const view = new PodracerView();
    for (const kind of Object.keys(originalEnvelopes) as RacerVehicleClass[]) {
      view.setVehicleClass(kind);
      const { solidBounds } = geometryStats(view);
      const envelope = originalEnvelopes[kind];
      for (let axis = 0; axis < 3; axis++) {
        expect(solidBounds.min.getComponent(axis)).toBeGreaterThanOrEqual(envelope[axis]!);
        expect(solidBounds.max.getComponent(axis)).toBeLessThanOrEqual(envelope[axis + 3]!);
      }
    }
    view.dispose();
  });

  it('batches the shaped shells and every hose cuff without adding beauty submissions', () => {
    const view = new PodracerView();
    for (const kind of Object.keys(originalEnvelopes) as RacerVehicleClass[]) {
      view.setVehicleClass(kind);
      const { draws, triangles } = geometryStats(view);
      // Before the change: pod 22 submissions, every other class 27. Triangle
      // headroom pays for real interrupted shells and the curved conduit profile.
      expect(draws).toBeLessThanOrEqual(kind === 'podracer' ? 22 : 27);
      expect(triangles).toBeLessThanOrEqual(kind === 'podracer' ? 15_000 : 11_000);
    }
    view.dispose();
  });

  it('recesses the light source behind an open nozzle rather than sealing its lip with a cyan disc', () => {
    const view = new PodracerView();
    view.updateMatrixWorld(true);
    for (const side of [-1, 1]) {
      const engine = view.getObjectByName(side < 0 ? 'engine-left' : 'engine-right')!;
      const ray = new Raycaster(new Vector3(side * 8.4, 1.25, -5), new Vector3(0, 0, 1));
      const solidHits = ray.intersectObject(engine, true).filter(hit => {
        const mesh = hit.object as Mesh;
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        return !material?.transparent;
      });
      expect(solidHits.length).toBeGreaterThan(0);
      // The blue return lip is at world Z -0.86. Its centre must remain open,
      // with the first opaque hit at least 0.7m deeper in the pressure chamber.
      expect(solidHits[0]!.point.z).toBeGreaterThan(-.16);
      const firstMaterial = (solidHits[0]!.object as Mesh).material;
      expect(Array.isArray(firstMaterial) ? firstMaterial[0]!.name : firstMaterial.name).toBe('Recessed engine core');
    }
    view.dispose();
  });

  it('keeps render geometry finite through every class and silhouette transition', () => {
    const view = new PodracerView();
    const anchor = view.pilotAnchor;
    view.createCelPrepassProxy();
    for (const kind of Object.keys(originalEnvelopes) as RacerVehicleClass[]) {
      view.setVehicleClass(kind);
      for (const lod of ['full', 'simplified', 'silhouette', 'full'] as const) {
        view.setLodMode(lod);
        view.traverseVisible((object) => {
          if (!(object instanceof Mesh)) return;
          for (const attribute of ['position', 'normal']) {
            const values = object.geometry.getAttribute(attribute).array;
            expect(values.every(Number.isFinite)).toBe(true);
          }
        });
      }
      expect(view.pilotAnchor).toBe(anchor);
      expect(anchor.parent).toBe(view.getObjectByName('cockpit'));
    }
    view.dispose();
  });
});
