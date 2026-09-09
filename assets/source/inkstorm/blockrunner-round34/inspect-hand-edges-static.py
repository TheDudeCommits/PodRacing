"""External diagnostic only: source bytes read; no Blender/source mutation."""
from source_geometry_analysis_helpers import read_glb, SOURCE, EXPECTED_SHA, PILOT
import hashlib, math, collections, json
blob=SOURCE.read_bytes(); assert hashlib.sha256(blob).hexdigest()==EXPECTED_SHA
m=read_glb(blob)[PILOT]; p=m['positions']
for side,sign in [('negativeX',-1),('positiveX',1)]:
    selected={i for i,q in enumerate(p) if q[0]*sign>.15 and q[1]<-20.49 and 2.29<q[2]<2.58}
    edges=set()
    for f in m['faces']:
        for a,b in zip(f,f[1:]+f[:1]):
            if a in selected and b in selected:
                edges.add(tuple(sorted((p[a],p[b]))))
    histogram=collections.defaultdict(list)
    for a,b in edges:
        d=[b[k]-a[k] for k in range(3)]; length=math.sqrt(sum(v*v for v in d)); axis=[v/length for v in d]
        if max(axis,key=abs)<0: axis=[-v for v in axis]
        key=tuple(round(v,3) for v in axis)
        histogram[key].append((length,a,b))
    groups=sorted(histogram.items(),key=lambda z:-len(z[1]))
    print(side,'points',len(set(p[i] for i in selected)),'edges',len(edges))
    for axis,rows in groups[:15]: print(axis,len(rows),'lengths',sorted(set(round(r[0],5) for r in rows)))
    for axis,rows in groups[:3]:
        print('EXAMPLES',axis,json.dumps(rows[:8]))
assert SOURCE.read_bytes()==blob
