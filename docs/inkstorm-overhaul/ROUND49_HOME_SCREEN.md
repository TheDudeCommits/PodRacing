# Round 49 — illustrated home screen

The owner requested Rift Arena's composition: mode selection across the top,
an animated and interactive racer in the middle, and options along the bottom.
The exact shared reference was opened and its mode, fighter, settings and mobile
states inspected in a browser. Reference captures are local in `output/round49/`.

## Implementation

- Four illustrated mode cards: Battle, Race, Time Trial and World Cup. Active
  cards keep their color and rust selection mark; other cards use ink treatment.
- All eight admitted pods have directly selectable portraits surrounding one
  large live 3D showcase. The selected craft floats subtly, transitions on selection,
  and supports pointer/touch drag, rotation buttons and keyboard inspection.
  Its identity and actual handling ratings are visible.
- A bottom row exposes destination, race rules, Online, Courses, Options and Play.
  Build appears for events which allow workshop changes. Rules and online controls
  open in exclusive drawers; Escape/close buttons return focus to their trigger.
- Four-across, two-row mobile roster with a larger central pod. Compact landscape
  layout retains all rows. Reduced motion disables idle and transition animation.
- Controller navigation includes native drawer summaries, excludes inert/hidden
  controls, and closes the active settings/workshop/atlas/drawer on B.
- Guests display the host's shared mode/destination and cannot change those choices.
  This presentation data comes from the room snapshot, not parsed status text.
- Twelve small WebP images total **232,632 bytes**. All imagery was captured from
  this game's current meshes and tracks. Only the chosen hero uses the existing
  temporary menu WebGL renderer. No new runtime model downloads or GPU contexts.

Gameplay, simulation cadence, intro audio, pod assets and multiplayer authority
remain as established in Round 48. Asset provenance: `public/assets/inkstorm/home/SOURCES.md`.

## Validation

- TypeScript, production build and `git diff --check` passed.
- Full suite: 1,092 passed, one geometry-clearance test exceeded its 5-second
  timeout while browser work ran. Its entire 9-test file passed in isolation
  without changing thresholds or implementation. All 1,093 tests are covered.
- Final focused UI/controller checks: **74 tests in 12 files passed**.
- Native browser home check: **17 checks, zero page/console/HTTP errors**.
  Eight pod choices, mouse/keyboard inspection, mode/destination/rules, exclusive
  drawers, menu input isolation, controller navigation/A/B, reduced motion, desktop,
  1024px tablet, 390/360px mobile, 844px landscape and native race launch.
  Separate touch-emulated page passed tap selection and a touch-drag inspection.
- Two actual PeerJS browser peers passed pod, track, rules and ability authority
  parity through race launch. The guest home additionally asserted Frostline,
  Race, and all four mode controls locked to the host.
- Test browsers and preview servers close in `finally`.

Reproduce with `npm run build`, `node scripts/qa-home-round49.mjs` and
`node scripts/qa-online-round49.mjs`. `PODRACING_QA_URL` points the home check at
a deployed URL. Screenshots and JSON receipts are in `output/round49/` (local,
not versioned). Controller testing used a virtual standard browser gamepad;
this does not establish physical hardware or rumble acceptance.

## Release

Implementation and local checks complete. Production receipt will be added after
Git-integrated deployment, promotion, and canonical browser verification.
Previous Production: `dpl_GhE3nyomhH61YRfMNmwnTU7Q6Sq5` (Round 48).
