# V18b HUD correction

The failed V18 native run recorded 165 actual samples: heat binding 0–100 and damage 0–4.3 while both fill widths stayed zero; boost bound 64.1–100 retained an actual width. The receipt is FAIL with six captures, no browser errors, and owned browser/server cleanup. Exact receipt, raw trace and live frame are preserved under `failed-v18`; original evidence is unchanged.

The telemetry span inherits `position:static` from inkstorm styles, and unlike the speed meter has no block display rule. An empty inline span ignores its CSS width. The existing percentage binding and numeric text were correct. The minimal correction adds `display:block` to the existing horizontal telemetry fill selector, retaining its bound width and full track height.

The actual daylight frame also shows small ability captions and SHIFT / REDLINE against bright sand. Two existing selector lines now provide tight petrol caption backing, with 12px desktop ability labels and the existing 10px narrow overrides. Ability rings stay open. No container housing, gameplay binding, instrument anchor, threat semantics, accessibility text, Build, Map or Garage changes.

TypeScript and PostCSS syntax pass (771 rules), exact source delta is three CSS lines, whitespace is clean, and RaceHud is byte-identical. No extra tests, browser or build were run. Native V18b resource correlation and daylight readability still require the root's next capture.
