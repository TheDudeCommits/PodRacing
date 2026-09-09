# Composed after00-shared-guards.py and actual import RECEIPT.
from mathutils.geometry import tessellate_polygon
SOURCE_SCENE=RECEIPT['scene']
STAGE='PodRacing — Teemto authored damage V16 A'
assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
assert STAGE not in bpy.data.scenes
source=bpy.data.scenes[SOURCE_SCENE]
assert source_signature(source)==RECEIPT['sourceSignature']
assert {o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in source.objects if o.type=='MESH'}==RECEIPT['sourceCornerNormalSignature']
snapshot=global_snapshot()
stage=None
success=False
report={'stage':'V16 authored fracture A','sourceScene':SOURCE_SCENE,'sourceByteSha256External':RECEIPT['sourceByteSha256External'],'geometryOnlyRuntimeExport':True,'newTextures':0,'lineage':[]}
new_parts=[]

def game_vector(p):
    return Vector((p[0],p[2],-p[1]))

def blender_vector(p):
    return Vector((p[0],-p[2],p[1]))

def coordinate_key(p):
    return tuple(round(v,5) for v in p)

def source_triangles(ob):
    rows=[]
    uv=ob.data.uv_layers.active
    assert uv is not None
    transform=ob.matrix_world.to_3x3().inverted().transposed()
    for face in ob.data.polygons:
        assert len(face.vertices)==3
        corners=[]
        for li in face.loop_indices:
            pos=game_vector(ob.matrix_world@ob.data.vertices[ob.data.loops[li].vertex_index].co)
            normal=game_vector(transform@ob.data.corner_normals[li].vector).normalized()
            corners.append((pos,normal,Vector(uv.data[li].uv)))
        rows.append((corners,face.index))
    return rows

def interpolate(a,b,t):
    return (a[0].lerp(b[0],t),a[1].lerp(b[1],t).normalized(),a[2].lerp(b[2],t))

def cut_triangles(rows,cut,positive):
    out=[]
    segments=[]
    canonical={}
    for corners,lineage in rows:
        poly=[]
        crossings=[]
        for a,b in zip(corners,corners[1:]+corners[:1]):
            da=a[0].z-cut
            db=b[0].z-cut
            inside_a=da>=0 if positive else da<=0
            inside_b=db>=0 if positive else db<=0
            if inside_a:poly.append(a)
            if inside_a!=inside_b:
                v=interpolate(a,b,da/(da-db))
                key=coordinate_key(v[0])
                if key not in canonical:canonical[key]=v[0].copy()
                v=(canonical[key].copy(),v[1],v[2])
                poly.append(v)
                crossings.append(v[0])
        if len(crossings)==2:segments.append((coordinate_key(crossings[0]),coordinate_key(crossings[1])))
        for i in range(1,len(poly)-1):out.append(([poly[0],poly[i],poly[i+1]],lineage))
    adjacency={}
    for a,b in segments:
        adjacency.setdefault(a,[]).append(b)
        adjacency.setdefault(b,[]).append(a)
    assert all(len(v)==2 for v in adjacency.values()), ('Cut boundary not closed degree2',cut,collections.Counter(len(v) for v in adjacency.values()))
    loops=[]
    remaining=set(adjacency)
    while remaining:
        first=min(remaining)
        loop=[first]
        previous=None
        current=first
        while True:
            choices=adjacency[current]
            following=choices[0] if choices[0]!=previous else choices[1]
            if following==first:break
            assert following not in loop
            loop.append(following)
            previous=current
            current=following
        for key in loop:remaining.remove(key)
        loops.append([canonical[key].copy() for key in loop])
    return out,loops

def torn_offset(p,amount):
    return amount*(.65*math.sin(p.x*5.3+p.y*3.7)+.35*math.sin(p.x*11.1-p.y*6.1))

def add_triangle(rows,a,b,c,uvs,lineage,normal_sign=0):
    normal=(b-a).cross(c-a)
    if normal.length_squared<1e-16:return
    normal.normalize()
    if normal_sign and normal.z*normal_sign<0:b,c=c,b;uvs=[uvs[0],uvs[2],uvs[1]];normal.negate()
    rows.append(([(a.copy(),normal.copy(),Vector(uvs[0])),(b.copy(),normal.copy(),Vector(uvs[1])),(c.copy(),normal.copy(),Vector(uvs[2]))],lineage))

def cap_cut(rows,loops,cut,positive,jagged,uv_patch):
    sign=-1 if positive else 1
    # Only newly cut vertices acquire a bounded torn edge. Original vertices,
    # UVs and requested normals away from the seam are retained.
    for corners,lineage in rows:
        for pos,normal,uv in corners:
            if abs(pos.z-cut)<.00001:pos.z+=torn_offset(pos,jagged)
    added_before=len(rows)
    loop_records=[]
    for loop_index,loop in enumerate(loops):
        area=sum(loop[i].x*loop[(i+1)%len(loop)].y-loop[(i+1)%len(loop)].x*loop[i].y for i in range(len(loop)))
        if (area>0)!=(sign>0):loop=list(reversed(loop))
        center=sum(loop,Vector())/len(loop)
        rad=max((p-center).length for p in loop)
        depth=min(.28,rad*.45)
        outer=[];inner=[]
        for p in loop:
            q=p.copy();q.z+=torn_offset(q,jagged);outer.append(q)
            q=center+(p-center)*.89;q.z=cut-sign*depth;inner.append(q)
        # Ring thickness and closed inset mechanical end cap. New normals are
        # geometrically authored; no recalc on retained source surface normals.
        for i in range(len(loop)):
            j=(i+1)%len(loop)
            add_triangle(rows,outer[i],outer[j],inner[j],[(uv_patch[0],uv_patch[1])]*3,-1)
            add_triangle(rows,outer[i],inner[j],inner[i],[(uv_patch[0]+.015,uv_patch[1])]*3,-1)
        tris=tessellate_polygon([inner])
        for tri in tris:
            uv=[]
            for p in tri:uv.append((uv_patch[0]+(p.x-center.x)/max(rad,.01)*.025,uv_patch[1]+(p.y-center.y)/max(rad,.01)*.025))
            add_triangle(rows,tri[0],tri[1],tri[2],uv,-2,sign)
        loop_records.append({'loop':loop_index,'vertices':len(loop),'centerGame':list(center),'radius':rad,'depth':depth})
    return {'loops':loop_records,'newCapTriangles':len(rows)-added_before,'jaggedAmplitudeBound':jagged}

def authored_mesh(name,rows,material,source_object,cap_info):
    coords=[c[0] for corners,lineage in rows for c in corners]
    lo=Vector([min(p[k] for p in coords) for k in range(3)])
    hi=Vector([max(p[k] for p in coords) for k in range(3)])
    pivot=(lo+hi)*.5
    verts=[];faces=[];normals=[];uvs=[]
    for corners,lineage in rows:
        offset=len(verts)
        for pos,n,uv in corners:verts.append(tuple(blender_vector(pos-pivot)));normals.append(tuple(blender_vector(n)));uvs.append(tuple(uv))
        faces.append((offset,offset+1,offset+2))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for i,value in enumerate(uvs):uv.data[i].uv=value
    for poly in mesh.polygons:poly.use_smooth=True
    mesh.normals_split_custom_set(normals)
    mesh.materials.append(material)
    lineage_attr=mesh.attributes.new('damage_source_triangle','INT','FACE')
    for i,row in enumerate(rows):lineage_attr.data[i].value=row[1]
    ob=bpy.data.objects.new(name,mesh)
    ob.location=blender_vector(pivot)
    stage.collection.objects.link(ob)
    ob['sourceObject']=source_object
    ob['sourceByteSha256']=RECEIPT['sourceByteSha256External']
    ob['damagePrototype']='V16 A'
    ob['pivotGame']=list(pivot)
    ob['sourceTriangleCount']=sum(1 for row in rows if row[1]>=0)
    ob['newCapTriangleCount']=sum(1 for row in rows if row[1]<0)
    new_parts.append(ob)
    report['lineage'].append({'object':name,'sourceObject':source_object,'material':material.name,'triangles':len(rows),'pivotGame':list(pivot),'boundsGame':[list(lo),list(hi)],'capInfo':cap_info,'sourceTriangleIndices':[row[1] for row in rows]})
    return ob

try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage
    snapshot['window'].view_layer=stage.view_layers[0]
    cockpit=source.objects['Teemto V16 intact | teemto-cockpit-body.010']
    right=source.objects['Teemto V16 intact | teemto-engine-right-body.013']
    # Source pilot, unchanged left engine and graphite cockpit retain their
    # exact shared geometry/material datablocks. Only object instances copied.
    retained=[]
    for ob in source.objects:
        if ob.type!='MESH' or ob in {cockpit,right}:continue
        copy=ob.copy()
        copy.parent=None
        copy.matrix_world=ob.matrix_world.copy()
        copy.name='Teemto V16 retained | '+ob.name
        stage.collection.objects.link(copy)
        retained.append(copy)
    cockpit_rows=source_triangles(cockpit)
    stub_rows,stub_loops=cut_triangles(cockpit_rows,3.5,False)
    tether_rows,tether_loops=cut_triangles(cockpit_rows,3.5,True)
    assert len(tether_loops)==len(stub_loops)
    stub_caps=cap_cut(stub_rows,stub_loops,3.5,False,.035,(.46,.64))
    tether_caps=cap_cut(tether_rows,tether_loops,3.5,True,.035,(.46,.64))
    authored_mesh('teemto-damage-cockpit-stubs-v16',stub_rows,cockpit.data.materials[0],cockpit.name,stub_caps)
    authored_mesh('teemto-damage-severed-tethers-v16',tether_rows,cockpit.data.materials[0],cockpit.name,tether_caps)
    right_rows=source_triangles(right)
    front_rows,front_loops=cut_triangles(right_rows,15.2,True)
    rear_rows,rear_loops=cut_triangles(right_rows,15.2,False)
    assert len(front_loops)==len(rear_loops)
    front_caps=cap_cut(front_rows,front_loops,15.2,True,.24,(.45,.67))
    rear_caps=cap_cut(rear_rows,rear_loops,15.2,False,.24,(.45,.67))
    authored_mesh('teemto-damage-right-front-v16',front_rows,right.data.materials[0],right.name,front_caps)
    authored_mesh('teemto-damage-right-rear-v16',rear_rows,right.data.materials[0],right.name,rear_caps)
    bpy.context.view_layer.update()
    total=sum(len(o.data.polygons) for o in stage.objects if o.type=='MESH')
    assert total<=60000, total
    assert len([o for o in stage.objects if o.type=='MESH'])==12
    report.update({'scene':stage.name,'triangles':total,'newGeometryTriangles':sum(len(o.data.polygons) for o in new_parts),'retainedMeshes':len(retained),'newGeometryMeshes':len(new_parts),'sourceSignaturePreserved':source_signature(source)==RECEIPT['sourceSignature'],'sourceCornerNormalSignaturePreserved':{o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in source.objects if o.type=='MESH'}==RECEIPT['sourceCornerNormalSignature'],'damageSignature':source_signature(stage),'damageCornerNormalSignature':{o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in stage.objects if o.type=='MESH'}})
    assert report['sourceSignaturePreserved'] and report['sourceCornerNormalSignaturePreserved']
    success=True
finally:
    if not success:
        for ob in list(bpy.data.objects):
            if ob not in snapshot['objects']:bpy.data.objects.remove(ob,do_unlink=True)
        if stage:bpy.data.scenes.remove(stage)
        for mesh in list(bpy.data.meshes):
            if mesh not in snapshot['meshes'] and mesh.users==0:bpy.data.meshes.remove(mesh)
    report['preservation']=verify_global(snapshot)
    report['sceneCountAfter']=len(bpy.data.scenes)
    report['success']=success
    print('TEEMTO_DAMAGE_RECEIPT_BEGIN')
    print(json.dumps(report,sort_keys=True,allow_nan=False))
    print('TEEMTO_DAMAGE_RECEIPT_END')
