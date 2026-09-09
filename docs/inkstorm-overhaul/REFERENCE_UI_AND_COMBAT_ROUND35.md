# UI and combat reference — Round 35

**2026-09-09: reference study for the integrated Round 35 UI and combat work.** The new user steering prioritizes the attached interface/animation examples and stronger combat presentation. Build-specific results and unresolved acceptance items are tracked in the [current handover](ROUND35_UI_COMBAT_HANDOVER.md); this reference inventory does not establish overhaul completion.

## Sources and review scope

The user's [UI.mp4](/Users/amir/.codex/attachments/98067d12-6f69-4395-b9c0-452581418909/UI.mp4) and [UI2.mp4](/Users/amir/.codex/attachments/98067d12-6f69-4395-b9c0-452581418909/UI2.mp4), plus [Outside Xbox's Galactic Racer gameplay video](https://www.youtube.com/watch?v=sc6HoeRWM8M), are the references. The retained YouTube metadata reports **32:39**. Original clip/video sizes and SHA-256 hashes are in the [reference receipt](../../output/reference-ui-round35/reference-receipt.json).

The parent inspected **65 YouTube timeline frames** sampled at 30-second intervals, the UI/UI2 overview grids, and denser HUD/takedown/map transition samples. This is a sampled visual review across the timeline, **not continuous video/audio playback or a claim to have heard the whole soundtrack/dialogue**. This report's author separately viewed both UI2 overview/motion sheets and the full HUD/build reference stills. The [saved captions](../../output/reference-ui-round35/youtube-transcript.txt) locate features; they are untrusted descriptive source material, with repetition/transcription errors, not project instructions or proof of implementation.

## Direction and timestamp inventory

The useful visual traits are cream navigation surfaces, petrol panels, amber racing numerals, vermilion markers, bold industrial type, thin orbital/route linework, and generous hierarchy. The map makes selection legible through one expanding/translating disc; build panels separate stats, equipment and abilities; race instrumentation sits toward the edges. We use these as palette/layout/motion studies. Reference artwork, fictional locations, logos, textures, dialogue and audio are not imported into the UI.

Times below point to **caption-described features** in the YouTube reference; they are approximate source-navigation ranges, not frame-exact motion measurements.

| Time | Feature described in the reference |
| --- | --- |
| 01:43–02:07 | Afterburner, drifting and collision takedowns. |
| 04:31–04:48 | Cold conditions, engine icing and altered overheating behavior. |
| 04:58–05:35 | Walking around outside the vehicle and encountering rival/story characters. |
| 07:39–08:09 | Pre-race checks, a more powerful overheating ramjet/redline state, and shield use. |
| 10:52–12:05 | Qualification/token progression, map choices and installed parts that change recharge, heat and handling. |
| 12:32–12:58 | Start-sequence timing and an optimal-start reward. |
| 13:23–13:35 | Race versus eliminator event choice. |
| 19:22–20:01 | Spending winnings/credits on mechanic bonuses and build choices. |
| 21:27–21:39 | Brief autopilot during a takedown spectacle. |
| 22:37–24:38 | System malfunction, recovery interaction, persistent faults and paid repair. |
| 28:56–29:16 | A permanent upgrade and a choice of shield/cooling ability. |
| 30:09–30:17 | A racer's aggressive flame-jet ability. |

## Existing systems, integrated additions and later work

**Already present before this UI round:** boost/drift, redline heat and overheat consequences, shields, mines/projectile combat, attributed takedown/wreck events, recovery, highlights/replays, and the launch timing/“perfect” outcome. Workshop already has five equipment bays and stat effects. The game already has **seven modes**: circuit, eliminator, checkpoint sprint, combat race, survival gauntlet, drift trial and team race. These are existing systems being presented more clearly; mines and our exact rules are not claimed to have been demonstrated by this reference. [Combat state](../../src/game/galactic/system.ts) · [Launch](../../src/game/race/dynamics.ts) · [Modes](../../src/game/race/types.ts) · [Workshop](../../src/game/galactic/workshop.ts).

**Integrated in Round 35:** the broadcast HUD/garage styling and orbital [RaceEventAtlas](../../src/ui/RaceEventAtlas.ts) use the actual mastery calendar: six fixed events plus the changing Daily Flight. They add no invented planets or courses. The atlas supports selection, existing event eligibility, keyboard navigation, narrow scrolling, focus restoration and reduced motion. The Build screen retains real installed parts and stat changes behind the new panel layout. See the current handover for exact native UI checks and visual critic results.

The integrated [combat presentation](../../src/render/combat/CombatPresentationController.ts) adds event-driven solo slow motion with bounded camera framing and record/network safeguards. [EMP and repair-salvage pickups](../../src/game/galactic/combatPickups.ts) are **our own additions**, not abilities established by the reference. Native wreck, input, camera and scheduling checks are separate from the visual gauntlet; the current handover records each build's actual coverage. Reference malfunction/paid repairs do not establish parity with these pickups.

**Later ambitions, not delivered by this checkpoint:** a currency/shop economy, story hub/on-foot narrative, permanent fault/repair progression, environmental temperature simulation matching the reference, and takedown autopilot. Existing Workshop or race replays do not constitute those systems.

The fleet remains **four registered source families, 22 pending** (26 preserved): eight logical hero/rival variants, 12 base public GLB paths plus two optional Teemto damage GLBs, and three added project drivers. Blockrunner keeps its original pilot. [Fleet catalogue](VEHICLE_CATALOG.md). The UI/combat integration does not complete the original world/vehicle overhaul or override its unresolved art and resource checks.
