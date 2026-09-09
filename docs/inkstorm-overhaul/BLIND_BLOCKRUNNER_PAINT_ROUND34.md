# Blockrunner round 34 — blind source paint review

Reviewed on 2026-09-08. Evidence consists only of the seven pinned PNGs below, each inspected individually. No implementation, material definitions, prior reviews, or runtime captures were read.

**Verdict: the palette direction is recognizable, but the source palette/material target is only partially met: 6/10.** The new treatment gives the craft a coherent cream, charcoal, and oxide-red identity. It does not yet reproduce the target's readable pilot materials, varied surface response, or purposeful wear. This is a useful paint foundation, not full vehicle-art parity.

**Visual preservation is strong: 9.5/10 against the supplied control-fit renders.** The fullcraft and driver pairs visibly preserve the silhouette, part layout, driver proportions, seated pose, hand/control relationship, and major negative spaces. This is an image-based judgment, not proof of identical mesh data.

The actuals are neutral Blender source renders. Their gray background, lack of hangar staging, and absence of runtime lighting are not defects in this review. No game-performance, FPS, or AAA claim follows from these images. The concept is an appearance reference; its invented rear intake and other unsupported structural details are not geometry authority. In particular, the original paired rear cream slopes are not a failure because the concept inset substitutes a different rear assembly.

## Scores

Scale: 0 is absent or unusable; 10 fully meets the relevant reference within the evidence available. These are separate judgments, not an averaged technical acceptance gate.

| Dimension | Score | Reason |
| --- | ---: | --- |
| Palette alignment | 7/10 | Correct large color families and placement. The cream reads darker and more khaki than the target's warm ivory; the red is appropriately earthy but subdued. Lighting contributes to the difference, so exact albedo cannot be inferred. |
| Driver clarity | 6.5/10 | Pale hands and helmet against a dark suit establish a pilot immediately. Arm bends, hands, and the held controls remain readable. The suit loses internal definition, while the near-black brown visor becomes a large undifferentiated block. |
| Material credibility | 4.5/10 | Sidewalls, structural rails, engine paint, helmet, gloves, and suit all appear similarly dull. The target separates hard painted surfaces, exposed edges, visor, and clothing more convincingly. |
| Wear credibility and readability | 3.5/10 | A few close-up cream scuffs are visible, but fullcraft, front, and rear views read almost pristine. Wear lacks the target's clear placement at contact edges, intake rims, studs, and exposed corners. |
| Silhouette preservation versus control-fit | 9.5/10 | Twin pods, long rails, crossbar, cockpit walls, disks, rear profile, and characteristic openings visually align in the matched views. |
| Driver anatomy and pose preservation versus control-fit | 9.5/10 | No visible new deformation, missing limb, altered hand count, or material-induced pose ambiguity. The existing block/minifigure anatomy is retained. |
| Full vehicle-art parity within source-comparable scope | 5.5/10 | Broad identity is present; the target's material hierarchy, pilot finish, and authored wear remain substantially richer. This score excludes environment, cinematic lighting, unsupported concept geometry, and runtime effects. |

Full finished-scene parity and in-game acceptance are outside this evidence and are not scored.

## Individual image observations

1. **Paint fullcraft:** The three main color groups read at a glance. Pod intakes, long studded rails, cream cockpit, and dotted sidewall retain their recognizable organization. At this distance the finish reads mainly as flat color: engine-shell chips, rail-edge exposure, and sidewall abrasions are not prominent. The pilot is identifiable but its torso and limbs are visually compressed into a dark center.
2. **Paint driver:** The hands clearly wrap the controls, and the upper arms and forearms remain anatomically connected. Cream hands provide helpful local contrast. The beige helmet shares the cockpit color rather than the target's gray/silver identity. The very dark visor has little visible reflective cue, while the charcoal suit lacks the target's gray panels and distinct glove/suit separation. Fine scratches on the cream body exist, but appear isolated and weakly connected to usage.
3. **Paint front:** Symmetry, twin circular fans, bridge, and driver placement read cleanly. The dark pilot is well separated from the cream seat surround, though suit detail disappears at this scale. Intake interiors are legible as geometry but their nearly uniform red treatment offers little separation between casing, blades, and center hub. There is little visible edge wear to anchor the engine surfaces.
4. **Paint rear:** The original rear slopes, sidewall height, cockpit opening, and exposed pod outlets remain clear. The driver remains recognizably seated. Large red and cream areas look especially uniform in this view, confirming that the missing surface variety is not confined to the hero angle. No penalty is assigned for the absence of the concept inset's invented rear intake.
5. **Control-fit fullcraft:** The matched composition provides a strong preservation reference. Major contours and part relationships visually coincide with the paint view. The control has conspicuous glossy black highlights, especially on studs and rails. The paint reduces that mirror-like appearance but also loses useful edge definition; the desired finish should recover selective highlights without restoring the control's broad glossy black response.
6. **Control-fit driver:** Helmet, visor extent, arms, hands, torso, legs, and controls appear to occupy the same positions as the paint close-up. The new dark suit creates stronger contrast against the cockpit than the control's gray driver, but the control displays more internal arm and torso shading. The paint should preserve the improved outer silhouette while restoring that internal readability.
7. **Concept target:** The transferable strengths are warm ivory, rich worn red, charcoal structural panels, selective lighter edges, convincing localized scuffs, and a gray pilot whose visor and suit remain distinct. The hero image and inset also include lighting and invented structural details that cannot serve as evidence that the source geometry is wrong.

## Three highest-value fixes

1. **Refine the palette around the driver and cream body, with no geometry change.** Move the cockpit and disk appearance toward a cleaner warm ivory, retaining enough warmth to avoid sterile white. Give the helmet a distinguishable gray/titanium appearance and the suit a readable mid-dark gray with restrained panel/value variation. Keep the visor dark but give it a controlled reflective band; keep the pale hands clearly separated from the sleeve cuffs. Success: helmet, visor, arms, torso, and hands all read in the fullcraft and front views, not only the close-up.
2. **Create a deliberate material hierarchy.** Recover small, controlled highlights on painted pod curves, rail/stud edges, and sidewall corners; separate the helmet and visor response from the matte suit. Make intake blades and hubs distinguishable from the casing through material/value treatment. Keep the broad painted panels restrained rather than uniformly glossy. Success: the same neutral source views communicate several plausible surface types while retaining the three-color identity.
3. **Replace barely visible scattered marks with localized, scale-aware wear.** Concentrate a limited number of readable chips and abrasions on intake rims, pod leading edges, rail/stud tops, outer sidewall corners, disk rims, and high-contact cream slopes. Vary size and direction, with occasional exposed undercoat/metal and subtle dirt in protected joins. Avoid identical wear on every stud or dense noise over all faces. Success: wear reads at fullcraft scale and becomes more credible, rather than merely more numerous, in the driver close-up.

## Pinned evidence

Paths are relative to `/Users/amir/Projects/PodRacing`. SHA-256 values were computed from the inspected files.

| Image | Path | SHA-256 |
| --- | --- | --- |
| Paint fullcraft | `assets/source/inkstorm/blockrunner-round34/paint-v1-fullcraft-20260908-round34-paint-v2.png` | `d7eca2c44cd6abc36229098207d5ec48fb72b8557e33d2a1c47b411b4b68b048` |
| Paint driver | `assets/source/inkstorm/blockrunner-round34/paint-v1-driver-20260908-round34-paint-v2.png` | `cf9a65f314b1d097405dabf72aaacb122f5e439e954a7a07af5eb5f06056494d` |
| Paint front | `assets/source/inkstorm/blockrunner-round34/paint-v1-front-20260908-round34-paint-v2.png` | `d9afa00eff05ae46221f4875f92a1eeaf80031cd99ad6abde052775472d4b0bf` |
| Paint rear | `assets/source/inkstorm/blockrunner-round34/paint-v1-rear-20260908-round34-paint-v2.png` | `b3be3197434995b1ca324ba88f22ccbd069ec966dfd56e5a91cf8e1b1adf692e` |
| Control-fit fullcraft | `assets/source/inkstorm/blockrunner-round34/control-fit-v1-fullcraft-20260908-round34-fit-v1.png` | `fd7f24e604a520fc54cb5b0d7b7338be968632abd444667ec61cd81b2fbd4367` |
| Control-fit driver | `assets/source/inkstorm/blockrunner-round34/control-fit-v1-driver-20260908-round34-fit-v1.png` | `897a15f95867818ff5a95106e6a7dd461ca4b8b3494ccf73b2da0e459f180281` |
| Concept target | `docs/inkstorm-overhaul/concepts/12-blockrunner-round34.png` | `6e96d24510b73847f02f483ac5ffa73c30262a9968b03bfd9c401c5ce8d776d8` |
