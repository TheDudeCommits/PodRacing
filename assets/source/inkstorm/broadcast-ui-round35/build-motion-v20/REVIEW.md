# V20 Build entry correction

Only the whole-root opacity animation is removed. The visible Build root now uses its existing opacity 1, opaque cream background and final transform immediately; the installed systems, available parts and summary keep their existing staged entry animations, and equipment feedback remains. This prevents garage text from showing through the incoming Build screen.

The motivating full-resolution original-video example is PTS 5.20s, preserved under output/critics/blind-hud-v19/motion-review. This is a temporal readability correction; settled menu composition is unchanged.

TypeScript, PostCSS (771 rules), exact one-line delta and whitespace checks pass. RaceHud and workshopGraphicStyles are byte-identical, so no focus, room selectors, accessibility state, binding, catalogue or reduced-motion semantics changed. Native V20 video and existing motion/catalogue gates remain required; no new browser/build was run by this agent.
