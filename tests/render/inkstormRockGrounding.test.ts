import { describe, expect, it, vi } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { groundInkstormButtress } from '../../src/render/inkstorm/InkstormRockGrounding';

const up = new Vector3(0, 1, 0);

describe('scanned sandstone grounding', () => {
  it('plants below the low corner of a rotated, nonuniform footprint while preserving every XZ corner and crown', () => {
    const rock = Object.freeze({ x: 80, z: -25, yaw: .63, sx: 1.7, sy: 1.2, sz: .8 });
    const slopeX = .18, slopeZ = -.27;
    const terrain = vi.fn((x: number, z: number) => 3 + slopeX * x + slopeZ * z);
    const center = terrain(rock.x, rock.z);
    terrain.mockClear();
    const grounded = groundInkstormButtress(rock, terrain);
    // Analytic minimum of a plane over a rotated rectangle, independent of the
    // sampling loop. This fails if the yaw sign or unequal axis scales swap.
    const alongX = slopeX * Math.cos(rock.yaw) - slopeZ * Math.sin(rock.yaw);
    const alongZ = slopeX * Math.sin(rock.yaw) + slopeZ * Math.cos(rock.yaw);
    const lowest = center - Math.abs(alongX) * 40 * rock.sx - Math.abs(alongZ) * 50 * rock.sz;
    expect(grounded.baseY).toBeCloseTo(lowest - 1.5 - 18 * rock.sy, 10);
    expect(terrain).toHaveBeenCalledTimes(25);
    const rotation = new Quaternion().setFromAxisAngle(up, rock.yaw);
    const previous = new Matrix4().compose(new Vector3(rock.x, center - 1.5, rock.z), rotation, new Vector3(rock.sx, rock.sy, rock.sz));
    const revised = new Matrix4().compose(new Vector3(rock.x, grounded.baseY, rock.z), rotation, new Vector3(rock.sx, grounded.scaleY, rock.sz));
    for (const x of [-40, 40]) for (const z of [-50, 50]) for (const y of [0, 120]) {
      const oldCorner = new Vector3(x, y, z).applyMatrix4(previous);
      const newCorner = new Vector3(x, y, z).applyMatrix4(revised);
      expect(newCorner.x).toBe(oldCorner.x);
      expect(newCorner.z).toBe(oldCorner.z);
      if (y === 120) expect(newCorner.y).toBeCloseTo(oldCorner.y, 10);
      else expect(newCorner.y).toBeLessThan(oldCorner.y);
    }
    expect(rock.sy).toBe(1.2);
  });

  it('finds a basin trough between the center and corners without sinking the visible crown out of view', () => {
    const rock = Object.freeze({ x: 0, z: 0, yaw: 0, sx: 2, sy: .8, sz: 1 });
    const terrain = (x: number, z: number) => 25 - 185 * Math.exp(-((x - 40) ** 2 + (z + 25) ** 2) / 100);
    const grounded = groundInkstormButtress(rock, terrain);
    expect(grounded.baseY).toBeCloseTo(-160 - 1.5 - 18 * rock.sy, 10);
    expect(grounded.baseY + 120 * grounded.scaleY).toBeCloseTo(terrain(0, 0) - 1.5 + 120 * rock.sy, 10);
    expect(grounded.scaleY).toBeGreaterThan(2);
    // A base-only translation would put the entire 96m-tall source below ground.
    expect(grounded.baseY + 120 * rock.sy).toBeLessThan(terrain(0, 0));
  });

  it('reaches an explicit structural crown on sloping ground without moving the footprint', () => {
    const terrain = (x: number, z: number) => -28 + x * .14 - z * .2;
    const rock = { x: 83, z: 11, sx: 2.65, sy: 1.45, sz: 2.27, yaw: .47 };
    for (const deckUnderside of [34, 67, 92]) {
      const grounded = groundInkstormButtress(rock, terrain, deckUnderside);
      expect(grounded.baseY + 120 * grounded.scaleY).toBeCloseTo(deckUnderside, 10);
      for (const x of [-40, 0, 40]) for (const z of [-50, 0, 50]) {
        const worldX = rock.x + Math.cos(rock.yaw) * x * rock.sx + Math.sin(rock.yaw) * z * rock.sz;
        const worldZ = rock.z - Math.sin(rock.yaw) * x * rock.sx + Math.cos(rock.yaw) * z * rock.sz;
        expect(grounded.baseY).toBeLessThan(terrain(worldX, worldZ));
      }
    }
  });
});
