# Thrustline — the AAA visual overhaul (Round 54, 2026-09-26)

Owner decisions (26 Sep 2026): **A · Cinematic Stylized** art direction;
**original IP** (rename the game, pods and pilots, replace the replica models);
stay **on the web**; **feature freeze** on new weapons and modes; generated,
on-brand audio is allowed. The plan and target frames are in the audit page
published for the owner.

Working title: **Thrustline** (trademark search still owed). Branch
`overhaul/aaa`, created from `codex/now-this-is-podracing`. Not yet committed,
pushed or deployed.

## What changed, by system

### Light and post (`src/render/post/`, `src/render/lighting/`)
- `CelPostPipeline` now renders the beauty pass into a half-float HDR target
  with a depth texture. Order: MRT prepass → HDR beauty → Sobel ink → bloom mip
  chain (13-tap Karis downsample, tent upsample) → depth-masked god rays →
  grade → FXAA. Public API unchanged; `setQualityLevel()` sheds bloom levels and
  rays under the performance governor.
- `cinematicShaders.ts` grade: height fog with sun in-scattering from depth,
  Khronos PBR Neutral tone mapping, CDL + split-tone grade, speed blur,
  chromatic fringe, impact flash, vignette, grain.
- `CinematicLook.ts`: one look per world (Sunscar, Frostline, Ember Rift,
  Verdant) — exposure, bloom, rays, fog and grade.
- `WorldLight.ts`: one shared sun (`WORLD_SUN`) for every surface shader, the
  static shadow bake and the post chain; `SKY_SUN` lines rays up with the
  painted sun disc. Per-world sun presets. The legacy stepped haze is scaled
  down (`LEGACY_HAZE`) because the post fog now does aerial perspective.

### Worlds
- **Ground materials** (`terrain/worldMaterialShader.ts`): the desert shading is
  gradient-mapped into each world's palette, then world features are layered:
  lava rivers with crusted plates and hot seams (Ember Rift), polished ice sheets,
  cracks and glacier cliffs (Frostline), moss, loam, puddles and
  bioluminescence (Verdant Run). `CourseDistanceField` (512² distance-to-line
  texture) keeps lava, ice and water off the racing line and the launch grid.
- **Skies** (`sky/DuskSkyShader.ts`): the approved photograph stays for Sunscar;
  Frostline gets aurora curtains; Ember Rift is a scene-referred smoky night with
  a volcano silhouette, lava threads and a lit ash column; Verdant Run gets a
  humid green veil. The sun disc moved after the tone curve so it blooms.
- **Scenery** (`inkstorm/RacingBiomeScenery.ts`): glowing ice rims, basalt stacks
  with organic magma cracks, and the shared pit/refinery kit weathered per world
  (`InkstormSurfaceMaterial` `uWeather`: snow caps, soot and embers, moss and
  creepers).
- **Verdant canopy** (`inkstorm/VerdantCanopy.ts`): buttressed giants lean in
  from alternating shoulders so crowns close over the track 40–70 m up; hanging
  vines; god rays and dappled baked shadow through the gaps. Trunks stay 18 m
  outside the racing envelope.

### Set pieces (`src/render/setpieces/`)
- **The Colossus** (`ColossusRibcage.ts`): the fossil of a colossal beast lies
  on its side along Sunscar's first fast straight. Nine ribs arch 40–70 m over
  the track from a half-buried spine, with a skull mound and two tusks at the
  entrance. Procedural, one draw, about 17k triangles, casts into the static sun
  shadow atlas. Placement is chosen deterministically (straightest open stretch,
  clear of the grid, forks and structures). Presentation only; nothing in the
  racing envelope sits below 24 m (tested).
- **Start ceremony** (`StartCeremony.ts`): the grid gantry's five lamps count
  two, four and five reds, then all green; painted bracket slots under every pod
  pulse with each call and ripple forward on GO; a curtain of sparks pours from
  the crossbar. Reads the countdown; never drives it.

### Effects and camera
- HDR exhaust plumes and energy arcs; CPU rooster tails of sand, snow, ash or
  spray under the engines (`terrain/RoosterTails.ts`); an ambient mote volume
  (dust, snow, embers, spores) around the camera (`terrain/AmbientMotes.ts`);
  HDR course beacons coloured per world.
- `CinematicCamera`: speed and boost FOV kick, and a pull-in that keeps the
  chase eye out of scenery.

### The original fleet and IP reset
- Eight original craft (Kestrel, Scrapjack, Hornet, Bulwark, Sirocco,
  Longshot, Glasswing, Crucible) in `public/assets/fleet/`, Draco + WebP,
  1.2–2.4 MB per hero. Pipeline and provenance: `scripts/fleet/README.md`.
- The runtime resolves only the fleet (`getVehicleArtDefinition`). The 155 MB of
  replica packages moved out of `public/` to `tests/fixtures/legacy-pods/` with
  their definitions in `tests/fixtures/legacyVehicleArt.ts`, so the damage,
  wreck and camera contracts measured on them keep running.
  `RacerPresentation` takes an optional art resolver for those tests.
- Name, title, menu wordmark, destinations (Sunscar Canyon), labels and
  aria text are original. Save-compatibility storage keys and internal slot ids
  are unchanged.

### Menu and audio
- Full-colour fleet cards and garage model, warm hangar screens, and a backlit
  THRUSTLINE nameplate on the cockpit panel.
- An original announcer (Higgsfield text-to-speech, ElevenLabs engine, preset
  voice "Knox"): welcome, countdown, final lap, rivalry beats, takedown,
  victory, race over, and a call for each world when it is picked. Mastered
  with a stadium PA treatment; provenance and hashes in
  `assets/source/audio-announcer/`.

### Asset diet
- Replica packages out of the deploy (−155 MB). The four large paint textures
  are WebP (9.5 MB → 1.2 MB, 38–44 dB PSNR). `public/` 226.9 MB → 72 MB. Local
  production build: download before the menu 33.5 MB, cache off (49.1 MB live).

## Verification
- `npm run typecheck` and `npm run build` pass.
- `npx vitest run --testTimeout=60000`: every file passes except the 14 files
  that also failed in the pre-overhaul baseline on this machine because their
  Git LFS source packages are not present (`assets/source/...` LFS pointers).
  Run the full suite on a machine with LFS objects pulled before merging.
  Several simulation and terrain tests have hard 20 s budgets; on a heavily
  loaded machine they time out and pass when run alone or with longer budgets.
- New tests: `tests/render/setPieces.test.ts` (Colossus placement and
  clearance, ceremony sequencing and spark lifetime, draped grid paint, canopy
  trunk clearance and lean), fleet contract in
  `tests/settings/vehicleAppearance.test.ts`, fleet framing in
  `tests/camera/CinematicCamera.test.ts`.
- Draw calls in race: 80–134 across the four worlds (budget 150).
- Showreel: `node scripts/trailer/v7/capture.mjs` then
  `node scripts/trailer/v7/edit.mjs` (local, gitignored `output/trailer-v7/`):
  43.7 s, 1080p60, −14.3 LUFS. Showcase page with the showreel and
  same-moment before/after frames: https://claude.ai/artifact/QFwsn7C81a6J65HvJAYUBp

## Owner-owned next steps
1. Trademark check for "Thrustline"; confirm or pick from the shortlist.
2. Review on `overhaul/aaa`, then push for a Git preview; promote only after
   owner approval (`npx vercel promote <url> --scope amirs-projects-d9680079`).
3. Run the full test suite with LFS objects present.
4. The fleet has no authored damage variants yet; wrecks use the generic path.
5. `public/audio/podracing-selection-intro.webm` (the owner-supplied menu intro
   clip) is no longer played; the menu opens with the announcer's welcome.
   Remove it from `public/` if it quotes the film (its bytes are pinned by
   `tests/audio/menuMusic.test.ts` and used as a fixture by the audio tests).
6. Follow-ups: compress the 4K HDR sky (pinned by the approved-sky tests; EXR or
   KTX2 would save about 9 MB), rival LODs, KTX2 textures, crowds at the grid,
   weather events, a commissioned score.
