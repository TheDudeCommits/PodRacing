"""Staged crown/flank experiment via Blender MCP; preserves earlier candidates.

The source mesh stays an opaque backed volume. Reduced CC0 scan patches overlap
that core to interrupt its exposed extrusion, all joined into one material draw.
Overlapping geometry is deliberate; this assembly is not a Boolean solid union.
"""
import bpy,bmesh,math
from mathutils import Vector
ROOT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/scanned-geology'
original=bpy.context.window.scene
lab=bpy.data.scenes['Inkstorm Scanned Geology Lab']

def selected(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False);obj.select_set(True);bpy.context.view_layer.objects.active=obj

def reduce(obj,budget):
    obj.data.calc_loop_triangles()
    decimate=obj.modifiers.new('Scan patch budget','DECIMATE')
    decimate.ratio=min(1,budget/max(1,len(obj.data.loop_triangles)))
    decimate.use_collapse_triangulate=True
    selected(obj);bpy.ops.object.modifier_apply(modifier=decimate.name)

def source_patch(asset,name,budget):
    before=set(lab.objects)
    bpy.ops.import_scene.gltf(filepath=ROOT+'/'+asset+'-painted-front.glb')
    obj=next(o for o in lab.objects if o not in before and o.type=='MESH')
    obj.name=name
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000005)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    average=sum((face.normal*face.calc_area() for face in bm.faces),Vector())
    rotation=average.normalized().rotation_difference(Vector((0,-1,0)))
    for v in bm.verts:v.co=rotation@v.co
    bm.to_mesh(obj.data);bm.free()
    reduce(obj,budget)
    lo=[min(v.co[i] for v in obj.data.vertices) for i in range(3)]
    hi=[max(v.co[i] for v in obj.data.vertices) for i in range(3)]
    for v in obj.data.vertices:
        v.co=((v.co.x-lo[0])/(hi[0]-lo[0])*2-1,(v.co.y-lo[1])/(hi[1]-lo[1]),(v.co.z-lo[2])/(hi[2]-lo[2]))
    return obj

def candidate(index):
    name='scanned-sandstone-'+str(index)+'-candidate.003'
    source=lab.objects[name]
    core=source.copy();core.data=source.data.copy();core.name='dressed-sandstone-'+str(index)+'-core'
    lab.collection.objects.link(core)
    for v in core.data.vertices:
        h=v.co.z/120
        v.co.x*=.95-.12*h;v.co.y*=.97-.12*h;v.co.z*=.80
    reduce(core,19500)
    material=source.data.materials[0]
    crown=source_patch('rock_face_01','dressed-crown-'+str(index),5000)
    for v in crown.data.vertices:
        u,d,h=v.co
        v.co=(u*46,(h-.5)*108,91+(1-d)*24+4*math.sin(u*2.6+index)+4*h)
    tier=source_patch('rock_face_02','dressed-crown-tier-'+str(index),2300)
    for v in tier.data.vertices:
        u,d,h=v.co;x=u*27;y=(h-.5)*57
        angle=.37 if index==2 else -.49
        v.co=(x*math.cos(angle)-y*math.sin(angle)-8,x*math.sin(angle)+y*math.cos(angle)+17,102+(1-d)*18-6*h)
    patches=[core,crown,tier]
    for sign in [-1,1]:
        flank=source_patch('rock_face_01' if sign==1 else 'rock_face_02','dressed-flank-'+str(index)+'-'+str(sign),2200)
        for v in flank.data.vertices:
            u,d,h=v.co
            # The full broken patch spans the old seam, interpenetrating both
            # scan faces. No thin, straight cap strip remains exposed.
            radius=31+(1-d)*9
            v.co=(sign*(radius+3*math.sin(h*4.5+index)),u*27+5*math.sin(h*5),h*101+2)
        if sign==-1:
            bm=bmesh.new();bm.from_mesh(flank.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(flank.data);bm.free()
        patches.append(flank)
    for obj in patches:
        obj.data.materials.clear();obj.data.materials.append(material)
        for face in obj.data.polygons:face.material_index=0
    bpy.ops.object.select_all(action='DESELECT')
    for obj in patches:obj.hide_set(False);obj.select_set(True)
    bpy.context.view_layer.objects.active=core;bpy.ops.object.join()
    core.name='dressed-sandstone-'+str(index)+'-candidate'
    lo=[min(v.co[i] for v in core.data.vertices) for i in range(3)]
    hi=[max(v.co[i] for v in core.data.vertices) for i in range(3)]
    for v in core.data.vertices:
        v.co=((v.co.x-lo[0])/(hi[0]-lo[0])*80-40,(v.co.y-lo[1])/(hi[1]-lo[1])*100-50,(v.co.z-lo[2])/(hi[2]-lo[2])*120)
    # Smooth scan faces retain geological facets from actual measured positions.
    core.data.update();core.data.calc_loop_triangles()
    selected(core)
    bpy.ops.export_scene.gltf(filepath=ROOT+'/dressed-'+str(index)+'-raw-high.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'candidate':core.name,'triangles':len(core.data.loop_triangles),'vertices':len(core.data.vertices),'construction':'closed core plus four opaque overlapping scan modules','public':False})

try:
    bpy.context.window.scene=lab
    candidate(2);candidate(1)
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/dressed-candidates-checkpoint.blend',copy=True)
finally:bpy.context.window.scene=original
