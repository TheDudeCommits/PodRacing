"""Own Ivory cleanup helpers. Only newly owned meshes may be reconstructed."""

def cyclic_face_key(points):
    return min(points, points[1:] + points[:1], points[2:] + points[:2])


def existing_copy_maps(source, stage):
    object_map = {}
    mesh_map = {}
    material_map = {}
    for row in CLEANUP['copyObjects']:
        original = source.objects.get(row['sourceObject'])
        copied = stage.objects.get(row['copiedObject'])
        assert original is not None and copied is not None, ('Missing own source/copy object', row['sourceObject'])
        object_map[original] = copied
        if original.type == 'MESH':
            assert copied.data.name == row['copiedMesh'], ('Source-copy mesh name changed', row['sourceObject'])
            mesh_map[original.data] = copied.data
    for row in CLEANUP['copyMaterials']:
        original = bpy.data.materials.get(row['sourceMaterial'])
        copied = bpy.data.materials.get(row['copiedMaterial'])
        assert original is not None and copied is not None, ('Missing own source/copy material', row['sourceMaterial'])
        material_map[original] = copied
    assert len(object_map) == 55 and len(mesh_map) == 51 and len(material_map) == 51
    return object_map, mesh_map, material_map


def verify_live_pairs(mesh):
    assert len(mesh.polygons) == 9656 and len(mesh.vertices) == 24145, 'Own Ivory target geometry cardinality differs.'
    assert len(mesh.materials) == 1 and len(mesh.uv_layers) == 1 and len(mesh.color_attributes) == 0, 'Unexpected Ivory target material/UV/color layout.'
    assert mesh.uv_layers.active.name == 'UVMap' and mesh.shape_keys is None
    coordinates = [tuple(v.co) for v in mesh.vertices]
    uv_layer = mesh.uv_layers.active
    groups = {}
    for polygon in mesh.polygons:
        loops = list(polygon.loop_indices)
        assert len(loops) == 3 and loops == [3 * polygon.index, 3 * polygon.index + 1, 3 * polygon.index + 2]
        points = tuple(coordinates[mesh.loops[i].vertex_index] for i in loops)
        assert len(set(points)) == 3, ('Degenerate live face', polygon.index)
        a = Vector(points[1]) - Vector(points[0])
        b = Vector(points[2]) - Vector(points[0])
        assert a.cross(b).length_squared > 0, ('Collinear live face', polygon.index)
        key = tuple(sorted(points))
        if key not in groups:
            groups[key] = []
        groups[key].append(polygon.index)
    pairs = []
    for points, indices in groups.items():
        assert len(indices) == 2, ('Live pair cardinality differs', indices)
        a, b = sorted(indices)
        pa = mesh.polygons[a]
        pb = mesh.polygons[b]
        ca = tuple(coordinates[mesh.loops[i].vertex_index] for i in pa.loop_indices)
        cb = tuple(coordinates[mesh.loops[i].vertex_index] for i in pb.loop_indices)
        assert cyclic_face_key(ca) == cyclic_face_key(tuple(reversed(cb))), ('Not an exact reversed live pair', a, b)
        assert pa.material_index == pb.material_index, ('Pair material differs', a, b)
        uva = {coordinates[mesh.loops[i].vertex_index]: tuple(uv_layer.data[i].uv) for i in pa.loop_indices}
        uvb = {coordinates[mesh.loops[i].vertex_index]: tuple(uv_layer.data[i].uv) for i in pb.loop_indices}
        assert uva == uvb, ('Pair corner UV differs', a, b)
        pairs.append([a, b])
    pairs.sort()
    expected = [[2 * i, 2 * i + 1] for i in range(CLEANUP['pairCount'])]
    assert pairs == expected and fnv1a64_signature(pairs) == CLEANUP['pairsFnv'], 'Exact own live pair list differs from prepared Ivory list.'
    roles = {}
    for role, runs in CLEANUP['roleRuns'].items():
        for start, count in runs:
            for index in range(start, start + count):
                assert index not in roles, 'Overlapping semantic reference.'
                roles[index] = role
    assert len(roles) == 9656 and sum(value != 'body-remainder' for value in roles.values()) == 8256
    assert all(roles[a] == roles[b] for a, b in pairs), 'An own opposing pair crosses semantic roles.'
    return {'pairCount': len(pairs), 'pairFnv1a64': fnv1a64_signature(pairs),
            'allCoordinatesWindingMaterialAndUvVerifiedExactly': True,
            'rolesDisjointAndCoverContainer': True, 'allPairsStayWithinOneRole': True,
            'sourcePolygonsKept': [a for a, b in pairs], 'sourcePolygonsRemoved': [b for a, b in pairs]}


def rebuild_owned_mesh(mesh, original, retained):
    assert mesh is not original, 'Never reconstruct an original/source-copy mesh.'
    assert mesh not in snapshot['sets']['meshes'], 'Reconstruction refuses every preexisting mesh.'
    coordinates = [tuple(v.co) for v in original.vertices]
    edges = [tuple(e.vertices) for e in original.edges]
    edge_flags = [(e.use_seam, e.use_edge_sharp) for e in original.edges]
    faces = [tuple(original.polygons[i].vertices) for i in retained]
    requested_normals = [tuple(original.corner_normals[loop].vector) for i in retained for loop in original.polygons[i].loop_indices]
    requested_uvs = [tuple(original.uv_layers.active.data[loop].uv) for i in retained for loop in original.polygons[i].loop_indices]
    own_materials = list(mesh.materials)
    mesh.clear_geometry()
    for layer in list(mesh.uv_layers):
        mesh.uv_layers.remove(layer)
    mesh.from_pydata(coordinates, edges, faces)
    assert [tuple(v.co) for v in mesh.vertices] == coordinates, 'Retained vertex coordinates changed.'
    assert [tuple(e.vertices) for e in mesh.edges] == edges, 'Original edge index/order changed.'
    for edge, flags in zip(mesh.edges, edge_flags):
        edge.use_seam = flags[0]
        edge.use_edge_sharp = flags[1]
    mesh.materials.clear()
    for material in own_materials:
        mesh.materials.append(material)
    for polygon, source_index in zip(mesh.polygons, retained):
        old = original.polygons[source_index]
        assert tuple(polygon.vertices) == tuple(old.vertices), ('Retained polygon corner order changed', source_index)
        polygon.material_index = old.material_index
        polygon.use_smooth = old.use_smooth
    uv_layer = mesh.uv_layers.new(name='UVMap')
    for value, expected in zip(uv_layer.data, requested_uvs):
        value.uv = expected
    # Set only this new mesh's requested own Ivory authored normals. Quantify
    # Blender's encoding result; no geometric direction recalculation is called.
    mesh.normals_split_custom_set(requested_normals)
    mesh.update()
    actual_normals = [tuple(n.vector) for n in mesh.corner_normals]
    assert len(actual_normals) == len(requested_normals) == 14484
    assert [tuple(value.uv) for value in uv_layer.data] == requested_uvs, 'Retained UV values changed.'
    assert [(e.use_seam, e.use_edge_sharp) for e in mesh.edges] == edge_flags, 'Source edge seam/sharp flags changed.'
    assert [tuple(v.co) for v in mesh.vertices] == coordinates and [tuple(e.vertices) for e in mesh.edges] == edges
    assert len(mesh.polygons) == 4828 and len(mesh.vertices) == len(original.vertices)
    source_keys = {tuple(sorted(coordinates[v] for v in p.vertices)) for p in original.polygons}
    target_keys = {tuple(sorted(coordinates[v] for v in p.vertices)) for p in mesh.polygons}
    assert source_keys == target_keys, 'Unique source surface coordinate sets changed.'
    max_chord = 0.0
    max_component = 0.0
    max_angle = 0.0
    different = 0
    worst = None
    for index, pair in enumerate(zip(requested_normals, actual_normals)):
        expected, actual = pair
        component = max(abs(actual[k] - expected[k]) for k in range(3))
        chord = math.sqrt(sum((actual[k] - expected[k]) ** 2 for k in range(3)))
        length_actual = math.sqrt(sum(v * v for v in actual))
        length_expected = math.sqrt(sum(v * v for v in expected))
        assert length_actual > 0 and length_expected > 0, ('Invalid encoded normal', index)
        dot = sum(actual[k] * expected[k] for k in range(3)) / (length_actual * length_expected)
        angle = math.degrees(math.acos(max(-1.0, min(1.0, dot))))
        if component != 0:
            different += 1
        if chord > max_chord:
            worst = {'retainedLoopIndex': index, 'sourcePolygonIndex': retained[index // 3],
                     'sourceLoopIndex': 3 * retained[index // 3] + index % 3,
                     'requested': list(expected), 'actual': list(actual)}
        max_chord = max(max_chord, chord)
        max_component = max(max_component, component)
        max_angle = max(max_angle, angle)
    return {'retainedCorners': len(actual_normals), 'differentVectors': different,
            'requestedOwnNormalFnv1a64': fnv1a64_signature([list(v) for v in requested_normals]),
            'actualEncodedNormalFnv1a64': fnv1a64_signature([list(v) for v in actual_normals]),
            'maximumChordDifference': max_chord, 'maximumComponentDifference': max_component,
            'maximumAngleDegrees': max_angle, 'worstChordCorner': worst,
            'exactNormalVectorParity': actual_normals == requested_normals,
            'retainedGeometryUvSmoothAndEdgeFlagsVerified': True,
            'sourcePolygonsKeptOrderFnv1a64': fnv1a64_signature(retained),
            'sourceCornerUvFnv1a64': fnv1a64_signature([list(v) for v in requested_uvs]),
            'sourceAllVertexCoordinatesFnv1a64': fnv1a64_signature([list(v) for v in coordinates]),
            'sourceAllEdgeVerticesFnv1a64': fnv1a64_signature([list(v) for v in edges]),
            'sourceEdgeFlagsFnv1a64': fnv1a64_signature(edge_flags),
            'originalAttributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in original.attributes],
            'derivedAttributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in mesh.attributes],
            'normalScope': 'Own authored normal vectors requested on new derivative; measured encoding difference is separate from exact original/source-copy preservation. No Colour normal data or tolerance.'}
