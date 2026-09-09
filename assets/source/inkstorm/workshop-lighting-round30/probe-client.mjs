import {BufferGeometry,Float32BufferAttribute,InstancedMesh,Matrix4,OrthographicCamera,Scene,TextureLoader,WebGLRenderer,WebGLRenderTarget,ShaderMaterial,SRGBColorSpace,NearestFilter} from 'three';
import {InkstormSurfaceMaterial as Candidate} from './InkstormSurfaceMaterial.probe.ts';
const renderer=new WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(64,64);
const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),errors=[],checks=[];
const nativeError=console.error;console.error=(...args)=>{errors.push(args.map(String).join(' '));nativeError(...args);};
const camera=new OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=2;camera.lookAt(0,0,0);
const target=new WebGLRenderTarget(64,64,{depthBuffer:false,stencilBuffer:false});const pixels=new Uint8Array(64*64*4),scene=new Scene();
const texture=await new TextureLoader().loadAsync('./calibration-uv-gradient.png');texture.colorSpace=SRGBColorSpace;texture.flipY=false;texture.minFilter=NearestFilter;texture.magFilter=NearestFilter;texture.generateMipmaps=false;
const geom=new BufferGeometry();geom.setAttribute('position',new Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));geom.setAttribute('normal',new Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],3));geom.setAttribute('uv1',new Float32BufferAttribute([0,1,1,1,1,0,0,0],2));geom.setIndex([0,1,2,0,2,3]);
const owned=[];const check=(name,pass,evidence)=>checks.push({name,pass:!!pass,evidence});
function render(material){const mesh=new InstancedMesh(geom,material,1);mesh.setMatrixAt(0,new Matrix4());scene.add(mesh);renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,64,64,pixels);scene.remove(mesh);mesh.dispose();return pixels.slice();}
const sample=(p,x,y)=>Array.from(p.slice(4*(y*64+x),4*(y*64+x)+3));
try{
 const direct=new ShaderMaterial({uniforms:{map:{value:texture}},vertexShader:'attribute vec2 uv1; varying vec2 vUv; void main(){vUv=uv1;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',fragmentShader:'uniform sampler2D map;varying vec2 vUv;void main(){gl_FragColor=vec4(texture2D(map,vUv).rgb,1.);}',toneMapped:false});owned.push(direct);
 const gradient=render(direct),points=[[8,8],[55,8],[8,55],[55,55],[32,32]];
 const orientation=points.map(([x,y])=>({pixel:[x,y],actual:sample(gradient,x,y),expected:[255*(x+.5)/64,255*(y+.5)/64,0]}));
 check('Blender UV -> EXR -> sRGB PNG -> glTF-style UV1 orientation and linear decode',orientation.every(s=>s.actual.every((v,c)=>Math.abs(v-s.expected[c])<3)),orientation);
 const colors={cobalt:[.075,.16,.28],cream:[.58,.49,.31],cyan:[.1,.87,.79]};const materialResults=[];
 for(const family of ['pit-complex','pit-district'])for(const [name,color]of Object.entries(colors)){
  geom.setAttribute('color',new Float32BufferAttribute([...color,...color,...color,...color],3));
  const m=new Candidate(false,family,{texture,decodeRange:1});owned.push(m);m.uniforms.uSun.value.set(0,0,-1);m.uniforms.uMachineryPaintReady={value:0};
  const withBake=render(m);m.uniforms.uWorkshopDecodeRange.value=0;const noBake=render(m);
  const lit=sample(withBake,32,32),base=sample(noBake,32,32),delta=lit.map((v,i)=>v-base[i]);
  materialResults.push({family,color:name,lit,base,delta});
 }
 check('Both actual staged family shader variants compile and reflective colors receive the bake',materialResults.filter(x=>x.color!=='cyan').every(x=>x.delta[0]>2&&x.delta[1]>2),materialResults.filter(x=>x.color!=='cyan'));
 check('True authored cyan remains excluded from baked diffuse',materialResults.filter(x=>x.color==='cyan').every(x=>x.delta.every(n=>n===0)),materialResults.filter(x=>x.color==='cyan'));
 check('No shader or WebGL errors',errors.length===0&&gl.getError()===gl.NO_ERROR,errors);
 const canvas=document.querySelector('#preview');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d'),display=new ImageData(new Uint8ClampedArray(gradient),64,64);const tiny=document.createElement('canvas');tiny.width=64;tiny.height=64;tiny.getContext('2d').putImageData(display,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(tiny,0,0,256,256);
 const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',scope:'Actual GPU source shader and numerical UV/encoding probe; not source bay art, game A/B, texture seams, occlusion or performance acceptance.',gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'unavailable',checks};window.__ROUND30_PROBE__=report;document.querySelector('#status').textContent=JSON.stringify(report,null,2);await fetch('/__result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({report,preview:canvas.toDataURL()})});
}catch(e){const report={status:'ERROR',error:String(e),stack:e.stack,checks,errors};window.__ROUND30_PROBE__=report;document.querySelector('#status').textContent=JSON.stringify(report);await fetch('/__result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({report})});}
finally{owned.forEach(m=>m.dispose());geom.dispose();texture.dispose();target.dispose();renderer.dispose();renderer.forceContextLoss();}
