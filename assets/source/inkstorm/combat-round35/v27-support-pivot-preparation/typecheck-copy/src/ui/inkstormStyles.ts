import { THREAT_CUE_HEIGHT, THREAT_CUE_WIDTH } from './threatLayout';

/** Inkstorm: cream race typography, indigo instruments and vermilion garage printwork. */
export const INKSTORM_HUD_CSS = /* css */ `
.pod-hud {
  --pod-ink: #171928; --pod-ink-soft: #25273b; --pod-paper: #fff0cc;
  --pod-sand: #eab88a; --pod-orange: #f27858; --pod-red: #ff7469;
  --pod-violet: #8589c1; --pod-sky: #91ded8; --pod-green: #b9dfb3;
  --pod-muted: #b9adb0; --pod-panel: rgba(25, 28, 44, .82);
  font-family: "Avenir Next Condensed", "Arial Narrow", sans-serif;
}
.pod-hud button, .pod-hud select, .pod-hud input { touch-action: manipulation; }
.pod-hud button:focus-visible, .pod-hud select:focus-visible, .pod-hud input:focus-visible {
  outline: 3px solid var(--pod-paper); outline-offset: 4px;
}
/* The garage is a machine portrait and a race invitation, with setup on the workbench. */
.pod-hud__vehicle-select { padding: 24px 36px; background: #1b2033; overflow-y: auto; place-items: center; }
.pod-hud__vehicle-select::before { inset: 0; border: 0; clip-path: none; opacity: .62;
  background: repeating-linear-gradient(118deg, transparent 0 110px, #7881a10a 111px 112px), radial-gradient(ellipse at 36% 42%, #a0695f45, transparent 60%); }
.pod-hud__vehicle-select::after { height: 4px; background: var(--pod-orange); }
.pod-hud__vehicle-select-frame { width: min(1680px,100%); min-height: min(800px,calc(100dvh - 48px)); display: grid;
  grid-template-columns: minmax(0,1fr) 330px; grid-template-rows: auto minmax(285px,1fr) auto auto; gap: 15px 28px; }
.pod-hud:not(.has-mastery) .pod-hud__vehicle-select-frame { grid-template-columns:minmax(0,1fr); }
.pod-hud__vehicle-select-head { grid-column: 1/-1; margin: 0; display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 1px solid #eee0bd35; }
.pod-hud__eyebrow { display:block; color:var(--pod-orange); font:700 10px/1.3 "Avenir Next", sans-serif; letter-spacing:.22em; }
.pod-hud__vehicle-select-head h1 { margin-top:8px; font-size:clamp(35px,4.2vw,62px); line-height:.85; text-shadow:none; letter-spacing:-.03em; }
.pod-hud__vehicle-select-head h1 small { display:block; font-size:12px; letter-spacing:.14em; font-style:normal; margin-bottom:7px; }
.pod-hud__garage-edition { text-align:right; display:grid; gap:5px; }
.pod-hud__garage-edition span { color:var(--pod-orange); font-size:10px; letter-spacing:.2em; }
.pod-hud__garage-edition strong { font-size:23px; font-style:italic; }
.pod-hud__garage-edition small { color:var(--pod-muted); text-transform:none; font:12px "Avenir Next",sans-serif; }
.pod-hud__garage-hero { grid-column:1; position:relative; min-width:0; min-height:285px; overflow:hidden;
  background:radial-gradient(ellipse at 50% 50%,#57567660,transparent 57%),linear-gradient(155deg,#44435a 0%,#292e43 47%,#1d2235 47.2%,#252737 100%); }
.pod-hud__garage-hero::before { content:""; position:absolute; width:67%; height:52%; left:15%; top:20%; border:1px solid #d9c5b225; border-radius:50%; transform:rotate(-12deg); box-shadow:0 0 0 34px #caaeae06,0 0 0 70px #caaeae04; }
.pod-hud__garage-hero::after { content:"07"; position:absolute; right:3%; top:3%; font:italic 900 170px/.85 "Arial Narrow",sans-serif; color:#fce9c508; pointer-events:none; }
.pod-hud__garage-bay { position:absolute; left:20px; top:16px; color:#c0bdc8; font-size:10px; letter-spacing:.15em; z-index:2; }
.pod-hud__garage-bay i { display:inline-block; width:6px; height:6px; margin:0 8px; border-radius:50%; background:var(--pod-sky); }
.pod-hud__appearance { position:absolute; top:36px; left:20px; right:100px; z-index:5; font-size:10px; }
.pod-hud__appearance[hidden] { display:none; }
.pod-hud__appearance>div { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
.pod-hud__appearance span { color:var(--pod-muted); letter-spacing:.12em; }
.pod-hud__appearance button { color:var(--pod-paper); background:#252c40; border:1px solid #ddd1b955; padding:5px 10px; cursor:pointer; font:inherit; }
.pod-hud__appearance button[aria-pressed="true"] { color:#201d2a; background:var(--pod-sand); border-color:var(--pod-sand); }
.pod-hud__appearance button:focus-visible { outline:2px solid var(--pod-orange); outline-offset:2px; }
.pod-hud__appearance small { color:var(--pod-muted); font-size:9px; text-transform:none; }
.pod-hud__appearance p { margin:5px 0 0; color:#d8cfcb; font-size:10px; text-transform:none; }
.pod-hud__appearance>button { margin-top:5px; }
.pod-hud__garage-model { position:absolute; left:12%; right:3%; top:20px; bottom:60px; }
.pod-hud__garage-model img { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 22px 12px #11132170); }
.pod-hud__garage-name { position:absolute; left:22px; bottom:55px; max-width:65%; pointer-events:none; z-index:3; }
.pod-hud__garage-name>span { font-size:10px; color:var(--pod-orange); font-weight:800; letter-spacing:.17em; }
.pod-hud__garage-name h2 { margin:5px 0 7px; font-size:clamp(31px,3.2vw,52px); font-style:italic; line-height:.95; letter-spacing:-.04em; text-shadow:1px 3px 14px #181b2b; }
.pod-hud__garage-name p { max-width:490px; margin:0; color:#d6cbd1; text-transform:none; font:12px/1.45 "Avenir Next",sans-serif; text-shadow:0 1px 5px #171928; }
.pod-hud__garage-inspect { position:absolute; right:18px; bottom:65px; z-index:4; display:flex; gap:10px; align-items:center; font-size:9px; letter-spacing:.12em; }
.pod-hud__garage-inspect button { width:35px; height:35px; color:var(--pod-paper); background:#242b3e; border:1px solid #ddd1b94d; font-size:24px; cursor:pointer; }
.pod-hud__garage-stats { position:absolute; bottom:0; left:0; right:0; display:flex; gap:19px; padding:13px 22px; border-top:1px solid #ddd1b923; background:#1b203399; }
.pod-hud__garage-stats>div { display:flex; align-items:center; gap:7px; flex:1; font-size:10px; }
.pod-hud__garage-stats span { color:#c7bac1; }
.pod-hud__garage-stats i { flex:1; height:3px; background:linear-gradient(90deg,var(--pod-sand) var(--rating),#faf0cd20 var(--rating)); }
.pod-hud__garage-stats b { font-size:12px; font-weight:600; }
.pod-hud__mastery { grid-column:2; grid-row:2/4; display:flex; flex-direction:column; min-width:0; min-height:0; padding:5px 0 0; }
.pod-hud__mastery h2 { font-size:34px; line-height:1; font-style:italic; letter-spacing:-.025em; margin:10px 0; }
.pod-hud__mastery>p { font:12px/1.5 "Avenir Next",sans-serif; text-transform:none; color:#bebaca; margin:0 0 13px; }
.pod-hud__event-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:6px 0 8px; color:var(--pod-sand); font-size:10px; letter-spacing:.1em; }
.pod-hud__event-heading small { color:#c8c4d2; font:10px/1.4 "Avenir Next",sans-serif; letter-spacing:0; text-transform:none; }
.pod-hud__cup-replay { margin-top:8px; padding:9px 12px; border:1px solid var(--pod-sand); background:#eab88a18; color:var(--pod-paper); font:700 12px "Avenir Next Condensed",sans-serif; text-transform:uppercase; cursor:pointer; }
.pod-hud__cup-replay[hidden] { display:none; }
.pod-hud__event-list { display:flex; flex-direction:column; flex:1 1 0; min-height:110px; gap:0; overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:#e4ba97a0 #141a2c; }
.pod-hud__event-list::-webkit-scrollbar { width:5px; }
.pod-hud__event-list::-webkit-scrollbar-track { background:#141a2c; }
.pod-hud__event-list::-webkit-scrollbar-thumb { background:#e4ba9780; border-radius:3px; }
.pod-hud__event-list button { position:relative; display:grid; gap:3px; flex-shrink:0; padding:5px 12px; border:0; border-left:2px solid #c8b9ac22; border-bottom:1px solid #c8b9ac1a; text-align:left; color:var(--pod-paper); background:transparent; cursor:pointer; }
.pod-hud__event-list button strong { font:700 14px "Avenir Next Condensed",sans-serif; text-transform:uppercase; }
.pod-hud__event-list button small { display:none; font:10px/1.4 "Avenir Next",sans-serif; color:#bcb5c5; }
.pod-hud__event-list button.is-selected small { display:block; }
.pod-hud__event-list button.is-selected { border-left-color:var(--pod-orange); background:linear-gradient(90deg,#bd69492d,transparent); }
.pod-hud__event-list button.is-selected::after { content:"↗"; position:absolute; right:7px; top:8px; color:var(--pod-orange); }
.pod-hud__personal-record { display:grid; grid-template-columns:1fr auto; gap:5px 12px; padding-top:17px; }
.pod-hud__personal-record>span { font-size:10px; letter-spacing:.14em; color:var(--pod-sand); align-self:center; }
.pod-hud__personal-record>strong { font-size:24px; font-style:italic; }
.pod-hud__personal-record>small { grid-column:1/-1; font:11px/1.5 "Avenir Next",sans-serif; text-transform:none; color:var(--pod-muted); }
.pod-hud__mastery-controls { display:flex; gap:9px; padding-top:12px; }
.pod-hud__mastery-controls[hidden] { display:none; }
.pod-hud__mastery[hidden], .pod-hud__mastery-result[hidden] { display:none; }
.pod-hud__asset-status { position:fixed; right:32px; top:78px; bottom:auto; z-index:60; width:292px; max-width:calc(100vw - 36px); padding:8px 10px; background:#20283d; border:1px solid #d9c4a455; border-left:3px solid var(--pod-orange); color:var(--pod-paper); font:11px/1.4 "Avenir Next",sans-serif; text-transform:none; }
.pod-hud__asset-status[hidden] { display:none; }
.pod-hud.has-vehicle-selection .pod-hud__asset-status { top:auto; bottom:18px; right:24px; }
.pod-hud__mastery-controls button { flex:1; background:transparent; border:1px solid #b7c2d333; padding:9px; color:var(--pod-paper); cursor:pointer; font-size:11px; }
.pod-hud__mastery-controls button[aria-pressed=true] { color:var(--pod-sky); border-color:#91ded86a; }
.pod-hud__mastery-controls button:disabled { opacity:.5; cursor:default; }
.pod-hud__garage-rule { padding-top:23px; margin-top:10px; border-top:1px solid #eee0bd20; }
.pod-hud__garage-rule span { display:block; color:var(--pod-orange); font-size:9px; letter-spacing:.18em; }
.pod-hud__garage-rule strong { display:block; font-size:23px; font-style:italic; line-height:1.15; margin-top:8px; }
.pod-hud.has-mastery .pod-hud__garage-rule { display:none; }
.pod-hud__vehicle-cards { grid-column:1; gap:12px; }
.pod-hud__vehicle-card { min-height:104px; height:104px; padding:10px 12px; border:1px solid #eee0bd2c; border-top:2px solid #eee0bd2c; background:#22273a; clip-path:none; box-shadow:none; }
.pod-hud__vehicle-card.is-selected { background:#3b3745; border-color:var(--pod-orange); box-shadow:inset 0 -3px var(--pod-orange); }
.pod-hud__vehicle-card-index { font-size:10px; color:#a89dad; }
.pod-hud__vehicle-card h2 { margin:9px 0 0; max-width:64%; font-size:clamp(14px,1.3vw,21px); min-height:0; line-height:1.1; }
.pod-hud__vehicle-card-check { font-size:8px; padding:0; top:10px; right:10px; color:var(--pod-orange); background:none; }
.pod-hud__vehicle-card .pod-hud__vehicle-preview { position:absolute; right:0; bottom:4px; width:60%; height:67px; margin:0; border:0; background:transparent; clip-path:none; opacity:.85; }
.pod-hud__vehicle-card .pod-hud__vehicle-preview::after { display:none; }
.pod-hud__vehicle-card-description,.pod-hud__vehicle-card .pod-hud__vehicle-stats { display:none; }
.pod-hud__vehicle-select-footer { grid-column:1/-1; grid-template-columns:1.05fr 1fr 1.1fr; gap:26px; margin:0; padding-top:15px; border-top:1px solid #eee0bd35; letter-spacing:.03em; }
.pod-hud__vehicle-select-footer>section { min-height:140px; padding:0; background:transparent; border:0; clip-path:none; overflow:visible; }
.pod-hud__selector-section-head { margin-bottom:9px; border:0; padding:0; }
.pod-hud__selector-section-head strong { font-size:12px; font-style:normal; letter-spacing:.1em; }
.pod-hud__selector-section-head small { font-size:10px; }
.pod-hud__selector-control-grid { grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px 4px; }
.pod-hud__selector-control-grid>span { display:grid; justify-items:start; gap:4px; }
.pod-hud__selector-control-grid em { font-size:10px; font-weight:500; color:#c8bfc9; }
.pod-hud__vehicle-select-footer kbd { min-width:22px; font-size:10px; padding:3px 5px; background:#fff0cc13; color:var(--pod-paper); border:1px solid #fff0cc30; border-radius:2px; box-shadow:none; }
.pod-hud__difficulty-selector,.pod-hud__lap-selector { gap:6px; }
.pod-hud__difficulty-selector>span,.pod-hud__lap-selector>span,.pod-hud__mode-selector>span { font-size:11px; }
.pod-hud__difficulty-selector button,.pod-hud__lap-selector button,.pod-hud__room-actions button,.pod-hud__mode-selector select,.pod-hud__workshop-toggle { min-height:28px; font-size:11px; clip-path:none; background:#262b3e; border-color:#b0b6cc40; }
.pod-hud__difficulty-selector button.is-selected,.pod-hud__lap-selector button.is-selected { background:var(--pod-paper); color:var(--pod-ink); border-color:var(--pod-paper); }
.pod-hud__selector-setup { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto auto auto auto; gap:7px 12px; align-content:start; }
.pod-hud__selector-setup>.pod-hud__selector-section-head,.pod-hud__difficulty-selector,.pod-hud__selector-launch-row { grid-column:1/-1; }
.pod-hud__selector-setup>.pod-hud__selector-section-head { margin-bottom:0; }
.pod-hud__mode-selector,.pod-hud__lap-selector { margin:0; }
.pod-hud__selector-launch-row { display:grid; grid-template-columns:auto 1fr; gap:6px 12px; margin-top:2px; }
.pod-hud__workshop-toggle { color:var(--pod-paper); border:1px solid #efba8a70; padding:8px 15px; }
.pod-hud__start-button { display:flex; justify-content:space-between; align-items:center; gap:18px; min-height:41px; padding:10px 17px; background:var(--pod-orange); color:#1b1e2b; border:1px solid #ffa780; font:900 16px/1 "Avenir Next Condensed",sans-serif; letter-spacing:.05em; cursor:pointer; text-transform:uppercase; }
.pod-hud__start-button b { font-size:21px; line-height:1; }
.pod-hud__start-button:hover:not(:disabled) { background:#ffa374; }
.pod-hud__start-button:disabled { opacity:.5; cursor:default; }
.pod-hud__start-prompt { grid-column:1/-1; font-size:9px; text-align:right; min-height:0; font-weight:500; }
.pod-hud__room-actions { grid-template-columns:1fr 1fr auto; gap:6px; }
.pod-hud__room-code input { height:28px; font-size:15px; background:#161d30; border-color:#bcc9db40; }
.pod-hud__room-status { font-size:10px; margin-top:8px; color:#cfc3c9; }
.pod-hud__room-member { font-size:10px; }
/* A real workbench: full part descriptions and the five meaningful slots. */
.pod-hud__workshop { inset:0; top:100px; width:100%; height:calc(100% - 100px); padding:22px; background:#1c2235; border:1px solid #eacbaa50; border-top:3px solid var(--pod-orange); clip-path:none; box-shadow:0 18px 50px #111321; z-index:30; }
.pod-hud__workshop-head { height:62px; }
.pod-hud__workshop-head span { color:var(--pod-orange); font-size:10px; }
.pod-hud__workshop-head strong { font-size:32px; }
.pod-hud__workshop-slots { gap:10px; margin:12px 0 15px; }
.pod-hud__workshop-slot { height:auto; min-height:78px; padding:11px 12px; background:#272c42!important; border:1px solid #c2adc93b!important; border-top:2px solid #c2adc93b!important; }
.pod-hud__workshop-slot span { font-size:10px; }
.pod-hud__workshop-slot strong { font-size:15px; white-space:normal; margin:6px 0; }
.pod-hud__workshop-slot small { font-size:11px; white-space:normal; line-height:1.35; }
.pod-hud__workshop-slot.is-selected { border-color:var(--pod-sky)!important; box-shadow:inset 0 -3px var(--pod-sky); }
.pod-hud__workshop-body { height:calc(100% - 171px); grid-template-columns:minmax(0,1.75fr) minmax(230px,.65fr); gap:18px; overflow:auto; }
.pod-hud__workshop-parts { gap:12px; align-content:start; }
.pod-hud__workshop-part { min-height:150px; padding:16px!important; background:#262b41!important; display:flex; flex-direction:column; gap:8px; border:1px solid #c3b2cb3a!important; border-left:3px solid var(--pod-orange)!important; }
.pod-hud__workshop-part>strong { font-size:19px; padding-right:48px; }
.pod-hud__workshop-part>p { font:12px/1.5 "Avenir Next",sans-serif; white-space:normal; text-transform:none; color:#c5bdcb; }
.pod-hud__workshop-part>span { white-space:normal; font:12px/1.4 "Avenir Next",sans-serif; text-transform:none; }
.pod-hud__workshop-part.is-equipped { background:#293c44!important; }
.pod-hud__workshop-part.is-equipped::after { right:12px; top:17px; font-size:8px; }
.pod-hud__workshop-summary { display:flex; flex-direction:column; gap:10px; }
.pod-hud__workshop-summary>div { padding:13px 16px; min-height:85px; flex:1; background:#202639; }
.pod-hud__workshop-summary strong { font-size:11px; }
.pod-hud__workshop-summary ul { gap:6px; margin-top:9px; }
.pod-hud__workshop-summary li { font:12px/1.4 "Avenir Next",sans-serif; white-space:normal; text-transform:none; }
/* Racing: one status cluster, one equipment group, one driving instrument. */
.pod-hud__race { left:32px; top:27px; right:auto; width:340px; height:93px; background:transparent; }
.pod-hud__race-rail { display:none; }
.pod-hud__race-stat { top:0; width:auto; text-align:left; }
.pod-hud__race-stat--position { left:0; right:auto; }
.pod-hud__race-stat--lap { left:155px; }
.pod-hud__race-value { font-size:47px; text-shadow:0 2px 9px #171928aa; }
.pod-hud__race-value small { font-size:22px; color:#ffecccba; }
.pod-hud__race-stat .pod-hud__label { font-size:10px; letter-spacing:.17em; margin-top:6px; text-shadow:0 2px 5px #171928; }
.pod-hud__race-time { left:0; top:70px; transform:none; width:260px; display:flex; align-items:center; gap:14px; }
.pod-hud__clock { font-size:20px; letter-spacing:.03em; text-shadow:0 2px 7px #171928; }
.pod-hud__race-time>.pod-hud__label { display:none; }
.pod-hud__split { position:static; transform:none; padding:4px 7px; border-left:2px solid currentColor; background:#1e2539ed; font-size:13px; text-shadow:none; }
.pod-hud__detail-toggle { position:fixed; top:32px; right:32px; pointer-events:auto; padding:7px 10px; color:var(--pod-paper); border:1px solid #ffe9c23c; background:#20283d70; font-size:10px; letter-spacing:.1em; cursor:pointer; }
.pod-hud__mode-status { left:32px; top:168px; padding:7px 12px; width:240px; background:#1b213aaa; border-left:2px solid var(--pod-sand); clip-path:none; }
.pod-hud__mode-status>span { font-size:11px; color:var(--pod-sand); }
.pod-hud__mode-status>strong { display:none; }
.pod-hud__mode-status small { font-size:10px; }
.pod-hud__mode-status b { font-size:15px; }
.pod-hud.has-ordinary-circuit:not(.has-hud-detail) .pod-hud__mode-status { visibility:hidden; opacity:0; }
.pod-hud__map { left:auto; right:32px; top:82px; width:180px; padding:10px; background:#1c2335ad; border:1px solid #ffeacc42; clip-path:none; box-shadow:none; opacity:0; visibility:hidden; }
.pod-hud.has-hud-detail .pod-hud__map { visibility:visible; opacity:1; }
.pod-hud.has-asset-status .pod-hud__map { top:154px; }
.pod-hud__map::after { display:none; }
.pod-hud__course-progress { top:124px; left:32px; right:auto; min-height:0; max-height:none; height:34px; width:240px; }
.pod-hud__course-progress-rail { display:none; }
.pod-hud.has-hud-detail .pod-hud__course-progress-rail { display:block; position:fixed; left:auto; right:48px; top:300px; bottom:190px; }
.pod-hud__corner { left:0; right:auto; top:0; bottom:auto; width:240px; min-height:30px; padding:0; display:flex; align-items:center; gap:10px; transform:none; background:none; border:0; box-shadow:none; clip-path:none; text-align:left; }
.pod-hud__corner::after { display:none; }
.pod-hud__corner-arrow { position:static; border:0; border-radius:0; flex-shrink:0; font-size:28px; width:28px; line-height:1; color:var(--pod-paper); text-shadow:0 2px 7px #171928; }
.pod-hud__corner-distance { font-size:16px; margin:0; white-space:nowrap; text-shadow:0 2px 7px #171928; }
.pod-hud__corner-tag { display:block; font-size:10px; max-width:112px; color:var(--pod-paper); text-shadow:0 2px 7px #171928; }
.pod-hud__systems-cluster { left:32px; bottom:32px; width:247px; height:65px; padding:0; border:0; clip-path:none; background:transparent; }
.pod-hud__combat-grid { grid-template-columns:repeat(3,1fr); grid-template-rows:1fr; gap:8px; }
.pod-hud__combat-slot { grid-row:auto; border:1px solid #e7dcc238; background:#1c2337bb; box-shadow:none; overflow:visible; }
.pod-hud__combat-slot--weapon { grid-row:auto; }
.pod-hud__combat-key { right:auto; width:18px; min-width:18px; top:5px; left:6px; font-size:11px; }
.pod-hud__system-gauge { width:26px; height:26px; top:10px; left:26px; }
.pod-hud__system-label { bottom:6px; left:6px; font-size:10px; }
.pod-hud__system-ammo { font-size:12px; right:5px; bottom:6px; }
.pod-hud__upgrades { bottom:76px; font-size:9px; }
.pod-hud__upgrade-chip { font-size:9px; padding:3px 6px; }
.pod-hud__context-action { display:none; left:32px; bottom:109px; width:247px; height:auto; padding:6px 9px; transform:none; text-align:left; border:0; border-radius:0; box-shadow:none; background:#1d243ba6; }
.pod-hud__galactic.has-target .pod-hud__context-action { display:block; border:0; box-shadow:none; }
.pod-hud__context-action::before,.pod-hud__context-action::after { display:none; }
.pod-hud__context-action .pod-hud__galactic-target { position:static!important; width:auto!important; height:auto!important; padding:0!important; margin:0!important; overflow:visible!important; clip:auto!important; clip-path:none!important; white-space:normal!important; font-size:11px; color:var(--pod-sky); }
.pod-hud__target-reticle { display:none; }
.pod-hud__speed { right:32px; bottom:71px; width:202px; height:158px; transform:none; }
.pod-hud__speed-ring { inset:0 0 auto auto; width:150px; height:150px; -webkit-mask:radial-gradient(circle,transparent 62%,#000 63% 68%,transparent 69%); mask:radial-gradient(circle,transparent 62%,#000 63% 68%,transparent 69%); opacity:.85; filter:drop-shadow(0 2px 4px #17192888); }
.pod-hud__speed-ring::before { display:none; }
.pod-hud__speed-readout { right:14px; top:37px; left:auto; width:123px; }
.pod-hud__speed-number { font-size:65px; text-shadow:0 2px 10px #171928aa; }
.pod-hud__speed-unit { font-size:12px; color:var(--pod-paper); letter-spacing:.13em; }
.pod-hud__speed>.pod-hud__meter { bottom:0; width:91px; }
.pod-hud__speed .pod-hud__meter-head .pod-hud__label { font-size:10px; }
.pod-hud__speed .pod-hud__meter-track { height:4px; background:#1b243caa; }
.pod-hud__speed .pod-hud__meter--drift .pod-hud__meter-fill { background:var(--pod-sand); }
.pod-hud__telemetry { z-index:4; left:auto; right:32px; bottom:31px; width:192px; height:28px; display:flex; gap:15px; padding:0; background:none; border:0; clip-path:none; }
.pod-hud__telemetry .pod-hud__meter { display:block; width:90px; height:auto; }
.pod-hud__telemetry .pod-hud__meter-head .pod-hud__label { display:block; font-size:10px; letter-spacing:.1em; margin-bottom:5px; }
.pod-hud__telemetry .pod-hud__meter-head .pod-hud__label::after { display:none; }
.pod-hud__telemetry .pod-hud__meter-track { width:100%; height:4px; position:relative; border:0; background:#1b243caa; transform:none; }
.pod-hud__telemetry .pod-hud__meter-fill { position:static; height:100%; width:var(--pod-meter-value); background:var(--pod-orange); }
.pod-hud__telemetry .pod-hud__meter--heat .pod-hud__meter-fill { background:var(--pod-orange); }
.pod-hud__telemetry .pod-hud__meter--damage .pod-hud__meter-fill { background:var(--pod-red); }
.pod-hud__redline-heat,.pod-hud__redline-heat.is-visible,.pod-hud__redline-heat.is-hot { position:fixed; left:auto; top:auto; right:32px; bottom:246px; width:192px; min-height:22px; padding:5px 7px; clip-path:none; transform:none; border:0; background:#20273bba; }
.pod-hud__redline-heat>span { font-size:10px; letter-spacing:.04em; }
.pod-hud__redline-track { height:4px; }
.pod-hud__redline-heat.is-hot .pod-hud__redline-track { height:5px; }
.pod-hud__redline-heat.is-hot::after { font-size:9px; }
.pod-hud__galactic-alert,.pod-hud__director-event,.pod-hud__wrong-way { left:50%; right:auto; top:32px; bottom:auto; width:min(365px,38vw); min-height:0; background:#24243dde; border:0; border-left:3px solid var(--pod-orange); padding:11px 15px; clip-path:none; transform:translateX(-50%)!important; box-shadow:none; }
.pod-hud__galactic-alert strong,.pod-hud__director-event strong { font-size:19px; }
.pod-hud__galactic-alert span,.pod-hud__director-event small { display:block; font-size:12px; line-height:1.4; margin-top:4px; }
.pod-hud__director-event[data-phase] { background:#24243de8; }
.pod-hud__director-event>span { position:static; transform:none; display:block; width:auto; margin-bottom:4px; text-align:left; color:var(--pod-sand); font-size:9px; letter-spacing:.18em; }
.pod-hud__director-event small { white-space:normal; letter-spacing:.04em; }
.pod-hud.has-director-event .pod-hud__flight { top:auto; }
.pod-hud:not([data-notice=director]) .pod-hud__director-event,
.pod-hud:not([data-notice=galactic]) .pod-hud__galactic-alert { visibility:hidden; opacity:0; }
.pod-hud__flight { top:auto; bottom:280px; left:auto; right:32px; width:192px; text-align:right; transform:none; background:none; border:0; }
.pod-hud__flight strong { font-size:18px; }
.pod-hud__flight small { font-size:10px; }
.pod-hud__controls { bottom:32px; width:min(660px,calc(100vw - 560px)); left:50%; padding:9px 12px; gap:8px 14px; grid-template-columns:repeat(5,1fr); transform:translateX(-50%); background:#20283de8; clip-path:none; border:1px solid #ead9bd40; }
.pod-hud__controls>span { font-size:10px; }
.pod-hud__launch { top:auto; bottom:30%; left:50%; width:340px; background:#222940ee; clip-path:none; border:1px solid #e8c89988; }
.pod-hud__launch header>span { font-size:11px; }
.pod-hud__launch header>strong { font-size:21px; }
.pod-hud__launch footer>span { font-size:11px; }
.pod-hud__tutorial { position:absolute; left:32px; top:230px; max-width:310px; padding:12px 16px; background:#222a40e8; border-left:3px solid var(--pod-sky); visibility:hidden; opacity:0; }
.pod-hud__tutorial.is-visible { visibility:visible; opacity:1; }
.pod-hud__tutorial>span { font-size:10px; color:var(--pod-sky); letter-spacing:.12em; }
.pod-hud__tutorial>strong { display:block; margin:5px 0; font-size:23px; font-style:italic; }
.pod-hud__tutorial>p { margin:0; font:12px/1.5 "Avenir Next",sans-serif; text-transform:none; }
.pod-hud__tutorial>i { display:block; width:100%; height:3px; margin-top:12px; background:#b8dcdd35; }
.pod-hud__tutorial>i>i { display:block; height:100%; background:var(--pod-sky); }
/* Results retain race evidence and offer an immediate next attempt. */
.pod-hud__results { left:50%; width:min(820px,calc(100vw - 48px)); padding:24px 30px; max-height:calc(100dvh - 48px); background:#1e2539f5; border:1px solid #ecd4af70; border-top:3px solid var(--pod-orange); box-shadow:0 25px 80px #0b102baa; clip-path:none; transform:translate(-50%,-50%); }
.pod-hud__results.is-visible { transform:translate(-50%,-50%); }
.pod-hud__results-title { font-size:52px; text-shadow:none; margin-bottom:18px; }
.pod-hud__results-callout { background:transparent; color:var(--pod-sand); border:0; padding:0; font-size:12px; transform:none; letter-spacing:.1em; }
.pod-hud__result-row { min-height:33px; background:#30354980; font-size:13px; border-left:2px solid #7b88aa; }
.pod-hud__result-place { font-size:19px; }
.pod-hud__result-row.is-player { background:var(--pod-paper); }
.pod-hud__result-highlight { padding:10px 14px; background:#2b3349; }
.pod-hud__result-highlight>span,.pod-hud__result-moments span { font-size:9px; }
.pod-hud__result-highlight>small { font-size:12px; }
.pod-hud__result-moments { gap:10px; }
.pod-hud__result-moments button { padding:10px 12px; background:#252e45; border-color:#c5bccb40; }
.pod-hud__result-moments strong { font-size:13px; margin:3px 0; }
.pod-hud__result-moments small { font-size:10px; white-space:normal; line-height:1.35; }
.pod-hud__results-actions { display:flex; gap:12px; margin:14px 0 18px; position:sticky; top:-24px; z-index:3; padding:12px 0; background:#1e2539; border-bottom:1px solid #ecd4af35; }
.pod-hud__results-actions>button { min-width:175px; }
.pod-hud__results-actions>button:not(.pod-hud__start-button) { background:transparent; color:var(--pod-paper); border:1px solid #d3c4ba60; padding:10px 15px; cursor:pointer; font-size:12px; }
.pod-hud__results-footer { font-size:10px; font-weight:500; letter-spacing:.04em; }
.pod-hud__mastery-result { margin-top:14px; padding:13px 16px; border:1px solid #ddd1bc35; background:#263048; }
.pod-hud__mastery-result>header { display:flex; justify-content:space-between; align-items:center; gap:16px; }
.pod-hud__mastery-result>header span { text-align:right; font-size:12px; line-height:1.5; }
.pod-hud__mastery-result>header strong { font-size:23px; color:var(--pod-sand); font-style:italic; }
.pod-hud__mastery-result>p { font:12px/1.5 "Avenir Next",sans-serif; text-transform:none; margin:7px 0; }
.pod-hud__sector-results { display:flex; gap:8px; flex-wrap:wrap; }
.pod-hud__sector-results>span { padding:6px 9px; background:#171e3280; font-size:12px; }
.pod-hud__sector-results small { display:block; margin-bottom:4px; color:#d7cedd; font:11px/1.3 "Avenir Next",sans-serif; }
.pod-hud__retry-pursuit { padding:9px 12px; border-left:2px solid var(--pod-orange); background:#171e3280; color:var(--pod-paper); }
.pod-hud__sector-results b { color:var(--pod-green); margin-left:7px; }
.pod-hud__sector-results b.is-slow { color:var(--pod-red); }
.pod-hud__championship { display:flex; gap:12px; flex-wrap:wrap; margin-top:10px; font-size:11px; }
.pod-hud__championship .is-player { color:var(--pod-sky); }
.pod-hud__pause { background:#141c2cdf; }
.pod-hud__pause-home strong { text-shadow:none; }
.pod-hud__pause-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.pod-hud__pause-actions button { min-height:42px; height:auto; padding:11px 14px; font-size:13px; }
.pod-hud__pause-actions button[hidden] { display:none; }
.pod-hud__pause-home>p { margin:15px 0 0; color:#d9ccd4; font:12px/1.5 "Avenir Next",sans-serif; text-transform:none; }
.pod-hud__cup-context { margin:0 0 12px; padding:9px 12px; border-left:2px solid var(--pod-sky); background:#31374a; }
.pod-hud__cup-context[hidden] { display:none; }
.pod-hud__cup-context>strong { color:var(--pod-sky); font-size:12px; }
.pod-hud__cup-context>p { font:11px/1.4 "Avenir Next",sans-serif; text-transform:none; margin:5px 0 0; }
.pod-hud__cup-context [data-hud=cup-standings] { display:flex; gap:7px 12px; flex-wrap:wrap; margin-top:6px; font-size:10px; }
.pod-hud__cup-context .is-player { color:var(--pod-sky); }
.pod-hud__settings { background:#20283d; border-color:#b5a6b0; clip-path:none; }
.pod-hud__settings label,.pod-hud__binding-row { font-size:13px; }
.pod-hud__settings button { font-size:12px; }
/* Gauntlet refinement: state truth and at-speed resource contrast. */
.pod-hud__event-launch-summary { display:none; grid-column:1/-1; gap:5px; }
.pod-hud.has-fixed-event .pod-hud__event-launch-summary { display:grid; }
.pod-hud.has-fixed-event .pod-hud__selector-setup>.pod-hud__difficulty-selector,
.pod-hud.has-fixed-event .pod-hud__selector-setup>.pod-hud__mode-selector,
.pod-hud.has-fixed-event .pod-hud__selector-setup>.pod-hud__lap-selector { display:none; }
.pod-hud__event-launch-summary>strong { font-size:15px; color:var(--pod-paper); }
.pod-hud__event-launch-summary>span { font:11px/1.4 "Avenir Next",sans-serif; color:#e4d9d7; text-transform:none; }
.pod-hud__event-launch-summary>small { font:10px/1.4 "Avenir Next",sans-serif; text-transform:none; color:var(--pod-sand); }
.pod-hud__event-list button small { font-size:11px; color:#d0c9d8; }
.pod-hud__garage-model { left:8%; right:0; }
.pod-hud__garage-hero { clip-path:polygon(0 0,calc(100% - 25px) 0,100% 25px,100% 100%,0 100%); }
.pod-hud__vehicle-card.is-selected { clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,0 100%); }
.pod-hud__speed::before { content:""; position:absolute; z-index:-1; left:-10px; right:-10px; bottom:-53px; height:109px; background:#1c243ce6; border-left:2px solid #ead7b94d; clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,0 100%); }
.pod-hud__speed .pod-hud__meter-head { display:flex; justify-content:space-between; align-items:center; gap:4px; }
.pod-hud__speed .pod-hud__meter-head .pod-hud__label,
.pod-hud__telemetry .pod-hud__meter-head .pod-hud__label { font-size:12px; font-weight:700; color:var(--pod-paper); letter-spacing:.06em; }
.pod-hud__speed .pod-hud__meter-track,.pod-hud__telemetry .pod-hud__meter-track { height:6px; background:#ffffff2b; }
.pod-hud__telemetry .pod-hud__meter-head { display:flex; align-items:center; justify-content:space-between; gap:4px; margin-bottom:3px; }
.pod-hud__speed .pod-hud__meter-value,.pod-hud__telemetry .pod-hud__meter-value { position:static!important; width:auto!important; height:auto!important; padding:0!important; margin:0!important; clip:auto!important; clip-path:none!important; overflow:visible!important; font:600 11px/1 "Avenir Next",sans-serif; color:var(--pod-paper); }
.pod-hud__speed .pod-hud__meter-value::after,.pod-hud__telemetry .pod-hud__meter-value::after { content:"%"; font-size:8px; }
.pod-hud__telemetry.is-hot .pod-hud__meter--heat,.pod-hud__telemetry.is-damaged .pod-hud__meter--damage { outline:1px solid var(--pod-red); outline-offset:5px; background:#96383355; }
.pod-hud__redline-heat:not(.is-hot):not(.is-active) { visibility:hidden; opacity:0; }
.pod-hud__redline-heat.is-visible { bottom:235px; }
.pod-hud__system-label { font-size:11px; }
.pod-hud__workshop-body { height:calc(100% - 216px); }
.pod-hud__workshop-part { gap:7px; min-height:205px; }
.pod-hud__workshop-part.is-equipped::after { display:none; }
.pod-hud__part-comparison { padding-top:6px; margin-top:auto; border-top:1px solid #bfbacc30; font:11px/1.45 "Avenir Next",sans-serif; text-transform:none; color:#e4d9d3; }
.pod-hud__equip-action { display:block; color:var(--pod-sky); font-size:11px; padding-top:3px; }
.pod-hud__workshop-summary { gap:8px; }
.pod-hud__workshop-summary>.pod-hud__workshop-effective { flex:0 0 auto; }
.pod-hud__workshop-effective ul { display:grid; grid-template-columns:1fr 1fr; gap:7px 13px; }
.pod-hud__workshop-effective li { display:flex; gap:7px; justify-content:space-between; font-size:11px; }
.pod-hud__workshop-effective b { color:var(--pod-green); font-variant-numeric:tabular-nums; }
.pod-hud__workshop-effective .is-negative b { color:var(--pod-red); }
.pod-hud__workshop-contributors { background:#202639; padding:10px 14px; font:11px/1.4 "Avenir Next",sans-serif; text-transform:none; }
.pod-hud__workshop-contributors summary { cursor:pointer; color:#d4c9d4; }
.pod-hud__workshop-contributors>strong { display:block; margin-top:10px; }
.pod-hud__workshop-footer { display:flex; justify-content:space-between; align-items:center; gap:16px; padding-top:14px; margin-top:10px; border-top:1px solid #ddd0c635; }
.pod-hud__workshop-footer>span { font:12px/1.4 "Avenir Next",sans-serif; color:var(--pod-sky); text-transform:none; }
.pod-hud__workshop-footer>button { padding:11px 18px; color:var(--pod-ink); background:var(--pod-paper); font-size:12px; }
.pod-hud__result-lap { font-size:11px; color:#ddd0da; }
.pod-hud__result-moments button { border-left-color:var(--pod-sky); }
.pod-hud__result-moments span { font-size:10px; color:var(--pod-sky); }
.pod-hud__results-actions>button[data-action=next-event] { display:flex; flex-direction:column; gap:4px; }
.pod-hud__results-actions>button[data-action=next-event] small { font-size:10px; color:var(--pod-sand); }
.pod-hud__flight { display:grid; grid-template-columns:1fr; grid-template-areas:"state" "clear" "motion"; gap:5px; width:216px; min-width:0; height:auto; padding:11px 14px; background:#20283d; border-right:3px solid var(--pod-sky); text-align:left; box-shadow:0 3px 14px #0d142a66; }
.pod-hud__flight.is-visible { transform:none; }
.pod-hud__flight-state { font-size:11px; color:var(--pod-sky); }
.pod-hud__flight strong { display:block; justify-self:start; font-size:20px; white-space:normal; }
.pod-hud__flight small,.pod-hud__flight[data-motion="descending"] small { display:block; color:var(--pod-paper); font-size:13px; letter-spacing:.03em; line-height:1.3; text-align:left; white-space:normal; }
.pod-hud__threat-cue { width:${THREAT_CUE_WIDTH}px; height:${THREAT_CUE_HEIGHT}px; min-height:0; grid-template-columns:16px minmax(0,1fr); gap:7px; padding:4px 8px; border:1px solid #fff0cc40; border-left:3px solid currentColor; border-radius:1px; background:#20283de8; box-shadow:0 2px 7px #0c142e50; }
.pod-hud__threat-cue b { font-size:14px; }
.pod-hud__threat-cue.has-group { grid-template-columns:16px minmax(0,1fr) auto; gap:5px; }
.pod-hud__threat-cue em { color:var(--pod-paper); font:700 10px/16px "Avenir Next",sans-serif; }
.pod-hud__threat-cue em:empty { display:none; }
.pod-hud__threat-cue span { position:static; display:block; width:100%; max-width:none; padding:0; overflow:hidden; color:var(--pod-paper); background:none; font-size:11px; letter-spacing:0; line-height:16px; white-space:nowrap; text-overflow:ellipsis; text-align:left; transform:none; }
.pod-hud__threat-cue.is-critical { animation:pod-inkstorm-threat-pulse .8s steps(2,end) infinite; }
.pod-hud.is-high-contrast .pod-hud__threat-cue { border-width:2px; border-left-width:4px; background:#09060f; }
@media (prefers-reduced-motion:reduce) { .pod-hud__threat-cue.is-critical { animation:none!important; } }
@keyframes pod-inkstorm-threat-pulse { 0%,49% { box-shadow:0 0 0 1px #f8ba7780,0 3px 10px #0c142e60; } 50%,100% { box-shadow:0 0 0 3px #ef5b4440,0 3px 10px #0c142e60; } }
@media (max-height:780px) and (min-width:1051px) {
  .pod-hud__vehicle-select { padding:18px 28px; }
  .pod-hud__vehicle-select-frame { min-height:calc(100dvh - 36px); grid-template-rows:auto minmax(232px,1fr) auto auto; gap:11px 22px; grid-template-columns:minmax(0,1fr) 310px; }
  .pod-hud__vehicle-select-head { padding-bottom:11px; }
  .pod-hud__vehicle-select-head h1 { font-size:41px; }
  .pod-hud__garage-hero { min-height:232px; }
  .pod-hud__garage-name h2 { font-size:35px; }
  .pod-hud__garage-name p { font-size:11px; max-width:350px; }
  .pod-hud__garage-model { left:12%; top:10px; bottom:50px; }
  .pod-hud__garage-name { bottom:48px; }
  .pod-hud__garage-stats { padding:10px 18px; gap:10px; }
  .pod-hud__vehicle-card { height:87px; min-height:87px; }
  .pod-hud__vehicle-card .pod-hud__vehicle-preview { height:50px; }
  .pod-hud__mastery h2 { font-size:29px; }
  .pod-hud__mastery>p { font-size:11px; margin-bottom:8px; }
  .pod-hud__event-list { min-height:95px; }
  .pod-hud__event-list button { padding-block:5px; }
  .pod-hud__personal-record { padding-top:8px; }
  .pod-hud__vehicle-select-footer { padding-top:10px; }
  .pod-hud__workshop { top:90px; height:calc(100% - 90px); padding:14px 20px; }
  .pod-hud__workshop-head { height:48px; }
  .pod-hud__workshop-slot { min-height:69px; padding:8px 10px; }
  .pod-hud__workshop-body { height:calc(100% - 200px); }
  .pod-hud__workshop-part { min-height:142px; padding:12px!important; }
}
@media (max-width:1050px) {
  .pod-hud__vehicle-select { padding:22px; place-items:start center; }
  .pod-hud__vehicle-select-frame { grid-template-columns:minmax(0,1fr) 280px; grid-template-rows:auto 300px auto auto; min-height:0; margin:0; gap:18px; }
  .pod-hud__garage-edition strong { font-size:18px; }
  .pod-hud__garage-edition small { display:none; }
  .pod-hud__vehicle-cards { grid-template-columns:repeat(2,1fr); }
  .pod-hud__vehicle-card { height:88px; min-height:88px; }
  .pod-hud__garage-name { max-width:85%; }
  .pod-hud__garage-name h2 { font-size:32px; }
  .pod-hud__garage-name p { font-size:11px; }
  .pod-hud__garage-stats { gap:12px; }
  .pod-hud__garage-stats>div { gap:4px; }
  .pod-hud__garage-stats i { display:none; }
  .pod-hud__garage-stats span { font-size:9px; }
  .pod-hud__garage-inspect { top:15px; bottom:auto; }
  .pod-hud__garage-inspect>span { display:none; }
  .pod-hud__garage-bay { font-size:8px; }
  .pod-hud__vehicle-select-footer { grid-template-columns:1fr 1fr; gap:20px; }
  .pod-hud__selector-controls { display:none; }
  .pod-hud__workshop { top:90px; height:calc(100% - 90px); padding:16px; }
  .pod-hud__workshop-body { grid-template-columns:1fr; height:calc(100% - 235px); }
  .pod-hud__workshop-summary { flex-direction:row; }
  .pod-hud__workshop-slot strong { font-size:12px; }
  .pod-hud__workshop-slot small { font-size:10px; }
}
@media (max-width:650px) {
  .pod-hud__vehicle-select { padding:18px; }
  .pod-hud__vehicle-select-frame { display:flex; flex-direction:column; gap:15px; }
  .pod-hud__vehicle-select-head h1 { font-size:39px; }
  .pod-hud__vehicle-select-head h1 small { font-size:10px; }
  .pod-hud__garage-edition { display:none; }
  .pod-hud__garage-hero { min-height:300px; flex-shrink:0; order:1; display:flex; flex-direction:column; padding-top:50px; }
  .pod-hud__appearance { position:relative; inset:auto; margin:0 15px; }
  .pod-hud__garage-name { position:relative; inset:auto; max-width:none; margin:8px 15px 18px; }
  .pod-hud__garage-name h2 { font-size:34px; }
  .pod-hud__garage-model { position:relative; inset:auto; height:180px; flex-shrink:0; margin-top:6px; }
  .pod-hud__garage-stats { position:relative; inset:auto; margin-top:auto; padding:11px 15px; }
  .pod-hud__vehicle-cards { order:2; gap:8px; }
  .pod-hud__vehicle-card { height:84px; min-height:84px; }
  .pod-hud__vehicle-card h2 { font-size:16px; max-width:100%; }
  .pod-hud__vehicle-card { height:105px; min-height:105px; }
  .pod-hud__vehicle-card .pod-hud__vehicle-preview { height:38px; width:58%; bottom:2px; }
  .pod-hud__mastery { order:4; padding-top:14px; border-top:1px solid #e1c8aa30; }
  .pod-hud__mastery>p { font-size:12px; }
  .pod-hud__event-list { flex:0 0 auto; min-height:0; max-height:280px; }
  .pod-hud__vehicle-select-footer { order:3; display:flex; flex-direction:column; gap:17px; }
  .pod-hud__selector-setup { order:-1; }
  .pod-hud__vehicle-select-footer>.pod-hud__room { min-height:0; }
  .pod-hud__workshop { position:fixed; inset:15px; width:auto; height:auto; overflow:auto; padding:16px; }
  .pod-hud__workshop-slots { grid-template-columns:repeat(5,minmax(64px,1fr)); overflow-x:auto; }
  .pod-hud__workshop-slot { padding:8px 5px; min-height:64px; }
  .pod-hud__workshop-slot span { font-size:9px; }
  .pod-hud__workshop-slot strong { font-size:10px; }
  .pod-hud__workshop-slot small { display:none; }
  .pod-hud__workshop-body { display:block; height:auto; overflow:visible; }
  .pod-hud__workshop-parts { grid-template-columns:1fr; }
  .pod-hud__workshop-part { min-height:135px; }
  .pod-hud__workshop-summary { margin-top:15px; flex-direction:column; }
  .pod-hud__workshop-footer { flex-direction:column; align-items:stretch; }
  .pod-hud__workshop-body { height:auto; }
  .pod-hud__race { left:18px; top:20px; width:235px; height:80px; }
  .pod-hud__race-value { font-size:35px; }
  .pod-hud__race-stat--lap { left:113px; }
  .pod-hud__race-value small { font-size:17px; }
  .pod-hud__race-time { top:61px; }
  .pod-hud__clock { font-size:17px; }
  .pod-hud__detail-toggle { right:18px; top:22px; font-size:8px; }
  .pod-hud__course-progress { left:18px; top:114px; }
  .pod-hud__mode-status { left:18px; top:156px; max-width:195px; }
  .pod-hud__systems-cluster { left:18px; bottom:22px; width:194px; height:59px; transform:none; }
  .pod-hud__system-gauge { width:23px; height:23px; left:20px; }
  .pod-hud__system-label { font-size:8px; }
  .pod-hud__combat-key { font-size:9px; }
  .pod-hud__speed { right:17px; bottom:71px; transform:scale(.74); transform-origin:right bottom; }
  .pod-hud__telemetry { right:18px; width:138px; bottom:26px; gap:8px; }
  .pod-hud__telemetry .pod-hud__meter { width:65px; }
  .pod-hud__telemetry .pod-hud__meter-head .pod-hud__label { font-size:9px; }
  .pod-hud__redline-heat,.pod-hud__redline-heat.is-visible,.pod-hud__redline-heat.is-hot { right:18px; bottom:205px; width:145px; }
  .pod-hud__redline-heat>span { font-size:9px; }
  .pod-hud__map { right:18px; top:80px; width:140px; }
  .pod-hud__course-progress-rail { display:none!important; }
  .pod-hud__galactic-alert,.pod-hud__director-event,.pod-hud__wrong-way { top:200px; width:calc(100vw - 36px); max-width:340px; }
  .pod-hud__flight { right:18px; bottom:243px; width:145px; }
  .pod-hud__tutorial { left:18px; top:253px; right:18px; max-width:330px; }
  .pod-hud__controls { left:18px; bottom:180px; width:calc(100vw - 36px); max-width:330px; transform:none; grid-template-columns:repeat(2,1fr); }
  .pod-hud__results { padding:19px; }
  .pod-hud__results-title { font-size:42px; }
  .pod-hud__results-actions { flex-wrap:wrap; }
  .pod-hud__results-actions>button { flex:1; min-width:140px; }
  .pod-hud__mastery-result>header { align-items:start; }
  .pod-hud__mastery-result>header strong { font-size:20px; }
}
@media (max-height:760px) {
  .pod-hud__results-footer { display:none; }
}
`;
