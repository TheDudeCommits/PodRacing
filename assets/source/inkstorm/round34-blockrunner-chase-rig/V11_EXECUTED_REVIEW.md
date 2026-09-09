# V11 close camera — executed review and rejection

8 September 2026. **Rejected experiment; exact V10 camera sources restored.** This is implementation-aware QA by the agent that prepared the rig, with prior source and visual context. It is not a fresh blind critique. No live code, asset, browser or Blender action was performed for this review.

I individually inspected twelve V11 driving PNGs: seven main sections, four Foundry supplements and live drive. Seven V10 comparisons were viewed: grid, fork, launch, near span, middle, exit and live drive. V11 garage and the concepts were not re-viewed in this pass. All nineteen viewed-file hashes are in [receipt-audit.json](executed-v11-audit/receipt-audit.json).

The close rig makes the helmet, shoulders and controls easier to identify, but spends too much screen area on the deck and pilot’s back. No obvious source roof/head occlusion or engine-front clipping appears in these stills. That does not make route preview equivalent: near-road area, junction spacing and environmental scale are worse. Larger presentation also exposes flat suit panels, faceted helmet shading and plain stud/disc surfaces; it does not demonstrate a material improvement.

| Actual V11 view | Observation |
| --- | --- |
| Grid | Larger driver; straight visible. Cropped gantry and larger foreground weaken scale context versus V10. |
| Salt run | Gate and forward road clear; engine bridge and cockpit occupy more lower frame. No visible head occlusion. |
| Canyon | Arch and center route marker readable; shaded suit remains flat blue-gray. No visible source clipping. |
| Fork | Both routes visible, but enlarged left cockpit wall crowds the ramp approach and immediate junction space compared with V10. |
| Launch | Valley and descending road visible; engine tips approach the gate crossbar in screen space. Less immediate descent context than V10. This is not a landing-motion test. |
| Foundry main | Pilot visible beneath pipework; central corridor visible, while immediate ground preview shrinks. |
| Finish section | Curve chevrons readable; larger foreground costs near-road area approaching the turn. A section screenshot does not establish race completion. |
| Foundry approach | Pilot visible but dark helmet/suit hierarchy remains weak under industrial shade. |
| Foundry near span | Pilot silhouette intact; route ahead visible. Flat ivory studs dominate more foreground than V10. |
| Foundry middle | Comparative regression: right floating world object now partly overlaps speed/status HUD; it is separated in V10. |
| Foundry exit | Crest obscures terrain beyond in both versions. ROCKFALL label overlaps lower pilot in both: retained issue, not a new V11 defect. |
| Live drive | Larger pilot and foreground occupancy; cockpit edge stair steps visible. V10 also has edge aliasing. Frames differ slightly in time/speed, so no pixel-parity or renderer-cause claim. |

The eleven staged V10/V11 receipts have identical subject position, focus, speed, yaw and zero review offsets. Ordinary sampled eye height changes about 12.146→8.146 m and rear offset 19.054→11.694 m relative to focus. Fork steering and launch height behavior remain represented. Stills do not validate spring transients, landing visibility, comfort, collision clearance or route choice during motion.

The separate ephemeral CLI reviewer received ten anonymous attachments: four mixed-order gameplay pairs plus concepts 12 and 06. This audit verified all ten original/attachment hashes, prompt hash, exit 0, completed turn and raw final-text equality. All item events are one transport fallback error and one final agent message; there are no tool or retrieval events. Four reconnect errors precede successful HTTPS completion. Generic CLI configuration may load; no prior project context was supplied by this invocation. Its [review](blind-runtime-v11/cli-critic-attempt1/review.md) prefers wider V10 in all four pairs (three high-confidence preferences; launch moderate), with neither version reaching its 8/10 target. Those scores belong to that separate reviewer.

Actual V11 verification records 678 tests / 120 files and build PASS. Its captured bundle is `index-CJI8RfD-.js`, SHA-256 `55aba7b1542fae090e2b3018145d6b20bad34ab2f0a50210536f50d037ad29a5`; capture errors are empty. The 481-sample short interval averages 60.002744 FPS with p95/p99 approximately 16.8 ms. This is not full-race/performance acceptance. Parent reported capture browser and port 5186 closed; this audit did not open either.

Root rejected the close rig and reversed its three-file patch. At this audit all three live files match the exact V10 hashes in [rejection-and-rollback.json](../../../../output/gauntlet/round34-chase-rig-v11/rejection-and-rollback.json). That receipt explicitly marks the V11 dist build stale until rebuilt. All V11 candidate, failed visual result, capture, test and critic evidence remains preserved. No further camera tuning is proposed here.
