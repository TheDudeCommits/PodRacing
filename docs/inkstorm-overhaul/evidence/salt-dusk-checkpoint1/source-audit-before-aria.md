# Salt Dusk checkpoint 1 — release audit

Read-only audit of `index-CCnFLqZi.js`, SHA256 `2c21ecd68bb500100a23f31b14cc125767cfc3866ea06d6fcd939deda6e950ce`. No source edits, browser, media playback, render or tests.

- **Bundle/source agreement:** expected bundle hash matches; all 132 embedded `src` modules match working source byte-for-byte (144 total map sources).
- **Runtime/source assets:** 8/8 world files and originals; 27/27 audio files; 7/7 original audio downloads and captured source pages; 23/23 unchanged audio copies; 38/38 public-to-dist files match. All 27 catalogue URLs exist and have ledger entries.
- **Provenance:** world assets are the selected Poly Haven CC0 downloads. Audio records and shipped credits identify creators, CC0/CC-BY-3.0/CC-BY-4.0 licenses and edits. Existing user-supplied intro is unchanged and explicitly outside these grants. No new film/game rip admitted. This is provenance verification, not an expansion of the intro's rights.
- **Prohibited generation inactive:** active audio modules are model, menuMusic, catalogue and PodracerAudio. No oscillator/noise/offline-score generation or `assets/source` imports occur in embedded runtime source. Four withdrawn synthesis source files remain history only.
- **Public-source packaging:** the initially flagged website preview PNGs, whole-page HTML caches and 8,388,608-byte decoded HDR scratch are now Git-ignored and untracked by root. The CC0 grant applies to downloaded assets, not website example renders. The full HDR catalogue and duplicate/unselected audio packs remain nonessential repository weight, not runtime or licensing blockers.
- **Metadata correction:** historical `salt-dusk/MANIFEST.json` is 39/40 current matches because root appended a publication boundary to HANDOFF.md. All asset hashes remain exact. Keep the original stage receipt and add a release inventory or label it historical; do not state current 40/40.
- **Bounded secret scan:** no high-confidence credential/private-key pattern detected in new source-directory text. This does not scan all Git history.

No remaining runtime asset publication blocker found within scope. Detailed hashes, file lists, exact source-map comparison and ignore evidence are in `receipt.json`; the read-only reproducer is `audit.py`.
