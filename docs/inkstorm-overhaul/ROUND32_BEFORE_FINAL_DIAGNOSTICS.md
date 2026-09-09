# Round 32 — catalogue acquisition and Polwo integration

**In progress.** Three vehicle families are available in the working tree. The
first Polwo build passes 608 tests and loads in all seven staged sections, but
the strict visual review rejects target parity. A camera/material/garage revision
is being built and must receive its own captures and full-race measurements.
Round31 remains the last completed frozen technical checkpoint.

## Source and asset work

All 26 candidate source vehicles were imported through the official Blender MCP
download flow and preserved as GLBs: 748,730,812 bytes in total. The refreshed
search still contains 29 results, with three excluded results and no outstanding
candidate downloads. Twenty-four new source models have two studio views each.
Source visual inspection covers all 26; formal driver inspection covers five.
Uncertain cockpit occupancy is recorded explicitly in the catalogue inventory.

Polwo is the third runtime family, from Nolan “Polwo” Zannato's CC BY 4.0 source.
Its original mesh/texture source remains intact. The project driver was fitted
to the existing seat and grips, with a larger visible helmet and continuous
forearm deformation. Two inherited open shoulder loops were closed with 132
triangles. The first cap UV attempt crossed atlas islands and failed; the final
repair keeps each sector within its neighboring source UV triangle. Both failed
and retained derivatives remain in the source history.

The final hero has **48,975 triangles / eight opaque draws**, and the rival has
**28,830 triangles / eight draws**. Each contains two body meshes and six driver
meshes. Both pass Khronos validation with zero errors and zero warnings. The rival
retains every new shoulder-cap triangle. Only 25 invalid tangent XYZ vectors were
repaired in the packaging derivative; source positions, UVs, indices and tangent
signs were preserved. The two public GLBs match their packaged files byte for byte.

- Hero: 10,189,760 bytes, SHA256 `17e117cd9cbf86a2cf096ca6cdc0e46413b391395577b5f0774203ce7987f39f`.
- Rival: 4,188,076 bytes, SHA256 `b9a2f310ffd43477091575a52f1cb6804ec9fafca6fcf31093072b7f43e6d502`.
- [Source history and receipts](../../assets/source/inkstorm/polwo-driver-round32/README.md).
- [Supplementary Polwo concept](concepts/10-polwo-vehicle-round32.png); the seven original world targets are unchanged.

## First runtime candidate

Build `index-C1kHmeEv.js`, 1,603,467 bytes, SHA256
`cbb59d8fdfeb4eb660cc8072dec1b66f1fe267bd6184afc7883670bbda089c2a`:
608 tests / 109 files, typecheck and production build pass. The garage, all seven
staged sections and one short ordinary-drive capture report the correct Polwo
hero, eight visible prepasses, embedded pilot and no browser errors.
[Nine-image evidence](../../output/gauntlet/round-32-polwo/receipts.json).
Its short timing sample is not full-race acceptance.

The first lifecycle run passed late-load cancellation, four garage angles,
reload persistence, class fallback and return. It failed after Start because the
harness compared the setup course ordinal 0 with the normally launched ordinal 1.
The failed receipt and harness are preserved. The corrected check must assert
this explicit transition while preserving seed, course signature, event, class,
stock upgrades and storage checks. Browser, context and owned port 63553 closed.

## Criticism and revision

The source review scores materials/construction 6.0, fit/pose 6.5 and
palette/detail 5.5: **REVISE**, below the strict eight-point gate. The runtime
review also fails strict target parity, citing collapsed chase depth, the rear
fin obscuring driver detail, mauve paint and an underfilled garage showcase.
[Source review](POLWO_SOURCE_REVIEW_ROUND32.md) ·
[Runtime review](POLWO_RUNTIME_REVIEW_ROUND32.md).

These round32 reviews are independent but implementation-aware. A fresh worker
spawn was rejected by the agent thread limit, so they are **not fresh blind
acceptance**. The round31 fresh world verdict remains FAIL, 0/7.

The revision raises only the installed Polwo's chase eye to separate cockpit,
tethers and engines. A Polwo-specific material override removes the inherited red
rim and blue reflection that mixed into mauve over the blue texture, along with
duplicate procedural wear. These changes preserve the authored atlas and race
simulation. Their visual effectiveness remains subject to new screenshots.

## Remaining acceptance

Final revised build/captures, corrected lifecycle, real rival admission,
full Time Attack and Canyon Cup runs for all three families, Continue, and
context/resource regression checks remain pending. No 40–60fps claim applies to
the changed working tree yet. Other catalogue families need runtime preparation;
all seven world targets, driver construction, human/controller/audio and
other-device acceptance remain open. No overhaul commit, push or deployment.
