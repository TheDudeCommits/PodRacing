/** F: a built console. Every switch and screen remains a real DOM control. */
export const COCKPIT_CSS = /* css */ `
.pod-hud .simple-setup {
 --home-paper:#151816; --home-ink:#d7d5bc; --home-muted:#aaa994; --home-accent:#ffb95d; --home-line:#6c6956;
 --metal:url('/assets/cockpit/worn-metal.jpg'); --phosphor:#a6edaa;
 background:radial-gradient(ellipse at 50% 5%,#61604c3d,transparent 65%),repeating-linear-gradient(90deg,#070a09 0 7px,#202320 8px 13px,#070909 15px 21px);
 padding:clamp(16px,3vh,34px) clamp(20px,5vw,96px); perspective:1600px; overflow:auto; isolation:isolate;
}
.pod-hud .simple-setup::before,.pod-hud .simple-setup::after { display:block; content:''; position:fixed; top:0; bottom:0; width:22px; background:repeating-linear-gradient(0deg,#111 0 12px,#797467 13px,#2b2e2a 16px,#060908 19px); box-shadow:inset 5px 0 5px #000,5px 0 10px #000; z-index:-1; pointer-events:none; }
.pod-hud .simple-setup::before { left:2.1%; } .pod-hud .simple-setup::after { right:2.1%; }
.pod-hud .simple-setup .setup-frame {
 width:min(1580px,100%); height:calc(100dvh - clamp(32px,6vh,68px)); min-height:650px; padding:18px;
 grid-template-rows:clamp(66px,9vh,100px) minmax(320px,1fr) minmax(135px,20%) 80px; gap:14px;
 background:linear-gradient(135deg,#ffffff0d,#0004),var(--metal) center / 570px; border:2px solid #636457; border-radius:20px 20px 14px 14px;
 box-shadow:inset 2px 2px 2px #b4ac8570,inset -3px -4px 2px #000,0 6px 0 #363831,0 13px 0 #0e100f,0 18px 40px #000;
 transform-style:preserve-3d; transform:rotateX(var(--cockpit-x,0deg)) rotateY(var(--cockpit-y,0deg)); transition:transform .18s ease-out;
}
.simple-setup .setup-header,.simple-setup .setup-roster,.simple-setup .setup-maps,.simple-setup .setup-bottom { position:relative; }
.simple-setup .setup-header { padding:8px; border-radius:8px; background:#050706; box-shadow:0 1px 0 #bfbda03d,inset 0 3px 6px #000; transform:translateZ(10px); }
.simple-setup .setup-types { gap:14px; }
.simple-setup .setup-mode { justify-content:center; border:5px solid #171c19; border-radius:5px; overflow:visible; background:linear-gradient(180deg,#e7d9b8eb,#b6a78dd9),var(--metal) center / 380px; color:#171b18; box-shadow:0 3px 0 #050605,0 5px 7px #000,inset 0 2px 1px #fff8,inset 0 -3px 2px #685d47; }
.simple-setup .setup-mode-art,.simple-setup .setup-mode-caption small,.simple-setup .setup-mode-check { display:none; }
.simple-setup .setup-mode-caption { position:static; min-height:0; justify-content:center; align-items:center; padding:8px; flex-direction:row; }
.simple-setup .setup-mode-caption strong { font:800 clamp(13px,1.8vw,26px)/1.2 Orbitron,sans-serif; text-shadow:0 1px 0 #ffffd44d; letter-spacing:0; text-align:center; }
.simple-setup .setup-mode::before { content:''; position:absolute; left:5px; top:20%; bottom:20%; width:6px; border:1px solid #777263; border-radius:2px; background:#2d3329; box-shadow:inset 1px 2px 3px #000; }
.simple-setup .setup-mode[aria-pressed=true] { background:linear-gradient(180deg,#ffb88de0,#e64d30e3),var(--metal) center / 350px; border-color:#40231b; box-shadow:0 3px 0 #100a07,inset 0 2px 2px #ffe4b2,0 0 18px #ff3c1b52; color:#2d110a; }
.simple-setup .setup-mode[aria-pressed=true]::before { background:#ffeaaa; border-color:#ff9450; box-shadow:0 0 9px #ff511d; }
.simple-setup .setup-mode:hover:not(:disabled) { transform:translateY(-1px); filter:brightness(1.1); }
.simple-setup .setup-mode:active:not(:disabled) { transform:translateY(3px); box-shadow:inset 0 2px 5px #0008; }
.simple-setup .setup-roster-stage { grid-template-columns:minmax(150px,1fr) minmax(310px,3.8fr) minmax(150px,1fr); grid-template-rows:minmax(0,1fr); gap:18px; }
.simple-setup .setup-roster-heading { display:none; }
.simple-setup .setup-roster { height:100%; align-self:stretch; padding:7px; grid-template-columns:1fr; grid-template-rows:repeat(4,minmax(0,1fr)); gap:9px; border-radius:7px; border:1px solid #797362; box-shadow:inset 1px 1px 1px #b1aa8566,2px 4px 5px #000; transform:translateZ(9px); }
.simple-setup .setup-roster--left { grid-column:1; grid-row:1; }.simple-setup .setup-roster--right { grid-column:3; grid-row:1; }
.simple-setup .setup-racer { border:5px solid #171e1a; border-radius:8px; overflow:hidden; background:#07180f; box-shadow:0 1px 2px #c5b69855,0 0 0 1px #080b09,inset 0 0 14px #000; }
.simple-setup .setup-racer-art { background:radial-gradient(ellipse at 50% 62%,#6b4a2e66,#1a120c 72%); }
.simple-setup .setup-racer-art::before { z-index:2; background:repeating-linear-gradient(0deg,#0003 0 1px,transparent 1px 3px); pointer-events:none; }
.simple-setup .setup-racer img { filter:saturate(.85) brightness(.92) drop-shadow(0 3px 5px #000a); object-fit:contain; transition:filter .25s,transform .25s; }
.simple-setup .setup-racer[aria-pressed=true] img,.simple-setup .setup-racer:hover img { filter:saturate(1.05) brightness(1.08) drop-shadow(0 0 8px #ffb86b55); transform:scale(1.04); }
.simple-setup .setup-racer>strong { min-height:20px; padding:3px; border:0; color:#c2d5b7; background:#060e0b; font:600 clamp(9px,.9vw,13px)/1.2 Orbitron,sans-serif; letter-spacing:.09em; }
.simple-setup .setup-racer[aria-pressed=true] { border-color:#7dae79; box-shadow:inset 0 0 12px #b0ff6966,0 0 9px #83f3945e; }
.simple-setup .setup-racer[aria-pressed=true]>strong { background:#15321c; color:#ceffb5; }.simple-setup .setup-racer-check { background:#b4f8a1; color:#1a401d; width:13px; height:13px; font-size:10px; line-height:13px; box-shadow:none; }
.simple-setup .setup-racer:hover:not(:disabled) { transform:translateY(-1px); border-color:#a0c399; }
.pod-hud .simple-setup .pod-hud__garage-hero {
 grid-column:2; grid-row:1; padding:0; background:radial-gradient(ellipse at 55% 60%,#5a3b25 0%,#24170f 45%,#0a0706 75%); border:18px solid #121916; border-radius:10% / 7%; overflow:hidden;
 box-shadow:0 0 0 2px #454941,0 0 0 4px #070a08,0 0 0 6px #55564b,0 8px 12px #000,inset 0 0 12px 3px #000,inset 0 0 2px 4px #315e36;
 transform:translateZ(5px); color:var(--phosphor);
}
.pod-hud .simple-setup .pod-hud__garage-hero::after { display:block; content:''; position:absolute; z-index:3; inset:0; border-radius:8%; pointer-events:none; background:repeating-linear-gradient(0deg,#0003 0 1px,transparent 1px 3px),linear-gradient(120deg,#dbffce0c,transparent 25%,transparent 85%,#bcffbb0b); box-shadow:inset 0 0 35px #000b; }
.pod-hud .simple-setup .pod-hud__garage-hero::before { display:block; content:'+'; position:absolute; inset:17% 8% auto auto; color:#7dcc8555; font:28px monospace; }
.simple-setup .setup-hero-orbit { border-color:#7bb58633; background:none; box-shadow:none; left:20%; right:20%; top:67%; height:16%; transform:rotate(-6deg); }
.simple-setup .setup-hero-number { top:auto; left:auto; right:7%; bottom:6%; transform:none; color:#a7d9a3; font:600 11px Orbitron,sans-serif; z-index:4; }
.pod-hud .simple-setup .pod-hud__garage-model { inset:12% 4% 13%; }
.pod-hud .simple-setup .pod-hud__garage-model img,.pod-hud .simple-setup .pod-hud__garage-model canvas { filter:saturate(1.05) brightness(1.12) drop-shadow(0 12px 18px #000c) drop-shadow(0 0 22px #ff9f5a33); animation:none; }
.pod-hud .simple-setup .pod-hud__garage-name { inset:6% auto auto 6%; text-align:left; z-index:4; }
.simple-setup .pod-hud__garage-name>span { display:none; }.simple-setup .pod-hud__garage-name h1 { color:#b4e4a7; font:800 clamp(22px,2.4vw,40px)/1.1 Orbitron,sans-serif; letter-spacing:.02em; text-shadow:0 0 8px #79dc7855; }
.simple-setup .setup-hero-stats { inset:auto auto 7% 6%; display:grid; grid-template-columns:1fr; gap:7px; z-index:4; }
.simple-setup .setup-hero-stats>div { grid-template-columns:100px 58px; gap:8px; }.simple-setup .setup-hero-stats span { color:#b5d2ad; font:600 11px/1 Inkstorm UI,sans-serif; }.simple-setup .setup-hero-stats i { width:58px; height:6px; background:repeating-linear-gradient(90deg,transparent 0 8px,#0b2312 8px 10px),linear-gradient(90deg,#b3d89e var(--rating),#37523a var(--rating)); }
.simple-setup .setup-pod-arrow { color:#9abf92; width:36px; top:47%; z-index:5; }.simple-setup .setup-pod-arrow--previous { left:0; }.simple-setup .setup-pod-arrow--next { right:0; }
.pod-hud .simple-setup .pod-hud__garage-inspect { z-index:5; right:5%; bottom:12%; gap:4px; }.pod-hud .simple-setup .pod-hud__garage-inspect button { color:#9bbb93; background:#16381f70; border:1px solid #6c9c6333; border-radius:50%; width:36px; height:36px; min-height:36px; font-size:19px; }
.simple-setup .setup-preview-status { background:#102117; color:#b3d5a7; border-color:#568151; top:18%; box-shadow:0 0 25px #000; }
.simple-setup .setup-maps { grid-template-rows:minmax(0,1fr); padding:10px; border:1px solid #78715e; border-radius:8px; background:linear-gradient(160deg,#ddd7b00a,#0004),var(--metal) center / 490px; box-shadow:inset 1px 1px 1px #aea98d66,0 5px 6px #000; transform:translateZ(14px); }
.simple-setup .setup-map-heading { display:none; }.simple-setup .setup-map-grid { grid-template-columns:repeat(4,minmax(0,1fr)); grid-template-rows:1fr; gap:22px; }
.simple-setup .setup-map { border:6px solid #101813; border-radius:8px; background:#08120e; box-shadow:0 1px 1px #b6af8055,0 0 0 1px #050706,inset 0 0 10px #000; overflow:hidden; }
.simple-setup .setup-map img { filter:saturate(.7) sepia(.18) brightness(.78); height:100%; transition:filter .3s,transform .4s; }
.simple-setup .setup-map::after { content:''; position:absolute; inset:0; pointer-events:none; background:repeating-linear-gradient(0deg,#0002 0 1px,transparent 1px 3px); box-shadow:inset 0 0 14px #000; }
.simple-setup .setup-map-caption { position:absolute; inset:auto 0 0; min-height:24px; padding:5px 3px; justify-content:center; background:#060b08ed; border:0; }
.simple-setup .setup-map-caption strong { font:600 clamp(9px,1vw,14px)/1.2 Orbitron,sans-serif; color:#dadbc5; letter-spacing:.1em; text-align:center; }.simple-setup .setup-map-caption small,.simple-setup .setup-map-check { display:none; }
.simple-setup .setup-map[aria-pressed=true] { border-color:#a68a49; box-shadow:0 0 0 1px #eec974,0 0 12px #ffb83d55,inset 0 0 6px #ffe499; }.simple-setup .setup-map[aria-pressed=true] img,.simple-setup .setup-map:hover img { filter:saturate(.85) sepia(.1) brightness(1); }.simple-setup .setup-map:hover { transform:translateY(-1px); }
.simple-setup .setup-bottom { padding:0; border:0; gap:28px; transform:translateZ(20px); align-items:stretch; }
.simple-setup .setup-drawer { height:100%; min-height:0; align-self:stretch; }
.pod-hud .simple-setup .setup-tools>.setup-online { height:100%; padding:0; margin:0; border:0; background:none; }
.simple-setup .setup-tools { gap:14px; flex:1; align-items:stretch; }
.simple-setup .setup-tools::after { content:'THRUSTLINE'; flex:1; min-width:30px; margin:8px 6px; display:flex; align-items:center; justify-content:center; border:4px solid #383c32; border-radius:3px; background:radial-gradient(ellipse at 50% 55%,#3a1d0c,#0b0705 70%),repeating-linear-gradient(90deg,#030504 0 8px,#20251f 9px 11px,#5c5c4b 12px 13px); box-shadow:0 1px 1px #d2c09744,inset 0 0 18px #000; color:#ffcf8a; font:900 clamp(18px,2.5vw,40px)/1 Orbitron,sans-serif; letter-spacing:.32em; padding-left:.32em; text-shadow:0 0 6px #ff9a3c,0 0 18px #ff6a1c99,0 0 36px #ff4d0055; white-space:nowrap; overflow:hidden; }
.simple-setup .setup-tools>button,.simple-setup .setup-drawer>summary { height:100%; min-width:140px; min-height:56px; padding:12px 18px; justify-content:center; border:7px solid #242a24; border-radius:6px; color:#171c18; background:linear-gradient(#c5c2aadd,#989b88db),var(--metal) center / 330px; font:800 13px/1.3 Orbitron,sans-serif; box-shadow:0 4px 0 #080c09,inset 1px 2px 1px #f2ead48c,inset -1px -2px 2px #353e30; }
.simple-setup .setup-tools>button:hover,.simple-setup .setup-drawer>summary:hover,.simple-setup .setup-drawer[open]>summary { background-color:#bdb79d; color:#0b160f; filter:brightness(1.18); }
.simple-setup .setup-drawer>summary>span { width:12px; height:15px; background:#6c8d66; border:2px solid #3b4434; box-shadow:0 0 0 2px #161e16; font-size:0; }.simple-setup .setup-drawer[open]>summary>span { background:#b6f788; box-shadow:0 0 8px #a1ff40; }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { width:250px; min-width:210px; min-height:70px; margin:0; padding:12px 25px; color:#ffe5b3; font:800 34px Orbitron,sans-serif; border:7px solid #40211a; border-radius:7px; background:linear-gradient(#b53924d9,#6e1c13dd),var(--metal) center / 360px; box-shadow:0 4px 0 #050605,inset 0 2px 2px #ffb598,0 0 18px #fe502f25; text-shadow:0 0 12px #ff663e; }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button:hover:not(:disabled) { background-color:#da522d; color:#fff0d0; }.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button:active { transform:translateY(3px); }
.simple-setup .setup-drawer-body { background:linear-gradient(#1a251eeb,#111a15fa),var(--metal); border:5px solid #52594b; color:#dae2cd; box-shadow:0 12px 50px #000; }.simple-setup .setup-options button[aria-pressed=true] { background:#36543c; }.simple-setup .setup-rule-tools { display:flex; gap:12px; margin:12px 0; }.simple-setup .setup-rule-tools button { min-height:40px; background:#303d30; border:1px solid #718062; color:#dae2cd; padding:8px 12px; font:600 12px Orbitron; }
.simple-setup :is(button,summary,[tabindex]):focus-visible { outline:2px solid #e8d88e; outline-offset:3px; }
.cockpit-switching .pod-hud__garage-hero::after { animation:cockpit-refresh .22s ease-out; } @keyframes cockpit-refresh { 0% { background-color:#a6ffc329; } 100% { background-color:transparent; } }
.pod-hud.has-vehicle-selection { --pod-ink:#0b160e; --pod-paper:#ccd9b4; --pod-panel:#101c14; --pod-panel-solid:#142018; --pod-violet:#243929; --pod-sky:#a6cda1; --pod-sand:#ccd5a9; --pod-orange:#c1a478; --pod-muted:#99a88b; }
.pod-hud.has-vehicle-selection .pod-hud__settings { background:linear-gradient(#17211cef,#0c1710fa),url('/assets/cockpit/worn-metal.jpg'); color:#c7d7b4; border:8px ridge #4e5545; box-shadow:0 15px 70px #000c; clip-path:none; }
.pod-hud.has-vehicle-selection .pod-hud__settings header { background:#28382b; border-color:#657758; }
.pod-hud.has-vehicle-selection .pod-hud__settings header strong { font:700 24px Orbitron,sans-serif; transform:none; text-shadow:none; color:#c7dfad; }
.pod-hud.has-vehicle-selection .pod-hud__settings :is(button,label,.pod-hud__binding-row,.pod-hud__capture-status) { background:#111e16; color:#c4d4af; border-color:#55694c; }
.pod-hud.has-vehicle-selection .pod-hud__settings button[aria-pressed=true] { background:#bac9a0; color:#172619; }
.pod-hud.has-vehicle-selection .pod-hud__settings output { color:#d3e9ad; }
.pod-hud.has-vehicle-selection .pod-hud__settings input { accent-color:#a4c28e; }
.simple-setup .setup-frame::before { content:''; position:absolute; inset:4px; pointer-events:none; z-index:9; background:radial-gradient(circle,#080b08 0 2px,#66675b 3px,#222720 5px,#000 6px,transparent 7px) left top / 16px 16px no-repeat,radial-gradient(circle,#080b08 0 2px,#66675b 3px,#222720 5px,#000 6px,transparent 7px) right top / 16px 16px no-repeat,radial-gradient(circle,#080b08 0 2px,#66675b 3px,#222720 5px,#000 6px,transparent 7px) left bottom / 16px 16px no-repeat,radial-gradient(circle,#080b08 0 2px,#66675b 3px,#222720 5px,#000 6px,transparent 7px) right bottom / 16px 16px no-repeat; }
@media(max-width:1100px) { .pod-hud .simple-setup { padding:20px 30px; }.pod-hud .simple-setup .setup-frame { height:calc(100dvh - 40px); padding:12px; gap:12px; }.simple-setup .setup-roster-stage { grid-template-columns:130px minmax(260px,1fr) 130px; gap:14px; }.simple-setup .setup-tools>button,.simple-setup .setup-drawer>summary { min-width:110px; padding:8px; font-size:11px; }.simple-setup .setup-tools { gap:8px; }.simple-setup .setup-bottom { gap:12px; }.simple-setup .setup-map-grid { gap:12px; } }
@media(max-width:760px) {
 .pod-hud .simple-setup { padding:12px; perspective:none; }.pod-hud .simple-setup::before,.pod-hud .simple-setup::after { display:none; }
 .pod-hud .simple-setup .setup-frame { height:auto; min-height:calc(100dvh - 24px); padding:10px; border-radius:12px; grid-template-rows:62px minmax(420px,1fr) 180px 120px; gap:12px; transform:none; }
 .simple-setup .setup-header { padding:4px; }.simple-setup .setup-types { gap:5px; }.simple-setup .setup-mode { border-width:3px; }.simple-setup .setup-mode-caption { padding:6px; }.simple-setup .setup-mode-caption strong { font-size:10px; }.simple-setup .setup-mode::before { display:none; }
 .simple-setup .setup-roster-stage { grid-template-columns:1fr 1fr; grid-template-rows:270px 64px 64px; gap:8px; }.pod-hud .simple-setup .pod-hud__garage-hero { grid-column:1/-1; grid-row:1; border-width:12px; }.simple-setup .setup-roster { grid-template-columns:repeat(4,minmax(0,1fr)); grid-template-rows:1fr; padding:3px; gap:6px; grid-column:1/-1; height:64px; }.simple-setup .setup-roster--left { grid-row:2; }.simple-setup .setup-roster--right { grid-row:3; }.simple-setup .setup-racer { border-width:3px; }.simple-setup .setup-racer>strong { font-size:7px; min-height:15px; padding:2px; letter-spacing:0; }
 .simple-setup .setup-hero-stats { gap:5px; }.simple-setup .setup-hero-stats>div { grid-template-columns:74px 42px; }.simple-setup .setup-hero-stats span { font-size:9px; }.simple-setup .setup-hero-stats i { width:42px; height:5px; }.simple-setup .setup-hero-number { font-size:9px; }.simple-setup .pod-hud__garage-name h1 { font-size:22px; }
 .simple-setup .setup-maps { padding:7px; }.simple-setup .setup-map-grid { grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:8px; }.simple-setup .setup-map { border-width:4px; }.simple-setup .setup-map-caption strong { font-size:9px; }.simple-setup .setup-map-caption { min-height:18px; padding:3px; }
 .simple-setup .setup-bottom { display:flex; flex-wrap:wrap; position:relative; bottom:auto; background:none; gap:10px; }.simple-setup .setup-tools { flex-basis:100%; justify-content:space-between; flex-wrap:nowrap; gap:8px; }.simple-setup .setup-tools::after { display:none; }.simple-setup .setup-tools>button,.simple-setup .setup-drawer>summary { font-size:9px; min-width:0; width:100%; min-height:46px; height:46px; padding:6px; border-width:4px; }.simple-setup .setup-tools>button,.simple-setup .setup-drawer { flex:1; }.simple-setup .setup-drawer { position:static; }.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { width:100%; min-height:56px; height:56px; font-size:26px; justify-content:center; gap:20px; padding:5px; }.simple-setup .setup-drawer-body,.simple-setup .setup-online .setup-drawer-body { bottom:calc(100% + 8px); left:0; right:0; }
}
@media(max-height:700px) and (min-width:761px) { .pod-hud .simple-setup { padding:12px 30px; }.pod-hud .simple-setup .setup-frame { min-height:490px; height:calc(100dvh - 24px); padding:12px; grid-template-rows:58px minmax(235px,1fr) 98px 56px; gap:10px; }.simple-setup .setup-roster-stage { gap:14px; }.simple-setup .setup-roster { padding:4px; gap:4px; }.simple-setup .setup-racer { border-width:3px; }.simple-setup .setup-racer>strong { min-height:15px; font-size:9px; padding:2px; }.simple-setup .setup-hero-stats { gap:4px; }.simple-setup .setup-hero-stats span { font-size:9px; }.pod-hud .simple-setup .pod-hud__garage-hero { border-width:12px; }.simple-setup .setup-tools>button,.simple-setup .setup-drawer>summary { min-height:50px; }.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { min-height:50px; padding:4px 18px; font-size:28px; } }
@media(prefers-reduced-motion:reduce) { .pod-hud .simple-setup .setup-frame { transform:none; }.simple-setup *,.simple-setup *::after { animation:none!important; transition:none!important; } }
.pod-hud.is-reduced-motion .simple-setup .setup-frame { transform:none; }.pod-hud.is-reduced-motion .simple-setup * { animation:none!important; transition:none!important; }
`;
