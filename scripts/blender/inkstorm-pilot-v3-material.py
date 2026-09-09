"""Isolated pilot UV/material production through Blender MCP.

Run setup, inspect its receipt, then bake, preview, and export as separate calls.
This bakes original 3D procedural materials to UVs; it does not edit any raster
reference. No source/body materials, public assets, credentials or extras change.
"""
import bpy
import math
import json
from mathutils import Vector, Matrix

ACTION = 'setup'
SOURCE = 'PodRacing — Teemto pilot construction v3c'
STAGE = 'PodRacing — Teemto pilot material v3c'
EXPORT_SCENE = 'PodRacing — Teemto pilot material v3c normalized'
BASE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v3/'
REVIEW = BASE+'review/'
ATLAS_NAME = 'Inkstorm original pilot color atlas v3c 2048'
saved_scene = bpy.context.window.scene
saved_layer = bpy.context.window.view_layer
saved_active = saved_layer.objects.active
saved_selected = list(bpy.context.selected_objects)


def node(material, kind, name):
    obj=material.node_tree.nodes.new(kind)
    obj.name=name
    return obj


def math_node(material, operation, a, b):
    result=node(material,'ShaderNodeMath',operation)
    result.operation=operation
    for index,value in enumerate((a,b)):
        if isinstance(value,(int,float)):
            result.inputs[index].default_value=value
        else:
            material.node_tree.links.new(value,result.inputs[index])
    return result.outputs[0]


def mix(material, a, b, factor, blend='MIX'):
    result=node(material,'ShaderNodeMixRGB',blend)
    result.blend_type=blend
    result.inputs[0].default_value=1 if not isinstance(factor,(int,float)) else factor
    if not isinstance(factor,(int,float)):
        material.node_tree.links.new(factor,result.inputs[0])
    for index,value in enumerate((a,b),1):
        if isinstance(value,(tuple,list)):
            result.inputs[index].default_value=(*value[:3],1)
        else:
            material.node_tree.links.new(value,result.inputs[index])
    return result.outputs[0]


def noise(material, position, scale, detail=3):
    result=node(material,'ShaderNodeTexNoise','Original spatial surface variation')
    result.inputs['Scale'].default_value=scale
    result.inputs['Detail'].default_value=detail
    result.inputs['Roughness'].default_value=.68
    material.node_tree.links.new(position,result.inputs['Vector'])
    return result.outputs['Fac']


def ramp(material, factor, stops):
    result=node(material,'ShaderNodeValToRGB','Controlled material range')
    elements=result.color_ramp.elements
    for old in list(elements)[2:]:
        elements.remove(old)
    for i,(position,color) in enumerate(stops):
        element=elements[i] if i<2 else elements.new(position)
        element.position=position
        element.color=(*color[:3],1)
    material.node_tree.links.new(factor,result.inputs['Fac'])
    return result.outputs['Color']


def make_bake_material(role,atlas):
    material=bpy.data.materials.new('Pilot v3 source '+role)
    material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value=0
    bsdf.inputs['Roughness'].default_value=.9
    attribute=node(material,'ShaderNodeVertexColor','Authored fabric panel and seam colors')
    attribute.layer_name='PilotFabricColor'
    geometry=node(material,'ShaderNodeNewGeometry','Original 3D garment coordinates')
    position=geometry.outputs['Position']
    broad=noise(material,position,45,3)
    fine=noise(material,position,560,2)
    variation=ramp(material,broad,[(.15,(.84,.84,.84)),(.50,(1,1,1)),(.85,(1.09,1.09,1.09))])
    color=mix(material,attribute.outputs['Color'],variation,1,'MULTIPLY')
    if role in ('suit','webbing','accent'):
        waves=[]
        for direction in ('X','Z'):
            wave=node(material,'ShaderNodeTexWave','Woven yarn '+direction)
            wave.wave_type='BANDS';wave.bands_direction=direction
            wave.inputs['Scale'].default_value=630 if role!='webbing' else 820
            wave.inputs['Distortion'].default_value=.15
            wave.inputs['Detail'].default_value=2
            material.node_tree.links.new(position,wave.inputs['Vector'])
            waves.append(wave.outputs['Fac'])
        weave=math_node(material,'MULTIPLY',waves[0],waves[1])
        weave=math_node(material,'ADD',.92,math_node(material,'MULTIPLY',weave,.08))
        color=mix(material,color,weave,1,'MULTIPLY')
        # Sparse rub catches real folded edges; broad random dirt is avoided.
        edge=ramp(material,geometry.outputs['Pointiness'],[(.485,(0,0,0)),(.525,(.055,.055,.055)),(.565,(.24,.24,.24))])
        broken=math_node(material,'MULTIPLY',edge,broad)
        color=mix(material,color,(.135,.105,.061),broken)
    elif role=='shell':
        edge=ramp(material,geometry.outputs['Pointiness'],[(.485,(0,0,0)),(.535,(.09,.09,.09)),(.585,(.44,.44,.44))])
        chips=ramp(material,fine,[(.47,(0,0,0)),(.73,(.025,.025,.025)),(.82,(.16,.16,.16))])
        color=mix(material,color,(.075,.080,.072),math_node(material,'MAXIMUM',chips,math_node(material,'MULTIPLY',edge,broad)))
    elif role=='rubber':
        color=mix(material,color,ramp(material,fine,[(.2,(.86,.86,.86)),(.8,(1.02,1.02,1.02))]),1,'MULTIPLY')
    if role!='hardware':
        ao=node(material,'ShaderNodeAmbientOcclusion','Local garment contact')
        ao.inputs['Distance'].default_value=.013
        ao.samples=12
        color=mix(material,color,mix(material,(1,1,1),ao.outputs['Color'],.43),1,'MULTIPLY')
    material.node_tree.links.new(color,bsdf.inputs['Base Color'])
    tex=node(material,'ShaderNodeTexImage','Single shared pilot bake target')
    tex.image=atlas;material.node_tree.nodes.active=tex
    return material


def pilot_meshes(scene):
    return [o for o in scene.objects if o.type=='MESH' and o.name.startswith('pilot-material-v3-')]


def point_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


try:
    if ACTION=='setup':
        assert STAGE not in bpy.data.scenes, 'Inspect existing study before reuse.'
        source=bpy.data.scenes[SOURCE]
        bpy.context.window.scene=source
        bpy.context.view_layer.update()
        originals=[(o,o.matrix_world.copy()) for o in source.objects if o.type in ('MESH','CAMERA','LIGHT')]
        stage=bpy.data.scenes.new(STAGE)
        bpy.context.window.scene=stage
        keys={}
        for original,matrix in originals:
            data=original.data.copy()
            is_pilot=original.type=='MESH' and original.name.startswith('teemto-pilot-v3-')
            key=original.name.split('teemto-pilot-v3-')[-1].split('.')[0] if is_pilot else None
            name='pilot-material-v3-'+key if is_pilot else 'pilot-material-study-copy-'+original.name
            obj=bpy.data.objects.new(name,data)
            stage.collection.objects.link(obj)
            obj.matrix_world=matrix
            if is_pilot:
                keys[obj.name]=key
            if original==source.camera:
                stage.camera=obj
        stage.world=source.world.copy() if source.world else None
        stage.render.engine='CYCLES'
        stage.cycles.device='CPU'
        stage.cycles.samples=16
        stage.cycles.use_denoising=True
        stage.view_settings.view_transform='AgX'
        stage.render.resolution_x=1400
        stage.render.resolution_y=1000
        stage.render.resolution_percentage=100
        stage.render.image_settings.file_format='PNG'
        pilots=pilot_meshes(stage)
        assert len(pilots)==6
        for obj in stage.objects:
            obj.select_set(obj in pilots)
        bpy.context.view_layer.objects.active=pilots[0]
        for obj in pilots:
            if not obj.data.uv_layers:
                obj.data.uv_layers.new(name='PilotAtlasUV')
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.003,
            area_weight=.35,correct_aspect=True,scale_to_bounds=True)
        bpy.ops.object.mode_set(mode='OBJECT')
        atlas=bpy.data.images.new(ATLAS_NAME,width=2048,height=2048,alpha=False,float_buffer=False)
        atlas.generated_color=(.008,.012,.018,1)
        atlas.colorspace_settings.name='sRGB'
        atlas.filepath_raw=BASE+'pilot-color-atlas-v3.png'
        atlas.file_format='PNG'
        roles=('suit','shell','accent','hardware','webbing','rubber')
        materials={role:make_bake_material(role,atlas) for role in roles}
        receipts=[]
        for obj in pilots:
            key=keys[obj.name]
            obj.data.materials.clear()
            for role in roles:
                obj.data.materials.append(materials[role])
            for polygon in obj.data.polygons:
                polygon.material_index=roles.index(key)
            labels={0:key}
            obj.data.calc_loop_triangles()
            receipts.append({'mesh':obj.name,'triangles':len(obj.data.loop_triangles),
                'uvLoops':len(obj.data.uv_layers.active.data),
                'bakeRoles':sorted(set(labels.values()))})
        assert sum(r['triangles'] for r in receipts)<=16000
        result={'action':ACTION,'scene':stage.name,'pilotMeshes':receipts,
            'atlas':[2048,2048],'uvPacking':'joint multi-object smart projection',
            'sourceModified':False,'baked':False,'exported':False}
    else:
        stage=bpy.data.scenes[STAGE]
        bpy.context.window.scene=stage
        bpy.context.view_layer.update()
        pilots=pilot_meshes(stage)
        atlas=bpy.data.images[ATLAS_NAME]
        assert len(pilots)==6 and tuple(atlas.size)==(2048,2048)
        if ACTION=='bake':
            assert all(len(o.data.materials)>1 for o in pilots), 'Already baked; inspect before replacing.'
            for obj in stage.objects:
                obj.select_set(obj in pilots)
            bpy.context.view_layer.objects.active=pilots[0]
            stage.render.bake.use_pass_direct=False
            stage.render.bake.use_pass_indirect=False
            stage.render.bake.use_pass_color=True
            stage.render.bake.use_clear=False
            stage.render.bake.margin=10
            stage.render.bake.margin_type='EXTEND'
            bpy.ops.object.bake(type='DIFFUSE')
            atlas.save()
            for obj in pilots:
                key=obj.name.split('pilot-material-v3-')[-1].split('.')[0]
                material=bpy.data.materials.new('Pilot atlas v3 runtime '+key)
                material.use_nodes=True
                bsdf=material.node_tree.nodes.get('Principled BSDF')
                bsdf.inputs['Roughness'].default_value={'suit':.94,'shell':.60,'accent':.88,'hardware':.36,'webbing':.96,'rubber':.91}[key]
                bsdf.inputs['Metallic'].default_value={'suit':0,'shell':.10,'accent':0,'hardware':.16,'webbing':0,'rubber':0}[key]
                tex=node(material,'ShaderNodeTexImage','Baked pilot atlas only')
                tex.image=atlas
                material.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
                obj.data.materials.clear()
                obj.data.materials.append(material)
                for polygon in obj.data.polygons:
                    polygon.material_index=0
                for attribute in list(obj.data.color_attributes):
                    obj.data.color_attributes.remove(attribute)
            result={'action':ACTION,'atlas':atlas.filepath_raw,'imageSize':list(atlas.size),
                'pilotTriangles':sum(len(o.data.loop_triangles) for o in pilots),'pilotDraws':6,'baseColorIncludes':'original procedural color, woven value, controlled edge wear, local AO',
                'normalMap':False,'roughnessTexture':False,'exported':False}
        elif ACTION in ('preview-side','preview-front','preview-full'):
            assert all(len(o.data.materials)==1 for o in pilots), 'Bake before preview.'
            stage.cycles.samples=32
            if ACTION=='preview-side':
                stage.camera.location=(1.7,.25,.22)
                point_at(stage.camera,(0,-.04,-.012));stage.camera.data.lens=57
                filename='teemto-pilot-side-v3.png'
            elif ACTION=='preview-front':
                stage.camera.location=(1.18,.78,.34)
                point_at(stage.camera,(0,-.035,-.02));stage.camera.data.lens=57
                filename='teemto-pilot-front-quarter-v3.png'
            else:
                stage.camera.location=(9,16,7)
                point_at(stage.camera,(0,5,-1));stage.camera.data.lens=45
                filename='teemto-pilot-full-v3.png'
            stage.render.filepath=REVIEW+filename
            bpy.ops.render.render(write_still=True,scene=stage.name)
            result={'action':ACTION,'image':stage.render.filepath,
                'renderer':'CPU Cycles, 32 samples','runtimeEvidence':False}
        elif ACTION=='export':
            assert EXPORT_SCENE not in bpy.data.scenes
            assert all(len(o.data.materials)==1 for o in pilots)
            originals=[(o,o.matrix_world.copy()) for o in stage.objects if o.type=='MESH']
            destination=bpy.data.scenes.new(EXPORT_SCENE)
            bpy.context.window.scene=destination
            scale=2.5
            pitch=math.atan2(1.895,8.38)
            rotation=Matrix.Rotation(math.pi,4,'Z')@Matrix.Rotation(pitch,4,'X')
            seat=Vector((0,-.13,-.205))
            offset=Vector((0,5.2,2.2))-scale*(rotation@seat)
            transform=Matrix.Translation(offset)@Matrix.Scale(scale,4)@rotation
            groups={}
            for original,matrix in originals:
                is_pilot=original in pilots
                if is_pilot:
                    group_name='teemto-pilot'
                else:
                    engine=any('Propulsores' in m.name for m in original.data.materials if m)
                    x=sum(v.co.x for v in original.data.vertices)/len(original.data.vertices)
                    group_name=('teemto-engine-left' if x>0 else 'teemto-engine-right') if engine else 'teemto-cockpit'
                if group_name not in groups:
                    group=bpy.data.objects.new(group_name+'-construction-v3',None)
                    destination.collection.objects.link(group);groups[group_name]=group
                mesh=original.data.copy();mesh.transform(transform@matrix)
                key=original.name.split('pilot-material-v3-')[-1].split('.')[0]
                obj=bpy.data.objects.new('teemto-pilot-'+key if is_pilot else group_name+'-part',mesh)
                destination.collection.objects.link(obj);obj.parent=groups[group_name]
            for key,group in groups.items():
                if key=='teemto-pilot':
                    continue
                selected=list(group.children)
                for obj in destination.objects:
                    obj.select_set(obj in selected)
                bpy.context.view_layer.objects.active=selected[0]
                if len(selected)>1:
                    bpy.ops.object.join()
                bpy.context.object.name=key+'-body'
            for obj in destination.objects:
                obj.select_set(True)
            path=BASE+'teemto-pilot-material-v3-normalized.glb'
            bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,
                use_active_scene=True,export_extras=False,export_animations=False,
                export_cameras=False,export_lights=False,export_yup=True)
            counts=[]
            for obj in destination.objects:
                if obj.type=='MESH':
                    obj.data.calc_loop_triangles()
                    counts.append({'mesh':obj.name,'triangles':len(obj.data.loop_triangles)})
            result={'action':ACTION,'path':path,'meshes':counts,'triangles':sum(x['triangles'] for x in counts),
                'normalization':'same 2.5 scale / 12.742 degree pitch as Teemto v1',
                'exportExtras':False,'sourceModified':False,'publicModified':False}
        else:
            raise ValueError('Unknown action')
finally:
    if bpy.context.object and bpy.context.object.mode!='OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.window.scene=saved_scene
    bpy.context.window.view_layer=saved_layer
    for obj in saved_layer.objects:
        if obj.select_get() and obj not in saved_selected:
            obj.select_set(False)
    for obj in saved_selected:
        obj.select_set(True)
    saved_layer.objects.active=saved_active
result['restoredContext']={'scene':saved_scene.name,'viewLayer':saved_layer.name,
    'activeObject':saved_active.name if saved_active else None,'selectedCount':len(bpy.context.selected_objects),'exactSelectionRestored':set(bpy.context.selected_objects)==set(saved_selected)}
print(json.dumps(result))
