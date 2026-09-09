# Inkstorm driving mastery

The local mastery system lives in `src/game/mastery/`. It observes authoritative
120 Hz simulation results and stores presentation/record data. It cannot advance,
restore or otherwise mutate racing truth. Online rooms retain the existing
host-owned chaotic rules and must not enter the local record pipeline.

## Event rules

- **Inkstorm Time Attack:** one lap on the fixed Inkstorm circuit, a stock craft,
  no rivals, combat, pickups, random hazards or director interference.
- **Flight School:** the same clean course with five interactive lessons. Real
  speed, braking, drift-release events and engine cooling advance the lessons.
- **Inkstorm Cup:** three ordered, two-lap races with the existing named rivals,
  stock machinery and cumulative 15/12/10/8/6/4/2/1 points. Clean races retain
  collisions and drafting, and disable position-dependent AI catch-up.
- **Daily Flight:** one clean lap on a deterministic shared seed derived from
  the UTC calendar date. The selected day's event stays fixed during a run.
- **Open Expedition:** the existing random course, mode, difficulty, Workshop,
  combat and race-director experience.
- **Saved courses:** up to sixteen seed favorites appear as repeatable clean
  time-attack events. New generator versions invalidate stale saved layouts.

Medal targets are authored challenge goals rather than claimed human benchmark
times. The hero target is 90/110/145 seconds for gold/silver/bronze. Human and
controller lap testing should tune these before treating them as balanced.

## Application integration contract

`new RaceMastery()` loads the local profile. Use `selectEvent(id)` before building
the grid. Rebuild the course transactionally with the event seed, laps, mode and
difficulty and pass `competitionProfile: event.profile` to `RaceSimulation`.
Only Open Expedition should generate a new seed for each start. Non-chaos
profiles enforce stock machinery in the simulation itself.

After the final class and build are locked, call:

```ts
mastery.beginRun({
  event,
  courseSeed: race.course.seed ?? race.state.seed,
  directorSeed: race.state.director.seed,
  vehicleClass: player.galactic!.vehicleClass,
  loadout: player.workshop?.loadout ?? null,
  tune: DEFAULT_PODRACER_CONFIG,
  playerId: player.id,
  recordEligible: !captureMode && room.lobby.role === 'solo',
});
```

Call `mastery.step(result)` immediately after every authoritative `race.step()`.
Repeated steps are ignored. Stop supplying data after abandoning a run and call
`beginRun` again on retry. `model()` returns the full DOM-independent
`HudMasteryViewModel`; `model(previewOptions)` finds the exact matching record
while the player changes their grid selection.

`ghostPose(raceTime)` returns interpolated position and orientation of the prior
personal best. Render it through a translucent, non-colliding craft proxy. It
disappears after its finish and across implausible jumps. Never insert the ghost
into simulation entries, collision, drafting, AI, audio or network authority.

Actions: `toggleGhost()`, `saveCourse(actualSeed)`, `restartChampionship()` and
`selectEvent(result.nextEventId)`. An instant retry should reuse the same event,
seed and locked class, rebuild/reset the existing race, call `beginRun` and
release its countdown without reopening the selection menu.

## Persistence and validity

Records are separated by generator, physics and rule versions, course identity
and seed, event/director seed, mode/profile, lap count, AI difficulty, vehicle
class, full canonical Workshop parts and effective base tune serialization.
Version mismatches cannot silently reuse a best time or ghost. These are local
personal records; there is no global leaderboard or server verification.

Timing gates supply sector splits. A recovery, wreck or incomplete course cannot
set a clean time record or medal. Championship race points still reflect the
actual finishing order, including legitimate in-race recoveries. A finished
round can be practiced again without awarding duplicate points.

The save is bounded to 36 records, 3 recent ghosts, 40 history entries and 16
favorites. Ghosts sample at 10 Hz with at most 6,002 frames; a longer run may save
a time without a ghost. Corrupt ghost data is dropped while valid timing data
survives. Storage quota fallback saves timing data without ghosts, and the HUD
receives a truthful warning if durable storage is unavailable.

## Verification

`tests/race/mastery.test.ts` covers persistence across reload, matching sector
deltas, class/build/tune/version isolation, malformed saves, ghost interpolation,
recovery and diagnostic invalidation, favorite replay, UTC daily seeds,
championship ordering/deduplication, quota failures, actual tutorial evidence,
clean-race restrictions, unchanged chaotic rules and feathered keyboard launches.

After application integration the full suite passed 50 files / 283 tests,
TypeScript, production build and `git diff --check` passed. Browser checks
confirmed fixed solo Time Attack, actual Flight School throttle advancing to the
braking lesson, saved courses surviving reload, Open Expedition restoring the
eight-racer chaotic field with a new seed, and the results retry retaining its
seed while starting immediately. The retry test used an explicitly staged
diagnostic finish; it is not evidence of a human-completed lap. All browser
sessions and temporary servers used for those checks were closed.

Physical controller acceptance, balanced human medal targets and a complete
human lap remain separate application-level acceptance checks.
