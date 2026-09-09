# V19b caption paint-order correction

V19 completed the recorded functional gates with 17 captures and clean cleanup. Its actual desktop frame nevertheless shows SHIFT / REDLINE almost invisible: the new curved speed glass paints over it. Both positioned sibling contexts had z-index 2, and the speed section follows redline in DOM order.

The correction sets the existing speed sibling to z-index 1, below redline 2 and telemetry 4. No caption position, opacity, background, instrument bounds, visible values or bindings change. RaceHud is unchanged. Exact V19 source, receipt and visual-regression frame are preserved.

TypeScript and whitespace checks pass. Source delta is exactly one property. The next native frame must confirm restored caption paint visibility; computed box visibility alone did not detect the previous overlap. Suggested read-only guard records actual redline/caption/ring boxes and sibling context z-indices and requires redline to paint above speed when their boxes overlap. No browser/build was run by this agent.
