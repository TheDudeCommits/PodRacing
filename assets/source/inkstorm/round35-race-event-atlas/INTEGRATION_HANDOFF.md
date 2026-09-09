# Race event atlas — implementation handoff

The new `src/ui/RaceEventAtlas.ts` and `src/ui/raceEventAtlasStyles.ts` implement an event-selection modal; `tests/ui/raceEventAtlas.test.ts` contains seven passing model/keyboard contract tests. Parent now owns all live integration and verification. This agent used no browser or MCP for this work.

Both retained UI2 overview/motion reference sheets were individually inspected. The implementation uses their cream/petrol palette and expanding orbital selection as interaction studies. Its SVG linework, disc treatments and typography layout are authored CSS/SVG, with no copied textures or invented named planets, courses or events. Each medallion represents one actual mastery event, rather than claiming to be a geographic course render.

## Interface and actions

```ts
const atlas = new RaceEventAtlas(mount);
atlas.update(mastery, canStart); // optional canStart defaults true
atlas.setVisible(true);
atlas.setVisible(false);
atlas.dispose();
```

The section owns a scoped style node and starts hidden. The parent supplies visibility and launch permission; it owns gameplay input gating. `update` accepts an absent model, follows actual selected event IDs, preserves current keyed button nodes/focus, replaces changing daily IDs, and disables launch when the selected ID is absent. Repeated equivalent updates do not mutate the DOM. No mastery/model state is written.

Native button click actions bubble to RaceHud:

- `select-event`, with `data-event-id` from the actual calendar.
- `close-event-atlas`, for Back and Escape.
- `start-race`, disabled by the supplied permission or an invalid selection.

Arrow keys/Home/End focus and select event buttons. Native Enter/Space activation remains available. Modal keydown propagation is stopped so the global garage Enter/Space shortcut cannot accidentally launch while choosing an event. Tab loops within the visible modal; close/dispose returns focus to the opener. No perpetual animation: selected discs translate/expand over 360 ms, markers fade over 280 ms, reduced-motion disables these transitions. Narrow layouts use horizontal map scrolling and a stacked footer inside an independently scrolling modal.

## Parent integration observed

Parent mounted the atlas inside vehicle selection, made its underlying frame inert while open, closes on launch or leaving pre-race, and restricted the original mastery selection loop to its original event list. Parent switched the atlas font to Inkstorm UI. These integration edits were not made by this agent.

A harmless duplicated `stopPropagation` call was reported to the parent (its visible guard plus this module's post-modifier guard). Parent owns any cleanup; this agent stopped live edits on request.

## Evidence and remaining checks

The module snapshot passed full TypeScript checking and seven focused tests: exact real seven-event data, authoritative selection/permission, source immutability, daily rollover/stale-ID launch rejection, empty/duplicate calendar safety and full keyboard ordering. Logs `typecheck-v2.log` and `tests-v2.log` precede the parent's latest integration/font edits. These tests do not claim browser DOM, focus, mobile, motion or screenshot acceptance.

Parent's actual integrated capture should verify all seven selection actions; Enter on an event selects without launching; Race This Event launches exactly the chosen ID; Back/Escape restores the garage focus; all controls remain reachable at narrow width/short height; focus stays inside while open; and reduced motion remains quiet. Check guest-role permission with the parent action boundary as well. The module deliberately has one optional launch-permission argument; it does not invent a separate authority model.

`implementation-inventory-v1.json` preserves the initial authored snapshot and viewed reference hashes. `implementation-inventory-v2.json` records the read-only handoff snapshot after parent integration amendments; the parent owns any subsequent source changes.
