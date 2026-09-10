import { INKSTORM_HUD_CSS } from './inkstormStyles';
import { BROADCAST_HUD_CSS } from './broadcastStyles';
import { WORKSHOP_GRAPHIC_CSS } from './workshopGraphicStyles';
import { SIMPLE_RACE_SETUP_CSS } from './simpleRaceSetupStyles';
import { DUSK_UI_CSS } from './duskUiStyles';

export const PODRACING_HUD_STYLE_ID = 'podracing-cel-hud-styles';

const BASE_HUD_CSS = /* css */ `
.pod-hud {
  --pod-ink: #100b1b;
  --pod-ink-soft: #24152c;
  --pod-paper: #fff3c5;
  --pod-sand: #f2b55f;
  --pod-orange: #ef694d;
  --pod-red: #e83d4f;
  --pod-violet: #5b3a7d;
  --pod-sky: #53d9ff;
  --pod-green: #78f29a;
  --pod-muted: #b88772;
  --pod-panel: rgba(26, 14, 32, 0.88);
  --pod-panel-solid: #1a0e20;
  --pod-cut: polygon(0 9px, 9px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 10px 100%, 0 calc(100% - 10px));
  position: absolute;
  inset: 0;
  z-index: 20;
  overflow: hidden;
  pointer-events: none;
  color: var(--pod-paper);
  font-family: "Avenir Next Condensed", "Arial Narrow", "Trebuchet MS", sans-serif;
  font-variant-numeric: tabular-nums;
  text-transform: uppercase;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}

.pod-hud *, .pod-hud *::before, .pod-hud *::after { box-sizing: border-box; }

.pod-hud__sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  clip-path: inset(50%) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* -------------------------------------------------------------------------- */
/* Vehicle selection: a fully opaque, isolated compositor surface.            */
/* -------------------------------------------------------------------------- */

.pod-hud__vehicle-select {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: none;
  place-items: center;
  padding: clamp(18px, 2.6vw, 40px);
  overflow: hidden;
  pointer-events: auto;
  visibility: hidden;
  opacity: 1;
  isolation: isolate;
  contain: layout paint style;
  transform: translateZ(0);
  backface-visibility: hidden;
  background-color: #100b1b;
  background-image:
    linear-gradient(112deg, #100b1b 0 37%, #2b182f 37% 73%, #160d21 73% 100%),
    linear-gradient(90deg, #100b1b, #24152c);
}

.pod-hud__vehicle-select.is-visible {
  display: grid;
  visibility: visible;
}

.pod-hud__vehicle-select::before,
.pod-hud__vehicle-select::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.pod-hud__vehicle-select::before {
  inset: 16px;
  z-index: -1;
  border: 2px solid #493444;
  clip-path: polygon(0 22px, 22px 0, 66% 0, 69% 7px, 100% 7px, 100% calc(100% - 22px), calc(100% - 22px) 100%, 32% 100%, 29% calc(100% - 7px), 0 calc(100% - 7px));
}

.pod-hud__vehicle-select::after {
  left: 0;
  right: 0;
  bottom: 0;
  height: 8px;
  background: linear-gradient(90deg, var(--pod-orange) 0 24%, #100b1b 24% 27%, var(--pod-sky) 27% 74%, #100b1b 74% 77%, var(--pod-green) 77%);
}

.pod-hud__vehicle-select-frame {
  width: min(1500px, 100%);
  position: relative;
  contain: layout style;
}

.pod-hud__vehicle-select-head { margin: 0 0 clamp(11px, 1.5vh, 17px); }

.pod-hud__vehicle-select-head h1 {
  margin: 0;
  color: var(--pod-paper);
  font-size: clamp(42px, 5.2vw, 80px);
  font-weight: 1000;
  font-style: italic;
  letter-spacing: -0.055em;
  line-height: 0.9;
  text-shadow: 6px 6px 0 var(--pod-orange);
}

.pod-hud__vehicle-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(9px, 0.9vw, 15px);
}

.pod-hud__vehicle-card {
  --pod-vehicle-accent: var(--pod-orange);
  position: relative;
  min-width: 0;
  min-height: clamp(340px, 47vh, 460px);
  padding: 14px 14px 12px;
  overflow: hidden;
  color: var(--pod-paper);
  background: #201127;
  border: 2px solid #4c344d;
  border-top: 7px solid var(--pod-vehicle-accent);
  clip-path: polygon(0 0, calc(100% - 25px) 0, 100% 25px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  cursor: pointer;
  outline: none;
  contain: layout paint style;
}

.pod-hud__vehicle-card:focus-visible {
  box-shadow: inset 0 0 0 3px var(--pod-paper), 5px 7px 0 var(--pod-vehicle-accent);
}

.pod-hud__vehicle-card.is-selected {
  background: #2b1831;
  border-color: var(--pod-vehicle-accent);
  box-shadow: inset 0 0 0 3px var(--pod-ink), 6px 8px 0 var(--pod-vehicle-accent);
}

.pod-hud__vehicle-card-index {
  color: var(--pod-vehicle-accent);
  font-size: 12px;
  font-weight: 1000;
  letter-spacing: 0.18em;
}

.pod-hud__vehicle-card-check {
  position: absolute;
  top: 12px;
  right: 13px;
  padding: 3px 7px;
  color: var(--pod-ink);
  background: var(--pod-vehicle-accent);
  font-size: 8px;
  font-weight: 1000;
  letter-spacing: 0.12em;
  visibility: hidden;
}

.pod-hud__vehicle-card.is-selected .pod-hud__vehicle-card-check { visibility: visible; }

.pod-hud__vehicle-card h2 {
  min-height: 1.9em;
  margin: 7px 0 4px;
  font-size: clamp(19px, 1.65vw, 28px);
  font-style: italic;
  line-height: 1.02;
  letter-spacing: -0.025em;
}

.pod-hud__vehicle-preview {
  position: relative;
  width: 100%;
  height: clamp(105px, 15vh, 150px);
  margin: 1px 0 8px;
  overflow: hidden;
  isolation: isolate;
  contain: strict;
  background:
    linear-gradient(155deg, #39213d 0 46%, #160d21 46% 100%);
  border: 1px solid #593d56;
  border-left: 4px solid var(--pod-vehicle-accent);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  transform: translateZ(0);
  backface-visibility: hidden;
}

.pod-hud__vehicle-preview::after {
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: 14%;
  height: 2px;
  z-index: -1;
  background: var(--pod-vehicle-accent);
  box-shadow: 0 8px 0 #100b1b;
  opacity: 0.45;
}

.pod-hud__vehicle-preview > canvas,
.pod-hud__vehicle-preview > img {
  display: block;
  width: 100% !important;
  height: 100% !important;
  object-fit: contain;
}

.pod-hud__vehicle-card-description {
  margin: 0 0 8px;
  overflow: hidden;
  color: #d7a98f;
  font-size: 9.5px;
  font-weight: 900;
  letter-spacing: 0.035em;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-hud__vehicle-stats {
  display: grid;
  gap: 5px;
  padding-top: 7px;
  border-top: 1px solid #594052;
}

.pod-hud__vehicle-stat {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 12px;
  gap: 7px;
  align-items: center;
  color: var(--pod-sand);
  font-size: 8.5px;
  font-weight: 1000;
  letter-spacing: 0.07em;
}

.pod-hud__vehicle-stat i {
  --pod-stat: 1;
  position: relative;
  height: 8px;
  overflow: hidden;
  background: linear-gradient(90deg, var(--pod-vehicle-accent) 0 calc(var(--pod-stat) * 20%), #403143 calc(var(--pod-stat) * 20%));
  transform: skewX(-13deg);
}

.pod-hud__vehicle-stat i::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(90deg, transparent 0 calc(20% - 2px), var(--pod-ink) calc(20% - 2px) 20%);
}

.pod-hud__vehicle-stat b { color: var(--pod-paper); text-align: right; }

.pod-hud__vehicle-select-footer {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(226px, 0.68fr) minmax(380px, 1fr);
  gap: 9px;
  align-items: stretch;
  margin-top: clamp(11px, 1.5vh, 16px);
  color: var(--pod-muted);
  font-size: 8px;
  font-weight: 1000;
  letter-spacing: 0.09em;
}

.pod-hud__vehicle-select-footer > section {
  position: relative;
  min-width: 0;
  min-height: 148px;
  padding: 9px 11px;
  overflow: hidden;
  background: #1c1023;
  border: 1px solid #4c344d;
  border-left: 4px solid var(--pod-sky);
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 13px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
}

.pod-hud__vehicle-select-footer > .pod-hud__selector-setup { border-left-color: var(--pod-orange); }
.pod-hud__vehicle-select-footer > .pod-hud__room { border-left-color: var(--pod-green); }

.pod-hud__selector-section-head {
  display: flex;
  min-height: 15px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid #51384c;
}

.pod-hud__selector-section-head strong {
  color: var(--pod-paper);
  font-size: 9px;
  font-style: italic;
  letter-spacing: 0.14em;
}

.pod-hud__selector-section-head small {
  overflow: hidden;
  color: var(--pod-muted);
  font-size: 7px;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-hud__selector-control-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px 6px;
}

.pod-hud__selector-control-grid span {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px;
  align-items: center;
}

.pod-hud__selector-control-grid em {
  overflow: hidden;
  color: var(--pod-sand);
  font-size: 7px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-hud__vehicle-select-footer kbd {
  display: inline-grid;
  place-items: center;
  min-width: 21px;
  height: 19px;
  padding: 0 4px;
  color: var(--pod-ink);
  background: var(--pod-paper);
  border: 1px solid var(--pod-ink);
  box-shadow: 2px 2px 0 var(--pod-orange);
  font: 1000 7px/1 "Avenir Next Condensed", "Arial Narrow", sans-serif;
  letter-spacing: 0;
}

.pod-hud__selector-setup {
  display: grid;
  grid-template-rows: auto repeat(3, 23px) 1fr;
  gap: 4px;
}

.pod-hud__lap-selector,
.pod-hud__difficulty-selector {
  display: grid;
  grid-template-columns: 43px repeat(3, minmax(0, 1fr));
  gap: 4px;
  align-items: center;
}

.pod-hud__lap-selector > span,
.pod-hud__difficulty-selector > span,
.pod-hud__mode-selector > span { color: var(--pod-sand); font-size: 8px; letter-spacing: 0.1em; }

.pod-hud__mode-selector {
  display: grid;
  grid-template-columns: 43px minmax(0, 1fr);
  gap: 4px;
  align-items: center;
}

.pod-hud__lap-selector button,
.pod-hud__difficulty-selector button,
.pod-hud__mode-selector select,
.pod-hud__workshop-toggle,
.pod-hud__room button,
.pod-hud__room input {
  appearance: none;
  min-width: 0;
  height: 23px;
  padding: 0 6px;
  color: var(--pod-paper);
  background: #302036;
  border: 1px solid #60465b;
  border-radius: 0;
  outline: none;
  font: 1000 8px/1 "Avenir Next Condensed", "Arial Narrow", sans-serif;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.pod-hud__lap-selector button,
.pod-hud__difficulty-selector button,
.pod-hud__workshop-toggle,
.pod-hud__room button { cursor: pointer; }
.pod-hud__lap-selector button:disabled,
.pod-hud__difficulty-selector button:disabled,
.pod-hud__mode-selector select:disabled,
.pod-hud__workshop-toggle:disabled { cursor: default; opacity: 0.48; }
.pod-hud__lap-selector button.is-selected:disabled,
.pod-hud__difficulty-selector button.is-selected:disabled { opacity: 0.74; }

.pod-hud__lap-selector button:hover:not(:disabled),
.pod-hud__difficulty-selector button:hover:not(:disabled),
.pod-hud__workshop-toggle:hover:not(:disabled),
.pod-hud__room button:hover:not(:disabled) { color: var(--pod-ink); background: var(--pod-paper); }

.pod-hud__lap-selector button:focus-visible,
.pod-hud__difficulty-selector button:focus-visible,
.pod-hud__mode-selector select:focus-visible,
.pod-hud__workshop-toggle:focus-visible,
.pod-hud__room button:focus-visible,
.pod-hud__room input:focus-visible { box-shadow: 0 0 0 2px var(--pod-paper); }

.pod-hud__lap-selector button.is-selected,
.pod-hud__difficulty-selector button.is-selected {
  color: var(--pod-ink);
  background: var(--pod-orange);
  border-color: var(--pod-paper);
  box-shadow: 2px 2px 0 var(--pod-paper);
}

.pod-hud__start-prompt {
  align-self: center;
  display: block;
  color: var(--pod-paper);
  font-size: clamp(8px, 0.72vw, 10px);
  font-style: italic;
  letter-spacing: 0.075em;
  line-height: 1.35;
}

.pod-hud__start-prompt[data-mode="waiting"] { color: var(--pod-sand); }
.pod-hud__start-prompt kbd { margin: 0 2px; color: var(--pod-ink); background: var(--pod-green); }

.pod-hud__selector-launch-row {
  align-self: end;
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.pod-hud__workshop-toggle { color: var(--pod-ink); background: var(--pod-sky); border-color: var(--pod-paper); }

.pod-hud__room {
  display: grid;
  grid-template-rows: auto auto auto 1fr;
}

.pod-hud__room .pod-hud__selector-section-head > span {
  color: var(--pod-green);
  font-size: 9px;
  letter-spacing: 0.11em;
}

.pod-hud__room-actions {
  display: grid;
  grid-template-columns: minmax(80px, 1.15fr) minmax(72px, 0.82fr) minmax(48px, 0.65fr);
  gap: 4px;
}

.pod-hud__room-actions [data-action="copy-room"] { grid-column: 1 / 3; }
.pod-hud__room-actions button:disabled { cursor: default; opacity: 0.38; }
.pod-hud__room-code { min-width: 0; }
.pod-hud__room input { width: 100%; color: var(--pod-green); text-align: center; letter-spacing: 0.18em; }
.pod-hud__room input::placeholder { color: var(--pod-muted); opacity: 0.72; }
.pod-hud__room input[aria-invalid="true"] { color: var(--pod-red); border-color: var(--pod-red); }

.pod-hud__room-status {
  margin-top: 5px;
  overflow: hidden;
  color: var(--pod-sand);
  font-size: 7.5px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-hud__room[data-status="error"] .pod-hud__room-status { color: var(--pod-red); }
.pod-hud__room[data-status="ready"] .pod-hud__room-status { color: var(--pod-green); }

.pod-hud__room-members {
  min-width: 0;
  margin: 5px 0 0;
  padding: 0;
  display: flex;
  gap: 4px;
  align-items: end;
  overflow: hidden;
  list-style: none;
}

.pod-hud__room-member {
  min-width: 0;
  max-width: 98px;
  padding: 2px 5px;
  overflow: hidden;
  color: var(--pod-muted);
  background: #2a1b30;
  border-left: 2px solid #60465b;
  font-size: 7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-hud__room-member.is-local { color: var(--pod-paper); border-left-color: var(--pod-green); }
.pod-hud__room-member b { margin-left: 4px; color: var(--pod-green); font-size: 6px; }
.pod-hud__room-member--empty { max-width: none; }

.pod-hud__vehicle-select-footer strong {
  color: var(--pod-paper);
}

.pod-hud__workshop {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 8;
  height: min(400px, 56vh);
  padding: 14px 16px 16px;
  color: var(--pod-paper);
  background: #160d21;
  border: 3px solid #5a4054;
  border-top: 7px solid var(--pod-sky);
  box-shadow: 10px 12px 0 var(--pod-ink);
  clip-path: polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 13px 100%, 0 calc(100% - 13px));
  visibility: hidden;
  opacity: 0;
  transform: translateY(18px);
}

.pod-hud__workshop.is-visible { visibility: visible; opacity: 1; transform: translateY(0); }
.pod-hud__workshop-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; height: 48px; }
.pod-hud__workshop-head div { display: grid; }
.pod-hud__workshop-head span { color: var(--pod-green); font-size: 8px; font-weight: 1000; letter-spacing: 0.2em; }
.pod-hud__workshop-head strong { font-size: 22px; font-style: italic; letter-spacing: -0.02em; }
.pod-hud__workshop button { appearance: none; color: var(--pod-paper); background: #28172e; border: 1px solid #5e4458; border-radius: 0; font: 1000 9px/1 "Avenir Next Condensed", "Arial Narrow", sans-serif; text-transform: uppercase; cursor: pointer; }
.pod-hud__workshop button:focus-visible { outline: 2px solid var(--pod-paper); outline-offset: 2px; }
.pod-hud__workshop-head > button { width: 32px; height: 32px; color: var(--pod-ink); background: var(--pod-paper); font-size: 18px; }
.pod-hud__workshop-slots { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-bottom: 8px; }
.pod-hud__workshop-slot { min-width: 0; height: 63px; padding: 6px 8px; display: grid; align-content: center; text-align: left; border-top: 3px solid #66485d !important; }
.pod-hud__workshop-slot span { color: var(--pod-sand); font-size: 8px; letter-spacing: 0.12em; }
.pod-hud__workshop-slot strong { overflow: hidden; margin: 2px 0; color: var(--pod-paper); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__workshop-slot small { overflow: hidden; color: var(--pod-muted); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__workshop-slot.is-selected { color: var(--pod-ink); background: #283c3b; border-color: var(--pod-green) !important; box-shadow: inset 4px 0 0 var(--pod-green); }
.pod-hud__workshop-body { height: calc(100% - 119px); display: grid; grid-template-columns: minmax(0, 1.8fr) minmax(250px, 0.72fr); gap: 9px; }
.pod-hud__workshop-parts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.pod-hud__workshop-part { position: relative; min-width: 0; padding: 8px 10px !important; display: grid; grid-template-columns: 1fr 1fr; gap: 3px 8px; text-align: left; border-left: 4px solid var(--pod-orange) !important; }
.pod-hud__workshop-part > strong,
.pod-hud__workshop-part > p { grid-column: 1 / -1; }
.pod-hud__workshop-part > strong { color: var(--pod-paper); font-size: 11px; }
.pod-hud__workshop-part > p { margin: 0; overflow: hidden; color: var(--pod-muted); font-size: 8px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__workshop-part > span { overflow: hidden; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__workshop-part .is-benefit { color: var(--pod-green); }
.pod-hud__workshop-part .is-tradeoff { color: var(--pod-red); }
.pod-hud__workshop-part.is-equipped { background: #233233; border-color: var(--pod-green) !important; box-shadow: inset 0 -3px 0 var(--pod-green); }
.pod-hud__workshop-part.is-equipped::after { content: "Equipped"; position: absolute; right: 6px; top: 5px; color: var(--pod-green); font-size: 6px; letter-spacing: 0.1em; }
.pod-hud__workshop-summary { display: grid; grid-template-rows: repeat(3, minmax(0, 1fr)); gap: 5px; min-width: 0; }
.pod-hud__workshop-summary > div { min-height: 0; padding: 6px 8px; overflow: hidden; background: #211428; border-left: 3px solid var(--pod-sky); }
.pod-hud__workshop-summary > div:nth-child(2) { border-left-color: var(--pod-red); }
.pod-hud__workshop-summary > div:nth-child(3) { border-left-color: var(--pod-green); }
.pod-hud__workshop-summary strong { color: var(--pod-sand); font-size: 8px; letter-spacing: 0.12em; }
.pod-hud__workshop-summary ul { margin: 4px 0 0; padding: 0; display: grid; gap: 2px; list-style: none; }
.pod-hud__workshop-summary li { overflow: hidden; color: var(--pod-paper); font-size: 8px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }

/* -------------------------------------------------------------------------- */
/* Race HUD: reference hierarchy with an intentionally clear playfield.       */
/* -------------------------------------------------------------------------- */

.pod-hud__label {
  color: var(--pod-sand);
  font-size: 9px;
  font-weight: 1000;
  letter-spacing: 0.2em;
  line-height: 1;
  white-space: nowrap;
  text-shadow: 0.5px 0 currentColor;
}

.pod-hud__panel {
  position: absolute;
  isolation: isolate;
}

.pod-hud__panel::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--pod-panel);
  clip-path: var(--pod-cut);
}

.pod-hud__race {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 96px;
  z-index: 2;
  background: linear-gradient(180deg, rgba(16, 11, 27, 0.72) 0, rgba(16, 11, 27, 0.34) 55%, transparent 100%);
}

.pod-hud__race-rail {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 59px;
  height: 18px;
  background: rgba(255, 243, 197, 0.44);
  clip-path: polygon(0 0, 8% 0, 10% 12px, 18% 12px, 20% 0, 42% 0, 45% 13px, 55% 13px, 58% 0, 80% 0, 82% 12px, 90% 12px, 92% 0, 100% 0, 100% 1px, 92% 1px, 90% 13px, 82% 13px, 80% 1px, 58% 1px, 55% 14px, 45% 14px, 42% 1px, 20% 1px, 18% 13px, 10% 13px, 8% 1px, 0 1px);
}

.pod-hud__race-stat,
.pod-hud__race-time {
  position: absolute;
  top: 10px;
  width: min(190px, 23vw);
  text-align: center;
}

.pod-hud__race-stat--lap { left: 8%; }
.pod-hud__race-stat--position { right: 8%; }

.pod-hud__race-time {
  left: 50%;
  transform: translateX(-50%);
}

.pod-hud__race-value,
.pod-hud__clock {
  display: block;
  color: var(--pod-paper);
  font-size: clamp(27px, 2.55vw, 40px);
  font-weight: 1000;
  font-style: italic;
  letter-spacing: -0.035em;
  line-height: 0.92;
  text-shadow: 3px 3px 0 var(--pod-ink);
}

.pod-hud__race-value small {
  color: var(--pod-paper);
  font-size: 0.6em;
  letter-spacing: 0;
}

.pod-hud__race-stat .pod-hud__label,
.pod-hud__race-time .pod-hud__label { display: block; margin-top: 5px; }

.pod-hud__split {
  position: absolute;
  left: 50%;
  top: 57px;
  color: var(--pod-green);
  font-size: 8px;
  font-weight: 1000;
  letter-spacing: 0.09em;
  transform: translateX(-50%);
  white-space: nowrap;
}

.pod-hud__split.is-slow { color: var(--pod-red); }

.pod-hud__redline-heat {
  position: absolute;
  left: 50%;
  top: 72px;
  z-index: 4;
  width: 180px;
  min-height: 20px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  padding: 4px 8px 4px 10px;
  color: var(--pod-sand);
  background: rgba(16, 11, 27, 0.94);
  border-bottom: 3px solid var(--pod-orange);
  clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  visibility: hidden;
  opacity: 0;
  transform: translate(-50%, -4px) skewX(-7deg);
  transition: width 110ms steps(2, end), min-height 110ms steps(2, end), opacity 80ms linear, transform 80ms linear;
}

.pod-hud__redline-heat.is-visible { visibility: visible; opacity: 1; transform: translate(-50%, 0) skewX(-7deg); }
.pod-hud__redline-heat > span { font-size: 7px; font-weight: 1000; letter-spacing: 0.13em; }
.pod-hud__redline-heat::after { content: ""; color: var(--pod-orange); font-size: 7px; font-weight: 1000; letter-spacing: 0.1em; }
.pod-hud__redline-track { display: block; height: 7px; overflow: hidden; background: #493445; border: 1px solid #765267; transform: skewX(-9deg); }
.pod-hud__redline-track > i { display: block; width: 0; height: 100%; background: var(--pod-orange); transition: width 70ms linear; }
.pod-hud__redline-heat.is-active { border-bottom-color: var(--pod-paper); }
.pod-hud__redline-heat.is-hot {
  width: 214px;
  min-height: 25px;
  color: var(--pod-paper);
  background: #351827;
  border: 2px solid var(--pod-orange);
  border-bottom-width: 5px;
  box-shadow: 4px 4px 0 rgba(16, 11, 27, 0.8);
}
.pod-hud__redline-heat.is-hot::after { content: "Heat"; }
.pod-hud__redline-heat.is-hot .pod-hud__redline-track { height: 10px; background: #170d1d; border-color: var(--pod-paper); }
.pod-hud__redline-heat.is-hot .pod-hud__redline-track > i { background: var(--pod-red); }
.pod-hud__redline-heat.is-critical { border-color: var(--pod-red); animation: pod-redline-critical 360ms steps(2, end) infinite; }
.pod-hud__redline-heat.is-critical::after { content: "Critical"; color: var(--pod-paper); }

.pod-hud__mode-status {
  position: absolute;
  left: max(18px, env(safe-area-inset-left));
  top: 88px;
  z-index: 3;
  width: min(276px, 28vw);
  padding: 8px 13px 9px 16px;
  color: var(--pod-paper);
  background: linear-gradient(105deg, rgba(16, 11, 27, 0.92) 0 82%, rgba(16, 11, 27, 0.2) 100%);
  border-left: 4px solid var(--pod-green);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  visibility: hidden;
  opacity: 0;
  transform: translateX(-7px);
  transition: opacity 100ms linear, transform 100ms steps(2, end);
}
.pod-hud__mode-status.is-visible { visibility: visible; opacity: 1; transform: translateX(0); }
.pod-hud__mode-status > span { display: block; color: var(--pod-green); font-size: 9px; font-weight: 1000; font-style: italic; letter-spacing: 0.16em; text-transform: uppercase; }
.pod-hud__mode-status > strong { display: block; overflow: hidden; margin-top: 3px; color: var(--pod-sand); font-size: 7px; font-weight: 900; letter-spacing: 0.06em; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__mode-status > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 6px; }
.pod-hud__mode-status small { color: var(--pod-muted); font-size: 6px; font-weight: 1000; letter-spacing: 0.13em; text-transform: uppercase; }
.pod-hud__mode-status b { color: var(--pod-paper); font-size: 11px; font-style: italic; letter-spacing: 0.04em; white-space: nowrap; }
.pod-hud__mode-progress { display: none; height: 3px; margin-top: 5px; overflow: hidden; background: #493445; transform: skewX(-12deg); }
.pod-hud__mode-status.has-progress .pod-hud__mode-progress { display: block; }
.pod-hud__mode-progress > i { display: block; width: 0; height: 100%; background: var(--pod-green); transition: width 100ms linear; }

.pod-hud__map {
  position: absolute;
  left: max(18px, env(safe-area-inset-left));
  top: 31%;
  z-index: 2;
  display: block;
  width: clamp(138px, 13vw, 184px);
  aspect-ratio: 1;
  padding: 8px;
  overflow: hidden;
  pointer-events: none;
  background: rgba(16, 11, 27, 0.78);
  border: 2px solid rgba(255, 243, 197, 0.72);
  border-left: 5px solid var(--pod-green);
  box-shadow: 5px 6px 0 rgba(16, 11, 27, 0.62);
  clip-path: polygon(0 10px, 10px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}
.pod-hud__map::after {
  content: "";
  position: absolute;
  inset: 5px;
  pointer-events: none;
  border-top: 1px solid rgba(120, 242, 154, 0.42);
  border-bottom: 1px solid rgba(120, 242, 154, 0.24);
  clip-path: inherit;
}
.pod-hud__minimap { display: block; width: 100%; height: 100%; }

.pod-hud__course-progress {
  position: absolute;
  right: max(16px, env(safe-area-inset-right));
  top: 21%;
  width: 58px;
  height: 45%;
  min-height: 245px;
  max-height: 430px;
  z-index: 2;
  overflow: visible;
}

.pod-hud__course-progress-rail {
  position: absolute;
  right: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--pod-sand);
  box-shadow: 3px 3px 0 rgba(16, 11, 27, 0.55);
}

.pod-hud__course-progress-rail > [data-course-checkpoint] {
  position: absolute;
  left: 50%;
  width: 18px;
  height: 2px;
  background: var(--pod-paper);
  transform: translate(-50%, 50%);
}

.pod-hud__course-progress-rail > [data-course-checkpoint]::after {
  content: "";
  position: absolute;
  left: 8px;
  top: -3px;
  width: 2px;
  height: 8px;
  background: var(--pod-paper);
}

.pod-hud__course-progress-rail > [data-course-checkpoint="finish"] { top: 0; }
.pod-hud__course-progress-rail > [data-course-checkpoint="75"] { top: 25%; }
.pod-hud__course-progress-rail > [data-course-checkpoint="50"] { top: 50%; }
.pod-hud__course-progress-rail > [data-course-checkpoint="25"] { top: 75%; }
.pod-hud__course-progress-rail > [data-course-checkpoint="start"] { bottom: 0; }

.pod-hud__course-finish-flag {
  position: absolute;
  right: -1px;
  top: -15px;
  width: 20px;
  height: 14px;
  border: 2px solid var(--pod-paper);
  background:
    conic-gradient(var(--pod-paper) 25%, var(--pod-ink) 0 50%, var(--pod-paper) 0 75%, var(--pod-ink) 0) 0 0 / 8px 8px;
  box-shadow: 3px 3px 0 var(--pod-ink);
  transform: skewX(-5deg);
}

.pod-hud__course-finish-flag::before {
  content: "";
  position: absolute;
  right: -4px;
  top: -3px;
  width: 2px;
  height: 21px;
  background: var(--pod-paper);
}

.pod-hud__course-racer {
  --pod-course-progress: 0%;
  --pod-racer-offset: 0px;
  --pod-racer-color: var(--pod-orange);
  position: absolute;
  left: calc(50% + var(--pod-racer-offset));
  bottom: clamp(5px, var(--pod-course-progress), calc(100% - 5px));
  width: 11px;
  height: 11px;
  border: 2px solid var(--pod-ink);
  border-radius: 50%;
  background: var(--pod-racer-color);
  box-shadow: 0 0 0 2px var(--pod-paper), 2px 2px 0 var(--pod-ink);
  transform: translate(-50%, 50%);
}

.pod-hud__course-racer:nth-child(2) { --pod-racer-color: var(--pod-sky); }
.pod-hud__course-racer:nth-child(3) { --pod-racer-color: var(--pod-orange); }
.pod-hud__course-racer:nth-child(4) { --pod-racer-color: var(--pod-violet); }

.pod-hud__course-racer.is-player {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--pod-green);
  box-shadow: 0 0 0 2px var(--pod-paper), 3px 3px 0 var(--pod-ink);
}

.pod-hud__course-racer.is-player::before {
  content: "";
  position: absolute;
  right: 15px;
  top: 1px;
  width: 12px;
  height: 9px;
  background: var(--pod-green);
  clip-path: polygon(0 0, 100% 50%, 0 100%, 26% 50%);
}

.pod-hud__corner {
  --pod-player-progress: 0%;
  position: absolute;
  right: 35px;
  bottom: clamp(5px, var(--pod-player-progress), calc(100% - 5px));
  z-index: 3;
  width: 92px;
  height: 36px;
  padding: 10px 7px 4px 40px;
  background: rgba(16, 11, 27, 0.82);
  border-left: 2px solid var(--pod-green);
  clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
  transform: translateY(50%);
}

.pod-hud__corner::after {
  content: "";
  position: absolute;
  right: -15px;
  top: 17px;
  width: 15px;
  height: 2px;
  background: var(--pod-green);
}

.pod-hud__corner-arrow {
  position: absolute;
  left: 4px;
  top: 3px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  color: var(--pod-green);
  border: 2px solid var(--pod-green);
  border-radius: 50%;
  font-family: sans-serif;
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
}

.pod-hud__corner-distance { font-size: 13px; font-weight: 1000; line-height: 1; white-space: nowrap; }

/* Compact lower-left telemetry: vertical, segmented, glance-only pips. */
.pod-hud__telemetry {
  position: absolute;
  left: max(22px, env(safe-area-inset-left));
  bottom: max(22px, env(safe-area-inset-bottom));
  width: 54px;
  height: 116px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  padding: 8px 7px 7px;
  background: rgba(16, 11, 27, 0.9);
  border-bottom: 4px solid var(--pod-orange);
  clip-path: polygon(0 7px, 7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%);
}

.pod-hud__telemetry .pod-hud__meter {
  display: grid;
  grid-template-rows: 11px 1fr;
  justify-items: center;
  min-width: 0;
  margin: 0;
}

.pod-hud__telemetry .pod-hud__meter-head { display: block; margin: 0; }
.pod-hud__telemetry .pod-hud__meter-head .pod-hud__label { font-size: 6px; letter-spacing: 0.03em; }
.pod-hud__telemetry .pod-hud__meter-head .pod-hud__label { font-size: 0; }
.pod-hud__telemetry .pod-hud__meter--heat .pod-hud__label::after,
.pod-hud__telemetry .pod-hud__meter--damage .pod-hud__label::after { font-size: 8px; letter-spacing: 0; }
.pod-hud__telemetry .pod-hud__meter--heat .pod-hud__label::after { content: "H"; color: var(--pod-orange); }
.pod-hud__telemetry .pod-hud__meter--damage .pod-hud__label::after { content: "D"; color: var(--pod-red); }
.pod-hud__telemetry .pod-hud__meter-track {
  position: relative;
  width: 11px;
  height: 84px;
  overflow: hidden;
  background: repeating-linear-gradient(to top, #443244 0 7px, var(--pod-ink) 7px 10px);
  border: 1px solid #6a4b5e;
  transform: none;
}

.pod-hud__telemetry .pod-hud__meter-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100% !important;
  height: var(--pod-meter-value, 0%);
  transition: height 80ms linear;
}

.pod-hud__telemetry .pod-hud__meter--heat .pod-hud__meter-fill { background: repeating-linear-gradient(to top, var(--pod-orange) 0 7px, transparent 7px 10px); }
.pod-hud__telemetry .pod-hud__meter--damage .pod-hud__meter-fill { background: repeating-linear-gradient(to top, var(--pod-red) 0 7px, transparent 7px 10px); }
.pod-hud__telemetry.is-hot .pod-hud__meter--heat .pod-hud__label,
.pod-hud__telemetry.is-damaged .pod-hud__meter--damage .pod-hud__label { color: var(--pod-red); }

.pod-hud__galactic {
  position: absolute;
  inset: 0;
  z-index: 2;
  visibility: hidden;
}

.pod-hud__galactic.is-visible { visibility: visible; }

.pod-hud__systems-cluster {
  position: absolute;
  left: max(82px, calc(env(safe-area-inset-left) + 82px));
  bottom: max(22px, env(safe-area-inset-bottom));
  width: 180px;
  height: 116px;
  padding: 5px;
  color: var(--pod-paper);
  background: rgba(16, 11, 27, 0.9);
  border: 2px solid #675060;
  border-left: 4px solid var(--pod-green);
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 13px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.pod-hud__combat-grid {
  display: grid;
  grid-template-columns: 1.08fr 0.92fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  width: 100%;
  height: 100%;
}

.pod-hud__combat-slot {
  --pod-system-accent: var(--pod-sky);
  --pod-readiness-angle: 0deg;
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  background: #211428;
  border: 2px solid #4c394b;
  box-shadow: inset 0 -4px 0 var(--pod-system-accent);
}

.pod-hud__combat-slot[data-ready="true"] { border-color: var(--pod-system-accent); }
.pod-hud__combat-slot--weapon { --pod-system-accent: var(--pod-sky); }
.pod-hud__combat-slot--shield { --pod-system-accent: var(--pod-green); }
.pod-hud__combat-slot--mine { --pod-system-accent: var(--pod-orange); }
.pod-hud__combat-slot--weapon { grid-row: 1 / 3; }

.pod-hud__combat-key {
  position: absolute;
  right: 3px;
  top: 3px;
  z-index: 3;
  display: inline-grid;
  place-items: center;
  min-width: 18px;
  height: 16px;
  padding: 0 3px;
  color: var(--pod-ink);
  background: var(--pod-paper);
  border: 1px solid var(--pod-ink);
  box-shadow: 1px 1px 0 var(--pod-system-accent);
  font-size: 9px;
  font-style: normal;
  letter-spacing: -0.03em;
  transform: skewX(-7deg);
}

.pod-hud__system-gauge {
  position: absolute;
  left: 7px;
  top: 6px;
  width: 37px;
  height: 37px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--pod-system-accent) 0 var(--pod-readiness-angle), #49384a var(--pod-readiness-angle) 360deg);
  transform: rotate(-35deg);
}

.pod-hud__system-gauge::before {
  content: "";
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  background: var(--pod-ink-soft);
  box-shadow: inset 0 0 0 1px #6c5266;
}

.pod-hud__system-icon {
  position: absolute;
  inset: 9px;
  z-index: 1;
  transform: rotate(35deg);
}

.pod-hud__combat-slot--weapon .pod-hud__system-icon::before,
.pod-hud__combat-slot--weapon .pod-hud__system-icon::after {
  content: "";
  position: absolute;
  left: 0;
  top: 5px;
  width: 18px;
  height: 3px;
  background: var(--pod-sky);
  box-shadow: 0 5px 0 var(--pod-paper);
  transform: rotate(-18deg);
}
.pod-hud__combat-slot--weapon .pod-hud__system-icon::after { left: 13px; top: 3px; width: 5px; height: 8px; border-radius: 50%; box-shadow: none; }

.pod-hud__combat-slot--shield .pod-hud__system-icon { border: 2px solid var(--pod-green); border-radius: 50% 50% 45% 45%; clip-path: polygon(50% 0, 100% 20%, 88% 76%, 50% 100%, 12% 76%, 0 20%); }
.pod-hud__combat-slot--shield .pod-hud__system-icon::after { content: ""; position: absolute; inset: 4px; border: 1px solid var(--pod-paper); border-radius: 50%; }

.pod-hud__combat-slot--mine .pod-hud__system-icon { background: var(--pod-orange); clip-path: polygon(50% 0, 61% 29%, 86% 14%, 71% 39%, 100% 50%, 71% 61%, 86% 86%, 61% 71%, 50% 100%, 39% 71%, 14% 86%, 29% 61%, 0 50%, 29% 39%, 14% 14%, 39% 29%); }
.pod-hud__combat-slot--mine .pod-hud__system-icon::after { content: ""; position: absolute; inset: 6px; border-radius: 50%; background: var(--pod-ink); }

.pod-hud__system-label {
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 3px;
  overflow: hidden;
  z-index: 4;
  padding: 1px 0;
  color: var(--pod-system-accent);
  background: rgba(16, 11, 27, 0.84);
  font-size: 6.5px;
  font-weight: 1000;
  letter-spacing: 0.055em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-hud__system-ammo { position: absolute; right: 5px; bottom: 17px; color: var(--pod-orange); font-size: 13px; font-style: italic; line-height: 1; }
.pod-hud__combat-charge { display: none; }
.pod-hud__galactic.is-shield-active .pod-hud__combat-slot--shield { background: #18352d; }

.pod-hud__context-action {
  position: absolute;
  left: 50%;
  bottom: max(24px, env(safe-area-inset-bottom));
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border: 3px solid var(--pod-paper);
  border-radius: 50%;
  background: rgba(16, 11, 27, 0.9);
  box-shadow: 4px 4px 0 var(--pod-ink), inset 0 0 0 3px #4c3849;
  transform: translateX(-50%);
}

.pod-hud__context-action::before,
.pod-hud__context-action::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  background: var(--pod-sand);
  transform: translate(-50%, -50%);
}
.pod-hud__context-action::before { width: 34px; height: 2px; }
.pod-hud__context-action::after { width: 2px; height: 34px; }

.pod-hud__target-reticle {
  position: relative;
  z-index: 1;
  width: 21px;
  height: 21px;
  border: 2px solid var(--pod-sand);
  border-radius: 50%;
}

.pod-hud__target-reticle::after { content: ""; position: absolute; left: 7px; top: 7px; width: 3px; height: 3px; border-radius: 50%; background: var(--pod-sand); }
.pod-hud__galactic.has-target .pod-hud__context-action { border-color: var(--pod-green); box-shadow: 4px 4px 0 var(--pod-ink), inset 0 0 0 3px rgba(120, 242, 154, 0.25); }
.pod-hud__galactic.has-target .pod-hud__context-action::before,
.pod-hud__galactic.has-target .pod-hud__context-action::after,
.pod-hud__galactic.has-target .pod-hud__target-reticle::after { background: var(--pod-green); }
.pod-hud__galactic.has-target .pod-hud__target-reticle { border-color: var(--pod-green); }
.pod-hud__upgrades { display: none; }

/* Bottom-right speed with drift and boost folded into the same silhouette. */
.pod-hud__speed {
  position: absolute;
  right: max(22px, env(safe-area-inset-right));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 2;
  width: 188px;
  height: 126px;
}

.pod-hud__speed-ring {
  --pod-speed-angle: 0deg;
  position: absolute;
  right: 0;
  bottom: 13px;
  width: 118px;
  height: 118px;
  border-radius: 50%;
  background: conic-gradient(from 226deg, var(--pod-paper) 0 var(--pod-speed-angle), rgba(255, 243, 197, 0.18) var(--pod-speed-angle) 268deg, transparent 268deg 360deg);
  filter: drop-shadow(4px 4px 0 var(--pod-ink));
}

.pod-hud__speed-ring::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: rgba(35, 19, 43, 0.86);
  box-shadow: inset 0 0 0 2px var(--pod-sand);
}

.pod-hud__speed-readout {
  position: absolute;
  right: 17px;
  top: 43px;
  width: 87px;
  text-align: center;
  transform: skewX(-5deg);
}

.pod-hud__speed-number {
  display: block;
  font-size: 33px;
  font-weight: 1000;
  font-style: italic;
  letter-spacing: -0.045em;
  line-height: 0.88;
  text-shadow: 3px 3px 0 var(--pod-ink);
}

.pod-hud__speed-unit { color: var(--pod-sand); font-size: 8px; font-weight: 1000; letter-spacing: 0.2em; }

.pod-hud__speed > .pod-hud__meter {
  position: absolute;
  width: 82px;
  bottom: 0;
  margin: 0;
}

.pod-hud__speed > .pod-hud__meter--drift { left: 5px; }
.pod-hud__speed > .pod-hud__meter--boost { right: 5px; }
.pod-hud__speed .pod-hud__meter-head { display: block; margin-bottom: 3px; }
.pod-hud__speed .pod-hud__meter-head .pod-hud__label { font-size: 7px; letter-spacing: 0.1em; }
.pod-hud__speed .pod-hud__meter-track { position: relative; height: 7px; overflow: hidden; background: var(--pod-ink); transform: skewX(-14deg); }
.pod-hud__speed .pod-hud__meter-fill { display: block; width: 0; height: 100%; transition: width 80ms linear; }
.pod-hud__speed .pod-hud__meter--boost .pod-hud__meter-fill { background: var(--pod-sky); }
.pod-hud__speed .pod-hud__meter--drift .pod-hud__meter-fill { background: var(--pod-violet); }
.pod-hud__speed.is-boosting .pod-hud__speed-ring { filter: drop-shadow(4px 4px 0 var(--pod-ink)) drop-shadow(0 0 5px var(--pod-sky)); }


/* -------------------------------------------------------------------------- */
/* Transient information and modal states.                                    */
/* -------------------------------------------------------------------------- */

.pod-hud__flight {
  position: absolute;
  left: 50%;
  top: 96px;
  z-index: 4;
  min-width: 238px;
  padding: 7px 16px 6px;
  display: grid;
  grid-template-columns: auto auto;
  grid-template-areas: "state clear" "motion motion";
  gap: 2px 16px;
  color: var(--pod-paper);
  background: rgba(16, 11, 27, 0.9);
  border-top: 3px solid var(--pod-green);
  border-bottom: 3px solid var(--pod-green);
  transform: translate(-50%, -7px) skewX(-7deg);
  visibility: hidden;
  opacity: 0;
}

.pod-hud__flight.is-visible { visibility: visible; opacity: 1; transform: translate(-50%, 0) skewX(-7deg); }
.pod-hud__flight-state { grid-area: state; color: var(--pod-green); font-size: 14px; font-weight: 1000; font-style: italic; letter-spacing: 0.13em; }
.pod-hud__flight strong { grid-area: clear; justify-self: end; font-size: 13px; }
.pod-hud__flight small { grid-area: motion; color: var(--pod-sand); font-size: 8px; font-weight: 1000; letter-spacing: 0.16em; text-align: center; }
.pod-hud__flight[data-motion="descending"] { border-color: var(--pod-orange); }
.pod-hud__flight[data-motion="descending"] .pod-hud__flight-state,
.pod-hud__flight[data-motion="descending"] small { color: var(--pod-orange); }

.pod-hud__galactic-alert {
  position: absolute;
  left: auto;
  right: max(82px, calc(env(safe-area-inset-right) + 70px));
  top: 106px;
  z-index: 5;
  min-width: 0;
  max-width: min(230px, calc(100vw - 110px));
  padding: 6px 12px 5px;
  color: var(--pod-paper);
  background: rgba(35, 19, 43, 0.78);
  border-left: 3px solid var(--pod-sky);
  border-bottom: 2px solid var(--pod-sky);
  text-align: right;
  transform: translate(8px, 0) skewX(-7deg);
  visibility: hidden;
  opacity: 0;
}

.pod-hud__galactic-alert.is-visible { visibility: visible; opacity: 1; transform: translate(0, 0) skewX(-7deg); }
.pod-hud__galactic-alert strong { display: block; color: var(--pod-sky); font-size: 10px; font-weight: 1000; font-style: italic; letter-spacing: 0.12em; }
.pod-hud__galactic-alert span { display: block; margin-top: 1px; color: var(--pod-sand); font-size: 7px; font-weight: 1000; letter-spacing: 0.1em; }
.pod-hud__galactic-alert.is-critical,
.pod-hud__galactic-alert.is-wrecked { border-color: var(--pod-red); }
.pod-hud__galactic-alert.is-critical strong,
.pod-hud__galactic-alert.is-wrecked strong { color: var(--pod-red); }
.pod-hud__galactic-alert.is-recovering { border-color: var(--pod-green); }
.pod-hud__galactic-alert.is-recovering strong { color: var(--pod-green); }
.pod-hud__galactic-alert.is-critical.is-visible { animation: pod-danger-flash 460ms steps(2, end) infinite; }

.pod-hud__wrong-way {
  position: absolute;
  left: 50%;
  top: 122px;
  z-index: 6;
  min-width: 270px;
  padding: 10px 30px;
  color: var(--pod-paper);
  background: var(--pod-red);
  border: 4px solid var(--pod-ink);
  box-shadow: 6px 6px 0 var(--pod-ink);
  font-size: clamp(22px, 3vw, 40px);
  font-weight: 1000;
  font-style: italic;
  letter-spacing: 0.08em;
  text-align: center;
  transform: translate(-50%, -16px) skewX(-7deg);
  visibility: hidden;
  opacity: 0;
}

.pod-hud__wrong-way.is-visible { visibility: visible; opacity: 1; transform: translate(-50%, 0) skewX(-7deg); animation: pod-danger-flash 500ms steps(2, end) infinite; }

.pod-hud__countdown {
  position: absolute;
  left: 50%;
  top: 34%;
  z-index: 6;
  width: 190px;
  height: 150px;
  display: grid;
  place-items: center;
  color: var(--pod-paper);
  font-size: clamp(78px, 10vw, 138px);
  font-weight: 1000;
  font-style: italic;
  line-height: 1;
  -webkit-text-stroke: 6px var(--pod-ink);
  paint-order: stroke fill;
  text-shadow: 7px 7px 0 var(--pod-orange);
  transform: translate(-50%, -50%) rotate(-5deg) scale(0.72);
  visibility: hidden;
  opacity: 0;
}

.pod-hud__countdown.is-visible { visibility: visible; opacity: 1; animation: pod-count-kick 850ms cubic-bezier(.16,.88,.25,1) both; }
.pod-hud__countdown.is-go {
  top: 34%;
  width: auto;
  color: var(--pod-green);
  font-size: clamp(64px, 8.5vw, 112px);
}

.pod-hud__launch {
  position: absolute;
  left: 50%;
  top: 80%;
  z-index: 6;
  width: min(350px, calc(100vw - 40px));
  padding: 10px 15px 9px;
  color: var(--pod-paper);
  background: rgba(16, 11, 27, 0.94);
  border: 3px solid var(--pod-ink);
  border-left: 7px solid var(--pod-green);
  box-shadow: 6px 7px 0 rgba(16, 11, 27, 0.54);
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 13px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  visibility: hidden;
  opacity: 0;
  transform: translate(-50%, 8px) skewX(-5deg);
  transition: opacity 90ms linear, transform 90ms steps(2, end);
}
.pod-hud__launch.is-visible { visibility: visible; opacity: 1; transform: translate(-50%, 0) skewX(-5deg); }
.pod-hud__launch header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
.pod-hud__launch header span { color: var(--pod-green); font-size: 7px; font-weight: 1000; letter-spacing: 0.18em; text-transform: uppercase; }
.pod-hud__launch header strong { font-size: 12px; font-style: italic; letter-spacing: 0.06em; text-transform: uppercase; }
.pod-hud__launch-track { position: relative; height: 17px; overflow: hidden; background: #39243d; border: 2px solid #6f4e63; box-shadow: inset 0 0 0 3px rgba(16, 11, 27, 0.5); }
.pod-hud__launch-track::before { content: ""; position: absolute; inset: 0; opacity: 0.28; background: repeating-linear-gradient(90deg, transparent 0 9%, var(--pod-paper) 9% 9.7%); }
.pod-hud__launch-sweet { position: absolute; top: 0; bottom: 0; left: 60%; width: 20%; background: var(--pod-green); box-shadow: 0 0 10px rgba(120, 242, 154, 0.68); }
.pod-hud__launch-needle { position: absolute; top: -3px; bottom: -3px; left: 0; width: 5px; background: var(--pod-paper); border: 1px solid var(--pod-ink); box-shadow: 2px 0 0 var(--pod-orange); transform: translateX(-50%); transition: left 55ms linear; }
.pod-hud__launch footer { display: grid; grid-template-columns: 1fr 74px; align-items: center; gap: 11px; margin-top: 6px; color: var(--pod-sand); font-size: 7px; font-weight: 1000; letter-spacing: 0.12em; }
.pod-hud__launch footer > i { display: block; height: 4px; overflow: hidden; background: #493445; transform: skewX(-12deg); }
.pod-hud__launch footer > i > i { display: block; width: 0; height: 100%; background: var(--pod-orange); }
.pod-hud__launch.is-hot footer > i > i { background: var(--pod-red); }
.pod-hud__launch[data-stage="result"] { top: 54%; width: min(330px, calc(100vw - 40px)); border-left-color: var(--pod-sky); }
.pod-hud__launch[data-stage="result"] .pod-hud__launch-track { display: none; }
.pod-hud__launch[data-stage="result"] footer { display: block; color: var(--pod-paper); text-align: center; }
.pod-hud__launch[data-stage="result"] footer > i { display: none; }
.pod-hud__launch[data-outcome="perfect"] { border-color: var(--pod-green); }
.pod-hud__launch[data-outcome="perfect"] header strong { color: var(--pod-green); }
.pod-hud__launch[data-outcome="bog"],
.pod-hud__launch[data-outcome="overheat"] { border-color: var(--pod-red); }
.pod-hud__launch[data-outcome="bog"] header strong,
.pod-hud__launch[data-outcome="overheat"] header strong { color: var(--pod-red); }

.pod-hud__director-event {
  position: absolute;
  left: 50%;
  top: 142px;
  z-index: 5;
  width: min(430px, calc(100vw - 180px));
  min-height: 42px;
  padding: 7px 18px 7px 92px;
  color: var(--pod-paper);
  background: linear-gradient(100deg, var(--pod-orange) 0 78px, rgba(16, 11, 27, 0.95) 78px 100%);
  border-bottom: 3px solid var(--pod-orange);
  clip-path: polygon(8px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%, 0 8px);
  visibility: hidden;
  opacity: 0;
  transform: translate(-50%, -6px) skewX(-6deg);
  transition: opacity 100ms linear, transform 100ms steps(2, end);
}
.pod-hud__director-event.is-visible { visibility: visible; opacity: 1; transform: translate(-50%, 0) skewX(-6deg); }
.pod-hud__director-event > span { position: absolute; left: 12px; top: 50%; width: 58px; color: var(--pod-ink); font-size: 7px; font-weight: 1000; letter-spacing: 0.12em; line-height: 1.15; text-align: center; text-transform: uppercase; transform: translateY(-50%); }
.pod-hud__director-event strong { display: block; color: var(--pod-orange); font-size: 12px; font-style: italic; letter-spacing: 0.09em; text-transform: uppercase; }
.pod-hud__director-event small { display: block; overflow: hidden; margin-top: 2px; color: var(--pod-sand); font-size: 7px; font-weight: 1000; letter-spacing: 0.08em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.pod-hud__director-event[data-phase="active"] { background: linear-gradient(100deg, var(--pod-red) 0 78px, rgba(16, 11, 27, 0.97) 78px 100%); border-color: var(--pod-red); }
.pod-hud__director-event[data-phase="active"] strong { color: var(--pod-red); }
.pod-hud__director-event[data-phase="end"] { background: linear-gradient(100deg, var(--pod-green) 0 78px, rgba(16, 11, 27, 0.92) 78px 100%); border-color: var(--pod-green); }
.pod-hud__director-event[data-phase="end"] strong { color: var(--pod-green); }
.pod-hud.has-director-event .pod-hud__flight { top: 198px; }

.pod-hud__threat-cues {
  position: absolute;
  inset: 0;
  z-index: 5;
  visibility: hidden;
  opacity: 0;
}
.pod-hud__threat-cues.is-visible { visibility: visible; opacity: 1; }
.pod-hud__threat-cue { position: absolute; display: grid; place-items: center; min-width: 33px; min-height: 33px; color: var(--pod-sand); background: rgba(16, 11, 27, 0.82); border: 2px solid currentColor; border-radius: 50%; box-shadow: 3px 3px 0 var(--pod-ink); transform: translate(-50%, -50%); }
.pod-hud__threat-cue b { display: block; font-size: 14px; line-height: 1; transform: rotate(var(--pod-threat-bearing)); }
.pod-hud__threat-cue span { position: absolute; left: 50%; top: calc(100% + 4px); max-width: 96px; overflow: hidden; padding: 2px 5px; color: var(--pod-paper); background: rgba(16, 11, 27, 0.86); font-size: 6px; font-style: normal; font-weight: 1000; letter-spacing: 0.08em; text-overflow: ellipsis; white-space: nowrap; transform: translateX(-50%); }
.pod-hud__threat-cue[data-kind="weapon"] { color: var(--pod-red); }
.pod-hud__threat-cue[data-kind="hazard"] { color: var(--pod-orange); }
.pod-hud__threat-cue[data-kind="rival"] { color: var(--pod-sky); }
.pod-hud__threat-cue.is-critical { color: var(--pod-red); animation: pod-threat-critical calc(720ms - var(--pod-threat-urgency) * 360ms) steps(2, end) infinite; }

.pod-hud__pause {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 10;
  width: min(470px, calc(100vw - 40px));
  padding: 25px 34px 28px;
  color: var(--pod-paper);
  background: #23132b;
  border: 4px solid var(--pod-ink);
  border-left: 9px solid var(--pod-green);
  box-shadow: 11px 13px 0 var(--pod-ink);
  text-align: center;
  transform: translate(-50%, -46%) rotate(-1.5deg);
  visibility: hidden;
  opacity: 0;
  pointer-events: auto;
}

.pod-hud__pause.is-visible { visibility: visible; opacity: 1; transform: translate(-50%, -50%) rotate(-1.5deg); }
.pod-hud__pause.has-settings { width: min(780px, calc(100vw - 34px)); max-height: calc(100vh - 34px); padding: 16px 19px 19px; transform: translate(-50%, -50%) rotate(0); }
.pod-hud__pause-home > span { display: block; color: var(--pod-green); font-size: 11px; font-weight: 1000; letter-spacing: 0.24em; }
.pod-hud__pause-home > strong { display: block; margin: 3px 0 9px; font-size: clamp(48px, 8vw, 82px); font-style: italic; line-height: 0.95; text-shadow: 6px 6px 0 var(--pod-orange); }
.pod-hud__pause-home > small { color: var(--pod-sand); font-size: 11px; font-weight: 900; letter-spacing: 0.1em; }
.pod-hud__pause.has-settings .pod-hud__pause-home { display: none; }
.pod-hud__pause button { appearance: none; height: 30px; padding: 0 13px; color: var(--pod-paper); background: #37203c; border: 1px solid #705368; border-radius: 0; font: 1000 9px/1 "Avenir Next Condensed", "Arial Narrow", sans-serif; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; }
.pod-hud__pause button:hover { color: var(--pod-ink); background: var(--pod-paper); }
.pod-hud__pause button:focus-visible { outline: 2px solid var(--pod-green); outline-offset: 2px; }
.pod-hud__pause-actions { display: flex; justify-content: center; gap: 8px; margin-top: 18px; }
.pod-hud__pause-actions button:first-child { color: var(--pod-ink); background: var(--pod-green); border-color: var(--pod-paper); }

.pod-hud__settings { display: none; text-align: left; }
.pod-hud__settings.is-visible { display: block; visibility: visible; opacity: 1; }
.pod-hud__settings > header { display: flex; min-height: 43px; align-items: center; justify-content: space-between; border-bottom: 2px solid #5a4053; }
.pod-hud__settings > header div { display: grid; }
.pod-hud__settings > header span { color: var(--pod-green); font-size: 8px; font-weight: 1000; letter-spacing: 0.18em; }
.pod-hud__settings > header strong { margin: 0; font-size: 24px; font-style: italic; line-height: 1; text-shadow: 3px 3px 0 var(--pod-orange); }
.pod-hud__settings > header button { width: 32px; padding: 0; color: var(--pod-ink); background: var(--pod-paper); font-size: 17px; }
.pod-hud__settings-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin: 9px 0; }
.pod-hud__settings-tabs button.is-selected { color: var(--pod-ink); background: var(--pod-sky); border-color: var(--pod-paper); }
.pod-hud__settings-page { min-height: 310px; max-height: min(430px, calc(100vh - 190px)); overflow: auto; scrollbar-color: var(--pod-orange) var(--pod-ink); }
.pod-hud__settings-page[hidden] { display: none; }
.pod-hud__settings-sliders { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-bottom: 9px; }
.pod-hud__settings-sliders label { position: relative; min-width: 0; padding: 7px 8px 8px; color: var(--pod-sand); background: #1b1022; border-left: 3px solid var(--pod-sky); font-size: 8px; font-weight: 1000; letter-spacing: 0.08em; }
.pod-hud__settings-sliders output { position: absolute; right: 8px; color: var(--pod-paper); }
.pod-hud__settings-sliders input[type="range"] { appearance: none; width: 100%; height: 7px; margin: 9px 0 0; background: #4a3548; border-radius: 0; }
.pod-hud__settings-sliders input[type="range"]::-webkit-slider-thumb { appearance: none; width: 13px; height: 17px; background: var(--pod-green); border: 2px solid var(--pod-ink); box-shadow: 2px 2px 0 var(--pod-orange); }
.pod-hud__settings-sliders--audio { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pod-hud__settings-toggles { display: grid; gap: 6px; }
.pod-hud__settings-toggles label { display: grid; grid-template-columns: 28px 1fr; align-items: center; min-height: 43px; padding: 6px 10px; color: var(--pod-paper); background: #1b1022; border-left: 4px solid var(--pod-violet); font-size: 10px; font-weight: 1000; letter-spacing: 0.08em; cursor: pointer; }
.pod-hud__settings-toggles input { appearance: none; width: 20px; height: 20px; margin: 0; background: #493549; border: 2px solid var(--pod-paper); }
.pod-hud__settings-toggles input:checked { background: var(--pod-green); box-shadow: inset 0 0 0 4px var(--pod-ink); }
.pod-hud__binding-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
.pod-hud__binding-row { display: grid; grid-template-columns: minmax(72px, 1fr) minmax(64px, 1fr) minmax(64px, 1fr); gap: 3px; align-items: center; min-width: 0; padding: 4px 5px; background: #1b1022; border-left: 3px solid #584055; }
.pod-hud__binding-row > span { overflow: hidden; color: var(--pod-sand); font-size: 7.5px; font-weight: 1000; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__binding-row button { height: 25px; overflow: hidden; padding: 0 5px; font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__capture-status { min-height: 21px; margin-top: 7px; padding: 5px 8px; color: var(--pod-muted); background: #1b1022; border-left: 3px solid var(--pod-sky); font-size: 8px; font-weight: 1000; letter-spacing: 0.08em; }
.pod-hud__capture-status.is-listening { color: var(--pod-ink); background: var(--pod-green); border-color: var(--pod-paper); }

.pod-hud__controls {
  position: absolute;
  left: 50%;
  bottom: 96px;
  z-index: 4;
  display: flex;
  gap: 10px;
  align-items: center;
  max-width: calc(100vw - 590px);
  padding: 7px 12px;
  overflow: hidden;
  color: var(--pod-paper);
  background: rgba(16, 11, 27, 0.82);
  border-top: 2px solid var(--pod-sand);
  border-bottom: 2px solid var(--pod-sand);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.07em;
  white-space: nowrap;
  transform: translateX(-50%);
  visibility: hidden;
  opacity: 0;
}

.pod-hud__controls.is-visible { visibility: visible; opacity: 1; }
.pod-hud__key { display: inline-grid; place-items: center; min-width: 20px; height: 18px; margin-right: 3px; padding: 0 3px; color: var(--pod-ink); background: var(--pod-paper); border: 2px solid var(--pod-ink); box-shadow: 2px 2px 0 var(--pod-orange); }

.pod-hud__results {
  position: absolute;
  left: 29%;
  top: 50%;
  z-index: 8;
  width: min(520px, calc(100vw - 38px));
  padding: 23px 25px 24px;
  color: var(--pod-paper);
  background: #23132b;
  border: 4px solid var(--pod-ink);
  border-left: 8px solid var(--pod-orange);
  box-shadow: 12px 14px 0 var(--pod-ink);
  clip-path: polygon(0 18px, 18px 0, calc(100% - 40px) 0, 100% 40px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 23px 100%, 0 calc(100% - 23px));
  transform: translate(-50%, -46%) scale(0.94) rotate(-1deg);
  visibility: hidden;
  opacity: 0;
  max-height: calc(100vh - 30px);
  overflow: auto;
  pointer-events: auto;
  touch-action: manipulation;
}

.pod-hud__results.is-visible { visibility: visible; opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(-1deg); }
[data-highlight-replay="true"] .pod-hud__results.is-visible { visibility: hidden; opacity: 0; pointer-events: none; transform: translate(-50%, -50%) scale(0.94) rotate(-1deg); }
[data-highlight-replay="true"]::after { content: attr(data-highlight-title); position: absolute; left: 50%; top: 7.5%; z-index: 24; max-width: min(680px, calc(100vw - 40px)); padding: 7px 15px 6px; overflow: hidden; color: var(--pod-ink); background: var(--pod-sand); border-left: 6px solid var(--pod-orange); box-shadow: 5px 5px 0 rgba(16, 11, 27, 0.82); font-size: 10px; font-weight: 1000; font-style: italic; letter-spacing: 0.15em; text-overflow: ellipsis; white-space: nowrap; transform: translateX(-50%) skewX(-7deg); }
.pod-hud__results-kicker { color: var(--pod-green); font-size: 11px; font-weight: 1000; letter-spacing: 0.25em; }
.pod-hud__results-title { margin: 2px 0 17px; font-size: clamp(35px, 5vw, 58px); font-weight: 1000; font-style: italic; letter-spacing: -0.055em; line-height: 0.95; text-shadow: 6px 6px 0 var(--pod-orange); }
.pod-hud__results-callout { margin: -7px 0 13px; padding: 7px 11px 6px; color: var(--pod-ink); background: linear-gradient(90deg, var(--pod-green) 0 72%, var(--pod-sand) 72%); border-left: 7px solid var(--pod-paper); font-size: 10px; font-weight: 1000; font-style: italic; letter-spacing: 0.14em; transform: skewX(-7deg); }
.pod-hud__result-highlight { display: none; position: relative; margin: 0 0 10px; padding: 8px 11px; background: #1a1021; border-left: 5px solid var(--pod-sky); }
.pod-hud__result-highlight.is-visible { display: grid; visibility: visible; opacity: 1; }
.pod-hud__result-highlight > span { color: var(--pod-sky); font-size: 7px; font-weight: 1000; letter-spacing: 0.18em; }
.pod-hud__result-highlight > strong { margin: 2px 0; color: var(--pod-paper); font-size: 17px; font-style: italic; }
.pod-hud__result-highlight > small { color: var(--pod-sand); font-size: 8px; font-weight: 900; letter-spacing: 0.06em; }
.pod-hud__result-highlight.is-photo-finish { background: #351827; border-left-color: var(--pod-red); box-shadow: inset 0 -3px 0 var(--pod-orange); }
.pod-hud__result-highlight.is-photo-finish > span { color: var(--pod-red); }
.pod-hud__result-highlight.is-photo-finish.is-win > strong { color: var(--pod-green); }
.pod-hud__results-list { display: grid; gap: 5px; }
.pod-hud__result-row { display: grid; grid-template-columns: 54px minmax(110px, 1fr) 108px 98px; align-items: center; min-height: 42px; padding: 5px 10px; background: var(--pod-ink-soft); border-left: 5px solid var(--pod-violet); font-size: 12px; font-weight: 900; }
.pod-hud__result-row.is-player { color: var(--pod-ink); background: var(--pod-paper); border-left-color: var(--pod-green); }
.pod-hud__result-place { color: var(--pod-sand); font-size: 20px; font-style: italic; }
.pod-hud__result-row.is-player .pod-hud__result-place { color: var(--pod-red); }
.pod-hud__result-time, .pod-hud__result-lap { text-align: right; }
.pod-hud__result-lap { color: var(--pod-muted); font-size: 10px; }
.pod-hud__result-row.is-player .pod-hud__result-lap { color: var(--pod-violet); }
.pod-hud__result-moments { display: none; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin-top: 9px; }
.pod-hud__result-moments.is-visible { display: grid; }
.pod-hud__result-moments button { appearance: none; min-width: 0; padding: 6px 8px; display: grid; pointer-events: auto; touch-action: manipulation; text-align: left; color: var(--pod-paper); background: #1a1021; border: 1px solid #60465a; border-left: 3px solid var(--pod-green); border-radius: 0; cursor: pointer; }
.pod-hud__result-moments button:hover { background: #35203a; border-color: var(--pod-paper); }
.pod-hud__result-moments button:focus-visible { outline: 3px solid var(--pod-green); outline-offset: 2px; }
.pod-hud__result-moments span { color: var(--pod-green); font-size: 6px; font-weight: 1000; letter-spacing: 0.12em; text-transform: uppercase; }
.pod-hud__result-moments strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__result-moments small { overflow: hidden; color: var(--pod-muted); font-size: 6.5px; text-overflow: ellipsis; white-space: nowrap; }
.pod-hud__results-footer { margin-top: 14px; color: var(--pod-sand); font-size: 9px; font-weight: 900; letter-spacing: 0.13em; }

.pod-hud[data-phase="finished"] .pod-hud__race,
.pod-hud[data-phase="finished"] .pod-hud__map,
.pod-hud[data-phase="finished"] .pod-hud__course-progress,
.pod-hud[data-phase="finished"] .pod-hud__corner,
.pod-hud[data-phase="finished"] .pod-hud__flight,
.pod-hud[data-phase="finished"] .pod-hud__speed,
.pod-hud[data-phase="finished"] .pod-hud__telemetry,
.pod-hud[data-phase="finished"] .pod-hud__galactic,
.pod-hud[data-phase="finished"] .pod-hud__galactic-alert { visibility: hidden; opacity: 0; }

.pod-hud.has-vehicle-selection > :not(.pod-hud__vehicle-select):not(.pod-hud__asset-status) { visibility: hidden !important; opacity: 0 !important; }

[data-high-contrast="true"] .pod-hud,
.pod-hud.is-high-contrast {
  --pod-paper: #fffbd8;
  --pod-panel: rgba(8, 5, 15, 0.97);
  --pod-panel-solid: #09060f;
  --pod-muted: #e1b8a2;
}
[data-high-contrast="true"] .pod-hud__combat-slot,
[data-high-contrast="true"] .pod-hud__systems-cluster,
.pod-hud.is-high-contrast .pod-hud__combat-slot,
.pod-hud.is-high-contrast .pod-hud__systems-cluster { background-color: #09060f; border-color: var(--pod-paper); }
[data-high-contrast="true"] .pod-hud__threat-cue,
.pod-hud.is-high-contrast .pod-hud__threat-cue { border-width: 4px; background: #09060f; box-shadow: 0 0 0 2px var(--pod-paper), 4px 4px 0 var(--pod-ink); }
[data-high-contrast="true"] .pod-hud__mode-status,
[data-high-contrast="true"] .pod-hud__launch,
[data-high-contrast="true"] .pod-hud__director-event,
.pod-hud.is-high-contrast .pod-hud__mode-status,
.pod-hud.is-high-contrast .pod-hud__launch,
.pod-hud.is-high-contrast .pod-hud__director-event { background-color: #09060f; filter: contrast(1.16); }

@keyframes pod-count-kick {
  0% { transform: translate(-50%, -50%) rotate(-10deg) scale(1.65); opacity: 0; }
  18% { opacity: 1; }
  72% { transform: translate(-50%, -50%) rotate(-5deg) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) rotate(-2deg) scale(0.86); opacity: 1; }
}

@keyframes pod-danger-flash { 0%, 48% { color: var(--pod-paper); } 49%, 100% { color: var(--pod-ink); } }
@keyframes pod-redline-critical {
  0%, 48% { background: #351827; box-shadow: 4px 4px 0 rgba(16, 11, 27, 0.8); }
  49%, 100% { background: var(--pod-red); box-shadow: 4px 4px 0 var(--pod-paper); }
}
@keyframes pod-threat-critical { 0%, 48% { transform: translate(-50%, -50%) scale(1); } 49%, 100% { transform: translate(-50%, -50%) scale(1.16); } }

@media (max-width: 900px), (max-height: 690px) {
  .pod-hud__vehicle-select { padding: 17px 26px; overflow-y: auto; place-items: start center; }
  .pod-hud__vehicle-select-frame { margin: auto 0; }
  .pod-hud__vehicle-select-head { margin-bottom: 11px; }
  .pod-hud__vehicle-select-head h1 { font-size: clamp(35px, 7vw, 54px); }
  .pod-hud__vehicle-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .pod-hud__vehicle-card { min-height: 264px; padding: 10px 11px 9px; border-top-width: 5px; }
  .pod-hud__vehicle-card h2 { min-height: 0; margin: 3px 0 4px; font-size: 17px; }
  .pod-hud__vehicle-preview { height: 80px; margin-bottom: 6px; }
  .pod-hud__vehicle-card-description { margin-bottom: 6px; font-size: 8px; }
  .pod-hud__vehicle-stats { grid-template-columns: 1fr 1fr; gap: 4px 10px; padding-top: 5px; }
  .pod-hud__vehicle-stat { grid-template-columns: 60px minmax(0, 1fr) 10px; font-size: 7.5px; }
  .pod-hud__vehicle-select-footer { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 11px; }
  .pod-hud__vehicle-select-footer > section { min-height: 148px; }
  .pod-hud__selector-controls { grid-column: 1 / -1; }
  .pod-hud__room { grid-column: auto; }

  .pod-hud__race { height: 80px; }
  .pod-hud__race-rail { top: 50px; }
  .pod-hud__race-stat, .pod-hud__race-time { top: 7px; }
  .pod-hud__race-value, .pod-hud__clock { font-size: 25px; }
  .pod-hud__split { top: 48px; }
  .pod-hud__redline-heat { top: 61px; }
  .pod-hud__mode-status { top: 78px; width: min(238px, 32vw); }
  .pod-hud__map { left: 10px; top: 29%; width: 116px; padding: 6px; }
  .pod-hud__director-event { top: 126px; }
  .pod-hud.has-director-event .pod-hud__flight { top: 181px; }
  .pod-hud__launch { top: 80%; }
  .pod-hud__course-progress { top: 19%; right: 8px; min-height: 200px; }
  .pod-hud__corner { right: 32px; width: 88px; }
  .pod-hud__telemetry { left: 10px; bottom: 10px; }
  .pod-hud__systems-cluster { left: 70px; bottom: 10px; width: 174px; }
  .pod-hud__speed { right: 10px; bottom: 8px; }
  .pod-hud__context-action { bottom: 10px; }
  .pod-hud__controls { display: none; }
  .pod-hud__results { left: 50%; }
  .pod-hud__workshop { position: fixed; left: 14px; right: 14px; bottom: 14px; height: min(560px, calc(100vh - 28px)); }
  .pod-hud__workshop-body { grid-template-columns: 1fr; overflow: auto; }
  .pod-hud__workshop-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: auto; }
}

@media (max-width: 590px) {
  .pod-hud__vehicle-select { padding: 13px; }
  .pod-hud__vehicle-cards { grid-template-columns: 1fr; }
  .pod-hud__vehicle-card { min-height: 205px; }
  .pod-hud__vehicle-preview { height: 72px; }
  .pod-hud__vehicle-select-footer { grid-template-columns: 1fr; gap: 8px; }
  .pod-hud__vehicle-select-footer > section { grid-column: auto; }
  .pod-hud__selector-control-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pod-hud__workshop-slots { grid-template-columns: 1fr; }
  .pod-hud__workshop-slot { height: 48px; }
  .pod-hud__workshop-parts { grid-template-columns: 1fr; }
  .pod-hud__workshop-summary { grid-template-columns: 1fr; }
  .pod-hud__settings-sliders,
  .pod-hud__settings-sliders--audio,
  .pod-hud__binding-list { grid-template-columns: 1fr; }
  .pod-hud__race-stat--lap { left: 2%; }
  .pod-hud__race-stat--position { right: 2%; }
  .pod-hud__race-value, .pod-hud__clock { font-size: 21px; }
  .pod-hud__race-stat, .pod-hud__race-time { width: 31vw; }
  .pod-hud__mode-status { top: 80px; width: 184px; padding-left: 11px; }
  .pod-hud__map { left: 7px; top: 32%; width: 98px; opacity: 0.9; }
  .pod-hud__mode-status > strong { display: none; }
  .pod-hud__director-event { top: 126px; width: calc(100vw - 34px); padding-left: 78px; }
  .pod-hud__director-event small { font-size: 6px; }
  .pod-hud__launch { top: 80%; }
  .pod-hud__course-progress { display: block; top: 22%; right: 3px; height: 34%; min-height: 180px; }
  .pod-hud__corner { right: 31px; width: 82px; padding-left: 36px; }
  .pod-hud__telemetry { width: 50px; }
  .pod-hud__systems-cluster { left: 65px; width: 156px; }
  .pod-hud__system-gauge { left: 5px; transform: rotate(-35deg) scale(0.88); transform-origin: center; }
  .pod-hud__system-label { left: 3px; font-size: 5.8px; }
  .pod-hud__speed { width: 164px; transform: scale(0.86); transform-origin: right bottom; }
  .pod-hud__context-action { bottom: 134px; }
  .pod-hud__result-row { grid-template-columns: 40px minmax(82px, 1fr) 79px; padding-inline: 8px; font-size: 11px; }
  .pod-hud__result-lap { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .pod-hud *, .pod-hud *::before, .pod-hud *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
  .pod-hud__countdown.is-visible { animation: none !important; transform: translate(-50%, -50%) rotate(-2deg) scale(0.86); opacity: 1; }
  .pod-hud__redline-heat.is-critical { animation: none !important; }
}

[data-reduced-motion="true"] .pod-hud *,
[data-reduced-motion="true"] .pod-hud *::before,
[data-reduced-motion="true"] .pod-hud *::after,
.pod-hud.is-reduced-motion *,
.pod-hud.is-reduced-motion *::before,
.pod-hud.is-reduced-motion *::after { animation: none !important; transition-duration: 1ms !important; }
`;

export const PODRACING_HUD_CSS = BASE_HUD_CSS + INKSTORM_HUD_CSS + BROADCAST_HUD_CSS + WORKSHOP_GRAPHIC_CSS + SIMPLE_RACE_SETUP_CSS + DUSK_UI_CSS;

export function installPodracingHudStyles(documentRoot: Document = document): HTMLStyleElement {
  const existing = documentRoot.getElementById(PODRACING_HUD_STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = documentRoot.createElement('style');
  style.id = PODRACING_HUD_STYLE_ID;
  style.textContent = PODRACING_HUD_CSS;
  documentRoot.head.append(style);
  return style;
}
