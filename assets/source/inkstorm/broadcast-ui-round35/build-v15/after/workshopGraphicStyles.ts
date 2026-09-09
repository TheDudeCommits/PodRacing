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
.pod-hud__workshop-head strong { font:400 48px/.98 Inkstorm Display,sans-serif; letter-spacing:-.045em; }
.pod-hud__workshop-head strong::before { color:var(--equipment-rust); }
.pod-hud__workshop-head>button { position:relative; z-index:1; width:44px; height:44px; border:2px solid var(--equipment-ink); border-radius:0; font-size:28px; }
.pod-hud__workshop-slots,.pod-hud__workshop-parts,.pod-hud__workshop-summary { border-radius:12px; background:var(--equipment-ink); }
.pod-hud__workshop-slots { position:relative; isolation:isolate; padding:18px 12px; gap:10px; }
.pod-hud__workshop-slots::after {
 content:''; position:absolute; z-index:-1; inset:auto 12px 14px; height:180px;
 background:#bcd0b2; mask-image:var(--equipment-family-stamp); mask-repeat:no-repeat; mask-position:center; mask-size:contain;
 opacity:.08; pointer-events:none;
}
.pod-hud__workshop-parts { padding:15px; gap:12px; }
.pod-hud__workshop-parts::before,.pod-hud__workshop-slots::before,.pod-hud__workshop-summary strong {
 color:#c1d0b6; font:700 20px/1.08 Inkstorm UI,sans-serif; letter-spacing:-.015em;
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
.pod-hud__workshop-slot>strong { color:inherit; font:700 17px/1.15 Inkstorm UI,sans-serif; white-space:normal; overflow:visible; overflow-wrap:anywhere; }
.pod-hud__workshop .pod-hud__workshop-slot>small { display:none; color:inherit; font:400 12px/1.35 Inkstorm UI,sans-serif; white-space:normal; margin-top:5px; }
.pod-hud__workshop .pod-hud__workshop-slot:hover>small,.pod-hud__workshop .pod-hud__workshop-slot:focus-visible>small { display:block; }
/* All alternatives in a row stretch together; expanded descriptions stay in normal flow. */
.pod-hud__workshop .pod-hud__workshop-part {
 display:flex; flex-direction:column; align-items:flex-start; align-self:stretch;
 min-height:340px; gap:8px; padding:16px!important;
 border:0!important; border-radius:9px; background:#2b4a50!important;
 color:var(--equipment-paper); box-shadow:none;
}
.pod-hud__workshop-part>.pod-hud__component-symbol { width:76px; height:76px; align-self:flex-start; margin-bottom:0; }
.pod-hud__workshop-part>strong { color:inherit; font:700 clamp(20px,1.65vw,24px)/1.06 Inkstorm UI,sans-serif; letter-spacing:-.025em; overflow-wrap:anywhere; min-height:2.12em; align-self:stretch; }
.pod-hud__workshop-part>p { order:4; color:#e2e6d6; font:400 15px/1.4 Inkstorm UI,sans-serif; }
.pod-hud__workshop-part>.is-benefit,.pod-hud__workshop-part>.is-tradeoff {
 align-self:stretch; display:flex; align-items:center; padding:7px 9px; border-radius:5px;
 font:700 15px/1.35 Inkstorm UI,sans-serif; min-height:3.15em;
}
.pod-hud__workshop-part>.is-benefit { color:#d2e3b9; background:#bfd5b00d; }
.pod-hud__workshop-part>.is-tradeoff { color:#ffc1a0; background:#ffc1a00a; }
.pod-hud__workshop-part>.pod-hud__equip-action {
 order:6; align-self:stretch; display:flex; align-items:center; justify-content:space-between;
 min-height:42px; margin-top:auto; padding:11px 12px; border:0; border-radius:5px;
 background:var(--equipment-paper); color:var(--equipment-ink);
 font:700 14px/1.2 Inkstorm UI,sans-serif; letter-spacing:.045em;
}
.pod-hud__workshop-part .pod-hud__part-comparison { order:5; font-size:14px; line-height:1.4; white-space:normal; }
/* The installed component is a single large silhouette and its actual performance trade. */
.pod-hud__workshop .pod-hud__workshop-part.is-equipped {
 display:grid; grid-column:1/-1; grid-template-columns:132px minmax(0,1fr);
 min-height:164px; gap:8px 18px; align-content:center;
 color:var(--equipment-ink); background:var(--equipment-paper)!important;
 border-left:6px solid var(--equipment-rust)!important; padding:15px!important; box-shadow:none;
}
.pod-hud__workshop-part.is-equipped::after { content:none; }
.pod-hud__workshop-part.is-equipped>.pod-hud__component-symbol { width:128px; height:128px; grid-column:1; grid-row:1/5; align-self:center; margin:0; }
.pod-hud__workshop-part.is-equipped>strong { grid-column:2; grid-row:1; min-height:0; font:700 29px/1.05 Inkstorm UI,sans-serif; letter-spacing:-.025em; align-self:start; }
.pod-hud__workshop-part.is-equipped>p,.pod-hud__workshop-part.is-equipped>span { grid-column:2; color:var(--equipment-ink); }
.pod-hud__workshop-part.is-equipped>.is-benefit { grid-row:2; min-height:0; padding:0; background:none; font-size:17px; }
.pod-hud__workshop-part.is-equipped>.is-tradeoff { grid-row:3; min-height:0; padding:0; background:none; color:#803221; font-size:17px; }
.pod-hud__workshop-part.is-equipped>.pod-hud__equip-action { display:block; grid-column:2; grid-row:4; min-height:0; align-self:start; margin:0; padding:5px 0 0; color:var(--equipment-rust); background:none; border:0; font-size:13px; }
.pod-hud__workshop .pod-hud__workshop-part.is-equipped>p { display:block; grid-column:1/-1; grid-row:5; font-size:15px; text-transform:none; }
.pod-hud__workshop .pod-hud__workshop-part.is-equipped:hover>p,.pod-hud__workshop .pod-hud__workshop-part.is-equipped:focus-visible>p { display:block; }
.pod-hud__workshop-part.is-equipped .pod-hud__part-comparison { color:var(--equipment-ink); }
.pod-hud__workshop .pod-hud__workshop-part:hover:not(.is-equipped) { background:#37575b!important; box-shadow:inset 0 0 0 2px #bed0b7; }
.pod-hud__workshop button:focus-visible,.pod-hud__workshop summary:focus-visible { outline:3px solid #eeab69; outline-offset:-3px; }
/* Signed readings and thick center-zero bars retain the measured build deltas. */
.pod-hud__workshop-summary { display:flex; flex-direction:column; gap:20px; padding:18px 15px; }
.pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { flex:0 0 auto; padding:0; overflow:visible; }
.pod-hud__workshop-effective ul { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px 16px; margin-top:14px; }
.pod-hud__workshop-summary .pod-hud__workshop-effective li {
 grid-template-columns:minmax(0,1fr); gap:2px; padding:0; border:0;
 white-space:normal; overflow:visible; font:700 13px/1.2 Inkstorm UI,sans-serif;
}
.pod-hud__workshop-effective>strong>small { display:block; margin-top:7px; font:700 11px/1.4 Inkstorm UI,sans-serif; letter-spacing:.01em; color:#c7d5c7; }
.pod-hud__workshop-effective li>span { color:#c7d5c7; }
.pod-hud__workshop-summary .pod-hud__workshop-effective li>b { color:var(--equipment-paper); font:700 32px/.95 Inkstorm UI,sans-serif; letter-spacing:-.055em; font-variant-numeric:tabular-nums; }
.pod-hud__workshop-summary .pod-hud__workshop-effective li.is-negative>b { color:#ffc1a0; }
.pod-hud__workshop-effective .pod-hud__build-meter { display:block; margin-top:3px; height:8px; }
.pod-hud__workshop-effective .pod-hud__build-meter>i { height:8px; }
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
.pod-hud__workshop-summary .pod-hud__workshop-effective li:nth-child(n+7)>b { font-size:24px; }
/* Every current bay has four parts. Auto-placement still wraps future extra choices. */
@media (min-width:1280px) {
 .pod-hud__workshop-parts {
  grid-template-columns:repeat(3,minmax(0,1fr));
  grid-template-rows:max-content max-content minmax(max-content,1fr); align-content:stretch; gap:12px;
 }
 .pod-hud__workshop-parts::before { order:-2; }
 .pod-hud__workshop .pod-hud__workshop-part { padding:14px!important; }
 .pod-hud__workshop .pod-hud__workshop-part.is-equipped { order:-1; padding:15px!important; }
}
@media (max-width:1100px) {
 .pod-hud__workshop { grid-template-rows:auto auto auto auto; }
 .pod-hud__workshop-summary { display:grid; grid-template-columns:1fr 1fr; align-items:start; gap:18px; }
 .pod-hud__workshop-summary>.pod-hud__workshop-effective { grid-row:1/3; }
 .pod-hud__workshop-summary>.pod-hud__workshop-contributors { grid-column:2; grid-row:2; }
 .pod-hud__workshop-effective ul { grid-template-columns:repeat(2,minmax(0,1fr)); }
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
 .pod-hud__workshop .pod-hud__workshop-part { min-height:0; gap:12px; }
 .pod-hud__workshop-part>strong { min-height:0; }
 .pod-hud__workshop-part>.is-benefit,.pod-hud__workshop-part>.is-tradeoff { min-height:0; }
 .pod-hud__workshop .pod-hud__workshop-part.is-equipped { grid-template-columns:76px minmax(0,1fr); gap:10px 14px; padding:14px!important; }
 .pod-hud__workshop-part.is-equipped>.pod-hud__component-symbol { width:76px; height:76px; grid-row:1; }
 .pod-hud__workshop-part.is-equipped>strong { font-size:23px; align-self:center; }
 .pod-hud__workshop-part.is-equipped>span,.pod-hud__workshop-part.is-equipped>.pod-hud__equip-action { grid-column:1/-1; }
 .pod-hud__workshop-summary { display:flex; flex-direction:column; gap:20px; }
 .pod-hud__workshop-summary>div,.pod-hud__workshop-summary>details { width:100%; }
 .pod-hud__workshop-footer { flex-wrap:wrap; gap:10px; }
}
@media (prefers-contrast:more) {
 .pod-hud__workshop-part>p,.pod-hud__workshop-effective li>span { color:#f2f2e4; }
.pod-hud__workshop-part.is-equipped>p { color:var(--equipment-ink); }
}
${familyStampCSS}
`;
