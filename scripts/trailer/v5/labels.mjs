import {chromium} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
const root='output/trailer-v5/labels';await mkdir(root,{recursive:true});
const display=(await readFile('public/fonts/inkstorm/BlackOpsOne-Regular.ttf')).toString('base64');
const ui=(await readFile('public/fonts/inkstorm/ChakraPetch-Bold.ttf')).toString('base64');
const labels=[['teemto','TEEMTO','BALANCED'],['polwo','POLWO','AGILE'],['sebulba','SEBULBA','FAST'],['blockrunner','BLOCKRUNNER','HEAVY'],['drift','FIND YOUR LINE','DRIFT + BOOST'],['combat','FIGHT FOR IT','HEAT LANCE'],['shield','HOLD YOUR NERVE','ENERGY SHIELD'],['mine','LEAVE A SURPRISE','SCRAP MINES'],['tow','CATCH. RELEASE.','TOW CABLE'],['sprint','MAKE THEM CHASE','FINAL CHARGE']];
const browser=await chromium.launch();
try{const p=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
for(const[id,name,role]of labels){
 await p.setContent(`<style>@font-face{font-family:D;src:url(data:font/ttf;base64,${display})}@font-face{font-family:U;src:url(data:font/ttf;base64,${ui})}*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;background:transparent}.label{position:absolute;left:104px;top:814px;padding:0 0 0 23px;border-left:3px solid #ef7b48;color:#fff0df;text-shadow:0 2px 8px #000,0 2px 24px #000}.role{font:19px U;letter-spacing:5px;color:#efb889;margin-bottom:9px}.name{font:46px D;letter-spacing:1px}</style><div class=label><div class=role>${role}</div><div class=name>${name}</div></div>`);
 await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`${root}/${id}.png`,omitBackground:true});
}
}finally{await browser.close();}
