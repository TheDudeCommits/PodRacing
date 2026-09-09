"""Sample CC0 source values/AO into restricted vertex paint; no raster edits."""
from pathlib import Path
import json,struct,math
from PIL import Image
ROOT=Path(__file__).resolve().parent

def clamp(x):return max(0,min(1,x))
def mix(a,b,t):return [a[i]*(1-t)+b[i]*t for i in range(3)]
def color(value,ao):
    t=clamp(value*.84+.16)
    if t<.40:c=mix((.105,.038,.070),(.46,.128,.065),t/.40)
    elif t<.75:c=mix((.46,.128,.065),(.78,.265,.095),(t-.40)/.35)
    else:c=mix((.78,.265,.095),(.95,.60,.255),(t-.75)/.25)
    return mix(c,(.105,.055,.12),clamp((1-ao)*1.45)*.53)

def sample(image,uv):
    w,h=image.size;p=image.load();x=clamp(uv[0])*(w-1);y=clamp(uv[1])*(h-1)
    x0=int(x);y0=int(y);x1=min(w-1,x0+1);y1=min(h-1,y0+1);tx=x-x0;ty=y-y0
    return [(p[x0,y0][c]*(1-tx)*(1-ty)+p[x1,y0][c]*tx*(1-ty)+p[x0,y1][c]*(1-tx)*ty+p[x1,y1][c]*tx*ty)/255 for c in range(3)]
for name in ['rock_face_02','rock_face_01']:
    meta=json.loads((ROOT/(name+'-vertex-input.json')).read_text())
    diffuse=Image.open(ROOT/'originals'/name/'textures'/(name+'_diff_1k.jpg')).convert('RGB')
    arm=Image.open(ROOT/'originals'/name/'textures'/(name+'_arm_1k.jpg')).convert('RGB')
    lum=[];ao=[]
    for uv in meta['uv']:
        rgb=sample(diffuse,uv);lin=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        lum.append(lin[0]*.2126+lin[1]*.7152+lin[2]*.0722);ao.append(sample(arm,uv)[0])
    ordered=sorted(lum);lo=ordered[int(len(ordered)*.04)];hi=ordered[int(len(ordered)*.95)]
    colors=[]
    for l,a in zip(lum,ao):colors.extend(color(round(clamp((l-lo)/(hi-lo))*14)/14,a))
    (ROOT/(name+'-vertex-colors.bin')).write_bytes(struct.pack('<'+'f'*len(colors),*colors))
    (ROOT/(name+'-paint-summary.json')).write_text(json.dumps({'asset':name,'vertices':len(lum),'luminanceQuantiles':[lo,hi],'meanSourceAO':sum(ao)/len(ao),'sampling':'bilinear source glTF UV coordinates into original 1k diffuse luminance and ARM red AO; original chroma discarded; 14 tonal levels into Inkstorm palette','texturesEdited':False},indent=2)+'\n')
    print(name,len(lum),'painted vertices')
