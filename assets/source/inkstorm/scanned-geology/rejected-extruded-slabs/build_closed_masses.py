"""Build finite backed mass from prepainted CC0 scan faces, via Blender MCP.
Prerequisites: import_sources.py and CLI prepare_fronts.mjs + bake_source_colors.py.
This bounded pass uses no image pixel arrays, remesh, Boolean or DCC decimation.
All exports are staged. Source objects and all prior scene objects remain intact.
"""
import bpy,bmesh,math
from mathutils import Vector
ROOT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/scanned-geology'
original=bpy.context.window.scene
lab=bpy.data.scenes['Inkstorm Scanned Geology Lab']

def face_area(face):return face.calc_area()
def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4

def clean_front(asset):
    before=set(lab.objects)
    bpy.ops.import_scene.gltf(filepath=ROOT+'/'+asset+'-painted-front.glb')
    source=next(o for o in lab.objects if o not in before and o.type=='MESH')
    source.name='PH-'+asset+'-prepared-front'
    mesh=source.data.copy();bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005)
    removed=0
    for attempt in range(4):
        extras=[]
        for edge in bm.edges:
            if len(edge.link_faces)>2:extras.extend(sorted(edge.link_faces,key=face_area)[:len(edge.link_faces)-2])
        extras=list(set(extras))
        if not extras:break
        removed+=len(extras);bmesh.ops.delete(bm,geom=extras,context='FACES_ONLY')
    loose=[vertex for vertex in bm.verts if not vertex.link_faces]
    if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    # A few open-scan border tips connect two boundary fans at one vertex.
    # Remove the tiny incident stars before extrusion, so no four-wall seam
    # is created through the backed volume.
    for attempt in range(6):
        pinch=[vertex for vertex in bm.verts if sum(edge.is_boundary for edge in vertex.link_edges)>2]
        if not pinch:break
        tiny=list({face for vertex in pinch for face in vertex.link_faces})
        removed+=len(tiny);bmesh.ops.delete(bm,geom=tiny,context='FACES_ONLY')
        loose=[vertex for vertex in bm.verts if not vertex.link_faces]
        if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
    assert all(sum(edge.is_boundary for edge in vertex.link_edges)<=2 for vertex in bm.verts)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    return bm,removed

def build(asset,index):
    bm,removed=clean_front(asset)
    average=sum((face.normal*face.calc_area() for face in bm.faces),Vector())
    rotation=average.normalized().rotation_difference(Vector((0,-1,0)))
    for vertex in bm.verts:vertex.co=rotation@vertex.co
    bm.verts.ensure_lookup_table();bm.verts.index_update()
    coords=[vertex.co.copy() for vertex in bm.verts]
    lo=[min(v[i] for v in coords) for i in range(3)];hi=[max(v[i] for v in coords) for i in range(3)]
    color_layer=bm.loops.layers.color.get('Color')
    assert color_layer is not None
    vertices=[];faces=[];colors=[]
    for v in coords:
        u=(v.x-lo[0])/(hi[0]-lo[0])*2-1;h=(v.z-lo[2])/(hi[2]-lo[2])
        depth=(v.y-lo[1])/(hi[1]-lo[1])-.5
        vertices.append((u*40,-38+depth*25,h*120))
    n=len(vertices)
    for v in list(vertices):
        h=v[2]/120
        vertices.append((v[0]*(.86+.10*h)+2*math.sin(h*3.2),35-(v[1]+38)*.68,(v[2]-60)*.97+60))
    for face in bm.faces:
        ids=[v.index for v in face.verts]
        color=[tuple(linear(c) for c in tuple(loop[color_layer])[:3]) for loop in face.loops]
        faces.append(ids);colors.extend([(*c,1) for c in color])
        faces.append([i+n for i in reversed(ids)]);colors.extend([(*(v*.90 for v in c),1) for c in reversed(color)])
    boundary=[edge for edge in bm.edges if edge.is_boundary]
    boundary_vertices={v.index for edge in boundary for v in edge.verts};side_indices={}
    for vi in boundary_vertices:
        front=Vector(vertices[vi]);back=Vector(vertices[vi+n])
        for k in [1,2]:
            t=k/3;v=front.lerp(back,t)
            v.x*=.95+.035*math.sin(v.z*.079+index+k)
            v.z+=1.6*math.sin(v.x*.065+index)*math.sin(math.pi*t)
            side_indices[(vi,k)]=len(vertices);vertices.append(tuple(v))
    for edge in boundary:
        loop=edge.link_loops[0];a=loop.vert.index;b=loop.link_loop_next.vert.index
        ca=tuple(linear(c) for c in tuple(loop[color_layer])[:3]);cb=tuple(linear(c) for c in tuple(loop.link_loop_next[color_layer])[:3])
        ra=[a,side_indices[(a,1)],side_indices[(a,2)],a+n];rb=[b,side_indices[(b,1)],side_indices[(b,2)],b+n]
        for k in range(3):
            faces.append([rb[k],ra[k],ra[k+1],rb[k+1]])
            shade=.76+.08*math.sin(k*2.2+index)
            colors.extend([(*(v*shade for v in c),1) for c in [cb,ca,ca,cb]])
    bm.free()
    # Normalize real geometry extrema, never insert disconnected bounds points.
    lo=[min(v[i] for v in vertices) for i in range(3)];hi=[max(v[i] for v in vertices) for i in range(3)]
    vertices=[((v[0]-lo[0])/(hi[0]-lo[0])*80-40,(v[1]-lo[1])/(hi[1]-lo[1])*100-50,(v[2]-lo[2])/(hi[2]-lo[2])*120) for v in vertices]
    mesh=bpy.data.meshes.new('scanned-sandstone-'+str(index)+'-closed-mass')
    mesh.from_pydata(vertices,[],faces);mesh.update()
    mesh.polygons.foreach_set('use_smooth',[True]*len(mesh.polygons))
    attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    attr.data.foreach_set('color',[v for c in colors for v in c]);mesh.color_attributes.active_color=attr
    material=bpy.data.materials.new('Inkstorm_Scanned_Sandstone_'+str(index));material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.94
    node=material.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Color';material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    mesh.materials.append(material)
    obj=bpy.data.objects.new('scanned-sandstone-'+str(index)+'-candidate',mesh);lab.collection.objects.link(obj)
    obj['source_asset']=asset;obj['inkstorm_scanned_candidate']=True
    check=bmesh.new();check.from_mesh(mesh);bmesh.ops.recalc_face_normals(check,faces=list(check.faces))
    boundary_count=sum(e.is_boundary for e in check.edges);nonmanifold=sum(not e.is_manifold for e in check.edges)
    volume=check.calc_volume(signed=True);assert boundary_count==0 and nonmanifold==0;check.to_mesh(mesh);check.free();mesh.calc_loop_triangles()
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=ROOT+'/candidate-'+str(index)+'-raw-high.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'asset':asset,'object':obj.name,'triangles':len(mesh.loop_triangles),'vertices':len(mesh.vertices),'boundaryEdges':boundary_count,'nonManifoldEdges':nonmanifold,'signedVolume':volume,'removedExcessSourceFaces':removed,'colorOnlyNoTextures':True})
    return obj

try:
    bpy.context.window.scene=lab
    build('rock_face_02',2)
    build('rock_face_01',1)
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/closed-candidates-checkpoint.blend',copy=True)
finally:bpy.context.window.scene=original
