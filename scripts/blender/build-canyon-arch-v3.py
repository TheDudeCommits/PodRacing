"""Compose original arch arrangement from licensed CC0 scanned rock volumes.

Send literal source through Blender MCP. Stages: build, export, front, quarter,
underside, inspect. Only this new scene is mutated; no .blend is saved.
"""
import bpy
import bmesh
import math
import json
from mathutils import Vector, Matrix, Euler

ROOT='/Users/amir/Projects/PodRacing'
STAGE=ROOT+'/assets/source/inkstorm/canyon-arch-v3'
OUTPUT=ROOT+'/output/arch-v3'
SCENE='PodRacing — CC0 fractured canyon arch v3'
OBJECT='canyon-arch-v3'
SOURCES={
    1:ROOT+'/assets/source/inkstorm/scanned-geology/boulder-1-lod.glb',
    2:ROOT+'/assets/source/inkstorm/scanned-geology/boulder-2-lod.glb',
}

# All coordinates below are the game/glTF frame: across X, up Y, depth Z.
# Modest rotations expose different actual scanned faces. Cap chunks turn
# the scan's long axis sideways rather than flattening it into a sheet.
# Each tuple: name, source, Euler degrees in Blender XYZ, desired AABB.
PIECES=[
 ('left-root',1,(4,-8,7),(-83.2,0,-15.8),(-49.2,46,15.8)),
 ('left-shoulder',2,(-8,-24,5),(-80.5,28,-16.5),(-29,80.5,15.7)),
 ('high-left-cap',1,(7,76,-5),(-63,53,-15.4),(-8,94,16.1)),
 ('middle-span',2,(-6,100,4),(-29,50,-16.3),(31,84.5,14.9)),
 ('descending-span',1,(10,112,-6),(11,40.5,-14.7),(65,76.5,16.4)),
 ('right-springing',2,(-7,29,-8),(43.5,24.5,-16.4),(86.5,66,15.6)),
 ('right-root',1,(6,15,176),(49.5,0,-15.7),(85.5,41.5,16.3)),
 ('left-root-shelf',2,(12,72,5),(-83.4,10,-16.6),(-49.1,37,14.0)),
 ('right-root-shelf',2,(-11,104,178),(49.2,6,-15.6),(86.7,31,16.4)),
]


def aabb(mesh):
    points=[v.co for v in mesh.vertices]
    return ([min(p[k] for p in points) for k in range(3)],
            [max(p[k] for p in points) for k in range(3)])


def topology(mesh):
    bm=bmesh.new();bm.from_mesh(mesh)
    boundary=sum(e.is_boundary for e in bm.edges)
    nonmanifold=sum(not e.is_manifold for e in bm.edges)
    bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table()
    visited=set();components=[]
    for start in bm.verts:
        if start.index in visited:continue
        stack=[start];visited.add(start.index);count=0
        while stack:
            v=stack.pop();count+=1
            for edge in v.link_edges:
                other=edge.other_vert(v)
                if other.index not in visited:visited.add(other.index);stack.append(other)
        components.append(count)
    volume=bm.calc_volume(signed=True)
    bm.free()
    mesh.calc_loop_triangles()
    return {'triangles':len(mesh.loop_triangles),'vertices':len(mesh.vertices),
            'boundaryEdges':boundary,'nonManifoldEdges':nonmanifold,
            'connectedComponents':len(components),'componentVertexCounts':components,'signedVolume':volume}


def import_source(scene,index):
    before=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=SOURCES[index],merge_vertices=True)
    imported=[o for o in scene.objects if o not in before]
    meshes=[o for o in imported if o.type=='MESH']
    assert len(meshes)==1
    mesh=meshes[0].data.copy();mesh.name=OBJECT+'-template-'+str(index)
    mesh.transform(meshes[0].matrix_world)
    # Only identical import seams are welded. No remesh, smoothing, invented
    # strata, or displacement alters the scan's geological relief.
    bm=bmesh.new();bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    bounds=aabb(mesh);center=Vector([(bounds[0][i]+bounds[1][i])/2 for i in range(3)])
    mesh.transform(Matrix.Translation(-center));mesh.update()
    check=topology(mesh)
    assert check['boundaryEdges']==0 and check['nonManifoldEdges']==0
    assert check['connectedComponents']==1 and check['signedVolume']>0
    return mesh,check


def fit_piece(scene,template,spec,material):
    name,index,degrees,gmin,gmax=spec
    mesh=template.copy();mesh.name=OBJECT+'-'+name+'-mesh'
    rotate=Euler(tuple(math.radians(d) for d in degrees),'XYZ').to_matrix().to_4x4()
    mesh.transform(rotate)
    oldmin,oldmax=aabb(mesh)
    # Convert game target box to Blender X/Y/Z, with glTF Z=-Blender Y.
    low=[gmin[0],-gmax[2],gmin[1]];high=[gmax[0],-gmin[2],gmax[1]]
    scale=[(high[i]-low[i])/(oldmax[i]-oldmin[i]) for i in range(3)]
    assert max(scale)/min(scale)<2.6, 'Do not crush a volume into a sheet.'
    transform=Matrix.Translation(Vector(low)) @ Matrix.Diagonal(Vector((*scale,1))) @ Matrix.Translation(-Vector(oldmin))
    mesh.transform(transform)
    mesh.materials.clear();mesh.materials.append(material)
    for p in mesh.polygons:p.material_index=0
    mesh.update()
    obj=bpy.data.objects.new(OBJECT+'-'+name,mesh);scene.collection.objects.link(obj)
    check=topology(mesh)
    assert check['boundaryEdges']==0 and check['nonManifoldEdges']==0 and check['connectedComponents']==1
    assert check['signedVolume']>0
    # Whole bounding volume clears the lower passage, so all its contained
    # triangles clear it without trimming or sealing invented blank faces.
    assert gmax[0] <= -44 or gmin[0]>=44 or gmin[1]>24
    return obj,{'name':name,'sourceVariant':index,'rotationDegreesBlenderXYZ':degrees,
                'targetBounds':{'min':gmin,'max':gmax},'scaleXYZ':scale,
                'nonuniformScaleRatio':max(scale)/min(scale),'topology':check}


def point_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def build():
    assert SCENE not in bpy.data.scenes
    scene=bpy.data.scenes.new(SCENE);bpy.context.window.scene=scene
    templates={};sourcechecks={}
    for index in (1,2):templates[index],sourcechecks[index]=import_source(scene,index)
    mat=bpy.data.materials.new(OBJECT+'-vertex-stone');mat.use_nodes=True
    nodes=mat.node_tree.nodes;bsdf=nodes.get('Principled BSDF')
    attr=nodes.new('ShaderNodeVertexColor')
    attr.layer_name=templates[1].color_attributes.active_color.name
    mat.node_tree.links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=.94
    pieces=[];receipts=[]
    for spec in PIECES:
        piece,receipt=fit_piece(scene,templates[spec[1]],spec,mat)
        pieces.append(piece);receipts.append(receipt)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:obj.select_set(True)
    scene.view_layers[0].objects.active=pieces[0]
    bpy.ops.object.join();obj=scene.view_layers[0].objects.active;obj.name=OBJECT
    obj.data.name=OBJECT+'-merged-scan-components'
    merged=topology(obj.data);assert merged['triangles']<=45000
    assert merged['connectedComponents']==len(PIECES)
    scene.world=bpy.data.worlds.new(OBJECT+'-world');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.21,.29,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    camera=bpy.data.objects.new(OBJECT+'-camera',bpy.data.cameras.new(OBJECT+'-camera'))
    scene.collection.objects.link(camera);scene.camera=camera;camera.data.lens=48
    for name,location,energy,size,color in (
        ('key',(-90,-110,165),190000,95,(1,.75,.49)),
        ('fill',(80,-85,95),65000,110,(.52,.65,1)),
        ('rim',(20,60,125),170000,85,(1,.69,.37))):
        data=bpy.data.lights.new(OBJECT+'-'+name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
        light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light);light.location=location;point_at(light,(0,0,45))
    scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1500;scene.render.resolution_y=1000
    scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
    print('ARCH_V3_BUILD_RECEIPT='+json.dumps({'sourceChecks':sourcechecks,'components':receipts,'merged':merged,
        'source':'Poly Haven boulder_01, Rico Cilliers, CC0; previously validated boulder-1/2 LOD geometry',
        'construction':'9 overlapping watertight scanned rock volumes; no Boolean, remesh, or displacement',
        'sourceNormalsAndVertexColors':'retained through import, transform, and merge'}))


def export():
    scene=bpy.data.scenes[SCENE];bpy.context.window.scene=scene
    bpy.ops.object.select_all(action='DESELECT');obj=scene.objects[OBJECT];obj.select_set(True)
    scene.view_layers[0].objects.active=obj
    bpy.ops.export_scene.gltf(filepath=STAGE+'/canyon-arch-v3-source.glb',export_format='GLB',use_selection=True,
        use_active_scene=True,export_extras=False,export_animations=False,export_cameras=False,export_lights=False,
        export_yup=True,export_normals=True,export_texcoords=False,export_materials='EXPORT')
    print(json.dumps({'export':STAGE+'/canyon-arch-v3-source.glb','topology':topology(obj.data)}))


def render(view):
    scene=bpy.data.scenes[SCENE];bpy.context.window.scene=scene
    camera=scene.camera;camera.data.type='PERSP';camera.data.lens=48
    if view=='front':camera.location=(0,-280,91);target=(0,0,47)
    elif view=='quarter':camera.location=(151,-237,128);target=(0,0,45)
    elif view=='underside':camera.location=(20,-140,17);target=(-2,2,56);camera.data.lens=26
    else:raise ValueError(view)
    point_at(camera,target);scene.render.filepath=OUTPUT+'/'+view+'.png'
    bpy.ops.render.render(write_still=True)
    print(json.dumps({'render':scene.render.filepath,'camera':list(camera.location),'target':target,
                      'engine':scene.render.engine,'geometry':OBJECT,'material':'actual preserved scan vertex color, area lights'}))


def dispatch(action):
    window=bpy.context.window;old_scene=window.scene;old_layer=window.view_layer
    old_active=old_layer.objects.active
    old_selection=[o for o in old_layer.objects if o.select_get(view_layer=old_layer)]
    before={'scene':old_scene.name,'viewLayer':old_layer.name,'active':old_active.name if old_active else None,
            'selected':sorted(o.name for o in old_selection),'objectCount':len(old_scene.objects)}
    try:
        if action=='build':build()
        elif action=='export':export()
        elif action=='inspect':print(json.dumps(topology(bpy.data.scenes[SCENE].objects[OBJECT].data)))
        else:render(action)
    finally:
        window.scene=old_scene;window.view_layer=old_layer
        current={o for o in old_layer.objects if o.select_get(view_layer=old_layer)}
        if current!=set(old_selection):
            for o in current-set(old_selection):o.select_set(False,view_layer=old_layer)
            for o in set(old_selection)-current:o.select_set(True,view_layer=old_layer)
        old_layer.objects.active=old_active
        after={'scene':window.scene.name,'viewLayer':window.view_layer.name,'active':old_layer.objects.active.name if old_layer.objects.active else None,
               'selected':sorted(o.name for o in old_layer.objects if o.select_get(view_layer=old_layer)),
               'objectCount':len(window.scene.objects)}
        assert before==after
        print(json.dumps({'contextPreserved':True,'before':before,'after':after}))


dispatch('build')
