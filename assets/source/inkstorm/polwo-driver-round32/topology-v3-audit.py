"""Read-only GLB topology analysis. Exact POSITION welding is analysis-only."""
from pathlib import Path
import collections, hashlib, json, math, struct

HERE = Path(__file__).resolve().parent
PITCH = math.atan2(1.895, 8.38)
ANCHOR = (0, 5.2, 4.352532386779785)
PELVIS = (0, -.13, -.205)

def rx(v, angle):
    c, s = math.cos(angle), math.sin(angle)
    return (v[0], c*v[1]-s*v[2], s*v[1]+c*v[2])

def canonical(p, version):
    b = (p[0], -p[2], p[1])  # glTF Y-up -> author-fit Blender Z-up
    if version == 3:
        d = rx(tuple((b[i] - ANCHOR[i] - (0, 0, -.08)[i])/1.55 for i in range(3)), -PITCH)
    else:
        d = tuple(b[i]-ANCHOR[i] for i in range(3))
    d = rx((-d[0], -d[1], d[2]), -PITCH)  # inverse Rz(pi) Rx(pitch)
    return tuple(PELVIS[i]+d[i]/2.5 for i in range(3))

def fit_weight(c):
    a = max(0, min(1, (c[1]+.04)/.15))
    b = max(0, min(1, (c[2]+.18)/.045))
    return a*a*(3-2*a)*b*b*(3-2*b)

def load(path):
    raw = path.read_bytes()
    magic, version, total = struct.unpack_from('<III', raw)
    assert (magic, version, total) == (0x46546c67, 2, len(raw))
    n = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+n])
    bn, bt = struct.unpack_from('<II', raw, 20+n)
    assert bt == 0x004e4942
    return raw, doc, raw[28+n:28+n+bn]

def accessor(doc, data, index):
    a = doc['accessors'][index]
    assert 'sparse' not in a
    v = doc['bufferViews'][a['bufferView']]
    assert v.get('buffer', 0) == 0
    size = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}[a['type']]
    fmt = '<' + {5121:'B', 5123:'H', 5125:'I', 5126:'f'}[a['componentType']]*size
    width = struct.calcsize(fmt)
    start = v.get('byteOffset', 0)+a.get('byteOffset', 0)
    stride = v.get('byteStride', width)
    return [struct.unpack_from(fmt, data, start+i*stride) for i in range(a['count'])]

def analyze(path, version):
    raw, doc, data = load(path)
    report = {'path':str(path), 'sha256':hashlib.sha256(raw).hexdigest(), 'weld':'exact float32 POSITION tuples only; no tolerance, no asset mutation', 'meshes':[]}
    for node in doc['nodes']:
        if 'mesh' not in node or not any('pilot-'+part in node.get('name','') for part in ['suit', 'rubber']):
            continue
        assert not any(k in node for k in ['matrix', 'translation', 'rotation', 'scale'])
        for pi, primitive in enumerate(doc['meshes'][node['mesh']]['primitives']):
            assert primitive.get('mode', 4) == 4
            p = accessor(doc, data, primitive['attributes']['POSITION'])
            ids = [v[0] for v in accessor(doc, data, primitive['indices'])]
            unique, aliases, to_weld = [], [], []
            lookup = {}
            for index, point in enumerate(p):
                if point not in lookup:
                    lookup[point] = len(unique); unique.append(point); aliases.append([])
                wid = lookup[point]; to_weld.append(wid); aliases[wid].append(index)
            edges = collections.defaultdict(list)
            triangles = []
            degenerate = 0
            for i in range(0, len(ids), 3):
                tri = tuple(to_weld[j] for j in ids[i:i+3])
                if len(set(tri)) < 3:
                    degenerate += 1; continue
                triangles.append(tri)
                for a,b in zip(tri, tri[1:]+tri[:1]): edges[tuple(sorted((a,b)))].append((a,b,i//3))
            boundary = [v[0] for v in edges.values() if len(v) == 1]
            adjacent = collections.defaultdict(set)
            for a,b,_ in boundary:
                adjacent[a].add(b); adjacent[b].add(a)
            components, unseen = [], set(adjacent)
            while unseen:
                todo = [min(unseen)]; vertices = set()
                while todo:
                    a = todo.pop()
                    if a in vertices: continue
                    vertices.add(a); unseen.discard(a); todo.extend(adjacent[a]-vertices)
                ordered = []
                if all(len(adjacent[a]) == 2 for a in vertices):
                    start=min(vertices); previous=None; current=start
                    while current not in ordered:
                        ordered.append(current)
                        nxt=sorted(adjacent[current]-({previous} if previous is not None else set()))[0]
                        previous,current=current,nxt
                    assert current == start and len(ordered) == len(vertices)
                points = [unique[i] for i in sorted(vertices)]
                cp = [canonical(point,version) for point in points]
                bounds=lambda values: [[min(v[i] for v in values) for i in range(3)],[max(v[i] for v in values) for i in range(3)]]
                component={'id':len(components),'vertices':len(vertices),'simpleClosedBoundaryLoop':bool(ordered),
                    'degreeCounts':dict(collections.Counter(len(adjacent[a]) for a in vertices)),
                    'gltfBounds':bounds(points),'gltfCentroid':[sum(v[i] for v in points)/len(points) for i in range(3)],
                    'canonicalBoundsBeforeHandWarp':bounds(cp),'maximumReconstructedHandWeight':max(map(fit_weight,cp)),
                    'orderedWeldedIds':ordered,'orderedPositionAccessorIndices':[aliases[i][0] for i in ordered],
                    'orderedGltfPositions':[unique[i] for i in ordered]}
                components.append(component)
            report['meshes'].append({'name':node['name'],'mesh':node['mesh'],'primitive':pi,'material':doc['materials'][primitive['material']]['name'],
                'sourceVertices':len(p),'exactWeldedVertices':len(unique),'triangles':len(ids)//3,'degenerateAfterExactWeld':degenerate,
                'boundaryEdges':len(boundary),'nonmanifoldEdges':sum(len(v)>2 for v in edges.values()),
                'sameDirectionDoubleEdges':sum(len(v)==2 and v[0][:2]==v[1][:2] for v in edges.values()),'boundaryComponents':components})
    return report

if __name__ == '__main__':
    result = {f'v{v}':analyze(HERE/f'polwo-driver-fit-v{v}.glb',v) for v in [1,3]}
    target = HERE/'topology-v3-audit.json'
    target.write_text(json.dumps(result,indent=2)+'\n')
    for key,value in result.items():
        print(key,value['sha256'])
        for m in value['meshes']:
            print(m['name'], 'vertices',m['sourceVertices'],'welded',m['exactWeldedVertices'],'boundary',m['boundaryEdges'],'nonmanifold',m['nonmanifoldEdges'],'loops',len(m['boundaryComponents']))
            for c in m['boundaryComponents']:
                if c['vertices'] >= 12:
                    print(' ',c['id'],'n',c['vertices'],'closed',c['simpleClosedBoundaryLoop'],'canonical',c['canonicalBoundsBeforeHandWarp'],'wmax',c['maximumReconstructedHandWeight'])
