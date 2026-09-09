# Blind exhaust review — round 27

**Verdict: retain B as a bounded improvement. B is approximately 6/10 for the requested nozzle-end scope; A is approximately 4/10. Neither reaches the strict 8/10 quality target.**

This is an image-only comparison of the luminous engine/nozzle ends and immediately adjacent mechanical detail. All eight images listed below were individually viewed using `view_image`. No source, previous reviews, implementation details, or performance evidence informed this judgment. The screenshots establish visible appearance only; they do not establish underlying geometry or behavior in motion.

## Images reviewed

- A: `output/gauntlet/round-26/01-grid.png`, `03-canyon.png`, and `05-launch.png`.
- B: `output/gauntlet/round27-exhaust-v1/01-grid.png`, `03-canyon.png`, and `05-launch.png`.
- Quality references: `docs/inkstorm-overhaul/concepts/03-canyon.png` and `docs/inkstorm-overhaul/concepts/vehicles/teemto-inkstorm.png`.

Vehicle-design differences are allowed. The canyon concept supplies the relevant luminous-nozzle quality target: a concentrated hot core inside a darker, layered mechanical opening. The Teemto image supplies the adjacent-metal target: readable lip thickness, contact darkness, and separation between metal surfaces and cavities. Its visible small exhaust pipes are not treated as a requirement to copy that design.

## Comparison

| Criterion | A | B |
| --- | --- | --- |
| Internal value hierarchy | Nearly the entire opening is a pale cyan-white patch. Little distinction survives between the center and surrounding chamber. | Clear improvement: a small white center, darker surrounding field, teal radial bands, and outer edge are separately readable in all three shots. |
| Visible depth | The ends resemble glowing rounded caps with dark details laid across their upper edge. | The darker field suggests an interior, but the concentric outline and regular bright spokes still read mainly as a flat illuminated turbine graphic. There is little convincing front-lip overlap or throat depth. |
| Plasma/engine appearance | Reads more like two bright lamps than concentrated engine energy. | More convincingly an energized engine opening. The compact core helps, but uniform radial bands and an evenly colored cyan perimeter leave a decorative pinwheel impression. The references integrate the hot source with darker, layered metal more convincingly. |
| Adjacent mechanical readability | The bright fill competes with the small dark pieces crossing the top of each mouth; their relationship to the opening is unclear. | The reduced white area lets those pieces and the chamber boundary read more clearly. The bright teal outer edge still provides weak separation between emitting interior and solid casing. |
| Aliasing/artifacts | Slight stepping on the small circular silhouettes and thin dark details is visible at the supplied viewing scale. | No gross new artifact is apparent. The spokes add hard small edges, and the circular boundary remains slightly stepped; these stills cannot establish flicker or temporal aliasing. |
| Readability across the supplied scenes | The luminous disks remain obvious against the orange ground, but their internal structure is washed into one value. | The core and radial organization remain legible in grid, canyon, and launch. No supplied frame provides a clear fully shaded nozzle close-up, so this does not establish every sun-to-shade condition. |

## Scene checks

- **Grid:** B has the clearest immediate advantage over A's filled white disks. Both B openings retain a bright center without losing the surrounding dark bands.
- **Canyon:** B preserves the same hierarchy against the warm road and cool canyon surroundings. The openings still look shallow, and the top crossing pieces do not convincingly establish a recess.
- **Launch:** B's center stays visible against the bright environment. The radial pattern and near-uniform turquoise perimeter again look more graphic than volumetric.

The improvement is consistent across the three screenshots and is worth retaining. It does not close the reference gap in cavity depth, metal-versus-emission separation, or integration of the luminous opening with the adjacent hardware.

## One highest-impact next fix

**Make the luminous opening read as a recessed throat behind a solid metal lip.** At the current gameplay framing, show a mostly dark, visibly thick outer lip whose upper edge overlaps and shadows the teal chamber; maintain a dark annular separation between that lip and the existing compact white core. Keep the radial illumination subordinate enough that this overlap remains readable in all three scenes. The acceptance signal is visible front-to-back ordering—metal lip, shadowed chamber, hot core—without requiring a zoom or increasing the size of the white area.
