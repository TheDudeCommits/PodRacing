# Now This Is PodRacing

An original, cel-shaded arcade desert racer built with Three.js, TypeScript,
and Vite. Every visible mesh, texture, shader, particle, gameplay sound, and
the continuing musical score is generated in code. The sole bundled media
exception is the short, user-supplied vehicle-selection sting.

Race one, two, or three laps in an eight-craft field across a new procedurally
generated infinite-desert circuit every time the grid is
released. Seeded macro-shaping changes the route's orientation, scale, sweep,
chicane, hairpin, widths, and dune placement while preserving the designed fast
straights, terrain launch, illuminated canyon, checkpoints, and recovery beats.
Six distinct desert regions alter the terrain silhouette, atmosphere, wind,
hazard mix, palette, and racing rhythm. Generated safe, risky, and class-favoured
branches create real route decisions while mapping cleanly back to canonical
lap progress.
No course seed repeats within a play session. The vehicle rides six live terrain
probes, banks and pitches over dunes, takes damage from racer and pylon contact,
powerslides, stores drift boost, gets airborne, and lands hard.

Play the public production build at
[now-this-is-podracing.vercel.app](https://now-this-is-podracing.vercel.app).

The Galactic Racer expansion adds four physically distinct vehicle classes,
Heat Lance combat, defensive pulse shells, contextual Scrap Mine traps,
risk/reward redline surges, takedowns, wreck-and-recovery sequences, six
collectible upgrade parts, and animated sand geysers, heat vents, rockfalls,
and dust-interference zones. Seven race rulesets—Circuit, Eliminator,
Checkpoint Sprint, Combat Race, Survival Gauntlet, Drift Trial, and Team
Race—change AI objectives, scoring, elimination, and results. Easy, Medium,
and Hard AI retain distinct aggressive, clean, and erratic personalities
rather than receiving scripted outcomes.

Every race also has a seeded director. Sandstorms, heatwaves, rockfalls,
shortcut windows, gate blackouts, and superheated finale conditions are warned
before they alter visibility, grip, wind, hazards, or route choice. Drafting
inside a rival wake charges a slingshot while adding turbulence, and the
countdown is a playable launch test: hold the throttle in the moving sweet spot
for a perfect release or risk bogging and overheating.

Every run opens on a stable four-card vehicle registry with a live procedural
3D portrait of each craft. Each class exposes its real speed, acceleration,
drift, defence, and weapon ratings before the player commits; the chosen
physics tune is locked for the entire race. The supplied opening sting flows
into an original synthesized heroic space-opera cue and ducks beneath the race
mix. Authored canyon walls are solid simulation obstacles, and sustained or
extreme off-course excursions recover the racer to the latest validated
checkpoint.

The pre-race Workshop persists an independent five-part build for every
vehicle. Engine, cooling, armour, steering, and gadget parts have real positive
and negative modifiers plus named synergies; they affect acceleration, terminal
speed, cooling, drift, boost, damage resistance, weapons, shields, and mine
capacity in the authoritative simulation. Online start packets carry every
human build to the host so multiplayer uses the same rules as solo play.

The same registry is also the online lobby. Create a room, share its compact
six-character code, and up to three friends can join without accounts or
server configuration. The host chooses the lap count and starts the grid;
connected players occupy stable racer slots while AI fills the eight-craft grid and
takes over a disconnected craft. The host also creates the new course seed and
shares it in the start packet, so every friend reconstructs the exact same
track. The 120 Hz host simulation remains the only race authority, with
semantic controls sent peer-to-peer and ordered snapshots presented by guests.
Rooms remain open for rematches, and every rematch creates another course. When
the local player completes an overtake, the supplied “NOW THIS IS PODRACING”
callout cuts cleanly through the mix with overlap protection and a short
cooldown.

The renderer combines quantized ramp lighting, hard specular bands, Fresnel rim
light, distance-scaled inverted hulls, and a depth/normal Sobel pass. Terrain,
rock formations, course furniture, pilots, dust, sky, twin suns, HUD, minimap,
and the complete Web Audio mix are all procedural.

## Run

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Chrome on Apple Silicon is the primary target.

## Controls

Before the race:

- `A` / `D`, `Arrow Left` / `Arrow Right`, or `V`: select a vehicle
- `1`–`4`: select a vehicle directly
- selector buttons `1` / `2` / `3`: choose the number of laps (host-owned online)
- choose race mode and AI level (`Easy`, `Medium`, or `Hard`)
- open `Workshop` to equip one part in each of the five build slots
- `Create Room`: make a six-character code; enter a friend's code and choose `Join`
- `Space` / `Enter`: lock the selection and begin the countdown

Room codes accept normal typing and native `Cmd/Ctrl+V` paste. While the code
field is focused, gameplay bindings—including `WASD`, `E`, `F`, `G`, `Q`, `R`,
and `V`—remain text input and cannot steer, select, or trigger an action.

During the race:

- `W` / `Arrow Up`: throttle
- `S` / `Arrow Down`: brake
- `A` / `Arrow Left`: steer left
- `D` / `Arrow Right`: steer right
- `Space`: drift; release after charging to boost
- `Shift`: redline boost; release before overheating to avoid an explosion
- `E`: fire the forward Heat Lance
- `F`: deploy a rear Scrap Mine
- `Q`: activate the defensive pulse shell
- `R`: recover to the latest checkpoint; restart from results
- `P` / `Escape`: pause
- `M`: mute
- `H`: toggle the controls card

The pause/settings panel supports complete keyboard and gamepad remapping,
controller deadzone/sensitivity/assist, independent master/music/engine/effects/
voice mix, reduced motion, camera shake and FOV scaling, high contrast, and
optional directional threat cues. Binding capture temporarily suppresses live
gameplay input, so assigning a key or button can never trigger its old action.

Results retain a sparse pose history of the race, detect sub-0.18-second photo
finishes, classify the strongest overtakes, slingshots, takedowns, launches, and
director moments, and play selected highlights back through a cinematic camera
without mutating race truth.

## Verification

```bash
npm run typecheck
npm run test
npm run build
npm run capture
npm run capture:selector
npm run capture:multiplayer
npm run capture:procedural
npm run profile
```

`npm run capture` builds the current source, launches deterministic headless
Chrome at 2× Retina resolution, and writes the six core gameplay views plus ten
Galactic Racer combat, vehicle, hazard, upgrade, and wreck scenarios to
`output/playwright/`, plus the live pre-race selection screen. It verifies the
first-load freeze, pointer selection, Space-to-start lock, forbidden mid-race
class changes, and the real keyboard throttle, brake, A-left/D-right steering,
weapon, and shield paths before closing. `npm run profile` records the same
production frame graph and its draw-call/triangle budgets.

`npm run capture:selector` runs a separate 2x Retina compositor stress test. It
alternates selection input rapidly for ten seconds, checks every card and 3D
portrait on each sample, rejects layout or opacity movement, and requires
byte-identical screenshots after the menu settles. It also records a WebM and
an audio lifecycle receipt in `output/playwright/`.

`npm run capture:multiplayer` opens two isolated Chrome profiles at 2x Retina
resolution, types gameplay-bound letters into the room field, joins via a real
native clipboard paste, and verifies host/guest start authority, host-owned lap
selection, per-player vehicle choice, remote driving input, authoritative-state
convergence, the `F` mine path, and the dedicated Shift heat display. It writes
initial, host, guest, and in-race frames plus a machine-readable network receipt
to `output/playwright/`.

`npm run capture:procedural` drives an actual race and rematch, captures both
generated circuits from minimap and world cameras at 2x Retina resolution, and
rejects repeated geometry, intersections, nondeterministic same-seed rebuilds,
host/guest course disagreement, or browser errors.

The module boundaries, runtime budgets, and capture API are documented in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Originality and asset policy

This is a fan-made homage to high-speed space-fantasy desert racing. It does
not bundle film footage, logos, character likenesses, downloaded models,
textures, or HDRIs. The only recording is the six-second selection sting
provided directly by the user for this project; the seamless continuation and
all gameplay audio are original Web Audio synthesis. “Star Wars” is the
property of Lucasfilm Ltd.; this project is unaffiliated and non-commercial.
