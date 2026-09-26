# The original fleet pipeline

Eight original racers replace the retired replica pods. Each craft is built from
generated parts and assembled in headless Blender into the game's runtime
contract: +Z forward, +Y up, bottom near y = 0, rigid opaque meshes, Draco
geometry and WebP textures. Every craft fits the physics envelope of the
identity slot it occupies (`src/game/podGeometry.ts`), so handling, collision
and records are unchanged.

| Craft | Slot | Role |
| --- | --- | --- |
| Kestrel | `teemto` | balanced |
| Scrapjack | `sebulba` | brawler |
| Hornet | `polwo` | agile |
| Bulwark | `blockrunner` | heavy |
| Sirocco | `verdigris` | tri-engine |
| Longshot | `skybolt` | speed |
| Glasswing | `needle` | precision |
| Crucible | `pog` | single turbine |

## Steps

1. **Part references.** One engine and one cockpit reference per craft, drawn
   from the fleet concept sheet with Higgsfield (`gpt_image_2_5`), white
   background, three-quarter view. Scrapjack has separate left/right engines.
2. **Image to 3D.** Each reference went through Meshy image-to-3D on Higgsfield
   (`meshy_image_to_3d`). Job IDs are in `meshy-jobs.txt`; the parts can be
   re-downloaded from that generation history.
3. **Assembly.** `build_fleet.py` places, scales and decimates the parts per
   `fleet.json` (hero 56k and rival 28k triangles), measures the attachment
   anchors (pilot, exhausts, couplings) and exhaust apertures, and exports
   `<craft>-hero.glb` and `<craft>-rival.glb`:

   ```
   /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
     --python scripts/fleet/build_fleet.py -- scripts/fleet/fleet.json output/fleet/meshes output/fleet/out
   ```

4. **Runtime contract.** The measured anchors in `fleet-report.json` are copied
   into `FLEET_ART_DEFINITIONS` in `src/game/vehicleAppearance.ts` (apertures at
   0.85 of the measured radius). `cards.py` renders the menu cards
   (`public/assets/fleet/card-<slot>.webp`); `lineup.py` renders the review sheet;
   `inspect_parts.py` prints part bounds.

The raw parts (about 250 MB) and references stay in the local, gitignored
`output/fleet/` workspace. The published packages are `public/assets/fleet/`.
