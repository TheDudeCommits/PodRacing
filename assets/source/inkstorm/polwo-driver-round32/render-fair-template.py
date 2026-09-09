"""Two source-inspection views; links original objects temporarily, never edits their data."""
import bpy, json
from mathutils import Vector
UID='UID_PLACEHOLDER'
SOURCE='SOURCE_PLACEHOLDER'
OUT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/polwo-driver-round32/'+UID
window=bpy.context.window;old=window.scene;layer=window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
source=bpy.data.scenes[SOURCE]
scene_members={s:set(s.objects) for s in bpy.data.scenes}
collection_members={c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
stage=bpy.data.scenes.new('PodRacing catalogue inspection '+UID)
owned_objects=[];owned_data=[];images=[];world=None
try:
 window.scene=stage;window.view_layer=stage.view_layers[0]
 for ob in source.objects:
  if ob.type not in {'LIGHT','CAMERA'}:stage.collection.objects.link(ob)
 stage.frame_set(source.frame_current);bpy.context.view_layer.update()
 corners=[ob.matrix_world@Vector(c) for ob in stage.objects if ob.type=='MESH' for c in ob.bound_box]
 assert corners
 low=Vector([min(c[k] for c in corners) for k in range(3)])
 high=Vector([max(c[k] for c in corners) for k in range(3)])
 center=Vector((0,5,4.85));extent=5;assert 0<extent<10000
 world=bpy.data.worlds.new('PodRacing catalogue inspection world '+UID)
 world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.14,.17,.22,1)
 world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7;stage.world=world
 def obj(data):
  o=bpy.data.objects.new(data.name,data);stage.collection.objects.link(o);owned_objects.append(o);owned_data.append(data);return o
 def aim(o):o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 for name,offset,power,color in [('key',(1,-1,2),2500,(1,.86,.69)),('fill',(-1,.5,1),1800,(.63,.76,1))]:
  d=bpy.data.lights.new('Catalogue '+name+' '+UID,'AREA');d.energy=power*(extent/12)**2;d.size=extent*.75;d.color=color
  o=obj(d);o.location=center+Vector(offset)*extent*.65;aim(o)
 camera=obj(bpy.data.cameras.new('Catalogue camera '+UID));stage.camera=camera
 camera.data.type='ORTHO';camera.data.ortho_scale=6.4;camera.data.clip_start=.01;camera.data.clip_end=extent*10
 stage.render.engine='CYCLES';stage.cycles.device='CPU';stage.cycles.samples=8;stage.cycles.use_denoising=True
 stage.render.resolution_x=1200;stage.render.resolution_y=800;stage.render.resolution_percentage=100
 stage.render.image_settings.file_format='PNG';stage.view_settings.view_transform='AgX'
 for name,direction in [('cockpit-side',(2,.08,.5)),('cockpit-rear',(.5,1.7,.8)),('cockpit-front',(-1,-1.7,1))]:
  camera.location=center+Vector(direction).normalized()*extent*2.5;aim(camera)
  stage.render.filepath=OUT+'-'+name+'.png';bpy.ops.render.render(write_still=True)
  images.append({'view':name,'path':stage.render.filepath,'camera':list(camera.location)})
 print(json.dumps({'uid':UID,'sourceScene':SOURCE,'scope':'Source driver-fit comparison with identical fixed cameras and lighting. Not runtime, art acceptance or FPS evidence.','bounds':[list(low),list(high)],'sourceFrame':source.frame_current,'images':images}))
finally:
 window.scene=old;window.view_layer=layer
 for o in layer.objects:o.select_set(False)
 for o in selected:o.select_set(True)
 layer.objects.active=active
 for o in list(stage.objects):stage.collection.objects.unlink(o)
 for o in owned_objects:bpy.data.objects.remove(o)
 bpy.data.scenes.remove(stage)
 for d in owned_data:
  if isinstance(d,bpy.types.Camera):bpy.data.cameras.remove(d)
  elif isinstance(d,bpy.types.Light):bpy.data.lights.remove(d)
 if world is not None:bpy.data.worlds.remove(world)
 changed=[s.name for s,v in scene_members.items() if set(s.objects)!=v]
 collection_changed=[c.name for c,v in collection_members.items() if (set(c.objects),set(c.children))!=v]
 print(json.dumps({'uid':UID,'contextRestored':window.scene==old and window.view_layer==layer and layer.objects.active==active and set(bpy.context.selected_objects)==set(selected),'preexistingSceneMembershipChanges':changed,'preexistingCollectionMembershipChanges':collection_changed,'temporaryReviewSceneRemoved':True}))
