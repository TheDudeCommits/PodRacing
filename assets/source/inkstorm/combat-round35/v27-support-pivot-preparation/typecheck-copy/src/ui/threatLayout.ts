import type { HudThreatCueViewModel } from './types';

export interface ThreatCueLayout {
  threat: HudThreatCueViewModel;
  x: number;
  y: number;
  bearing: number;
  urgency: number;
  count: number;
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
}

interface Rectangle { left: number; top: number; right: number; bottom: number }

function intersects(a: Rectangle, b: Rectangle): boolean {
  return a.left < b.right + CUE_GAP && a.right > b.left - CUE_GAP
    && a.top < b.bottom + CUE_GAP && a.bottom > b.top - CUE_GAP;
}

export function threatCueBounds(cue: Pick<ThreatCueLayout, 'x' | 'y'>): Rectangle {
  return { left: cue.x - THREAT_CUE_WIDTH / 2, right: cue.x + THREAT_CUE_WIDTH / 2,
    top: cue.y - THREAT_CUE_HEIGHT / 2, bottom: cue.y + THREAT_CUE_HEIGHT / 2 };
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

  const reserved = reservedRegions(viewportWidth, viewportHeight, airborne, context);
  const left = THREAT_CUE_WIDTH / 2 + 16;
  const right = viewportWidth - left;
  const top = 150;
  const bottom = viewportHeight - THREAT_CUE_HEIGHT / 2 - 16;
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
  const placed: ThreatCueLayout[] = [];
  for (const group of groups.slice(0, 3)) {
    const desired = perimeterPoint(group.bearing);
    // Search the same perimeter, never push a card inward over the course or craft.
    // The arrow and accessible direction retain the unmodified world bearing.
    const available = (candidate: { x: number; y: number }): boolean => {
      const bounds = threatCueBounds(candidate);
      return !reserved.some((region) => intersects(bounds, region))
        && !placed.some((cue) => intersects(bounds, threatCueBounds(cue)));
    };
    let position = available(desired) ? desired : undefined;
    if (!position) {
      let closestDistance = Number.POSITIVE_INFINITY;
      for (let angle = -180; angle < 180; angle += 3) {
        const candidate = perimeterPoint(angle);
        const distance = (candidate.x - desired.x) ** 2 + (candidate.y - desired.y) ** 2;
        if (distance < closestDistance && available(candidate)) {
          position = candidate;
          closestDistance = distance;
        }
      }
    }
    if (position) placed.push({ ...group, ...position });
  }
  return placed;
}
