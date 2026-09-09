/** Round35 reference direction: orbital printwork in menus, amber instrument glass in play. */
export const BROADCAST_HUD_CSS = /* css */ `
@font-face { font-family:Inkstorm Display; src:url('/fonts/inkstorm/BlackOpsOne-Regular.ttf') format('truetype'); font-display:swap; }
@font-face { font-family:Inkstorm Instrument; src:url('/fonts/inkstorm/SairaStencilOne-Regular.ttf') format('truetype'); font-display:swap; }
@font-face { font-family:Inkstorm UI; src:url('/fonts/inkstorm/ChakraPetch-Regular.ttf') format('truetype'); font-weight:400; font-display:swap; }
@font-face { font-family:Inkstorm UI; src:url('/fonts/inkstorm/ChakraPetch-Bold.ttf') format('truetype'); font-weight:700; font-display:swap; }
.pod-hud { --pod-paper:#f5d58e; --pod-sand:#f5d58e; --pod-orange:#ef9d67; --pod-sky:#a5e0d4; --pod-green:#bce5b9; --pod-panel:#1e393ee8; --ui-paper:#e8e7dc; --ui-ink:#1a292d; --ui-teal:#28444a; --ui-rust:#b54a36; font-family:Inkstorm UI,sans-serif; }
.pod-hud button,.pod-hud select,.pod-hud input { font-family:inherit; }
.pod-hud__vehicle-select { padding:26px 34px; background:var(--ui-paper); color:var(--ui-ink); }
.pod-hud__vehicle-select::before { opacity:.4; background:repeating-radial-gradient(ellipse at 24% 47%,transparent 0 88px,#2941472b 89px 90px,transparent 91px 150px); }
.pod-hud__vehicle-select::after { bottom:auto; top:116px; height:15px; background:linear-gradient(90deg,#315661 0 42%,transparent 42% 43%,#aec3b6 43% 100%); opacity:.18; }
.pod-hud__vehicle-select-frame { min-height:calc(100dvh - 52px); grid-template-columns:minmax(0,1fr) 290px; grid-template-rows:auto minmax(310px,1fr) auto auto; gap:16px 24px; }
.pod-hud__vehicle-select-head { padding:0 0 16px; border-color:#2442493b; gap:22px; }
.pod-hud__eyebrow { color:var(--ui-rust); font:700 10px/1.4 Inkstorm UI,sans-serif; letter-spacing:.18em; }
.pod-hud__vehicle-select-head h1 { margin:6px 0 0; color:var(--ui-ink); font:400 clamp(26px,3.2vw,48px)/1 Inkstorm Display,sans-serif; letter-spacing:-.04em; }
.pod-hud__vehicle-select-head h1::before { content:'/'; color:var(--ui-rust); padding-right:7px; }
.pod-hud__garage-edition { margin-left:auto; }
.pod-hud__garage-edition span { color:var(--ui-rust); font-size:9px; }
.pod-hud__garage-edition strong { font:700 15px Inkstorm UI,sans-serif; }
.pod-hud__garage-edition small { color:#536a6b; font:10px Inkstorm UI,sans-serif; }
.pod-hud__garage-nav { display:flex; align-items:center; gap:5px; }
.pod-hud__garage-nav button { min-height:42px; padding:9px 17px; background:transparent; border:1px solid #24424955; color:var(--ui-ink); font-weight:700; letter-spacing:.08em; cursor:pointer; transition:background .18s,color .18s; }
.pod-hud__garage-nav button:hover,.pod-hud__garage-nav button[aria-expanded=true] { color:var(--ui-paper); background:var(--ui-teal); }
.pod-hud__garage-nav button b { color:var(--ui-rust); padding-right:7px; }
.pod-hud__garage-hero { min-height:310px; background:radial-gradient(ellipse at 49% 34%,#66817b55,transparent 63%),linear-gradient(145deg,#30474e,#213a42 62%,#162f37); clip-path:none; border:1px solid #1a353c; border-radius:3px; color:var(--ui-paper); }
.pod-hud__garage-hero::before { border-color:#d0dbcc38; box-shadow:0 0 0 30px #d0dbcc07,0 0 0 72px #d0dbcc04; }
.pod-hud__garage-hero::after { content:'07'; color:#d0dbcc0a; font-family:Inkstorm Display,sans-serif; }
.pod-hud__garage-bay { color:#d1ddd0; font-size:9px; letter-spacing:.16em; }
.pod-hud__appearance { right:20px; }
.pod-hud__appearance span,.pod-hud__appearance small { color:#c1d0c7; }
.pod-hud__appearance button { background:#1e373e; color:#e9e9de; border-color:#b8cab958; padding:6px 9px; }
.pod-hud__appearance button[aria-pressed=true] { background:#c4cdbb; color:#233c42; border-color:#c4cdbb; }
.pod-hud__garage-model { top:49px; bottom:113px; left:5%; right:1%; }
.pod-hud__garage-name { bottom:53px; max-width:65%; }
.pod-hud__garage-name>span { color:#f1c680; font-size:9px; }
.pod-hud__garage-name h2 { font:700 clamp(24px,3vw,39px)/1 Inkstorm UI,sans-serif; letter-spacing:-.05em; color:#f0ecdf; text-shadow:0 2px 5px #11252d; }
.pod-hud__garage-name p { font:11px/1.4 Inkstorm UI,sans-serif; color:#cad7cf; max-width:540px; }
.pod-hud__garage-inspect { bottom:70px; }
.pod-hud__garage-inspect button { border-color:#bdcdb976; background:#1b343b; color:#e8e7dc; }
.pod-hud__garage-stats { background:#142c34a6; color:#e8e7dc; padding:12px 20px; }
.pod-hud__garage-stats span { color:#bacdc5; }
.pod-hud__garage-stats i { height:6px; background:repeating-linear-gradient(90deg,transparent 0 8px,#19323a 8px 11px),linear-gradient(90deg,#d4dbbc var(--rating),#e4ead921 var(--rating)); }
.pod-hud__mastery h2 { font:700 28px/1.05 Inkstorm UI,sans-serif; letter-spacing:-.05em; color:var(--ui-ink); }
.pod-hud__mastery>p { font:12px/1.45 Inkstorm UI,sans-serif; color:#4f6668; }
.pod-hud__event-heading { color:var(--ui-teal); border-bottom:1px solid #24424940; }
.pod-hud__event-heading small { color:#526565; }
.pod-hud__event-list { scrollbar-color:#31566155 transparent; }
.pod-hud__event-list button { color:var(--ui-ink); border-color:#2442492a; padding:7px 10px; }
.pod-hud__event-list button strong { font:700 13px Inkstorm UI,sans-serif; }
.pod-hud__event-list button small { color:#4b6569; font:11px/1.4 Inkstorm UI,sans-serif; }
.pod-hud__event-list button.is-selected { border-left-color:var(--ui-rust); background:linear-gradient(90deg,#b54a3621,transparent); }
.pod-hud__event-list button.is-selected::after { color:var(--ui-rust); }
.pod-hud__personal-record { border-top:1px solid #2442493b; padding-top:12px; }
.pod-hud__personal-record>span { color:#5a6a68; }
.pod-hud__personal-record>strong { font:400 22px Inkstorm Display,sans-serif; color:var(--ui-teal); }
.pod-hud__personal-record>small { font:10px/1.4 Inkstorm UI,sans-serif; color:#546868; }
.pod-hud__mastery-controls button { color:var(--ui-teal); border-color:#24424955; font:700 10px Inkstorm UI,sans-serif; }
.pod-hud__mastery-controls button[aria-pressed=true] { color:var(--ui-paper); background:var(--ui-teal); }
.pod-hud__garage-rule { display:none; }
.pod-hud__vehicle-cards { gap:8px; }
.pod-hud__vehicle-card,.pod-hud__vehicle-card.is-selected { min-height:69px; border:1px solid #24424950; border-top:1px solid #24424950; border-radius:3px; clip-path:none; background:#d7dbd0; box-shadow:none; color:var(--ui-ink); transition:background .18s,border-color .18s; }
.pod-hud__vehicle-card.is-selected { background:var(--ui-teal); color:var(--ui-paper); border-color:var(--ui-teal); }
.pod-hud__vehicle-card h2 { font:700 15px/1.1 Inkstorm UI,sans-serif; color:inherit; }
.pod-hud__vehicle-card .pod-hud__vehicle-kicker { color:inherit; opacity:.7; }
.pod-hud__vehicle-select-footer { grid-template-columns:150px minmax(0,1fr) 245px; gap:16px; border-top:1px solid #24424942; padding-top:14px; align-items:start; }
.pod-hud__selector-controls,.pod-hud__room { border:1px solid #24424944; background:#e8e7dc; color:var(--ui-ink); padding:0; clip-path:none; }
.pod-hud__selector-controls>summary,.pod-hud__room>summary { display:list-item; padding:13px 12px; cursor:pointer; color:var(--ui-teal); font-weight:700; font-size:11px; letter-spacing:.04em; }
.pod-hud__selector-controls[open],.pod-hud__room[open] { box-shadow:0 6px 18px #17363e20; }
.pod-hud__selector-controls .pod-hud__selector-section-head,.pod-hud__room .pod-hud__selector-section-head { padding:4px 12px; }
.pod-hud__selector-control-grid { padding:8px 12px 12px; grid-template-columns:1fr; }
.pod-hud__selector-control-grid kbd { color:#223e45; border-color:#24424955; background:#d8ded3; }
.pod-hud__selector-control-grid em { color:#36525a; }
.pod-hud__room-actions,.pod-hud__room-status,.pod-hud__room-members { margin:8px 10px; }
.pod-hud__room-status { color:#496067; }
.pod-hud__room button,.pod-hud__room input { background:#244249; border-color:#244249; color:#e8e7dc; }
.pod-hud__selector-setup { border:0; padding:0; background:transparent; }
.pod-hud__selector-setup>.pod-hud__selector-section-head { display:none; }
.pod-hud__event-launch-summary>strong { color:var(--ui-teal); font:700 11px Inkstorm UI,sans-serif; }
.pod-hud__event-launch-summary>span { display:none; }
.pod-hud__event-launch-summary>small { color:#5a6f6e; font:10px/1.3 Inkstorm UI,sans-serif; }
.pod-hud__selector-launch-row { gap:10px; margin-top:9px; }
.pod-hud__start-button { color:var(--ui-paper); background:var(--ui-teal); border:1px solid var(--ui-teal); clip-path:none; border-radius:3px; font:700 14px Inkstorm UI,sans-serif; letter-spacing:.06em; box-shadow:none; transition:background .18s,transform .18s; }
.pod-hud .pod-hud__start-button:hover:not(:disabled) { color:var(--ui-paper); background:#37616b; border-color:#37616b; transform:translateY(-1px); }
.pod-hud__start-button b { color:inherit; }
.pod-hud__start-prompt { color:#576c6b; font:10px Inkstorm UI,sans-serif; }
.pod-hud__selector-setup button:not(.pod-hud__start-button),.pod-hud__selector-setup select { background:#d7ded3; border-color:#24424955; color:var(--ui-teal); }
.pod-hud__selector-setup button.is-selected { background:var(--ui-teal); color:var(--ui-paper); }
.pod-hud__difficulty-selector>span,.pod-hud__lap-selector>span,.pod-hud__mode-selector>span { color:var(--ui-teal); }
.pod-hud__cup-context { color:#e9e8dd; background:var(--ui-teal); border-color:var(--ui-rust); }
.pod-hud__asset-status { border-color:#adbdac; background:#244249; color:#f0e8d3; font-family:Inkstorm UI,sans-serif; }
.pod-hud__workshop { background:var(--ui-paper); color:var(--ui-ink); border:1px solid #657d7a; border-radius:4px; }
.pod-hud__workshop-head { border-color:#29474c45; }
.pod-hud__workshop-head span { color:var(--ui-rust); }
.pod-hud__workshop-head strong { font:400 30px Inkstorm Display,sans-serif; color:var(--ui-ink); }
.pod-hud__workshop-head strong::before { content:'/'; color:var(--ui-rust); }
.pod-hud__workshop-head button { color:var(--ui-teal); background:transparent; border-color:#24424966; }
.pod-hud__workshop-slot { background:#d0d9d0; color:#29474c; border-color:#7d9690; clip-path:none; }
.pod-hud__workshop-slot.is-selected { background:var(--ui-teal); color:var(--ui-paper); }
.pod-hud__workshop-slot strong,.pod-hud__workshop-slot span { color:inherit; }
.pod-hud__workshop-part,.pod-hud__workshop-part.is-equipped { border:1px solid #58736e; background:var(--ui-teal); color:var(--ui-paper); border-radius:5px; clip-path:none; }
.pod-hud__workshop-part.is-equipped { border-color:#b4c7af!important; box-shadow:inset 0 -3px #a7c4ae; }
.pod-hud__workshop-part h3,.pod-hud__workshop-part strong { color:var(--ui-paper); }
.pod-hud__workshop-part p,.pod-hud__part-comparison { color:#c2d2c6; font-family:Inkstorm UI,sans-serif; }
.pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { background:#244249; border-color:#a9bba4; border-radius:4px; color:#dfe7d6; }
.pod-hud__workshop-summary strong { color:#c8d7bc; }
.pod-hud__workshop-summary li { color:#e8e7dc; }
.pod-hud__workshop-footer { color:var(--ui-teal); border-color:#24424955; }
.pod-hud__workshop-footer button { background:var(--ui-teal); color:var(--ui-paper); border-color:var(--ui-teal); }
/* The equipment desk is one console: installed systems, choices, and their measured effect. */
.pod-hud__workshop { display:grid; grid-template-columns:minmax(190px,.7fr) minmax(0,1.9fr) minmax(240px,.9fr); grid-template-rows:66px minmax(0,1fr) auto; gap:14px; top:106px; height:calc(100% - 106px); }
.pod-hud__workshop-head { grid-column:1/-1; height:auto; padding:0 0 8px; }
.pod-hud__workshop-head strong { font-size:38px; }
.pod-hud__workshop-body { display:contents; }
.pod-hud__workshop-slots { grid-column:1; grid-row:2; display:flex; flex-direction:column; gap:9px; min-height:0; margin:0; padding:16px; background:#28444a; border-radius:8px; overflow:auto; scrollbar-gutter:stable; }
.pod-hud__workshop-slots::before { content:'INSTALLED SYSTEMS'; color:#b7cbbb; font:700 15px Inkstorm UI,sans-serif; border-bottom:2px solid #a9bda866; padding-bottom:9px; margin-bottom:4px; }
.pod-hud__workshop .pod-hud__workshop-slot { flex:1 0 75px; min-height:75px; background:#365259!important; border:1px solid transparent!important; border-radius:5px; padding:12px; color:#dfe7d6; box-shadow:none; }
.pod-hud__workshop .pod-hud__workshop-slot.is-selected { background:#526b6e!important; border-color:#b8c9b2!important; box-shadow:inset 3px 0 #b8c9b2; }
.pod-hud__workshop-slot span { color:#b6cbbd; }
.pod-hud__workshop-slot strong { font:700 14px/1.15 Inkstorm UI,sans-serif; }
.pod-hud__workshop-slot small { color:#becfc5; font:11px/1.4 Inkstorm UI,sans-serif; }
.pod-hud__workshop-parts { grid-column:2; grid-row:2; grid-template-columns:1fr 1fr; grid-auto-rows:max-content; gap:10px; min-height:0; padding:16px; border-radius:8px; background:#28444a; overflow:auto; align-content:start; scrollbar-gutter:stable; }
.pod-hud__workshop-parts::before { content:'COMPONENT LIBRARY'; grid-column:1/-1; color:#b7cbbb; font:700 15px Inkstorm UI,sans-serif; border-bottom:2px solid #a9bda866; padding-bottom:9px; margin-bottom:3px; }
.pod-hud__workshop .pod-hud__workshop-part { background:#365259!important; border:1px solid #8ba69b44!important; border-radius:6px; min-height:215px; padding:15px!important; gap:10px; }
.pod-hud__workshop .pod-hud__workshop-part.is-equipped { background:#496367!important; border-color:#b8c9b2!important; box-shadow:inset 0 -3px #b8c9b2; }
.pod-hud__workshop-part>strong { font:700 18px/1.1 Inkstorm UI,sans-serif; padding-right:0; }
.pod-hud__workshop-part>p,.pod-hud__workshop-part>span { font:12px/1.45 Inkstorm UI,sans-serif; }
.pod-hud__workshop-part>p { color:#d0ddd2; }
.pod-hud__workshop-part .pod-hud__part-comparison { font:11px/1.4 Inkstorm UI,sans-serif; }
.pod-hud__workshop-summary { grid-column:3; grid-row:2; padding:16px; background:#28444a; border-radius:8px; overflow:auto; }
.pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { padding:14px 0; background:transparent; border:0; border-radius:0; }
.pod-hud__workshop-summary>div:first-child { padding-top:0; flex:0 0 auto; }
.pod-hud__workshop-summary strong { display:block; font:700 15px/1.15 Inkstorm UI,sans-serif; color:#b7cbbb; border-bottom:2px solid #a9bda866; padding-bottom:10px; }
.pod-hud__workshop-summary li { font:12px/1.5 Inkstorm UI,sans-serif; }
.pod-hud__workshop-effective li { padding:5px 6px; background:#365259; border-radius:3px; }
.pod-hud__workshop-footer { grid-column:1/-1; margin:0; padding-top:12px; }
.pod-hud__workshop-footer>span { color:#3d595d; font:12px Inkstorm UI,sans-serif; }
.pod-hud__workshop-footer>button { color:var(--ui-paper); background:var(--ui-teal); }
.pod-hud__mastery { padding:18px 16px; border-radius:5px; background:#28444a; color:var(--ui-paper); }
.pod-hud__mastery .pod-hud__eyebrow { color:#bacfba; }
.pod-hud__mastery h2 { color:#edf0df; font-size:26px; }
.pod-hud__mastery>p { color:#d0dbce; }
.pod-hud__event-heading { color:#bacfba; border-color:#bacfba55; }
.pod-hud__event-heading small { color:#bacfba; }
.pod-hud__event-list button { color:#e5eadb; border-color:#bacfba25; }
.pod-hud__event-list button small { color:#d0dbce; }
.pod-hud__event-list button.is-selected { background:#526b6e; border-left-color:#c3d1b9; }
.pod-hud__event-list button.is-selected::after { color:#e6c282; }
.pod-hud__personal-record { border-color:#bacfba55; }
.pod-hud__personal-record>span,.pod-hud__personal-record>small { color:#cad6ca; }
.pod-hud__personal-record>strong { color:#e8e7dc; }
.pod-hud__mastery-controls button { color:#e2e7d7; border-color:#c5d1bc77; }
.pod-hud__start-prompt[data-mode=waiting] { color:#3d595d; }
/* One light strip at the horizon; transparent instruments leave the racing line open. */
.pod-hud__race { top:25px; left:32px; right:32px; width:auto; height:65px; background:none; }
.pod-hud__race::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,#173c4399 12%,#173c43cc 50%,#173c4399 88%,transparent); clip-path:polygon(0 0,100% 0,100% 70%,90.5% 70%,88.8% 93%,78.2% 93%,76.4% 70%,61% 70%,57% 95%,43% 95%,39% 70%,23.6% 70%,21.8% 93%,11.2% 93%,9.5% 70%,0 70%); }
.pod-hud__race-rail { display:block; position:absolute; inset:auto 0 0; width:100%; height:20px; background:none; clip-path:none; }
.pod-hud__race-rail svg { width:100%; height:100%; overflow:visible; fill:none; stroke:#f5d58eaa; stroke-width:1; }
.pod-hud__race-stat { top:8px; width:120px; text-align:center; transform:translateX(-50%); }
.pod-hud__race-stat--lap { left:17%; }
.pod-hud__race-stat--position { left:83%; right:auto; }
.pod-hud__race-value { font:400 30px/1 Inkstorm Instrument,sans-serif; color:var(--pod-paper); text-shadow:0 1px 5px #122e36; }
.pod-hud__race-value small { font:inherit; color:inherit; }
.pod-hud__race-stat .pod-hud__label { margin-top:4px; font-size:9px; letter-spacing:.15em; }
.pod-hud__race-time { top:7px; left:50%; transform:translateX(-50%); width:200px; display:flex; flex-direction:column; gap:3px; text-align:center; }
.pod-hud__clock { font:400 30px/1 Inkstorm Instrument,sans-serif; letter-spacing:-.025em; }
.pod-hud__race-time>.pod-hud__label { display:block; font-size:9px; letter-spacing:.15em; }
.pod-hud__split { position:absolute; top:58px; padding:3px 8px; border:0; background:#17363ecc; font:700 11px Inkstorm UI,sans-serif; }
.pod-hud__split[hidden] { display:none; }
.pod-hud__record-target { position:absolute; top:-20px; left:50%; transform:translateX(-50%); font:700 9px/1 Inkstorm UI,sans-serif; white-space:nowrap; color:#f4b572; }
.pod-hud__record-target:empty { display:none; }
.pod-hud__detail-toggle { top:107px; left:30px; right:auto; padding:6px 9px; color:var(--pod-paper); border:1px solid #f5d58e55; background:#17363ecc; font-size:9px; }
.pod-hud__mode-status { top:153px; left:32px; width:210px; background:#17363ebd; border-color:var(--pod-paper); }
.pod-hud__map { top:143px; left:32px; right:auto; width:180px; background:#17363ecf; border-color:#f5d58e66; }
.pod-hud.has-hud-detail .pod-hud__mode-status { top:320px; }
.pod-hud__course-progress { top:31%; left:auto; right:34px; bottom:28%; width:24px; height:auto; }
.pod-hud__course-progress-rail,.pod-hud.has-hud-detail .pod-hud__course-progress-rail { display:block; position:absolute; left:11px; top:0; bottom:0; right:auto; width:1px; background:#f5d58e99; }
.pod-hud__course-progress-rail>i { background:var(--pod-paper); }
.pod-hud__course-racer { width:5px; height:5px; border:0; left:0; margin-left:0; background:var(--pod-paper); box-shadow:0 0 4px #f1cc7855; transform:translate(-50%,50%); }
.pod-hud__course-racer.is-player { width:10px; height:10px; left:-9px; border:1px solid #fff0b3; background:#17363edc; clip-path:polygon(0 0,100% 50%,0 100%); }
.pod-hud__corner { position:fixed; left:auto; right:35px; top:112px; bottom:auto; width:180px; justify-content:flex-end; color:var(--pod-paper); gap:7px; padding:7px 9px; background:#17363ed9; border-right:1px solid #f5d58e77; }
.pod-hud__corner-arrow { color:var(--pod-paper); font-size:23px; }
.pod-hud__corner-distance { font:700 13px Inkstorm UI,sans-serif; }
.pod-hud__corner-tag { font-size:11px; max-width:65px; }
.pod-hud__speed { right:28px; bottom:54px; width:185px; height:150px; }
.pod-hud__speed::before { display:none; }
.pod-hud__speed-ring { inset:0; width:185px; height:120px; mask:none; -webkit-mask:none; background:none; filter:drop-shadow(0 1px 2px #162e36); opacity:1; }
.pod-hud__speed-dial { width:100%; height:100%; fill:none; stroke:var(--pod-paper); stroke-width:1.5; }
.pod-hud__speed-dial .dial-fill { fill:#14343d88; }
.pod-hud__speed-dial .dial-track { stroke:#f5d58e55; stroke-width:4; }
.pod-hud__speed-dial .dial-charge { stroke-width:4; stroke-dasharray:100; stroke-dashoffset:calc(100 - var(--pod-speed-ratio,0)*100); }
.pod-hud__speed-readout { left:30px; top:42px; right:auto; width:124px; display:flex; align-items:baseline; justify-content:center; gap:5px; }
.pod-hud__speed-number { font:400 36px/1 Inkstorm Instrument,sans-serif; color:var(--pod-paper); }
.pod-hud__speed-unit { font-size:8px; letter-spacing:.04em; }
.pod-hud__speed>.pod-hud__meter { bottom:0; width:91px; background:#17363eef; padding:4px 5px; border-radius:2px; }
.pod-hud__speed .pod-hud__meter-head .pod-hud__label,.pod-hud__telemetry .pod-hud__meter-head .pod-hud__label { font:700 11px Inkstorm UI,sans-serif; letter-spacing:.025em; }
.pod-hud__speed .pod-hud__meter-value,.pod-hud__telemetry .pod-hud__meter-value { font:700 9px Inkstorm UI,sans-serif; }
.pod-hud__speed .pod-hud__meter-track,.pod-hud__telemetry .pod-hud__meter-track { height:4px; background:#16333de0; border:1px solid #f5d58e55; }
.pod-hud__speed .pod-hud__meter-fill { background:var(--pod-paper); }
.pod-hud__speed.is-boosting .dial-charge { stroke:#fff4c5; filter:drop-shadow(0 0 3px #f9db87); }
.pod-hud__telemetry { right:28px; bottom:20px; width:185px; gap:13px; }
.pod-hud__telemetry .pod-hud__meter { width:86px; background:#17363eef; padding:4px 5px; border-radius:2px; }
.pod-hud__redline-heat,.pod-hud__redline-heat.is-visible,.pod-hud__redline-heat.is-hot { right:29px; bottom:207px; width:184px; background:#18363eea; color:var(--pod-paper); }
.pod-hud__systems-cluster { left:31px; bottom:28px; width:214px; height:75px; }
.pod-hud__combat-grid { gap:9px; }
.pod-hud__combat-slot { background:#17353eab; border:1px solid #f5d58e9c; border-radius:22px 5px 22px 5px; color:var(--pod-paper); }
.pod-hud__combat-key { top:-10px; left:0; border:1px solid #f5d58e99; background:#17363e; border-radius:3px; color:var(--pod-paper); font-size:11px; }
.pod-hud__system-gauge { left:16px; top:11px; width:34px; height:34px; }
.pod-hud__system-label { left:0; right:0; bottom:8px; text-align:center; font:700 11px/1.2 Inkstorm UI,sans-serif; letter-spacing:.025em; }
.pod-hud__system-ammo { right:4px; bottom:32px; font-size:11px; }
.pod-hud__combat-charge { left:11px; right:11px; bottom:3px; height:2px; }
.pod-hud__upgrades { bottom:87px; }
.pod-hud__upgrade-chip { border-color:#f5d58e77; color:var(--pod-paper); background:#17363eda; }
.pod-hud__context-action { left:32px; bottom:129px; width:213px; background:#17363ed4; }
.pod-hud__controls { bottom:21px; width:min(590px,calc(100vw - 500px)); padding:8px 10px; background:#17363eee; border-color:#f5d58e50; }
.pod-hud__controls>span { font-size:11px; }
.pod-hud__galactic-alert,.pod-hud__director-event,.pod-hud__wrong-way { top:132px; width:min(390px,40vw); background:#17363eea; border-left-color:var(--pod-paper); }
.pod-hud__galactic-alert strong,.pod-hud__director-event strong { font:700 17px Inkstorm UI,sans-serif; }
.pod-hud__flight { right:30px; bottom:251px; width:182px; padding:7px 9px; border-left:1px solid #f5d58e77; background:#17363ed9; }
.pod-hud__flight strong { font:700 14px Inkstorm UI,sans-serif; }
.pod-hud__flight small,.pod-hud__flight[data-motion=descending] small { font:10px/1.3 Inkstorm UI,sans-serif; }
.pod-hud__countdown { color:var(--pod-paper); font-family:Inkstorm Display,sans-serif; text-shadow:0 2px 0 #17363e,0 0 30px #17363e; animation:instrument-count .7s cubic-bezier(.16,1,.3,1) both; }
.pod-hud__launch { background:#17363eee; border-color:#f5d58e99; border-radius:3px; }
.pod-hud__launch header>strong { font-family:Inkstorm UI,sans-serif; }
.pod-hud__pause { background:#152d35df; }
.pod-hud__pause-home>strong { color:var(--pod-paper); font:400 58px Inkstorm Display,sans-serif; }
.pod-hud__pause-actions button { background:#27464d; border:1px solid #aabcaa66; color:#e8e7dc; clip-path:none; }
.pod-hud__settings { color:#e8e7dc; background:#244249; border-color:#a3bba7; border-radius:4px; }
.pod-hud__results { background:#142f37ef; }
.pod-hud__results-title { font-family:Inkstorm Display,sans-serif; color:var(--pod-paper); text-shadow:none; }
.pod-hud__mastery-result { background:#244249; }
.pod-hud__results .pod-hud__start-button { background:#dbe1d0; color:#193840; }
.pod-hud__vehicle-select.is-visible .pod-hud__vehicle-select-head { animation:instrument-enter .32s ease-out both; }
.pod-hud__vehicle-select.is-visible .pod-hud__garage-hero { animation:instrument-enter .42s .04s ease-out both; }
.pod-hud__workshop.is-visible { animation:instrument-enter .28s ease-out both; }
.pod-hud__cinematic-matte { position:absolute; inset:0; z-index:12; pointer-events:none; }
.pod-hud__cinematic-matte::before,.pod-hud__cinematic-matte::after { content:''; position:absolute; left:0; right:0; height:7%; background:#081013; transform:scaleY(0); transition:transform .14s ease-out; }
.pod-hud__cinematic-matte::before { top:0; transform-origin:top; }
.pod-hud__cinematic-matte::after { bottom:0; transform-origin:bottom; }
.pod-hud.has-cinematic-matte .pod-hud__cinematic-matte::before,.pod-hud.has-cinematic-matte .pod-hud__cinematic-matte::after { transform:scaleY(1); }
.pod-hud.has-cinematic-matte>.pod-hud__race,.pod-hud.has-cinematic-matte>.pod-hud__speed,.pod-hud.has-cinematic-matte>.pod-hud__galactic,.pod-hud.has-cinematic-matte>.pod-hud__telemetry,.pod-hud.has-cinematic-matte>.pod-hud__course-progress { opacity:.15; transition:opacity .12s; }
.pod-hud__combat-feedback { position:absolute; top:145px; left:50%; width:max-content; max-width:calc(100% - 60px); padding:9px 18px; display:grid; grid-template-columns:22px 1fr; gap:2px 8px; transform:translateX(-50%); z-index:13; color:#ffdc8d; background:#17363eea; border-bottom:1px solid #ffdc8d66; opacity:clamp(0,calc((1 - var(--cue-age,0))*7),1); }
.pod-hud__combat-feedback[hidden] { display:none; }
.pod-hud__combat-feedback>i { grid-row:1/3; align-self:center; font-style:normal; font-size:20px; }
.pod-hud__combat-feedback>strong { font:700 15px Inkstorm UI,sans-serif; letter-spacing:.1em; }
.pod-hud__combat-feedback>span { font:10px/1.4 Inkstorm UI,sans-serif; letter-spacing:.02em; }
.pod-hud__combat-feedback[data-kind=takedown],.pod-hud__combat-feedback[data-kind=wreck] { top:auto; bottom:max(calc(7% + 12px),env(safe-area-inset-bottom,0px)); padding:10px 14px; border:0; border-radius:3px; background:#152e36dc; text-align:center; grid-template-columns:minmax(0,1fr); gap:3px; width:min(280px,calc(100vw - 40px)); }
.pod-hud__combat-feedback[data-kind=takedown]>i,.pod-hud__combat-feedback[data-kind=wreck]>i { display:none; }
.pod-hud__combat-feedback[data-kind=takedown]>strong,.pod-hud__combat-feedback[data-kind=wreck]>strong { font:400 24px/1.05 Inkstorm Display,sans-serif; letter-spacing:.01em; }
.pod-hud__combat-feedback[data-kind=takedown]>span,.pod-hud__combat-feedback[data-kind=wreck]>span { font-size:12px; line-height:1.4; }
.pod-hud__combat-feedback[data-kind=emp] { color:#aaeaff; }
.pod-hud__combat-feedback[data-kind=repair] { color:#c3edb5; }
.pod-hud.has-combat-feedback>.pod-hud__galactic-alert { visibility:hidden; }
.pod-hud.has-takedown-cue>.pod-hud__director-event { visibility:hidden; }
.pod-hud__launch[data-stage=result] { top:112px; bottom:auto; min-height:0; height:auto; width:310px; padding:10px 14px; transform:translateX(-50%); }
.pod-hud__launch[data-stage=result] header>span { display:none; }
.pod-hud__launch[data-stage=result] header { justify-content:center; }
.pod-hud__course-racer.is-player { border-radius:0; background:#fff0b3; border:0; box-shadow:none; }
.pod-hud__course-racer.is-player::before { display:none; }
@keyframes instrument-enter { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@keyframes instrument-count { from { opacity:0; transform:translate(-50%,-50%) scale(1.18); } 20% { opacity:1; } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
@media (max-width:1100px) {
 .pod-hud__garage-edition { display:none; }
 .pod-hud__garage-nav { margin-left:auto; }
 .pod-hud__vehicle-select-frame { grid-template-columns:minmax(0,1fr) 260px; }
 .pod-hud__vehicle-select-footer { grid-template-columns:140px minmax(0,1fr); }
 .pod-hud__room { grid-column:1/-1; }
 .pod-hud__selector-control-grid { grid-template-columns:1fr 1fr; }
 .pod-hud__controls { grid-template-columns:repeat(3,1fr); }
}
@media (max-width:760px) {
 .pod-hud__vehicle-select { padding:18px; }
 .pod-hud__vehicle-select-frame { min-height:calc(100dvh - 36px); grid-template-columns:1fr; grid-template-rows:auto auto auto auto auto; gap:14px; }
 .pod-hud__vehicle-select-head { flex-wrap:wrap; gap:12px; }
 .pod-hud__vehicle-select-head h1 { font-size:32px; }
 .pod-hud__garage-nav button { padding:9px 12px; }
 .pod-hud__garage-hero { min-height:385px; }
 .pod-hud__garage-model { top:90px; bottom:130px; }
 .pod-hud__garage-name { max-width:66%; }
 .pod-hud__garage-name h2 { font-size:25px; }
 .pod-hud__garage-name p { font-size:10px; }
 .pod-hud__garage-inspect { right:12px; gap:6px; }
 .pod-hud__garage-inspect span { display:none; }
 .pod-hud__garage-stats { gap:10px; padding:12px; }
 .pod-hud__garage-stats>div { font-size:8px; gap:4px; }
 .pod-hud__mastery { grid-column:1; grid-row:auto; }
 .pod-hud__mastery h2 { font-size:25px; }
 .pod-hud__event-list { max-height:190px; flex:auto; }
 .pod-hud__vehicle-cards { grid-column:1; grid-template-columns:1fr 1fr; }
 .pod-hud__vehicle-card h2 { font-size:13px; }
 .pod-hud__vehicle-select-footer { grid-template-columns:1fr; }
 .pod-hud__selector-setup { grid-row:1; }
 .pod-hud__room { grid-column:1; }
 .pod-hud__selector-control-grid { grid-template-columns:1fr 1fr; }
 .pod-hud__race { left:10px; right:10px; top:22px; height:56px; }
 .pod-hud__race-stat { width:80px; }
 .pod-hud__race-value,.pod-hud__clock { font-size:23px; }
 .pod-hud__race-time { width:130px; }
 .pod-hud__race-stat .pod-hud__label,.pod-hud__race-time>.pod-hud__label { font-size:8px; }
 .pod-hud__split { top:48px; font-size:9px; }
 .pod-hud__detail-toggle { left:15px; top:102px; }
 .pod-hud__corner { right:15px; top:105px; width:127px; }
 .pod-hud__corner-tag { display:none; }
 .pod-hud__course-progress { right:18px; top:31%; bottom:38%; }
 .pod-hud__speed { right:14px; bottom:48px; width:150px; height:130px; }
 .pod-hud__speed-ring { width:150px; height:97px; }
 .pod-hud__speed-readout { top:35px; left:22px; width:107px; }
 .pod-hud__speed-number { font-size:29px; }
 .pod-hud__speed>.pod-hud__meter { width:69px; }
 .pod-hud__telemetry { right:14px; bottom:15px; width:150px; gap:10px; }
 .pod-hud__telemetry .pod-hud__meter { width:70px; }
 .pod-hud__redline-heat,.pod-hud__redline-heat.is-visible,.pod-hud__redline-heat.is-hot { right:14px; bottom:184px; width:150px; }
 .pod-hud__systems-cluster { left:14px; bottom:19px; width:174px; height:65px; }
 .pod-hud__combat-grid { gap:5px; }
 .pod-hud__system-gauge { left:12px; top:10px; width:29px; height:29px; }
 .pod-hud__system-label,.pod-hud__combat-key { font-size:10px; }
 .pod-hud__context-action { left:14px; bottom:112px; width:166px; }
 .pod-hud__upgrades { bottom:77px; max-width:174px; }
 .pod-hud__upgrade-chip { font-size:8px; padding:2px 4px; }
 .pod-hud__galactic-alert,.pod-hud__director-event,.pod-hud__wrong-way { top:145px; width:min(300px,77vw); }
 .pod-hud__flight { right:14px; bottom:222px; width:150px; }
 .pod-hud__controls { bottom:230px; width:calc(100vw - 40px); grid-template-columns:repeat(5,1fr); }
 .pod-hud__controls>span { font-size:10px; }
 .pod-hud__mode-status { left:15px; top:140px; width:180px; }
 .pod-hud__map { left:15px; top:138px; width:160px; }
 .pod-hud__launch { width:min(300px,85vw); bottom:31%; }
}
@media (max-width:1100px) {
 .pod-hud__workshop { grid-template-columns:190px minmax(0,1fr); grid-template-rows:auto auto auto auto; overflow:auto; }
 .pod-hud__workshop-slots { grid-column:1; }
 .pod-hud__workshop-parts { grid-column:2; }
 .pod-hud__workshop-summary { grid-column:1/-1; grid-row:3; display:grid; grid-template-columns:1fr 1fr; }
 .pod-hud__workshop-summary>div:last-child { grid-column:2; grid-row:1; }
 .pod-hud__workshop-footer { grid-row:4; }
}
@media (max-width:760px) {
 .pod-hud__workshop { position:fixed; inset:10px; width:auto; height:auto; padding:14px; display:block; overflow:auto; }
 .pod-hud__workshop-head { min-height:58px; }
 .pod-hud__workshop-slots { flex-direction:row; margin:12px 0; padding:12px; }
 .pod-hud__workshop-slots::before { display:none; }
 .pod-hud__workshop .pod-hud__workshop-slot { flex:0 0 180px; min-height:94px; }
 .pod-hud__workshop-parts { grid-template-columns:1fr; }
 .pod-hud__workshop-summary { display:flex; margin:12px 0; }
 .pod-hud__launch[data-stage=result] { top:105px; width:210px; padding:8px; }
 .pod-hud__launch[data-stage=result] header>strong { font-size:15px; }
 .pod-hud__launch[data-stage=result] footer { font-size:9px; }
}

/* One transient message owns the center; secondary information stays at the margins. */
.pod-hud.has-launch-cue:not(.has-context-danger):not(.has-combat-feedback)>.pod-hud__director-event,
.pod-hud.has-launch-cue:not(.has-context-danger):not(.has-combat-feedback)>.pod-hud__galactic-alert,
.pod-hud.has-combat-feedback>.pod-hud__director-event,
.pod-hud.has-combat-feedback>.pod-hud__galactic-alert,
.pod-hud.has-combat-feedback>.pod-hud__launch,
.pod-hud.has-context-danger>.pod-hud__launch { visibility:hidden; opacity:0; }
.pod-hud__garage-stats span { font-size:10px; }
.pod-hud__appearance button { font-size:12px; padding:7px 11px; }
.pod-hud__appearance small { font-size:11px; }
.pod-hud__garage-bay { font-size:10px; }
.pod-hud__start-prompt[data-mode=ready],.pod-hud__start-prompt[data-mode=waiting] { color:#3d595d; font-size:11px; }
.pod-hud__component-symbol { width:58px; height:58px; fill:none; stroke:#bed1bd; stroke-width:2.7; stroke-linecap:round; stroke-linejoin:round; }
.pod-hud__workshop .pod-hud__workshop-slot { position:relative; flex:0 0 auto; min-height:96px; height:auto; padding:12px 12px 12px 46px; }
.pod-hud__workshop-slot>.pod-hud__component-symbol { position:absolute; width:30px; height:30px; left:9px; top:15px; }
.pod-hud__workshop-slot small { font-size:12px; line-height:1.45; overflow:visible; }
.pod-hud__workshop-slot strong { font-family:Inkstorm Instrument,sans-serif; font-weight:400; font-size:15px; }
.pod-hud__workshop-parts::before,.pod-hud__workshop-slots::before,.pod-hud__workshop-summary strong { font-family:Inkstorm Instrument,sans-serif; font-weight:400; font-size:17px; }
.pod-hud__workshop .pod-hud__workshop-part { display:grid; grid-template-columns:58px minmax(0,1fr); grid-auto-rows:max-content; align-content:start; align-self:start; height:auto; min-height:228px; gap:10px 13px; }
.pod-hud__workshop-part>.pod-hud__component-symbol { grid-column:1; grid-row:1; align-self:center; }
.pod-hud__workshop-part>strong { grid-column:2; grid-row:1; align-self:center; font:400 19px/1.1 Inkstorm Instrument,sans-serif; }
.pod-hud__workshop-part>p,.pod-hud__workshop-part>span,.pod-hud__workshop-part>small,.pod-hud__workshop-part>b { grid-column:1/-1; }
.pod-hud__workshop-part>p { display:none; font-size:13px; line-height:1.5; }
.pod-hud__workshop-part.is-equipped>p,.pod-hud__workshop-part:focus-visible>p,.pod-hud__workshop-part:hover>p { display:block; }
.pod-hud__workshop-part>p,.pod-hud__workshop-part>span { height:auto; max-height:none; overflow:visible; text-overflow:clip; white-space:normal; overflow-wrap:anywhere; }
.pod-hud__workshop-part .pod-hud__part-comparison { font-size:12px; color:#e0e7d8; }
.pod-hud__workshop-part>.is-benefit { color:#d0e2bd; font-size:13px; }
.pod-hud__workshop-part>.is-tradeoff { color:#ffac8e; font-size:13px; }
.pod-hud__workshop-effective ul { display:grid; grid-template-columns:1fr; gap:7px; }
.pod-hud__workshop-effective li { display:grid; grid-template-columns:1fr auto; row-gap:5px; font-size:13px; }
.pod-hud__build-meter { grid-column:1/-1; display:block; height:4px; position:relative; background:linear-gradient(90deg,#142f3788 49.5%,#dce6d5 49.5% 50.5%,#142f3788 50.5%); }
.pod-hud__build-meter>i { position:absolute; left:50%; width:var(--build-delta,0%); height:4px; background:#bdd4a9; }
.pod-hud__workshop-effective .is-negative .pod-hud__build-meter>i { left:auto; right:50%; background:#e69e81; }
.pod-hud__speed .pod-hud__meter-value,.pod-hud__telemetry .pod-hud__meter-value { font-size:11px; }
.pod-hud__system-label { font-size:11px; }
.pod-hud__corner-distance { font-size:14px; }
@media (max-width:760px) {
 .pod-hud__garage-stats span { font-size:8px; }
 .pod-hud__appearance button { padding:6px 8px; font-size:11px; }
 .pod-hud__workshop .pod-hud__workshop-slot { flex:0 0 195px; }
 .pod-hud__system-label { font-size:10px; }
}
.pod-hud__workshop .pod-hud__workshop-slot { min-height:78px; }
.pod-hud__workshop-slot:not(.is-selected)>small { display:none; }
.pod-hud__workshop-effective ul { grid-template-columns:repeat(2,minmax(0,1fr)); }
.pod-hud__workshop-effective li { font-size:12px; padding:5px; }
.pod-hud__workshop-slot strong { font-family:Inkstorm UI,sans-serif; font-weight:700; }
.pod-hud__workshop-part>strong { font-family:Inkstorm UI,sans-serif; font-weight:700; }
.pod-hud__workshop-part>.pod-hud__part-comparison { display:none; }
.pod-hud__workshop-part:focus-visible>.pod-hud__part-comparison,.pod-hud__workshop-part:hover>.pod-hud__part-comparison { display:block; }
.pod-hud:not(.has-hud-detail) .pod-hud__mode-status[data-mode=circuit] { visibility:hidden; opacity:0; }
.pod-hud__launch[data-stage=result] { width:270px; padding:9px 12px; }
.pod-hud__launch[data-stage=result] header>strong { font-size:18px; }
.pod-hud__launch[data-stage=result] footer { font-size:11px; }
.pod-hud__vehicle-cards::before { content:'VEHICLE CLASS / HANDLING'; grid-column:1/-1; font:700 10px Inkstorm UI,sans-serif; letter-spacing:.08em; color:#345056; }
.pod-hud__pickup-manual { margin-top:14px; padding-top:12px; border-top:1px solid #24424940; color:var(--ui-teal); font:13px/1.5 Inkstorm UI,sans-serif; text-transform:none; }
.pod-hud__pickup-manual>strong { display:block; color:var(--ui-ink); font:700 12px/1.4 Inkstorm UI,sans-serif; letter-spacing:.035em; }
.pod-hud__pickup-manual>p { margin:8px 0 0; max-width:66ch; }
/* The lowest satellite still needs its full label below the disc in a short landscape map. */
.pod-hud .race-event-atlas__map { min-height:340px; }
@media (prefers-reduced-motion:reduce) { .pod-hud *, .pod-hud *::before,.pod-hud *::after { animation:none!important; transition:none!important; } }
.pod-hud.is-high-contrast .pod-hud__race,.pod-hud.is-high-contrast .pod-hud__combat-slot,.pod-hud.is-high-contrast .pod-hud__launch { background:#0b2026; }
.pod-hud.is-high-contrast .pod-hud__speed-dial .dial-fill { fill:#0b2026; }

/* Floating instrument glass keeps the vehicle silhouette and road visible. */
.pod-hud__driving-instruments { position:absolute; right:28px; bottom:20px; width:236px; height:250px; border:0; background:transparent; color:var(--pod-paper); pointer-events:none; filter:drop-shadow(0 1px 2px #0b2026); }
.pod-hud__driving-instruments::after { content:none; }
.pod-hud__driving-instruments>.pod-hud__redline-heat { position:absolute; top:10px; left:15px; right:12px; bottom:auto; width:auto; height:20px; padding:2px 5px; background:transparent; border:0; }
.pod-hud__driving-instruments>.pod-hud__speed { position:absolute; inset:32px 12px auto; width:auto; height:158px; transform:none; }
.pod-hud__driving-instruments>.pod-hud__redline-heat.is-visible { visibility:visible; opacity:1; }
.pod-hud__driving-instruments .pod-hud__speed-ring { width:210px; height:136px; }
.pod-hud__driving-instruments .pod-hud__speed-readout { top:48px; left:32px; width:142px; }
.pod-hud__driving-instruments .pod-hud__speed-number { font-size:43px; }
.pod-hud__driving-instruments .pod-hud__speed-unit { font-size:10px; }
.pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter { bottom:-3px; width:101px; padding:0; background:transparent; border:0; }
.pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter--drift { left:0; }
.pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter--boost { right:0; }
.pod-hud__driving-instruments>.pod-hud__telemetry { position:absolute; left:12px; right:12px; bottom:10px; width:auto; gap:10px; }
.pod-hud__driving-instruments .pod-hud__telemetry>.pod-hud__meter { width:101px; padding:0; background:transparent; border:0; }
.pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label,.pod-hud__driving-instruments .pod-hud__meter-value { font-size:13px; }
.pod-hud__driving-instruments .pod-hud__meter-track { margin-top:4px; height:5px; border:0; background:#f5d58e22; }
.pod-hud.has-cinematic-matte>.pod-hud__driving-instruments { opacity:.15; transition:opacity .12s; }
.pod-hud[data-phase=finished]>.pod-hud__driving-instruments { visibility:hidden; opacity:0; }
.pod-hud__flight { bottom:285px; width:236px; }
.pod-hud__course-progress { bottom:43%; }
.pod-hud__launch[data-stage=result] { left:32px; right:auto; top:132px; width:230px; padding:9px 12px; transform:none; text-align:left; border-left:2px solid #f5d58e99; }
.pod-hud__launch[data-stage=result] header { justify-content:flex-start; }
.pod-hud__launch[data-stage=result] header>strong { font-size:17px; }
.pod-hud__launch[data-stage=result] footer { font-size:12px; letter-spacing:0; }
.pod-hud__workshop .pod-hud__workshop-part { min-height:218px; gap:8px 13px; }
.pod-hud__workshop-part.is-equipped>.pod-hud__part-comparison { display:none; }
.pod-hud__workshop-part>p { font-size:14px; line-height:1.4; }
.pod-hud__workshop-parts::before,.pod-hud__workshop-slots::before,.pod-hud__workshop-summary strong { font-family:Inkstorm UI,sans-serif; font-weight:700; font-size:18px; letter-spacing:.025em; }
.pod-hud__workshop-effective ul { grid-template-columns:1fr; gap:0; }
.pod-hud__workshop-effective li { grid-template-columns:1fr auto; padding:7px 0; font-size:14px; background:transparent; border-bottom:1px solid #a7c4ae33; border-radius:0; }
.pod-hud__workshop-effective .pod-hud__build-meter { display:none; }
.pod-hud__workshop-summary li { font-size:14px; }
.pod-hud__workshop-effective li b { font-size:15px; }
.pod-hud__workshop-parts { scrollbar-width:thin; scrollbar-color:#b8c9b2 #1b343b; }
.pod-hud__garage-stats span,.pod-hud__garage-bay,.pod-hud__event-list button small,.pod-hud__garage-edition small { font-size:12px; }
.pod-hud__event-list button strong { font-size:14px; }
.pod-hud__appearance small,.pod-hud__start-prompt[data-mode=ready],.pod-hud__personal-record>small { font-size:12px; }
@media (max-width:760px) {
 .pod-hud__driving-instruments { right:14px; bottom:14px; width:174px; height:220px; border-radius:28px 6px 6px 6px; }
 .pod-hud__driving-instruments>.pod-hud__speed { inset:30px 8px auto; height:143px; }
 .pod-hud__driving-instruments .pod-hud__speed-ring { width:157px; height:102px; }
 .pod-hud__driving-instruments .pod-hud__speed-readout { left:24px; top:36px; width:105px; }
 .pod-hud__driving-instruments .pod-hud__speed-number { font-size:34px; }
 .pod-hud__driving-instruments .pod-hud__speed-unit { font-size:9px; }
 .pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter { width:74px; bottom:4px; }
 .pod-hud__driving-instruments>.pod-hud__telemetry { left:8px; right:8px; bottom:10px; gap:8px; }
 .pod-hud__driving-instruments .pod-hud__telemetry>.pod-hud__meter { width:74px; }
 .pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label,.pod-hud__driving-instruments .pod-hud__meter-value { font-size:10px; }
 .pod-hud__driving-instruments>.pod-hud__redline-heat { left:8px; right:8px; font-size:9px; }
 .pod-hud__flight { right:14px; bottom:248px; width:174px; }
 .pod-hud__launch[data-stage=result] { left:15px; top:112px; width:178px; }
 .pod-hud__launch[data-stage=result] header>strong { font-size:15px; }
 .pod-hud__launch[data-stage=result] footer { font-size:10px; }
 .pod-hud__garage-stats span { font-size:10px; }
}

.pod-hud.is-high-contrast .pod-hud__driving-instruments { background:#0b2026; border-color:#fffbd8; }
.pod-hud__launch[data-stage=result] footer>span { font-size:12px; }
.pod-hud__workshop-effective li { line-height:1.35; padding:4px 0; }
@media (max-height:540px) and (min-width:761px) {
 .pod-hud__course-progress { right:208px; top:31%; bottom:30px; }
 .pod-hud__driving-instruments { width:174px; height:174px; right:14px; bottom:14px; border-radius:24px 6px 6px 6px; }
 .pod-hud__driving-instruments>.pod-hud__redline-heat { left:8px; right:8px; top:5px; font-size:9px; }
 .pod-hud__driving-instruments>.pod-hud__speed { inset:24px 8px auto; height:104px; }
 .pod-hud__driving-instruments .pod-hud__speed-ring { width:148px; height:85px; }
 .pod-hud__driving-instruments .pod-hud__speed-readout { top:29px; left:24px; width:105px; }
 .pod-hud__driving-instruments .pod-hud__speed-number { font-size:29px; }
 .pod-hud__driving-instruments .pod-hud__speed-unit { font-size:9px; }
 .pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter { width:74px; bottom:-2px; }
 .pod-hud__driving-instruments>.pod-hud__telemetry { left:8px; right:8px; bottom:7px; gap:8px; }
 .pod-hud__driving-instruments .pod-hud__telemetry>.pod-hud__meter { width:74px; }
 .pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label,.pod-hud__driving-instruments .pod-hud__meter-value { font-size:10px; }
 .pod-hud__driving-instruments::after { bottom:37px; }
 .pod-hud__flight { right:14px; top:153px; bottom:auto; width:174px; height:17px; padding:1px 5px; min-height:0; }
 .pod-hud__flight>.pod-hud__flight-state,.pod-hud__flight>small { display:none; }
 .pod-hud__flight>strong { font-size:11px; line-height:13px; }
}

/* Preparation has two decisions: the machine at left, the event at right. */
.pod-hud__garage-bay { font-weight:700; font-size:12px; color:#e4eadc; letter-spacing:.1em; }
.pod-hud__appearance button { font-size:13px; font-weight:700; }
.pod-hud__appearance span,.pod-hud__appearance small { font-size:11px; color:#dce4d8; }
.pod-hud__appearance p { font-size:12px; color:#dce4d8; }
.pod-hud__garage-name>span { font-size:11px; font-weight:700; letter-spacing:.08em; }
.pod-hud__garage-name p { font-size:14px; color:#e0e6dc; }
.pod-hud__garage-stats { padding-top:14px; padding-bottom:14px; }
.pod-hud__garage-stats span { color:#d9e1d4; font-size:12px; font-weight:700; }
.pod-hud__garage-stats b { font-size:13px; }
.pod-hud__mastery>.pod-hud__eyebrow { font-size:12px; color:#e8cf96; }
.pod-hud__mastery h2 { font-size:30px; letter-spacing:-.025em; }
.pod-hud__mastery>p { font-size:14px; line-height:1.4; color:#e0e6dc; }
.pod-hud__event-list button small,.pod-hud__event-list button.is-selected small { display:none; }
.pod-hud__event-list button strong { font-size:15px; }
.pod-hud__event-list button { min-height:36px; padding-top:8px; padding-bottom:8px; }
.pod-hud__event-list button.is-selected { background:#d2dacb; color:#18343c; border-left:4px solid #c25a3d; }
.pod-hud__event-heading { font-size:11px; letter-spacing:.03em; gap:8px; color:#dce4d8; }
.pod-hud__event-heading small { white-space:nowrap; }
.pod-hud__personal-record>span { color:#dce4d8; font-size:11px; }
.pod-hud__personal-record>small { color:#dce4d8; font-size:13px; }
.pod-hud__mastery-controls button { min-height:35px; font-size:12px; }
.pod-hud__vehicle-cards::before { font-size:12px; font-weight:700; }
.pod-hud__vehicle-select-footer { padding:14px; background:#d6dcd0; border-top:3px solid #25464c; }
.pod-hud__event-launch-summary>strong { font-size:13px; }
.pod-hud__event-launch-summary>small { font-size:12px; color:#365159; }
.pod-hud__selector-controls>summary,.pod-hud__room>summary { font-size:12px; }
.pod-hud__start-button { min-height:48px; font-size:16px; background:#21434c; }
.pod-hud__start-prompt[data-mode=ready] { font-size:12px; font-weight:700; color:#284a50; }
@media (max-width:760px) {
 .pod-hud__appearance button { font-size:12px; }
 .pod-hud__garage-name p { font-size:12px; }
 .pod-hud__garage-stats span { font-size:10px; }
 .pod-hud__mastery h2 { font-size:27px; }
 .pod-hud__vehicle-select-footer { padding:12px; }
}

/* During a cut only the impact caption remains; no dim instruments under the matte. */
.pod-hud.has-cinematic-matte>:not(.pod-hud__cinematic-matte):not(.pod-hud__combat-feedback):not(.pod-hud__pause) { display:none; }
.pod-hud.has-wreck-state>.pod-hud__driving-instruments,
.pod-hud.has-wreck-state>.pod-hud__race,
.pod-hud.has-wreck-state>.pod-hud__corner,
.pod-hud.has-wreck-state>.pod-hud__course-progress,
.pod-hud.has-wreck-state>.pod-hud__detail-toggle,
.pod-hud.has-wreck-state>.pod-hud__galactic { display:none; }
.pod-hud.has-wreck-state>.pod-hud__galactic-alert { left:50%; right:auto; top:auto; bottom:max(calc(7% + 12px),env(safe-area-inset-bottom,0px)); width:min(280px,calc(100vw - 40px)); min-height:65px; height:auto; padding:10px 14px; transform:translateX(-50%); border:0; border-radius:3px; background:#152e36dc; text-align:center; }
.pod-hud.has-wreck-state>.pod-hud__galactic-alert>strong { font:400 24px/1.05 Inkstorm Display,sans-serif; letter-spacing:.01em; color:#ffdc8d; }
.pod-hud.has-wreck-state>.pod-hud__galactic-alert>span { font:12px/1.4 Inkstorm UI,sans-serif; color:#ffdc8d; }

/* Calm running instruments; charged drift gets its own transient readout. */
.pod-hud__race-stat .pod-hud__label,.pod-hud__race-time>.pod-hud__label { font-size:12px; letter-spacing:.1em; }
.pod-hud__race::before { background:linear-gradient(90deg,transparent,#173c43bc 12%,#173c43d9 50%,#173c43bc 88%,transparent); }
.pod-hud__driving-instruments { width:236px; height:242px; }
.pod-hud__driving-instruments>.pod-hud__redline-heat { top:0; left:14px; font:700 12px/1.3 Inkstorm UI,sans-serif; }
.pod-hud__driving-instruments>.pod-hud__redline-heat:not(.is-active):not(.has-core-heat) .pod-hud__redline-track { visibility:hidden; }
.pod-hud__driving-instruments>.pod-hud__speed { top:23px; height:170px; }
.pod-hud__driving-instruments .pod-hud__speed-number { font-size:48px; }
.pod-hud__driving-instruments .pod-hud__speed-dial .dial-fill { fill:#142f37bd; }
.pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter--boost { width:100%; bottom:0; left:0; right:0; padding:5px 9px; background:#142f37ca; border-radius:2px; }
.pod-hud__driving-instruments .pod-hud__meter-head { align-items:baseline; }
.pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label { font-size:12px; }
.pod-hud__driving-instruments .pod-hud__meter-value { font:700 15px/1 Inkstorm UI,sans-serif; }
.pod-hud:not(.has-drift-charge) .pod-hud__driving-instruments .pod-hud__meter--drift { display:none; }
.pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter--drift { top:-63px; bottom:auto; left:0; width:100%; padding:5px 9px; background:#142f37e8; border-left:2px solid #f5d58e; }
.pod-hud__driving-instruments>.pod-hud__telemetry { bottom:0; gap:10px; }
.pod-hud__driving-instruments .pod-hud__telemetry>.pod-hud__meter { padding:7px 8px 6px; background:#142f37ca; border-radius:2px; }
.pod-hud__driving-instruments .pod-hud__meter-track { height:4px; }
.pod-hud__driving-instruments .pod-hud__telemetry.is-hot .pod-hud__meter--heat { background:#4c2621e8; box-shadow:none; outline:0; }
.pod-hud__systems-cluster { width:228px; height:83px; }
.pod-hud__combat-grid { gap:10px; }
.pod-hud__combat-slot { border-radius:26px 6px 26px 6px; border-color:#f5d58e9c; background:#142f37b8; }
.pod-hud__system-label { font-size:12px; bottom:9px; color:#f5d58e; }
.pod-hud__system-gauge { left:18px; top:12px; width:36px; height:36px; }
.pod-hud__combat-key { font:700 12px/1 Inkstorm UI,sans-serif; padding:3px 4px; }
.pod-hud__detail-toggle { font-size:11px; }
/* Selectors remain available, while the machine and launch own the contrast. */
.pod-hud__appearance button { min-height:38px; padding:8px 13px; font-size:14px; }
.pod-hud__appearance span,.pod-hud__appearance small { font-size:12px; }
.pod-hud__appearance p { margin-top:7px; }
.pod-hud__garage-model { top:67px; }
.pod-hud__garage-stats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:16px; }
.pod-hud__garage-stats>div { display:grid; grid-template-columns:1fr auto; gap:6px; }
.pod-hud__garage-stats span { font-size:13px; }
.pod-hud__garage-stats b { grid-column:2; grid-row:1; font:700 16px/1 Inkstorm UI,sans-serif; }
.pod-hud__garage-stats i { grid-column:1/-1; width:100%; height:8px; }
.pod-hud__mastery h2 { margin-top:9px; margin-bottom:8px; }
.pod-hud__mastery .pod-hud__event-heading { margin-top:17px; }
.pod-hud__event-list button { min-height:40px; }
.pod-hud__event-list button strong { font-size:16px; }
.pod-hud__mastery-controls button { border:0; padding:7px 0; text-align:left; }
.pod-hud__personal-record>strong { font-family:Inkstorm UI,sans-serif; font-weight:700; }
.pod-hud__selector-controls,.pod-hud__room { border:0; background:transparent; }
.pod-hud__selector-controls>summary,.pod-hud__room>summary { padding-left:0; padding-right:0; }
.pod-hud__selector-controls[open],.pod-hud__room[open] { padding:0 12px 12px; background:#e8e7dc; }
.pod-hud__workshop-toggle:disabled { display:none; }
.pod-hud__start-button { min-height:54px; font-size:18px; }
.pod-hud__garage-nav button { font-size:14px; }
@media (max-width:760px) {
 .pod-hud__appearance button { min-height:36px; padding:7px 9px; font-size:12px; }
 .pod-hud__garage-model { top:105px; }
 .pod-hud__garage-stats { gap:8px; }
 .pod-hud__garage-stats span { font-size:10px; }
 .pod-hud__garage-stats b { font-size:13px; }
 .pod-hud__driving-instruments { width:174px; height:220px; }
 .pod-hud__driving-instruments>.pod-hud__speed { top:25px; height:143px; }
 .pod-hud__driving-instruments .pod-hud__speed-number { font-size:34px; }
 .pod-hud__driving-instruments>.pod-hud__redline-heat { left:8px; font-size:10px; }
 .pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label { font-size:10px; }
 .pod-hud__driving-instruments .pod-hud__meter-value { font-size:12px; }
 .pod-hud__driving-instruments .pod-hud__telemetry>.pod-hud__meter { padding:7px 5px; }
 .pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter--drift { top:-63px; }
 .pod-hud__race-stat .pod-hud__label,.pod-hud__race-time>.pod-hud__label { font-size:10px; }
 .pod-hud__systems-cluster { width:174px; height:70px; }
 .pod-hud__system-gauge { left:12px; top:10px; width:29px; height:29px; }
 .pod-hud__system-label,.pod-hud__combat-key { font-size:10px; }
}
@media (max-height:540px) and (min-width:761px) {
 .pod-hud__driving-instruments { width:174px; height:183px; }
 .pod-hud__driving-instruments>.pod-hud__speed { top:20px; height:114px; }
 .pod-hud__driving-instruments>.pod-hud__redline-heat { left:8px; font-size:10px; }
 .pod-hud__driving-instruments .pod-hud__speed-number { font-size:29px; }
 .pod-hud__driving-instruments .pod-hud__meter-head .pod-hud__label { font-size:10px; }
 .pod-hud__driving-instruments .pod-hud__meter-value { font-size:12px; }
 .pod-hud__driving-instruments .pod-hud__telemetry>.pod-hud__meter { padding:5px; }
 .pod-hud__driving-instruments .pod-hud__speed>.pod-hud__meter--drift { top:-56px; }
 .pod-hud__systems-cluster { width:192px; height:73px; }
 .pod-hud__system-gauge { left:14px; top:10px; width:29px; height:29px; }
 .pod-hud__system-label,.pod-hud__combat-key { font-size:11px; }
 .pod-hud__race-stat .pod-hud__label,.pod-hud__race-time>.pod-hud__label { font-size:10px; }
}
`;
