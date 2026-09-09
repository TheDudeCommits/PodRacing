# Inkstorm blind UI review 1

Reviewed only the five supplied images on 2026-09-06. No source, reports, browser, or running game was inspected.

**Verdict: FAIL for a premium UI acceptance gate.** This is a coherent, promising visual system, with clear primary headings and several strong selection states. The remaining defects are material: race facts conflict within the results screen, the selected event conflicts with the visible setup, and parts of the race HUD lose readability against its backdrop.

The racing and results images are UI harness captures. Their flat geometry is excluded from the score. These images establish neither runtime behavior nor scenery quality, control functionality, responsive layouts, animation, or gameplay legibility in motion.

## Scores

Scores assess the supplied desktop images. Art consistency means consistency of the interface language with the approved Inkstorm target; it does not score unverified world rendering.

| Surface | Hierarchy /10 | Readability /10 | Action clarity /10 | Art consistency /10 |
|---|---:|---:|---:|---:|
| Garage / mastery event | 7.5 | 6.5 | 6.0 | 7.5 |
| Workshop | 7.0 | 6.5 | 6.0 | 7.0 |
| Racing HUD | 7.0 | 5.5 | 6.5 | 7.5 |
| Results | 8.0 | 7.0 | 6.0 | 7.5 |
| Overall, equal weight | **7.4** | **6.4** | **6.1** | **7.4** |

Overall mean: **6.8/10**. A premium pass requires trustworthy visible state, readable essential telemetry, and unambiguous selection/continuation decisions. Those conditions are not met here.

## Ranked defects and concrete fixes

### 1. Results communicate mutually inconsistent outcomes — P1

The photo-finish banner says the player is behind Vexa Ruun by **0.047 s**, while the table gives **3:04.130** and **3:05.860**, a **1.730 s** difference. The same view shows **NEW PERSONAL BEST 1:31.68** while the player's best lap is **0:59.940**; no label explains a different course, record category, or comparison. “Photo finish / Wingtip deficit” repeats the winner's total instead of explaining the deficit. The quickest-reading story therefore contradicts the table that should substantiate it.

**Fix:** Make the finish banner, gap column, highlight detail, and leaderboard agree. Name the personal-best metric explicitly, such as “Time attack record — [course]” if it is a separate record, and keep unrelated event results out of the main finish summary. For this displayed table, the gap must be 1.730 s unless the table changes. This is a visible information defect; the screenshots do not establish where it originates.

### 2. The garage does not give one reliable answer to “What will Start Race launch?” — P1

The selected challenge promises **INKSTORM · TIME ATTACK**, “One clean lap. Stock machine.” Directly above Start Race, **EVENT RULES · FIXED** nevertheless displays **COMBAT**, **HARD**, and **3** laps as the apparent values. Muting the controls suggests they may be locked, but it does not explain why they disagree with the selected event. A Workshop button also sits beside the launch action without explaining how stock machinery affects it.

**Fix:** Bind the visible launch summary to the selected event: mode, actual lap count, stock/custom machinery, and whether opponents apply. Replace irrelevant locked selectors with a short event summary, or show the correct locked values. Explain the workshop restriction inline when stock machinery applies. The Start Race area should confirm exactly the promise made by the challenge card.

### 3. Essential lower-right race telemetry is too faint and small — P1

The speed number is excellent at a glance, but **DRIFT**, **BOOST**, **HEAT**, and **DAMAGE** are pale, tiny text on the bright ochre background. Their slim bars have little separation from that background. The separate Shift/Redline strip creates another heat-related reading location. At race speed, the important distinction between available resource and danger state will be harder than the static screenshot suggests.

**Fix:** Add a restrained dark backing or strong ink edge behind the whole resource group, increase label size and bar thickness, and keep each label with its value. Reserve a distinctive high-contrast warning treatment for heat/damage. Consolidate heat presentation or make the extra strip explicitly a transient overheat warning. Preserve the prominent speed numeral and open center of the screen.

### 4. Workshop totals require mental arithmetic and hide the decision outcome — P2

The sidebar separately shows **+21% cooling** and **−30% cooling**, as well as positive and negative armour and boost totals. A player must calculate the effective build to understand it. The selected module cards provide gains and losses but no clear comparison with the current configuration. The screen is called “Build your advantage,” yet its largest decision aid is a list of ingredients rather than the resulting machine.

**Fix:** Lead with effective totals, including **−9% cooling**, **0% armour**, and **+18% boost** for the visible values if these modifiers combine additively. If the combination rule differs, show the true effective totals instead. On selection/hover, show current → candidate changes. Keep contributing modifiers available as secondary detail. Include an explicit visible “Equip” or “Equipped” treatment that clearly distinguishes previewing from committing; the static image only establishes an Equipped state for one card.

### 5. Workshop exit and persistence behavior are underspecified — P2

The only obvious exit is a small X in the upper-right. There is no visible “Done,” “Back to hangar,” save indication, or explanation that equipment changes apply immediately. The expansive lower-left empty region could host a clear conclusion to the flow. Dim garage controls remain visible through the overlay and add noise without helping the equipment decision.

**Fix:** Add a clear “Done / Back to hangar” action and concise persistence feedback such as “Changes applied” if that is the actual behavior. Make the modal surface more opaque so the underlying garage labels do not ghost through the workshop. Use the lower-left space for a concise machine summary or reduce the modal height.

### 6. Secondary typography is below the quality of the primary typography — P2

The broad cream italic titles give the system identity. Supporting material is often extremely small and subdued: garage control legends, event descriptions, weapon/stat labels, result best-lap labels, and workshop tab modifiers. Bold condensed capitals work for headings, but repeated miniature capitals make operational details tiring to parse. This is especially visible in the dense bottom third of the garage.

**Fix:** Increase the smallest functional text, strengthen contrast, and use a less compressed face for sentence-level copy and numerical explanations. Keep condensed italic type for headings and major race figures. Give the flight manual, event setup, and online room more breathing room; reduce simultaneous text where necessary rather than shrinking it.

### 7. The menu structure is polished but more box-heavy than the approved art language — P2

The target communicates speed with a largely unobstructed world, cream condensed numerals, warm painted surfaces, and selective cyan energy. The implemented UI adopts the cream/coral/navy/cyan palette well, but the garage and workshop rely heavily on uniform straight rectangular panels and tabular microcopy. This feels organized, yet more like a themed configuration dashboard than a fully authored racing game's hangar.

**Fix:** Retain the disciplined grid and palette. Strengthen a few characteristic forms—cut corners, restrained diagonal ink strokes, subtle material grain, or track-inspired dividers—and let the machine occupy more of the garage hero. Apply these selectively; avoid decorative marks that weaken text or add HUD clutter. The approved target supports a light racing overlay, not maximum texture on every interface component.

### 8. Results continuation choices need a clearer event progression story — P2

Race Again is the dominant action, followed by Back to Hangar and Next Event. The screen contains championship points but never clearly names the completed event or explains what Next Event advances to. The bottom instruction says to select a highlight to relive the race, while the highlight boxes resemble passive statistic cards and contain no play affordance.

**Fix:** Name the completed event and championship round near the result. Label Next Event with its destination or expose that destination nearby. Add a play/replay affordance to clickable highlights. Choose the primary continuation action according to the event context, with retry primary for a time attack and next round prominent for a championship.

## Strengths to preserve

- The cream italic title treatment and coral primary buttons provide recognizable identity and immediate hierarchy.
- The selected garage vehicle has a strong coral border, and the workshop's Equipped module is clearly distinguished by a pale-green border and fill.
- The results screen makes finishing position dominant and highlights the player's leaderboard row effectively.
- The racing HUD keeps the central view mostly clear, uses a large readable speed figure, and groups position/lap information sensibly at the top-left.
- Navy panels, warm accent colors, and selective cyan tie the four surfaces together.

## Re-review evidence needed

Fix the conflicting visible facts and resupply the same four desktop states. Confirm resource labels against bright and dark actual race frames, plus a smaller viewport. Interactive checks must independently verify that selecting events, equipping modules, entering races, and replaying/advancing results do what their labels promise. No such behavior is certified by this review.

## Inputs

- `/Users/amir/Projects/PodRacing/output/playwright/inkstorm-ui-masterygame.png`
- `/Users/amir/Projects/PodRacing/output/playwright/inkstorm-ui-results.png`
- `/Users/amir/Projects/PodRacing/output/playwright/inkstorm-ui-workshop.png`
- `/Users/amir/Projects/PodRacing/output/playwright/inkstorm-ui-race.png`
- Approved direction: `/Users/amir/Projects/PodRacing/docs/art-direction-2026-09-06/B-inkstorm.png`
