import { describe, expect, it } from 'vitest';
import { Mesh } from 'three';

import { CEL_POST_EXCLUDE_USER_DATA_KEY } from '../../src/render/materials';
import { PodracerView } from '../../src/render/objects/PodracerView';
import { PilotView } from '../../src/render/pilots';

describe('podracer MRT prepass proxy', () => {
  it('bakes opaque articulated parts into one hidden beauty mesh', () => {
    const racer = new PodracerView(undefined, 1);
    const pilot = new PilotView({ racerIndex: 1, detail: 'distant' });
    racer.pilotAnchor.add(pilot);

    const opaqueSources: Mesh[] = [];
    racer.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (materials.some((material) => material.transparent || !material.depthWrite)) return;
      if (object.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] === true) return;
      opaqueSources.push(object);
    });

    const proxy = racer.createCelPrepassProxy();
    const position = proxy.geometry.getAttribute('position');
    const normal = proxy.geometry.getAttribute('normal');

    expect(opaqueSources.length).toBeGreaterThan(10);
    expect(Array.isArray(proxy.material) ? true : proxy.material.visible).toBe(false);
    expect(position?.count).toBeGreaterThan(1_000);
    expect(normal?.count).toBe(position?.count);
    expect(proxy.geometry.boundingSphere).not.toBeNull();
    expect(racer.createCelPrepassProxy()).toBe(proxy);
    expect(opaqueSources.every(
      (mesh) => mesh.userData[CEL_POST_EXCLUDE_USER_DATA_KEY] === true,
    )).toBe(true);

    racer.pilotAnchor.remove(pilot);
    pilot.dispose();
    racer.dispose();
  });
});
