import bpy, json
window=bpy.context.window
original_scene=window.scene
original_layer=window.view_layer
active=original_layer.objects.active
selected=[o for o in original_layer.objects if o.select_get(view_layer=original_layer)]
try:
 scene=bpy.data.scenes.new('Inkstorm_Workshop_Round30_Calibration')
 window.scene=scene
 scene.render.engine='CYCLES'
 scene.cycles.samples=128
 scene.cycles.max_bounces=0
 scene.cycles.use_denoising=False
 scene.world=bpy.data.worlds['Round30_ZeroWorld']
 scene.render.bake.use_pass_direct=True
 scene.render.bake.use_pass_indirect=False
 scene.render.bake.use_pass_color=True
 scene.render.bake.margin=0
 mesh=bpy.data.meshes.new('Round30_White_Calibration_2m')
 mesh.from_pydata([(-1,-1,0),(1,-1,0),(1,1,0),(-1,1,0)],[],[(0,1,2,3)])
 obj=bpy.data.objects.new(mesh.name,mesh)
 scene.collection.objects.link(obj)
 obj.select_set(True)
 window.view_layer.objects.active=obj
 uv=mesh.uv_layers.new(name='CalibrationUV')
 for i,p in enumerate([(0,0),(1,0),(1,1),(0,1)]):uv.data[i].uv=p
 image=bpy.data.images.new('Round30_Calibration_DirectWhite',width=64,height=64,alpha=False,float_buffer=True)
 image.colorspace_settings.name='Linear Rec.709'
 mat=bpy.data.materials['Round30_White_Diffuse_BakeOnly'].copy()
 mat.name='Round30_Calibration_White'
 for n in mat.node_tree.nodes:
  if n.type=='TEX_IMAGE':n.image=image;mat.node_tree.nodes.active=n
 mesh.materials.append(mat)
 light=bpy.data.lights.new('Round30_Calibration_Area',type='AREA')
 light.shape='RECTANGLE';light.size=2.1;light.size_y=.68;light.energy=600;light.color=(1,.7,.38);light.normalize=True;light.use_shadow=True
 source=bpy.data.objects.new(light.name,light);source.location=(0,0,9);scene.collection.objects.link(source)
 
 bpy.ops.object.bake(type='DIFFUSE')
 pixels=list(image.pixels)
 center=[pixels[4*(32*64+32)+k] for k in range(3)]
 mean=[sum(pixels[k::4])/(64*64) for k in range(3)]
 scene.render.image_settings.file_format='OPEN_EXR';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.color_depth='16'
 image.save_render('/Users/amir/Projects/PodRacing/assets/source/inkstorm/workshop-lighting-round30/calibration-white-600w.exr',scene=scene)
 print(json.dumps({'status':'CALIBRATION_WHITE_DIRECT_128','centerLinearRGB':center,'meanLinearRGB':mean,'power':600,'distance':9,'size':[2.1,.68],'color':[1,.7,.38],'samples':128,'bounceLimit':0,'direct':True,'indirect':False,'colorPass':True}))
finally:
 window.scene=original_scene
 window.view_layer=original_layer
 original_layer.objects.active=active
 for o in original_layer.objects:o.select_set(o in selected,view_layer=original_layer)
 snapshot=json.loads(bpy.data.scenes['Inkstorm_Workshop_Round30_PitBake']['original_memberships_json'])
 assert {s.name:sorted(o.name for o in s.objects) for s in bpy.data.scenes if s.name in snapshot}==snapshot

