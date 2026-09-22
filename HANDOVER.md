# PodRacing — Round 48 gameplay overhaul live (2026-09-22)

The requested overhaul is live at **https://podracing.dude.work/**.

- Runtime source: `31780293d381864e6c30ada6bba8156684629c24`, pushed to GitHub.
- Production: `dpl_GhE3nyomhH61YRfMNmwnTU7Q6Sq5`, **READY**.
- Deployment URL: https://now-this-is-podracing-4m0b44uk4-amirs-projects-d9680079.vercel.app.
- Verified aliases: `podracing.dude.work`, `now-this-is-podracing.vercel.app`.
- Canonical browser bundle: `index-DEzAwTYZ.js`, 1,963,961 bytes, SHA-256
  `bebdf3c8d5217452bdd49f94757bec6d8e278e2b10bdb347b5cf91e07173f1fa` — identical to the tested local build.
- Live verification: **12 checks, zero page/console/HTTP errors**; all eight pod selections, keyboard driving on all three new destinations, and 390px mobile layout without overflow.
- Previous Production for rollback: `dpl_DZ5je3Rd6PrwK3pHjGwDnbxe2qkz`.
- Release receipts: `output/round48/deployment.json`, `live-qa.json`, `live-qa.log`. All task browsers were closed after their checks.

- Shortcuts removed from playable circuits; scenery and surfaces improved across all four destinations.
- Three-stage drift, hop grace, countersteering, stronger torque/landing feedback, fitted hulls and compact-pod camera framing.
- Contact takedowns, visible scorching/smoke, directional flame and eight pod ability assignments. Keyboard **C**, controller **LB**; steer to aim/dodge. Existing primary/shield/mine controls remain.
- Recorded engine/pass-by/tunnel/intensity mix changes. Lossless runtime pod packaging saves about **6.7 MB** with unchanged decoded pixels and geometry. Startup waits for pod/shader preparation.
- Four-round World Cup, controller menu navigation and replicated multiplayer pod/map/rules selection. Protocol 2 requires both players to refresh.
- `npm test`: **1,092 tests / 189 files passed**; subsequent focused camera regression: **46 tests / 9 files passed**, including a new full-Pog-hull framing check. TypeScript, production build and diff checks pass.
- All eight pods completed all four destinations, live host/guest ability and selection parity passed, and a full native jungle lap measured **p95 16.7 ms** at 1440×900 on this Mac. Device-specific evidence and limitations are in the report.
- [Implementation, validation and remaining quality work](docs/inkstorm-overhaul/ROUND48_GAMEPLAY.md).
- Reproduction: `scripts/qa-race-round48.mjs`, `qa-live-round48.mjs`, `qa-online-round48.mjs`, `qa-pods-round48.mjs`, `qa-round48.mjs`, `qa-production-round48.mjs`. Local receipts/screenshots: `output/round48/`.
- Do not touch the user's interactive Blender scene/server or rewrite admitted source geometry/audio. Archived branch fixtures stay explicitly opt-in; new runtime tracks do not use them.

## Prior release — Round 47

# PodRacing — Round 47 Production release (2026-09-22)

The owner requested deployment to **https://podracing.dude.work/**. Round 46's
three destinations and four recovered pods are now live. All eight pods remain
available through the setup carousel; destination selection is solo-only.

- Runtime source: `cdb3fe8687a4a458fab2bfa477937884acefd4a9`, pushed to GitHub.
- Production: `dpl_DZ5je3Rd6PrwK3pHjGwDnbxe2qkz`, **READY**, with canonical alias
  `podracing.dude.work` and `now-this-is-podracing.vercel.app`.
- The live browser-loaded bundle matches the tested local build:
  `index-CqDGBrTc.js`, SHA-256
  `721fd11bdb4abbe34de9ad509fe3368d8e59079cdac82994595c125c9cd68366`.
- [Release evidence and prioritized quality roadmap](docs/inkstorm-overhaul/ROUND47_RELEASE_AND_ROADMAP.md).
- Browser reproduction: `node scripts/qa-production-round47.mjs`.
  Screenshots and receipts are local under `output/round47/`.
- No runtime source or trailer media changed in this release round. The older
  Round 46 statement that work is local-only is historical and superseded here.
- Continue to push for a Git-integrated preview, then promote its verified URL
  for an owner-authorized Production release. Do not deploy the working tree's
  large source archive directly.

## Previous handover — Round 46

# PodRacing — Round 46 handover (2026-09-22)

## Start here

Round 46 is a **local gameplay expansion**, following the owner's request to
re-examine the benchmark's racing features and recover unfinished pod assets.
The first batch adds three solo destinations and four selectable pods. The
benchmark audit, complete source inventory and remaining work are in
[ROUND46_REPORT.md](docs/inkstorm-overhaul/ROUND46_REPORT.md).

- Repository: `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`.
- **Play locally:** `npm run dev`, then choose a Destination and Battle, Race or
  Time Trial in the setup screen. Use the pod arrows to reach all eight designs.
- New destinations: **Frostline**, **Ember Rift**, **Verdant Run**. They use
  different deterministic layouts, scenery, surface grip and engine cooling.
  Ember Rift's orange outer shoulders add heat between 30–44% of the lap; the
  centre lane is safe. Alternate routes use their own physical lane widths.
- Recovered pods: **Verdigris**, **Skybolt**, **Needle**, **Pog Racer**. Each has a
  distinct handling/damage tune, a hero and rival model, and an existing sourced
  engine voice. Three open cockpits have the original Inkstorm pilot; Pog has an
  enclosed cockpit and one exhaust. AI racers also use the new designs.
- **Not pushed or deployed.** Public Production still uses Round 44's release
  (Round 43 runtime). The V5 trailer remains local and unchanged by this round.
- Preview and evidence: `output/round46/expansion-preview.jpg`, `browser-qa.json`,
  `drive-qa.json`, screenshots and validation logs. These outputs are gitignored.

## Implementation boundaries

The new destinations are seeded circuits on the established physical terrain
system, with original ice formations, basalt columns and forest canopy. They
are a first expansion, not reference-level wreck interiors, waterfalls, flowing
lava or a new tunnel collision system. Added scenery is decorative and placed
outside playable lanes; the established road/scenery collisions remain in use.
No new weapon was added: Heat Lance, Overcharge, mines, tow, shield and Redline
already existed. Dedicated class maneuvers and a directional flame attack are
still missing. Do not reintroduce the thermal-spike weapon, loose wreck debris
or photo-finish behavior explicitly removed in Round 43.

New destinations are exposed in **solo** Battle/Race/Time Trial. The existing
three-round Cup is unchanged. Online biome selection was not added, and this
round does not establish multiplayer browser acceptance. Identity remains
locked after the grid releases. Fixed 120 Hz simulation, host authority and
CPU/shader terrain height alignment are preserved. Mastery rules are now
`inkstorm-rules-3` because the opponent roster changed; older records/ghosts are
archived by the existing migration rather than compared against new competition.
New medal targets are initial values and still need human balancing.

Of 26 included archived source entries, four were already integrated and four
more now are. **18 remain unintegrated**, including duplicate variants and assets
with noncommercial/no-derivatives or commercial-game provenance concerns. The
report names each source and its status; it must not be read as 18 equally ready
new pod designs. Runtime assets retain attribution and source hashes; original
source GLBs were not modified. Recovered craft currently share the established
pod physics probe footprint and have no bespoke destruction shell.

## Validation and reproduction

Final validation results and bundle fingerprint are recorded in
[ROUND46_REPORT.md](docs/inkstorm-overhaul/ROUND46_REPORT.md). Native browser QA
covers the actual setup buttons, loaded models, destination changes, race starts,
short simulation drives and portrait/landscape mobile setup. This is automated
and sampled visual QA; human full-lap balance and aesthetic acceptance remain.
All task-created browsers and private QA servers were closed after use.

Asset reproduction runs an isolated Blender factory process via
`scripts/blender/recover-roster-round46.py`, then
`scripts/assets/optimize-recovered-roster.py` and
`scripts/assets/repair-recovered-tangents.py`. Per-pod hashes, normalization,
anchors and budgets live in `assets/source/inkstorm/roster-round46/`.
Never open/save the owner's interactive Blender scene as part of this pipeline.

Browser checks: `node scripts/qa-round46.mjs`; after a production build,
`node scripts/qa-drive-round46.mjs`. Both close their browser and private server
in `finally`. Run the expensive suite and browser profiling separately to avoid
contention. The old `selector-stability.mjs` expects the obsolete simultaneous
preview layout and was not used as evidence for this eight-pod carousel.

## Previous handover — Round 45

# PodRacing — Round 45 handover (2026-09-22)

## Start here

Round 45 produced **V5 — The line is yours**, a newly scripted and directed
72.683-second trailer. The owner rejected V4's gameplay capture and direction
while liking its Higgsfield inserts. V4 remains intact.

- **Watch/share:** `output/trailer-v5/PodRacing-Trailer-v5-web.mp4` — 116,139,009 bytes.
- **Master:** `output/trailer-v5/PodRacing-Trailer-v5.mp4` — 268,947,928 bytes.
- Both: 1920×1080, 60 fps, 4,361 video frames, stereo AAC at 48 kHz, 72.683333 seconds.
- **Script and reproduction:** [scripts/trailer/v5/DIRECTION.md](scripts/trailer/v5/DIRECTION.md), [scripts/trailer/v5/README.md](scripts/trailer/v5/README.md).
- **Publication description and required music credit:** `output/trailer-v5/PUBLICATION.txt`.
- **Evidence:** `output/trailer-v5/QA.json`, `MANIFEST.json`, `generation-receipts.json`, `edl.json`, `audio-edl.json`, and `review/sheet-1.jpg` through `sheet-4.jpg`.
- **Editable native Higgsedit title project:** `output/trailer-v5/higgsedit-title-project.zip`.

All media is **local and gitignored**. Committing the pipeline does not upload,
back up, publish or deploy the video. The repository is still
`/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote
`https://github.com/TheDudeCommits/PodRacing.git`. This round did not push or deploy.
Production remains the Round 44 release described below.

## What changed

The new 31-cut sequence has anticipation, a four-machine introduction, a launch,
close racing, drift, combat, an impact pause, a final sprint, title and playable
URL. It contains **50.233 seconds of real game footage, 14.65 seconds of generated
cinematic inserts, and 7.8 seconds of typography**. The source of every cut is in
the EDL and publication disclosure.

Gameplay now has subject-tracking capture cameras with lens control and staged
starting formations. All eight staged racers use the authored pod bodies. The
Teemto, Polwo, Sebulba and Blockrunner each receive an unobstructed moving
portrait. A normal camera/HUD shot shows the playable presentation. Real drift,
Heat Lance shots, shield activation, a rear-facing mine drop, and tow attachment
and release are captured. Starting positions are staged; subsequent motion uses
the actual simulation and AI. The victim-focused impact uses the existing
`debugWreckRacer` diagnostic trigger and is disclosed as such.

The capture additions are gated to capture mode; race staging additionally
requires a solo room. They do not add a new biome, race mode, weapon or runtime
asset. The owner authorized game additions if needed; this pass needed better
cinematography and capture tools to show the mechanics already present.

Capture still advances two individual 120 Hz ticks per 60 fps output frame and
pins renderer quality 0. It now streams frames straight to MP4 rather than
leaving multi-gigabyte JPEG sequences. Every take has a per-frame telemetry
receipt. Capture, title-label and contact-sheet browsers and their private
servers were closed when finished.

## Higgsfield and music

A new silent 1080p Seedance 2.5 refinery tracking insert was generated through
Higgsfield from a real game reference frame. Completed job:
`b40db518-5341-4bfe-8f1f-364835f5ea39`. The second new job, pilot insert
`cfa1e069-cacb-47a7-a34d-694a8fe2ba0b`, failed. Its terminal receipt is retained;
a reviewed existing pilot insert was used without resubmitting the paid request.
The preflight estimate was 108 credits across both requests; final billing or
refund was not independently verified. Selected existing V4 inserts are reused.
No generated assets entered `public/` or the runtime audio/provenance ledgers.

The titles were authored and rendered with native Higgsedit in the connected
remote sandbox, with the project's own fonts. The complete picture and sound
edit is reproducible from the local scripts; the native editable project covers
the title cards.

The new score is **“Race The Sun” by Scott Buckley**, CC BY 4.0:
https://www.scottbuckley.com.au/library/race-the-sun/
It is phrase-edited around a measured 123 BPM pulse, with a dip at the crash and
sourced game sound effects aligned to actions. The game selection intro and its
existing score are untouched. Attribution is in the end card and publication
notes. Final encoded-master loudness: **−14.49 LUFS integrated, −1.44 dBTP,
4.9 LU loudness range** (`loudness-final.log`).

## Verification and limits

- `npm run verify`: TypeScript, **1,059 tests / 185 files**, and production build pass.
- Build: `index-WDzJOqQT.js`, approximately 1.923 MB. This differs from Production
  because it contains the capture tools; it has not been deployed.
- All selected gameplay receipts report renderer quality 0 and zero page errors.
- Used shots include three Heat Lance firing events in the dedicated weapon cut,
  28 active shield frames, a real mine drop at trailer time 35.583 s and 99 attached
  tow frames followed by release. No selected hero take contains an unexpected wreck.
- Both final videos passed complete decode and exact frame-count/audio checks.
  An earlier validation overlapped a replacement encode and encountered an
  incomplete MP4. The completed replacement files were subsequently validated.
- All 31 cuts were inspected at start/middle/end, with denser temporal sampling
  for mine, shield, tow, impact and finish shots. Generated crash timing was
  corrected to include its actual explosion; the mine shot was reframed to keep
  the drop inside the cinematic crop.
- This is **technical and sampled visual QA**, not continuous human audiovisual
  approval. The owner has not reviewed or accepted V5 yet. The generated inserts
  retain their native model cadence inside the 60 fps master.

## Previous handover — Round 44

# PodRacing — Round 44 handover (2026-09-22)

## Start here

Round 44 changed **no game code**. It is a release round: the game got a **public address** and a **launch trailer**.

- **Live: https://podracing.dude.work** — the owner's own domain, added to the existing Vercel project. `https://now-this-is-podracing.vercel.app` still works and serves the same deployment.
- **Launch trailer** — 91.000 s, 1920×1080, 60 fps, a scene-by-scene remake of the owner's reference trailer (https://www.youtube.com/watch?v=2MtgIoToa7I). Roughly 70% real gameplay rendered offline from the shipping bundle, the rest generated with Seedance 2.5 through Higgsfield and conditioned on real frames from this build. The whole pipeline is committed under `scripts/trailer/`; read [scripts/trailer/README.md](scripts/trailer/README.md) and [scripts/trailer/REFERENCE.md](scripts/trailer/REFERENCE.md) before touching it.

Round 43 and earlier are unchanged and still describe the game itself: [ROUND43_REPORT.md](docs/inkstorm-overhaul/ROUND43_REPORT.md), [ROUND42](docs/inkstorm-overhaul/ROUND42_REPORT.md), [ROUND41](docs/inkstorm-overhaul/ROUND41_REPORT.md), [ROUND40](docs/inkstorm-overhaul/ROUND40_REPORT.md), [ROUND39](docs/inkstorm-overhaul/ROUND39_REPORT.md), [ROUND38](docs/inkstorm-overhaul/ROUND38_REPORT.md), [ROUND37](docs/inkstorm-overhaul/ROUND37_REPORT.md).

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- **Runtime source is still commit `298950d` (round 43).** Every round 44 commit adds only `scripts/trailer/` and this handover, so the built bundle is byte-identical to round 43's.
- **Production is live from this round**, promoted at the owner's explicit instruction to push and deploy. Preview `dpl_3tgwK9ka3hTvh9tZgJpka74Tk6rt` (https://now-this-is-podracing-1wf8g18b0-amirs-projects-d9680079.vercel.app, built by the Git integration from `5b56fde`) was promoted with `npx vercel promote ... --yes`, which rebuilt it in the production environment as `dpl_EvmpCPx4YfPwQxtPcmhJAJnjzxAF` (https://now-this-is-podracing-bhfn2ywyu-amirs-projects-d9680079.vercel.app). It carries the aliases `podracing.dude.work`, `now-this-is-podracing.vercel.app`, the project alias and the branch alias.
- `vercel promote` prompts interactively. `--yes` drives it non-interactively; the older `yes | npx vercel promote` recipe still works but a piped `yes` may be refused by a sandbox.
- Previews come from the Git integration on push. **Never run `vercel deploy` from the working tree**; it tries to upload roughly 17 GB. Production promotion stays owner-approved only: `npx vercel promote <url> --yes --scope amirs-projects-d9680079`.

## The domain

`podracing.dude.work` was attached with:

```
npx vercel domains add podracing.dude.work now-this-is-podracing --scope amirs-projects-d9680079
```

`dude.work` already runs on Vercel nameservers, so DNS was automatic and no code change was needed.

**The owner originally asked for `dude.work/Podracing`, a subpath. Do not attempt that without budgeting real work.** Two blockers:

1. The apex and `www` belong to a *different* Vercel project (`dudework`); `board.dude.work` belongs to `dashboard-ink`. A subpath would need a rewrite added to that other live site.
2. **This game is built for a domain root.** `vite.config.ts` sets no `base`, and there are **32 hardcoded root-absolute asset paths across 7 source files** — `src/ui/broadcastStyles.ts`, `src/render/sky/DuskSkyAssets.ts`, `src/render/app/GameApp.ts`, `src/render/inkstorm/InkstormWorld.ts`, `src/game/vehicleAppearance.ts`, `src/render/inkstorm/InkstormSurfaceMaterial.ts`, `src/audio/catalogue.ts`. At a subpath every one of those 404s. `catalogue.ts` is additionally hash-ledger-validated by `tests/audio/recordedCatalogue.test.ts`, and `DuskSkyAssets.ts` is the reference-counted sky loader, so this is not a blind find-and-replace.

## The trailer

Built with:

```
node scripts/trailer/edit.mjs --edl=./scenes.mjs --shots=shots3 --out=PodRacing-Trailer-v4
```

Masters live in `output/trailer/`, which is **gitignored** — the videos exist only on this Mac and are not in the repo or the deployment. `PodRacing-Trailer-v4.mp4` is the master (h264 CRF 16 + AAC 256k); `PodRacing-Trailer-v4-web.mp4` is a lighter share encode (`-crf 20 -preset slow -c:a aac -b:a 192k -movflags +faststart`), 165,428,869 bytes at 14.5 Mbps. **The share encode is not produced by `edit.mjs`** — it is the ffmpeg line above, run by hand on the master; an earlier copy was lost to a disk cleanup and had to be rebuilt.

Four cuts were made. The first three were rejected by the owner, and the reasons are the useful part:

1. **v1** — "zero direction, the pod is going off track instead of actually racing, you repeated the same shots". Root cause: the capture used `setInput({throttle: 1})` with no steer, so the hero drove off the racing line while the camera followed it into open desert.
2. **v2** — gameplay still underwhelming; generated and in-game footage did not blend; the pods, weapons, shields, mines, explosions and drifting were not shown.
3. **v3** — "recreate it SCENE BY SCENE": if the reference has an explosion, show *our* explosion.
4. **v4** — the current cut, 51 cuts against the reference's 50 scenes at the reference's own timecodes.

## Lessons that must survive

Round 43's lessons all still apply and are reproduced in the round 43 section below. Round 44 adds:

1. **Gameplay footage must be rendered offline and deterministically, never screen-recorded.** Real-time headless capture reached only ~24 fps and the adaptive governor dropped to quality level 8. `setCaptureMode(true)` pins quality level 0. Drive `step()` by hand, **two 120 Hz ticks per output frame** — `step()` calls `render(FIXED_DT)` once, so two steps advance effect time by exactly 1/60 s, and stepping one tick at a time lets persistent dust and wakes accumulate the way a player sees them. That is the ROUND39 batched-capture constraint, satisfied.
2. **The hero pod has to be driven closed-loop.** `scripts/trailer/driver.mjs` is a PD lane hold on `lateralOffset` (kp 0.055 / kd 0.115) with targets clamped to ±9 m, an explicit recentre above 11 m, overtaking that picks the free side, and lance fire only inside a forward cone. Open-loop input put the pod 117 m off the line; forcing a drift by swinging the target put it 86 m off. **Do not force behaviour the simulation produces on its own** — drift peaks of 0.77–1.0 happen unaided in the circuit's corners.
3. **`seekCourse` places the hero ahead of the entire field** (rivals at `-index * 42` m), so a chase camera sees nobody. Every take must run a low-throttle phase first and let the seven rivals stream past.
4. **`setCamera` is *not* capture-mode gated**, so shots are framed from the real gameplay cameras. Avoid `course`: it disables the cel post. The `hero` camera frames too far out to use.
5. **Cut from telemetry, not by eye.** `capture3.mjs` writes `telemetry.json` beside every take; `pick.mjs` rejects any window where the hero leaves the racing line or wrecks unintentionally and scores the rest for the feature the beat must show. Weapon beats must be cut to the *exact frame* the weapon fires — several early cuts missed their own event by a second. Small effects need a tighter reframe (`crop` in the EDL); a lance bolt is a few pixels in a full chase frame.
6. **This machine's ffmpeg has no `drawtext`** (no libfreetype). All typography is rendered in a headless browser by `scripts/trailer/cards.mjs`, using the game's own shipped faces and HUD palette.
7. **Higgsfield cannot generate music.** `sonilo_music` and `mirelo_text_to_audio` are gated to its game pipeline and `generate_audio` is speech-only, so the owner's request for an original score could not be met. The cut uses "Juggernaut" by Scott Buckley, already licensed in this repo as the selection-screen score. **The repo's sourced-audio-only policy was not bent.**
8. **Generated footage is a trailer asset and nothing else.** It must never enter `public/`, the game bundle, or the audio/asset provenance ledgers. Disclose it when publishing.
9. **Mines do not read on screen.** The mine drops *behind* the pod and no camera looks backward, so it reads as a pebble. One mine beat survives in the cut; that is an honest limit of the current cameras, not a cutting mistake.
10. **`lateralOffset` is measured against the nearest course branch.** Near the route fork a perfectly good take reports ~155 m off-line. Check the frames before discarding a take on that number alone.

## Validation

- `npm run verify` on the round 44 tree: TypeScript, **1056 tests / 184 files**, and the build all pass. The build emits `index-DkeU_NFY.js`, 1,920,743 bytes — the same bundle round 43 promoted to Production, which is the expected result of a round that touched no runtime source.
- Domain: `podracing.dude.work` resolves to the Vercel anycast edge (`216.150.1.0/24`; the exact A records rotate), HTTP/2 200 with HSTS. Asset spot-checks all 200 — JS 1,920,743 B, `podracing-selection-intro.webm` 98,581 B, `BlackOpsOne-Regular.ttf` 166,532 B, `teemto-hero-open-v2.glb` 7,698,824 B.
- Browser boot on the live domain: `__PODRACING__.ready === true`, dusk-sky HDR loaded with zero failures, Inkstorm world loaded, Race control present, **zero page errors and zero failed requests**.
- Neighbouring sites unaffected: `dude.work` 200, `www.dude.work` 307, `board.dude.work` 307.
- After the promotion, `podracing.dude.work` and `now-this-is-podracing.vercel.app` both serve `index-DkeU_NFY.js`, matching the locally verified build. A headless boot of the live domain reported `ready: true`, title `Now This Is PodRacing`, 95 controls, and **zero page errors and zero failed requests**.
- Frame cadence is **still unmeasured on a quiet machine**. That remains the one outstanding quality check, carried over from round 43.
- The trailer itself has had no viewer review beyond the owner's.

## Next work, in priority order

1. Owner playtest of the round 43 drift feel and lance magazine, now that the game is on a public address.
2. A quiet-machine cadence run (`npx tsx scripts/competitive-flow.ts --battle --performance`); it has never been measured without other load on the Mac.
3. Track improvements, which the owner has asked about but not yet chosen: named landmarks per corner, real shortcut gambles, a signature jump at the launch crest, more elevation, surface variety that changes grip, a wider sweeper and a tighter canyon, trackside life, per-sector lighting, a rebuilt start straight, and eventually a second circuit.
4. Remove the last 1.6% hull burial; rival line discipline on cambered straights.
5. Remaining ideas from earlier rounds: damage-driven handling, a reflect-timing shield, a lead reticle on the lock, sector race events, salvage magnet, chain mine, decoy beacon, repulsor jammer, ghost drive.
6. Trailer follow-ups the owner has **not** asked for, offered and not taken: a 60 s compression of the 91 s cut, literal jungle/ice biome shots if an exact biome match is ever wanted, and removing the end-card text if zero text is preferred.

## How to resume safely

Read this header and the round reports, then `git status --short --branch`. `npm run verify` for any runtime change. Headless laps: `scripts/drive-balance.ts`. Native evidence: `scripts/competitive-flow.ts`, `scripts/effect-stills.mjs`, `scripts/recovery-camera-frames.mjs`, `scripts/wreck-debris-stills.mjs`, `scripts/ordnance-stills.ts`, `scripts/drift-stills.mjs`, `scripts/drift-native-frames.mjs`. Diagnostics on `window.__PODRACING__`: `debugWreckPlayer()`, `debugWreckRacer(id)`, `seekCourse`, `setInput`, `step`, `snapshot`.

Trailer work specifically: the frame sequences under `output/trailer/shots3/` are ~5.5 GB and this Mac has run out of disk mid-capture before — check `df -h` before recapturing, and delete `output/trailer/shots*` and `clips*` when done. Close every owned browser and preview server immediately after QA; never adopt port 5211; never save the shared Blender scene; keep credentials and `.env` out of Git.

---

## Previous handover — Round 43 handover (2026-09-18)

## Start here

Round 43 is a trim-and-polish round on the owner's instruction: **photo finishes reverted**, **the Heat Lance made unlimited again behind a five-round magazine with a five-second reload**, **the thermal spike removed**, **wreck debris removed**, and **drifting rebuilt around one eased authority with a visible ground trail**. Details, physics numbers and native frames: [ROUND43_REPORT.md](docs/inkstorm-overhaul/ROUND43_REPORT.md). Earlier rounds: [ROUND42](docs/inkstorm-overhaul/ROUND42_REPORT.md), [ROUND41](docs/inkstorm-overhaul/ROUND41_REPORT.md), [ROUND40](docs/inkstorm-overhaul/ROUND40_REPORT.md), [ROUND39](docs/inkstorm-overhaul/ROUND39_REPORT.md), [ROUND38](docs/inkstorm-overhaul/ROUND38_REPORT.md), [ROUND37](docs/inkstorm-overhaul/ROUND37_REPORT.md).

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- Runtime source: commit `298950d` (round 43) on top of `74ac4d6` (round 42).
- **Production is live from this round at the owner's explicit request.** Preview `dpl_5yfYPyNNRPcXUgudt9ko8KqiKsVQ` (https://now-this-is-podracing-dkeftxaib-amirs-projects-d9680079.vercel.app) was promoted with `npx vercel promote`, which rebuilt it in the production environment as `dpl_FKeZ9Vbbf7aG5GD7XzMsb3dMuSWC` and aliased https://now-this-is-podracing.vercel.app. The live bundle hash matches the local `npm run build` output (`index-DkeU_NFY.js`). Promotion needs an interactive confirmation, so drive it with `yes | npx vercel promote <url> --scope amirs-projects-d9680079`.
- Previews come from the Git integration on push. Never run `vercel deploy` from the working tree; it tries to upload roughly 17 GB. Production promotion stays owner-approved only.

## What the game is right now

Eight-pod hover racing on one authored desert circuit (Inkstorm), 120 Hz deterministic simulation, renderer/HUD/audio consume snapshots only. The combat layer ("galactic") sits on top of the driving model.

- **Driving.** Predictable braking, an eased drift with a boost payout, hover suspension over eight terrain probes, momentum-preserving landings, banked corners that steer you, a two-second handling penalty after an overheat, boost charged by drafting and refunded by clean jumps.
- **Catch-up.** Distance behind the leader lengthens and strengthens the draft only. There is no speed cap on the leader anywhere; do not add one.
- **Combat.** Heat Lance on E (tap to fire, hold with three rounds for a shield-piercing overcharge), shield on Q, and F carrying either mines or a loaded tow cable. Pickups: EMP cell, repair salvage, tow cable, nitro cell.
- **Rivalry.** Whoever wrecks you is marked for 45 s, with HUD cues and four sourced CC0 voice lines for marked, revenge pass, grudge settled and final lap.

## Lessons that must survive

1. **Judge visual complaints from rendered frames, not simulation receipts.** Capture mode batches many simulation ticks into one render, so trails, wakes and particle systems cannot build up there. Anything that accumulates over frames must be evidenced natively: `scripts/drift-native-frames.mjs` drives a real race with the keyboard through ordinary frames and is the template.
2. **Sim pitch is nose-up positive; three.js X rotation is nose-down positive.** Every renderer consumer negates it (`GameApp` pose, `WreckVisualPose`, `InkstormGhostView`). `scripts/hull-burial-audit.ts` measures hull-below-terrain in the renderer's convention (1.6% of ticks, worst 3.3 m).
3. **New simulation config must be zeroed in `DRIVE5_COMPATIBILITY_CONFIG`** so the archived V9 wreck replays still reproduce. Round 43 added `driftEntryBlendTime` and `driftHoldSteer` there.
4. **The lance fires on the press.** Holding charges the overcharge. Tests and bots pulse the trigger for repeated shots.
5. **Combat inputs only exist in the chaos profile**; clean races strip fire/mine/shield, so weapon tests must use the default profile.
6. **Optional state stays optional.** `ordnance`, `tow`, `weapon.overcharge`, `weapon.reload`, `controls.mineHeld` and `drift.blend` are all `??`-defaulted where read, so older snapshots keep loading.
7. **Sourced audio only, with provenance.** Every runtime audio file has a hash ledger entry under `assets/source/audio-*/runtime-files.json` and a credits line; `tests/audio/recordedCatalogue.test.ts` enforces it. The selection intro webm must stay byte-identical (SHA256 `39c4d411…`). Never generate music or sound.

## Validation

- `npm run verify`: TypeScript, **1056 tests / 184 files**, build all pass.
- Native run on the built bundle: `Ready ×5` → five taps → `Reloading 3.7S` → `Ready ×5` with no pickup, and the drift slide ramping 0 → 0.54 → 1.0 → 0 with the meter lit. Frames and receipts in `docs/inkstorm-overhaul/evidence/handling-round43/`.
- Frame cadence is still unmeasured on a quiet machine. That is the one outstanding quality check.

## Next work, in priority order

1. Owner playtest of the drift feel and the lance magazine now that Production carries them.
2. A quiet-machine cadence run (`npx tsx scripts/competitive-flow.ts --battle --performance`); it has never been measured without other load on the Mac.
3. Track improvements, which the owner has asked about but not yet chosen: named landmarks per corner, real shortcut gambles, a signature jump at the launch crest, more elevation, surface variety that changes grip, a wider sweeper and a tighter canyon, trackside life, per-sector lighting, a rebuilt start straight, and eventually a second circuit.
4. Remove the last 1.6% hull burial; rival line discipline on cambered straights.
5. Remaining ideas from earlier rounds: damage-driven handling, a reflect-timing shield, a lead reticle on the lock, sector race events, salvage magnet, chain mine, decoy beacon, repulsor jammer, ghost drive.

## How to resume safely

Read this header and the round reports, then `git status --short --branch`. `npm run verify` for any runtime change. Headless laps: `scripts/drive-balance.ts`. Native evidence: `scripts/competitive-flow.ts`, `scripts/effect-stills.mjs`, `scripts/recovery-camera-frames.mjs`, `scripts/wreck-debris-stills.mjs` (now only useful for the respawn shadow), `scripts/ordnance-stills.ts`, `scripts/drift-stills.mjs`, `scripts/drift-native-frames.mjs`. Diagnostics on `window.__PODRACING__`: `debugWreckPlayer()`, `debugWreckRacer(id)`, `seekCourse`, `setInput`, `step`, `snapshot`. Close every owned browser and preview server immediately after QA; never adopt port 5211; never save the shared Blender scene; keep credentials and `.env` out of Git.

---

## Previous handover — Round 42 handover (2026-09-16)

## Start here

Round 42 adds four owner-picked weapons on top of round 41: **tow cable** (F latches the pod ahead, pulls for three seconds, F again slingshots; their shield cuts it), **thermal spike** (F fires a heat dart that cuts boost and tips warm engines into the overheat penalty), **nitro cell** (one-shot full boost and a clean engine, only on the hairpin's inside line) and the **overcharge lance** (hold E after a shot with three cells; release fires a wide, slow, shield-piercing bolt). Forward ordnance shares the mine key through `GalacticRacerState.ordnance`. Details, tests and stills: [ROUND42_REPORT.md](docs/inkstorm-overhaul/ROUND42_REPORT.md). Earlier rounds: [ROUND41](docs/inkstorm-overhaul/ROUND41_REPORT.md), [ROUND40](docs/inkstorm-overhaul/ROUND40_REPORT.md), [ROUND39](docs/inkstorm-overhaul/ROUND39_REPORT.md), [ROUND38](docs/inkstorm-overhaul/ROUND38_REPORT.md), [ROUND37](docs/inkstorm-overhaul/ROUND37_REPORT.md).

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- Runtime source: commit `3811b91` (round 42) on top of `9697e45` (round 41); preview deployment `dpl_8byuiVwfKzQXBpvvUXyJGXN3WBU9` (https://now-this-is-podracing-oq2ot41zw-amirs-projects-d9680079.vercel.app).
- Preview deployments come from the Git integration on push (owner Vercel sign-in required). **Production is unchanged.** Never run `vercel deploy` from the working tree.

## Lessons that must survive

1. **The lance fires on the press.** Holding charges the overcharge; tests and bots pulse the trigger for repeated shots (`augmentGalacticAIInput` toggles on `controls.fireHeld`). Do not reintroduce hold-to-autofire without removing the overcharge.
2. **Combat inputs only exist in the chaos profile.** `RaceSimulation` strips fire/mine/shield in clean races, so weapon tests must use the default profile.
3. **Ordnance state is optional in old snapshots.** `ordnance`, `tow`, `weapon.overcharge` and `controls.mineHeld` are `??`-defaulted everywhere they are read; keep that when adding fields.
4. **Consumable pickups bypass the one-claim ledger** through `FARMABLE_COMBAT_PARTS`; one-time upgrades keep it.

## Validation

- Tests: 1060/1060 (184 files), typecheck and build pass. Review-API stills of the racks and the overcharge bolt in `docs/inkstorm-overhaul/evidence/handling-round42/`; a live tow and a spike hit are covered by race-level tests only.
- Frame cadence is still unmeasured on a quiet machine.

## Next work, in priority order

1. Owner playtest of the four weapons in the preview; then a quiet-machine cadence run and the promotion decision.
2. Track improvements (options delivered with round 42), race events by sector, shortcut gambles, damage-driven handling, reflect shield, lead reticle, the remaining weapons list.
3. Remove the last 1.6% hull burial; rival line discipline on cambered straights.

## How to resume safely

Read this header and the round reports, then `git status --short --branch`. `npm run verify` for runtime changes; headless laps with `scripts/drive-balance.ts`; native evidence with `scripts/competitive-flow.ts`, `scripts/effect-stills.mjs`, `scripts/recovery-camera-frames.mjs`, `scripts/wreck-debris-stills.mjs` and `scripts/ordnance-stills.ts`. Close every owned browser and server immediately after QA; never adopt port 5211; never save the shared Blender scene.

---

## Previous handover — Round 41 handover (2026-09-16)

## Start here

Round 41 implements five owner-picked excitement items on top of round 40: **catch-up through the draft only** (longer, stronger wake for racers far behind the leader; the leader is never capped), **rival taunts and revenge beats** (revenge-pass and grudge-settled events, HUD cues, five sourced CC0 voice lines), **photo finish and last-lap tension** (final-lap music lift, tighter final-straight chase, presentation-only slow motion when the predicted gap at the line is under half a second), **boost as a decision** (drafting charges the meter, clean jumps refund it, overheating costs handling for two seconds) and **wreck debris that matters** (shed parts everyone must avoid, and a drop-in shadow on the respawn point). Details, tests and stills: [ROUND41_REPORT.md](docs/inkstorm-overhaul/ROUND41_REPORT.md). Earlier rounds: [ROUND40](docs/inkstorm-overhaul/ROUND40_REPORT.md), [ROUND39](docs/inkstorm-overhaul/ROUND39_REPORT.md), [ROUND38](docs/inkstorm-overhaul/ROUND38_REPORT.md), [ROUND37](docs/inkstorm-overhaul/ROUND37_REPORT.md).

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- Runtime source: commit `9697e45` (round 41) on top of `50234fb` (round 40); preview deployment `dpl_2PCqT4BkvaKNH2YiqibUe5YWURS1` (https://now-this-is-podracing-qhgattkvk-amirs-projects-d9680079.vercel.app).
- Preview deployments come from the Git integration on push (owner Vercel sign-in required). **Production is unchanged.** Never run `vercel deploy` from the working tree.

## Lessons that must survive

1. **Presentation clocks never touch simulation truth.** `PhotoFinishPresentation` and the combat cinematic only scale the wall delta fed to the fixed-step scheduler and motion; records, inputs and RNG are untouched. Keep any new slow-motion on that path and solo-only.
2. **Catch-up lives in the draft, not in speed caps.** `draftCatchUpFactor` is read only by `stepDraftingField`; the leader gets zero by construction. Do not add rubber-banding to `stepPodracer`.
3. **Sourced audio only, with provenance.** Voice lines join the hash ledger pattern (`assets/source/audio-voice-fighter/runtime-files.json`, admitted by `tests/audio/recordedCatalogue.test.ts`); `RECORDED_CUES` now has a `voice` kind whose recording is named on the cue. The intro webm stays byte-identical.
4. **New simulation config must be zeroed in `DRIVE5_COMPATIBILITY_CONFIG`** (`overheatHandlingTime/Penalty`, `draftBoostRegenBonus`, `landingBoostRefund` were) so archived V9 wreck replays keep reproducing.

## Validation

- Tests: 1052/1052 (183 files), typecheck and build pass. Browser checks on the built bundle: race score and voice lines requested at race start; debris and drop-in shadow stills in `docs/inkstorm-overhaul/evidence/handling-round41/`.
- Frame cadence is still unmeasured on a quiet machine. Revenge cue, photo-finish slow motion and the final-straight camera are unit-tested, not frame-captured.

## Next work, in priority order

1. Owner playtest of the five items in the preview; then a quiet-machine cadence run and the promotion decision.
2. New weapons and pickups (list delivered with round 41), race events by sector, shortcut gambles, damage-driven handling, reflect shield, lead reticle.
3. Remove the last 1.6% hull burial; rival line discipline on cambered straights.

## How to resume safely

Read this header and the round reports, then `git status --short --branch`. `npm run verify` for runtime changes; headless laps with `scripts/drive-balance.ts`; native evidence with `scripts/competitive-flow.ts`, `scripts/effect-stills.mjs`, `scripts/recovery-camera-frames.mjs` and `scripts/wreck-debris-stills.mjs`. Close every owned browser and server immediately after QA; never adopt port 5211; never save the shared Blender scene.

---

## Previous handover — Round 40 handover (2026-09-16)

## Start here

Round 40 answers three owner reports: **the Heat Lance went dead mid-race** (lance racks were one-claim-per-racer, so after 22 shots the weapon was empty for good; racks are now re-collectable every lap and a trickle keeps at least three cells coming back), **the camera sat side-on after a wreck respawn** (the wreck chase now releases at the respawn tick with a single cut to chase), and **race music** (two sourced Kevin MacLeod tracks rotate under the engines during races; the selection score is unchanged). Details, frames and provenance: [ROUND40_REPORT.md](docs/inkstorm-overhaul/ROUND40_REPORT.md). Earlier rounds: [ROUND39](docs/inkstorm-overhaul/ROUND39_REPORT.md), [ROUND38](docs/inkstorm-overhaul/ROUND38_REPORT.md), [ROUND37](docs/inkstorm-overhaul/ROUND37_REPORT.md).

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- Runtime source: commit `50234fb` (round 40) on top of `9ae4dd2` (round 39); preview deployment `dpl_Exgh5ehLsXU7BMpgmtSswUe8q5bL` (https://now-this-is-podracing-p0pak1ac9-amirs-projects-d9680079.vercel.app).
- Preview deployments come from the Git integration on push (owner Vercel sign-in required). **Production is unchanged.** Never run `vercel deploy` from the working tree.

## Lessons that must survive

1. **Ammunition pickups are not upgrades.** `collectedPickupIds` is a one-claim ledger for the EMP cell and repair salvage; `lance-cells` bypass it on purpose. Any new consumable must decide which rule it follows and test the second lap.
2. **The wreck chase must end when the craft moves.** `stillWrecked` in `GameApp` is gated on the *wrecked* phase only; the *recovering* phase is a driveable control-link countdown and gets the ordinary chase. `scripts/recovery-camera-frames.mjs` plus `window.__PODRACING__.debugWreckPlayer()` (solo-only diagnostic) reproduce the sequence in a real race.
3. **Music policy.** Sourced compositions only, credited beside the files with hash provenance (`assets/source/audio-race-set/runtime-files.json`, admitted by `tests/audio/recordedCatalogue.test.ts`). Race tracks live in `RECORDED_RACE_MUSIC`; the intro webm stays byte-identical.

## Validation

- Tests: 1034/1034 (176 files), typecheck and build pass. Browser checks on the built bundle: race score requested at race start, zero page errors; recovery-camera frames before/after in `docs/inkstorm-overhaul/evidence/handling-round40/`.
- Frame cadence is still unmeasured on a quiet machine.

## Next work, in priority order

1. Owner check of the lance, camera and music in the preview; then a quiet-machine cadence run and the promotion decision.
2. The gameplay list delivered with round 40 (excitement: rubber-band-free catch-up drafting, sector rivals, hazard events, shortcut gambles, damage-driven handling, reflect shield, lead reticle).
3. Remove the last 1.6% hull burial; rival line discipline on cambered straights.

## How to resume safely

Read this header and the round reports, then `git status --short --branch`. `npm run verify` for runtime changes; headless laps with `scripts/drive-balance.ts`; native evidence with `scripts/competitive-flow.ts`, `scripts/effect-stills.mjs` and `scripts/recovery-camera-frames.mjs`. Close every owned browser and server immediately after QA; never adopt port 5211; never save the shared Blender scene.

---

## Previous handover — Round 39 handover (2026-09-16)

## Start here

Round 39 is a correction round: the owner saw no improvement after round 38 because **the renderer drew simulation pitch with the wrong sign**, so every pod was pitched into or out of every slope regardless of what the physics did. That is fixed at every simulation-to-renderer boundary, and the shield/recovery/redline shells are now hull-fitted faceted skins instead of domes and discs. Details, before/after frames and the burial audit: [ROUND39_REPORT.md](docs/inkstorm-overhaul/ROUND39_REPORT.md). Earlier rounds: [ROUND38](docs/inkstorm-overhaul/ROUND38_REPORT.md), [ROUND37](docs/inkstorm-overhaul/ROUND37_REPORT.md).

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- Runtime source: commit `9ae4dd2` (round 39) on top of `1ddf44f` (round 38); preview deployment `dpl_G1zHXqbY9NrLojc1iWaKRVJS2WKC` (https://now-this-is-podracing-erps77ixl-amirs-projects-d9680079.vercel.app).
- Preview deployments come from the Git integration on push (owner Vercel sign-in required; the branch alias `now-this-is-podracing-git-codex-45ecfb-amirs-projects-d9680079.vercel.app` follows the branch). **Production is unchanged.** Never run `vercel deploy` from the working tree.

## Lessons that must survive

1. **Judge visual complaints from rendered frames, not simulation receipts.** `npx tsx scripts/competitive-flow.ts --battle --visual-gallery --output=<dir>` captures a real race; `node scripts/effect-stills.mjs <dir>` captures deterministic combat stills through the review API. View the PNGs before and after.
2. **Sim pitch is nose-up positive; three.js X rotation is nose-down positive.** `GameApp` racer poses, `WreckVisualPose`, `InkstormGhostView` and the rupture-direction Euler negate it. `scripts/hull-burial-audit.ts` measures hull-below-terrain in the renderer's convention (now 1.6% of ticks, worst 3.3 m; was 30–40%, worst 15 m).
3. `scripts/capture.mjs` times out on the current bundle and leaks its headless browser when it does; use the two scripts above instead, and `pkill -f chrome-headless-shell` only after checking the processes are yours.

## Validation

- Tests: 1029/1030 in the final run; the single failure is a 5 s timeout in `TeemtoSupportSettle` under a load average above 30 from the owner's video call, another project's dev server and its headless browsers. It passes alone and the suite passed 1030/1030 twice earlier today. Build passes. Native Battle on the built bundle finished with zero browser errors.
- Frame cadence is still unmeasured on a quiet machine.

## Next work, in priority order

1. Owner check of the fixed pitch and the new shells in the preview; then a quiet-machine cadence run and the promotion decision.
2. Remove the last 1.6% hull burial: outer-edge probes at ±6.4 m or a renderer-side clamp of each pod against the sampled terrain under its hull.
3. Damage-driven handling, a reflect-timing shield, rival line discipline on cambered straights, and the remaining roadmap items.

## How to resume safely

Read this header and the three round reports, then `git status --short --branch`. `npm run verify` for runtime changes; headless laps with `scripts/drive-balance.ts`; native evidence with `scripts/competitive-flow.ts`. Close every owned browser and server immediately after QA; never adopt port 5211; never save the shared Blender scene.

---

## Previous handover — Round 38 handover (2026-09-16)

## Start here

Round 38 answered the owner's two complaints and eleven improvement items on top of round 37: **scenery is solid, pods have real hulls and react to slopes and each other, combat is paced by finite lance cells with a target lock, drafting is visible, rivals fight by personality and remember who wrecked them.** Details and evidence: [ROUND38_REPORT.md](docs/inkstorm-overhaul/ROUND38_REPORT.md); the previous round's report is [ROUND37_REPORT.md](docs/inkstorm-overhaul/ROUND37_REPORT.md). Art direction, retained sky and the audio policy are unchanged.

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- Runtime source commit: `1ddf44f` (round 38), on top of `fcc639a` / `675d6ae` (round 37).
- **READY Preview (Git-triggered on push):** deployment `dpl_prhhjYbt43Ux3hESBGUffL4ET3md`, https://now-this-is-podracing-r23g13eyv-amirs-projects-d9680079.vercel.app (owner Vercel sign-in required; branch alias `now-this-is-podracing-git-codex-45ecfb-amirs-projects-d9680079.vercel.app` follows the branch). Remote build bundle `index-BP21Dlis.js`; local build `index-BP21Dlis.js`, 1897618 bytes, SHA256 `a413311e36c1dc00e5bd5a9f7eead77e55b55980b26bfd3b79bc2cfef6b1239e`.
- **Production is unchanged** (`dpl_9NaNFDVseLbS7AvkWRHqVUJnatcq`, source `b8ca960`). Promotion remains the owner's call after a controller playtest and a quiet-machine cadence run.
- Never run `vercel deploy` from the working tree (it archives ~17 GB of sources). Push the branch and let the Git integration build, or `vercel promote` a verified deployment.

## What changed in round 38

1. **Solid scenery** (`inkstormLayout.ts`): colliders for every family (fitted ellipses for buttress/spire/cliff strata, two measured arch legs, solid Foundry corridor landforms); the lance occluder uses the same proxies; `getInkstormSolidHeight` lets wreck poses lean on rocks. The pure grounding/corridor plans now live in `src/game/race/` with shims at the old renderer paths.
2. **Real hulls** (`config.ts`, `podracer.ts`, `RaceSimulation.ts`): nose probes at 17.5 m plus `hullKick` attitude correction; supported clearance judged by in-range probes; pod contact by engine capsules and a cockpit sphere (`closestHullContact`) with pace exchange on rubs; 31 m grid pitch; AI hull-overlap avoidance. `DRIVE5_COMPATIBILITY_CONFIG` keeps the legacy six probes for archived replays.
3. **Paced combat** (`galactic/system.ts`, `combatPickups.ts`): six lance cells, four aligned `lance-cells` pickups, 150 m/s lance, `target-lock` events and HUD target/ammo, impacts carry hull hit points and effects use them.
4. **Personalities and grudges**: `GalacticAITactics.style/playerId/sectionTag`; `rivalry` on the racer state, `rivalry-marked` event, HUD `REVENGE // NAME` cue, rivals prefer their grudge target.
5. **Drafting visible**: wake strength and slingshots drive the speed streaks.

## Validation and evidence

- `npm run verify`: TypeScript, **1030 tests / 175 files**, build pass ([log](docs/inkstorm-overhaul/evidence/handling-round38/validation.log)).
- Headless driver: ten clean laps across Canyon, Foundry and Glasslands (3 laps each) plus the Time Attack, zero player resets/wrecks/scenery contacts; two rival wrecks on the three-lap Canyon run (escarpment landings plus pack contact), none elsewhere ([receipts](docs/inkstorm-overhaul/evidence/handling-round38/)).
- Native browser Battle on the built bundle: finished, zero browser errors, 11 recordings loaded, live receipt shows target locks, lance-cell pickups, rivalry marks and takedowns; browser and server closed ([receipt](docs/inkstorm-overhaul/evidence/handling-round38/native-battle-receipt.json)).
- **Frame cadence is still unmeasured on a quiet machine.** Every `--performance` run this session coincided with an active video call on the owner's Mac. Run `npx tsx scripts/competitive-flow.ts --battle --performance --output=<dir>` when the machine is idle before any Production claim.

## Next work, in priority order

1. Redesign the generic shield shell and the green/red ground rings (owner complaint, not done): hull-hugging faceted shield with hit-point flicker, recovery as engine relight and sparks, redline as heat shimmer; move threat marking fully into the HUD.
2. Owner controller playtest of the solid world, hull contacts, lance pacing and pod identities; quiet-machine cadence; then the promotion decision.
3. Damage-driven handling (a hurt engine pulls, a broken repulsor lowers one side), a reflect-timing shield, and the remaining roadmap items (mastery, combat lesson, hardware profiling, multiplayer identity sync).
4. Harden `scripts/competitive-flow.ts` so a cadence failure still closes its browser and server.

## How to resume safely

Read this header and both round reports, then `git status --short --branch`. `npm run verify` for runtime changes; `npx tsx scripts/drive-balance.ts --only=<event> --laps=3 --identity=<pod>` for headless lap evidence; the competitive-flow harness for native browser evidence. Terrain field receipts are hash-pinned; re-pin with a digest script and prove untouched lanes identical when editing `CourseGulfField`. Close every owned browser and server immediately after QA; never adopt port 5211; never save the shared Blender scene.

---

## Previous handover — Round 37 handover (2026-09-16)

## Start here

Round 37 implemented the first four roadmap items on top of the published stylized restoration: **drive-6 handling, the course-10 banked flagship sweeper, world-occluded nearest-hit combat with threat-aware rivals, and four pod identities with sourced engine voices.** Full description, tuning rationale and evidence: [ROUND37_REPORT.md](docs/inkstorm-overhaul/ROUND37_REPORT.md). The art direction, retained dusk sky, audio bank policy (no generated audio; original voice unchanged) and the deterministic simulation authority are unchanged.

- Repository: https://github.com/TheDudeCommits/PodRacing, branch `codex/now-this-is-podracing`, working directory `/Users/amir/Projects/PodRacing`.
- Runtime source commit: `fcc639a73d0bcb55804373e1bdd11fc34f50d488` (preceded by `675d6ae`, the main round commit).
- **READY Preview (Git-triggered on push):** deployment `dpl_EMnzEd5Rs63T6rtdpnm93A6ctgy1`, https://now-this-is-podracing-8i1u2shak-amirs-projects-d9680079.vercel.app, branch alias `now-this-is-podracing-git-codex-45ecfb-amirs-projects-d9680079.vercel.app`. Vercel deployment protection redirects anonymous visitors to SSO; the owner's Vercel sign-in is required. The remote build produced `index-BgkzsTAX.js` (1,890.37 kB), matching the local build name; the local bundle is 1,890,373 bytes, SHA256 `ac4ae36f74a6d90a9d69d8f52ee47931b89846cca9d4ff5a30da5accb37fed65`.
- **Production is unchanged** (still `dpl_9NaNFDVseLbS7AvkWRHqVUJnatcq`, source `b8ca960`). Promotion is the owner's call; the new handling, banking and combat rules invalidate earlier records by design (`inkstorm-course-10`, `inkstorm-drive-6`).
- Do not deploy with `vercel deploy` from the working tree: the repository plus LFS sources exceeds Vercel's file limit and `--archive=tgz` tries to upload ~17 GB. Push the branch and let the Git integration build, or `vercel promote` a verified deployment.

## What changed (summary)

1. **Handling** (`src/game/simulation/config.ts`, `podracer.ts`): brake thrust cut, lateral scrub and trail-braking authority; steerable drift slip with a 0.36 s blended exit that converts scrubbed slide into forward travel; reduced airborne grip/steering with a 0.3 s regrip on landing; two-way repulsor attraction within range; bank assist and bank slide on cambered beds; per-landing damage cap 0.22 → 0.14. `DRIVE5_COMPATIBILITY_CONFIG` reproduces the old feel for the archived V9 wreck replays only.
2. **Circuit** (`CourseGulfField.bakeSweeperBanking`, `inkstormLayout.getInkstormTurnMarkers`): the flagship sweeper is cambered up to 0.24 rad in the shared physics/shader field; flagship roadside props halved (227 → 158 placements) and cleared from the sweeper; two wind-blade turn markers. The course-8 lanes outside the launch and sweeper editions are proven bit-identical (`tests/terrain/launchEdition31.test.ts`); the course-10 field is pinned in `tests/terrain/launchRidgeRound37.ts`.
3. **Combat** (`src/game/galactic/system.ts`, `RaceSimulation.lanceOccluder`): Heat Lance sweeps stop at scenery and canyon walls (`heat-lance-blocked` event), hits resolve to the nearest hull, mines to the nearest racer; rivals use `assessGalacticThreats` (cone target, clear line of fire, deliberate cadence, no fire from the grid, no shots at returning or shielded racers, mines only for real pursuers, shield only for inbound lance/mine/aimed rival); the driving AI avoids mines and no longer brakes for a rival leaving the grid; recovery immunity escalates with repeat wrecks. The line-of-fire sweep is evaluated only on ticks where a shot is possible (0.45 ms per headless Battle tick).
4. **Pods** (`src/game/podIdentity.ts`, `RaceSimulation.selectRacerPodIdentity`, garage card, audio): Teemto balanced, Sebulba fast/heat-sensitive, Polwo agile, Blockrunner heavy; identity is on the race entry, in snapshots and in the record identity; engine voices are the existing licensed loops (`RECORDED_ENGINE_VOICES`, credits updated); the fleet stays at four.

## Validation and evidence

- `npm run verify`: TypeScript, **1012 tests / 172 files**, build pass ([log](docs/inkstorm-overhaul/evidence/handling-round37/validation.log)).
- Headless input-only driver, ten clean laps across the three authored courses (Canyon ×3, Foundry ×3, Glasslands ×3, Time Attack ×1): zero player resets, wrecks or scenery contacts; identity laps Sebulba 54.0 s, Polwo 55.0 s, Teemto 55.5 s, Blockrunner 57.7 s ([receipts](docs/inkstorm-overhaul/evidence/handling-round37/)). Before the round the same driver reached 0.67 damage in two Canyon laps and wrecked in three.
- Native browser Battle on the built bundle through the ordinary gamepad driver: finished, zero browser errors, all 11 recordings loaded, takedowns credited; browser and server closed ([receipt](docs/inkstorm-overhaul/evidence/handling-round37/native-battle-receipt.json)).
- **Frame cadence was NOT measured validly.** Every `--performance` run this session coincided with an active video call / screen share on the owner's Mac (`avconferenced` and the VideoToolbox encoder at 20–25% CPU each), producing 10–20 FPS with quantized frame times; the harness also leaves no processes behind. Headless simulation cost is 0.45 ms per Battle tick. Re-run `npx tsx scripts/competitive-flow.ts --battle --performance --output=<dir>` on a quiet machine before any Production claim; the earlier 57.6 FPS figure belongs to the previous bundle.

## Next work, in priority order

1. Owner playtest of the four pod identities on a physical controller and listening approval of the engine voices; adjust `POD_IDENTITIES` scales, then admit two more finished models at a time.
2. Quiet-machine cadence measurement; then decide on Production promotion.
3. Roadmap items 5–8 remain: mastery calibration and rewards, HUD combat lesson and weapon-state icons, real-hardware profiling, private multiplayer checks (the room protocol still does not carry appearance/identity; remote humans race as Teemto).
4. `scripts/competitive-flow.ts` throws on cadence failure without closing its browser/server in that path; it did not leak this session, but harden it before relying on it unattended.

## How to resume safely

Read this header and the round report, then `git status --short --branch`. `npm run verify` for runtime changes; `npx tsx scripts/drive-balance.ts --only=<event> --laps=3 --identity=<pod>` for headless lap evidence; the competitive-flow harness for native browser evidence. Terrain field receipts are hash-pinned; when editing `CourseGulfField`, re-pin with a digest script and prove untouched lanes identical (see round report). Close every owned browser and server immediately after QA; never adopt port 5211; never save the shared Blender scene.

---

## Previous handover — Production handover (2026-09-15)

## Start here

The owner explicitly requested all latest changes committed/pushed and the current build deployed to **Vercel Production**. The tested stylized restoration is now promoted. The older Preview-only instructions in the historical sections below are superseded for this release. No new gameplay work was undertaken during publication.

- Repository: https://github.com/TheDudeCommits/PodRacing
- Working directory: `/Users/amir/Projects/PodRacing`. The session cwd `/Users/amir/Codex-ThreeJS` is an unrelated project.
- Branch: `codex/now-this-is-podracing`. Do not switch to `main` or merge branches merely to deploy; the project uses explicit Production promotion.
- Live game: https://now-this-is-podracing.vercel.app
- READY Production deployment: `dpl_9NaNFDVseLbS7AvkWRHqVUJnatcq`.
- Immutable deployment: https://now-this-is-podracing-fx5gmhrzp-amirs-projects-d9680079.vercel.app
- Runtime source commit: `b8ca960544180c2449f7ad940be8c97ab067d666`. The subsequent `716da122ab3e0e152f5323bd701f9885a5894318` and release-handover commits contain documentation/evidence only. The runtime source and public assets have no differences from the tested commit.
- Promoted from verified Preview `dpl_GPh7Z89niCAkBcenDJ2k9KSiu2AK`. Vercel created a new Production deployment while retaining the same runtime source metadata.
- Previous Production / rollback reference: V36 `a4bb70d104c997667d4e42d29c02831af2cbd788`, deployment `dpl_H7CSaEXCT9V4RnBBqvu1TMEnk95f`. This is historical, no longer the canonical live build.
- [Production publication receipt](docs/inkstorm-overhaul/evidence/stylized-production-20260915/publication.json).

## Current game and visual direction

Keep **V36 stylized terrain, orange/purple palette, cel outlines, pod materials, effects, menu and HUD**, with the **approved photographic dusk cloud sky**. The owner rejected photorealism for the rest of the world. Do not restart that direction or replace the retained sky. Photoreal experiments and source assets remain preserved in history, but their runtime modules are removed and their ground/rock textures are not requested by the game.

The menu has four race-type tabs, an inspectable 3D pod in the middle, necessary race options and Race. More holds secondary options. Eight-pod armed Battle is the default; Race, Time Trial, Cup, Daily, ghosts, records, Flight School and private PeerJS rooms already exist. Four appearances are registered: Teemto, Sebulba, Polwo and Blockrunner. The larger asset library contains 26 preserved vehicle families; most are not yet production-ready registrations. Current appearances share pod handling.

The retained sky lives in `src/render/sky/DuskSkyAssets.ts`, `DuskSkyShader.ts` and `src/render/objects/SkyAtmosphere.ts`. It has its own loader and photographed sun direction, independent of restored Production surface lighting. Keep reference-counted ownership, late-load isolation and disposal behavior. The 4K HDR costs roughly 85 MiB with GPU mipmaps; do not describe it as free or claim universal device performance.

Audio uses eight sourced SFX files plus existing Scott Buckley music. **Do not generate sound effects or music.** Audition replacements from licensed sources and preserve credits. Keep `public/audio/podracing-selection-intro.webm` unchanged: SHA256 `39c4d411570a2591be5cbf7fc27d86a63c36d3befa5de8d57c0d2018e1c89260`. Hidden-tab mute, settings accessibility and audio credits remain. Decoding and provenance checks are not listening approval.

## Validation and evidence

The frozen game bundle is `index-BW4j4KUa.js`, 1,874,964 bytes, SHA256 `d089a3500899cc149b9bc17ca882fff11359bc0da6b59679febb88a329f140cb`. Fresh Production browser smoke checks passed on 2026-09-15: exact bundle hash, four race controls and pod choices, rotation, audio settings/credits link, 390px menu without overflow, populated native-input Battle with all nine recordings and retained sky, pause and return to hangar. Zero browser errors; four pre-gesture AudioContext warnings. The browser was closed immediately after QA; no local server was started. [Release smoke receipt](docs/inkstorm-overhaul/evidence/stylized-production-20260915/production-smoke.json).

Prior exact-runtime validation on 2026-09-10: **980 tests /167 files**, TypeScript and build passed. A complete native eight-pod Battle averaged **57.630 FPS**, p95 16.8 ms, p99 33.4 ms, maximum 83.3 ms, on Apple M4 / Chrome153 /1440×900 CSS / adaptive DPR1–2. All 6,728 racing frames were included. This is a specific desktop browser cadence measurement, not physical-device or human driving acceptance. Publication does not introduce runtime changes, so the suite and full-race profiling were not repeated on 2026-09-15. [Native receipt](docs/inkstorm-overhaul/evidence/stylized-return/native-battle-summary.json), [validation](docs/inkstorm-overhaul/evidence/stylized-return/validation.txt), [restoration check](docs/inkstorm-overhaul/evidence/stylized-return/visual-check.md).

## Next work, in priority order

The [full roadmap](docs/inkstorm-overhaul/STYLIZED_RETURN_ROADMAP.md) has concrete scope, source evidence and acceptance goals. These items are **not completed by this release**. Begin with handling, then one authored circuit, then fair combat.

1. **Handling:** predictable braking and drift exit, smoother hover damping and landings, fewer unexplained launches. Ten clean laps across three authored courses; version physics/records when behavior changes. The prior terrain-relative suspension experiment caused flight/landing damage and was withdrawn; do not restore it blindly.
2. **One polished circuit:** readable banked sweepers, long acceleration sections, technical canyon, risky shortcut, clear exit sightlines and restrained landmark composition. Improve the core lap before adding procedural variety.
3. **Fair combat/rivals:** world-occluded shots and nearest swept hits; threat-aware AI rather than periodic shielding/attacks; fewer unavoidable repeat wrecks. Existing Heat Lance checks racers without world occlusion and returns the first intersected roster entry.
4. **Pod identities/fleet:** distinct balanced/agile/heavy/fast heat-sensitive handling and sourced engine identities; add finished models two at a time with drivers, LODs, source credits and actual race QA.
5. **Mastery/replayability:** calibrate medals per track/pod, meaningful Daily rewards, cosmetics/rival unlocks and sector practice. Existing ghosts/Daily/Cup are a base, not new features to claim.
6. **HUD/audio/onboarding:** concise weapon state feedback, a visual combat lesson and complete-race auditions of licensed effects. Keep UI text minimal and essential information legible.
7. **Real hardware reliability:** 20-minute 40–60 FPS tests on named devices including hitches and resource growth; physical touch/controller/deadzone/reconnect and full Cup/garage cycles.
8. **Private multiplayer:** real two-network latency/loss/reconnect/rematch checks and selected pod appearance synchronization. Defer trusted ranked results until authoritative validation exists.

## How to resume safely

Read this header, the roadmap and `ARCHITECTURE.md`; run `git status --short --branch`, `git remote -v`, and inspect current Production metadata before making new claims. Source archives and documentation images use Git LFS; a fresh checkout needs `git lfs pull`. Public runtime assets are regular Git. Install from the lockfile with `npm ci` if needed.

Use `npm run verify` for changed runtime code, `git diff --check`, and targeted existing scripts for actual browser/race checks. `npm run dev -- --port <free-port> --strictPort` starts a local server. Do not adopt port5211. `scripts/competitive-flow.ts --battle --performance --output=<directory>` is the existing native Battle harness; it needs a TypeScript runner. `scripts/salt-dusk-gallery.mjs` is a diagnostic staged-position gallery, not native driving or FPS evidence. Distinguish these evidence types.

Preserve deterministic simulation authority: renderer, HUD, audio and effects consume snapshots/events without changing gameplay state. Preserve saves and original source/provenance. Never save or alter an unrelated shared Blender GUI scene. **Close every owned browser and server immediately after QA.** Do not create automations or leave background work running without a new user request.

Vercel project `prj_WjikzPmEjdKtnnXBkHgLAze2dKdY`, team `team_9UHUI9xdsOl7LAy5xl8hUIV6`, scope `amirs-projects-d9680079`; local project link is `.vercel/project.json`. Keep credentials and `.env*` out of Git. For a future explicitly approved publication, promote an already verified deployment with `vercel promote <deployment-id> --scope amirs-projects-d9680079 --yes --timeout 60s`, then verify READY, source metadata, canonical alias and real browser interactions. Vercel can create a new deployment ID during promotion. A successful command alone is not final acceptance.

---

## Historical handover — superseded release status below

# PodRacing — Production style with retained dusk sky (2026-09-10)

The owner rejected photorealism and requested Production visuals with the current sky retained. **Active direction: Production V36 stylized art plus the approved photographic cloud sky.** Do not resume the rejected photoreal surface/geometry direction. [Current restoration and prioritized improvement list](docs/inkstorm-overhaul/STYLIZED_RETURN_ROADMAP.md).

Verified Production baseline: a4bb70d104c997667d4e42d29c02831af2cbd788 / dpl_H7CSaEXCT9V4RnBBqvu1TMEnk95f, READY at https://now-this-is-podracing.vercel.app. Worktree /Users/amir/Projects/PodRacing, branch codex/now-this-is-podracing; remote TheDudeCommits/PodRacing. /Users/amir/Codex-ThreeJS is unrelated. Publish the updated build as Preview under the existing checkpoint workflow; Production promotion remains subject to owner approval.

Restored Production materials, terrain/height field, geometry placement/asset mappings, cel post/ink, shadows, gameplay FX, UI and actual pod preview. Retained the exact current 4K sky bytes and shader math in independent src/render/sky modules; Production surface lighting retains its original direction. No dusk ground/rock or replacement-geometry requests occur. Unused photo runtime modules are removed; source assets and historical evidence remain preserved. All 24 restored source/test files match Production exactly.

Audio is not rolled back: preserve the eight-file sourced SFX bank, existing Scott Buckley music, hidden mute and original voice SHA256 39c4d411570a2591be5cbf7fc27d86a63c36d3befa5de8d57c0d2018e1c89260. All 44 audio source/runtime files match checkpoint 2; no sound was generated. Settings accessibility and credits remain.

TypeScript/build and 980 tests /167 files pass. Every staged world capture uses mrt-sobel; sky ready, no rejected photoreal requests and no browser errors. Exact final native eight-pod Battle: 57.630 FPS mean, p95 16.8 ms, p99 33.4 ms, maximum 83.3 ms on M4/Chrome153/1440×900/adaptive DPR1–2; 6,728 frames, none excluded. All 9 recordings loaded, post mrt-sobel active, browser/server closed. [Current native receipt](docs/inkstorm-overhaul/evidence/stylized-return/native-battle-summary.json). Runtime index-BW4j4KUa.js / 1,874,964 bytes / SHA256 d089a3500899cc149b9bc17ca882fff11359bc0da6b59679febb88a329f140cb. [READY Preview](https://now-this-is-podracing-2mtbhpcyn-amirs-projects-d9680079.vercel.app), deployment dpl_GPh7Z89niCAkBcenDJ2k9KSiu2AK, runtime commit b8ca960544180c2449f7ad940be8c97ab067d666. All seven hosted interaction checks pass against the exact frozen bundle, with no errors and the browser closed. Protected access was renewed after the first authentication link failed; owner Vercel sign-in may be required. [Publication receipt](docs/inkstorm-overhaul/evidence/stylized-return/publication.json) · [Hosted checks](docs/inkstorm-overhaul/evidence/stylized-return/deployed-receipt.json). Production remains unchanged; no promotion performed. Subsequent documentation commits do not change runtime code or assets. Older FPS measurements below do not apply.

Next proposed priorities: handling, one authored circuit with clear flow, fair world-occluded/nearest-hit combat, distinct pod handling, deeper mastery rewards, clear onboarding/audio, actual hardware validation and reliable private multiplayer. No roadmap feature is implemented by this visual rollback. Keep deterministic simulation separate from presentation; do not restore the withdrawn V36 suspension experiment. Close browsers/servers after use, never adopt port5211 and never save shared Blender GUI state.

---

## Historical checkpoint 2 — photoreal direction rejected

# PodRacing — Salt Flats at Dusk checkpoint 2 (2026-09-10)

The owner rejected checkpoint 1 as unaesthetic and its SFX as weird. Current revision rebuilds cloud lighting, continuous distant ranges, prominent eroded rock meshes, outer salt runoff, grounded 3D inspection, lighter HUD/exhaust and an eight-file sourced SFX bank. **The photographic target is incomplete.** [Current report, evidence and remaining work](docs/inkstorm-overhaul/SALT_DUSK_CHECKPOINT_2.md).

Worktree `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `TheDudeCommits/PodRacing`. `/Users/amir/Codex-ThreeJS` is unrelated. Publish as Preview; obtain the requested owner checkpoint approval before Production promotion. Production remains V36 / a4bb70d104c997667d4e42d29c02831af2cbd788 until approval. No automation was created.

Frozen runtime: **index-DSU6k9pU.js**, 1,878,130 bytes, SHA256 **4e51f10f6b53b5dd13eb77b1240a9165d853f4d1eded5740f53da4dc19da6b2c**. All **983 tests /169 files**, TypeScript, build and diff checks pass. Exact final native eight-pod Battle: **59.919 FPS mean, p95 16.7 ms, p99 16.8 ms, maximum 66.6 ms**, M4/Chrome153/1440×900/adaptive DPR1–2. Slow frames included; do not transfer this measurement to another runtime/device. All9 audio recordings (8SFX+music) load, errors empty, browser/server closed.

Fresh blind critic: **6/10 aesthetics, 4/10 concept match**, progress Preview only. The main racing surface still reads as dunes; simplified mesas, skyline/world material mismatch and cinematic racing atmosphere remain open. The earlier giant-range pass was rejected and withdrawn. Keep diagnostic course-seek imagery distinct from native populated-race imagery and cadence receipts.

Only outer basin terrain changes; published main/shoulder/normal field hashes remain exact. A full-lane fill was withdrawn after regression failures; it is not in this build. The new ranges add58,392 triangles/3meshes. Refined arch/wind-blade originals remain preserved with CC0 provenance and clearance validation. Legacy painted shadow stamps are removed; real mesh/terrain/racer shadows remain. The 4K HDR increases GPU memory materially (~85MiB sky+mips); broad hardware profiling remains open.

Do not generate audio or alter `public/audio/podracing-selection-intro.webm` (SHA25639c4d411570a2591be5cbf7fc27d86a63c36d3befa5de8d57c0d2018e1c89260). V2 uses existing conventional catalogue effects and an unchanged Scott Buckley music excerpt; no listening approval is claimed. [Audio report](docs/inkstorm-overhaul/SALT_DUSK_AUDIO_V2.md). Private creator-page HTML caches are ignored; published sources have a separate inventory. Four of26 vehicle families remain registered; original broader eight-item backlog is not complete.

[Play the READY Preview](https://now-this-is-podracing-hqdpkcr4o-amirs-projects-d9680079.vercel.app). Deployment `dpl_AtuCyBwx4R9DxhbezjhbdkikpiFc`, runtime commit `9f10c38cfd6163b2437e6af83aeb17e817fa678f`. Hosted browser verification loaded the exact tested bundle and passed all seven interaction checks with no errors; browser closed. [Publication / unchanged Production receipt](docs/inkstorm-overhaul/evidence/salt-dusk-checkpoint2/publication.json) · [Hosted checks](docs/inkstorm-overhaul/evidence/salt-dusk-checkpoint2/deployed-receipt.json). The Preview may require the owner’s Vercel sign-in. Production remains V36 until owner checkpoint approval; no promotion was performed. This subsequent documentation commit changes no runtime assets or code.

Close owned browsers and servers immediately after use. Never adopt port5211 or save the shared Blender GUI scene. All current agents are finished; no background job is intended to continue.

---

## Historical checkpoint 1 — rejected by owner

# PodRacing — Salt Flats at Dusk checkpoint 1 (2026-09-10)

The owner approved the Salt Flats at Dusk photographic concept, requested only sourced existing audio (no generated audio), preservation of the original podracing voice, and a more futuristic minimal HUD. This checkpoint implements the material/lighting foundation, recorded audio bank and dusk UI. [Current report and next priorities](docs/inkstorm-overhaul/SALT_DUSK_CHECKPOINT_1.md).

[READY Preview](https://now-this-is-podracing-dsj7cmxa7-amirs-projects-d9680079.vercel.app), deployment `dpl_AsuF4P6Bz4iRzpp1hpRBFWK4fx5z`, runtime commit `ce60ca14b4b9f748dc0c4dc8b4aeab08bf8a8151`. Hosted exact-bundle verification and seven native interaction checks pass; browser closed. [Publication and unchanged Production receipt](docs/inkstorm-overhaul/evidence/salt-dusk-checkpoint1/publication.json). Approval to promote is pending; no automation was created.

Worktree `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `TheDudeCommits/PodRacing`. Baseline a4bb70d104c997667d4e42d29c02831af2cbd788. The unrelated `/Users/amir/Codex-ThreeJS` is not this game. Publish this checkpoint as **Preview** and obtain the requested owner checkpoint approval before promoting Production. Vercel’s Git production branch is `main`; our working branch is `codex/now-this-is-podracing`.

Frozen runtime: index-DHCXwEh-.js, 1,872,109 bytes, SHA256 21e5342d01a6da615856cfabccd6c7e23e41aa3f4bbc982d6e5564a001cbfb28. The frozen final source passes all 971 tests /166 files, TypeScript and build. Exact final native eight-pod Battle: mean 59.910 FPS, p95 16.8 ms, p99 16.8 ms, maximum race frame 33.4 ms, M4/Chrome153/1440×900/adaptive DPR1–2. Recovery prevents PB as intended. All27 audio files load; no browser errors; owned browser/server closed. Do not transfer this measurement to any changed runtime or other device.

Fresh blind visual critic: overall5.5/10, concept match3.5/10. **Early progress Preview only**. Existing hilly geometry/white banks, repetitive cliffs, sky composition and geometric exhaust remain visibly below the concept. Current diagnostic gallery uses staged scene positions; separate native Battle proves actual populated play. Audio provenance/decoding is verified; perceptual listening acceptance is still the owner’s review.

New ownership: `src/render/saltDusk/` shares photographic assets across world/inspector with generation-safe leases; source glTF metallic/roughness/normal maps remain authoritative. Cel post/outline installation is disabled. Road shading normals changed but physical heights did not. Recorded audio replaces active synthesis; zero vehicle loops in garage and zero master gain when hidden. Do not generate audio or change `public/audio/podracing-selection-intro.webm`. Credits are linked in Audio settings.

No simulation/handling changes or new vehicle families this checkpoint. Preserve the V36 warning against the withdrawn terrain-relative suspension experiment. Close owned browsers after use; never adopt port5211 or save the shared Blender scene.

---

## Prior Production: PodRacing — Round 36

The user resumed development after V32r1 and prioritized a radically simpler setup, visible rivals/weapons, clear runoff and satisfying map/pod physics. Crashes are acceptable for now; do not divert the next round into another crash art loop. The broader eight-item backlog remains authorized and incomplete. [Current report](docs/inkstorm-overhaul/ROUND36_REPORT.md) records accomplishments and all remaining items.

Current implementation is on `codex/now-this-is-podracing` in `/Users/amir/Projects/PodRacing`, based on `5925d437f97b57939ffbf02306979d238627491e`. `/Users/amir/Codex-ThreeJS` is unrelated. Remote: `TheDudeCommits/PodRacing`. Runtime source is frozen; final complete-race and resource checks pass. Publication and canonical-site verification are recorded on the V36 release page. Do not transfer earlier exact-build measurements to a changed bundle.

Implemented: four race tabs; one actual inspectable 3D pod; only difficulty/laps where adjustable; Race; optional More. New sessions open eight-pod weapon-enabled Battle, with clean Race / Time Trial / Cup separate. Shared route-light/collider positions have clear runoff. Heading-correct collision torque is retained. Experimental terrain-relative suspension and landings were withdrawn after full-race failures; released suspension/gravity/damage settings are preserved. Menu focus/remapped weapon captions are fixed. A cached-return inspection bug was reproduced and corrected while preserving GPU release at race start.

Validation: **961 tests / 164 files, TypeScript and build PASS**. Final native Time Trial (clean 63.742 s PB), Cup round one (clean two-lap 126.958 s PB, points saved, Continue → Foundry) and armed Battle (101.183 s finish, recovery correctly prevents PB) pass. Mean racing cadence is **59.594 / 59.158 / 59.417 FPS**, p95 16.8 ms each, on M4 / Chrome 153 / 1440×900 / requested DPR 2 with adaptive resolution. Three diagnostic resource cycles plateau at identical second-to-third stage counts, with two contexts during actual inspection and one during racing. All owned browsers and servers closed.

Fresh blind UI critic **APPROVE 8.9/10** covers supplied stills only; native four-viewport controls, real inspection and weapons pass. World visuals, physical devices and full benchmark acceptance remain open. Final bundle: `index-DH3wvA-l.js`, 1,882,556 bytes, SHA256 `e507c666fbe809c2275fa90a1d7434afce9a96be1e9d0a68ab0ee46616639a53`. Use the [V36 release record](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v36-20260909) for exact publication commit, deployment and QA archive. The failed relative-hover experiments are archived and unreleased.

Evidence: `output/simple-race-setup/`, `output/handling-round36/`, `output/round36-handling-review/`, `output/round36-handling-rereview/`, `output/gauntlet/round36-*/`, `output/playwright/round36-*/`, and `output/release/round36/`. Essential actual screenshots are in `docs/inkstorm-overhaul/evidence/round36/`. The release attachment will carry raw current measurements and preserved failures. No source changes have admitted additional vehicle families: four of26 remain registered.

Reference https://www.youtube.com/watch?v=1FwcQlBZFP0:21 timeline positions,34 contiguous paused positions and26 playback samples inspected. Whole-video every-frame and audio coverage is NOT complete. Study: `docs/inkstorm-overhaul/round36-reference-study/REPORT.md`; navigation caption export remains local-only under output. Close owned browsers/servers after use, never adopt port5211, and preserve the shared Blender scene without saving.

## Published V32r1 checkpoint (historical)

The user requested that development stop here and the current work be pushed and deployed. **V32r1 is the frozen playable checkpoint; the AAA visual overhaul remains incomplete.**

TypeScript/build and **938 tests / 158 files** pass. Native crash/control cases, the fresh Kodo Heat Lance takedown and 17 UI captures pass. Complete races measured **59.532 / 59.132 Hz** on M4, p95 **16.8 ms** each. Fresh visual critics remain below target: crash **5/10**, HUD style/readability **7/7.5**. Four of 26 preserved vehicle families are registered; 22 remain pending.

[Accomplishments and remaining work](docs/inkstorm-overhaul/RELEASE_REPORT_2026-09-09.md) · [Actual visuals](docs/inkstorm-overhaul/CURRENT_VISUALS.md) · [Release / deployed commit / QA archive](https://github.com/TheDudeCommits/PodRacing/releases/tag/inkstorm-v32r1-20260909) · [Game](https://now-this-is-podracing.vercel.app).

Exact build: `index-FTaKHRwm.js`, 1,864,215 bytes, SHA-256 `5b97c68cb6f232ac48260142f377f7b5eea8dbbf859e3dda3770ba9d36284ee8`. The release page records publication verification; the build is deployed from the frozen static output.

Work in `/Users/amir/Projects/PodRacing`, branch `codex/now-this-is-podracing`, remote `TheDudeCommits/PodRacing`. The pre-overhaul baseline is `0f0e8ab209cc5156efaf92b545630bd243b14478`; use the release tag for this checkpoint's commit. `/Users/amir/Codex-ThreeJS` is unrelated. Preserve all source and historical evidence. Large source assets require `git lfs pull`; public runtime assets are regular Git.

The user has now requested further development. Ivory's scene165 finish and V2 torso/wear plan remain private/unexported. The high-speed V32r1 supplemental visual review stopped at its coarse/adjacent locator when shipping was requested; the primary crash review and native high-speed controls are complete. Close owned browsers after use, never adopt port5211 and never save the shared Blender file.

[Exact preceding handover](docs/inkstorm-overhaul/evidence/round-35/pre-release-v32r1-documentation/HANDOVER.md) · [Older complete history](docs/inkstorm-overhaul/evidence/round-35/pre-v29-documentation/HANDOVER.md).
