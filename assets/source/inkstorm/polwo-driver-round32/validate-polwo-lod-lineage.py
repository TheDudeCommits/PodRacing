#!/usr/bin/env python3
"""Independent vertex/triangle lineage and cap-preservation audit; read-only stdout."""
import argparse
import collections
import json
import re
import struct
from pathlib import Path

from _polwo_glb import accessor_bytes, accessor_values, read_glb, sha


def meshes(path):
    raw, doc, binary = read_glb(path)
    result = {}
    for node in doc['nodes']:
        if 'mesh' not in node:
            continue
        name = re.match(r'polwo-(?:body-[01]|pilot-(?:accent|hardware|rubber|shell|suit|webbing))', node['name'])[0]
        p = doc['meshes'][node['mesh']]['primitives'][0]
        attrs = p['attributes']
        count = doc['accessors'][attrs['POSITION']]['count']
        buffers = [(semantic, accessor_bytes(doc, binary, index)) for semantic, index in sorted(attrs.items())]
        vertices = [b''.join(data[i * (len(data)//count):(i+1)*(len(data)//count)] for _, data in buffers) for i in range(count)]
        positions = list(accessor_values(doc, binary, attrs['POSITION']))
        indices = [x[0] for x in accessor_values(doc, binary, p['indices'])]
        triangles = [indices[i:i+3] for i in range(0,len(indices),3)]
        result[name] = {'semantics':[s for s,_ in buffers], 'vertices':vertices, 'positions':positions, 'triangles':triangles}
    return sha(raw), result


def oriented_triangle_key(vertices, triangle):
    a,b,c = [vertices[i] for i in triangle]
    return min(a+b+c,b+c+a,c+a+b)


def geometric_key(positions, triangle):
    return tuple(sorted(positions[i] for i in triangle))


def audit(args):
    hero_hash, hero = meshes(args.hero)
    rival_hash, rival = meshes(args.rival)
    _, uncapped = meshes(args.uncapped)
    _, before_reorder = meshes(args.before_reorder)
    _, after_reorder = meshes(args.after_reorder)
    assert set(hero)==set(rival)==set(uncapped)==set(before_reorder)==set(after_reorder)
    parts=[]
    for name,h in hero.items():
        r=rival[name]
        assert h['semantics']==r['semantics']
        hero_vertices=set(h['vertices'])
        missing=sum(v not in hero_vertices for v in set(r['vertices']))
        assert missing==0, 'Rival contains altered/interpolated vertex attributes'
        old_faces={geometric_key(uncapped[name]['positions'],t) for t in uncapped[name]['triangles']}
        cap_triangles=[t for t in h['triangles'] if geometric_key(h['positions'],t) not in old_faces]
        rival_faces={oriented_triangle_key(r['vertices'],t) for t in r['triangles']}
        exact_caps=sum(oriented_triangle_key(h['vertices'],t) in rival_faces for t in cap_triangles)
        assert exact_caps==len(cap_triangles), 'Cap triangle attributes or winding changed'
        a,b=before_reorder[name],after_reorder[name]
        a_faces=collections.Counter(oriented_triangle_key(a['vertices'],t) for t in a['triangles'])
        b_faces=collections.Counter(oriented_triangle_key(b['vertices'],t) for t in b['triangles'])
        assert a_faces==b_faces, 'Reorder altered geometry/attributes/winding'
        parts.append({'node':name,'rivalVerticesAreExactHeroAttributeSubset':True,'newCapTriangles':len(cap_triangles),
                      'exactRetainedCapTriangles':exact_caps,'reorderExactOrientedTriangleMultiset':True})
    return {'lineagePass':True,'heroSha256':hero_hash,'rivalSha256':rival_hash,'parts':parts,
            'all132CapTrianglesRetainedWithExactAttributesAndWinding':sum(p['exactRetainedCapTriangles'] for p in parts)==132,
            'visualAcceptance':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['hero','rival','uncapped','before-reorder','after-reorder']:
        parser.add_argument('--'+name,required=True,type=Path)
    print(json.dumps(audit(parser.parse_args()),indent=2))
