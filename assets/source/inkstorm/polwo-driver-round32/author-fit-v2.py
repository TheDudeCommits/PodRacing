"""Round32 V2: retain source shell; fit a larger upright adult driver to measured controls."""
import bpy,json,math
from mathutils import Vector,Matrix
SOURCE='PodRacing — Polwo driver fit round32 V1'
STAGE='PodRacing — Polwo driver fit round32 V2'
OUT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/polwo-driver-round32/polwo-driver-fit-v2.glb'
assert STAGE not in bpy.data.scenes
window=bpy.context.window;old=window.scene;layer=window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
memberships={s:set(s.objects) for s in bpy.data.scenes}
collections={c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
stage=bpy.data.scenes.new(STAGE)
anchor=Vector((0,5.2,4.352532386779785))
pitch=math.atan2(1.895,8.38)
straighten=Matrix.Rotation(pitch,3,'X')
scale=1.55
new_anchor=anchor+Vector((0,0,-.08))
source_rot=(Matrix.Rotation(math.pi,4,'Z')@Matrix.Rotation(pitch,4,'X')).to_3x3()
original_pelvis=Vector((0,-.13,-.205))
grips=[]
for side in [-1,1]:
 source=Vector((-.145 if side<0 else .130,.153,-.096))
 previous=anchor+2.5*(source_rot@(source-original_pelvis))
 normalized=new_anchor+scale*(straighten@(previous-anchor))
 # Center of the cylindrical original horizontal grip, measured from source vertices.
 target=Vector((.5012 if side<0 else -.5006,4.577,5.034532))
 axis=(straighten@source_rot@Vector((0,-.68,.733))).normalized()
 target_axis=Vector((1,.26795 if side<0 else -.26795,0)).normalized()
 rotate=axis.rotation_difference(target_axis).to_matrix()
 grips.append((previous,normalized,target,rotate))
report={'source':SOURCE,'stage':STAGE,'driverScale':scale,'removeInheritedTeemtoPitchDegrees':math.degrees(pitch),
 'pelvis':list(new_anchor),'runtimeIntegrated':False,'bodyGeometryAndMapsUnchanged':True,
 'grips':[{'old':list(a),'beforeHandFit':list(b),'target':list(c)} for a,b,c,d in grips]}
try:
 window.scene=stage;window.view_layer=stage.view_layers[0]
 meshes=[]
 for oldob in bpy.data.scenes[SOURCE].objects:
  if oldob.type!='MESH':continue
  ob=bpy.data.objects.new(oldob.name+' fit-v2',oldob.data.copy())
  stage.collection.objects.link(ob);meshes.append(ob)
  if 'pilot' not in oldob.name:continue
  for vert in ob.data.vertices:
   original=vert.co.copy()
   value=new_anchor+scale*(straighten@(original-anchor))
   for prev,normalized,target,rotation in grips:
    # Local hand/forearm deformation; fades before shoulder and excludes legs/torso.
    same_side=original.x*prev.x>0
    distance=(original-prev).length
    w=max(0,min(1,(.58-distance)/.35)) if same_side and original.z>4.53 else 0
    w=w*w*(3-2*w)
    if w:value=value.lerp(target+rotation@(value-normalized),w)
   vert.co=value
  if ob.data.has_custom_normals:ob.data.normals_split_custom_set([(0,0,0)]*len(ob.data.loops))
  ob.data.update()
 bpy.ops.object.select_all(action='DESELECT')
 for ob in meshes:ob.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',use_selection=True,use_active_scene=True,
  export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_tangents=True)
 report['export']=OUT
finally:
 window.scene=old;window.view_layer=layer
 for ob in layer.objects:ob.select_set(False)
 for ob in selected:ob.select_set(True)
 layer.objects.active=active
 report['preservation']={'contextRestored':window.scene==old and window.view_layer==layer and layer.objects.active==active and set(bpy.context.selected_objects)==set(selected),
  'changedExistingScenes':[s.name for s,v in memberships.items() if set(s.objects)!=v],
  'changedExistingCollections':[c.name for c,v in collections.items() if (set(c.objects),set(c.children))!=v]}
 print(json.dumps(report))
