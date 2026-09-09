"""STAGED, NOT EXECUTED. Run via Blender MCP only after root coordinates authoring.

Copies the painted V3 study into a new scene; appends two 66-triangle shoulder
patches to its copied suit mesh. No boots, original vertices/UVs/maps, cameras,
or prior scenes are edited. No bake, export, or shared .blend save is performed.
"""
import bpy, bmesh, collections, json, math
from mathutils import Matrix, Vector

SOURCE = 'PodRacing — Polwo Inkstorm paint round32 V1'
STAGE = 'PodRacing — Polwo Inkstorm shoulder repair round32 V1'
PAYLOAD = json.loads("{\"sourceGlbSha256\":\"80557ea910b98cf95f69736cc9a955bff968b9bda6b037d4b9b20908746b2a34\",\"sourceMeshName\":\"polwo-pilot-suit.014 fit-v3\",\"mapping\":\"glTF (x,y,z) -> Blender (x,-z,y); shoulder warp weight zero; native indices deliberately omitted\",\"loops\":[{\"side\":-1,\"loopId\":152,\"vertexCount\":22,\"gltfPositions\":[[0.2207074761390686,5.09354305267334,-5.278430461883545],[0.2254231870174408,5.083661079406738,-5.307266712188721],[0.23918834328651428,5.076816558837891,-5.3346333503723145],[0.2608877122402191,5.073564052581787,-5.358313083648682],[0.2887634038925171,5.0741682052612305,-5.376387596130371],[0.3205570876598358,5.078577995300293,-5.387392520904541],[0.3536929786205292,5.086438179016113,-5.39043664932251],[0.3854866325855255,5.097110271453857,-5.385273456573486],[0.4133622646331787,5.109731674194336,-5.372321605682373],[0.43506166338920593,5.1232781410217285,-5.352628231048584],[0.44882678985595703,5.13665246963501,-5.327791690826416],[0.4535425007343292,5.148772239685059,-5.299821376800537],[0.44882678985595703,5.158654689788818,-5.2709856033325195],[0.43506166338920593,5.165499687194824,-5.243619441986084],[0.4133622646331787,5.1687517166137695,-5.219939708709717],[0.3854866027832031,5.168148517608643,-5.201865196228027],[0.3536929488182068,5.163738250732422,-5.190859317779541],[0.3205570578575134,5.155877590179443,-5.187815189361572],[0.2887634038925171,5.145205020904541,-5.192978858947754],[0.2608877122402191,5.1325836181640625,-5.205931663513184],[0.23918834328651428,5.119037628173828,-5.225623607635498],[0.2254231870174408,5.1056623458862305,-5.250461101531982]],\"canonicalBounds\":[[-0.11704322599595593,-0.17914494176064763,0.0017178492392263267],[-0.05695676803588867,-0.12685553273847022,0.026282407699092764]],\"targetCanonical\":[-0.072,-0.165,0.038]},{\"side\":1,\"loopId\":537,\"vertexCount\":22,\"gltfPositions\":[[-0.4535425007343292,5.148772239685059,-5.2998223304748535],[-0.44882678985595703,5.13665246963501,-5.327791690826416],[-0.43506166338920593,5.1232781410217285,-5.352628231048584],[-0.4133622646331787,5.109731674194336,-5.372321605682373],[-0.38548654317855835,5.097110748291016,-5.385274410247803],[-0.353692889213562,5.086438179016113,-5.39043664932251],[-0.32055699825286865,5.078577995300293,-5.387392520904541],[-0.2887633144855499,5.0741682052612305,-5.376387596130371],[-0.26088768243789673,5.073564052581787,-5.358313083648682],[-0.2391882985830307,5.076816558837891,-5.3346333503723145],[-0.22542314231395721,5.083661079406738,-5.307266712188721],[-0.22070741653442383,5.09354305267334,-5.278430461883545],[-0.22542314231395721,5.1056623458862305,-5.250461101531982],[-0.2391882985830307,5.119037628173828,-5.225623607635498],[-0.26088768243789673,5.1325836181640625,-5.205931663513184],[-0.2887633442878723,5.145205020904541,-5.192978858947754],[-0.32055699825286865,5.155877590179443,-5.187815189361572],[-0.353692889213562,5.163738250732422,-5.190859317779541],[-0.38548657298088074,5.168148517608643,-5.201865196228027],[-0.4133622646331787,5.1687517166137695,-5.219939708709717],[-0.43506166338920593,5.165499687194824,-5.243619441986084],[-0.44882678985595703,5.158654689788818,-5.2709856033325195]],\"canonicalBounds\":[[0.05695675265404486,-0.17914494176064763,0.0017178492392263267],[0.11704322599595593,-0.12685553273847022,0.026282407699092764]],\"targetCanonical\":[0.072,-0.165,0.038]}]}")
assert PAYLOAD['sourceGlbSha256'] == '80557ea910b98cf95f69736cc9a955bff968b9bda6b037d4b9b20908746b2a34'
assert SOURCE in bpy.data.scenes and STAGE not in bpy.data.scenes
window=bpy.context.window; old_scene=window.scene; old_layer=window.view_layer
old_active=old_layer.objects.active; old_selected=list(bpy.context.selected_objects)
scene_members={s:set(s.objects) for s in bpy.data.scenes}
collection_members={c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
source_meshes={o.data for o in bpy.data.scenes[SOURCE].objects if o.type=='MESH'}

def geometry_uv_bytes(mesh):
    """Immutable exact numeric signature; no hashing or filesystem in Blender."""
    return (tuple(tuple(v.co) for v in mesh.vertices),
        tuple((tuple(p.vertices),p.material_index,p.use_smooth) for p in mesh.polygons),
        tuple((layer.name,tuple(tuple(d.uv) for d in layer.data)) for layer in mesh.uv_layers))

def exact_edges(mesh):
    result=collections.defaultdict(list)
    for polygon in mesh.polygons:
        loops=list(polygon.loop_indices)
        for i,li in enumerate(loops):
            lj=loops[(i+1)%len(loops)]
            a=tuple(mesh.vertices[mesh.loops[li].vertex_index].co)
            b=tuple(mesh.vertices[mesh.loops[lj].vertex_index].co)
            if a!=b: result[tuple(sorted((a,b)))].append((a,b,li,lj))
    return result

before={mesh:geometry_uv_bytes(mesh) for mesh in source_meshes}
source_materials={mesh:tuple(mesh.materials) for mesh in source_meshes}
stage=None; copies=[]; success=False
report={'source':SOURCE,'stage':STAGE,'status':'executing','runtimeIntegrated':False,
        'geometryPolicy':'Existing coordinate/topology/UV prefixes retained; original source mesh evidence bytes must remain exact.',
        'mapsPolicy':'Original material and texture objects reused without modification; no maps generated.',
        'boots':'Untouched: independent exact-position topology audit found no boundary holes.',
        'uvPolicy':'Each new outer edge inherits adjacent source-loop UVs; intermediate UVs blend the source ring toward its mean.',
        'patches':[]}
try:
    stage=bpy.data.scenes.new(STAGE)
    window.scene=stage; window.view_layer=stage.view_layers[0]
    for source in bpy.data.scenes[SOURCE].objects:
        if source.type!='MESH': continue
        assert source.parent is None and source.matrix_world==Matrix.Identity(4), 'Expected baked identity-frame source meshes.'
        ob=source.copy(); ob.data=source.data.copy(); ob.name=source.name+' shoulder-repair-v1'
        stage.collection.objects.link(ob); copies.append(ob)
    suits=[o for o in copies if 'pilot-suit' in o.name]
    assert len(suits)==1
    suit=suits[0]; mesh=suit.data
    assert len(mesh.materials)==1 and len(mesh.uv_layers)>0
    initial_coords=[tuple(v.co) for v in mesh.vertices]
    initial_faces=[(tuple(p.vertices),p.material_index,p.use_smooth) for p in mesh.polygons]
    initial_uv={layer.name:[tuple(d.uv) for d in layer.data] for layer in mesh.uv_layers}
    initial_normals=[tuple(n.vector) for n in mesh.corner_normals]
    edges=exact_edges(mesh)
    boundary_before=sum(len(v)==1 for v in edges.values())
    original_count=(len(mesh.vertices),len(mesh.polygons),len(mesh.loops))
    bm=bmesh.new()
    try:
        bm.from_mesh(mesh); bm.verts.ensure_lookup_table()
        uv_layers={name:bm.loops.layers.uv.get(name) for name in initial_uv}
        pitch=math.atan2(1.895,8.38)
        source_rot=(Matrix.Rotation(math.pi,3,'Z')@Matrix.Rotation(pitch,3,'X'))
        straighten=Matrix.Rotation(pitch,3,'X')
        anchor=Vector((0,5.2,4.352532386779785)); pelvis=Vector((0,-.13,-.205))
        def canonical_to_blender(c):
            # Shoulder coordinates have exactly zero hand/forearm fit weight.
            return anchor+Vector((0,0,-.08))+1.55*(straighten@(2.5*(source_rot@(Vector(c)-pelvis))))
        for specification in PAYLOAD['loops']:
            expected=[Vector((p[0],-p[2],p[1])) for p in specification['gltfPositions']]
            matches=[]
            for point in expected:
                near=[(v.co-point).length for v in mesh.vertices]
                minimum=min(near)
                assert minimum<2e-5, ('Source shoulder moved',specification['side'],minimum)
                candidates=[i for i,d in enumerate(near) if d<=minimum+1e-8]
                values={tuple(mesh.vertices[i].co) for i in candidates}
                assert len(values)==1, 'Ambiguous distinct positions; do not weld nearby geometry.'
                matches.append(min(candidates))
            assert len(set(matches))==22
            points=[tuple(mesh.vertices[i].co) for i in matches]
            # Orient the ring along existing boundary half-edges. Added faces
            # then traverse each outer edge in the opposite direction.
            first=edges[tuple(sorted((points[0],points[1])))]
            assert len(first)==1
            if first[0][0]!=points[0]: matches.reverse(); points.reverse()
            rim_edges=[]
            for i,a in enumerate(points):
                b=points[(i+1)%22]; occurrences=edges[tuple(sorted((a,b)))]
                assert len(occurrences)==1 and occurrences[0][:2]==(a,b), 'Not one consistently oriented 22-edge boundary.'
                rim_edges.append(occurrences[0])
            bm.verts.ensure_lookup_table()
            rim=[bm.verts[i] for i in matches]
            center=sum((Vector(p) for p in points),Vector())/22
            target=canonical_to_blender(specification['targetCanonical'])
            middle_center=center.lerp(target,.62)
            inner=[bm.verts.new(middle_center+(Vector(p)-center)*.68) for p in points]
            apex=bm.verts.new(target)
            # Preserve per-edge UV seams at the outer boundary. The mean is a
            # source-ring-derived base, not an arbitrary atlas or new texture.
            uv={}
            for name in initial_uv:
                edge_uv=[(Vector(initial_uv[name][a[2]]),Vector(initial_uv[name][a[3]])) for a in rim_edges]
                ring_uv=[(edge_uv[i][0]+edge_uv[(i-1)%22][1])*.5 for i in range(22)]
                mean=sum(ring_uv,Vector((0,0)))/22
                uv[name]={'edge':edge_uv,'middle':[p.lerp(mean,.32) for p in ring_uv],'mean':mean}
            faces=[]
            def face(verts,coords):
                polygon=bm.faces.new(verts);polygon.material_index=0;polygon.smooth=True;faces.append(polygon)
                for name,values in coords.items():
                    for loop,value in zip(polygon.loops,values): loop[uv_layers[name]].uv=value
            for i in range(22):
                j=(i+1)%22
                face((rim[j],rim[i],inner[i]),{n:(v['edge'][i][1],v['edge'][i][0],v['middle'][i]) for n,v in uv.items()})
                face((rim[j],inner[i],inner[j]),{n:(v['edge'][i][1],v['middle'][i],v['middle'][j]) for n,v in uv.items()})
                face((inner[j],inner[i],apex),{n:(v['middle'][j],v['middle'][i],v['mean']) for n,v in uv.items()})
            assert len(faces)==66
            assert all(f.calc_area()>1e-10 for f in faces), 'Degenerate cap geometry.'
            report['patches'].append({'side':specification['side'],'matchedBoundaryVertices':22,
                'triangles':66,'newVertices':23,'targetCanonical':specification['targetCanonical'],
                'targetBlender':list(target),'newFacesSmooth':True,'material':mesh.materials[0].name})
        bm.normal_update();bm.to_mesh(mesh)
    finally:
        bm.free()
    mesh.update()
    assert [tuple(v.co) for v in mesh.vertices[:original_count[0]]]==initial_coords
    assert [(tuple(p.vertices),p.material_index,p.use_smooth) for p in mesh.polygons[:original_count[1]]]==initial_faces
    for layer in mesh.uv_layers:
        assert [tuple(d.uv) for d in layer.data[:original_count[2]]]==initial_uv[layer.name], 'An existing UV loop changed.'
    # Preserve old split normals; zero vectors ask Blender to calculate smooth
    # normals for new cap loops only. Existing source geometry is not reshaded.
    mesh.normals_split_custom_set(initial_normals+[(0,0,0)]*(len(mesh.loops)-original_count[2]))
    after_edges=exact_edges(mesh)
    boundary_after=sum(len(v)==1 for v in after_edges.values())
    assert boundary_before-boundary_after==44, 'Only two 22-edge openings must be closed.'
    assert sum(len(v)>2 for v in after_edges.values())==sum(len(v)>2 for v in edges.values())
    assert len(mesh.polygons)-original_count[1]==132 and len(mesh.vertices)-original_count[0]==46
    report.update({'status':'source scene created; export and rendered acceptance pending',
        'newTriangles':132,'newVertices':46,'additionalMaterialSlots':0,'additionalObjects':0,
        'boundaryEdgesBefore':boundary_before,'boundaryEdgesAfter':boundary_after,
        'originalVerticesTopologyUvPrefixesExact':True,'originalSplitNormalsRetained':True,
        'newStageMeshCount':len(copies),'noBakeExportOrBlendSave':True})
    success=True
finally:
    window.scene=old_scene;window.view_layer=old_layer
    if not success and stage is not None:
        for ob in copies:
            data=ob.data;bpy.data.objects.remove(ob,do_unlink=True)
            if data.users==0:bpy.data.meshes.remove(data)
        bpy.data.scenes.remove(stage)
    for ob in old_layer.objects: ob.select_set(False)
    for ob in old_selected: ob.select_set(True)
    old_layer.objects.active=old_active
    preserved={mesh.name:before[mesh]==geometry_uv_bytes(mesh) and tuple(mesh.materials)==source_materials[mesh] for mesh in source_meshes}
    report['preservation']={'originalMeshEvidenceBytesExact':preserved,
        'changedExistingScenes':[s.name for s,items in scene_members.items() if set(s.objects)!=items],
        'changedExistingCollections':[c.name for c,items in collection_members.items() if (set(c.objects),set(c.children))!=items],
        'contextRestored':window.scene==old_scene and window.view_layer==old_layer and old_layer.objects.active==old_active and set(bpy.context.selected_objects)==set(old_selected)}
    assert all(preserved.values()) and not report['preservation']['changedExistingScenes'] and not report['preservation']['changedExistingCollections'] and report['preservation']['contextRestored']
    print(json.dumps(report))
