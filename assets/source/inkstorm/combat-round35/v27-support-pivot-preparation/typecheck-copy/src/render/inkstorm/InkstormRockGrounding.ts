import type { InkstormPlacement } from '../../game/race/inkstormLayout';

type RockPlacement = Pick<InkstormPlacement, 'x' | 'z' | 'yaw' | 'sx' | 'sy' | 'sz'>;

/**
 * Plant the scanned 80×120×100m buttress across its whole rotated footprint.
 * Called only when a course's static matrices are rebuilt. Returning vertical
 * values alone leaves the authoritative layout and collider footprint intact.
 */
export function groundInkstormButtress(
  placement: Readonly<RockPlacement>,
  heightAt: (x: number, z: number) => number,
  fixedCrownY?: number,
): { baseY: number; scaleY: number } {
  const centerGround = heightAt(placement.x, placement.z);
  let minimumGround = centerGround;
  const cos = Math.cos(placement.yaw), sin = Math.sin(placement.yaw);
  for (let row = -2; row <= 2; row++) for (let column = -2; column <= 2; column++) {
    if (row === 0 && column === 0) continue;
    const x = column * 20 * placement.sx, z = row * 25 * placement.sz;
    minimumGround = Math.min(minimumGround, heightAt(
      placement.x + cos * x + sin * z,
      placement.z - sin * x + cos * z,
    ));
  }
  const baseY = minimumGround - 1.5 - 18 * placement.sy;
  const crownY = fixedCrownY ?? centerGround - 1.5 + 120 * placement.sy;
  // Extending downward while retaining the original crown avoids burying an
  // entire low, wide rock when its footprint straddles a deep basin shoulder.
  return { baseY, scaleY: (crownY - baseY) / 120 };
}
