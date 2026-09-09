"""Blender-only neutral sculpture comparison; restore user scene and settings."""
import bpy, math
from mathutils import Vector
original=bpy.context.window.scene
scene=bpy.data.scenes['Inkstorm World Kit']
original_camera=scene.camera
original_world=scene.world
original_engine=scene.render.engine
original_resolution=(scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage)
original_filepath=scene.render.filepath
original_transparent=scene.render.film_transparent
original_color_mode=scene.render.image_settings.color_mode
original_format=scene.render.image_settings.file_format
original_view=(scene.view_settings.view_transform,scene.view_settings.look,scene.view_settings.exposure,scene.view_settings.gamma)
original_cycles_samples=scene.cycles.samples
original_render_hidden={obj:obj.hide_render for obj in scene.objects}
created=[]
try:
    bpy.context.window.scene=scene
    camera_data=bpy.data.cameras.new('Inkstorm Pit District Preview Camera')
    camera=bpy.data.objects.new('Inkstorm Pit District Preview Camera',camera_data)
    scene.collection.objects.link(camera)
    created.append(camera)
    camera.location=(85,-170,75)
    camera.rotation_euler=(Vector((0,0,14))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.type='ORTHO'
    camera_data.ortho_scale=128
    camera_data.clip_end=1000
    scene.camera=camera
    for name,rotation,energy,color in [('Inkstorm Pit District Preview Sun',(.4,-.55,-.6),3.2,(1,.84,.65)),('Inkstorm Pit District Preview Fill',(.9,.3,2.1),1.25,(.64,.75,1))]:
        data=bpy.data.lights.new(name,'SUN');data.energy=energy;data.angle=.08;data.color=color
        lamp=bpy.data.objects.new(name,data);scene.collection.objects.link(lamp);lamp.rotation_euler=rotation;created.append(lamp)
    world=bpy.data.worlds.new('Inkstorm Pit District Preview World')
    world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.09,.11,.15,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
    scene.world=world
    scene.render.engine='CYCLES'
    scene.cycles.samples=16
    scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
    scene.render.film_transparent=False
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.view_settings.exposure=0;scene.view_settings.gamma=1
    for obj in original_render_hidden: obj.hide_render=True
    targets=[(sorted(obj.name for obj in scene.objects if obj.name.startswith('pit-district-r15'))[-1],'district')]
    for name,label in targets:
        obj=scene.objects[name]
        obj.hide_render=False
        scene.render.filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/pit-district/'+label+'-asset-preview.png'
        bpy.ops.render.render(write_still=True)
        obj.hide_render=True
finally:
    for obj,hidden in original_render_hidden.items(): obj.hide_render=hidden
    for obj in created: obj.hide_render=True;obj.hide_set(True)
    scene.camera=original_camera;scene.world=original_world;scene.render.engine=original_engine
    scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage=original_resolution
    scene.render.filepath=original_filepath;scene.render.film_transparent=original_transparent
    scene.render.image_settings.color_mode=original_color_mode;scene.render.image_settings.file_format=original_format
    scene.view_settings.view_transform,scene.view_settings.look,scene.view_settings.exposure,scene.view_settings.gamma=original_view
    scene.cycles.samples=original_cycles_samples
    bpy.context.window.scene=original
