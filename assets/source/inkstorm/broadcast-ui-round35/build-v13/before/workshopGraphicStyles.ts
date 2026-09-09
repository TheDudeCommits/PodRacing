/** Append after BROADCAST_HUD_CSS. All selectors are confined to the existing Build controls. */
export const WORKSHOP_GRAPHIC_CSS = /* css */ `
.pod-hud__workshop {
 --equipment-paper:#e4e8cf; --equipment-ink:#203e43; --equipment-rust:#aa4332;
 border:0; border-radius:0; box-shadow:0 0 0 2px #203e4366;
 grid-template-rows:76px minmax(0,1fr) auto; gap:14px;
}
.pod-hud__workshop-head { position:relative; border-bottom:4px solid var(--equipment-ink); padding-bottom:12px; }
.pod-hud__workshop-head>div { position:relative; padding-right:28px; background:var(--ui-paper); z-index:1; }
.pod-hud__workshop-head::after { content:''; position:absolute; left:195px; right:68px; bottom:15px; height:15px; background:repeating-linear-gradient(110deg,var(--equipment-rust) 0 20px,transparent 20px 25px); opacity:.85; }
.pod-hud__workshop-head span { font-size:10px; font-weight:700; letter-spacing:.13em; }
.pod-hud__workshop-head strong { font:400 48px/.98 Inkstorm Display,sans-serif; letter-spacing:-.045em; }
.pod-hud__workshop-head strong::before { color:var(--equipment-ink); }
.pod-hud__workshop-head>button { position:relative; z-index:1; width:44px; height:44px; border:2px solid var(--equipment-ink); border-radius:0; font-size:28px; }
.pod-hud__workshop-slots,.pod-hud__workshop-parts,.pod-hud__workshop-summary { border-radius:2px; background:var(--equipment-ink); }
.pod-hud__workshop-slots { padding:15px 12px; gap:8px; }
.pod-hud__workshop-parts { padding:15px; gap:12px; }
.pod-hud__workshop-parts::before,.pod-hud__workshop-slots::before,.pod-hud__workshop-summary strong {
 color:var(--equipment-paper); font:700 18px/1.1 Inkstorm UI,sans-serif; letter-spacing:.015em;
 border-bottom:4px solid #bed0b7; padding-bottom:11px; margin-bottom:4px;
}
.pod-hud__workshop-slots,.pod-hud__workshop-parts { scroll-padding-top:48px; }
.pod-hud__workshop-parts::before,.pod-hud__workshop-slots::before {
 position:sticky; top:0; z-index:3; flex-shrink:0; background:var(--equipment-ink);
 box-shadow:0 -16px var(--equipment-ink); padding-top:3px;
}
.pod-hud__workshop .pod-hud__component-symbol { fill:currentColor; stroke:none; color:inherit; flex-shrink:0; }
.pod-hud__workshop .pod-hud__workshop-slot {
 min-height:84px; padding:12px 10px 12px 60px; border:0!important; border-radius:0;
 background:#2b4a50!important; color:var(--equipment-paper); box-shadow:inset 0 -1px #bed0b744;
}
.pod-hud__workshop .pod-hud__workshop-slot.is-selected {
 color:var(--equipment-ink); background:var(--equipment-paper)!important;
 box-shadow:inset 5px 0 var(--equipment-rust);
}
.pod-hud__workshop-slot>.pod-hud__component-symbol { width:42px; height:42px; left:10px; top:18px; }
.pod-hud__workshop-slot>span { color:inherit; font-size:11px; font-weight:700; letter-spacing:.12em; }
.pod-hud__workshop-slot>strong { color:inherit; font:700 16px/1.2 Inkstorm UI,sans-serif; white-space:normal; overflow:visible; overflow-wrap:anywhere; }
.pod-hud__workshop-slot>small { color:inherit; font:400 13px/1.35 Inkstorm UI,sans-serif; white-space:normal; margin-top:4px; }
.pod-hud__workshop .pod-hud__workshop-part {
 grid-template-columns:54px minmax(0,1fr); min-height:190px; gap:9px 12px; padding:14px!important;
 border:0!important; border-top:3px solid #91ada0!important; border-radius:0;
 background:#2b4a50!important; color:var(--equipment-paper); box-shadow:none;
}
.pod-hud__workshop-part>.pod-hud__component-symbol { width:54px; height:54px; }
.pod-hud__workshop-part>strong { color:inherit; font:700 20px/1.05 Inkstorm UI,sans-serif; letter-spacing:-.015em; overflow-wrap:anywhere; }
.pod-hud__workshop-part>p { color:#e2e6d6; font:400 14px/1.4 Inkstorm UI,sans-serif; }
.pod-hud__workshop-part>.is-benefit,.pod-hud__workshop-part>.is-tradeoff { font:700 14px/1.35 Inkstorm UI,sans-serif; }
.pod-hud__workshop-part>.is-benefit { color:#d2e3b9; }
.pod-hud__workshop-part>.is-tradeoff { color:#ffc1a0; }
.pod-hud__workshop-part>.pod-hud__equip-action {
 display:block; margin-top:4px; padding-top:9px; border-top:1px solid #bed0b755;
 color:var(--equipment-paper); font:700 13px/1.25 Inkstorm UI,sans-serif; letter-spacing:.07em;
}
/* The installed component has one full-width equipment plate; alternatives stay subordinate. */
.pod-hud__workshop .pod-hud__workshop-part.is-equipped {
 grid-column:1/-1; grid-template-columns:90px minmax(0,1fr); min-height:0;
 color:var(--equipment-ink); background:var(--equipment-paper)!important;
 border-top:6px solid var(--equipment-rust)!important; padding:16px!important; box-shadow:none;
}
.pod-hud__workshop-part.is-equipped::after { content:none; }
.pod-hud__workshop-part.is-equipped>.pod-hud__component-symbol { width:86px; height:86px; grid-row:1/5; align-self:start; }
.pod-hud__workshop-part.is-equipped>strong { font:700 26px/1.05 Inkstorm UI,sans-serif; }
.pod-hud__workshop-part.is-equipped>p,.pod-hud__workshop-part.is-equipped>span { grid-column:2; color:var(--equipment-ink); }
.pod-hud__workshop-part.is-equipped>.is-tradeoff { color:#803221; }
.pod-hud__workshop-part.is-equipped>.pod-hud__equip-action { color:var(--equipment-ink); border-top:2px solid #203e4355; }
.pod-hud__workshop-part .pod-hud__part-comparison { font-size:13px; line-height:1.4; white-space:normal; }
.pod-hud__workshop-part.is-equipped .pod-hud__part-comparison { color:var(--equipment-ink); }
.pod-hud__workshop .pod-hud__workshop-part:hover:not(.is-equipped) { background:#37575b!important; border-top-color:var(--equipment-paper)!important; }
.pod-hud__workshop button:focus-visible,.pod-hud__workshop summary:focus-visible { outline:3px solid #eeab69; outline-offset:-3px; }
/* Signed values and center-zero bars use the existing measured build deltas. */
.pod-hud__workshop-summary { display:flex; flex-direction:column; gap:16px; padding:15px; }
.pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { flex:0 0 auto; padding:0; overflow:visible; }
.pod-hud__workshop-effective ul { grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 15px; margin-top:6px; }
.pod-hud__workshop-effective li {
 grid-template-columns:minmax(0,1fr); gap:2px; padding:6px 0; border-bottom:1px solid #bed0b744;
 white-space:normal; overflow:visible; font:700 13px/1.2 Inkstorm UI,sans-serif;
}
.pod-hud__workshop-effective li>span { color:#d4dfcf; }
.pod-hud__workshop-effective li>b { color:var(--equipment-paper); font:400 25px/1 Inkstorm Instrument,sans-serif; }
.pod-hud__workshop-effective li.is-negative>b { color:#ffc1a0; }
.pod-hud__workshop-effective .pod-hud__build-meter { display:block; margin-top:3px; height:4px; }
.pod-hud__workshop-summary li { white-space:normal; overflow:visible; text-overflow:clip; line-height:1.4; }
.pod-hud__workshop-contributors>summary { padding:3px 0; color:#d8e2cf; font:700 14px/1.3 Inkstorm UI,sans-serif; cursor:pointer; }
.pod-hud__workshop-contributors[open]>strong { margin-top:14px; font-size:15px; border-bottom-width:1px; }
.pod-hud__workshop-footer { border-top:2px solid var(--equipment-ink); }
.pod-hud__workshop-footer>span { font-size:13px; color:var(--equipment-ink); }
.pod-hud__workshop-footer>button { min-height:44px; border-radius:0; font-size:14px; }
@media (min-width:1101px) {
 .pod-hud__workshop .pod-hud__workshop-slot { min-height:70px; padding:9px 10px 9px 55px; }
 .pod-hud__workshop-slot>.pod-hud__component-symbol { width:36px; height:36px; left:10px; top:16px; }
 .pod-hud__workshop-slot>small { font-size:12px; line-height:1.3; }
 .pod-hud__workshop-summary { gap:12px; }
 .pod-hud__workshop-summary .pod-hud__workshop-effective li { gap:2px; padding:4px 0; line-height:1.2; }
 .pod-hud__workshop-effective li>b { font-size:23px; }
 .pod-hud__workshop-effective .pod-hud__build-meter { height:3px; margin-top:0; }
 .pod-hud__workshop-effective .pod-hud__build-meter>i { height:3px; }
}
/* Every current bay has four parts. Auto-placement still wraps any future extra choices. */
@media (min-width:1280px) {
 .pod-hud__workshop-parts { grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
 .pod-hud__workshop-parts::before { order:-2; }
 .pod-hud__workshop .pod-hud__workshop-part {
  grid-template-columns:36px minmax(0,1fr); min-height:0; gap:7px 8px; padding:12px!important;
 }
 .pod-hud__workshop-part>.pod-hud__component-symbol { width:36px; height:36px; }
 .pod-hud__workshop-part>strong { font-size:18px; line-height:1.1; }
 .pod-hud__workshop-part>.is-benefit,.pod-hud__workshop-part>.is-tradeoff { font-size:13px; line-height:1.3; }
 .pod-hud__workshop-part>.pod-hud__equip-action { margin-top:0; padding-top:7px; font-size:12px; }
 .pod-hud__workshop .pod-hud__workshop-part.is-equipped {
  order:-1; grid-template-columns:76px minmax(0,1fr); gap:6px 14px; padding:13px 15px!important;
 }
 .pod-hud__workshop-part.is-equipped>.pod-hud__component-symbol { width:72px; height:72px; }
 .pod-hud__workshop-part.is-equipped>strong { font-size:25px; }
 .pod-hud__workshop-part.is-equipped>p { font-size:14px; line-height:1.35; }
 .pod-hud__workshop-part.is-equipped>.is-benefit,.pod-hud__workshop-part.is-equipped>.is-tradeoff { font-size:14px; }
}
@media (max-width:1100px) {
 .pod-hud__workshop { grid-template-rows:auto auto auto auto; }
 .pod-hud__workshop-summary { display:grid; grid-template-columns:1fr 1fr; align-items:start; gap:18px; }
 .pod-hud__workshop-summary>.pod-hud__workshop-effective { grid-row:1/3; }
 .pod-hud__workshop-summary>.pod-hud__workshop-contributors { grid-column:2; grid-row:2; }
 .pod-hud__workshop-effective ul { grid-template-columns:repeat(2,minmax(0,1fr)); }
 .pod-hud__workshop-slot>strong { font-size:15px; }
}
@media (min-width:761px) and (max-width:930px) {
 .pod-hud__workshop-parts { grid-template-columns:minmax(0,1fr); }
}
@media (max-width:760px) {
 .pod-hud__workshop-head { min-height:76px; }
 .pod-hud__workshop-head strong { font-size:42px; }
 .pod-hud__workshop-head::after { left:170px; right:60px; height:12px; }
 .pod-hud__workshop-slots { overflow-x:auto; overflow-y:visible; scroll-padding:12px; }
 .pod-hud__workshop .pod-hud__workshop-slot { flex:0 0 220px; min-height:94px; }
 .pod-hud__workshop-parts { grid-template-columns:minmax(0,1fr); padding:14px; }
 .pod-hud__workshop .pod-hud__workshop-part.is-equipped { grid-template-columns:60px minmax(0,1fr); padding:14px!important; }
 .pod-hud__workshop-part.is-equipped>.pod-hud__component-symbol { width:60px; height:60px; grid-row:1; }
 .pod-hud__workshop-part.is-equipped>strong { font-size:23px; }
 .pod-hud__workshop-part.is-equipped>p,.pod-hud__workshop-part.is-equipped>span { grid-column:1/-1; }
 .pod-hud__workshop-summary { display:flex; flex-direction:column; gap:20px; }
 .pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { width:100%; }
 .pod-hud__workshop-footer { flex-wrap:wrap; gap:10px; }
}
@media (prefers-contrast:more) {
 .pod-hud__workshop-part>p,.pod-hud__workshop-effective li>span { color:#f2f2e4; }
 .pod-hud__workshop-part.is-equipped>p { color:var(--equipment-ink); }
}
`;
