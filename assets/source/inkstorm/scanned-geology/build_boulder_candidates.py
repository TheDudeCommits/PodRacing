"""Closed measured-volume fallback, authored through Blender MCP.

Original boulder scan is preserved. Only duplicate meshes are painted, oriented,
normalized and decimated. No generated closure, Boolean, textures or raster edits.
"""
import bpy,bmesh,math
from mathutils import Vector
ROOT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/scanned-geology'
original=bpy.context.window.scene
lab=bpy.data.scenes['Inkstorm Scanned Geology Lab']

def select(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False);obj.select_set(True);bpy.context.view_layer.objects.active=obj

def finish(obj,budget,path):
    obj.data.calc_loop_triangles()
    mod=obj.modifiers.new('Measured fracture budget','DECIMATE')
    mod.ratio=min(1,budget/len(obj.data.loop_triangles));mod.use_collapse_triangulate=True
    select(obj);bpy.ops.object.modifier_apply(modifier=mod.name)
    lo=[min(v.co[i] for v in obj.data.vertices) for i in range(3)]
    hi=[max(v.co[i] for v in obj.data.vertices) for i in range(3)]
    for v in obj.data.vertices:
        v.co=((v.co.x-lo[0])/(hi[0]-lo[0])*80-40,(v.co.y-lo[1])/(hi[1]-lo[1])*100-50,(v.co.z-lo[2])/(hi[2]-lo[2])*120)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    for edge in bm.edges:edge.smooth=edge.is_manifold and edge.calc_face_angle(0)<.58
    boundary=sum(e.is_boundary for e in bm.edges);nonmanifold=sum(not e.is_manifold for e in bm.edges)
    volume=bm.calc_volume(signed=True)
    assert boundary==0 and nonmanifold==0 and volume>0
    bm.to_mesh(obj.data);bm.free()
    obj.data.update();obj.data.calc_loop_triangles()
    select(obj)
    bpy.ops.export_scene.gltf(filepath=ROOT+'/'+path,export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'object':obj.name,'file':path,'triangles':len(obj.data.loop_triangles),'vertices':len(obj.data.vertices),'boundaryEdges':boundary,'nonManifoldEdges':nonmanifold,'signedVolume':volume,'canonicalBlenderBounds':[[-40,-50,0],[40,50,120]]})

try:
    bpy.context.window.scene=lab
    before=set(lab.objects)
    bpy.ops.import_scene.gltf(filepath=ROOT+'/boulder_01-painted-front.glb')
    preserved=next(o for o in lab.objects if o not in before and o.type=='MESH')
    preserved.name='PH-boulder_01-painted-source'
    for index in [1,2]:
        obj=preserved.copy();obj.data=preserved.data.copy();obj.name='boulder-sandstone-'+str(index)+'-candidate'
        lab.collection.objects.link(obj)
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
        assert all(e.is_manifold for e in bm.edges)
        bm.to_mesh(obj.data);bm.free()
        if index==2:
            for v in obj.data.vertices:v.co=(v.co.x,-v.co.z,v.co.y)
        # A small broad shear makes the upright variant lean as a buttress,
        # retaining the complete measured silhouette and real crown fractures.
        if index==1:
            for v in obj.data.vertices:v.co.x+=v.co.z*.12
        material=bpy.data.materials.new('Inkstorm_Boulder_Sandstone_'+str(index));material.use_nodes=True
        shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.94;shader.inputs['Specular IOR Level'].default_value=.18
        color=material.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='Color';material.node_tree.links.new(color.outputs['Color'],shader.inputs['Base Color'])
        obj.data.materials.clear();obj.data.materials.append(material)
        finish(obj,28000,'boulder-'+str(index)+'-raw-high.glb')
        low=obj.copy();low.data=obj.data.copy();low.name='boulder-sandstone-'+str(index)+'-lod'
        lab.collection.objects.link(low)
        finish(low,4200,'boulder-'+str(index)+'-raw-lod.glb')
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/boulder-candidates-checkpoint.blend',copy=True)
finally:bpy.context.window.scene=original
