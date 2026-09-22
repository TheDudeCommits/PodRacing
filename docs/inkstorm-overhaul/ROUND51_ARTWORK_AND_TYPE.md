# Round 51 — Liquid Chrome artwork and font choices

## Request and result

The owner requested relevant generated race-type/map images in the selected
Liquid Chrome style, plus stronger futuristic font options to choose from.

Eight new built-in Imagegen illustrations now power the existing home cards:
Battle, Race, Time Trial, World Cup, Dune Sea, Frostline, Ember Rift and Verdant Run.
The race illustrations use existing admitted pod renders as shape references;
the environments and trophy are original generated illustrations. They are menu
key art, not gameplay captures or newly added terrain. Prompt set and generator
paths are saved in [ROUND51_IMAGE_PROMPTS.json](ROUND51_IMAGE_PROMPTS.json).
All full-size outputs are copied into `output/round51/originals/`; the eight
runtime WebPs are 960×540 and total 714,706 bytes. The original screenshots remain
under their original names. Runtime cards use versioned `*-chrome.webp` names.
Inactive mode cards retain more of the art's intended color and brightness.

## Font choice remains with the owner

`/style-lab/index.html` provides four real-font specimens and an interactive
same-origin game preview. A selection applies the candidate to home headings and
buttons in the embedded game. Utility text remains in the existing readable face.
The candidates are A Orbitron (700), B Audiowide (400), C Tektur (700), and
D Zen Dots (400). Orbitron is the suggested choice. No selection has been applied
to the normal game's default font. This is a comparison, not automatic acceptance.

All fonts are unmodified, self-hosted official Google Fonts files with upstream
OFL licenses and metadata. They load on the comparison page only. Selection is
stored in the URL fragment, not in saved game settings. No new package dependency.
Font provenance is in `public/style-lab/SOURCES.md`.

## Validation

- TypeScript and production build pass. Existing large-bundle warning remains.
- Existing home setup tests: 2 tests pass; no gameplay logic changed.
- JavaScript syntax and `git diff --check` pass.
- Real browser: all eight runtime illustrations decode at the expected size,
  all four mode and destination selections work, default font remains unchanged.
- Home layout checked at 1440×900, 390×844, 360×740 and 844×390 without horizontal
  overflow; desktop and mobile screenshots visually reviewed.
- Font comparison: 16 font/layout checks, with confirmed loaded font faces;
  keyboard selection and expand/Escape interaction pass. All four candidates fit
  the tested mobile/landscape page widths and iframe widths.
- Zero console errors; four existing audio-before-gesture warnings.
- Browsers closed after checks. Receipts: `output/round51/`; screenshots:
  `output/playwright/round51/`. CLI reproduction functions are preserved in
  `output/round51/check-fonts.cjs` and `check-home.cjs`.
- Runtime bundle `index-CJMkrdLK.js`, SHA-256
  `ec85dc541866400d48ba339742581052ce9534be92965b9ea152f4280b4dba40`.

## Release

Live at **https://podracing.dude.work/**. Font comparison:
**https://podracing.dude.work/style-lab/index.html**.

- Deployed source: `6b09c2e74661234fa5920aa1a3b5f782bac3ef7e`.
- Git-integrated preview:
  https://now-this-is-podracing-8lpdokezs-amirs-projects-d9680079.vercel.app.
- Promoted Production: `dpl_46G1pa7owfQDKwRrCkNQJh7Jq5Ze`, **READY**.
- Deployment URL:
  https://now-this-is-podracing-e57ulbwtu-amirs-projects-d9680079.vercel.app.
- Canonical alias and fallback project aliases confirmed by Vercel inspect.
- Canonical browser QA: eight new images decode correctly; all four mode and
  four map choices work; 390×844 home fits; all four font faces switch in the
  live embedded game; zero page/console/HTTP errors. Browser closed afterward.
- Browser-loaded bundle: `index-CJMkrdLK.js`, 1,981,627 bytes, same SHA-256 as above.
- Deployment receipt: `output/round51/production-deployment.json`.
  Browser evidence: `output/round51/production-qa.log` and
  `output/playwright/round51/live-*.png`.
- Previous Production / rollback candidate: Round 50
  `dpl_8dD94iFYVnx8ZMu7F6qh2F5igCbi`.
