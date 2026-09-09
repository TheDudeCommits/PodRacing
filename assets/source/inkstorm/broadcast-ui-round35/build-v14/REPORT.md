# Build V14 functional equipment marks

Source ownership: `src/ui/workshopSymbols.ts` only. The function accepts `workshopSymbol(slot, partId?)`; the parent passes the real part ID for available cards. Existing one-argument installed-slot output is byte-identical to V13. Unknown and wrong-bay IDs safely use that fallback.

All twenty part marks use original filled paths/circles inside common equipment-family housings. Transparent stencil cuts retain the cream/petrol palette. No fonts, raster images, external resources, copied logos, runtime statistics or interactions are added by the artwork. Type-only catalogue ID coverage makes a future missing catalogue entry a TypeScript error.

| Part ID | Functional interior glyph | Actual catalogue modifiers |
| --- | --- | --- |
| `balanced-ion-drive` | Symmetric feed rotor: predictable launch torque and handling. | +6% acceleration; +3% handling; -2% topSpeed |
| `nova-burst-turbines` | Two tapered discharge jets: straight-line speed and redline boost. | +12% topSpeed; +12% boost; -10% cooling; -4% armour |
| `krayt-torque-core` | Broad low-ratio gear: acceleration out of slow corners. | +14% acceleration; +4% drift; -7% topSpeed; -3% cooling |
| `siege-pulse-reactor` | Armoured energy core: weapons feed behind a heavy enclosure. | +12% weaponPower; +7% armour; -6% acceleration; -5% handling |
| `desert-fin-array` | Exposed diagonal ceramic vanes: passive clean-air cooling. | +10% cooling; +3% handling; -4% armour |
| `cryoflux-radiator` | Filled phase-change reservoir with a liquid-level cut. | +18% cooling; +3% boost; -7% armour; -3% acceleration |
| `venturi-sand-scoop` | Wide mouth and narrow throat: speed-fed Venturi airflow. | +12% cooling; +7% boost; -5% handling; -2% weaponPower |
| `sealed-heat-sink` | Closed stacked thermal blocks: impact-resistant cooling mass. | +7% armour; +8% cooling; -5% topSpeed; -3% acceleration |
| `durasteel-ribcage` | Central structural spine and three broad reinforcing ribs. | +16% armour; +3% shield; -7% acceleration; -6% handling |
| `ceramic-skirmish-shell` | Three overlapping plates retain glancing-hit coverage with lighter structure. | +10% armour; +4% handling; -4% weaponPower; -2% topSpeed |
| `reactive-plating` | Stored charge discharged through reactive armour into the weapons bus. | +11% armour; +6% weaponPower; -8% cooling; -3% boost |
| `stripped-racing-frame` | Open diagonal bracing: nonessential plate mass has been removed. | +9% topSpeed; +7% acceleration; -16% armour; -4% shield |
| `vector-vane-rack` | Opposed directional vanes around the steering pivot. | +12% handling; +11% drift; -3% topSpeed; -2% armour |
| `gyro-lock-yoke` | Captive gyro with a fixed cross-axis: yaw stability rather than deep drift. | +15% handling; +3% armour; -9% drift; -2% boost |
| `countersteer-fins` | Opposite sweeping arrow fins: deliberate countersteer through sustained slides. | +17% drift; +6% boost; -5% armour; -3% cooling |
| `long-course-stabilizers` | Long centerline with level trim surfaces: stable fast sweepers. | +6% topSpeed; +8% handling; -5% acceleration; -4% drift |
| `pulse-shield-relay` | Shield receiver fed by two short bus terminals. | +20% shield; +3% armour; -6% weaponPower; -3% boost |
| `heat-lance-amplifier` | Discharge chamber and focused lance beam. | +18% weaponPower; +2% topSpeed; -9% cooling; -4% shield |
| `scrap-mine-printer` | Feed hopper above a printed mine cartridge. | +35% mineCapacity; +3% armour; -5% acceleration; -3% handling |
| `repulsor-recuperator` | A return loop around a capacitor: recovered slide energy becomes boost. | +10% boost; +4% drift; -6% weaponPower; -8% mineCapacity |

Validation: TypeScript passed. Every current catalogue ID generated a distinct SVG; XML parsed all twenty. Five fallback icons remain byte-identical. Unknown IDs, prototype-like names and every wrong-bay catalogue ID preserve the fallback. `git diff --check` passed. No browser, build or GPU was used; visual acceptance remains with the parent capture.

`variants.json` includes actual emitted SVG, semantic mapping and catalogue modifiers. `manifest.json` records the catalogue and before/after source hashes.
