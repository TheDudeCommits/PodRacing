# V16 UI typography and composition freeze

Russo One provides broad, solid headings across the garage, Build, and map. Chakra Petch remains the body face; race time, lap/position and primary speed retain stencil numerals. The official unmodified 39,124-byte font and OFL are shipped locally with fallbacks and exact pinned source provenance. No reference lettering, logos, or artwork was copied.

## Composition changes

- **Build:** At 1280px and wider, the three alternative parts are horizontal equipment rows: a restrained family glyph, broad part name, benefit and cost columns, and one aligned equip action. The equipped component retains its full description and cream selection field. All five installed slots and four choices per bay remain in the existing controls. The 761–1279px and mobile scroll layouts remain available; expanded descriptions occupy normal flow and can extend the scroll content. Shared headings and aggregate numeric readings use Russo One. Decorative family glyphs and all actual part semantics are unchanged.
- **HUD:** A single dark housing groups speed, boost, heat, and damage. One redundant decorative speed-dial outline is removed while the real charge path remains. Meter cards lose their individual frames and share the same backdrop. Redline text explicitly overrides the inherited tiny child font; route, upcoming-turn and threat guidance regain compact dark backing over bright scenery. Existing wreck/matte hiding behavior and all measured values remain intact. Width/height overrides preserve the narrow and short-landscape instrument variants.
- **Garage:** Broad machine/event headings, a slightly wider desktop event column, quieter body-style controls, and fewer stat divisions establish priority. Small-screen stat groups use three columns so Acceleration does not collide with Drift as in the inspected V15 mobile capture. Class cards use intrinsic heights to accommodate wider labels.
- **Map:** Broad heading and destination labels, stronger orbital weights, and a quieter footer title place emphasis on the selected planet. Original node coordinates and selection logic are untouched. Root owns the independent logic/harness work.

## Motion

Map entry and Build panel entry use restrained opacity/vertical movement with 40ms panel staggering, settled by 400ms. Actual newly equipped parts play a 320ms opacity/horizontal-seating cue. Map selection retains 420ms position and 380ms disc/label transitions. Both the existing in-game reduced-motion class and OS preference disable new animations and transitions. `MOTION_EXPECTATIONS.json` gives exact selectors/properties/times for root's native traces; it is an expectation, not captured motion evidence.

## Validation and boundaries

Typecheck passed. Generated CSS parsed with PostCSS: 693 broadcast, 122 workshop, and 133 atlas rules. Explicit before/after diff whitespace checks passed; these files are currently untracked in Git, so ordinary git diff alone would not cover them. Russo One passed all 17 SFNT table checksums and the complete font checksum; its internal names/regular weight and representative advance widths are in `font-metrics.json`. Font outlines were not modified. The system and bundled Python lack fontTools, so the recorded integrity/width checks used the font's standard SFNT/cmap/hmtx tables directly.

No browser, build, GPU, source logic, test, or harness mutation was performed by this task. Native layout, visual acceptance, loaded-font proof, keyboard focus restoration, and active/settled/reduced transition evidence remain for root's capture. The new composition should be assessed on those actual captures; CPU validation does not predict a blind-critic pass.

## Exact source inventory

- `src/ui/broadcastStyles.ts` — SHA-256 `0bbd39f4c17ea6458db6a12fff0f462e789b719d6413b1d171d8e948f40dd7bf`
- `src/ui/workshopGraphicStyles.ts` — SHA-256 `925131cba7ef736e1fdd79e26c176834989827c08691dd0181600943a1cf8786`
- `src/ui/raceEventAtlasStyles.ts` — SHA-256 `db9c6e985ccacd45600541ae7602d2214eec43f31b111179c07fdd1ee4c8763d`
- `public/fonts/inkstorm/PROVENANCE.md` — SHA-256 `6171939d6b9f178d1a0afd951ac2a6febca1747ffbda5e9cf5bec7a70618a6bb`
- `public/fonts/inkstorm/RussoOne-Regular.ttf` — SHA-256 `bc0abcc660bd8b7ad3000ecb2898a27c58a29a50f7ec81652fa12e75148d09df`
- `public/fonts/inkstorm/RussoOne-OFL.txt` — SHA-256 `3ac1301549523d9861fedca12871f24e575fbd26d520632fc00ba849b471d275`
- `public/fonts/inkstorm/RussoOne-provenance.json` — SHA-256 `e81940b5ec5e90dc1acb84192c3c1e5bbe5770f4bd6870b426b8728d6e154ed0`

`before/`, `after/`, generated CSS, source diffs, the complete font source response/files, and `manifest.json` preserve this freeze.
