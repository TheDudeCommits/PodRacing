import {BufferGeometry,Float32BufferAttribute,InstancedMesh,Matrix4,OrthographicCamera,Scene,TextureLoader,WebGLRenderer,WebGLRenderTarget,Vector3} from 'three';
import {InkstormSurfaceMaterial as Current} from '/src/render/inkstorm/InkstormSurfaceMaterial.ts';
import {InkstormSurfaceMaterial as Original} from './service-probe-original.ts';
const data=await fetch('./service-probe-palette.json').then(r=>r.json());
const palette=[...data.allMutedBlue,...data.allCyan], blueCount=data.allMutedBlue.length;
const renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(240,240);
const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
const gpu=ext?{vendor:gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}:{renderer:'unavailable'};
const errors=[],nativeError=console.error;console.error=(...args)=>{errors.push(args.map(String).join(' '));nativeError(...args);};
const paint=await new TextureLoader().loadAsync('/assets/inkstorm/machinery-paint.png');
const side=Math.ceil(Math.sqrt(palette.length)),cell=6,size=side*cell;
const target=new WebGLRenderTarget(size,size,{depthBuffer:false,stencilBuffer:false});
const resultPixels=new Uint8Array(size*size*4);
const owned=[];
function geometry(task) {
  const p=[],n=[],c=[],idx=[],unit=task?.075:1;
  const center=task?[-49.1,4.6,-4]:[0,0,0];
  palette.forEach((color,i)=>{
    const x=((i%side)+.5-side/2)*unit,y=(Math.floor(i/side)+.5-side/2)*unit,b=i*4;
    for(const [dx,dy] of [[-.46,-.46],[.46,-.46],[.46,.46],[-.46,.46]]) {
      p.push(center[0]+x+dx*unit,task?center[1]:y+dy*unit,task?center[2]-y-dy*unit:0);
      n.push(...(task?[0,1,0]:[0,0,1]));c.push(...color.rgb);
    }
    idx.push(b,b+1,b+2,b,b+2,b+3);
  });
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('normal',new Float32BufferAttribute(n,3));g.setAttribute('color',new Float32BufferAttribute(c,3));g.setIndex(idx);
  const camera=new OrthographicCamera(-side*unit/2,side*unit/2,side*unit/2,-side*unit/2,.1,500);
  camera.position.fromArray(center).add(new Vector3(...(task?[0,70,0]:[0,0,70])));if(task)camera.up.set(0,0,-1);
  camera.lookAt(new Vector3(...center));camera.updateMatrixWorld();
  owned.push(g);return{g,camera};
}
const flat=geometry(false),taskGeom=geometry(true);
const materials={original:new Original(false),current:new Current(false),originalTask:new Original(false,'pit-complex'),currentTask:new Current(false,'pit-complex')};
const scene=new Scene();
function render(version,{sun='lit',wear=false,task=false}={}) {
  const material=materials[version+(task?'Task':'')],geo=task?taskGeom:flat;
  material.uniforms.uSun.value.set(...(task?[.1,-1,.1]:[.1,0,sun==='lit'?1:-1])).normalize();
  // Own uniform cells isolate the probe from the module's shared paint cells.
  material.uniforms.uMachineryPaint={value:paint};material.uniforms.uMachineryPaintReady={value:wear?1:0};
  const mesh=new InstancedMesh(geo.g,material,1);mesh.setMatrixAt(0,new Matrix4());scene.add(mesh);
  renderer.setRenderTarget(target);renderer.setClearColor(0,1);renderer.clear();renderer.render(scene,geo.camera);
  renderer.readRenderTargetPixels(target,0,0,size,size,resultPixels);scene.remove(mesh);mesh.dispose();
  const samples=palette.map((_,i)=>{const x=(i%side)*cell+Math.floor(cell/2),y=Math.floor(i/side)*cell+Math.floor(cell/2),offset=(y*size+x)*4;return Array.from(resultPixels.slice(offset,offset+3));});
  return samples;
}
const luma=rgb=>(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])/255;
const difference=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
const checks=[],detail={};
function check(name,condition,evidence){checks.push({name,pass:!!condition,evidence});}
try {
  const oldLit=render('original'),oldShade=render('original',{sun:'shade'}),newLit=render('current'),newShade=render('current',{sun:'shade'});
  const ratios=(a,b)=>a.slice(0,blueCount).map((rgb,i)=>luma(rgb)/Math.max(.001,luma(b[i])));
  const oldRatio=ratios(oldLit,oldShade),newRatio=ratios(newLit,newShade);
  check('All exported muted blues regain strong direct sun response',newRatio.every(r=>r>2),{colors:blueCount,newMinimumRatio:Math.min(...newRatio),oldMaximumRatio:Math.max(...oldRatio)});
  const cyanDifference=palette.slice(blueCount).map((_,i)=>Math.max(difference(newLit[i+blueCount],oldLit[i+blueCount]),difference(newShade[i+blueCount],oldShade[i+blueCount])));
  check('Every exported true cyan color keeps the original lit/shaded emission',cyanDifference.every(n=>n<=1),{colors:cyanDifference.length,maximumByteDifference:Math.max(...cyanDifference)});
  const oldWear=render('original',{wear:true}),newWear=render('current',{wear:true});
  const oldWearDelta=oldWear.slice(0,blueCount).map((rgb,i)=>difference(rgb,oldLit[i])),newWearDelta=newWear.slice(0,blueCount).map((rgb,i)=>difference(rgb,newLit[i]));
  check('Real machinery paint texture affects cobalt again',newWearDelta.filter(d=>d>2).length/blueCount>.75&&oldWearDelta.every(d=>d===0),{changedNewColors:newWearDelta.filter(d=>d>2).length,colors:blueCount,maximumNewByteDifference:Math.max(...newWearDelta),maximumOldByteDifference:Math.max(...oldWearDelta)});
  // Use identical task-local geometry with the regular and workshop materials.
  const originalFlat=flat.g,originalCamera=flat.camera;flat.g=taskGeom.g;flat.camera=taskGeom.camera;
  // Baseline uses down-facing sun to match the task render's sun exactly.
  for(const m of Object.values(materials))m.uniforms.uSun.value.set(.1,-1,.1).normalize();
  const taskOld=render('original',{task:true}),taskNew=render('current',{task:true});
  // Turn off the family compile define in separate owned material clones, keeping geometry/sun identical.
  const baseline=(version)=>{
    const m=materials[version+'Task'],saved=m.defines;m.defines={};m.needsUpdate=true;
    const value=render(version,{task:true});m.defines=saved;m.needsUpdate=true;return value;
  };
  const noTaskOld=baseline('original'),noTaskNew=baseline('current');flat.g=originalFlat;flat.camera=originalCamera;
  const oldTaskDelta=taskOld.slice(0,blueCount).map((rgb,i)=>difference(rgb,noTaskOld[i])),newTaskDelta=taskNew.slice(0,blueCount).map((rgb,i)=>difference(rgb,noTaskNew[i]));
  check('Unchanged workshop lights now affect cobalt paint',newTaskDelta.every(d=>d>2)&&oldTaskDelta.every(d=>d===0),{colors:blueCount,minimumNewByteDifference:Math.min(...newTaskDelta),maximumOldByteDifference:Math.max(...oldTaskDelta)});
  check('Cyan remains excluded from added task diffuse',taskNew.slice(blueCount).every((rgb,i)=>difference(rgb,noTaskNew[i+blueCount])===0),{colors:palette.length-blueCount});
  check('GPU has no shader or WebGL errors',errors.length===0&&gl.getError()===gl.NO_ERROR,{errors});
  detail.representatives=data.representatives.map(r=>{const i=palette.findIndex(p=>difference(p.rgb,r.rgb)<1e-7);return{...r,oldLit:oldLit[i],oldShade:oldShade[i],newLit:newLit[i],newShade:newShade[i],oldWear:oldWear[i],newWear:newWear[i],oldTask:taskOld[i],newTask:taskNew[i]};});
  const canvas=document.querySelector('#preview'),ctx=canvas.getContext('2d');canvas.width=800;canvas.height=detail.representatives.length*27+35;
  ctx.fillStyle='#171724';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.font='11px monospace';ctx.fillStyle='white';ctx.fillText('Actual GPU samples: old sun / old shade / new sun / new shade / new wear / new task',8,15);
  const display=v=>Math.round(255*(v/255<=.0031308?12.92*v/255:1.055*Math.pow(v/255,1/2.4)-.055));
  detail.representatives.forEach((r,i)=>{const y=31+i*27;ctx.fillStyle='white';ctx.fillText(r.name,8,y+12);['oldLit','oldShade','newLit','newShade','newWear','newTask'].forEach((k,j)=>{ctx.fillStyle=`rgb(${r[k].map(display).join(',')})`;ctx.fillRect(350+j*71,y,64,20);});});
  const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',scope:'Actual WebGL2 GPU rendering of unchanged production material shaders on flat diagnostic geometry using actual exported COLOR_0 values and real machinery texture. Controlled uniforms; not in-world art, sun-shadow, or performance acceptance.',gpu,materialSha256:data.materialSha256,checks,...detail};
  window.__INKSTORM_SERVICE_PROBE__=report;document.querySelector('#status').textContent=JSON.stringify({status:report.status,gpu,checks},null,2);
  await fetch('/__service_probe_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({report,preview:canvas.toDataURL('image/png')})});
} catch(error) {window.__INKSTORM_SERVICE_PROBE__={status:'ERROR',error:String(error),stack:error.stack,checks};document.querySelector('#status').textContent=JSON.stringify(window.__INKSTORM_SERVICE_PROBE__);await fetch('/__service_probe_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({report:window.__INKSTORM_SERVICE_PROBE__})});}
finally{for(const m of Object.values(materials))m.dispose();for(const g of owned)g.dispose();paint.dispose();target.dispose();renderer.dispose();renderer.forceContextLoss();}
