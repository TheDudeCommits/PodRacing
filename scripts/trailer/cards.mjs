/**
 * Renders the trailer's typographic cards as transparent PNGs, using the game's
 * own shipped display faces and HUD palette so the titles match the product.
 * ffmpeg here is built without libfreetype, so type is set in a browser.
 *   node scripts/trailer/cards.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const out = 'output/trailer/cards';
await mkdir(out, { recursive: true });

const b64 = async (p) => (await readFile(p)).toString('base64');
const blackOps = await b64('public/fonts/inkstorm/BlackOpsOne-Regular.ttf');
const russo = await b64('public/fonts/inkstorm/RussoOne-Regular.ttf');
const chakra = await b64('public/fonts/inkstorm/ChakraPetch-Bold.ttf');

const ORANGE = '#f27858';
const SAND = '#eab88a';

const shell = (body, extra = '') => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Display;src:url(data:font/ttf;base64,${blackOps}) format('truetype')}
@font-face{font-family:Plate;src:url(data:font/ttf;base64,${russo}) format('truetype')}
@font-face{font-family:UI;src:url(data:font/ttf;base64,${chakra}) format('truetype')}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;background:transparent;overflow:hidden}
body{display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}
${extra}</style>${body}`;

const pages = [
  // The main title, echoing the reference's neon-outline plate on smoke.
  { name: 'title', html: shell(`<div class="wrap">
      <div class="kicker">EIGHT PODS &middot; ONE CIRCUIT &middot; NO MERCY</div>
      <h1>NOW THIS IS<br><span>PODRACING</span></h1>
      <div class="rule"></div>
    </div>`, `
    .wrap{display:flex;flex-direction:column;align-items:center;gap:26px}
    .kicker{font-family:UI;font-size:26px;letter-spacing:.42em;color:${SAND};text-shadow:0 2px 18px #000,0 0 40px #000;padding-left:.42em}
    h1{font-family:Display;font-size:132px;line-height:.98;letter-spacing:.02em;color:#fff2e4;
       text-shadow:0 0 2px ${ORANGE},0 0 26px ${ORANGE}cc,0 0 70px ${ORANGE}80,0 6px 36px #000;}
    h1 span{color:${ORANGE};text-shadow:0 0 3px #fff2e4,0 0 30px ${ORANGE},0 0 90px ${ORANGE}aa,0 6px 36px #000}
    .rule{width:520px;height:3px;background:linear-gradient(90deg,transparent,${ORANGE},transparent);box-shadow:0 0 22px ${ORANGE}}
  `) },
  // End card: where to actually play it.
  { name: 'endcard', html: shell(`<div class="wrap">
      <h1>NOW THIS IS PODRACING</h1>
      <div class="rule"></div>
      <div class="url">now-this-is-podracing.vercel.app</div>
      <div class="sub">PLAY FREE IN YOUR BROWSER</div>
    </div>`, `
    .wrap{display:flex;flex-direction:column;align-items:center;gap:22px}
    h1{font-family:Display;font-size:72px;letter-spacing:.02em;color:#fff2e4;
       text-shadow:0 0 2px ${ORANGE},0 0 24px ${ORANGE}cc,0 6px 30px #000}
    .rule{width:620px;height:3px;background:linear-gradient(90deg,transparent,${ORANGE},transparent);box-shadow:0 0 22px ${ORANGE}}
    .url{font-family:Plate;font-size:46px;letter-spacing:.06em;color:${ORANGE};text-shadow:0 0 26px ${ORANGE}99,0 4px 22px #000}
    .sub{font-family:UI;font-size:25px;letter-spacing:.4em;color:${SAND};text-shadow:0 2px 16px #000;padding-left:.4em}
  `) },
];

// Single-word stabs punched between montage shots.
for (const [name, word, sub] of [
  ['stab-race', 'RACE', 'EIGHT PODS. ONE LINE.'],
  ['stab-fight', 'FIGHT', 'HEAT LANCE // SHIELD // MINES'],
  ['stab-survive', 'SURVIVE', 'FINISH OR BURN'],
]) {
  pages.push({ name, html: shell(`<div class="wrap"><h1>${word}</h1><div class="sub">${sub}</div></div>`, `
    .wrap{display:flex;flex-direction:column;align-items:center;gap:18px}
    h1{font-family:Display;font-size:170px;letter-spacing:.04em;color:#fff2e4;
       text-shadow:0 0 2px ${ORANGE},0 0 30px ${ORANGE},0 0 90px ${ORANGE}99,0 8px 40px #000}
    .sub{font-family:UI;font-size:28px;letter-spacing:.34em;color:${SAND};text-shadow:0 2px 16px #000;padding-left:.34em}
  `) });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (const p of pages) {
  await page.setContent(p.html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${out}/${p.name}.png`, omitBackground: true });
  console.log('card', p.name);
}
await browser.close();
