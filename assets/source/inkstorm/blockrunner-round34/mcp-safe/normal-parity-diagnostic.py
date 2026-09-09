"""Disposable mesh-only encoding experiment, no source mutation or scene change."""
import bpy, json
s = bpy.data.scenes['PodRacing — Blockrunner shortened controls side mounts round34 V1']
rows = []
before = (len(bpy.data.scenes), len(bpy.data.objects), len(bpy.data.meshes), bpy.context.scene.name)
for ob in s.objects:
    if ob.type != 'MESH' or ob.matrix_world.to_3x3().determinant() >= 0:
        continue
    for share in (False, True):
        source = ob.data
        vertices, faces, normals, flags = [], [], [], []
        index_by_point = {}
        normal_matrix = ob.matrix_world.to_3x3().inverted().transposed()
        for polygon in source.polygons:
            face = []
            for corner in (0, 2, 1):
                point = tuple(ob.matrix_world @ source.vertices[polygon.vertices[corner]].co)
                index = index_by_point.get(point) if share else None
                if index is None:
                    index = len(vertices)
                    vertices.append(point)
                    index_by_point[point] = index
                face.append(index)
                normals.append((normal_matrix @ source.corner_normals[polygon.loop_indices[corner]].vector).normalized())
            faces.append(face)
            flags.append(polygon.use_smooth)
        mesh = bpy.data.meshes.new('Temporary Blockrunner parity encoding diagnostic')
        try:
            mesh.from_pydata(vertices, [], faces)
            mesh.update()
            for p, flag in zip(mesh.polygons, flags):
                p.use_smooth = flag
            mesh.normals_split_custom_set(normals)
            mesh.update()
            errors = [(n.vector - wanted).length for n, wanted in zip(mesh.corner_normals, normals)]
            def error_value(index):
                return errors[index]
            worst = max(range(len(errors)), key=error_value)
            rows.append({'source': ob.name, 'shareExactCoordinates': share,
                'maximumError': errors[worst], 'aboveTolerance': sum(e > .001 for e in errors),
                'worstLoop': worst, 'worstFace': worst // 3, 'smooth': flags[worst // 3],
                'expected': list(normals[worst]), 'actual': list(mesh.corner_normals[worst].vector),
                'faceNormal': list(mesh.polygons[worst // 3].normal)})
        finally:
            bpy.data.meshes.remove(mesh)
after = (len(bpy.data.scenes), len(bpy.data.objects), len(bpy.data.meshes), bpy.context.scene.name)
assert before == after
print(json.dumps({'before': before, 'after': after, 'rows': rows}))
