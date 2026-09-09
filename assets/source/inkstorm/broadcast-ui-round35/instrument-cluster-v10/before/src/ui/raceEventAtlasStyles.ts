/** Original orbital-navigation artwork; the reference supplies motion and palette only. */
export const RACE_EVENT_ATLAS_CSS = /* css */ `
.race-event-atlas {
  --atlas-paper:#e8e7dc; --atlas-petrol:#244249; --atlas-red:#b54a36;
  --atlas-ink:#171e23; --atlas-amber:#f1ce82;
  position:absolute; inset:0; z-index:90; display:flex; flex-direction:column;
  min-width:0; min-height:0; overflow:auto; isolation:isolate; pointer-events:auto;
  color:var(--atlas-ink); background:var(--atlas-paper); text-transform:none;
  font-family:Inkstorm UI,"Avenir Next Condensed",sans-serif;
  overscroll-behavior:contain;
}
.race-event-atlas[hidden] { display:none !important; }
.race-event-atlas *, .race-event-atlas *::before, .race-event-atlas *::after { box-sizing:border-box; }
.race-event-atlas button { font:inherit; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.race-event-atlas button:focus-visible { outline:3px solid var(--atlas-red); outline-offset:6px; }
.race-event-atlas button:disabled { cursor:not-allowed; opacity:.45; }
.race-event-atlas__header { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:clamp(20px,3vw,44px) clamp(22px,4vw,64px) 24px; }
.race-event-atlas__heading { margin:0; font-family:Inkstorm Display,sans-serif; font-size:clamp(28px,3.3vw,52px); font-weight:400; line-height:.95; letter-spacing:-.045em; text-transform:uppercase; }
.race-event-atlas__heading::before { content:'/'; color:var(--atlas-red); margin-right:8px; }
.race-event-atlas__edition { display:block; margin:9px 0 0 21px; font-size:11px; letter-spacing:.17em; font-weight:700; text-transform:uppercase; }
.race-event-atlas__close { border:1px solid currentColor; border-radius:0; background:transparent; color:var(--atlas-ink); min-height:44px; padding:10px 16px; font-size:12px !important; font-weight:800 !important; letter-spacing:.08em; text-transform:uppercase; }
.race-event-atlas__band { height:24px; min-height:24px; background:linear-gradient(90deg,var(--atlas-petrol) 0 62%,transparent 62%); position:relative; margin-bottom:12px; }
.race-event-atlas__band::after { content:''; position:absolute; top:31px; left:0; right:0; height:8px; background:#a7b6aa; border-bottom:2px solid var(--atlas-petrol); }
.race-event-atlas__viewport { flex:0 0 auto; min-height:290px; overflow:auto; overscroll-behavior:contain; scrollbar-color:var(--atlas-petrol) transparent; }
.race-event-atlas__map { position:relative; width:100%; min-width:1000px; height:clamp(340px,51vh,580px); }
.race-event-atlas__orbits { width:100%; height:100%; position:absolute; inset:0; fill:none; stroke:var(--atlas-petrol); stroke-width:.85; opacity:.5; pointer-events:none; }
.race-event-atlas__orbits .atlas-orbit-dash { stroke-dasharray:3 13; }
.race-event-atlas__orbits .atlas-orbit-accent { stroke:var(--atlas-red); stroke-width:2; opacity:.75; }
.race-event-atlas .race-event-atlas__event { position:absolute; left:var(--atlas-x); top:var(--atlas-y); width:118px; min-height:144px; padding:0; border:0; border-radius:0; color:var(--atlas-ink); background:none; transform:translate(-50%,-50%); text-align:center; overflow:visible; transition:left 420ms cubic-bezier(.22,.68,.21,1),top 420ms cubic-bezier(.22,.68,.21,1); }
.race-event-atlas__disc { position:relative; display:block; margin:0 auto; width:76px; height:76px; border-radius:50%; border:1px solid #17262b; background:radial-gradient(ellipse at 29% 23%,#e8e7dc88,transparent 51%),repeating-linear-gradient(var(--atlas-angle),transparent 0 8px,#171e2319 8px 9px),radial-gradient(ellipse at 38% 29%,var(--atlas-tone),var(--atlas-petrol) 72%,var(--atlas-ink)); box-shadow:inset -8px -10px 14px #171e2355,0 5px 8px #171e2317; transform:translateY(0) scale(1); transition:transform 360ms cubic-bezier(.22,.68,.21,1),box-shadow 360ms ease; }
.race-event-atlas__disc::before { content:''; position:absolute; inset:-9px; border:1px solid #24424955; border-radius:50%; }
.race-event-atlas__disc::after { content:''; position:absolute; inset:13%; border:1px solid #e8e7dc30; border-left-color:transparent; border-radius:50%; transform:rotate(-32deg); }
.race-event-atlas__number { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); color:var(--atlas-paper); font-size:19px; font-weight:800; letter-spacing:.02em; text-shadow:0 1px 2px #171e2366; }
.race-event-atlas__name { display:block; position:relative; margin:20px -9px 0; background:#e8e7dce8; padding:2px 0; font-size:12px; font-weight:800; line-height:1.18; letter-spacing:.015em; text-transform:uppercase; transition:transform 360ms cubic-bezier(.22,.68,.21,1); }
.race-event-atlas__marker { display:block; height:16px; margin-top:5px; font-size:9px; letter-spacing:.15em; font-weight:800; color:var(--atlas-red); text-transform:uppercase; opacity:0; visibility:hidden; }
.race-event-atlas__event:hover .race-event-atlas__disc { box-shadow:inset -8px -10px 14px #171e2355,0 0 0 4px #24424918; }
.race-event-atlas__event.is-selected { z-index:2; }
.race-event-atlas__event.is-selected .race-event-atlas__disc { transform:translateY(-10px) scale(3); box-shadow:inset -8px -10px 14px #171e2355,0 0 0 2px var(--atlas-paper),0 0 0 3px var(--atlas-red),0 12px 17px #171e2325; }
.race-event-atlas__event.is-selected .race-event-atlas__name { transform:translateY(62px); }
.race-event-atlas__event.is-selected .race-event-atlas__marker { transform:translateY(62px); opacity:1; visibility:visible; }
.race-event-atlas__footer { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; padding:0 clamp(22px,4vw,64px) clamp(22px,3vw,40px); position:relative; }
.race-event-atlas__details { max-width:620px; min-width:0; }
.race-event-atlas__eyebrow { display:block; margin-bottom:8px; font-size:11px; font-weight:800; letter-spacing:.15em; color:var(--atlas-petrol); text-transform:uppercase; }
.race-event-atlas__title { margin:0; font-size:clamp(27px,3vw,48px); line-height:1; letter-spacing:-.04em; font-weight:900; text-transform:uppercase; overflow-wrap:anywhere; }
.race-event-atlas__description { margin:13px 0 0; max-width:54ch; font-size:15px; line-height:1.45; }
.race-event-atlas__launch { display:flex; flex-direction:column; align-items:flex-end; gap:12px; flex:0 0 auto; }
.race-event-atlas .race-event-atlas__start { display:flex; justify-content:space-between; align-items:center; gap:26px; min-height:54px; padding:17px 22px; border:0; border-radius:0; color:var(--atlas-paper); background:var(--atlas-petrol); font-weight:900; font-size:16px; letter-spacing:.025em; white-space:nowrap; }
.race-event-atlas__start b { color:var(--atlas-amber); font-size:23px; line-height:1; }
.race-event-atlas__help { font-size:10px; letter-spacing:.09em; text-transform:uppercase; color:var(--atlas-petrol); }
.race-event-atlas__empty { position:absolute; inset:0; display:grid; place-items:center; padding:24px; font-size:18px; color:var(--atlas-petrol); }
.race-event-atlas__empty[hidden] { display:none; }
@media (max-width:720px) {
  .race-event-atlas .race-event-atlas__event { transition:none; }
  .race-event-atlas__header { padding:22px 20px 19px; gap:12px; }
  .race-event-atlas__close { padding:10px; font-size:10px !important; }
  .race-event-atlas__edition { font-size:9px; letter-spacing:.1em; }
  .race-event-atlas__viewport { flex:0 0 310px; }
  .race-event-atlas__map { height:360px; }
  .race-event-atlas__footer { flex-direction:column; align-items:stretch; padding:16px 22px 28px; gap:20px; }
  .race-event-atlas__description { font-size:14px; }
  .race-event-atlas__launch { align-items:stretch; }
  .race-event-atlas__help { text-align:center; }
}
@media (max-height:540px) and (min-width:721px) {
  .race-event-atlas__header { padding-top:15px; padding-bottom:15px; }
  .race-event-atlas__viewport { flex-basis:240px; min-height:240px; }
  .race-event-atlas__map { height:260px; }
  .race-event-atlas__footer { padding-top:6px; }
  .race-event-atlas__title { font-size:27px; }
}
@media (prefers-reduced-motion:reduce) {
  .race-event-atlas *, .race-event-atlas *::before, .race-event-atlas *::after { transition:none !important; animation:none !important; scroll-behavior:auto !important; }
}
`;
