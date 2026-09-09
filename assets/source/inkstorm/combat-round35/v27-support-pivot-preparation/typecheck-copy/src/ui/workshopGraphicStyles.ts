/** Decorative family stamps use original filled geometry, independent of part identity. */
const familyStampPaths = {
 engine:'M24 7h32l9 13h11v40H65L56 73H24L15 60H4V20h11Zm16 11a22 22 0 1 0 0 44 22 22 0 0 0 0-44Z',
 cooling:'M18 7h44l10 11v44L62 73H18L8 62V18Zm1 14v38h42V21Z',
 armour:'M40 5 7 18l5 28 11 15 17 14 17-14 11-15 5-28Zm0 12L19 25l4 20 9 11 8 7 8-7 9-11 4-20Z',
 steering:'M5 16h15v48H5Zm55 0h15v48H60ZM25 7h30v10H45v7H35v-7H25ZM25 57l15 10 15-10v9L40 77 25 66Z',
 gadget:'M23 14h34l10 11v30L57 66H23L13 55V25Zm3 8-5 6v24l5 6h28l5-6V28l-5-6Z',
} as const;
const familyStampCSS = Object.entries(familyStampPaths).map(([slot, path]) => {
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><path fill="black" fill-rule="evenodd" d="${path}"/></svg>`;
 return `.pod-hud__workshop[data-active-slot="${slot}"] { --equipment-family-stamp:url("data:image/svg+xml,${encodeURIComponent(svg)}"); }`;
}).join('\n');

/** Append after BROADCAST_HUD_CSS. All selectors are confined to the existing Build controls. */
export const WORKSHOP_GRAPHIC_CSS = /* css */ `
.pod-hud__workshop {
 --equipment-paper:#e4e8cf; --equipment-ink:#203e43; --equipment-rust:#aa4332;
 border:0; border-radius:0; box-shadow:0 0 0 2px #203e4366;
 grid-template-rows:76px minmax(0,1fr) auto; gap:14px;
}
.pod-hud__workshop-head { position:relative; border-bottom:2px solid var(--equipment-ink); padding-bottom:12px; }
.pod-hud__workshop-head>div { position:relative; padding-right:28px; background:var(--ui-paper); z-index:1; }
.pod-hud__workshop-head::after {
 content:''; position:absolute; left:206px; bottom:19px; width:78px; height:30px;
 background:repeating-linear-gradient(110deg,var(--equipment-rust) 0 19px,transparent 19px 25px);
}
.pod-hud__workshop-head span { font-size:10px; font-weight:700; letter-spacing:.13em; }
.pod-hud__workshop-head strong { font:400 48px/1 var(--ui-heading); letter-spacing:-.015em; }
.pod-hud__workshop-head strong::before { color:var(--equipment-rust); }
.pod-hud__workshop-head>button { position:relative; z-index:1; width:44px; height:44px; border:2px solid var(--equipment-ink); border-radius:0; font-size:28px; }
.pod-hud__workshop-slots,.pod-hud__workshop-parts,.pod-hud__workshop-summary { border-radius:12px; background:var(--equipment-ink); }
.pod-hud__workshop-slots { position:relative; isolation:isolate; padding:18px 12px; gap:10px; }
.pod-hud__workshop-slots::after {
 content:''; position:absolute; z-index:-1; inset:auto 12px 14px; height:180px;
 background:#bcd0b2; mask-image:var(--equipment-family-stamp); mask-repeat:no-repeat; mask-position:center; mask-size:contain;
 opacity:.08; pointer-events:none;
}
.pod-hud__workshop-parts {
 padding:15px; gap:8px; grid-template-columns:minmax(0,1fr);
 grid-template-rows:max-content max-content; grid-auto-rows:max-content; align-content:start;
}
.pod-hud__workshop-parts::before,.pod-hud__workshop-slots::before,.pod-hud__workshop-summary strong {
 color:#d1d8be; font:400 21px/1.12 var(--ui-heading); letter-spacing:0;
 border-bottom:2px solid #bed0b788; padding-bottom:11px; margin-bottom:4px;
}
.pod-hud__workshop-slots::before { content:'INSTALLED'; }
.pod-hud__workshop-parts::before { content:'AVAILABLE PARTS'; }
.pod-hud__workshop-slots,.pod-hud__workshop-parts { scroll-padding-top:54px; }
.pod-hud__workshop-parts::before,.pod-hud__workshop-slots::before {
 position:sticky; top:0; z-index:3; flex-shrink:0; background:var(--equipment-ink);
 box-shadow:0 -16px var(--equipment-ink); padding-top:3px;
}
.pod-hud__workshop .pod-hud__component-symbol { fill:currentColor; stroke:none; color:inherit; flex-shrink:0; }
.pod-hud__workshop .pod-hud__workshop-slot {
 min-height:86px; padding:12px 10px 12px 76px; border:0!important; border-radius:7px;
 background:#2b4a50!important; color:var(--equipment-paper); box-shadow:none;
}
.pod-hud__workshop .pod-hud__workshop-slot.is-selected {
 color:var(--equipment-ink); background:var(--equipment-paper)!important;
 box-shadow:inset 5px 0 var(--equipment-rust);
}
.pod-hud__workshop-slot>.pod-hud__component-symbol { width:52px; height:52px; left:12px; top:50%; transform:translateY(-50%); }
.pod-hud__workshop-slot>span { color:inherit; font-size:11px; font-weight:700; letter-spacing:.08em; }
.pod-hud__workshop-slot>strong { color:inherit; font:400 16px/1.2 var(--ui-heading); white-space:normal; overflow:visible; overflow-wrap:anywhere; }
.pod-hud__workshop .pod-hud__workshop-slot>small { display:none; color:inherit; font:400 12px/1.35 Inkstorm UI,sans-serif; white-space:normal; margin-top:5px; }
.pod-hud__workshop .pod-hud__workshop-slot:hover>small,.pod-hud__workshop .pod-hud__workshop-slot:focus-visible>small { display:block; }
/* Each real part follows one comparison rhythm; installation changes the marker, not the reading scale. */
.pod-hud__workshop .pod-hud__workshop-part,
.pod-hud__workshop .pod-hud__workshop-part.is-equipped {
 position:relative; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); grid-auto-rows:max-content;
 align-items:start; align-self:stretch; align-content:start;
 min-height:0; gap:8px 16px; padding:14px 12px!important;
 border:0!important; border-top:1px solid #bed0b754!important; border-left:3px solid transparent!important;
 border-radius:0; background:transparent!important; color:var(--equipment-paper); box-shadow:none;
}
.pod-hud__workshop .pod-hud__workshop-part.is-equipped {
 order:-1; border-top:0!important; border-left-color:var(--equipment-rust)!important;
}
.pod-hud__workshop-parts::before { order:-2; }
.pod-hud__workshop-part.is-equipped::after { content:none; }
.pod-hud__workshop-part>.pod-hud__component-symbol {
 position:absolute; top:14px; left:12px; width:48px; height:48px; margin:0; color:#c5d2b8;
}
.pod-hud__workshop-part>strong {
 grid-column:1/-1; grid-row:1; align-self:start; min-height:48px; padding-left:64px;
 display:flex; align-items:center; color:inherit; font:400 20px/1.2 var(--ui-heading);
 letter-spacing:0; overflow-wrap:anywhere;
}
.pod-hud__workshop-part>.is-benefit,.pod-hud__workshop-part>.is-tradeoff {
 grid-row:2; align-self:start; display:block; padding:0; border-radius:0;
 font:700 15px/1.4 Inkstorm UI,sans-serif; min-height:0; background:none;
}
.pod-hud__workshop-part>.is-benefit { grid-column:1; color:#d2e3b9; }
.pod-hud__workshop-part>.is-tradeoff { grid-column:2; color:#ffc1a0; }
.pod-hud__workshop-part>.is-benefit::before,.pod-hud__workshop-part>.is-tradeoff::before {
 display:block; margin-bottom:3px; font:700 10px/1.3 Inkstorm UI,sans-serif; letter-spacing:.08em;
}
.pod-hud__workshop-part>.is-benefit::before { content:'BENEFIT'; }
.pod-hud__workshop-part>.is-tradeoff::before { content:'TRADEOFF'; }
/* Every description stays in normal flow; detailed deltas keep the existing focus/pointer disclosure. */
.pod-hud__workshop .pod-hud__workshop-part>p,
.pod-hud__workshop .pod-hud__workshop-part.is-equipped>p {
 display:block; grid-column:1/-1; grid-row:3; margin:0;
 height:auto; max-height:none; overflow:visible; white-space:normal; text-overflow:clip;
 color:#d1dbcd; font:400 14px/1.4 Inkstorm UI,sans-serif; text-transform:none;
}
.pod-hud__workshop-part>.pod-hud__part-comparison {
 grid-column:1/-1; grid-row:4; color:#e0e7d8; font:400 13px/1.4 Inkstorm UI,sans-serif; white-space:normal;
}
.pod-hud__workshop-part>.pod-hud__equip-action {
 grid-column:1/-1; grid-row:5; align-self:start; justify-self:end;
 display:flex; align-items:center; justify-content:flex-end; min-height:44px;
 margin:0; padding:8px 0; border:0; border-radius:0; background:none; color:var(--equipment-paper);
 font:700 12px/1.3 Inkstorm UI,sans-serif; letter-spacing:.025em;
}
.pod-hud__workshop-part.is-equipped>.pod-hud__equip-action { color:#bed0b7; }
.pod-hud__workshop .pod-hud__workshop-part:hover:not(.is-equipped),.pod-hud__workshop .pod-hud__workshop-part:focus-visible:not(.is-equipped) { background:#37575b!important; box-shadow:inset 3px 0 #bed0b7; }
.pod-hud__workshop button:focus-visible,.pod-hud__workshop summary:focus-visible { outline:3px solid #eeab69; outline-offset:-3px; }
/* Ten signed totals read as three systems, with labels, values and zero-centered bars aligned. */
.pod-hud__workshop-summary { display:flex; flex-direction:column; gap:20px; padding:18px 15px; }
.pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { flex:0 0 auto; padding:0; overflow:visible; }
.pod-hud__workshop-effective ul { grid-template-columns:minmax(0,1fr); gap:0; margin-top:14px; }
.pod-hud__workshop-summary .pod-hud__workshop-effective li {
 grid-template-columns:minmax(0,1fr) auto 64px; align-items:center; gap:0 10px;
 padding:5px 0; border:0; white-space:normal; overflow:visible; font:400 14px/1.25 Inkstorm UI,sans-serif;
}
.pod-hud__workshop-effective>strong>small { display:block; margin-top:7px; font:700 11px/1.4 Inkstorm UI,sans-serif; letter-spacing:.01em; color:#c7d5c7; }
.pod-hud__workshop-effective li>.pod-hud__total-group {
 grid-column:1/-1; display:block; margin:12px 0 8px; padding-top:10px; border-top:1px solid #bed0b754;
 color:#d1d8be; font:400 15px/1.2 var(--ui-heading); letter-spacing:.02em;
}
.pod-hud__workshop-effective li:first-child>.pod-hud__total-group { border-top:0; padding-top:0; margin-top:0; }
.pod-hud__workshop-effective li>.pod-hud__total-label { grid-column:1; color:#c7d5c7; }
.pod-hud__workshop-summary .pod-hud__workshop-effective li>b {
 grid-column:2; color:var(--equipment-paper); font:400 19px/1.1 var(--ui-heading); letter-spacing:0;
 font-variant-numeric:tabular-nums; text-align:right;
}
.pod-hud__workshop-summary .pod-hud__workshop-effective li.is-negative>b { color:#ffc1a0; }
.pod-hud__workshop-effective .pod-hud__build-meter { grid-column:3; display:block; margin:0; height:5px; }
.pod-hud__workshop-effective .pod-hud__build-meter>i { height:5px; }
.pod-hud__workshop-summary li { white-space:normal; overflow:visible; text-overflow:clip; font-size:14px; line-height:1.4; }
.pod-hud__workshop-contributors>summary { padding:0; color:#c7d5c7; font:700 14px/1.3 Inkstorm UI,sans-serif; cursor:pointer; }
.pod-hud__workshop-contributors[open]>strong { margin-top:14px; font-size:16px; }
.pod-hud__workshop-footer { border-top:1px solid #203e4366; }
.pod-hud__workshop-footer>span { font-size:12px; color:var(--equipment-ink); }
.pod-hud__workshop-footer>button { min-height:44px; border-radius:0; font-size:14px; }
@media (min-width:761px) {
 .pod-hud__workshop { top:0; height:100%; }
}
@media (min-width:1101px) {
 .pod-hud__workshop .pod-hud__workshop-slot { min-height:86px; padding-top:10px; padding-bottom:10px; }
}
/* Wide comparison shares fixed benefit/tradeoff columns across all four real choices. */
@media (min-width:1280px) {
 .pod-hud__workshop .pod-hud__workshop-part,.pod-hud__workshop .pod-hud__workshop-part.is-equipped {
  grid-template-columns:48px minmax(0,1fr) minmax(0,1fr) 84px; gap:8px 14px;
 }
 .pod-hud__workshop-part>.pod-hud__component-symbol {
  position:static; grid-column:1; grid-row:1/3; align-self:start; justify-self:center;
 }
 .pod-hud__workshop-part>strong { grid-column:2/4; grid-row:1; min-height:0; padding:0; }
 .pod-hud__workshop-part>.is-benefit { grid-column:2; }
 .pod-hud__workshop-part>.is-tradeoff { grid-column:3; }
 .pod-hud__workshop-part>.pod-hud__equip-action { grid-column:4; grid-row:1/3; align-self:start; }
 .pod-hud__workshop .pod-hud__workshop-part>p,.pod-hud__workshop .pod-hud__workshop-part.is-equipped>p,
 .pod-hud__workshop-part>.pod-hud__part-comparison { grid-column:2/-1; }
}
@media (max-width:1100px) {
 .pod-hud__workshop { grid-template-rows:auto auto auto auto; }
 .pod-hud__workshop-summary { display:grid; grid-template-columns:1fr 1fr; align-items:start; gap:18px; }
 .pod-hud__workshop-summary>.pod-hud__workshop-effective { grid-row:1/3; }
 .pod-hud__workshop-summary>.pod-hud__workshop-contributors { grid-column:2; grid-row:2; }
 .pod-hud__workshop-effective ul { grid-template-columns:minmax(0,1fr); }
 .pod-hud__workshop-slot>strong { font-size:15px; }
 .pod-hud__workshop-slots::after { display:none; }
}
@media (min-width:761px) and (max-width:930px) {
 .pod-hud__workshop-parts { grid-template-columns:minmax(0,1fr); }
}
@media (max-width:760px) {
 .pod-hud__workshop-head { min-height:76px; }
 .pod-hud__workshop-head strong { font-size:42px; }
 .pod-hud__workshop-head::after { left:177px; width:45px; bottom:21px; height:24px; }
 .pod-hud__workshop-slots { overflow-x:auto; overflow-y:visible; scroll-padding:12px; }
 .pod-hud__workshop .pod-hud__workshop-slot { flex:0 0 230px; min-height:92px; }
 .pod-hud__workshop-parts { grid-template-columns:minmax(0,1fr); padding:14px; }
 .pod-hud__workshop .pod-hud__workshop-part,.pod-hud__workshop .pod-hud__workshop-part.is-equipped { gap:8px 12px; }
 .pod-hud__workshop-summary { display:flex; flex-direction:column; gap:20px; }
 .pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { width:100%; }
 .pod-hud__workshop-footer { flex-wrap:wrap; gap:10px; }
}
@media (prefers-contrast:more) {
 .pod-hud__workshop .pod-hud__workshop-part>p,.pod-hud__workshop .pod-hud__workshop-part.is-equipped>p,
 .pod-hud__workshop-effective li>.pod-hud__total-label { color:#f2f2e4; }
}
/* Entry and equip feedback settle once; all descriptions remain in normal flow. */
.pod-hud__workshop.is-visible .pod-hud__workshop-slots { animation:equipment-panel-in 280ms var(--ui-settle) both; }
.pod-hud__workshop.is-visible .pod-hud__workshop-parts { animation:equipment-panel-in 320ms 40ms var(--ui-settle) both; }
.pod-hud__workshop.is-visible .pod-hud__workshop-summary { animation:equipment-panel-in 320ms 80ms var(--ui-settle) both; }
.pod-hud__workshop .pod-hud__workshop-slot { transition:background-color 220ms var(--ui-settle),color 220ms var(--ui-settle),box-shadow 220ms var(--ui-settle); }
.pod-hud__workshop .pod-hud__workshop-part { transition:background-color 220ms var(--ui-settle),box-shadow 220ms var(--ui-settle); }
.pod-hud__workshop-part>.pod-hud__equip-action { transition:background-color 220ms var(--ui-settle),color 220ms var(--ui-settle); }
.pod-hud__workshop .pod-hud__workshop-part.is-equipped { animation:equipment-seated 320ms var(--ui-settle) both; }
@keyframes equipment-panel-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
@keyframes equipment-seated { from { opacity:.45; transform:translateX(-10px); } to { opacity:1; transform:translateX(0); } }
.pod-hud.is-reduced-motion .pod-hud__workshop *,.pod-hud.is-reduced-motion .pod-hud__workshop *::before,.pod-hud.is-reduced-motion .pod-hud__workshop *::after { animation:none!important; transition:none!important; }
@media (prefers-reduced-motion:reduce) { .pod-hud__workshop *,.pod-hud__workshop *::before,.pod-hud__workshop *::after { animation:none!important; transition:none!important; } }
${familyStampCSS}
`;
