# Audio v2 source publication note

This review prepares publication documentation; it does not commit or deploy files. At the review, audio v2 source/runtime files are untracked and the existing audio code/tests are modified. The release owner must use the actual resulting commit when describing the final publication.

## What belongs to the publication

| Material | Source repository | Browser deployment |
| --- | --- | --- |
| Eight selected `public/audio/salt-dusk-v2/*.ogg` files and `CREDITS.html` | Intended publication; exact files/hashes in `runtime-files.json` | Served by Vite's public asset copy |
| Existing Juggernaut excerpt and original supplied voice | Preserved existing files; voice unchanged from HEAD | Existing same-origin URLs remain in use |
| Source ZIP/7z/WAV/MP3 files, extracted audio and included license text | Retained licensed source material; selected assets distinguished from unused research in the manifest | Outside `public/`; not copied into the built game |
| `SOURCE_MANIFEST.json`, `runtime-files.json`, preparation scripts, validation/freeze records | Provenance and reproducibility documents | Outside `public/` |
| Project-authored `AUDITION.html` | Intended source audition document, not a scraped creator page | Outside `public/`; not a game page |
| `research/*.html` | Private creator-page caches, excluded by `.gitignore` | Not deployed |

A manifest `pageFile` and its SHA256 identify locally preserved research evidence. Those cache files can be absent from a published checkout. Their inclusion in a provenance record grants no permission to republish the creator website's HTML. Source/download/license URLs and audio-file hashes remain in the published manifest. `write-manifest.py` is the original local retrieval-record helper and requires those private caches; it is not part of the game build or an offline-clone requirement. `prepare.py` uses the included selected audio sources and does not require creator HTML.

The full Little Robot archive and comparison WAVs are retained under the library's CC BY 3.0 license even though only the Medium loop, Laser09 and Laser07 are used. All extracted samples from that library remain attributed to Little Robot Sound Factory. Public runtime credits preserve creator, source, license and modification notices. No source under an NC, ND, editorial-only or proprietary sample-redistribution restriction was admitted.

## Unused research archive attribution

**Metal and Wood Impact Sound Effects** — Ogrebane, published 7 June 2010; page description signed “artistic”. Source: <https://opengameart.org/content/metal-and-wood-impact-sound-effects>. License: **CC BY 3.0**, <https://creativecommons.org/licenses/by/3.0/>. Original download: <https://opengameart.org/sites/default/files/wood_and_metal_impact_sfx.zip>.

The archive `wood-and-metal.zip` has SHA256 `8cd2fcd99e1ae9e05ec8f7a2c4a5a45e78b5b15eaff39f7384d3d8bc66c976ac`. Its `.aif` audio files were extracted without changing their bytes into `metal/` for comparison. They are unused by the runtime catalogue. This attribution covers their retention in the source repository; the creator HTML remains private. The original download URL and archive hash identify this retained creator archive; it is not represented as an agent-created sound library.

## Provenance and listening limits

qubodup's 2012 propulsion asset and Little Robot's 2015 engine/laser assets are existing conventional designed effects, which can include historical synthesis by their authors. The agent did not generate new audio or recreate these effects. The two Freesound files are public HQ previews and are not represented as the login-required original uploads. The hull-impact creator describes a physical metal-on-dirt event, but recording equipment and raw capture lineage were not independently established. dklon's jet effect includes authored Doppler; it is not documented here as a raw jet field recording. Baradari's existing blast is not documented as a recorded live explosion.

The original supplied “Now this is podracing” clip remains separate from the open-license catalogue. Its current SHA256 and HEAD SHA256 both equal `39c4d411570a2591be5cbf7fc27d86a63c36d3befa5de8d57c0d2018e1c89260`. This note makes no new licensing claim about that owner-supplied clip.

No owner audition or perceptual listening approval is claimed. The 39 focused tests, file hashes and signal checks demonstrate implementation/integrity only. Native runtime acceptance belongs to the release evidence for the exact combined build. Earlier audio receipts must not be relabelled as listening approval or evidence for a later bundle.
