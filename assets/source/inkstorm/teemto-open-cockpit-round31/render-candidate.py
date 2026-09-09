"""Blender MCP isolated inspection of the exact packaged candidate (CPU Cycles)."""
import bpy
import json
from mathutils import Vector

STAGE = 'PodRacing — Teemto open cockpit round31 consolidated review'
SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/teemto-open-cockpit-round31/teemto-open-cockpit-round31-candidate.glb'
BASE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/teemto-open-cockpit-round31/'
assert STAGE not in bpy.data.scenes
window=bpy.context.window
original_scene=window.scene
original_layer=window.view_layer
active=original_layer.objects.active
selected=list(bpy.context.selected_objects)
memberships={scene:set(scene.objects) for scene in bpy.data.scenes}
collections={col:(set(col.objects),set(col.children)) for col in bpy.data.collections}
stage=bpy.data.scenes.new(STAGE)
report={'scene':STAGE,'source':SOURCE,'images':[],
        'scope':'Isolated asset inspection; the chase eye is unchanged but aims at the cockpit for a close inspection. These are not in-world race screenshots or visual acceptance.'}
try:
    window.scene=stage
    window.view_layer=stage.view_layers[0]
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    stage.render.engine='CYCLES'
    stage.cycles.device='CPU'
    stage.cycles.samples=16
    stage.cycles.use_denoising=True
    stage.render.resolution_x=1200
    stage.render.resolution_y=800
    stage.render.resolution_percentage=100
    stage.render.image_settings.file_format='PNG'
    stage.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Teemto open cockpit round31 review world')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.085,.11,.15,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
    stage.world=world
    def aim(obj,point):
        obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
    for name,location,energy,color,size in [
        ('Key',(4,7,12),2200,(1,.84,.64),7),
        ('Fill',(-6,6,6),1500,(.58,.73,1),6),
        ('Rim',(-2,-8,10),2200,(1,.71,.45),5)]:
        data=bpy.data.lights.new('Teemto round31 '+name,'AREA')
        data.energy=energy;data.color=color;data.shape='DISK';data.size=size
        obj=bpy.data.objects.new(data.name,data);stage.collection.objects.link(obj)
        obj.location=location;aim(obj,(0,0,2))
    data=bpy.data.cameras.new('Teemto round31 review camera')
    cam=bpy.data.objects.new(data.name,data);stage.collection.objects.link(cam)
    stage.camera=cam;data.clip_start=.05;data.clip_end=300
    for name,eye,target,lens in [
        ('side',(6.5,5.2,3.5),(0,5.2,2.5),58),
        ('chase-eye-cockpit-inspection',(.35,16.8935306855,7.3459566784),(0,5.2,2.65),95),
        ('front-quarter',(5.1,.2,5.0),(0,5.2,2.5),60),
        ('beauty',(24,32,17),(0,-5.5,2.5),55)]:
        cam.location=eye;aim(cam,target);data.lens=lens
        stage.render.filepath=BASE+'teemto-open-cockpit-round31-'+name+'.png'
        bpy.ops.render.render(write_still=True)
        report['images'].append({'name':name,'path':stage.render.filepath,
                               'eyeBlender':eye,'targetBlender':target,'lensMm':lens})
finally:
    window.scene=original_scene;window.view_layer=original_layer
    bpy.ops.object.select_all(action='DESELECT')
    for obj in selected:obj.select_set(True)
    original_layer.objects.active=active
    report['preservation']={'existingScenes':len(memberships),
        'allExistingSceneMembershipsExact':all(set(scene.objects)==members for scene,members in memberships.items()),
        'allExistingCollectionMembershipsExact':all((set(col.objects),set(col.children))==members for col,members in collections.items()),
        'restoredScene':original_scene.name,'restoredViewLayer':original_layer.name,
        'restoredActive':active.name if active else None,'restoredSelected':len(bpy.context.selected_objects),
        'selectedExact':set(bpy.context.selected_objects)==set(selected)}
    assert report['preservation']['allExistingSceneMembershipsExact']
    assert report['preservation']['allExistingCollectionMembershipsExact']
    print(json.dumps(report))
