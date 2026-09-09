"""Import verified CC0 sources into a new owned lab scene, without editing sources."""
import bpy, math
from mathutils import Vector
ROOT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/scanned-geology'
original=bpy.context.window.scene
lab=bpy.data.scenes.get('Inkstorm Scanned Geology Lab')
if lab is None:lab=bpy.data.scenes.new('Inkstorm Scanned Geology Lab')
try:
    bpy.context.window.scene=lab
    for asset in ['boulder_01']:
        before=set(lab.objects)
        bpy.ops.import_scene.gltf(filepath=ROOT+'/originals/'+asset+'/'+asset+'_1k.gltf')
        meshes=[obj for obj in lab.objects if obj not in before and obj.type=='MESH']
        for obj in meshes:
            obj.name='PH-'+asset+'-unmodified-source';obj['source_asset']=asset
            obj['source_license']='CC0';obj['source_url']='https://polyhaven.com/a/'+asset
            obj['inkstorm_preserved_source']=True
            obj.data.calc_loop_triangles()
            positions=[obj.matrix_world@vertex.co for vertex in obj.data.vertices]
            bounds=[(min(v[i] for v in positions),max(v[i] for v in positions)) for i in range(3)]
            print({'asset':asset,'object':obj.name,'triangles':len(obj.data.loop_triangles),'vertices':len(obj.data.vertices),'blenderBounds':bounds,'materials':[mat.name for mat in obj.data.materials]})
finally:bpy.context.window.scene=original
