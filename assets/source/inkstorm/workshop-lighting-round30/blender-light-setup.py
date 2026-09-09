import bpy, json
scene=bpy.data.scenes['Inkstorm_Workshop_Round30_PitBake']
scene.render.engine='CYCLES'
scene.cycles.samples=128
scene.cycles.use_denoising=False
scene.cycles.max_bounces=0
scene.cycles.diffuse_bounces=0
scene.cycles.glossy_bounces=0
scene.cycles.transmission_bounces=0
scene.cycles.volume_bounces=0
scene.render.bake.use_pass_direct=True
scene.render.bake.use_pass_indirect=False
scene.render.bake.use_pass_color=True
scene.render.bake.margin=8
scene.render.bake.margin_type='EXTEND'
scene.render.bake.use_clear=True
world=bpy.data.worlds.new('Round30_ZeroWorld')
world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(0,0,0,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=0
scene.world=world
for i,p in enumerate([(-50,3,9.44),(-8,3,9.44),(36,6,9.44)]):
 data=bpy.data.lights.new('Round30_PitTask_'+str(i+1),type='AREA')
 data.shape='RECTANGLE'
 data.size=2.1
 data.size_y=.68
 data.energy=600
 data.color=(1,.70,.38)
 data.normalize=True
 data.use_shadow=True
 data.spread=3.141592653589793
 obj=bpy.data.objects.new(data.name,data)
 scene.collection.objects.link(obj)
 obj.location=(p[0],p[1],p[2]-.003)
 obj.rotation_euler=(0,0,0)
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.view_settings.exposure=0
scene.view_settings.gamma=1
print(json.dumps({'blenderVersion':bpy.app.version_string,'sceneDevice':scene.cycles.device,'bakeSamples':scene.cycles.samples,'color':[1,.7,.38],'wattsPerLamp':600,'worldStrength':0,'direct':scene.render.bake.use_pass_direct,'indirect':scene.render.bake.use_pass_indirect,'colorPass':scene.render.bake.use_pass_color,'contextScene':bpy.context.scene.name}))


# Preserve the authored GLB normal vector exactly for the white BSDF.
mat=bpy.data.materials['Round30_White_Diffuse_BakeOnly']
nodes=mat.node_tree.nodes;links=mat.node_tree.links
attribute=nodes.new('ShaderNodeAttribute');attribute.attribute_name='_SOURCE_NORMAL'
split=nodes.new('ShaderNodeSeparateXYZ');links.new(attribute.outputs['Vector'],split.inputs['Vector'])
neg=nodes.new('ShaderNodeMath');neg.operation='MULTIPLY';neg.inputs[1].default_value=-1;links.new(split.outputs['Z'],neg.inputs[0])
combine=nodes.new('ShaderNodeCombineXYZ');links.new(split.outputs['X'],combine.inputs['X']);links.new(neg.outputs[0],combine.inputs['Y']);links.new(split.outputs['Y'],combine.inputs['Z'])
transform=nodes.new('ShaderNodeVectorTransform');transform.vector_type='NORMAL';transform.convert_from='OBJECT';transform.convert_to='WORLD';links.new(combine.outputs[0],transform.inputs[0])
diffuse=next(n for n in nodes if n.type=='BSDF_DIFFUSE');links.new(transform.outputs[0],diffuse.inputs['Normal'])
