import type { HudWorkshopSlot } from './types';
import type { WorkshopPartId } from '../game/galactic/types';

/** Original solid equipment marks. Wide stencil cuts stay readable at every card scale. */
const silhouettes: Record<HudWorkshopSlot, string> = {
  engine: '<path fill-rule="evenodd" d="M24 7h32l9 13h11v40H65L56 73H24L15 60H4V20h11Zm16 11a22 22 0 1 0 0 44 22 22 0 0 0 0-44Z"/><path d="M35 22c9-2 18 4 21 12l-15 5-6-6Zm23 21c-1 9-8 16-17 16l-2-16 7-5ZM36 58c-9-2-15-10-14-19l16 4 2 7ZM22 34c3-7 6-10 10-12l4 14-6 5-8-2Z"/><circle cx="40" cy="40" r="6"/>',
  cooling: '<path fill-rule="evenodd" d="M18 7h44l10 11v44L62 73H18L8 62V18Zm1 14v38h42V21Z"/><path d="M24 25h8v30h-8Zm13 0h7v30h-7Zm12 0h8v30h-8ZM1 22h7v14H1Zm0 22h7v14H1Zm71-22h7v14h-7Zm0 22h7v14h-7Z"/>',
  armour: '<path d="M37 5 7 18l5 28 25-11Zm6 0v30l25 11 5-28ZM14 52l23-10v33L23 61Zm29-10 23 10-9 9-14 14Z"/>',
  steering: '<path d="M5 16h15v48H5Zm55 0h15v48H60ZM25 7h30v10H45v12H35V17H25ZM20 34h10v12H20Zm30 0h10v12H50ZM25 54l15 10 15-10v12L40 77 25 66Z"/><path fill-rule="evenodd" d="M40 25a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm0 10a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/>',
  gadget: '<path fill-rule="evenodd" d="M23 14h34l10 11v30L57 66H23L13 55V25Zm20 10L28 43h11l-2 14 16-21H42Z"/><path d="M25 5h8v9h-8Zm22 0h8v9h-8ZM25 66h8v9h-8Zm22 0h8v9h-8ZM4 27h9v8H4Zm0 18h9v8H4Zm63-18h9v8h-9Zm0 18h9v8h-9Z"/>',
};

/** Family housings reserve an open center for each component's functional mark. */
const housings: Record<HudWorkshopSlot, string> = {
  engine: '<path fill-rule="evenodd" d="M24 7h32l9 13h11v40H65L56 73H24L15 60H4V20h11Zm16 11a22 22 0 1 0 0 44 22 22 0 0 0 0-44Z"/>',
  cooling: '<path fill-rule="evenodd" d="M18 7h44l10 11v44L62 73H18L8 62V18Zm1 14v38h42V21Z"/><path d="M1 22h7v14H1Zm0 22h7v14H1Zm71-22h7v14h-7Zm0 22h7v14h-7Z"/>',
  armour: '<path fill-rule="evenodd" d="M40 5 7 18l5 28 11 15 17 14 17-14 11-15 5-28Zm0 12L19 25l4 20 9 11 8 7 8-7 9-11 4-20Z"/>',
  steering: '<path d="M5 16h15v48H5Zm55 0h15v48H60ZM25 7h30v10H45v7H35v-7H25ZM20 35h6v10h-6Zm34 0h6v10h-6ZM25 57l15 10 15-10v9L40 77 25 66Z"/>',
  gadget: '<path fill-rule="evenodd" d="M23 14h34l10 11v30L57 66H23L13 55V25Zm3 8-5 6v24l5 6h28l5-6V28l-5-6Z"/><path d="M25 5h8v9h-8Zm22 0h8v9h-8ZM25 66h8v9h-8Zm22 0h8v9h-8ZM4 27h9v8H4Zm0 18h9v8H4Zm63-18h9v8h-9Zm0 18h9v8h-9Z"/>',
};

/** Each mark depicts the part's authored role; no statistic is inferred from the drawing. */
const partMarks = {
  // Symmetric feed rotor: predictable launch torque and handling.
  'balanced-ion-drive': { slot: 'engine', glyph: '<path d="M35 22h10v12l-5 3-5-3ZM58 35v10H46l-3-5 3-5ZM45 58H35V46l5-3 5 3ZM22 45V35h12l3 5-3 5Z"/><circle cx="40" cy="40" r="6"/>' },
  // Two tapered discharge jets: straight-line speed and redline boost.
  'nova-burst-turbines': { slot: 'engine', glyph: '<path d="m30 20 8 13v16l-8 12-8-12V33Zm20 0 8 13v16l-8 12-8-12V33Z"/>' },
  // Broad low-ratio gear: acceleration out of slow corners.
  'krayt-torque-core': { slot: 'engine', glyph: '<path fill-rule="evenodd" d="M34 21h12v7l6-4 8 9-6 5 7 3-4 12-7-2v8H37v-7l-7 4-9-9 6-6-7-3 4-12 9 3Zm6 12a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z"/>' },
  // Armoured energy core: weapons feed behind a heavy enclosure.
  'siege-pulse-reactor': { slot: 'engine', glyph: '<path fill-rule="evenodd" d="M31 22h18l9 10v16l-9 10H31L22 48V32Zm12 6L31 42h8l-2 11 13-17h-9Z"/>' },
  // Exposed diagonal ceramic vanes: passive clean-air cooling.
  'desert-fin-array': { slot: 'cooling', glyph: '<path d="M25 25h8L27 55h-8Zm14 0h8l-6 30h-8Zm14 0h8l-6 30h-8Z"/>' },
  // Filled phase-change reservoir with a liquid-level cut.
  'cryoflux-radiator': { slot: 'cooling', glyph: '<path fill-rule="evenodd" d="M40 23c-6 8-15 16-15 23a15 12 0 0 0 30 0c0-7-9-15-15-23Zm-10 20v6h20v-6Z"/>' },
  // Wide mouth and narrow throat: speed-fed Venturi airflow.
  'venturi-sand-scoop': { slot: 'cooling', glyph: '<path d="M23 24h34L45 42v13H35V42ZM25 51h6v5h-6Zm24 0h6v5h-6Z"/>' },
  // Closed stacked thermal blocks: impact-resistant cooling mass.
  'sealed-heat-sink': { slot: 'cooling', glyph: '<path d="M25 25h30v8H25Zm0 11h30v8H25Zm0 11h30v8H25Z"/>' },
  // Central structural spine and three broad reinforcing ribs.
  'durasteel-ribcage': { slot: 'armour', glyph: '<path d="M37 23h6v35h-6ZM25 27h30v6H25Zm3 11h24v6H28Zm5 11h14v6H33Z"/>' },
  // Three overlapping plates retain glancing-hit coverage with lighter structure.
  'ceramic-skirmish-shell': { slot: 'armour', glyph: '<path d="m24 25 16 7 16-7v8l-16 7-16-7Zm4 15 12 5 12-5v7l-12 6-12-6Zm6 13 6 3 6-3v6l-6 4-6-4Z"/>' },
  // Stored charge discharged through reactive armour into the weapons bus.
  'reactive-plating': { slot: 'armour', glyph: '<path d="M41 23 26 43h12l-3 17 19-25H42l3-12Z"/>' },
  // Open diagonal bracing: nonessential plate mass has been removed.
  'stripped-racing-frame': { slot: 'armour', glyph: '<path d="m25 25 4-2 26 29-4 4Zm26-2 4 2-26 31-4-4Z"/>' },
  // Opposed directional vanes around the steering pivot.
  'vector-vane-rack': { slot: 'steering', glyph: '<path d="m26 25 10 6-5 17-8 6Zm28 0 3 29-8-6-5-17Z"/><circle cx="40" cy="40" r="5"/>' },
  // Captive gyro with a fixed cross-axis: yaw stability rather than deep drift.
  'gyro-lock-yoke': { slot: 'steering', glyph: '<path fill-rule="evenodd" d="M40 25a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm0 6a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z"/><path d="M37 28h6v24h-6ZM28 37h24v6H28Z"/>' },
  // Opposite sweeping arrow fins: deliberate countersteer through sustained slides.
  'countersteer-fins': { slot: 'steering', glyph: '<path d="M25 27h19c10 0 14 7 11 14l-6-3c1-3-1-5-5-5H33v7L23 30Zm30 26H36c-10 0-14-7-11-14l6 3c-1 3 1 5 5 5h11v-7l10 10Z"/>' },
  // Long centerline with level trim surfaces: stable fast sweepers.
  'long-course-stabilizers': { slot: 'steering', glyph: '<path d="m40 23 8 11h-5v21h-6V34h-5ZM25 37h9v7h-9Zm21 0h9v7h-9ZM29 48h5v6h-5Zm17 0h5v6h-5Z"/>' },
  // Shield receiver fed by two short bus terminals.
  'pulse-shield-relay': { slot: 'gadget', glyph: '<path fill-rule="evenodd" d="m40 24 13 5-2 15-11 12-11-12-2-15Zm0 7-6 2 1 9 5 6 5-6 1-9Z"/><path d="M22 35h5v9h-5Zm31 0h5v9h-5Z"/>' },
  // Discharge chamber and focused lance beam.
  'heat-lance-amplifier': { slot: 'gadget', glyph: '<path d="M24 29h7v22h-7Zm11 4h7v14h-7Zm10-7 13 14-13 14v-9H32V35h13Z"/>' },
  // Feed hopper above a printed mine cartridge.
  'scrap-mine-printer': { slot: 'gadget', glyph: '<path d="M25 24h30v7H43v8h-6v-8H25ZM33 42h14l6 7v6H27v-6Zm-6-4h5v6h-5Zm21 0h5v6h-5Z"/>' },
  // A return loop around a capacitor: recovered slide energy becomes boost.
  'repulsor-recuperator': { slot: 'gadget', glyph: '<path d="M40 24c9 0 16 7 16 16h-7c0-5-4-9-9-9h-2v6L26 27l12-8v5ZM40 56c-9 0-16-7-16-16h7c0 5 4 9 9 9h2v-6l12 10-12 8v-5Z"/><path d="m40 34 6 6-6 6-6-6Z"/>' },
} as const satisfies Readonly<Record<WorkshopPartId, { slot: HudWorkshopSlot; glyph: string }>>;

export function workshopSymbol(slot: HudWorkshopSlot, partId?: string): string {
  const part = partId && Object.prototype.hasOwnProperty.call(partMarks, partId)
    ? partMarks[partId as WorkshopPartId]
    : undefined;
  // Missing, unknown, or wrong-bay IDs keep the original installed-slot mark.
  const drawing = part?.slot === slot ? housings[slot] + part.glyph : silhouettes[slot];
  return `<svg class="pod-hud__component-symbol" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><g fill="currentColor" stroke="none">${drawing}</g></svg>`;
}
