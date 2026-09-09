"""Source-preserving body normalization and original-project driver fit study."""
import bpy, json
from mathutils import Vector, Matrix
SOURCE='PodRacing — source 5a3422df6f894b48b846d590cdc2bf4c retry 20260908'
STAGE='PodRacing — Polwo driver fit round32 V1'
OUT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/polwo-driver-round32/polwo-driver-fit-v1.glb'
assert STAGE not in bpy.data.scenes
window=bpy.context.window;original=window.scene;layer=window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
memberships={s:set(s.objects) for s in bpy.data.scenes}
collections={c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
stage=bpy.data.scenes.new(STAGE);report={'stage':STAGE,'source':SOURCE,'sourceMapsChanged':False,'runtimeIntegrated':False}
try:
 source=bpy.data.scenes[SOURCE];window.scene=source;window.view_layer=source.view_layers[0]
 bpy.context.view_layer.update()
 points=[o.matrix_world@v.co for o in source.objects if o.type=='MESH' for v in o.data.vertices]
 lowest=min(v.z for v in points)
 scale=2.5;z_shift=.1-lowest*scale;y_shift=5.2-6.84*scale
 transform=Matrix.Translation((0,y_shift,z_shift))@Matrix.Scale(scale,4)
 anchor=transform@Vector((0,6.84,1.07))
 window.scene=stage;window.view_layer=stage.view_layers[0]
 bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection
 groups={};body=[]
 for o in source.objects:
  if o.type!='MESH':continue
  mesh=o.data.copy();mesh.transform(transform@o.matrix_world)
  ob=bpy.data.objects.new('polwo-source-'+o.name,mesh);stage.collection.objects.link(ob)
  mat=tuple(m.name for m in mesh.materials);groups.setdefault(mat,[]).append(ob)
 for index,items in enumerate(groups.values()):
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join()
  ob=bpy.context.object;ob.name='polwo-body-'+str(index);body.append(ob)
 before_import=set(stage.objects)
 bpy.ops.import_scene.gltf(filepath='/Users/amir/Projects/PodRacing/public/assets/inkstorm/vehicles/teemto-hero-v4c.glb')
 bpy.context.view_layer.update()
 imported=set(stage.objects)-before_import
 pilot=[o for o in imported if o.type=='MESH' and o.name.startswith('teemto-pilot-')]
 assert len(pilot)==6
 offset=anchor-Vector((0,5.2,2.2))
 for o in pilot:
  world=o.matrix_world.copy();o.data=o.data.copy();o.data.transform(Matrix.Translation(offset)@world)
  o.parent=None;o.matrix_world.identity();o.name=o.name.replace('teemto-pilot-','polwo-pilot-')
 for o in imported:
  if o not in pilot:bpy.data.objects.remove(o,do_unlink=True)
 bpy.ops.object.select_all(action='DESELECT')
 counts=[]
 for o in body+pilot:
  o.select_set(True);o.data.calc_loop_triangles()
  counts.append({'name':o.name,'triangles':len(o.data.loop_triangles),'materialSlots':len(o.data.materials)})
 bpy.context.view_layer.objects.active=body[0]
 bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',use_selection=True,use_active_scene=True,
  export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
 report.update({'export':OUT,'normalization':{'scale':scale,'sourceActualMinimumZ':lowest,'translation':[0,y_shift,z_shift],
  'direction':'Source -Y forward/Z up exports to glTF +Z forward/Y up; no inferred pitch correction.'},
  'seatReferenceSource':[0,6.84,1.07],'seatAnchorBlender':list(anchor),'seatAnchorGltf':[anchor.x,anchor.z,-anchor.y],
  'pilotOffsetBlender':list(offset),'pilotSource':'Project-authored six-part V4C static driver; geometry/UVs copied with translation only.',
  'meshes':counts,'triangles':sum(x['triangles'] for x in counts),
  'pending':'Fit intersection/hand contact/seat support and chase-view validation; Inkstorm atlas adaptation and texture/LOD optimization; blind critic and runtime gates.'})
finally:
 window.scene=original;window.view_layer=layer
 for o in layer.objects:o.select_set(False)
 for o in selected:o.select_set(True)
 layer.objects.active=active
 report['preservation']={'contextRestored':window.scene==original and window.view_layer==layer and layer.objects.active==active and set(bpy.context.selected_objects)==set(selected),
  'changedExistingScenes':[s.name for s,v in memberships.items() if set(s.objects)!=v],
  'changedExistingCollections':[c.name for c,v in collections.items() if (set(c.objects),set(c.children))!=v]}
 print(json.dumps(report))
