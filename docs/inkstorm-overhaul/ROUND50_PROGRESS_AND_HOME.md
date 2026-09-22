# Round 50 — race progress repairs and home-screen cleanup

## Reported faults and fixes

The owner saw HUD overtakes without a nearby pass, and finish crossings that did
not finish the race. Regression tests reproduced these defects in the old code:

- `unwrappedProgress` integrated travel but discarded backward reset jumps. A
  recovered racer retained distance it could drive and earn a second time.
  Rankings now use physical position on the validated lap, bounded by the next
  required checkpoint. Recovery immediately returns that ranking to its real
  location. Completed laps are counted once, including AI catch-up calculations.
- Gate posts stood at `courseHalfWidth * 1.18`, but detection accepted only
  `courseHalfWidth + 2.5`. Some visibly valid passes missed a checkpoint. Rendering
  and detection now share the exact checkpoint pose and aperture, rather than a
  rounded render sample. Detection tests the swept craft path at the actual gate
  plane, including a tick beginning exactly on it.
- Missed-gate recovery previously existed only for AI. A local player or guest
  could drive the remaining lap with a stale checkpoint cursor. Near-track
  misses now recover every racer 18 m before the required gate after a 12 m
  crossing allowance. Large off-course excursions retain the existing safe-pose
  recovery. Neither recovery nor teleport awards a checkpoint or finish.

The ordered gate chain, 120 Hz simulation, host authority, and configured lap
count remain authoritative. After a valid final lap the normal results grace
period still classifies the trailing field.

## Home screen

Removed the visible drag/browse instructions, pod-count tagline and footer
branding. Pod rotation remains available by pointer, keyboard and rotation
buttons. Added four direct visual destination cards below pod selection, using
actual native game captures; no generated concept art is presented as gameplay.
The cards retain selected mode, authoritative guest locks, and existing event
callbacks. Desert's visible home label is now Dune Sea. Mobile layouts include
four map cards and a persistent footer with Play.

## Art-direction previews

Four Imagegen concepts were produced, preserving the requested composition:

- A — Orbital: dark aerospace realism, titanium and ice-blue lighting.
- B — Solar Industrial: bright ceramic/titanium and safety orange.
- C — Chrome Cel: retro sci-fi illustration with cobalt, lavender metal and red.
- D — Liquid Chrome: glossy blue/violet reflective metal and red-orange accents.

C/D derive their palette, materials and lighting from the owner's attached images,
without importing their characters. Local outputs: `output/round50/previews/`.
The owner selected **D — Liquid Chrome** during this session. The home screen now
uses a separately generated environment plate, cobalt/violet glass-like panels,
red-orange selection glows and chrome-lit menu pod previews. The background is
279 KB WebP. Pod meshes and actual captured destination imagery remain interactive
and representative of the existing game; the artwork is menu atmosphere.

## Validation

- Targeted regression cases cover single-count laps, recovery/ranking drift,
  missed-gate rank caps, the full visible aperture, exact-plane crossings, swept
  lateral crossings, recovery across the finish line, and local/guest recovery.
- Coarse render-sampling test verifies visible posts remain on authoritative gates.
- Existing mid-course physics/combat fixtures now initialize checkpoint history
  consistently with their staged poses. Their original assertions were retained.
- Three-lap simulation drives on all four destinations finished normally for the
  player. Desert: 196.525 s; frozen: 209.200 s; volcanic: 201.642 s; jungle: 180.325 s.
  All eight pod identities participated. Two desert AI racers were classified
  after the player's grace period; all other entrants recorded final crossings.
- Browser home checks: 18 passed, no page/console/HTTP errors; desktop, portrait,
  compact landscape, touch rotation, keyboard, reduced motion, virtual gamepad.
- Real PeerJS host/guest checks passed for pod/map/rules selection and ability
  delivery. Controller checks use a virtual standard gamepad, not physical hardware.

- Full suite: **1,104 tests / 190 files pass**. After the final menu lighting edit,
  the 25 affected preview/framing/home/progress tests also pass. TypeScript,
  production build and diff checks pass.
- Native browser: three laps through normal virtual-gamepad input, no capture
  mode, teleporting or clock acceleration; results reached at race time 202.383 s.
  All 30 ordered checkpoint crossings recorded across three laps. The run used
  recovery and correctly remained a practice result, not a competitive record.
  All 20 course sectors traversed, zero console/page errors, frame interval p95
  16.7 ms at 1440×900 on this Mac. This is device-specific, not a universal FPS claim.

## Production release

- Live: **https://podracing.dude.work/**.
- Runtime commit: `b9c3cecaea8a5d77113f6215cd54a921217fab3f`.
- Deployment: `dpl_8dD94iFYVnx8ZMu7F6qh2F5igCbi`, **READY**.
- Deployment URL: https://now-this-is-podracing-qw9odawlh-amirs-projects-d9680079.vercel.app.
- Canonical alias and `now-this-is-podracing.vercel.app` verified on this deployment.
- Live browser checks: **18 passed**, zero page/console/HTTP errors. All eight
  pod choices, inspection, maps, rules, options, race launch, touch, virtual
  gamepad, reduced motion, and five desktop/mobile/landscape viewports exercised.
- Live bundle: `index-CDgMdb2D.js`, 1,981,612 bytes, SHA-256
  `8c36e8c38c1ce0f795566e508a6dce4eba853796a62a838802e5766d7fd90689`.
  Exact match with the locally tested build.
- Local receipts: `output/round50/deployment.json`, `live-qa.json`, `live-qa.log`;
  final canonical screenshots: `home-desktop.png`, `home-390x844.png`,
  `home-844x390.png` in the same directory.
- Rollback: Round 49 `dpl_22gnfW4DwCxmGn52Awwj6kqrWyCV`.

Reproduction scripts: `qa-race-round50.mjs`, `qa-home-round50.mjs`,
`qa-online-round50.mjs`, `qa-live-round50.mjs`, `capture-maps-round50.mjs`.
All browser scripts close their browsers and temporary servers in `finally`.
