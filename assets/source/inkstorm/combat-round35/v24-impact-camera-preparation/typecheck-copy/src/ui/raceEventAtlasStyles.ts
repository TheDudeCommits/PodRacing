/** Original orbital-navigation artwork; selection and calendar order remain simulation-owned. */
export const RACE_EVENT_ATLAS_CSS = /* css */ `
.race-event-atlas {
 --atlas-paper:#e8e7dc; --atlas-petrol:#244249; --atlas-red:#b54a36;
 --atlas-ink:#171e23; --atlas-amber:#f1ce82;
 position:absolute; inset:0; z-index:90; display:flex; flex-direction:column;
 min-width:0; min-height:0; overflow:auto; isolation:isolate; pointer-events:auto;
 color:var(--atlas-ink); background:var(--atlas-paper); text-transform:none;
 font-family:Inkstorm UI,"Avenir Next Condensed",sans-serif; overscroll-behavior:contain;
}
.race-event-atlas[hidden] { display:none!important; }
.race-event-atlas *,.race-event-atlas *::before,.race-event-atlas *::after { box-sizing:border-box; }
.race-event-atlas button { font:inherit; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.race-event-atlas button:focus-visible { outline:3px solid var(--atlas-red); outline-offset:6px; }
.race-event-atlas button:disabled { cursor:not-allowed; opacity:.45; }
.race-event-atlas__header { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:clamp(20px,3vw,44px) clamp(22px,4vw,64px) 16px; }
.race-event-atlas__heading { margin:0; font:400 clamp(34px,3.7vw,54px)/1 var(--ui-heading); letter-spacing:-.015em; text-transform:uppercase; }
.race-event-atlas__heading::before { content:'/'; color:var(--atlas-red); margin-right:8px; }
.race-event-atlas__heading::after { content:''; display:inline-block; width:76px; height:26px; margin-left:19px; background:repeating-linear-gradient(110deg,#b54a36 0 13px,transparent 13px 18px); clip-path:polygon(8% 0,100% 0,92% 100%,0 100%); }
.race-event-atlas__edition { display:block; margin:9px 0 0 21px; font-size:12px; letter-spacing:.1em; font-weight:700; text-transform:uppercase; }
.race-event-atlas__close { border:1px solid currentColor; border-radius:0; background:transparent; color:var(--atlas-ink); min-height:44px; padding:10px 16px; font-size:13px!important; font-weight:800!important; letter-spacing:.08em; text-transform:uppercase; }
.race-event-atlas__band { position:relative; height:32px; min-height:32px; margin-bottom:12px; background:linear-gradient(90deg,#244249 0 70%,#41666c 70%); }
.race-event-atlas__band::after { content:''; position:absolute; top:39px; left:0; right:0; height:8px; background:#a7b6aa; border-bottom:2px solid var(--atlas-petrol); }
.race-event-atlas__viewport { flex:0 0 auto; min-height:290px; overflow:auto; overscroll-behavior:contain; scrollbar-color:var(--atlas-petrol) transparent; }
.race-event-atlas__map { position:relative; width:100%; min-width:1000px; height:clamp(420px,calc(100dvh - 340px),640px); }
/* Oversized orbital sweeps crop at the drawing edges; event footprints remain independent. */
.race-event-atlas__orbits { width:100%; height:100%; position:absolute; inset:0; overflow:hidden; fill:none; stroke:var(--atlas-petrol); stroke-width:1; opacity:1; pointer-events:none; }
.race-event-atlas__orbits .atlas-orbit-main { stroke-width:3; opacity:.9; }
.race-event-atlas__orbits .atlas-orbit-secondary { stroke-width:2; opacity:.65; }
.race-event-atlas__orbits .atlas-orbit-accent { stroke:var(--atlas-red); stroke-width:2; opacity:.7; }
.race-event-atlas .race-event-atlas__event { position:absolute; left:var(--atlas-x); top:var(--atlas-y); width:128px; min-height:144px; padding:0; border:0; border-radius:0; color:var(--atlas-ink); background:none; transform:translate(-50%,-50%); text-align:center; overflow:visible; transition:left 420ms var(--ui-settle),top 420ms var(--ui-settle); }
.race-event-atlas__disc { position:relative; display:block; margin:0 auto; width:76px; height:76px; border-radius:50%; border:1px solid #17262b; background:radial-gradient(ellipse at 28% 20%,#fff2d688,transparent 55%),radial-gradient(ellipse at 35% 32%,var(--atlas-tone),var(--atlas-petrol) 84%,var(--atlas-ink)); box-shadow:inset -12px -12px 16px #101e2888,0 5px 8px #171e2317; transition:transform 380ms var(--ui-settle),box-shadow 380ms var(--ui-settle); }
.race-event-atlas__surface { position:absolute; inset:0; width:100%; height:100%; border-radius:50%; opacity:.9; mix-blend-mode:soft-light; }
.race-event-atlas__number { display:none; }
.race-event-atlas__name { display:block; position:relative; margin:12px 0 0; padding:3px 5px; background:var(--atlas-paper); white-space:normal; overflow-wrap:anywhere; transition:transform 380ms var(--ui-settle),opacity 220ms ease; }
.race-event-atlas__event:not(.is-selected) .race-event-atlas__name { color:#203a42; font:600 14px/1.3 Inkstorm UI,sans-serif; letter-spacing:0; text-transform:none; }
.race-event-atlas__event.is-selected .race-event-atlas__name { font:400 20px/1.18 var(--ui-heading); letter-spacing:0; padding:5px 7px; text-transform:uppercase; }
.race-event-atlas__marker { display:block; height:16px; margin-top:5px; font-size:12px; letter-spacing:.06em; font-weight:800; color:var(--atlas-red); text-transform:uppercase; opacity:0; visibility:hidden; transition:transform 380ms var(--ui-settle),opacity 220ms ease; }
.race-event-atlas__event:hover .race-event-atlas__disc { box-shadow:inset -12px -12px 16px #101e2888,0 0 0 4px #24424918; }
.race-event-atlas__event.is-selected { z-index:2; }
.race-event-atlas__event.is-selected .race-event-atlas__disc { box-shadow:inset -12px -12px 16px #101e2888,0 0 0 3px #f8f7ed,0 7px 15px #171e2344; }
.race-event-atlas__event.is-selected .race-event-atlas__marker { height:auto; min-height:24px; width:96px; margin:7px auto 0; padding-top:5px; border-top:2px solid var(--atlas-red); opacity:1; visibility:visible; }
/* All orbital names wait for travelling discs; footer and accessible names stay current. */
@media (min-width:721px) {
 .race-event-atlas:not(.has-expanded-calendar)[data-selection-motion=a] .race-event-atlas__name,
 .race-event-atlas:not(.has-expanded-calendar)[data-selection-motion=a] .race-event-atlas__marker { animation:atlas-orbit-labels-a 420ms linear both; }
 .race-event-atlas:not(.has-expanded-calendar)[data-selection-motion=b] .race-event-atlas__name,
 .race-event-atlas:not(.has-expanded-calendar)[data-selection-motion=b] .race-event-atlas__marker { animation:atlas-orbit-labels-b 420ms linear both; }
}
@keyframes atlas-orbit-labels-a { 0%,65% { opacity:0; } 100% { opacity:1; } }
@keyframes atlas-orbit-labels-b { 0%,65% { opacity:0; } 100% { opacity:1; } }
/* Positions anchor visible disc centers. Each final footprint reserves a complete label below it. */
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__event {
 --atlas-disc-space:76px; --atlas-disc-scale:1;
 top:calc(min(var(--atlas-y),calc(100% - 96px)) - var(--atlas-disc-space)/2);
 display:grid; grid-template-rows:var(--atlas-disc-space) max-content max-content; min-height:0;
 transform:translateX(-50%);
}
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__event:not(.is-selected):nth-child(3n+1) { --atlas-disc-space:64px; --atlas-disc-scale:.8421052632; }
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__event:not(.is-selected):nth-child(3n+2) { --atlas-disc-space:72px; --atlas-disc-scale:.9473684211; }
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__event.is-selected { --atlas-disc-space:250px; --atlas-disc-scale:3.2894736842; width:260px; }
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__disc { grid-row:1; align-self:center; justify-self:center; transform:scale(var(--atlas-disc-scale)); }
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__name { grid-row:2; }
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__marker { grid-row:3; }
.race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__event:not(.is-selected) .race-event-atlas__marker { display:none; }
.race-event-atlas__footer { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; padding:0 clamp(22px,4vw,64px) 28px; position:relative; }
.race-event-atlas__footer::after { content:''; position:absolute; left:0; right:0; bottom:0; height:8px; background:linear-gradient(90deg,var(--atlas-petrol) 0 35%,#a7b6aa 35% 83%,var(--atlas-red) 83%); }
.race-event-atlas__details { max-width:620px; min-width:0; border-left:3px solid var(--atlas-red); padding-left:18px; }
.race-event-atlas__eyebrow { display:block; margin-bottom:8px; font-size:12px; font-weight:800; letter-spacing:.08em; color:var(--atlas-petrol); text-transform:uppercase; }
.race-event-atlas__title { margin:0; font:400 32px/1.15 var(--ui-heading); letter-spacing:0; text-transform:uppercase; overflow-wrap:anywhere; }
.race-event-atlas__description { margin:10px 0 0; max-width:57ch; font-size:17px; line-height:1.45; }
.race-event-atlas__launch { display:flex; flex-direction:column; align-items:flex-end; gap:12px; flex:0 0 auto; }
.race-event-atlas .race-event-atlas__start { display:flex; justify-content:space-between; align-items:center; gap:26px; min-height:54px; padding:17px 22px; border:0; border-radius:4px; color:var(--atlas-paper); background:var(--atlas-petrol); font:400 16px/1.2 var(--ui-heading); letter-spacing:0; white-space:nowrap; transition:background-color 220ms var(--ui-settle); }
.race-event-atlas .race-event-atlas__start:hover:not(:disabled) { background:#355b63; }
.race-event-atlas__start b { color:var(--atlas-amber); font-size:23px; line-height:1; }
.race-event-atlas__help { font-size:12px; letter-spacing:.035em; text-transform:uppercase; color:var(--atlas-petrol); }
.race-event-atlas__empty { position:absolute; inset:0; display:grid; place-items:center; padding:24px; font-size:18px; color:var(--atlas-petrol); }
.race-event-atlas__empty[hidden] { display:none; }
.race-event-atlas:not([hidden]) .race-event-atlas__header { animation:atlas-panel-in 280ms var(--ui-settle) both; }
.race-event-atlas:not([hidden]) .race-event-atlas__viewport { animation:atlas-panel-in 340ms 40ms var(--ui-settle) both; }
.race-event-atlas:not([hidden]) .race-event-atlas__footer { animation:atlas-panel-in 320ms 80ms var(--ui-settle) both; }
@keyframes atlas-panel-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
@media (max-width:720px), (max-height:540px) {
 .race-event-atlas:not(.has-expanded-calendar) .race-event-atlas__event.is-selected { --atlas-disc-space:184px; --atlas-disc-scale:2.4210526316; width:240px; }
 .race-event-atlas__event.is-selected .race-event-atlas__name { font-size:18px; }
 .race-event-atlas__description { font-size:15px; }
 .race-event-atlas__title { font-size:28px; }
 .race-event-atlas__heading { font-size:36px; }
 .race-event-atlas__edition { font-size:10px; }
 .race-event-atlas__close { font-size:11px!important; }
}
@media (max-width:720px) {
 .race-event-atlas .race-event-atlas__event { transition:none; }
 .race-event-atlas__header { padding:22px 20px 19px; gap:12px; }
 .race-event-atlas__heading::after { width:48px; height:20px; margin-left:12px; }
 .race-event-atlas__close { padding:10px; }
 .race-event-atlas__viewport { flex:0 0 auto; min-height:360px; }
 .race-event-atlas__map { height:360px; }
 .race-event-atlas__footer { flex-direction:column; align-items:stretch; padding:16px 22px 28px; gap:20px; }
 .race-event-atlas__launch { align-items:stretch; }
 .race-event-atlas__help { text-align:center; }
}
/* Short landscape scrolls the complete 360px drawing and footer without cropping labels. */
@media (max-height:540px) and (min-width:721px) {
 .race-event-atlas__header { padding-top:15px; padding-bottom:15px; }
 .race-event-atlas__viewport { flex:0 0 auto; min-height:360px; }
 .race-event-atlas__map { height:360px; }
 .race-event-atlas__footer { padding-top:6px; }
}
/* Saved routes form a real flowing calendar once the orbital set is full. */
.race-event-atlas.has-expanded-calendar .race-event-atlas__viewport { flex:0 0 auto; min-height:0; }
.race-event-atlas.has-expanded-calendar .race-event-atlas__map { min-width:0; min-height:0; height:auto; }
.race-event-atlas.has-expanded-calendar .race-event-atlas__orbits { display:none; }
.race-event-atlas.has-expanded-calendar [data-atlas=events] { display:grid; grid-template-columns:repeat(auto-fit,minmax(168px,1fr)); gap:18px; padding:30px clamp(22px,4vw,64px); }
.race-event-atlas.has-expanded-calendar .race-event-atlas__event { position:relative; left:auto; top:auto; transform:none; display:flex; flex-direction:column; align-items:center; width:100%; min-width:0; min-height:194px; padding:20px 12px 12px; border:1px solid #24424933; border-radius:6px; background:#24424907; transition:background-color 260ms var(--ui-settle),border-color 260ms var(--ui-settle); }
.race-event-atlas.has-expanded-calendar .race-event-atlas__event.is-selected { background:#d2dbcd; border-color:var(--atlas-red); }
.race-event-atlas.has-expanded-calendar .race-event-atlas__event:not(.is-selected) .race-event-atlas__disc { transform:none; }
.race-event-atlas.has-expanded-calendar .race-event-atlas__event.is-selected .race-event-atlas__disc { transform:scale(1.15); }
.race-event-atlas.has-expanded-calendar .race-event-atlas__event .race-event-atlas__name { margin:20px 0 0; padding:3px 0; width:100%; background:none; transform:none; overflow-wrap:anywhere; }
.race-event-atlas.has-expanded-calendar .race-event-atlas__event.is-selected .race-event-atlas__name { font-size:17px; }
.race-event-atlas.has-expanded-calendar .race-event-atlas__event .race-event-atlas__marker { transform:none; height:auto; min-height:24px; line-height:1.2; }
@media (max-width:720px) {
 .race-event-atlas.has-expanded-calendar [data-atlas=events] { grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:14px; padding:24px 20px; }
 .race-event-atlas.has-expanded-calendar .race-event-atlas__event { padding-left:10px; padding-right:10px; }
}
.pod-hud.is-reduced-motion .race-event-atlas *,.pod-hud.is-reduced-motion .race-event-atlas *::before,.pod-hud.is-reduced-motion .race-event-atlas *::after { animation:none!important; transition:none!important; }
@media (prefers-reduced-motion:reduce) { .race-event-atlas *,.race-event-atlas *::before,.race-event-atlas *::after { animation:none!important; transition:none!important; } }
`;
