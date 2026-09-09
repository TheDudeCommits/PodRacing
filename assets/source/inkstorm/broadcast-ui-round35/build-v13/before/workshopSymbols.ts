import type { HudWorkshopSlot } from './types';

/** Original equipment silhouettes. Open cuts stay transparent on either paper or teal. */
const silhouettes: Record<HudWorkshopSlot, string> = {
  engine: '<path fill-rule="evenodd" d="M25 9h30l8 12h10v38H63L55 71H25L17 59H7V21h10Zm15 10a21 21 0 1 0 0 42 21 21 0 0 0 0-42Z"/><path d="M37 24c7-2 15 3 17 9L43 37l-6-3Zm19 17c0 8-7 15-14 15l-1-13 5-4ZM36 55c-8-2-13-10-11-17l12 5 1 6ZM25 33c3-6 6-8 9-9l3 12-4 4-8-2Z"/><circle cx="40" cy="40" r="6"/>',
  cooling: '<path fill-rule="evenodd" d="M19 9h42l9 10v42L61 71H19L10 61V19Zm2 13v36h38V22Z"/><path d="M25 26h6v28h-6Zm12 0h6v28h-6Zm12 0h6v28h-6ZM3 24h7v12H3Zm0 20h7v12H3Zm67-20h7v12h-7Zm0 20h7v12h-7Z"/>',
  armour: '<path d="M38 8 9 21l5 27 24-12Zm4 0v28l24 12 5-27ZM16 53l22-11v30L25 61Zm26-11 22 11-9 8-13 11Z"/><path d="m40 34 9 6-9 6-9-6Z"/>',
  steering: '<path d="M8 17h13v46H8Zm51 0h13v46H59ZM25 13h30v8H44v9h-8v-9H25ZM21 35h10v10H21Zm28 0h10v10H49ZM26 55l14 9 14-9v10L40 74 26 65Z"/><path fill-rule="evenodd" d="M40 27a13 13 0 1 0 0 26 13 13 0 0 0 0-26Zm0 8a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/>',
  gadget: '<path fill-rule="evenodd" d="M23 14h34l10 11v30L57 66H23L13 55V25Zm20 10L28 43h11l-2 14 16-21H42Z"/><path d="M25 5h8v9h-8Zm22 0h8v9h-8ZM25 66h8v9h-8Zm22 0h8v9h-8ZM4 27h9v8H4Zm0 18h9v8H4Zm63-18h9v8h-9Zm0 18h9v8h-9Z"/>',
};

export function workshopSymbol(slot: HudWorkshopSlot): string {
  return `<svg class="pod-hud__component-symbol" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><g fill="currentColor" stroke="none">${silhouettes[slot]}</g></svg>`;
}
