"""External exact world-coordinate coincidence audit. No Blender or source writes."""
import collections
import hashlib
import json
from source_geometry_analysis_helpers import SOURCE, HERE, EXPECTED_SHA, read_glb

output = HERE / 'cross-occurrence-coincidence-analysis.json'
assert not output.exists()
blob = SOURCE.read_bytes()
assert hashlib.sha256(blob).hexdigest() == EXPECTED_SHA
meshes = read_glb(blob)
by_coordinates = collections.defaultdict(list)
for name, mesh in meshes.items():
    for index, face in enumerate(mesh['faces']):
        points = tuple(mesh['positions'][i] for i in face)
        key = tuple(sorted(points))
        rank = {point: i for i, point in enumerate(key)}
        indices = [rank[point] for point in points]
        parity = sum(indices[i] > indices[j] for i in range(3) for j in range(i+1,3)) % 2
        by_coordinates[key].append({'object': name, 'sourceTriangleIndex': index, 'parity': parity})
rows = []
for key, faces in by_coordinates.items():
    if len({face['object'] for face in faces}) > 1:
        rows.append({'exactTriangleWorldCoordinates': key, 'occurrences': faces,
                     'hasOpposedWinding': len({face['parity'] for face in faces}) > 1})
report = {'source': str(SOURCE), 'sourceSha256': EXPECTED_SHA, 'meshOccurrences': len(meshes),
          'scope': 'Exact floating-point world-coordinate triangles spanning different mesh occurrences. No approximate coplanar/intersection test or cleanup performed.',
          'crossOccurrenceExactGroups': len(rows), 'groups': rows, 'sourceUnchanged': SOURCE.read_bytes() == blob}
assert report['sourceUnchanged']
output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k != 'groups'}, indent=2))
