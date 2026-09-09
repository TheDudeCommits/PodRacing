import type { HudWorkshopSlot } from './types';

/** Original solid equipment marks. Wide stencil cuts stay readable at every card scale. */
const silhouettes: Record<HudWorkshopSlot, string> = {
  engine: '<path fill-rule="evenodd" d="M24 7h32l9 13h11v40H65L56 73H24L15 60H4V20h11Zm16 11a22 22 0 1 0 0 44 22 22 0 0 0 0-44Z"/><path d="M35 22c9-2 18 4 21 12l-15 5-6-6Zm23 21c-1 9-8 16-17 16l-2-16 7-5ZM36 58c-9-2-15-10-14-19l16 4 2 7ZM22 34c3-7 6-10 10-12l4 14-6 5-8-2Z"/><circle cx="40" cy="40" r="6"/>',
  cooling: '<path fill-rule="evenodd" d="M18 7h44l10 11v44L62 73H18L8 62V18Zm1 14v38h42V21Z"/><path d="M24 25h8v30h-8Zm13 0h7v30h-7Zm12 0h8v30h-8ZM1 22h7v14H1Zm0 22h7v14H1Zm71-22h7v14h-7Zm0 22h7v14h-7Z"/>',
  armour: '<path d="M37 5 7 18l5 28 25-11Zm6 0v30l25 11 5-28ZM14 52l23-10v33L23 61Zm29-10 23 10-9 9-14 14Z"/>',
  steering: '<path d="M5 16h15v48H5Zm55 0h15v48H60ZM25 7h30v10H45v12H35V17H25ZM20 34h10v12H20Zm30 0h10v12H50ZM25 54l15 10 15-10v12L40 77 25 66Z"/><path fill-rule="evenodd" d="M40 25a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm0 10a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/>',
  gadget: '<path fill-rule="evenodd" d="M23 14h34l10 11v30L57 66H23L13 55V25Zm20 10L28 43h11l-2 14 16-21H42Z"/><path d="M25 5h8v9h-8Zm22 0h8v9h-8ZM25 66h8v9h-8Zm22 0h8v9h-8ZM4 27h9v8H4Zm0 18h9v8H4Zm63-18h9v8h-9Zm0 18h9v8h-9Z"/>',
};

export function workshopSymbol(slot: HudWorkshopSlot): string {
  return `<svg class="pod-hud__component-symbol" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><g fill="currentColor" stroke="none">${silhouettes[slot]}</g></svg>`;
}
