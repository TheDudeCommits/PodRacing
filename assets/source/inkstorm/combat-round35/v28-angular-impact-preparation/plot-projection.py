from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
p=Path(__file__).parent;data=json.loads((p/'front-projection.json').read_text())
font='/System/Library/Fonts/Supplemental/Arial.ttf'
def ft(n):return ImageFont.truetype(font,n)
im=Image.new('RGB',(1540,810),'#f7f6f2');d=ImageDraw.Draw(im)
d.text((28,20),'V28 actual front-source silhouette: fixed runtime side view',font=ft(27),fill='#17232a')
d.text((28,59),'CPU source-data projection. Centers aligned; same camera and scale. No terrain / gameplay render or native acceptance claim.',font=ft(17),fill='#56626a')
labels=['Roll only, contact','Pitch + roll, 0.13 s','Pitch + roll, 0.40 s','Pitch + roll, 0.50 s','Final roof rest, 0.90 s']
sets=[]
for a in data:sets.append([a['rollOnlyContact']]+[next(r for r in a['rows'] if r['age']==age) for age in [.13,.4,.5,.9]])
# All source hulls share one numeric scale; per-panel translation only.
span=max(max(max(p[0] for p in r['hull'])-min(p[0] for p in r['hull']),max(p[1] for p in r['hull'])-min(p[1] for p in r['hull'])) for rows in sets for r in rows)
scale=235/span
for iy,(a,rows) in enumerate(zip(data,sets)):
 y=130+iy*325;d.text((28,y-27),a['name'].upper()+f"  |  {rows[1]['sourceVertices']:,} actual source positions",font=ft(18),fill='#17232a')
 for ix,(r,label) in enumerate(zip(rows,labels)):
  x=28+ix*302;cx=x+139;cy=y+115;h=r['hull'];mx=(min(p[0] for p in h)+max(p[0] for p in h))/2;my=(min(p[1] for p in h)+max(p[1] for p in h))/2
  tr=lambda p:(cx+(p[0]-mx)*scale,cy+(p[1]-my)*scale)
  d.rounded_rectangle((x,y,x+282,y+289),8,fill='#ffffff',outline='#d7d9d9');d.text((x+12,y+10),label,font=ft(16),fill='#17232a')
  pts=[tr(p) for p in h];d.polygon(pts,fill='#dce4e8');d.line(pts+[pts[0]],fill='#364957',width=2)
  endpoints=[tr(p) for p in r['endpoints']];d.line(endpoints,fill='#b94925',width=3)
  for px,py in endpoints:d.ellipse((px-3,py-3,px+3,py+3),fill='#b94925')
  ang=r['screenAxisAngleDegrees'];ang=((ang+90)%180)-90
  d.text((x+12,y+248),f'Long axis: {ang:+.2f} deg',font=ft(16),fill='#b94925')
  if 'minimum' in r:d.text((x+12,y+269),f'Min actual gap: {r["minimum"]:.3f} m',font=ft(13),fill='#56626a')
d.text((28,778),'Outlines are convex hulls of every actual front POSITION vertex. Red lines join source longitudinal bounding-box end centers.',font=ft(16),fill='#56626a')
im.save(p/'actual-front-source-projection.png')
