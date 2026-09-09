/** The setup owns one pod preview; optional tools stay outside the default path. */
export const SIMPLE_RACE_SETUP_CSS = /* css */ `
.pod-hud .simple-setup { padding:24px 32px; background:var(--ui-paper); color:var(--ui-ink); overflow-y:auto; }
.pod-hud .simple-setup::before,.pod-hud .simple-setup::after { display:none; }
.pod-hud .simple-setup .setup-frame { width:min(1400px,100%); min-height:560px; height:calc(100dvh - 48px); margin:0 auto; display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:auto minmax(0,1fr) auto; gap:18px; }
.simple-setup .setup-header { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; min-width:0; gap:20px; }
.simple-setup .setup-brand { font:400 17px/1 var(--ui-heading); letter-spacing:.08em; }
.simple-setup .setup-types { display:flex; gap:4px; border-bottom:1px solid #28444a4d; }
.simple-setup .setup-types button { min-height:48px; padding:12px 25px; border:0; border-bottom:3px solid transparent; background:none; color:var(--ui-teal); font:400 18px/1 var(--ui-heading); cursor:pointer; transition:color 180ms,background 180ms,border-color 180ms; }
.simple-setup .setup-types button[aria-pressed=true] { color:var(--ui-paper); background:var(--ui-teal); border-bottom-color:var(--ui-rust); }
.simple-setup .setup-types button:hover:not([aria-pressed=true]) { background:#28444a12; }
.pod-hud .simple-setup .pod-hud__garage-hero { position:relative; grid-column:1; display:block; order:initial; min-height:0; height:auto; padding:0; overflow:hidden; flex-shrink:1; background:radial-gradient(ellipse at 48% 48%,#496363 0,#2b444a 62%,#20383e 100%); color:var(--ui-paper); border:0; border-radius:8px; clip-path:none; animation:none; }
.pod-hud .simple-setup .pod-hud__garage-hero::before { content:''; position:absolute; inset:20px; width:auto; height:auto; border:1px solid #e8e7dc25; border-radius:50% 50% 12px 12px; transform:none; box-shadow:none; pointer-events:none; }
.pod-hud .simple-setup .pod-hud__garage-hero::after { display:none; }
.pod-hud .simple-setup .pod-hud__garage-model { position:absolute; inset:16px 78px 118px; height:auto; margin:0; cursor:grab; touch-action:none; outline-offset:-4px; }
.pod-hud .simple-setup .pod-hud__garage-model.is-inspecting { cursor:grabbing; }
.pod-hud .simple-setup .pod-hud__garage-model img,.pod-hud .simple-setup .pod-hud__garage-model canvas { filter:drop-shadow(0 14px 10px #10242a55); }
.simple-setup .setup-pod-arrow { position:absolute; top:46%; transform:translateY(-50%); width:52px; height:64px; display:grid; place-items:center; border:1px solid #e8e7dc55; background:transparent; color:var(--ui-paper); font:400 50px/1 sans-serif; border-radius:4px; cursor:pointer; }
.simple-setup .setup-pod-arrow:hover { background:#e8e7dc14; border-color:var(--ui-paper); }
.simple-setup .setup-pod-arrow--previous { left:24px; }
.simple-setup .setup-pod-arrow--next { right:24px; }
.pod-hud .simple-setup .pod-hud__garage-name { position:absolute; inset:auto 0 60px; width:auto; max-width:none; margin:0; text-align:center; pointer-events:none; }
.simple-setup .pod-hud__garage-name>span { font:700 12px/1.4 Inkstorm UI,sans-serif; letter-spacing:.14em; color:#d7bd82; }
.simple-setup .pod-hud__garage-name h1 { margin:4px 0 0; font:400 clamp(30px,3.5vw,48px)/1.05 var(--ui-heading); letter-spacing:.01em; color:var(--ui-paper); }
.pod-hud .simple-setup .pod-hud__garage-inspect { position:absolute; inset:auto 0 13px; width:auto; display:flex; justify-content:center; align-items:center; gap:12px; margin:0; }
.pod-hud .simple-setup .pod-hud__garage-inspect button { width:44px; height:44px; min-height:44px; padding:0; border:1px solid #e8e7dc55; border-radius:3px; background:none; color:var(--ui-paper); font:24px/1 sans-serif; cursor:pointer; }
.simple-setup .pod-hud__garage-inspect>span { display:block; white-space:nowrap; font:700 12px/1.3 Inkstorm UI,sans-serif; color:#e8e7dc; letter-spacing:.04em; text-align:center; }
.simple-setup .pod-hud__garage-inspect small { display:block; font:400 10px/1.4 Inkstorm UI,sans-serif; color:#cad8d2; }
.simple-setup .setup-preview-status { position:absolute; top:18px; left:50%; transform:translateX(-50%); max-width:calc(100% - 80px); border-radius:3px; padding:8px 12px; background:#173038ed; color:var(--ui-paper); font:12px/1.3 Inkstorm UI,sans-serif; text-transform:none; }
.simple-setup .setup-preview-status p { margin:0; }
.simple-setup .setup-preview-status button { margin-top:6px; min-height:36px; padding:6px 12px; border:1px solid currentColor; color:inherit; background:none; cursor:pointer; }
.simple-setup .setup-bottom { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:end; gap:12px; min-height:64px; padding:0; }
.simple-setup .setup-options { display:flex; justify-content:center; flex-wrap:wrap; gap:14px 32px; }
.simple-setup .setup-options>div { display:flex; align-items:center; gap:4px; flex-wrap:nowrap; border:0; padding:0; margin:0; background:none; }
.simple-setup .setup-options>div>span { padding-right:8px; color:var(--ui-teal); font:700 12px/1 Inkstorm UI,sans-serif; }
.simple-setup .setup-options button { min-width:44px; min-height:44px; padding:8px 12px; border:1px solid transparent; border-bottom-color:#28444a55; border-radius:2px; background:transparent; color:var(--ui-teal); font:700 13px/1 Inkstorm UI,sans-serif; cursor:pointer; }
.simple-setup .setup-options button[aria-pressed=true] { border-color:var(--ui-teal); background:var(--ui-teal); color:var(--ui-paper); }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { width:240px; min-height:56px; display:flex; justify-content:space-between; align-items:center; padding:13px 25px; border:0; border-radius:4px; background:var(--ui-rust); color:var(--ui-paper); font:400 24px/1 var(--ui-heading); text-transform:uppercase; letter-spacing:.04em; }
.pod-hud .simple-setup .setup-bottom>.pod-hud__start-button:hover:not(:disabled) { background:#983b2b; transform:none; }
.simple-setup .setup-more { position:absolute; left:0; bottom:0; z-index:8; }
.simple-setup .setup-more>summary { min-width:88px; min-height:48px; display:flex; gap:12px; align-items:center; justify-content:space-between; padding:10px 12px; border:1px solid #28444a88; border-radius:3px; background:#28444a06; cursor:pointer; list-style:none; color:var(--ui-teal); font:700 13px/1 Inkstorm UI,sans-serif; }
.simple-setup .setup-more>summary::-webkit-details-marker { display:none; }
.simple-setup .setup-more[open]>summary span { transform:rotate(45deg); }
.simple-setup .setup-more-body { position:absolute; bottom:56px; left:0; width:340px; max-height:min(560px,calc(100dvh - 150px)); overflow:auto; background:var(--ui-paper); border:1px solid #28444a66; border-radius:6px; box-shadow:0 12px 32px #102d3e30; padding:18px; color:var(--ui-teal); }
.simple-setup .setup-extras { display:flex; gap:8px; flex-wrap:wrap; padding-bottom:12px; border-bottom:1px solid #28444a33; }
.simple-setup .setup-extras button { min-height:42px; padding:10px 14px; background:none; border:1px solid #28444a77; color:var(--ui-teal); font:700 13px/1 Inkstorm UI,sans-serif; cursor:pointer; }
.simple-setup .setup-more .pod-hud__event-list { max-height:190px; padding:8px 0; margin:0; overflow:auto; }
.simple-setup .setup-more .pod-hud__event-list button { padding:10px 4px; min-height:44px; }
.simple-setup .setup-more .pod-hud__event-list button small { display:none; }
.simple-setup .setup-more .pod-hud__event-list button strong { font-size:13px; }
.simple-setup .setup-more .pod-hud__event-list button[data-event-id="inkstorm-battle"],.simple-setup .setup-more .pod-hud__event-list button[data-event-id="inkstorm-race"],.simple-setup .setup-more .pod-hud__event-list button[data-event-id="inkstorm-trial"],.simple-setup .setup-more .pod-hud__event-list button[data-event-id^="cup-"] { display:none; }
.simple-setup .setup-more .pod-hud__mastery-controls { display:flex; gap:12px; padding:10px 0; }
.simple-setup .setup-more .pod-hud__room { margin-top:8px; }
.simple-setup [hidden],.simple-setup .setup-legacy { display:none!important; }
.pod-hud.has-vehicle-selection>.pod-hud__pause.has-settings { visibility:visible!important; opacity:1!important; z-index:100; pointer-events:auto; }
.pod-hud .simple-setup :is(button,summary,[data-pod-inspection]):focus-visible { outline:3px solid #bd7d35; outline-offset:3px; }
.pod-hud .simple-setup [data-pod-inspection]:focus-visible { outline-color:#f5d58e; outline-offset:-3px; }
.pod-hud.is-high-contrast .simple-setup .pod-hud__garage-hero { background:#153037; }
.pod-hud.is-high-contrast .simple-setup .pod-hud__garage-inspect small { color:var(--ui-paper); }
@media(max-width:760px) {
 .pod-hud .simple-setup { padding:14px 16px; }
 .pod-hud .simple-setup .setup-frame { height:calc(100dvh - 28px); min-height:540px; gap:12px; }
 .simple-setup .setup-header { display:flex; flex-direction:column; align-items:stretch; gap:12px; }
 .simple-setup .setup-brand { font-size:12px; text-align:center; }
 .simple-setup .setup-types { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:2px; }
 .simple-setup .setup-types button { min-height:46px; padding:10px 5px; font-size:14px; white-space:nowrap; }
 .pod-hud .simple-setup .pod-hud__garage-model { inset:18px 42px 112px; }
 .simple-setup .setup-pod-arrow { width:44px; height:54px; font-size:40px; }
 .simple-setup .setup-pod-arrow--previous { left:8px; }
 .simple-setup .setup-pod-arrow--next { right:8px; }
 .pod-hud .simple-setup .pod-hud__garage-hero::before { inset:12px; }
 .simple-setup .setup-options { gap:8px 18px; }
 .simple-setup .setup-options>div>span { font-size:11px; padding-right:3px; }
 .simple-setup .setup-options button { min-width:44px; min-height:44px; padding:8px; font-size:12px; }
 .simple-setup .setup-bottom { padding-bottom:54px; gap:10px; }
 .simple-setup .setup-more { bottom:0; }
 .simple-setup .setup-more>summary { min-width:80px; min-height:44px; padding:8px 12px; }
 .simple-setup .setup-more-body { width:min(340px,calc(100vw - 32px)); bottom:52px; }
}
@media(max-height:540px) and (min-width:600px) {
 .pod-hud .simple-setup { padding:10px 18px; }
 .pod-hud .simple-setup .setup-frame { height:calc(100dvh - 20px); min-height:320px; gap:8px; }
 .simple-setup .setup-header { display:flex; flex-direction:row; justify-content:space-between; gap:12px; }
 .simple-setup .setup-brand { font-size:12px; }
 .simple-setup .setup-types button { min-height:44px; padding:10px 16px; font-size:14px; }
 .pod-hud .simple-setup .pod-hud__garage-model { inset:4px 100px 4px 54px; }
 .pod-hud .simple-setup .pod-hud__garage-name { inset:14px 18px auto auto; max-width:155px; text-align:right; }
 .simple-setup .pod-hud__garage-name h1 { font-size:24px; }
 .simple-setup .pod-hud__garage-name>span { font-size:10px; }
 .pod-hud .simple-setup .pod-hud__garage-inspect { inset:auto 10px 8px auto; gap:8px; }
 .simple-setup .pod-hud__garage-inspect small { display:none; }
 .simple-setup .pod-hud__garage-inspect>span { font-size:12px; max-width:none; white-space:nowrap; }
 .pod-hud .simple-setup .pod-hud__garage-inspect button { width:44px; min-height:44px; height:44px; }
 .simple-setup .setup-pod-arrow { top:50%; width:44px; height:48px; }
 .simple-setup .setup-pod-arrow--previous { left:10px; }
 .simple-setup .setup-pod-arrow--next { right:10px; top:52%; }
 .simple-setup .setup-bottom { display:grid; grid-template-columns:80px minmax(0,1fr) 144px; min-height:48px; align-items:center; gap:12px; padding:0; }
 .simple-setup .setup-more { position:relative; inset:auto; grid-column:1; grid-row:1; }
 .simple-setup .setup-more>summary { min-width:80px; min-height:44px; }
 .simple-setup .setup-options { grid-column:2; grid-row:1; flex-wrap:nowrap; gap:10px; }
 .pod-hud .simple-setup .setup-bottom>.pod-hud__start-button { grid-column:3; grid-row:1; width:144px; min-height:48px; font-size:20px; }
 .simple-setup .setup-options button { min-width:44px; min-height:44px; padding:6px; font-size:12px; }
 .simple-setup .setup-options>div>span { font-size:10px; padding-right:1px; }
}
`;
