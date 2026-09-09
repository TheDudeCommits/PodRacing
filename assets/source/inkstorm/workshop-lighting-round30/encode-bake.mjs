/** Linear EXR to range-normalized sRGB PNG. Does not bake or edit geometry. */
import {readFile,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {EXRLoader} from 'three/examples/jsm/loaders/EXRLoader.js';
import {FloatType} from 'three';
const here=path.dirname(fileURLToPath(import.meta.url));
export const srgbEncode=x=>x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055;
export const srgbDecode=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
export const sha=x=>createHash('sha256').update(x).digest('hex');
export async function readEXR(file){const b=await readFile(file);return{...new EXRLoader().setDataType(FloatType).parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),bytes:b};}
function crc32(buffer){let c=0xffffffff;for(const v of buffer){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return(c^0xffffffff)>>>0;}
function chunk(name,data){const type=Buffer.from(name),head=Buffer.alloc(4),crc=Buffer.alloc(4);head.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([head,type,data,crc]);}
export function pngRGB(width,height,topDownRGB){
 assert.equal(topDownRGB.length,width*height*3);
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=2;
 const raw=Buffer.alloc(height*(width*3+1));for(let y=0;y<height;y++)raw.set(topDownRGB.subarray(y*width*3,(y+1)*width*3),y*(width*3+1)+1);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('sRGB',Buffer.from([0])),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
async function main(){
 const input=process.argv[2],output=process.argv[3],range=Number(process.argv[4]??4),gain=Number(process.argv[5]??1);
 assert(input&&output&&range>0&&gain>0,'EXR PNG [decodeRange=4] [gain=1]');
 const exr=await readEXR(path.resolve(here,input)),{width,height,data}=exr,channels=data.length/(width*height);assert([3,4].includes(channels));
 const rgb=Buffer.alloc(width*height*3),values=[],samples=[];
 let nonFinite=0,negative=0,clippedChannels=0,max=0,maxError=0,errorSum=0,nonzeroPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  // Three EXRLoader returns bottom-up rows; PNG rows are top-down.
  const source=((height-1-y)*width+x)*channels,target=(y*width+x)*3;
  let energy=0;
  for(let c=0;c<3;c++){
   const raw=data[source+c]*gain;if(!Number.isFinite(raw))nonFinite++;if(raw<0)negative++;if(raw>range)clippedChannels++;
   const linear=Math.max(0,Math.min(range,Number.isFinite(raw)?raw:0));max=Math.max(max,raw);
   const byte=Math.round(255*srgbEncode(linear/range));rgb[target+c]=byte;
   const error=Math.abs(srgbDecode(byte/255)*range-linear);maxError=Math.max(maxError,error);errorSum+=error;energy+=raw;
  }
  if(energy>1e-5){nonzeroPixels++;values.push(data[source]*gain);}
  if((x%127===0)&&(y%127===0))samples.push({x,y,linear:Array.from(data.slice(source,source+3)).map(v=>v*gain),encoded:Array.from(rgb.slice(target,target+3))});
 }
 values.sort((a,b)=>a-b);const pct=q=>values[Math.floor((values.length-1)*q)]??0;
 assert.equal(nonFinite,0);
 const png=pngRGB(width,height,rgb);await writeFile(path.resolve(here,output),png);
 const report={status:clippedChannels===0?'ENCODED_NO_CLIPPING':'ENCODED_CLIPPING_REQUIRES_REVIEW',sourceEXR:input,sourceEXRSha256:sha(exr.bytes),outputPNG:output,outputSha256:sha(png),width,height,decodeRange:range,gain,encoding:'sRGB transfer(linear white diffuse response * gain / decodeRange), RGB8 PNG; no view transform',orientation:'Three EXRLoader bottom-up -> PNG top-down; glTF UV V=1-BlenderV; runtime flipY=false',nonFinite,negative,clippedChannels,maximumLinear:max,nonzeroPixels,redNonzeroPercentiles:{p10:pct(.1),p50:pct(.5),p90:pct(.9),p99:pct(.99)},quantization:{maximumLinearError:maxError,meanLinearError:errorSum/(width*height*3)},pngBytes:png.length,gpuRGBA8WithMipsBytes:width*height*4*4/3,samples};
 await writeFile(path.resolve(here,output+'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,samples:samples.length},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
