# Round 36 — accepted track-flow changes

The shipping candidate retains the cleared route-light layout and heading-independent collision response. The experimental relative-hover, slope-relative landing and ground-effect changes were **withdrawn after full-race regressions**. Vehicle suspension, landing damage, gravity and repulsor range match the released HEAD implementation.

## Retained changes

- Route lights move 12 m beyond the course half-width. Every candidate is checked against main/fork lanes, low bridge ramps and actual scenery/canyon proxies. Lights buried in canyon walls or other scenery are omitted. The authoritative surviving list feeds both simulation and rendering.
- Pylon collision dimensions match the visible object: 0.62 m radius and 4.9 m top, replacing stale 1.15 m / 9.9 m dimensions. Off-course impacts remain possible; markers no longer reach into ordinary driving lanes.
- Collision torque converts the world impulse into the same local basis as its contact point. Equivalent glances therefore produce the same yaw response after rotating the track, instead of reversing the kick on opposite headings.

| Course | Lights before → after | Within widest-craft reach of lane before → after | Minimum clearance beyond lane half-width |
|---|---:|---:|---:|
| Canyon | 187 → 128 | 185 → 0 | 11.84 m |
| Foundry | 188 → 124 | 187 → 0 | 11.61 m |
| Glasslands | 188 → 128 | 186 → 0 | 11.41 m |

Horizontal benchmark counts use an identical flat-base terrain fixture to isolate placement. Five additional production-terrain course seeds verify obstacle clearance and exact Float32 renderer/collider position agreement. Main and alternate paths share the same placement rejection logic.

## Validation

**58 focused tests across nine files, TypeScript and scoped whitespace checks pass for the shipping selection.** Tests cover heading-invariant glances and forward travel, six 3 m edge landing cases, ordinary terrain-query bounds, course markers, bridge clearance, collision latching, takedown attribution and renderer disposal. The local-patch and incline-compensation experiments' tests are preserved privately, not presented as shipping features.

The shipping source manifest is `output/handling-round36/SHIPPING_SOURCE_FREEZE.json`. The two GameApp course setup calls pass `race.routeMarkers`. No terrain geometry was changed, and the simulation remains host-authoritative at 120 Hz.

## Why the hover experiment was withdrawn

The initial incline test improved in isolation, but the native Time Attack failed to set a valid PB because cumulative hard landings caused wrecks on an otherwise clear racing line. A slower native run also wrecked. An independent 3 m edge-launch bug was fixed first, but that did not resolve the whole-lap regression.

With **the same current course, markers and full-pace CPU controller**, archived HEAD vehicle physics finished in 63.725 s with zero wrecks, seven flights longer than one second and total landing damage 0.23164. The experimental relative-hover version finished in 77.958 s with two wrecks, sixteen such flights and cumulative landing damage 1.73370 including damage after recovery. Ground-effect candidates and 10 / 14 / 18 m catch envelopes did not reliably solve it and were rejected. No damage or PB-validity gate was weakened.

All experimental source, tests, failures and measurements remain in `output/handling-round36/`. Source hash `643d54f2902ab726da9f32c274380ef6a6f3aa9003c1fbe4748dbc7a2bc01795` and its incline claims are superseded and unreleased. The isolated CPU controller is causal diagnostic evidence, not an exact native replay or performance measurement. The root task owns final full-suite, whole-race and performance acceptance for the combined build.
