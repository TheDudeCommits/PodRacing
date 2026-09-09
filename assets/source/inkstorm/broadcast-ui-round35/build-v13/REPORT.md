# Build V13 source freeze

Scope: `src/ui/workshopGraphicStyles.ts` and `src/ui/workshopSymbols.ts` only. Source backups and hashes are recorded alongside this report.

- Installed slot marks enlarged from 36px desktop to 52px; alternatives from 36px to 78px; equipped mark from 72px to 128px (76px narrow).
- Alternative cards use flex content within stretched grid rows, consistent name/effect reading areas, and aligned equip actions. The equipped part retains the full-width first plate at >=1280px.
- Modifier readings use 32px plain bold numerals instead of 23px stencil readings, with 8px signed zero-center bars instead of 3px bars.
- Section labels shortened to INSTALLED and AVAILABLE PARTS. Repeated thick rules removed; the header slash detail is a compact stamp.
- Redundant selected-slot effects and equipped description disclose on hover or keyboard focus. Expanded descriptions/comparisons remain in normal flow, allowing the scrolling library to grow without covering another choice.
- All part IDs, effects, deltas, equip actions, five slots, and narrow scroll containers remain controlled by existing state and markup.
- Original solid silhouettes widened for clearer small-scale recognition; no reference assets copied.

Validation: npm run typecheck passed; PostCSS parsed all 91 CSS rules; XML parsed all five SVG marks; git diff --check passed. No browser, build, GPU, dist, or public changes were performed. The parent owns live capture and visual/interaction acceptance.
