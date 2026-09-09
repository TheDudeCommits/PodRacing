import type { HudThreatCueViewModel } from './types';

export interface ThreatCueLayout {
  threat: HudThreatCueViewModel;
  x: number;
  y: number;
  bearing: number;
  urgency: number;
  count: number;
  directionOnly?: boolean;
  footprintWidth?: number;
  footprintHeight?: number;
}

// Shared with CSS so collision tests include the actual label and pulse footprint.
export const THREAT_CUE_WIDTH = 160;
export const THREAT_CUE_HEIGHT = 32;
const CUE_GAP = 10;
const GROUP_BEARING_DEGREES = 24;

export interface ThreatCueContext {
  detailVisible?: boolean;
  controlsVisible?: boolean;
  tutorialVisible?: boolean;
  assetStatusVisible?: boolean;
  /** Actual occupied HUD rectangles, in the threat container coordinate space. */
  reservedRects?: readonly { left: number; top: number; right: number; bottom: number }[];
  /** Compact-landscape bounded children replace legacy estimates; empty remains a valid measurement. */
  occupiedRects?: readonly { left: number; top: number; right: number; bottom: number }[];
  /** Bottom of the compact timing rail; upper perimeter stays outside the driving view. */
  compactHeaderBottom?: number;
}

interface Rectangle { left: number; top: number; right: number; bottom: number }

function intersects(a: Rectangle, b: Rectangle): boolean {
  return a.left < b.right + CUE_GAP && a.right > b.left - CUE_GAP
    && a.top < b.bottom + CUE_GAP && a.bottom > b.top - CUE_GAP;
}

export function threatCueBounds(cue: Pick<ThreatCueLayout, 'x' | 'y' | 'footprintWidth' | 'footprintHeight'>): Rectangle {
  const width = cue.footprintWidth ?? THREAT_CUE_WIDTH;
  const height = cue.footprintHeight ?? THREAT_CUE_HEIGHT;
  return { left: cue.x - width / 2, right: cue.x + width / 2,
    top: cue.y - height / 2, bottom: cue.y + height / 2 };
}

/** Clockwise from the craft's forward axis; placement never changes this bearing. */
export function threatBearingLabel(bearing: number): string {
  const directions = ['ahead', 'ahead-right', 'right', 'behind-right', 'behind', 'behind-left', 'left', 'ahead-left'];
  return directions[((Math.round(bearing / 45) % 8) + 8) % 8] ?? 'ahead';
}

function reservedRegions(width: number, height: number, airborne: boolean, context: ThreatCueContext): Rectangle[] {
  const mobile = width <= 650;
  const regions: Rectangle[] = [
    { left: 0, top: 0, right: mobile ? 265 : 384, bottom: 240 },
    { left: width / 2 - 200, top: mobile ? 190 : 0, right: width / 2 + 200, bottom: mobile ? 300 : 120 },
    { left: width - (mobile ? 185 : 270), top: height - (mobile ? 238 : 274), right: width, bottom: height },
    { left: 0, top: height - 155, right: mobile ? 225 : 300, bottom: height },
    { left: width - 130, top: 0, right: width, bottom: 72 },
  ];
  if (airborne) regions.push({ left: width - (mobile ? 185 : 270), top: height - (mobile ? 390 : 406), right: width, bottom: height - 248 });
  if (context.detailVisible) regions.push({ left: width - 230, top: 72, right: width, bottom: height - 190 });
  if (context.controlsVisible) regions.push({ left: mobile ? 0 : 280, top: height - (mobile ? 320 : 112), right: mobile ? width : width - 265, bottom: height });
  if (context.tutorialVisible) regions.push({ left: 0, top: 230, right: 365, bottom: 440 });
  if (context.assetStatusVisible) regions.push({ left: width - 325, top: 72, right: width, bottom: 154 });
  regions.push(...(context.reservedRects ?? []));
  return regions;
}

/** Keep the most urgent nearby bearing, then place at most three cues around the HUD perimeter. */
export function layoutThreatCues(
  threats: readonly HudThreatCueViewModel[],
  width: number,
  height: number,
  airborne = false,
  context: ThreatCueContext = {},
): ThreatCueLayout[] {
  const viewportWidth = Math.max(320, width);
  const viewportHeight = Math.max(320, height);
  const urgency = (threat: HudThreatCueViewModel): number => Math.min(1, Math.max(0, Number.isFinite(threat.urgency) ? threat.urgency : 0));
  const ranked = [...threats].sort((a, b) => urgency(b) - urgency(a) || a.id.localeCompare(b.id));
  const groups: ThreatCueLayout[] = [];
  for (const threat of ranked) {
    const rawBearing = Number.isFinite(threat.bearingDegrees) ? threat.bearingDegrees : 0;
    const bearing = ((rawBearing % 360) + 540) % 360 - 180;
    const neighbour = groups.find((group) => Math.abs(((group.bearing - bearing + 540) % 360) - 180) < GROUP_BEARING_DEGREES);
    if (neighbour) {
      neighbour.count += 1;
    } else {
      groups.push({ threat, x: 0, y: 0, bearing, urgency: urgency(threat), count: 1 });
    }
  }

  const measuredCompact = viewportWidth >= 651 && viewportWidth <= 760 && viewportHeight <= 540
    && context.occupiedRects !== undefined;
  const reserved = measuredCompact ? context.occupiedRects! : reservedRegions(viewportWidth, viewportHeight, airborne, context);
  const placed: ThreatCueLayout[] = [];
  const findPosition = (group: ThreatCueLayout, footprintWidth: number, footprintHeight: number): { x: number; y: number } | undefined => {
    const left = footprintWidth / 2 + 16;
    const right = viewportWidth - left;
    const top = measuredCompact && context.compactHeaderBottom !== undefined
      ? Math.max(16 + footprintHeight / 2, context.compactHeaderBottom + CUE_GAP + footprintHeight / 2) : 150;
    const bottom = viewportHeight - footprintHeight / 2 - 16;
    const centerX = viewportWidth / 2;
    const centerY = (top + bottom) / 2;
    const radiusX = Math.max(1, right - centerX);
    const radiusY = Math.max(1, bottom - centerY);
    const perimeterPoint = (bearing: number): { x: number; y: number } => {
      const radians = bearing * Math.PI / 180;
      const dx = Math.sin(radians);
      const dy = -Math.cos(radians);
      const scale = 1 / Math.max(Math.abs(dx) / radiusX, Math.abs(dy) / radiusY);
      return { x: centerX + dx * scale, y: centerY + dy * scale };
    };
    const desired = perimeterPoint(group.bearing);
    // Search the same perimeter, never move inward across the course or craft.
    const available = (candidate: { x: number; y: number }): boolean => {
      const bounds = threatCueBounds({ ...candidate, footprintWidth, footprintHeight });
      return !reserved.some((region) => intersects(bounds, region))
        && !placed.some((cue) => intersects(bounds, threatCueBounds(cue)));
    };
    if (available(desired)) return desired;
    let position: { x: number; y: number } | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (let angle = -180; angle < 180; angle += 3) {
      const candidate = perimeterPoint(angle);
      const distance = (candidate.x - desired.x) ** 2 + (candidate.y - desired.y) ** 2;
      if (distance < closestDistance && available(candidate)) {
        position = candidate;
        closestDistance = distance;
      }
    }
    return position;
  };
  for (const [index, group] of groups.slice(0, 3).entries()) {
    // The compact footprint includes the rotated 28px arrow's <=40px paint bounds.
    const height = measuredCompact ? 40 : THREAT_CUE_HEIGHT;
    let width = THREAT_CUE_WIDTH;
    let directionOnly = false;
    let position = findPosition(group, width, height);
    if (!position && measuredCompact && index === 0) {
      // Full group count remains visible; reserve extra width for unusually large groups.
      width = 80 + Math.max(0, String(group.count).length - 3) * 8;
      directionOnly = true;
      position = findPosition(group, width, height);
    }
    if (position) placed.push({ ...group, ...position, ...(measuredCompact
      ? { directionOnly, footprintWidth: width, footprintHeight: height } : {}) });
  }
  return placed;
}
