# Expanded saved-course calendar

More than seven events now have a separate, responsive normal-flow grid when RaceEventAtlas applies `has-expanded-calendar`. Each real event retains its actual button/name and keyboard order; no new decorative destinations are created. The grid wraps intrinsic-height cards, so arbitrary saved titles can grow naturally. Selected discs grow modestly to 1.15 with rust border and cream/petrol contrast. The unused absolute orbital drawing is hidden only in this mode. Ordinary seven-event orbital composition is unchanged.

The atlas itself scrolls vertically; expanded maps no longer force a 1000px minimum width or fixed drawing height. The parent owns the class toggle and vertical nearest-button reveal, since the old horizontal-only orbital reveal cannot expose lower rows after keyboard focus with preventScroll. Parent native checks must cover eight real events after Save, pairwise button separation and accessible selection of the saved route, then its exact launch seed.

CSS parsed and source whitespace checks passed. Native expanded-calendar and short-landscape coverage remain pending; this is source evidence only.
