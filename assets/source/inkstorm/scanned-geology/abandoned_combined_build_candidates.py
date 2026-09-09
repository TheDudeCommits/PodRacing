"""Staged Inkstorm derivatives of verified CC0 Poly Haven rock-face scans.
Literal Blender MCP source. Preserved scan objects, photos and public game assets
remain unchanged. Fracture faces form a backed, closed mass with sculpted flanks.
"""
import bpy, bmesh, math
from mathutils import Vector
ROOT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/scanned-geology'
original=bpy.context.window.scene
lab=bpy.data.scenes['Inkstorm Scanned Geology Lab']

def face_area(face):return face.calc_area()
def clamp(x):return min(1.0,max(0.0,x))
def mix(a,b,t):return tuple(a[i]*(1-t)+b[i]*t for i in range(3))
def paint(value,ao):
    # Original photograph supplies only value/occlusion, never its moss hue.
    t=clamp(value*.84+.16)
    if t<.40:c=mix((.105,.038,.070),(.46,.128,.065),t/.40)
    elif t<.75:c=mix((.46,.128,.065),(.78,.265,.095),(t-.40)/.35)
    else:c=mix((.78,.265,.095),(.95,.60,.255),(t-.75)/.25)
    occlusion=clamp((1-ao)*1.45)
    return mix(c,(.105,.055,.12),occlusion*.53)

def data_for_image(image):
    return (image.size[0],image.size[1],image.pixels[:])

def image_sample(data,uv):
    w,h,pixels=data
    x=clamp(uv.x)*(w-1);y=clamp(uv.y)*(h-1)
    x0=int(x);y0=int(y);x1=min(w-1,x0+1);y1=min(h-1,y0+1)
    tx=x-x0;ty=y-y0
    out=[]
    for c in range(3):
        a=pixels[(y0*w+x0)*4+c]*(1-tx)+pixels[(y0*w+x1)*4+c]*tx
        b=pixels[(y1*w+x0)*4+c]*(1-tx)+pixels[(y1*w+x1)*4+c]*tx
        out.append(a*(1-ty)+b*ty)
    return out

def normalize_bounds(mesh):
    values=[v.co.copy() for v in mesh.vertices]
    lo=[min(v[i] for v in values) for i in range(3)]
    hi=[max(v[i] for v in values) for i in range(3)]
    for v in mesh.vertices:
        v.co.x=(v.co.x-lo[0])/(hi[0]-lo[0])*80-40
        v.co.y=(v.co.y-lo[1])/(hi[1]-lo[1])*100-50
        v.co.z=(v.co.z-lo[2])/(hi[2]-lo[2])*120
    mesh.update()

def export(obj,name):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=ROOT+'/'+name+'.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')

def build(asset,index):
    source=lab.objects['PH-'+asset+'-unmodified-source']
    working=source.data.copy()
    material=source.data.materials[0]
    images=[node.image for node in material.node_tree.nodes if node.type=='TEX_IMAGE' and node.image]
    diffuse=next(image for image in images if '_diff' in image.name)
    arm=next(image for image in images if '_rough' in image.name or '_arm' in image.name)
    diffuse_data=data_for_image(diffuse);arm_data=data_for_image(arm)
    uv=working.uv_layers.active.data
    values=[];aos=[]
    for loop in working.loops:
        rgb=image_sample(diffuse_data,uv[loop.index].uv)
        values.append(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)
        aos.append(image_sample(arm_data,uv[loop.index].uv)[0])
    ordered=sorted(values);low=ordered[int(len(ordered)*.04)];high=ordered[int(len(ordered)*.95)]
    attr=working.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for i in range(len(values)):
        value=clamp((values[i]-low)/max(.001,high-low))
        # Four broad value families retain meaningful edge stains without full photo chroma.
        value=round(value*14)/14
        attr.data[i].color=(*paint(value,aos[i]),1)
    working.color_attributes.active_color=attr
    bm=bmesh.new();bm.from_mesh(working)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    bmesh.ops.dissolve_degenerate(bm,dist=.000001,edges=list(bm.edges))
    removed=0
    # Scan seams occasionally create tiny three-face overlaps after UV welding.
    # Remove only excess incident microfaces before closing the boundary shell.
    for attempt in range(4):
        extras=[]
        for edge in bm.edges:
            if len(edge.link_faces)>2:extras.extend(sorted(edge.link_faces,key=face_area)[:len(edge.link_faces)-2])
        extras=list(set(extras))
        if not extras:break
        removed+=len(extras);bmesh.ops.delete(bm,geom=extras,context='FACES_ONLY')
    loose=[v for v in bm.verts if not v.link_faces]
    if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    average=sum((face.normal*face.calc_area() for face in bm.faces),Vector())
    rotation=average.normalized().rotation_difference(Vector((0,-1,0)))
    for vertex in bm.verts:vertex.co=rotation@vertex.co
    bm.verts.ensure_lookup_table();bm.verts.index_update();bm.faces.ensure_lookup_table()
    coords=[vertex.co.copy() for vertex in bm.verts]
    lo=[min(p[i] for p in coords) for i in range(3)];hi=[max(p[i] for p in coords) for i in range(3)]
    color_layer=bm.loops.layers.float_color.get('Color')
    vertices=[];faces=[];colors=[]
    for v in coords:
        u=(v.x-lo[0])/(hi[0]-lo[0])*2-1
        h=(v.z-lo[2])/(hi[2]-lo[2])
        depth=(v.y-lo[1])/(hi[1]-lo[1])-.5
        # Preserve scanned relief at 25 m depth; build the rear around +35 m.
        vertices.append((u*40,-38+depth*25,h*120))
    n=len(vertices)
    for i,v in enumerate(vertices):
        h=v[2]/120
        vertices.append((v[0]*(.86+.10*h)+2*math.sin(h*3.2),35-(v[1]+38)*.68,(v[2]-60)*.97+60))
    front_faces=list(bm.faces)
    for face in front_faces:
        ids=[v.index for v in face.verts]
        faces.append(ids);colors.append([tuple(loop[color_layer])[:3] for loop in face.loops])
        faces.append([i+n for i in reversed(ids)])
        colors.append([tuple(c*.90 for c in tuple(loop[color_layer])[:3]) for loop in reversed(list(face.loops))])
    # Connect all boundary cycles to a backed volume with two inset flank rings.
    # Internal holes become finite rock recess/tunnel walls rather than paper edges.
    boundary=[edge for edge in bm.edges if edge.is_boundary]
    boundary_vertices={v.index for edge in boundary for v in edge.verts}
    side_indices={}
    for vi in boundary_vertices:
        front=Vector(vertices[vi]);back=Vector(vertices[vi+n])
        for k in [1,2]:
            t=k/3;v=front.lerp(back,t)
            v.x*=.95+.035*math.sin(v.z*.079+index+k)
            v.z+=1.6*math.sin(v.x*.065+index)*math.sin(math.pi*t)
            side_indices[(vi,k)]=len(vertices);vertices.append(tuple(v))
    for edge in boundary:
        loop=edge.link_loops[0];a=loop.vert.index;b=loop.link_loop_next.vert.index
        ca=tuple(loop[color_layer])[:3];cb=tuple(loop.link_loop_next[color_layer])[:3]
        ra=[a,side_indices[(a,1)],side_indices[(a,2)],a+n]
        rb=[b,side_indices[(b,1)],side_indices[(b,2)],b+n]
        for k in range(3):
            faces.append([rb[k],ra[k],ra[k+1],rb[k+1]])
            shade=.76+.08*math.sin(k*2.2+index)
            colors.append([tuple(c*shade for c in cb),tuple(c*shade for c in ca),tuple(c*shade for c in ca),tuple(c*shade for c in cb)])
    bm.free()
    mesh=bpy.data.meshes.new('scanned-sandstone-'+str(index)+'-closed-mass')
    mesh.from_pydata(vertices,[],faces);mesh.update()
    attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for polygon,color_list in zip(mesh.polygons,colors):
        polygon.use_smooth=True
        for li,color in zip(polygon.loop_indices,color_list):attr.data[li].color=(*color,1)
    mesh.color_attributes.active_color=attr
    material=bpy.data.materials.new('Inkstorm_Scanned_Sandstone_'+str(index));material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.94
    node=material.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Color'
    material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color']);mesh.materials.append(material)
    obj=bpy.data.objects.new('scanned-sandstone-'+str(index)+'-candidate',mesh);lab.collection.objects.link(obj)
    obj['source_asset']=asset;obj['source_license']='CC0';obj['inkstorm_scanned_candidate']=True
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    mesh.calc_loop_triangles();original_triangles=len(mesh.loop_triangles)
    modifier=obj.modifiers.new('Bounded fractured high mesh','DECIMATE');modifier.ratio=min(1.,32500/original_triangles);modifier.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    normalize_bounds(obj.data)
    obj.data.calc_loop_triangles()
    # Clear obsolete source custom normals after geometry construction and reduction.
    check=bmesh.new();check.from_mesh(obj.data);bmesh.ops.recalc_face_normals(check,faces=list(check.faces));check.to_mesh(obj.data);check.free()
    export(obj,'candidate-'+str(index)+'-high')
    high_triangles=len(obj.data.loop_triangles)
    lod=obj.copy();lod.data=obj.data.copy();lod.name='scanned-sandstone-'+str(index)+'-lod-candidate';lab.collection.objects.link(lod)
    bpy.ops.object.select_all(action='DESELECT');lod.select_set(True);bpy.context.view_layer.objects.active=lod
    modifier=lod.modifiers.new('Distant fractured mesh','DECIMATE');modifier.ratio=4200/high_triangles;modifier.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=modifier.name);normalize_bounds(lod.data)
    export(lod,'candidate-'+str(index)+'-lod')
    for item in [obj,lod]:
        item.data.calc_loop_triangles();check=bmesh.new();check.from_mesh(item.data)
        bmesh.ops.remove_doubles(check,verts=list(check.verts),dist=.0001)
        print({'asset':asset,'object':item.name,'triangles':len(item.data.loop_triangles),'vertices':len(item.data.vertices),'boundaryEdges':sum(e.is_boundary for e in check.edges),'nonManifoldEdges':sum(not e.is_manifold for e in check.edges),'volume':check.calc_volume(signed=True),'valueRange':[low,high],'removedExcessSourceFaces':removed,'meanAO':sum(aos)/len(aos),'colorOnlyNoTextures':True})
        check.free()
    return obj,lod

try:
    bpy.context.window.scene=lab
    build('rock_face_02',2)
    build('rock_face_01',1)
finally:bpy.context.window.scene=original
