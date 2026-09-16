# Round 42 — Tow cable, thermal spike, nitro cell, overcharge lance (2026-09-16)

Owner request after round 41: items 1, 3, 6 and 9 from the weapons list. All four are deterministic simulation features with HUD, audio and rendering, and bots use them.

## Ordnance slot

Forward ordnance loads onto the mine key (F) from a pickup and takes it over until spent; mines return afterwards. `GalacticRacerState.ordnance` holds the kind and charges, the HUD slot relabels itself (`SPIKE ×2`, `CABLE ×1`, `RELEASE` while towing), and the racks are consumables like lance cells: any racer can take a respawned rack again (`FARMABLE_COMBAT_PARTS`).

## 1. Tow cable (`tow-cable`, one per rack, two racks on the sweeper and the recovery straight)

- Press F with a cable loaded: the nearest rival ahead within 70 m, inside a 14 m lane and with a clear line, gets latched (`RaceSimulation.findTowTarget`, same world occluder as the lance). You are pulled toward them for up to three seconds (`stepTowCables`, 42 m/s² easing off inside a 14 m gap, closing speed capped at 30 m/s).
- Press F again, or let the timer run out, and you release with a slingshot along your nose that grows with how long you held on. Four-second cooldown.
- Counterplay: the towed racer raising their shield cuts the line at once. The victim's HUD names the tower with `TOWED // X · SHIELD CUTS IT`; a wreck or leaving range also cuts it, with half the cooldown.
- A taut pale line is drawn from the tower's nose to the towed craft's tail (shares the lance draw pool).

## 3. Thermal spike (`thermal-spike`, two per rack, racks in the canyon and on the second straight)

- A fast forward dart (190 m/s) that does almost no hull damage and instead adds 0.6 heat, cuts the target's active boost and drift boost, and ionises them briefly. A pod already warm tips over the overheat line and pays the round 41 handling penalty. A raised shield still blocks it.
- Bots fire loaded spikes at the same cone target as the lance, one press per shot.

## 6. Nitro cell (`nitro-cell`, one rack, hairpin inside line only)

- One shot: boost meter to full, overheat and its handling penalty cleared, heat trimmed to 0.45.
- Placed at the hairpin apex on the inside of the turn, found by comparing both shoulders against the chord midpoint; the pickup radius is tight (5 m) so you have to commit to the slow line to take it.

## 9. Overcharge lance

- The lance now fires on the press instead of auto-repeating while held. Keep the trigger held after the cooldown with at least three cells racked and an overcharge builds over 0.8 s (`weapon.overcharge`, HUD `Overcharge 62%` then `OVERCHARGE // RELEASE`); release fires one slow (105 m/s), wide (3.2 m radius) bolt for three cells that does 2.4× lance damage and **ignores a raised shield**. Longer cooldown after.
- Bots: the threat assessment now also reports the nearest shielded rival in the cone (`shieldedTargetId`); with three cells and no ordinary target they hold the trigger through the cooldown and let go once charged. Otherwise they pulse the trigger to keep their old cadence.

## Validation

- `npx tsc --noEmit` clean; **1060 tests / 184 files** pass; `vite build` passes. New suite `ordnance` covers press/hold/release and cell accounting, the piercing bolt against a raised shield, the bot hold, spike loading and heat/boost effect, the nitro refill and its inside-line placement, and the cable attach, pull, release, shield cut and timeout in a real race.
- Stills through the review API (`scripts/ordnance-stills.ts`): [nitro on the hairpin inside](evidence/handling-round42/ordnance/01-nitro-inside-hairpin.jpg), [spike rack in the canyon](evidence/handling-round42/ordnance/02-spike-rack-canyon.jpg), [cable rack on the sweeper](evidence/handling-round42/ordnance/03-cable-rack-sweeper.jpg), [trigger held](evidence/handling-round42/ordnance/04-overcharge-held.jpg), [overcharge bolt leaving the lance](evidence/handling-round42/ordnance/05-overcharge-bolt.jpg). The receipt beside them shows two shots fired for four cells: one press, one overcharge.
- Not frame-captured: a live tow and a spike hit need a rival in the right place; both are covered by the race-level tests.

## Behaviour change to know

Holding E no longer auto-fires. Tap for single shots; hold for the overcharge. The finite-rack test now pulses the trigger.
