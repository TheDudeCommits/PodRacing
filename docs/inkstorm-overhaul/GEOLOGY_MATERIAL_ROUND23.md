# Geological relief and signed cut/fill material correction

Round 22 brought screen-derivative relief from the existing rock albedo and preserved albedo variation in cool shadow. It added no texture reads or physical displacement. Actual canyon captures compiled without errors and show more visible fracture detail; this does not establish concept parity.

The round-22 launch screenshots exposed a separate pale horizontal belt on the physical cliffs. The material used the absolute authored height offset as its geology mask. A signed cut/fill cliff crosses zero displacement at the former ground height, forcing the rock material off halfway up the face regardless of its steepness.

The round-23 candidate also uses the authored grade from the two existing vertex normal probes. Each normal height lookup already computes the signed authored offset; retaining those outputs adds no height lookup or texture read. The stronger of offset influence and grade influence gates the existing slope-based rock blend. Steep signed transitions stay stone across zero displacement, while flat shelves and terrain with no authored field retain their sand treatment. Geometry, physics, field samples and shadow positions are unchanged.

Typecheck passes. Actual round-23 shader compilation, screenshots, blind criticism and frame timing are required before accepting the result. Round-22 evidence remains in output/gauntlet/round-22; it depicts the faulty belt, not this correction.
