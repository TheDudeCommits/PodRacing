# V17 Build composition — applied, native validation pending

The installed part now has a 156px actual part-id glyph, 19px benefit and 18px tradeoff readings in a cream area with a 236px intrinsic minimum. Its full real description remains visible beneath the main component/readings. Available alternatives use 80px original part glyphs and open rows separated by one fine line. At wide widths, name, benefit, tradeoff and equip action remain aligned; rows have a 96px minimum and grow with their actual content. Hover and keyboard focus tint the full row and show the existing description and comparison in normal flow.

Compact widths use a single flowing list. Readings sit beside the 80px glyph and the equip action takes a separate full-width row. The installed glyph is 112px on mobile, with its benefit/tradeoff and description below the identity row. No fixed card height, max-height clipping, text truncation, fake stat, decorative internal diagram or absolute disclosure overlay was added.

Only workshopGraphicStyles.ts changed for this Build pass. RaceHud markup and focus restoration, catalogue identities and copy, all five installed slots, all twenty parts, summary/synergies, interaction selectors, and entry/equip/reduced-motion behavior are unchanged. The HUD files remain at the previously validated V17 hashes listed in COMBINED_UI_FREEZE.json.

CPU verification: project typecheck passes; the existing workshop and galactic HUD model tests pass (17 tests in 2 files); generated workshop CSS parses at 120 rules and combined broadcast/workshop CSS at 838 rules; whitespace check has no diagnostics. These establish syntax and retained model behavior, not visual acceptance.

Required native follow-up: inspect all twenty installed states and full descriptions; hover/focus every alternative and inspect benefit/tradeoff/comparison text; equip by pointer and Enter, assert retained focus and exact state changes, reset actual loadout; inspect mobile/landscape scrolling and the longest names/modifiers; retain actual transition/reduced-motion assertions and a fresh unchanged seven-image blind critic. No browser, build or GPU action was used for this pass.
