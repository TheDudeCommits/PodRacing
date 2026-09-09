import type { InkstormFamily, InkstormPlacement } from '../../game/race/inkstormLayout';

export const INKSTORM_SERVICE_GANTRY = 'foundry-service-gantry-v3';
export type InkstormRenderFamily = InkstormFamily | typeof INKSTORM_SERVICE_GANTRY;

/** All courses place grid lamps at .012; later crossings use service machinery.
 * This visual choice consumes the unchanged physical placement snapshot. */
export function inkstormRenderFamily(placement: InkstormPlacement): InkstormRenderFamily {
  return placement.family === 'foundry-gantry' && placement.progress !== .012
    ? INKSTORM_SERVICE_GANTRY : placement.family;
}
