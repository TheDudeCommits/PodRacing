# V14 identical seven-image UI critic

Completed after explicit root release. Fresh critic verdict: FAIL. HUD 7/7, Build 7/7.5, map 7/7.5, garage 7.5/7. The exact review and raw audit are preserved under `cli-critic-attempt1/`.

The prompt is byte-identical to V10. Image order remains candidate HUD, HUD reference, candidate Build, Build reference, candidate map, map reference, candidate garage. Only actual native V14 captures supply candidate images. No generated concept art, source files, implementation notes or prior verdict is provided to the critic.

After explicit release from the root, record `RELEASE.json` with `released: true` and the expected native `expectedBuildSha256`, run `prepare-inventory.py`, then `run-image-critic.py`. The preparer verifies the completed browser/server cleanup, capture names, exact receipt bundle SHA and unchanged reference hashes. It creates a fresh neutral temporary directory containing only seven byte-identical `image-N.png` attachments and freezes `inventory.json` with all hashes. The runner rechecks every byte before invoking an independent ephemeral read-only CLI process with the unchanged V10 prompt.

Preserve raw events, invocation and review. Audit the raw record for tool use and extra retrieval after completion; never edit the verdict. Generic user Codex configuration may load at startup, so the raw audit must state its actual limits.
