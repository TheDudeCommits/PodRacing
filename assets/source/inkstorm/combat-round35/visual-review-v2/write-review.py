from pathlib import Path
import hashlib,json,subprocess
ROOT=Path('/Users/amir/Projects/PodRacing');OUT=ROOT/'assets/source/inkstorm/combat-round35/visual-review-v2';E=ROOT/'output/playwright/round35-combat-v2'
r=json.loads((E/'receipt.json').read_text());c=r['cases'][0];o=json.loads((E/'solo-chase-observations.json').read_text())
assert c['id']=='solo-chase' and c['video'].endswith('page@f86e23ca0ac2884209002aa6df1c22ea.webm')
video=Path(c['video'])
frames=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',str(video)]))['frames']
pts=[float(f['best_effort_timestamp_time']) for f in frames]
selected=[t for t in pts if 9.96-1e-6<=t<11.44-1e-6]
assert len(selected)==37 and all(abs(t-(9.96+i*.04))<1e-6 for i,t in enumerate(selected))
side=[s for s in o['samples'] if s['camera']=='side']
def small(s): return {k:s[k] for k in ['wallMs','frame','raceTime','camera','matte','cueKind','cueAge']}
timing={'scope':'implementation-aware visual QA of solo-chase only, not blind and not a performance benchmark','receiptCaseOutcome':c['outcome'],'receiptOverallOutcome':r['outcome'],'receiptErrors':r['errors'],'cleanup':r['cleanup'],'servedBundle':c['environment'],'event':c['analysis']['wreck'],'estimatedCueStartPerformanceMs':c['analysis']['estimatedStartMs'],'firstSideObserverSample':small(side[0]),'lastSideObserverSample':small(side[-1]),'firstChaseAfterSide':small(next(s for s in o['samples'] if s['wallMs']>side[-1]['wallMs'] and s['camera']=='chase')),'videoFrameRate':25,'videoFirstVisibleSidePTS':10.28,'videoLastVisibleSidePTS':11.08,'videoFirstVisibleReturnPTS':11.12,'sideFrameCount':21,'firstSideOnsetBracketPTS':[10.24,10.28],'returnBracketPTS':[11.08,11.12],'interpretation':'21 consecutive encoded frames show sustained near-engine bottom clipping; this is not a count of unique rendered frames. Side images span 800 ms between timestamps and 840 ms of encoded frame occupancy. Independent observer brackets bound the intended 820 ms shot. Video PTS and performance.now have different epochs; onset/return correspondence implies about -70 ms offset with recording/observer quantization, not an exact synchronization.','extractedFrames':[{'file':f'temporal-{i+1:03d}.png','sourcePTS':t,'size':[720,450]} for i,t in enumerate(selected)],'commands':c['commands'],'noBrowserOrRuntimeEdits':True}
(OUT/'timing-and-scope.json').write_text(json.dumps(timing,indent=2)+'\n')
report='''# Combat V2 temporal visual review

**The side camera is poorly framed throughout the shot, not merely during its first transition.** This implementation-aware review inspected the actual solo Teemto redline wreck; it is not a fresh blind critique or a performance test. No browser, runtime, simulation, source asset or code was changed.

## Actual evidence and timing

The source is case `solo-chase` in [V2 receipt](../../../../../output/playwright/round35-combat-v2/receipt.json), native S + Shift overheat, served `index-_F1BLY7k.js` SHA256 `d1c2dd3ecb226da13f9b729934d0564db31596ea4088fb2f8cf57e8b404eb079`. This case passed its technical checks. The complete V2 receipt remains FAIL because the separate pause case timed out; errors were empty and its browser/server were closed. Later pause coverage is outside this visual assessment.

Individually viewed original before/wreck/restored/recovery PNGs, the 9.0–13.4 s overview, all 37 consecutive recorded frames at PTS 9.96–11.40 s in the two labeled sheets, and full-resolution hold/return frames. The silent VP8 recording is 1440×900 at 25 fps, not measured game cadence. [Timing/commands](timing-and-scope.json) and [hash inventory](inventory.json) pin the evidence.

The observer estimates cue start at performance time 10335 ms. Side mode is observed at 10352.3–11152.3 ms; chase is restored by 11185.5 ms. In the video, the first visible side frame is PTS 10.28 s, the last is 11.08 s, and the first return is 11.12 s. All **21 consecutive encoded side frames** clip the near engine at the bottom. Their timestamp span is 800 ms, their encoded occupancy 840 ms, consistent with the 820 ms cut after 40 ms recording and roughly 33 ms observer quantization. These are distinct clocks, not frame-exact synchronization or 21 unique render updates.

## Findings and bounded changes

1. **Widen this combat shot before adding effects.** At the full-resolution [mid-shot frame](solo-chase-hold-pts10.80.png), the engine runs through the lower matte while the pod/pilot remains small near center; the two-engine/pod relationship is hard to read. The large WRECKED strip covers part of the remaining engine. This persists through the hold. The [return frame](solo-chase-return-pts11.12.png) then swings the tumbling assembly across the bottom/right edge. Recovery eventually restores the familiar, centered chase composition. The current source reuses replay highlight offsets right 10.5/up 9/back 28, aim forward 3/up 2.8. A **separate combat-only right 12/up 14/back 48, aim forward 4/up 2.8, FOV 60** is a supported next capture candidate; those values have not been visually validated. Preserve replay/manual/reduced-motion/pause behavior. Judge the complete entry/hold/exit, with both engine ends and pod inside the matte plus an approximately 8% margin. Keep the target coherent during the wreck's yaw change; do not use the physics collision radius as proof of full visual clearance.

2. **Make the existing burst read as an impact, not red confetti.** A small cream pressure rim is visible early, followed by broad red haze and bright rectangular fragments that become conspicuous during camera return. Red engine shells already appear before the event, so not all red areas are explosion geometry. Code inspection confirms four redline plates share the vehicle-origin position and up to 18 debris pieces are emitted into the existing 16-plate/64-debris pools. After the camera correction, a cheap next change is to retain those counts and change redline debris to dark burnt metal with the existing sparse amber/ivory sparks; reduce its uniformly saturated red bodies. If the core still feels detached from the machine, redistribute the same four plates between verified presentation engine/pod anchors instead of emitting more bursts. This is a proposed visual refinement, not an executed improvement. Keep generic dust/EMP/repair treatment separate.

3. **Review the camera return independently.** PTS 11.12–11.40 shows a rapid compositional shift and large foreground fragments after the matte starts leaving. Restoring the correct camera mode is technically successful, but it does not establish a smooth visual handoff. First evaluate the wider shot with unchanged 820 ms timing. Only then consider a bounded exit blend anchored to the craft; do not extend control loss or alter deterministic recovery to hide framing.

No new meshes, maps, pools or per-frame searches are needed for the first camera candidate. These observations do not establish 40–60 fps, audio quality, outgoing takedown quality, multiplayer behavior or all-family clearance. Relevant read-only implementation references: `CinematicCamera.ts` side highlight branch, `GameApp.ts` combat camera/effect routing, and `GalacticEffectsView.ts` redline plates/debris. Exact inspected file hashes are retained separately from the recorded bundle.
'''
(OUT/'REVIEW.md').write_text(report)
source_files=[E/'receipt.json',E/'solo-chase-observations.json',video]+[E/f'solo-chase-{x}.png' for x in ['before','wreck','restored','recovery']]
code_files=[ROOT/x for x in ['scripts/inkstorm-combat.mjs','src/camera/CinematicCamera.ts','src/render/app/GameApp.ts','src/render/galactic/GalacticEffectsView.ts','src/render/combat/CombatPresentationController.ts']]
def rec(p):
 b=p.read_bytes();return {'path':str(p.relative_to(ROOT)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
inv={'scope':'actual source recordings/stills, derived extractions and review; no runtime acceptance','sourceEvidence':[rec(p) for p in source_files],'implementationReadOnlyAtReview':[rec(p) for p in code_files],'derived':[rec(p) for p in sorted(OUT.iterdir()) if p.is_file() and p.name!='inventory.json'],'extraction':'ffmpeg CPU decode with -threads 1; overview fps=5, frames native25fps without interpolation; temporal frames scaled720x450, contact thumbnails480x300; full-resolution selected frames unchanged content. Labels/PIL only on sheets. Initial drawtext attempt failed because this ffmpeg has no drawtext; successful labels were added to sheet margins.'}
(OUT/'inventory.json').write_text(json.dumps(inv,indent=2)+'\n')
print('REVIEW',rec(OUT/'REVIEW.md'));print('INVENTORY',rec(OUT/'inventory.json'));print('PTS',len(selected),selected[0],selected[-1])
