const fonts={orbitron:{name:'Orbitron',letter:'A',weight:700},audiowide:{name:'Audiowide',letter:'B',weight:400},tektur:{name:'Tektur',letter:'C',weight:700},zendots:{name:'Zen Dots',letter:'D',weight:400}};
const frame=document.querySelector('#game');
let selected=fonts[location.hash.slice(1)]?location.hash.slice(1):'orbitron';
function applyFont(){
  const doc=frame.contentDocument;
  if(!doc?.head)return;
  if(!doc.documentElement.dataset.typePreviewKeys){
    doc.documentElement.dataset.typePreviewKeys='true';
    doc.addEventListener('keydown',event=>{if(event.key==='Escape')setExpanded(false);});
  }
  if(!doc.querySelector('#type-font-files')){
    const link=doc.createElement('link');link.id='type-font-files';link.rel='stylesheet';link.href='/style-lab/fonts.css';doc.head.append(link);
  }
  let style=doc.querySelector('#type-preview');
  if(!style){style=doc.createElement('style');style.id='type-preview';doc.head.append(style);}
  const font=fonts[selected];
  style.textContent=`.pod-hud .simple-setup{--ui-heading:'${font.name}',sans-serif!important}.pod-hud .simple-setup :is(.setup-mode-caption strong,.setup-racer>strong,.setup-map-caption strong,.setup-roster-heading h2,.setup-map-heading h2,.pod-hud__garage-name h1,.pod-hud__start-button,.setup-tools>button,.setup-drawer>summary){font-weight:${font.weight}!important}`;
}
function choose(key){
  selected=key;const font=fonts[key];
  document.querySelectorAll('[data-font]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.font===key)));
  document.querySelector('#preview-title').textContent=`${font.letter} / ${font.name}`;
  history.replaceState(null,'',`#${key}`);applyFont();
}
document.querySelectorAll('[data-font]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.font)));
frame.addEventListener('load',applyFont);
const expand=document.querySelector('.expand');
function setExpanded(value){document.querySelector('.tryout').classList.toggle('expanded',value);expand.setAttribute('aria-pressed',String(value));expand.textContent=value?'Close preview ×':'Expand preview ↗';document.body.style.overflow=value?'hidden':'';}
expand.addEventListener('click',()=>setExpanded(expand.getAttribute('aria-pressed')!=='true'));
document.addEventListener('keydown',event=>{if(event.key==='Escape')setExpanded(false);});
const gallery=[['mode-battle','Battle'],['mode-race','Race'],['mode-trial','Time Trial'],['mode-cup','World Cup'],['map-desert','Dune Sea'],['map-frozen','Frostline'],['map-volcanic','Ember Rift'],['map-jungle','Verdant Run']];
for(const [key,label] of gallery){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=`/assets/inkstorm/home/${key}-chrome.webp`;img.alt=`${label} illustrated menu artwork`;img.width=960;img.height=540;img.loading='lazy';caption.textContent=label;figure.append(img,caption);document.querySelector('#art-grid').append(figure);}
choose(selected);
