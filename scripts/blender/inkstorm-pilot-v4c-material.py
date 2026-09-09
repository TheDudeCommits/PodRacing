"""Isolated pilot UV/material production through Blender MCP.

Copy the unchanged V4B color PNG to the V4C target path before setup.
Run setup, then bake and preview as separate literal Blender MCP calls.
Use inkstorm-pilot-v4c-package.py for material-only GLB packaging.
This bakes original 3D procedural materials to UVs; it does not edit any raster
reference. No source/body materials, public assets, credentials or extras change.
"""
import bpy
import math
import json
from mathutils import Vector, Matrix

ACTION = 'setup'
SOURCE = 'PodRacing — Teemto pilot material v4b'
ATTRIBUTE_SOURCE = 'PodRacing — Teemto pilot construction v4b final'
STAGE = 'PodRacing — Teemto pilot material v4c'
EXPORT_SCENE = 'PodRacing — Teemto pilot material v4c normalized'
BASE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c/'
REVIEW = BASE+'review/'
ATLAS_NAME = 'Inkstorm original pilot color atlas v4c 2048'
NORMAL_NAME = 'Inkstorm pilot v4c normal atlas 1024'
ROUGHNESS_NAME = 'Inkstorm pilot v4c roughness atlas 1024'
saved_scene = bpy.context.window.scene
saved_layer = bpy.context.window.view_layer
saved_active = saved_layer.objects.active
saved_selected = list(bpy.context.selected_objects)
saved_object_count = len(saved_scene.objects)


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
    material=bpy.data.materials.new('Pilot v4c source '+role)
    material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value={'shell':.10,'hardware':.16}.get(role,0)
    attribute=node(material,'ShaderNodeVertexColor','Authored fabric panel and seam colors')
    attribute.layer_name='PilotFabricColor'
    wear_attribute=node(material,'ShaderNodeVertexColor','Authored contact and crease ridge wear')
    wear_attribute.layer_name='PilotWear'
    geo=node(material,'ShaderNodeNewGeometry','Original 3D garment coordinates')
    position=geo.outputs['Position']
    broad=noise(material,position,56,3)
    fine=noise(material,position,430,2)
    variation=ramp(material,broad,[(.16,(.84,.84,.84)),(.50,(1,1,1)),(.82,(1.14,1.14,1.14))])
    color=mix(material,attribute.outputs['Color'],variation,1,'MULTIPLY')
    broken=ramp(material,fine,[(.32,(0,0,0)),(.54,(.18,.18,.18)),(.76,(1,1,1))])
    ridge=math_node(material,'MULTIPLY',wear_attribute.outputs['Color'],broken)
    pointiness=ramp(material,geo.outputs['Pointiness'],[(.49,(0,0,0)),(.545,(.16,.16,.16)),(.58,(.35,.35,.35))])
    wear=math_node(material,'MAXIMUM',ridge,math_node(material,'MULTIPLY',pointiness,broad))
    roughness={'suit':.83,'webbing':.93,'accent':.86,'rubber':.62,'shell':.48,'hardware':.31}[role]
    rough_variation=math_node(material,'ADD',roughness-.10,math_node(material,'MULTIPLY',broad,.17))
    rough_variation=math_node(material,'ADD',rough_variation,math_node(material,'MULTIPLY',wear,.13))
    bsdf.inputs['Roughness'].default_value=roughness
    material.node_tree.links.new(rough_variation,bsdf.inputs['Roughness'])
    height=fine
    if role in ('suit','webbing','accent'):
        waves=[]
        for direction in ('X','Z'):
            wave=node(material,'ShaderNodeTexWave','Woven yarn '+direction)
            wave.wave_type='BANDS';wave.bands_direction=direction
            wave.inputs['Scale'].default_value=520 if role!='webbing' else 440
            wave.inputs['Distortion'].default_value=.22
            wave.inputs['Detail'].default_value=2
            material.node_tree.links.new(position,wave.inputs['Vector'])
            waves.append(wave.outputs['Fac'])
        weave=math_node(material,'MULTIPLY',waves[0],waves[1])
        height=math_node(material,'ADD',math_node(material,'MULTIPLY',weave,.58),math_node(material,'MULTIPLY',fine,.42))
        fabric_value=math_node(material,'ADD',.84,math_node(material,'MULTIPLY',weave,.16))
        color=mix(material,color,fabric_value,1,'MULTIPLY')
        color=mix(material,color,(.10,.12,.15),math_node(material,'MULTIPLY',wear,.30))
    elif role=='shell':
        chips=ramp(material,fine,[(.52,(0,0,0)),(.69,(.04,.04,.04)),(.82,(.26,.26,.26))])
        color=mix(material,color,(.070,.076,.071),math_node(material,'MAXIMUM',chips,wear))
    elif role=='rubber':
        color=mix(material,color,(.075,.062,.043),math_node(material,'MULTIPLY',wear,.47))
    if role!='hardware':
        ao=node(material,'ShaderNodeAmbientOcclusion','Local garment contact')
        ao.inputs['Distance'].default_value=.013;ao.samples=12
        color=mix(material,color,mix(material,(1,1,1),ao.outputs['Color'],.44),1,'MULTIPLY')
    material.node_tree.links.new(color,bsdf.inputs['Base Color'])
    bump=node(material,'ShaderNodeBump','Original cloth leather and paint microstructure')
    bump.inputs['Strength'].default_value={'suit':.18,'webbing':.24,'accent':.18,'rubber':.24,'shell':.13,'hardware':.10}[role]
    bump.inputs['Distance'].default_value={'suit':.0010,'webbing':.0012,'accent':.0009,'rubber':.0007,'shell':.00035,'hardware':.00020}[role]
    material.node_tree.links.new(height,bump.inputs['Height'])
    material.node_tree.links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    tex=node(material,'ShaderNodeTexImage','Single shared pilot bake target')
    tex.image=atlas;material.node_tree.nodes.active=tex
    return material


def pilot_meshes(scene):
    return [o for o in scene.objects if o.type=='MESH' and o.name.startswith('pilot-material-v4c-')]


def point_at(obj,target):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()


def assert_geometry_equal(a,b):
    assert len(a.vertices)==len(b.vertices)
    assert all(tuple(x.co)==tuple(y.co) for x,y in zip(a.vertices,b.vertices))
    assert [tuple(p.vertices) for p in a.polygons]==[tuple(p.vertices) for p in b.polygons]
    assert all(tuple(x.normal)==tuple(y.normal) for x,y in zip(a.vertices,b.vertices))
    assert len(a.uv_layers)==len(b.uv_layers)
    for la,lb in zip(a.uv_layers,b.uv_layers):
        assert all(tuple(x.uv)==tuple(y.uv) for x,y in zip(la.data,lb.data))


try:
    if ACTION=='setup':
        assert STAGE not in bpy.data.scenes
        source=bpy.data.scenes[SOURCE]
        attribute_source=bpy.data.scenes[ATTRIBUTE_SOURCE]
        bpy.context.window.scene=source
        bpy.context.view_layer.update()
        originals=[(o,o.matrix_world.copy()) for o in source.objects]
        stage=bpy.data.scenes.new(STAGE)
        bpy.context.window.scene=stage
        original_atlas=bpy.data.images['Inkstorm original pilot color atlas v4b 2048']
        atlas=bpy.data.images.load(BASE+'pilot-color-atlas-v4c.png',check_existing=False)
        first_pixel=atlas.pixels[0]
        atlas.name=ATLAS_NAME
        atlas.filepath_raw=BASE+'pilot-color-atlas-v4c.png'
        atlas.file_format='PNG'
        pilot_roles=[]
        for original,matrix in originals:
            data=original.data.copy() if original.data else None
            is_pilot=original.type=='MESH' and original.name.startswith('pilot-material-v4b-')
            role=original.name.split('pilot-material-v4b-')[-1].split('.')[0] if is_pilot else None
            name='pilot-material-v4c-'+role if is_pilot else 'pilot-v4c-preserved-'+original.name
            obj=bpy.data.objects.new(name,data)
            stage.collection.objects.link(obj)
            obj.matrix_world=matrix
            if original==source.camera:stage.camera=obj
            if original.type=='MESH':assert_geometry_equal(original.data,obj.data)
            if not is_pilot:continue
            pilot_roles.append(role)
            assert len(original.data.materials)==1
            runtime=original.data.materials[0].copy()
            runtime.name='Pilot atlas v4c runtime '+role
            runtime.node_tree.nodes['Baked pilot atlas only'].image=atlas
            obj.data.materials.clear()
            if role!='suit':
                obj.data.materials.append(runtime)
                continue
            original_color=next(o for o in attribute_source.objects if o.type=='MESH' and o.name.startswith('teemto-pilot-v4b-suit'))
            assert len(original_color.data.vertices)==len(obj.data.vertices)
            assert [tuple(p.vertices) for p in original_color.data.polygons]==[tuple(p.vertices) for p in obj.data.polygons]
            palette={
                (.017,.025,.033):(.065,.095,.130),
                (.021,.031,.039):(.071,.103,.140),
                (.010,.015,.020):(.035,.052,.072),
                (.012,.017,.021):(.033,.047,.061),
                (.024,.031,.035):(.085,.108,.137),
                (.009,.013,.016):(.026,.039,.051),
                (.012,.017,.022):(.036,.054,.075),
                (.013,.019,.024):(.048,.069,.090),
                (.070,.056,.033):(.100,.115,.130),
            }
            for attr_name in ('PilotFabricColor','PilotWear'):
                source_attr=original_color.data.color_attributes[attr_name]
                target=obj.data.color_attributes.new(name=attr_name,type=source_attr.data_type,domain=source_attr.domain)
                assert len(target.data)==len(source_attr.data)
                for a,b in zip(source_attr.data,target.data):
                    color=tuple(a.color)
                    if attr_name=='PilotFabricColor':
                        key=tuple(round(v,6) for v in color[:3])
                        color=(*palette[key],color[3])
                    b.color=color
            obj.data.materials.append(make_bake_material('suit',atlas))
            for polygon in obj.data.polygons:polygon.material_index=0
        assert sorted(pilot_roles)==sorted(('suit','shell','accent','hardware','webbing','rubber'))
        stage.world=source.world.copy() if source.world else None
        stage.render.engine='CYCLES';stage.cycles.device='CPU';stage.cycles.samples=16
        stage.cycles.use_denoising=True
        stage.view_settings.view_transform='AgX'
        stage.render.resolution_x=1400;stage.render.resolution_y=1000
        stage.render.resolution_percentage=100;stage.render.image_settings.file_format='PNG'
        result={'action':ACTION,'scene':STAGE,'geometryAndUVPreservedExactly':True,
            'sourceAtlasCopied':True,'suitBaseLinear':[.065,.095,.130],
            'changedMaterial':'suit color only','normalAndRoughnessUnchanged':True,
            'otherFivePilotMaterialTreatmentsUnchanged':True,'sourceModified':False}
    else:
        stage=bpy.data.scenes[STAGE]
        bpy.context.window.scene=stage
        bpy.context.view_layer.update()
        atlas=bpy.data.images[ATLAS_NAME]
        pilots=pilot_meshes(stage)
        assert len(pilots)==6
        suit=next(o for o in pilots if o.name=='pilot-material-v4c-suit')
        if ACTION=='bake':
            assert suit.data.materials[0].name.startswith('Pilot v4c source suit')
            for obj in stage.objects:obj.select_set(obj==suit)
            bpy.context.view_layer.objects.active=suit
            stage.render.bake.use_pass_direct=False;stage.render.bake.use_pass_indirect=False
            stage.render.bake.use_pass_color=True;stage.render.bake.use_clear=False
            stage.render.bake.margin=4;stage.render.bake.margin_type='EXTEND'
            bpy.ops.object.bake(type='DIFFUSE')
            atlas.save()
            suit.data.materials.clear()
            suit.data.materials.append(bpy.data.materials['Pilot atlas v4c runtime suit'])
            for polygon in suit.data.polygons:polygon.material_index=0
            result={'action':ACTION,'atlas':atlas.filepath_raw,'imageSize':list(atlas.size),
                'bakedObjects':['pilot-material-v4c-suit'],'uvRepacked':False,
                'normalAndRoughnessUnchanged':True,'changedMaterial':'suit color only'}
        elif ACTION in ('preview-side','preview-front','preview-full'):
            assert suit.data.materials[0].name=='Pilot atlas v4c runtime suit'
            stage.cycles.samples=32
            if ACTION=='preview-side':
                stage.camera.location=(1.7,.25,.22)
                point_at(stage.camera,(0,-.04,-.012));stage.camera.data.lens=57
                filename='teemto-pilot-side-v4c.png'
            elif ACTION=='preview-front':
                stage.camera.location=(1.18,.78,.34)
                point_at(stage.camera,(0,-.035,-.02));stage.camera.data.lens=57
                filename='teemto-pilot-front-quarter-v4c.png'
            else:
                stage.camera.location=(9,16,7)
                point_at(stage.camera,(0,5,-1));stage.camera.data.lens=45
                filename='teemto-pilot-full-v4c.png'
            stage.render.filepath=REVIEW+filename
            bpy.ops.render.render(write_still=True,scene=stage.name)
            result={'action':ACTION,'image':stage.render.filepath,'renderer':'CPU Cycles, 32 samples',
                'runtimeEvidence':False,'geometryModified':False}
        else:raise ValueError('Unknown action')
finally:
    bpy.context.window.scene=saved_scene
    bpy.context.window.view_layer=saved_layer
    for obj in saved_layer.objects:
        if obj.select_get() and obj not in saved_selected:obj.select_set(False)
    for obj in saved_selected:obj.select_set(True)
    saved_layer.objects.active=saved_active
result['restoredContext']={'scene':saved_scene.name,'viewLayer':saved_layer.name,
    'activeObject':saved_active.name if saved_active else None,'selectedCount':len(bpy.context.selected_objects),
    'exactSelectionRestored':set(bpy.context.selected_objects)==set(saved_selected),
    'objectCountUnchanged':len(saved_scene.objects)==saved_object_count,'sourceObjectCount':saved_object_count}
print(json.dumps(result))
