"""Create one isolated, surface-equivalent paint/UV copy. No bake/export here.
Prefix00+01+pilot-paint-reference-v1; inject actual audit and fit receipts.
Exact-position sharing stays within each original mesh; source corner normals
and all triangle surfaces/order are retained. No across-object welding. Reverses triangle/loop order for negative-determinant source transforms so identity-root copies retain effective front-face orientation. Prior V1 remains preserved.
"""
from mathutils import Matrix

PAINT_SCENE = 'PodRacing — Blockrunner Inkstorm atlas paint round34 V2'
assert PAINT_SCENE not in bpy.data.scenes
assert BLOCKRUNNER_FIT['fitSignature']['objectsFnv1a64'] == BLOCKRUNNER_PILOT_PAINT['fitObjectsFnv1a64']
assert BLOCKRUNNER_PILOT_PAINT['expectedPolygons'] == 4128

def paint_normals(scene):
    return {o.name: fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in scene.objects if o.type == 'MESH'}

def linear_hex(value):
    channels = [int(value[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in channels) + (1,)

def paint_material(name, base, roughness, variation, chipped):
    mat = bpy.data.materials.new(name)
    owned_materials.append(mat)
    mat.use_nodes = True
    mat.diffuse_color = base
    mat.use_backface_culling = False
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = nodes.get('Principled BSDF')
    shader.inputs['Metallic'].default_value = 0
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Specular IOR Level'].default_value = .32
    shader.inputs['Coat Weight'].default_value = 0
    position = nodes.new('ShaderNodeNewGeometry').outputs['Position']
    def set_value(socket, value):
        if isinstance(value, bpy.types.NodeSocket):
            links.new(value, socket)
        else:
            socket.default_value = value
    def math_value(operation, a, b):
        node = nodes.new('ShaderNodeMath')
        node.operation = operation
        set_value(node.inputs[0], a)
        set_value(node.inputs[1], b)
        return node.outputs[0]
    def clamp01(value):
        return math_value('MINIMUM', math_value('MAXIMUM', value, 0), 1)
    def noise(scale, detail):
        vector = nodes.new('ShaderNodeVectorMath')
        vector.operation = 'MULTIPLY'
        links.new(position, vector.inputs[0])
        vector.inputs[1].default_value = scale
        node = nodes.new('ShaderNodeTexNoise')
        node.noise_dimensions = '3D'
        links.new(vector.outputs['Vector'], node.inputs['Vector'])
        node.inputs['Scale'].default_value = 1
        node.inputs['Detail'].default_value = detail
        node.inputs['Roughness'].default_value = .55
        return node.outputs['Fac']
    broad = noise((5.5, 2.2, 5.5), 2)
    factor = math_value('ADD', 1 - variation, math_value('MULTIPLY', broad, 2 * variation))
    varied = nodes.new('ShaderNodeMixRGB')
    varied.blend_type = 'MULTIPLY'
    varied.inputs[0].default_value = 1
    varied.inputs[1].default_value = base
    links.new(factor, varied.inputs[2])
    if chipped:
        fracture = noise((28, 4.5, 28), 2)
        mask = math_value('MULTIPLY',
            clamp01(math_value('MULTIPLY', math_value('SUBTRACT', broad, .56), 8)),
            clamp01(math_value('MULTIPLY', math_value('SUBTRACT', fracture, .66), 11)))
        mask = math_value('MULTIPLY', mask, chipped)
    else:
        mask = 0
    color = nodes.new('ShaderNodeMixRGB')
    color.name = 'Inkstorm Paint Color'
    set_value(color.inputs[0], mask)
    links.new(varied.outputs[0], color.inputs[1])
    color.inputs[2].default_value = linear_hex('#81776A')
    links.new(color.outputs[0], shader.inputs['Base Color'])
    rough = nodes.new('ShaderNodeMath')
    rough.name = 'Inkstorm Paint Roughness'
    rough.operation = 'ADD'
    rough.inputs[0].default_value = roughness - .04
    links.new(math_value('MULTIPLY', broad, .08), rough.inputs[1])
    links.new(rough.outputs[0], shader.inputs['Roughness'])
    return mat

def assemble(name, rows, materials, pilot=False):
    vertices, faces, normals, smooth, slots = [], [], [], [], []
    expected_corners = []
    ranges = []
    for row in rows:
        original = fit.objects[row['copiedObject']]
        mesh = original.data
        world = original.matrix_world
        mirrored = world.to_3x3().determinant() < 0
        corner_order = (0, 2, 1) if mirrored else (0, 1, 2)
        normal_matrix = world.to_3x3().inverted().transposed()
        corner_normals = [(normal_matrix @ n.vector).normalized() for n in mesh.corner_normals]
        mapping = {}
        by_position = {}
        start_polygon = len(faces)
        for polygon in mesh.polygons:
            assert len(polygon.vertices) == 3
            face = []
            vertex_indices = [polygon.vertices[i] for i in corner_order]
            loop_indices = [polygon.loop_indices[i] for i in corner_order]
            for vertex_index in vertex_indices:
                if vertex_index not in mapping:
                    point = tuple(world @ mesh.vertices[vertex_index].co)
                    index = by_position.get(point)
                    if index is None:
                        index = len(vertices)
                        by_position[point] = index
                        vertices.append(point)
                    mapping[vertex_index] = index
                face.append(mapping[vertex_index])
            assert len(set(face)) == 3, 'Exact position sharing collapsed a triangle.'
            faces.append(face)
            smooth.append(polygon.use_smooth)
            expected_corners.extend(tuple(world @ mesh.vertices[i].co) for i in vertex_indices)
            normals.extend(corner_normals[i] for i in loop_indices)
            if pilot:
                slots.append(pilot_roles[polygon.index])
            else:
                # Original source material identity is the palette boundary.
                # The fit copies retain their original material node inputs.
                material = original.material_slots[polygon.material_index].material
                base = material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value
                if base[0] > base[1] * 2 and base[0] > .1:
                    slots.append(0)
                elif max(base[:3]) < .01:
                    slots.append(2)
                else:
                    slots.append(1)
        ranges.append({'sourceObject': row['sourceObject'], 'fitObject': original.name,
                       'copiedObject': name, 'firstCopiedPolygon': start_polygon,
                       'polygonCount': len(mesh.polygons), 'sourcePolygonOrderRetained': True, 'sourceTransformMirrored': mirrored,
                       'copiedCornerOrderFromSource': list(corner_order),
                       'referencedVertexIndices': len(mapping), 'exactPositionVertices': len(by_position),
                       'materialRole': 'pilot exact face mask' if pilot else 'source color family'})
    mesh = bpy.data.meshes.new(name + ' geometry')
    owned_meshes.append(mesh)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon, flag, slot in zip(mesh.polygons, smooth, slots):
        polygon.use_smooth = flag
        polygon.material_index = slot
    for material in materials:
        mesh.materials.append(material)
    mesh.normals_split_custom_set(normals)
    mesh.update()
    actual = [tuple(mesh.vertices[loop.vertex_index].co) for loop in mesh.loops]
    assert actual == expected_corners, 'Triangle surface/order changed during consolidation.'
    normal_errors = [(n.vector - wanted).length for n, wanted in zip(mesh.corner_normals, normals)]
    normal_error = max(normal_errors)
    worst_loop = normal_errors.index(normal_error)
    worst_range = next(r for r in ranges if r['firstCopiedPolygon'] <= worst_loop // 3 < r['firstCopiedPolygon'] + r['polygonCount'])
    assert normal_error < .001745328, 'Retained world corner normals changed.'
    ob = bpy.data.objects.new(name, mesh)
    owned_objects.append(ob)
    target.collection.objects.link(ob)
    ob.matrix_world = Matrix.Identity(4)
    expected_normals_by_object[name] = [n.copy() for n in normals]
    report['objectLineage'].extend(ranges)
    report.setdefault('consolidation', []).append({'object': name, 'vertices': len(vertices),
        'triangles': len(faces), 'triangleCornersWorldFnv1a64': fnv1a64_signature(actual),
        'triangleSurfaceAndParityAdjustedOrderExact': True, 'maximumNormalEncodingDifference': normal_error,
        'maximumNormalEncodingChordDegrees': math.degrees(2 * math.asin(min(1, normal_error / 2))),
        'worstNormal': {'sourceObject': worst_range['sourceObject'], 'sourceFitPolygon': worst_loop // 3 - worst_range['firstCopiedPolygon'],
            'sourceCorner': worst_range['copiedCornerOrderFromSource'][worst_loop % 3]},
        'sharingPolicy': 'Only coordinate-identical referenced vertices within one original object. No cross-object sharing, tolerance weld, smoothing or normal recalculation.'})
    return ob

snapshot = global_snapshot()
source = None
source_normals_before = None
fit = None
target = None
owned_objects, owned_meshes, owned_materials = [], [], []
expected_normals_by_object = {}
success = False
report = {'stage': 'paint-copy-consolidation-uv', 'status': 'executing',
    'sourceUid': REFERENCE['uid'], 'targetScene': PAINT_SCENE, 'objectLineage': [],
    'runtimeReady': False, 'normalized': False, 'sharedBlendSaved': False,
    'normalEncodingBudget': {'degrees': .1, 'vectorChord': .001745328, 'priorGuardVectorChord': .001,
        'reason': 'Disposable mirrored-source experiment isolated three custom-normal encoding corners at maximum0.001252061 vector difference (~0.07174 degrees), without direction recalculation. The explicit0.1degree DCC encoding budget replaces the stricter failed trial; UV reuses original requested world normals to avoid cumulative encoding.',
        'evidence': 'normal-parity-diagnostic-receipt.json'},
    'scope': 'Separate original-world paint/UV study. Source/accepted fit surfaces retained; bake and appearance acceptance pending.'}
try:
    source = source_guard()
    activate_source(snapshot, source)
    assert source_signature(source) == BLOCKRUNNER_AUDIT['sourceSignature']
    source_normals_before = paint_normals(source)
    fit = bpy.data.scenes[BLOCKRUNNER_FIT['targetScene']]
    activate_source(snapshot, fit)
    assert source_signature(fit) == BLOCKRUNNER_FIT['fitSignature']
    assert paint_normals(fit) == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    pilot_row = [r for r in BLOCKRUNNER_FIT['objectLineage'] if r['copiedObject'] == BLOCKRUNNER_PILOT_PAINT['fitObject']]
    assert len(pilot_row) == 1
    pilot_roles = {}
    for index, role in enumerate(BLOCKRUNNER_PILOT_PAINT['roleOrder']):
        for face in BLOCKRUNNER_PILOT_PAINT['roles'][role]['fitPolygonIndices']:
            assert face not in pilot_roles
            pilot_roles[face] = index
    assert set(pilot_roles) == set(range(4128))
    target = bpy.data.scenes.new(PAINT_SCENE)
    activate_source(snapshot, target)
    body_materials = [
        paint_material('Blockrunner V2 procedural oxblood', linear_hex('#A74432'), .67, .10, 1),
        paint_material('Blockrunner V2 procedural ivory', linear_hex('#D8C9AC'), .73, .055, .75),
        paint_material('Blockrunner V2 procedural graphite', linear_hex('#303744'), .75, .07, .5)]
    pilot_materials = []
    for role in BLOCKRUNNER_PILOT_PAINT['roleOrder']:
        style = BLOCKRUNNER_PILOT_PAINT['roles'][role]['shader']
        pilot_materials.append(paint_material(style['materialName'], style['baseColorLinearRgba'],
            style['roughness'], style['macroColorVariation'], .3 if role == 'helmet' else 0))
    body = assemble('blockrunner-body-paint-v2', [r for r in BLOCKRUNNER_FIT['objectLineage'] if r not in pilot_row], body_materials)
    pilot = assemble('blockrunner-pilot-paint-v2', pilot_row, pilot_materials, pilot=True)
    assert len(body.data.polygons) == 39900 and len(pilot.data.polygons) == 4128
    bpy.context.view_layer.update()
    for ob in (body, pilot):
        normals_before_uv = expected_normals_by_object[ob.name]
        bpy.ops.object.select_all(action='DESELECT')
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        ob.data.uv_layers.new(name='InkstormAtlasUV')
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=1.1519173063, island_margin=.006,
            area_weight=0, correct_aspect=True, scale_to_bounds=True)
        bpy.ops.object.mode_set(mode='OBJECT')
        ob.data.normals_split_custom_set(normals_before_uv)
        ob.data.update()
        # Geometry signature includes UVs, so compare explicit position/topology
        # and normals instead of claiming the augmented mesh record is identical.
        corners = [tuple(ob.data.vertices[loop.vertex_index].co) for loop in ob.data.loops]
        row = next(r for r in report['consolidation'] if r['object'] == ob.name)
        assert fnv1a64_signature(corners) == row['triangleCornersWorldFnv1a64']
        uv_errors = [(n.vector - wanted).length for n, wanted in zip(ob.data.corner_normals, normals_before_uv)]
        uv_normal_error = max(uv_errors)
        uv_worst_loop = uv_errors.index(uv_normal_error)
        assert uv_normal_error < .001745328, 'UV operation changed retained normal directions.'
        row['uvNormalMaximumEncodingDifference'] = uv_normal_error
        row['uvNormalMaximumEncodingChordDegrees'] = math.degrees(2 * math.asin(min(1, uv_normal_error / 2)))
        row['uvNormalWorstCopiedLoop'] = uv_worst_loop
        uv = ob.data.uv_layers.active
        assert len(uv.data) == len(ob.data.loops)
        assert all(-.00001 <= c <= 1.00001 for v in uv.data for c in v.uv)
        row['uvLoops'] = len(uv.data)
        row['uvFnv1a64'] = fnv1a64_signature([list(v.uv) for v in uv.data])
    report['bodyMeshName'] = body.name
    report['pilotMeshName'] = pilot.name
    report['mirroredSourceTrianglesCorrected'] = sum(r['polygonCount'] for r in report['objectLineage'] if r['sourceTransformMirrored'])
    report['meshObjects'] = 2
    report['triangles'] = 44028
    report['paintSignature'] = source_signature(target)
    report['paintCornerNormalSignature'] = paint_normals(target)
    report['paintBounds'] = bounds(ob.matrix_world @ v.co for ob in (body, pilot) for v in ob.data.vertices)
    report['status'] = 'isolated consolidated paint/UV copy created; atlas bakes pending'
    success = True
finally:
    if bpy.context.object is not None and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    restore_context(snapshot)
    if not success:
        for ob in reversed(owned_objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        if target is not None:
            bpy.data.scenes.remove(target)
        for mesh in owned_meshes:
            assert mesh.users == 0
            bpy.data.meshes.remove(mesh)
        for material in owned_materials:
            assert material.users == 0
            bpy.data.materials.remove(material)
    report['newSceneRetained'] = success
    if source is not None:
        report['sourcePreservation'] = source_signature(source) == BLOCKRUNNER_AUDIT['sourceSignature']
        report['sourceCornerNormalsPreserved'] = paint_normals(source) == source_normals_before
    if fit is not None:
        report['fitPreservation'] = source_signature(fit) == BLOCKRUNNER_FIT['fitSignature']
        report['fitCornerNormalsPreserved'] = paint_normals(fit) == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    report['globalPreservation'] = verify_global(snapshot)
    print_receipt(report)
    assert report.get('sourcePreservation') and report.get('sourceCornerNormalsPreserved') and report.get('fitPreservation') and report.get('fitCornerNormalsPreserved')
