/** Salt Flats at Dusk: material-led surfaces over the existing interaction layout. */
export const DUSK_UI_CSS = /* css */ `
.pod-hud {
  --dusk-white:#f4f7fb; --dusk-muted:#a9b8c9; --dusk-blue:#8edcfa;
  --dusk-amber:#efb172; --dusk-red:#ff8a73; --dusk-ink:#090f19;
  --dusk-glass:rgba(9,15,25,.56); --dusk-line:rgba(188,215,239,.24);
  --pod-paper:var(--dusk-white); --pod-sky:var(--dusk-blue);
  --pod-orange:var(--dusk-amber); --pod-red:var(--dusk-red);
  --pod-sand:#e8caaa; --pod-muted:var(--dusk-muted);
  --pod-panel:rgba(9,15,25,.9); --pod-panel-solid:#101a29;
}

/* The whole setup remains opaque; its preview is the actual selected mesh. */
.pod-hud .simple-setup {
  --ui-paper:var(--dusk-white); --ui-ink:var(--dusk-white);
  --ui-teal:#b5c9dc; --ui-rust:var(--dusk-amber);
  --ui-heading:"Inkstorm UI",sans-serif;
  color:var(--dusk-white);
  background:radial-gradient(ellipse at 80% 5%,#263447 0,transparent 52%),linear-gradient(160deg,#141e2b,#0a101b 70%);
}
.simple-setup .setup-brand { color:#c5d2e0; font-weight:700; letter-spacing:.2em; font-size:14px; }
.simple-setup .setup-types { border-color:var(--dusk-line); gap:4px; }
.simple-setup .setup-types button { color:#b6c4d4; font-family:var(--ui-heading); font-weight:700; letter-spacing:.025em; border-radius:0; }
.simple-setup .setup-types button[aria-pressed=true] { color:var(--dusk-white); background:linear-gradient(0deg,#8bb5dc16,transparent); border-bottom-color:var(--dusk-amber); }
.simple-setup .setup-types button:hover:not([aria-pressed=true]) { color:var(--dusk-white); background:#bedcfa0b; }
.pod-hud .simple-setup .pod-hud__garage-hero {
  background:radial-gradient(ellipse at 40% 46%,#41576b42,transparent 64%),linear-gradient(176deg,#1c2a3a 0%,#253245 47%,#79604d44 68%,#111b29 82%);
  border:1px solid #c0d9f218; border-radius:2px; box-shadow:inset 0 1px #dceafa0c;
}
.pod-hud .simple-setup .pod-hud__garage-hero::before {
  inset:0; border:0; border-radius:0;
  background:linear-gradient(180deg,transparent 52%,#e1b5880c 69%,transparent 70%),radial-gradient(ellipse at 50% 82%,#070c1466,transparent 55%);
}
.pod-hud .simple-setup .pod-hud__garage-model img,.pod-hud .simple-setup .pod-hud__garage-model canvas { filter:drop-shadow(0 18px 14px #02061188); }
.simple-setup .setup-pod-arrow,.pod-hud .simple-setup .pod-hud__garage-inspect button {
  color:var(--dusk-white); border-color:#b6d3ef40; border-radius:2px;
  background:linear-gradient(140deg,#abc9e00b,#08101b45); box-shadow:inset 0 1px #dceaff0a;
}
.simple-setup .setup-pod-arrow:hover,.pod-hud .simple-setup .pod-hud__garage-inspect button:hover { border-color:#c6e9fcaa; background:#b9d9f21a; }
.simple-setup .pod-hud__garage-name>span { color:var(--dusk-amber); font-size:11px; letter-spacing:.2em; }
.simple-setup .pod-hud__garage-name h1 { font-family:var(--ui-heading); font-weight:700; font-style:italic; letter-spacing:.035em; color:var(--dusk-white); text-shadow:0 2px 12px #0005; }
.simple-setup .pod-hud__garage-inspect>span { color:#b9c8d9; font-weight:400; letter-spacing:.08em; }
.simple-setup .setup-options>div>span { color:#aebfd2; font-weight:400; letter-spacing:.08em; }
.simple-setup .setup-options button { color:#c3d0df; border-bottom-color:#b2cce436; background:none; }
.simple-setup .setup-options button[aria-pressed=true] { color:var(--dusk-white); border-color:#c2dcf05c; border-bottom-color:var(--dusk-amber); background:linear-gradient(135deg,#b5cfe820,#86b4d80b); }
.simple-setup .setup-options button:hover { color:var(--dusk-white); background:#b9d9f215; }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { color:#10151f; background:linear-gradient(115deg,#f2c998,#e8a768); border-radius:2px; border:1px solid #ffe2b44d; font-family:var(--ui-heading); font-weight:700; font-style:italic; letter-spacing:.06em; box-shadow:0 2px 14px #e9a46012,inset 0 1px #fff4d04d; }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button:hover:not(:disabled) { background:linear-gradient(115deg,#ffe0b5,#efb378); }
.simple-setup .setup-more>summary { color:#c3d2e1; border-color:#bfd9ee42; background:#a5c2de08; border-radius:2px; }
.simple-setup .setup-more[open]>summary { color:var(--dusk-white); border-color:var(--dusk-amber); }
.simple-setup .setup-more-body { color:var(--dusk-white); background:#101a29fa; border-color:#b7d4f03b; box-shadow:0 18px 45px #0008; border-radius:3px; }
.simple-setup .setup-extras { border-color:var(--dusk-line); }
.simple-setup .setup-extras button,.simple-setup .setup-more .pod-hud__event-list button { color:#c3d2e1; border-color:#b7d4f03b; background:none; }
.simple-setup .setup-more .pod-hud__event-list button.is-selected { color:var(--dusk-white); border-left-color:var(--dusk-amber); background:#c7dff210; }
.simple-setup .setup-preview-status { color:var(--dusk-white); background:#0c1424ed; border:1px solid #b7d4f038; }
.pod-hud .simple-setup :is(button,summary,[data-pod-inspection]):focus-visible { outline-color:var(--dusk-blue); }
.pod-hud .simple-setup [data-pod-inspection]:focus-visible { outline-color:var(--dusk-blue); }

/* Separate white readouts leave the sky open; status positions remain stable. */
.pod-hud .pod-hud__race-rail { visibility:hidden; }
.pod-hud .pod-hud__race-stat,.pod-hud .pod-hud__race-time { background:none; border:0; box-shadow:none; }
.pod-hud .pod-hud__race-value,.pod-hud .pod-hud__clock {
  color:var(--dusk-white); font-family:"Inkstorm UI",sans-serif; font-weight:700;
  font-style:italic; letter-spacing:-.045em; -webkit-text-stroke:0;
  text-shadow:0 1px 1px #03081280;
}
.pod-hud .pod-hud__race-value small { color:#d4dfeb; font-size:.65em; font-weight:400; }
.pod-hud .pod-hud__race-time { width:160px; }
.pod-hud .pod-hud__clock { font-size:26px; }
.pod-hud .pod-hud__race-stat .pod-hud__label,.pod-hud .pod-hud__race-time>.pod-hud__label { color:#d1dce8; font-weight:400; letter-spacing:.18em; font-size:10px; text-shadow:0 1px 2px #030812; }
.pod-hud .pod-hud__race>.pod-hud__detail-toggle { color:#d3dfeb; background:none; border:0; font-family:"Inkstorm UI",sans-serif; font-weight:400; letter-spacing:.05em; }
.pod-hud .pod-hud__detail-toggle:focus-visible { outline-color:var(--dusk-blue); }
.pod-hud .pod-hud__corner { width:max-content; max-width:min(180px,calc(100vw - 32px)); color:var(--dusk-white); background:#09101926; border-color:#d6e6f029; border-radius:2px; }
.pod-hud .pod-hud__corner-distance { font-family:"Inkstorm UI",sans-serif; font-weight:700; font-style:italic; }
.pod-hud .pod-hud__course-progress-rail { color:#d8e6f3; border-color:#d6e8f359; box-shadow:none; }
.pod-hud .pod-hud__course-progress-rail::before { background:#d6e8f380; box-shadow:none; }
.pod-hud .pod-hud__course-progress-rail>[data-course-checkpoint] { background:#d6e8f399; }

/* A small readout glass replaces the decorative speed loop; live meters stay. */
.pod-hud .pod-hud__driving-instruments::before { content:''; position:absolute; inset:136px 17px 19px 12px; z-index:0; pointer-events:none; background:none; border-radius:3px; box-shadow:none; }
.pod-hud .pod-hud__driving-instruments .pod-hud__speed-dial { opacity:0; }
.pod-hud .pod-hud__driving-instruments .pod-hud__speed-number { color:var(--dusk-white); font-family:"Inkstorm UI",sans-serif; font-weight:700; font-style:italic; letter-spacing:-.055em; -webkit-text-stroke:0; text-shadow:0 1px 1px #02071280; }
.pod-hud .pod-hud__driving-instruments .pod-hud__speed-unit { color:#d2deeb; font-style:italic; font-weight:400; text-shadow:0 1px 1px #02071280; }
.pod-hud .pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label { color:#d6e2ee; font-weight:400; font-size:11px; text-shadow:0 1px 1px #02071280; }
.pod-hud .pod-hud__driving-instruments .pod-hud__meter-value { color:var(--dusk-white); font-family:"Inkstorm UI",sans-serif; font-weight:700; font-style:italic; text-shadow:0 1px 1px #02071280; }
.pod-hud .pod-hud__driving-instruments .pod-hud__meter-track,.pod-hud .pod-hud__driving-instruments .pod-hud__telemetry .pod-hud__meter-track { background:#050a12a6; border-radius:1px; box-shadow:0 0 0 1px #c8e7fa29; }
.pod-hud .pod-hud__driving-instruments .pod-hud__meter--boost .pod-hud__meter-fill { background:linear-gradient(90deg,#5fb4dc,#b8e9fb); }
.pod-hud .pod-hud__driving-instruments .pod-hud__meter--heat .pod-hud__meter-fill { background:linear-gradient(90deg,#bc794a,#f3c391); }
.pod-hud .pod-hud__driving-instruments .pod-hud__meter--damage .pod-hud__meter-fill { background:#f79785; }
.pod-hud .pod-hud__driving-instruments>.pod-hud__redline-heat>span { background:none; color:#d1ddeb; border-radius:1px; font-weight:400; text-shadow:0 1px 1px #020712; }
.pod-hud .pod-hud__driving-instruments>.pod-hud__redline-heat.is-active>span,.pod-hud .pod-hud__driving-instruments>.pod-hud__redline-heat.is-hot>span { color:var(--dusk-amber); }
.pod-hud .pod-hud__driving-instruments .pod-hud__telemetry.is-hot .pod-hud__meter--heat .pod-hud__label { color:var(--dusk-amber); font-weight:700; }
.pod-hud .pod-hud__driving-instruments .pod-hud__telemetry.is-damaged .pod-hud__meter--damage .pod-hud__label { color:var(--dusk-red); font-weight:700; }

/* Small glass ability tiles: real readiness rings, remapped keys and ammo. */
.pod-hud .pod-hud__combat-slot { --pod-system-accent:var(--dusk-blue); }
.pod-hud .pod-hud__combat-slot--shield { --pod-system-accent:var(--dusk-white); }
.pod-hud .pod-hud__combat-slot--mine { --pod-system-accent:var(--dusk-amber); }
.pod-hud .pod-hud__system-gauge { border-radius:2px; background:linear-gradient(135deg,#9cbfdd18,#06101c94); box-shadow:inset 0 0 0 1px #cbe4f66b; transform:translateX(-50%); }
.pod-hud .pod-hud__system-gauge::before { background:conic-gradient(var(--pod-system-accent) 0 var(--pod-readiness-angle),#bdd8f121 var(--pod-readiness-angle) 360deg); border-radius:50%; }
.pod-hud .pod-hud__combat-slot::after { background:none; border:0; }
.pod-hud .pod-hud__system-icon { filter:none; }
.pod-hud .pod-hud__combat-slot--weapon .pod-hud__system-icon::before { background:var(--dusk-blue); box-shadow:0 6px 0 var(--dusk-blue); }
.pod-hud .pod-hud__combat-slot--weapon .pod-hud__system-icon::after { background:var(--dusk-blue); }
.pod-hud .pod-hud__combat-slot--shield .pod-hud__system-icon { border-color:var(--dusk-white); }
.pod-hud .pod-hud__combat-slot--mine .pod-hud__system-icon { background:var(--dusk-amber); }
.pod-hud .pod-hud__combat-slot--mine .pod-hud__system-icon::after { background:#0c1623; }
.pod-hud .pod-hud__combat-key { color:var(--dusk-white); border-color:#cbe4f64a; background:#0b1322b8; border-radius:1px; text-shadow:none; }
.pod-hud .pod-hud__system-label { color:#dae6f2; font-weight:400; background:none; text-shadow:0 1px 1px #02071280; }
.pod-hud .pod-hud__system-ammo { color:var(--dusk-white); text-shadow:0 1px 1px #02071280; }
.pod-hud .pod-hud__combat-slot[data-ready=true] .pod-hud__system-gauge { box-shadow:inset 0 0 0 1px #cbe4f69c; }
.pod-hud .pod-hud__combat-slot[data-ready=false] .pod-hud__system-icon { opacity:.48; }
.pod-hud .pod-hud__galactic.is-shield-active .pod-hud__combat-slot--shield .pod-hud__system-gauge { background:#78cdec29; box-shadow:inset 0 0 0 1px #d5f6ff,0 0 0 1px #92dffa55; }
.pod-hud .pod-hud__galactic.is-shield-active .pod-hud__combat-slot--shield .pod-hud__system-icon { border-color:#b5efff; opacity:1; }

/* Alert timing, priority and their measured lanes are unchanged. */
.pod-hud .pod-hud__driving-feedback>.pod-hud__launch[data-stage=result],.pod-hud .pod-hud__driving-feedback>.pod-hud__flight,.pod-hud .pod-hud__driving-feedback>.pod-hud__meter--drift { color:var(--dusk-white); background:linear-gradient(90deg,#09131d45,transparent 80%); border-left-width:1px; border-left-color:var(--dusk-amber); }
.pod-hud .pod-hud__driving-feedback>.pod-hud__flight { border-left-color:var(--dusk-blue); }
.pod-hud .pod-hud__driving-feedback>.pod-hud__launch[data-stage=result] header>strong { font-family:"Inkstorm UI",sans-serif; font-weight:700; font-style:italic; }
.pod-hud .pod-hud__driving-feedback .pod-hud__label,.pod-hud .pod-hud__driving-feedback .pod-hud__meter-value { color:var(--dusk-white); }
.pod-hud .pod-hud__threat-cue>span { color:var(--dusk-white); background:#0a1421c2; text-shadow:none; }
.pod-hud .pod-hud__combat-feedback { background:var(--dusk-glass); color:var(--dusk-amber); border-color:var(--dusk-line); }
.pod-hud .pod-hud__combat-feedback>strong,.pod-hud .pod-hud__galactic-alert>strong { color:var(--dusk-white); font-family:"Inkstorm UI",sans-serif; font-weight:700; font-style:italic; }
.pod-hud .pod-hud__combat-feedback[data-kind=takedown]>strong,.pod-hud .pod-hud__combat-feedback[data-kind=wreck]>strong,.pod-hud.has-wreck-state>.pod-hud__galactic-alert>strong { background:#0b1522b3; font-family:"Inkstorm UI",sans-serif; color:var(--dusk-white); }
.pod-hud .pod-hud__combat-feedback[data-kind=takedown]>span,.pod-hud .pod-hud__combat-feedback[data-kind=wreck]>span,.pod-hud.has-wreck-state>.pod-hud__galactic-alert>span { background:#0b1522cc; color:#d4e2f0; }
.pod-hud .pod-hud__director-event { width:max-content; max-width:min(320px,calc(100vw - 32px)); min-height:0; padding:7px 10px; background:var(--dusk-glass); border:0; border-left:1px solid var(--dusk-amber); border-radius:2px; clip-path:none; box-shadow:none; }
/* Keep the full event text available to assistive technology, with the actual
   event headline carrying the visible warning. Lifetime/priority are unchanged. */
.pod-hud .pod-hud__director-event>span,.pod-hud .pod-hud__director-event>small { position:absolute; left:0; top:0; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; transform:none; }
.pod-hud .pod-hud__director-event>strong { font:700 13px/1.25 "Inkstorm UI",sans-serif; letter-spacing:.055em; color:var(--dusk-amber); white-space:normal; overflow-wrap:anywhere; }
.pod-hud .pod-hud__director-event[data-phase=end]>strong { color:#b6decf; }
.pod-hud .pod-hud__countdown { color:var(--dusk-white); font-family:"Inkstorm UI",sans-serif; font-weight:700; font-style:italic; -webkit-text-stroke:0; text-shadow:0 3px 14px #030a1366; }

/* Redundant instrument captions stay in the accessibility tree. */
.pod-hud .pod-hud__race-stat .pod-hud__label,.pod-hud .pod-hud__race-time>.pod-hud__label { position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.pod-hud .pod-hud__race-value { font-size:32px; }
.pod-hud .pod-hud__driving-instruments .pod-hud__speed-number { font-size:38px; }
.pod-hud .pod-hud__system-label { font-size:10px; letter-spacing:.02em; }
.pod-hud .pod-hud__combat-slot--weapon .pod-hud__system-label { position:absolute; width:1px; height:1px; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.pod-hud .pod-hud__course-progress-rail { opacity:.65; }

/* Optional settings inherit the same material without changing their controls. */
.pod-hud .pod-hud__pause { color:var(--dusk-white); background:#0b1421f2; border:1px solid #afcce440; box-shadow:0 16px 50px #0008; }
.pod-hud .pod-hud__pause>strong,.pod-hud .pod-hud__settings>header strong { color:var(--dusk-white); font-family:"Inkstorm UI",sans-serif; text-shadow:none; }
.pod-hud .pod-hud__pause button { color:#cbdbe9; border-color:#adc9e142; background:#192738; }
.pod-hud .pod-hud__pause button:hover,.pod-hud .pod-hud__settings-tabs button.is-selected { color:#08111c; background:var(--dusk-blue); }
.pod-hud .pod-hud__settings-sliders label,.pod-hud .pod-hud__settings-toggles label { background:#121e2e; color:#dce7f0; border-color:#6f9dbb; }

.pod-hud.is-high-contrast { --dusk-glass:#08101b; --dusk-line:#d9eaff99; }
.pod-hud.is-high-contrast .pod-hud__course-progress-rail { opacity:1; }
.pod-hud.is-high-contrast .simple-setup { background:#080f19; }
.pod-hud.is-high-contrast .simple-setup .pod-hud__garage-hero { background:#17283b; border-color:#cde5f56b; }
.pod-hud.is-high-contrast .pod-hud__race-stat,.pod-hud.is-high-contrast .pod-hud__race-time,.pod-hud.is-high-contrast .pod-hud__driving-instruments::before { background:#080f19; }
.pod-hud.is-high-contrast .pod-hud__system-gauge,.pod-hud.is-high-contrast .pod-hud__system-label,.pod-hud.is-high-contrast .pod-hud__combat-key { background:#080f19; color:#fff; }
.pod-hud.is-high-contrast .pod-hud__galactic.is-shield-active .pod-hud__combat-slot--shield .pod-hud__system-gauge { background:#102739; }
.pod-hud.is-high-contrast .pod-hud__driving-feedback>.pod-hud__launch,.pod-hud.is-high-contrast .pod-hud__driving-feedback>.pod-hud__flight,.pod-hud.is-high-contrast .pod-hud__driving-feedback>.pod-hud__meter { background:#080f19; }

@media(max-width:760px) {
  .simple-setup .setup-brand { font-size:12px; }
  .simple-setup .setup-options>div>span { font-size:11px; }
  .pod-hud .pod-hud__race-stat .pod-hud__label,.pod-hud .pod-hud__race-time>.pod-hud__label { font-size:9px; letter-spacing:.12em; }
  .pod-hud .pod-hud__race-time { width:100px; }
  .pod-hud .pod-hud__clock { font-size:18px; }
  .pod-hud .pod-hud__driving-instruments::before { inset:98px 10px 13px 8px; }
  .pod-hud .pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label { font-size:10px; }
}
@media(max-height:540px) and (min-width:600px) {
  .simple-setup .setup-options>div>span { font-size:11px; letter-spacing:0; }
  .simple-setup .pod-hud__garage-name h1 { font-size:23px; }
  .pod-hud .pod-hud__clock { font-size:20px; }
  .pod-hud .pod-hud__driving-instruments::before { inset:84px 8px 11px; }
}
`;
