"""Bake a source-preserving Inkstorm palette study; original source maps stay immutable."""
import bpy,json
SOURCE='PodRacing — Polwo driver fit round32 V3'
STAGE='PodRacing — Polwo Inkstorm paint round32 V1'
BASE='/Users/amir/Projects/PodRacing/assets/source/inkstorm/polwo-driver-round32/'
assert STAGE not in bpy.data.scenes
window=bpy.context.window;old=window.scene;layer=window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
memberships={s:set(s.objects) for s in bpy.data.scenes}
collections={c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
scene=bpy.data.scenes.new(STAGE);report={'stage':STAGE,'source':SOURCE,'geometryChanged':False,'sourceImagesChanged':False,'runtimeIntegrated':False}
try:
 window.scene=scene;window.view_layer=scene.view_layers[0]
 objects=[]
 for original in bpy.data.scenes[SOURCE].objects:
  if original.type!='MESH':continue
  ob=bpy.data.objects.new(original.name+' paint-v1',original.data.copy());scene.collection.objects.link(ob);objects.append(ob)
 body=next(o for o in objects if o.name.startswith('polwo-body-0'))
 mat=body.data.materials[0].copy();mat.name='Polwo Inkstorm body paint-v1';body.data.materials[0]=mat
 nodes=mat.node_tree.nodes;links=mat.node_tree.links
 shader=nodes.get('Principled BSDF');output=nodes.get('Material Output')
 original_color=nodes.get('Image Texture').outputs['Color']
 original_orm=nodes.get('Image Texture.001').outputs['Color']
 def mathnode(operation,a,b=None):
  n=nodes.new('ShaderNodeMath');n.operation=operation
  if hasattr(a,'node'):links.new(a,n.inputs[0])
  else:n.inputs[0].default_value=a
  if b is not None:
   if hasattr(b,'node'):links.new(b,n.inputs[1])
   else:n.inputs[1].default_value=b
  return n.outputs[0]
 def separate(color):
  n=nodes.new('ShaderNodeSeparateColor');n.mode='RGB';links.new(color,n.inputs[0]);return n.outputs
 def mix(a,b,fac,blend='MIX'):
  n=nodes.new('ShaderNodeMixRGB');n.blend_type=blend
  for index,value in [(0,fac),(1,a),(2,b)]:
   if hasattr(value,'node'):links.new(value,n.inputs[index])
   else:n.inputs[index].default_value=value
  return n.outputs[0]
 def clamp(value):return mathnode('MINIMUM',mathnode('MAXIMUM',value,0),1)
 channels=separate(original_color)
 blue=clamp(mathnode('MULTIPLY',mathnode('SUBTRACT',channels[2],channels[0]),16))
 warm=clamp(mathnode('MULTIPLY',mathnode('MINIMUM',mathnode('SUBTRACT',channels[0],channels[2]),mathnode('SUBTRACT',channels[1],channels[2])),9))
 bw=nodes.new('ShaderNodeRGBToBW');links.new(original_color,bw.inputs[0]);lum=bw.outputs[0]
 cobalt=mix(lum,(.32,.69,1.50,1),1,'MULTIPLY')
 orange=mix(lum,(1.92,.39,.075,1),1,'MULTIPLY')
 metal=mix(original_color,(.95,.96,1.07,1),1,'MULTIPLY')
 painted=mix(mix(metal,cobalt,blue),orange,warm)
 orm=separate(original_orm)
 combine=nodes.new('ShaderNodeCombineColor');combine.mode='RGB'
 links.new(orm[0],combine.inputs[0]);links.new(mathnode('ADD',.48,mathnode('MULTIPLY',orm[1],.45)),combine.inputs[1])
 links.new(mathnode('MULTIPLY',orm[2],.65),combine.inputs[2])
 emission=nodes.new('ShaderNodeEmission');links.new(emission.outputs[0],output.inputs['Surface'])
 scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
 scene.render.bake.margin=8;scene.render.bake.use_clear=True
 bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
 baked=[]
 for name,socket,space in [('base-color',painted,'sRGB'),('orm',combine.outputs[0],'Non-Color')]:
  im=bpy.data.images.new('Polwo Inkstorm '+name+' v1',width=2048,height=2048,alpha=False)
  im.colorspace_settings.name=space
  target=nodes.new('ShaderNodeTexImage');target.image=im;nodes.active=target
  links.new(socket,emission.inputs['Color'])
  bpy.ops.object.bake(type='EMIT')
  im.filepath_raw=BASE+'polwo-inkstorm-'+name+'-v1.png';im.file_format='PNG';im.save();im.pack()
  baked.append((name,target,im))
 links.new(shader.outputs['BSDF'],output.inputs['Surface'])
 base_node=baked[0][1];orm_node=baked[1][1]
 links.new(base_node.outputs['Color'],shader.inputs['Base Color'])
 packed=separate(orm_node.outputs['Color'])
 links.new(packed[1],shader.inputs['Roughness']);links.new(packed[2],shader.inputs['Metallic'])
 group=nodes.get('Group')
 if group:links.new(packed[0],group.inputs['Occlusion'])
 for ob in objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=body
 path=BASE+'polwo-inkstorm-paint-v1-native.glb'
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,use_active_scene=True,
  export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_tangents=True)
 report.update({'export':path,'bakes':[{'name':n,'path':im.filepath_raw,'size':list(im.size),'colorspace':im.colorspace_settings.name} for n,t,im in baked],
  'treatment':'Original UV-local color detail retained through blue and yellow chroma masks; cobalt, burnt orange, cool metal. Original normal map retained; roughness floor .48, metallic .65 multiplier. Source study pending visual evaluation.',
  'driver':'V3 fit preserved; open shoulder/boot topology under independent investigation, not accepted.'})
finally:
 window.scene=old;window.view_layer=layer
 for ob in layer.objects:ob.select_set(False)
 for ob in selected:ob.select_set(True)
 layer.objects.active=active
 report['preservation']={'contextRestored':window.scene==old and window.view_layer==layer and layer.objects.active==active and set(bpy.context.selected_objects)==set(selected),
  'changedExistingScenes':[s.name for s,v in memberships.items() if set(s.objects)!=v],
  'changedExistingCollections':[c.name for c,v in collections.items() if (set(c.objects),set(c.children))!=v]}
 print(json.dumps(report))
