# Salt Dusk audio revision 2 — candidate for listening review

The owner rejected the first recorded audio palette as weird. This revision replaces its propulsion and combat selections rather than only turning down the same car, fan, household wind and beeps. It is a candidate implementation, not an approved sonic result.

## Audible roles

- One main propulsion source: qubodup's **Rocket Boost Engine Loop**, published 2012 under CC0. The creator made it for a robot-flight game. It is existing conventional sound design, not a claimed raw jet recording. The retrieved file is the creator page's public HQ MP3 preview, not the login-required original WAV.
- Two quiet rival voices at most: Little Robot Sound Factory's **Medium SpaceShip Engine Loop**, from its 2015 Sci-Fi library, CC BY 3. Rivals beyond 70 m are silent. Each rival's source gain is at most 0.0306, compared with the player's 0.13–0.36; distant field chatter is removed.
- Boost/launch: dklon's existing 2013 **Jet Engine Takeoff**, CC BY 3. The creator describes a Doppler-adjusted jet effect. One source maximum and 1.6 s retrigger interval. No fan or wind layer remains.
- Weapons: the existing short **Laser09** from Little Robot; **Laser07** for shield/EMP. These replace the previous Kenney laser/electric/computer-noise selection. All are existing designed effects from the same 2015 library, not newly generated sounds.
- Hull/ground and weapon impact: **Heavy Metal Thud on Ground**, 7of9Designs, June 2022, CC0. Creator describes a heavy metal object striking dirt. Wrecks/mines use Michel Baradari's 2009 **explode.wav**, CC BY 3; the source archive includes its original license/credit text.
- Only Kenney's dry mechanical click remains for direct UI, countdown and quiet pickups. Checkpoint, lap, finish, takedown, recovery, warning, electrical coupling, redline and routine sand cue lists are deliberately silent; their visual feedback remains. The previous reward jingles, boings and status beeps are not fetched.

The SFX bank is **8 files / 242,728 bytes**, versus 26 SFX files / 1,162,793 bytes in the rejected version. Music is excluded from both SFX figures: the same existing 75-second Juggernaut excerpt remains at its previous URL and bytes. No full score is decoded or generated anew.

## Playback and lifecycle

Main propulsion playback rate stays within 0.94–1.12 with 220 ms smoothing, changing with throttle/speed/boost. Heat, simulation time and vehicle classification no longer introduce periodic detuning or flutter. Rival rates are 0.94–1.08. Transients stay 0.95–1.05. Complete retrieved audio files are transcoded with modest headroom, without composition, layering, generated stems, noise buffers or oscillators. The two Freesound downloads are explicitly HQ previews; only the archive-extracted WAVs are described as original WAV files.

Aliased events share a recording-level cooldown and a 1–3 voice limit. For example, collision and weapon-impact cannot stack the same hull thud, and boost/start-horn cannot stack the jet sample. A 12-voice global safety ceiling remains; current per-file ceilings sum to 11. The canyon return is retained at at most 2.5% gain. There are three continuous sources total, plus the existing music source, rather than eight vehicle sources.

Garage return still cancels engine/canyon gain automation, clears active combat and callout sources and discards old telemetry, preserving the existing intro/music sources. Fresh race telemetry enables the pooled voices again. Independent hidden master mute preserves user pause, mute and music state. Missing files remain silent with diagnostics; no synthesized fallback exists. Snapshot/event input remains read-only with no simulation changes.

The original supplied clip is unchanged: `public/audio/podracing-selection-intro.webm`, SHA256 `39c4d411570a2591be5cbf7fc27d86a63c36d3befa5de8d57c0d2018e1c89260`. Its selection/overtake playback, rate 1, cooldown and voice mix are retained.

## Sources, audition and verification

The publication set contains the licensed source archives, selected retrieved audio, prepared runtime files, attribution and hashes. `assets/source/audio-salt-dusk-v2/SOURCE_MANIFEST.json` records their creator/download/license URLs; `runtime-files.json` records exact transcoding commands and source/runtime hashes. The creator-page HTML under `research/` is private, Git-ignored evidence. Manifest `pageFile` paths and hashes identify those local caches and do not promise that the pages exist in a published checkout or that their HTML is licensed for redistribution.

The project-authored `AUDITION.html` is a repository audition document, with original WAVs and explicitly labelled HQ previews beside the prepared main loop. It is eligible for source publication but is outside Vite's `public/` directory and is not shipped as a game page. The public credits page is `/audio/salt-dusk-v2/CREDITS.html`. [PUBLICATION.md](../../assets/source/audio-salt-dusk-v2/PUBLICATION.md) inventories the publication boundaries and includes attribution for the unused licensed research archive retained in source. At this documentation review, the new v2 files are still untracked; this note does not attest that a commit or deployment has happened.

The active bank is historical conventional sound design, with a creator-described metal-on-dirt impact. The propulsion and laser loops are designed effects; dklon's capture method is unspecified, and Baradari's blast is not established as a live explosion recording. No active v2 sound is represented as an independently verified jet field recording. Old v1 audio files remain in `public/` for preservation and are still publishable assets; excluding them from the active catalogue means they are not requested for gameplay, not that those files have been deleted.

Primary links: [qubodup propulsion](https://freesound.org/people/qubodup/sounds/146770/), [Little Robot library](https://opengameart.org/content/sci-fi-sound-effects-library), [dklon jet](https://opengameart.org/content/jet-engine-takeoff), [7of9Designs impact](https://freesound.org/people/7of9Designs/sounds/640204/), [Michel Baradari explosions](https://opengameart.org/content/2-high-quality-explosions). Unchanged credits: [Kenney interface](https://kenney.nl/assets/interface-sounds), [Scott Buckley Juggernaut](https://www.scottbuckley.com.au/library/juggernaut/).

**39 focused tests / 7 files PASS.** Checks cover all runtime hashes and source files, original voice hash, three-source cap, rival headroom, stable/non-fluttering rates, aliased cue retrigger/voice limits, intentional silent cues, recorded event playback, callout caching, garage silence, hidden pause/menu/mute restoration, missing-file silence and disposal/late loading. Other source owners are changing the world concurrently; integrated TypeScript/build/native acceptance must pin the final combined state.

No tool available to this agent provided perceptual listening. Signal measurements informed rejection of the very short loud Large engine loop and ringing fireplace-tool impact candidates; they are not a substitute for hearing. Native node playback and numerical headroom cannot establish that the new bed, boost or laser sounds pleasing. Owner audition and in-game listening with music/voice/nearby opponents are still required before claiming the SFX problem is resolved. Previous native receipts concern the rejected v1 bank and do not validate this revision.
