/** Illustrated mode cards, an interactive paddock, and a single row of tools. */
export const SIMPLE_RACE_SETUP_CSS = /* css */ `
.pod-hud .simple-setup {
 --home-paper:#f2f0e7; --home-ink:#202e31; --home-line:#344347; --home-accent:#b74230; --home-muted:#67716d;
 padding:22px 30px 16px; background:var(--home-paper); color:var(--home-ink); overflow-y:auto;
}
.pod-hud .simple-setup.is-visible { display:block; }
.pod-hud .simple-setup::before,.pod-hud .simple-setup::after { display:none; }
.pod-hud .simple-setup .setup-frame { width:min(1600px,100%); min-height:650px; height:calc(100dvh - 38px); margin:0 auto; display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(210px,32%) minmax(320px,1fr) auto; gap:22px; }
.simple-setup button,.simple-setup summary { -webkit-tap-highlight-color:transparent; }
.simple-setup button:disabled { cursor:default; opacity:.5; }
.simple-setup .setup-header { min-height:0; }
.simple-setup .setup-types { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; height:100%; }
.simple-setup .setup-mode { position:relative; display:flex; flex-direction:column; width:100%; min-width:0; min-height:0; overflow:hidden; padding:0; border:2px solid var(--home-line); background:var(--home-paper); color:var(--home-ink); cursor:pointer; text-align:left; transform:skewX(-1.5deg); transition:border-color .18s,box-shadow .18s,transform .18s; }
.simple-setup .setup-mode-art { position:relative; display:block; min-height:0; flex:1 1 0; width:100%; overflow:hidden; background:#adb3a3; border-bottom:2px solid var(--home-line); }
.simple-setup .setup-mode-art::after { content:''; position:absolute; inset:0; background:repeating-linear-gradient(-24deg,transparent 0 3px,#152d3516 3px 4px); mix-blend-mode:multiply; pointer-events:none; }
.simple-setup .setup-mode img { width:100%; height:100%; display:block; object-fit:cover; filter:grayscale(1) contrast(1.12); transition:filter .25s,transform .4s; }
.simple-setup .setup-mode-number { position:absolute; top:10px; left:12px; font:400 15px/1 var(--ui-heading); padding:5px 6px; background:var(--home-paper); color:var(--home-ink); }
.simple-setup .setup-mode-check { position:absolute; top:10px; right:10px; display:none; width:26px; height:26px; place-items:center; background:var(--home-accent); color:white; font:700 17px/1 Inkstorm UI,sans-serif; }
.simple-setup .setup-mode-caption { display:flex; justify-content:space-between; align-items:center; gap:8px; min-height:56px; padding:12px 16px; }
.simple-setup .setup-mode-caption strong { font:400 clamp(17px,1.65vw,26px)/1.05 var(--ui-heading); text-transform:uppercase; }
.simple-setup .setup-mode-caption small { font:700 10px/1.3 Inkstorm UI,sans-serif; text-align:right; letter-spacing:.045em; }
.simple-setup .setup-mode[aria-pressed=true] { border-color:var(--home-accent); box-shadow:0 0 0 2px var(--home-accent); }
.simple-setup .setup-mode[aria-pressed=true] .setup-mode-art { border-bottom-color:var(--home-accent); }
.simple-setup .setup-mode[aria-pressed=true] img { filter:saturate(.72) contrast(1.06); }
.simple-setup .setup-mode[aria-pressed=true] .setup-mode-check { display:grid; }
.simple-setup .setup-mode:hover:not(:disabled) img { filter:saturate(.8) contrast(1.06); transform:scale(1.04); }
.simple-setup .setup-mode:hover:not(:disabled) { transform:skewX(-1.5deg) translateY(-3px); }
.simple-setup .setup-roster-stage { display:grid; grid-template-columns:minmax(220px,1fr) minmax(320px,2.25fr) minmax(220px,1fr); grid-template-rows:24px minmax(0,1fr); gap:12px 20px; min-height:0; }
.simple-setup .setup-roster-heading { grid-column:1/-1; display:flex; align-items:center; gap:16px; }
.simple-setup .setup-roster-heading h2 { margin:0; font:400 19px/1 var(--ui-heading); }
.simple-setup .setup-roster-heading>span { flex:1; height:1px; background:var(--home-line); }
.simple-setup .setup-roster-heading small { font:700 10px/1 Inkstorm UI,sans-serif; letter-spacing:.09em; }
.simple-setup .setup-roster { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); grid-template-rows:repeat(2,minmax(0,1fr)); align-self:center; gap:10px; height:min(100%,350px); min-height:0; }
.simple-setup .setup-racer { position:relative; display:flex; flex-direction:column; min-width:0; min-height:0; padding:0; border:1px solid var(--home-line); background:transparent; cursor:pointer; color:var(--home-ink); transition:border-color .16s,box-shadow .16s,transform .16s; }
.simple-setup .setup-racer-art { position:relative; display:grid; place-items:center; width:100%; flex:1; min-height:0; overflow:hidden; background:radial-gradient(ellipse at 50% 45%,#fffdf8 10%,#e1e2d8 100%); }
.simple-setup .setup-racer-art::before { content:''; position:absolute; inset:0; background:repeating-linear-gradient(-35deg,transparent 0 5px,#28444a09 5px 6px); }
.simple-setup .setup-racer img { position:relative; width:100%; height:100%; object-fit:contain; filter:grayscale(1) contrast(1.13); transition:transform .25s,filter .25s; }
.simple-setup .setup-racer>strong { width:100%; min-height:30px; display:grid; place-items:center; border-top:1px solid var(--home-line); padding:7px 2px; font:400 clamp(10px,1vw,14px)/1 var(--ui-heading); text-transform:uppercase; }
.simple-setup .setup-racer-check { position:absolute; top:5px; right:5px; display:none; width:19px; height:19px; background:var(--home-accent); color:white; font:700 13px/19px sans-serif; }
.simple-setup .setup-racer[aria-pressed=true] { border-color:var(--home-accent); box-shadow:0 0 0 2px var(--home-accent); }
.simple-setup .setup-racer[aria-pressed=true]>strong { background:var(--home-ink); color:var(--home-paper); }
.simple-setup .setup-racer[aria-pressed=true] img,.simple-setup .setup-racer:hover img { filter:none; }
.simple-setup .setup-racer[aria-pressed=true] .setup-racer-check { display:block; }
.simple-setup .setup-racer:hover:not(:disabled) { transform:translateY(-3px); }
.simple-setup .setup-racer:hover img { transform:scale(1.07); }
.pod-hud .simple-setup .pod-hud__garage-hero { grid-column:2; grid-row:2; position:relative; display:block; order:initial; min-height:0; height:auto; padding:0; margin:0; overflow:visible; background:none; color:var(--home-ink); border:0; border-radius:0; clip-path:none; animation:none; }
.pod-hud .simple-setup .pod-hud__garage-hero::before,.pod-hud .simple-setup .pod-hud__garage-hero::after { display:none; }
.simple-setup .setup-roster--right { grid-column:3; grid-row:2; }
.simple-setup .setup-hero-number { position:absolute; top:2px; left:50%; transform:translateX(-50%); font:700 10px/1 Inkstorm UI,sans-serif; letter-spacing:.2em; color:var(--home-muted); }
.simple-setup .setup-hero-orbit { position:absolute; left:10%; right:10%; top:50%; height:16%; border:1px solid #28444a25; border-radius:50%; background:radial-gradient(ellipse,#28444a14,transparent 67%); transform:rotate(-8deg); pointer-events:none; }
.pod-hud .simple-setup .pod-hud__garage-model { position:absolute; inset:14px 14px 128px; width:auto; height:auto; margin:0; cursor:grab; touch-action:none; outline-offset:-4px; }
.pod-hud .simple-setup .pod-hud__garage-model.is-inspecting { cursor:grabbing; }
.pod-hud .simple-setup .pod-hud__garage-model img,.pod-hud .simple-setup .pod-hud__garage-model canvas { filter:drop-shadow(0 18px 8px #183b3525); animation:setup-hover 5s ease-in-out infinite; }
.pod-hud .simple-setup .pod-hud__garage-model.is-inspecting :is(img,canvas) { animation-play-state:paused; }
@keyframes setup-hover { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
.simple-setup .setup-pod-arrow { position:absolute; z-index:2; top:40%; transform:translateY(-50%); width:40px; height:52px; display:grid; place-items:center; border:0; background:transparent; color:var(--home-ink); font:400 40px/1 sans-serif; cursor:pointer; opacity:.7; }
.simple-setup .setup-pod-arrow:hover { color:var(--home-accent); opacity:1; }
.simple-setup .setup-pod-arrow--previous { left:-10px; }
.simple-setup .setup-pod-arrow--next { right:-10px; }
.pod-hud .simple-setup .pod-hud__garage-name { position:absolute; inset:auto 0 82px; width:auto; max-width:none; margin:0; text-align:center; pointer-events:none; }
.simple-setup .pod-hud__garage-name>span { font:700 10px/1.4 Inkstorm UI,sans-serif; letter-spacing:.12em; color:var(--home-accent); }
.simple-setup .pod-hud__garage-name h1 { margin:3px 0 0; font:400 clamp(28px,3.2vw,48px)/1.05 var(--ui-heading); letter-spacing:-.025em; color:var(--home-ink); }
.simple-setup .setup-hero-stats { position:absolute; inset:auto 5% 57px; display:flex; justify-content:center; gap:14px; }
.simple-setup .setup-hero-stats>div { display:grid; grid-template-columns:auto 32px; align-items:center; gap:6px; }
.simple-setup .setup-hero-stats span { font:700 9px/1 Inkstorm UI,sans-serif; color:var(--home-muted); white-space:nowrap; }
.simple-setup .setup-hero-stats i { display:block; width:32px; height:4px; background:linear-gradient(to right,var(--home-ink) var(--rating),#28444a25 var(--rating)); }
.simple-setup .setup-hero-stats b { display:none; }
.pod-hud .simple-setup .pod-hud__garage-inspect { position:absolute; inset:auto 0 0; width:auto; display:flex; justify-content:center; align-items:center; gap:14px; margin:0; }
.pod-hud .simple-setup .pod-hud__garage-inspect button { width:44px; height:44px; min-height:44px; padding:0; border:0; border-radius:0; background:none; color:var(--home-ink); font:24px/1 sans-serif; cursor:pointer; }
.simple-setup .pod-hud__garage-inspect>span { display:block; white-space:nowrap; font:700 10px/1.5 Inkstorm UI,sans-serif; color:var(--home-ink); letter-spacing:.07em; text-align:center; }
.simple-setup .pod-hud__garage-inspect small { display:block; font:400 9px/1.5 Inkstorm UI,sans-serif; color:var(--home-muted); }
.simple-setup .setup-preview-status { position:absolute; z-index:3; top:30px; left:50%; transform:translateX(-50%); width:max-content; max-width:90%; padding:8px 12px; background:var(--home-paper); border:1px solid var(--home-line); color:var(--home-ink); font:12px/1.3 Inkstorm UI,sans-serif; text-transform:none; }
.simple-setup .setup-preview-status p { margin:0; }
.simple-setup .setup-preview-status button { min-height:36px; margin-top:6px; border:1px solid currentColor; background:none; color:inherit; }
.simple-setup .setup-bottom { position:relative; z-index:8; display:flex; align-items:center; justify-content:space-between; gap:22px; padding:14px 0 0; border-top:1px solid var(--home-line); min-width:0; }
.simple-setup .setup-brand { font:400 22px/1 var(--ui-heading); letter-spacing:-.015em; }
.simple-setup .setup-brand small { display:block; margin-top:6px; font:700 8px/1 Inkstorm UI,sans-serif; letter-spacing:.12em; }
.simple-setup .setup-tools { display:flex; align-items:center; justify-content:flex-end; gap:6px; flex:1; min-width:0; }
.simple-setup .setup-tools>button,.simple-setup .setup-drawer>summary { min-height:48px; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border:0; background:transparent; color:var(--home-ink); font:400 12px/1.2 var(--ui-heading); text-transform:uppercase; cursor:pointer; list-style:none; }
.simple-setup .setup-tools>button:hover,.simple-setup .setup-drawer>summary:hover,.simple-setup .setup-drawer[open]>summary { background:#28444a0d; color:var(--home-accent); }
.simple-setup .setup-drawer { position:relative; margin:0; padding:0; border:0; background:none; }
.simple-setup .setup-drawer>summary::-webkit-details-marker { display:none; }
.simple-setup .setup-destination>summary { min-width:140px; padding-right:16px; border-right:1px solid #28444a30; }
.simple-setup .setup-destination summary small { display:block; margin-bottom:5px; color:var(--home-muted); font:700 9px/1 Inkstorm UI,sans-serif; letter-spacing:.08em; }
.simple-setup .setup-destination summary b { font:inherit; }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { width:170px; min-width:140px; min-height:58px; margin:0; padding:8px 0 8px 18px; display:flex; align-items:center; justify-content:space-between; gap:4px; border:0; background:none; color:var(--home-accent); font:400 44px/1 var(--ui-heading); text-transform:uppercase; letter-spacing:-.04em; cursor:pointer; transition:transform .18s; }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button:hover:not(:disabled) { transform:translateX(4px); color:var(--home-ink); }
.simple-setup .pod-hud__start-button b { flex:none; width:32px; font:400 32px/1 sans-serif; }
.simple-setup .pod-hud__start-button:disabled span { font-size:22px; }
.simple-setup .setup-drawer-body { position:absolute; z-index:10; bottom:calc(100% + 18px); left:0; width:360px; max-width:calc(100vw - 32px); max-height:min(560px,calc(100dvh - 160px)); overflow:auto; background:var(--home-paper); border:2px solid var(--home-line); box-shadow:7px 7px 0 #202e3120; padding:18px; color:var(--home-ink); text-transform:none; }
.simple-setup .setup-online .setup-drawer-body { left:auto; right:-80px; }
.simple-setup .setup-drawer-body header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid #28444a33; }
.simple-setup .setup-drawer-body header strong { font:400 18px/1.2 var(--ui-heading); text-transform:uppercase; }
.simple-setup .setup-drawer-body button { cursor:pointer; }
.simple-setup .setup-drawer-body header button { width:44px; height:44px; border:0; background:none; color:inherit; font:26px/1 sans-serif; }
.simple-setup .setup-courses { display:grid; gap:8px; }
.simple-setup .setup-courses button { display:flex; justify-content:space-between; gap:12px; align-items:center; min-height:52px; padding:10px 12px; border:1px solid #28444a66; background:transparent; color:var(--home-ink); }
.simple-setup .setup-courses strong { font:400 13px/1 var(--ui-heading); }
.simple-setup .setup-courses small { font:400 11px/1.2 Inkstorm UI,sans-serif; }
.simple-setup .setup-courses button[aria-pressed=true] { background:var(--home-ink); color:var(--home-paper); }
.simple-setup .setup-options { display:grid; gap:16px; padding:14px 0; }
.simple-setup .setup-options>div { display:flex; align-items:center; gap:5px; flex-wrap:nowrap; border:0; padding:0; margin:0; background:none; }
.simple-setup .setup-options>div>span { width:55px; color:var(--home-muted); font:700 12px/1 Inkstorm UI,sans-serif; }
.simple-setup .setup-options button { min-width:44px; min-height:44px; padding:8px 12px; border:1px solid #28444a40; background:transparent; color:var(--home-ink); font:700 12px/1 Inkstorm UI,sans-serif; }
.simple-setup .setup-options button[aria-pressed=true] { border-color:var(--home-ink); background:var(--home-ink); color:var(--home-paper); }
.simple-setup .setup-rule-summary { font:13px/1.5 Inkstorm UI,sans-serif; color:var(--home-muted); }
.simple-setup .pod-hud__mastery-controls { display:flex; gap:10px; margin-top:16px; }
.simple-setup .pod-hud__mastery-controls button { min-height:44px; background:none; border:1px solid #28444a44; color:var(--home-ink); padding:10px; }
.simple-setup .setup-online .pod-hud__selector-section-head { display:flex; justify-content:space-between; font:700 12px/1.4 Inkstorm UI,sans-serif; }
.simple-setup .setup-online .pod-hud__room-actions { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
.simple-setup .setup-online .pod-hud__room-actions :is(button,input) { min-height:44px; min-width:0; padding:8px; background:none; border:1px solid #28444a66; color:var(--home-ink); font:700 12px/1 Inkstorm UI,sans-serif; }
.simple-setup .setup-online .pod-hud__room-code { width:105px; }
.simple-setup .setup-online .pod-hud__room-code input { width:100%; }
.simple-setup .setup-online .pod-hud__selector-section-head :is(strong,span) { color:var(--home-ink); font:700 12px/1.4 Inkstorm UI,sans-serif; }
.simple-setup .setup-online .pod-hud__room-members { margin:12px 0 0; padding:0; }
.simple-setup .setup-online .pod-hud__room-member { background:#28444a10; color:var(--home-ink); font:12px/1.4 Inkstorm UI,sans-serif; padding:6px 10px; }
.simple-setup .setup-online .pod-hud__room-member b { color:var(--home-accent); }
.simple-setup .setup-online .pod-hud__room-status { font:12px/1.5 Inkstorm UI,sans-serif; color:var(--home-muted); }
.simple-setup [hidden],.simple-setup .setup-legacy { display:none!important; }
.pod-hud.has-vehicle-selection>.pod-hud__pause.has-settings { visibility:visible!important; opacity:1!important; z-index:100; pointer-events:auto; }
.pod-hud .simple-setup :is(button,summary,[data-pod-inspection]):focus-visible { outline:3px solid var(--home-accent); outline-offset:4px; }
.pod-hud .simple-setup [data-pod-inspection]:focus-visible { outline-offset:-3px; }
.pod-hud.is-high-contrast .simple-setup { --home-muted:#263939; --home-paper:#fffdf2; --home-ink:#081619; }
.pod-hud.is-reduced-motion .simple-setup * { animation:none!important; transition:none!important; }
@media(prefers-reduced-motion:reduce) { .pod-hud .simple-setup * { animation:none!important; transition:none!important; } }
@media(max-width:1150px) {
 .simple-setup .setup-mode-caption { min-height:55px; padding:10px; flex-direction:column; align-items:flex-start; gap:5px; }
 .simple-setup .setup-roster-stage { grid-template-columns:minmax(170px,1fr) minmax(280px,2fr) minmax(170px,1fr); gap:12px; }
 .simple-setup .setup-bottom { gap:12px; }
 .simple-setup .setup-brand { font-size:17px; }
 .simple-setup .setup-brand small { font-size:7px; }
 .simple-setup .setup-tools { gap:0; }
 .simple-setup .setup-tools>button,.simple-setup .setup-drawer>summary { font-size:10px; padding:8px; }
 .simple-setup .setup-destination>summary { min-width:115px; }
 .pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { width:125px; min-width:120px; font-size:34px; }
 .simple-setup .setup-hero-stats { gap:9px; inset:auto 0 57px; }
 .simple-setup .setup-hero-stats>div { grid-template-columns:1fr; gap:4px; }
}
@media(max-width:760px) {
 .pod-hud .simple-setup { padding:14px 14px 12px; }
 .pod-hud .simple-setup .setup-frame { height:calc(100dvh - 26px); min-height:715px; grid-template-rows:130px minmax(440px,1fr) auto; gap:15px; }
 .simple-setup .setup-types { gap:6px; }
 .simple-setup .setup-mode { transform:none; border-width:1px; }
 .simple-setup .setup-mode-caption { min-height:42px; padding:7px 4px; justify-content:center; align-items:center; }
 .simple-setup .setup-mode-caption strong { font-size:12px; text-align:center; }
 .simple-setup .setup-mode-caption small { display:none; }
 .simple-setup .setup-mode-number { top:4px; left:4px; font-size:9px; padding:3px; }
 .simple-setup .setup-mode-check { top:4px; right:4px; width:18px; height:18px; font-size:12px; }
 .simple-setup .setup-roster-stage { grid-template-columns:repeat(2,minmax(0,1fr)); grid-template-rows:20px minmax(245px,1fr) 66px 66px; gap:10px; }
 .simple-setup .setup-roster-heading { gap:8px; }
 .simple-setup .setup-roster-heading h2 { font-size:15px; }
 .simple-setup .setup-roster-heading small { display:none; }
 .pod-hud .simple-setup .pod-hud__garage-hero { grid-column:1/-1; grid-row:2; }
 .simple-setup .setup-roster { grid-template-columns:repeat(4,minmax(0,1fr)); grid-template-rows:1fr; grid-row:3; grid-column:1/-1; gap:7px; height:66px; align-self:stretch; }
 .simple-setup .setup-roster--right { grid-column:1/-1; grid-row:4; }
 .simple-setup .setup-racer>strong { font-size:9px; min-height:22px; padding:5px 1px; overflow-wrap:anywhere; }
 .simple-setup .setup-racer-check { width:13px; height:13px; font-size:10px; line-height:13px; top:2px; right:2px; }
 .simple-setup .setup-racer img { width:100%; max-width:none; margin-left:0; }
 .pod-hud .simple-setup .pod-hud__garage-model { inset:0 18px 109px; }
 .pod-hud .simple-setup .pod-hud__garage-name { bottom:75px; }
 .simple-setup .pod-hud__garage-name h1 { font-size:32px; }
 .simple-setup .setup-hero-number { top:0; left:12px; transform:none; font-size:9px; }
 .simple-setup .setup-hero-stats { bottom:49px; gap:15px; }
 .simple-setup .setup-hero-stats>div { grid-template-columns:auto 25px; gap:5px; }
 .simple-setup .setup-hero-stats i { width:25px; }
 .simple-setup .setup-hero-stats span { font-size:8px; }
 .simple-setup .setup-pod-arrow--previous { left:-6px; }
 .simple-setup .setup-pod-arrow--next { right:-6px; }
 .simple-setup .setup-bottom { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:6px; padding-top:6px; }
 .simple-setup .setup-brand { font-size:16px; grid-row:2; align-self:center; }
 .simple-setup .setup-brand small { display:none; }
 .simple-setup .setup-tools { grid-column:1/-1; grid-row:1; justify-content:space-between; gap:0; flex-wrap:wrap; }
 .simple-setup .setup-tools>button,.simple-setup .setup-drawer>summary { padding:6px; font-size:9px; min-height:44px; gap:4px; }
 .simple-setup .setup-destination>summary { min-width:86px; padding-left:0; }
 .simple-setup .setup-destination summary small { font-size:7px; }
 .pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { grid-row:2; grid-column:2; width:144px; min-height:47px; padding:4px 0 4px 10px; font-size:34px; }
 .simple-setup .setup-drawer { position:static; }
 .simple-setup .setup-drawer-body,.simple-setup .setup-online .setup-drawer-body { left:0; right:auto; bottom:calc(100% + 8px); width:100%; max-width:none; max-height:calc(100dvh - 180px); padding:14px; }
}
@media(max-height:650px) and (min-width:761px) {
 .pod-hud .simple-setup { padding:12px 22px; }
 .pod-hud .simple-setup .setup-frame { height:calc(100dvh - 24px); min-height:360px; grid-template-rows:110px minmax(170px,1fr) auto; gap:8px; }
 .simple-setup .setup-mode-caption { min-height:36px; padding:7px 10px; flex-direction:row; align-items:center; }
 .simple-setup .setup-mode-caption small { display:none; }
 .simple-setup .setup-mode-caption strong { font-size:16px; }
 .simple-setup .setup-roster-stage { grid-template-rows:20px minmax(0,1fr); gap:8px 20px; }
 .pod-hud .simple-setup .pod-hud__garage-model { inset:0 45px 70px; }
 .pod-hud .simple-setup .pod-hud__garage-name { bottom:35px; }
 .simple-setup .pod-hud__garage-name h1 { font-size:27px; }
 .simple-setup .setup-hero-stats { display:none; }
 .pod-hud .simple-setup .pod-hud__garage-inspect { bottom:-7px; }
 .simple-setup .pod-hud__garage-inspect small { display:none; }
 .simple-setup .setup-hero-number { left:0; transform:none; }
 .simple-setup .setup-bottom { padding-top:6px; }
 .simple-setup .setup-racer>strong { min-height:22px; padding:5px 2px; font-size:10px; }
}
`;
