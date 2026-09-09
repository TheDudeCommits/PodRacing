import { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { InkstormGhostView } from '../../src/render/inkstorm/InkstormGhostView';
import { GALACTIC_VEHICLE_ORDER } from '../../src/game/galactic/catalog';

describe('personal-best ghost geometry', () => {
  it('renders a translucent body for every class without requiring a racer MRT registration', () => {
    const ghost = new InkstormGhostView();
    for(const vehicleClass of GALACTIC_VEHICLE_ORDER){
      ghost.setVehicleClass(vehicleClass);
      ghost.setPose({x:10,y:4,z:20,yaw:.3,pitch:0,roll:.1,bank:.2});
      expect(ghost.rotation.z).toBeCloseTo(.3);
      const visible:Mesh[]=[];
      ghost.traverseVisible(object=>{if(object instanceof Mesh)visible.push(object);});
      expect(visible.length,vehicleClass).toBeGreaterThan(0);
      expect(visible.every(mesh=>mesh.geometry.getAttribute('position').count>100)).toBe(true);
      for(const mesh of visible){
        const material=mesh.material as MeshBasicMaterial;
        expect(material.transparent).toBe(true);
        expect(material.opacity).toBeGreaterThan(0);
        expect(material.opacity).toBeLessThan(1);
        expect(material.depthWrite).toBe(false);
      }
    }
    ghost.setPose(null);
    let visibleAfterEnd=0;
    ghost.traverseVisible(object=>{if(object instanceof Mesh)visibleAfterEnd++;});
    expect(visibleAfterEnd).toBe(0);
    ghost.dispose();
  });
});
