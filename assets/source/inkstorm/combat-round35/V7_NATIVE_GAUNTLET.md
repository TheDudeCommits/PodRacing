# V7 native combat gauntlet

All four cases passed in one native Chrome run. Browser and owned preview server closed with no cleanup errors. This is V7 evidence; root's subsequent UI-only V8 work is outside this receipt.

Build: `index-CJMFrYLw.js`, SHA256 `716f16947fa6d9dbb49a3172b626b877efae0bd10e5b3aae05df3ca7923a4ed0`. All seven source/build/harness pins matched between the during-run read and post-cleanup read. No source or build edits were made by this audit.

Actual normal Start, brake and boost inputs caused authoritative redline explosion and local wreck in each fresh context. Camera selection was a presentation-only override in the manual cases. No game-state writes, presets, capture mode, stepped simulation, or injected events were used.

| Case | Result | Slow sim/wall ratio | Recovery sim/wall ratio | Restored camera |
| --- | --- | --- | --- | --- |
| solo-chase | PASS | 0.1923 | 0.9999 | chase |
| solo-manual-camera | PASS | 0.1923 | 1.0002 | cockpit |
| solo-reduced-motion | PASS | 0.1731 | 0.9999 | chase |
| solo-pause-cancel | PASS | pause cancellation | 0.9935 | cockpit, pause/resume |

The first three cases returned to ordinary pacing. Reduced motion kept the camera and letterbox suppressed. Pause cancellation froze the simulation, cleared presentation, restored the selected cockpit camera, and resumed ordinary pacing. Ratios measure simulation progress per observed wall time; they are not frame-rate performance claims. Raw observations and analysis remain in the receipt and audit.

Visual review of the native wreck screenshot and extracted entry/hold/return frames shows the near engine fully inside the dedicated V7 shot, improving V2's cropped engine. The wider view also brings the start-gate crossbar into the foreground near/over the cockpit top. The return frame restores chase and removes the matte. Full continuous video perceptual review remains with root.

The clip is native recorded footage trimmed/transcoded to 5.48 seconds, 1440×900, 25 fps, without speed change, interpolation, compositing, or audio. Contact frames came directly from the original WebM. Extraction coordinates are recorded; estimated HUD event time is not exact video-clock synchronization.

- [Native clip](../../../../output/playwright/round35-combat-v7/solo-chase-wreck-clip.mp4)
- [Entry frame](../../../../output/playwright/round35-combat-v7/contact-02-wreck-entry.png)
- [Hold frame](../../../../output/playwright/round35-combat-v7/contact-03-wreck-hold.png)
- [Return frame](../../../../output/playwright/round35-combat-v7/contact-04-camera-return.png)
- [Executed receipt](../../../../output/playwright/round35-combat-v7/receipt.json)
- [Clip provenance](../../../../output/playwright/round35-combat-v7/clip-evidence.json)
- [Compact audit](v7-native-gauntlet-audit.json)

Clean outgoing policy and host/guest real-time behavior retain CPU-only coverage, including actual authoritative simulation wrecks for the network boundary. No live two-client session is claimed. Root reported full verify 745 tests / 126 files PASS before this run; this audit did not rerun it.

Receipt SHA256: `bb1a7619aba5f087eeab5b33f72ad172cbd41f8bb9a934f95895341ac9745c72`.
Clip SHA256: `d53921c68751b444d4807d5bd23fb0deea37cb078186751d6f8bc18ece355b76`.
Audit SHA256: `7b87ed8157fa65a65f4f6f818b74b5f9e2c71e693630f2d90ef6844bfe6ab399`.
