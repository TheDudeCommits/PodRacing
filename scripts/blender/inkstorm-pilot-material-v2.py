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
SOURCE = 'PodRacing — Teemto pilot detail v2'
STAGE = 'PodRacing — Teemto pilot material v2c'
EXPORT_SCENE = 'PodRacing — Teemto pilot material v2c normalized'
BASE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-material-v2c/'
REVIEW = '/Users/amir/Projects/PodRacing/output/vehicles/pilot-material-v2c-review/'
ATLAS_NAME = 'Inkstorm original pilot color atlas v2c 2048'
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


def garment_seams(material, position, role, color):
    """Medium-scale tailored panel borders, wear and stitches, baked in 3D.

    These fields follow the authored limb directions. They are not image edits
    or runtime shader dependencies. Wider dark seams support broken pale thread.
    """
    if role not in ('cloth_upper','cloth_forearm'):
        return color
    xyz=node(material,'ShaderNodeSeparateXYZ','Tailoring source coordinates')
    material.node_tree.links.new(position,xyz.inputs[0])
    x=math_node(material,'ABSOLUTE',xyz.outputs['X'],0)
    y,z=xyz.outputs['Y'],xyz.outputs['Z']
    if role=='cloth_upper':
        dot=math_node(material,'ADD',math_node(material,'MULTIPLY',x,.154),
            math_node(material,'ADD',math_node(material,'MULTIPLY',y,.536),
                math_node(material,'MULTIPLY',z,-.830)))
        along=math_node(material,'SUBTRACT',dot,.093*.154-.148*.536+.018*(-.830))
        transverse=math_node(material,'ABSOLUTE',math_node(material,'SUBTRACT',along,.052),0)
    elif role=='cloth_forearm':
        dot=math_node(material,'ADD',math_node(material,'MULTIPLY',x,.0405),
            math_node(material,'ADD',math_node(material,'MULTIPLY',y,.9848),
                math_node(material,'MULTIPLY',z,.1686)))
        along=math_node(material,'SUBTRACT',dot,.115*.0405-.072*.9848-.101*.1686)
        transverse=math_node(material,'MINIMUM',
            math_node(material,'ABSOLUTE',math_node(material,'SUBTRACT',along,.029),0),
            math_node(material,'ABSOLUTE',math_node(material,'SUBTRACT',along,.124),0))
    # Only intentional sleeve panel boundaries. The rejected v2b constant-X
    # planes intersected broad flat garment sides and made a stripe pattern.
    field=transverse
    broad=ramp(material,field,[(.0008,(.12,.12,.12)),(.004,(0,0,0))])
    broken=noise(material,position,240,2)
    color=mix(material,color,(.090,.080,.060),math_node(material,'MULTIPLY',broad,broken))
    dark=ramp(material,field,[(.0003,(.4,.4,.4)),(.0009,(0,0,0))])
    color=mix(material,color,(.008,.012,.016),dark)
    # Twin stitched borders flank the central seam instead of one painted line.
    edgefield=math_node(material,'ABSOLUTE',math_node(material,'SUBTRACT',field,.00125),0)
    thread=ramp(material,edgefield,[(.0001,(.30,.30,.30)),(.0004,(0,0,0))])
    thread=math_node(material,'MULTIPLY',thread,broken)
    return mix(material,color,(.11,.096,.075),thread)


def make_bake_material(role, atlas):
    material=bpy.data.materials.new('Pilot v2 bake '+role)
    material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Metallic'].default_value=0
    bsdf.inputs['Roughness'].default_value=.85
    geometry=node(material,'ShaderNodeNewGeometry','Pilot source position and edges')
    position=geometry.outputs['Position']
    broad=noise(material,position,33,3)
    fine=noise(material,position,390,2)
    palettes={
        'cloth':((.011,.019,.030),(.020,.033,.049),(.027,.040,.056)),
        'glove':((.008,.011,.014),(.019,.025,.030),(.040,.045,.046)),
        'webbing':((.012,.018,.024),(.031,.040,.046),(.066,.070,.070)),
        'rubber':((.005,.009,.012),(.013,.020,.025),(.028,.035,.037)),
        'helmet':((.43,.395,.325),(.56,.515,.421),(.63,.58,.480)),
        'metal':((.08,.087,.085),(.20,.21,.20),(.30,.31,.28)),
        'accent':((.19,.048,.015),(.38,.100,.029),(.47,.164,.068)),
        'visor':((.006,.015,.022),(.009,.020,.029),(.012,.026,.037)),
    }
    palette_role='cloth' if role.startswith('cloth') else role
    colors=palettes[palette_role]
    color=ramp(material,broad,[(.16,colors[0]),(.55,colors[1]),(.83,colors[2])])
    if role.startswith('cloth') or role in ('webbing','accent'):
        waves=[]
        for direction in ('X','Z'):
            wave=node(material,'ShaderNodeTexWave','Fine woven '+direction)
            wave.wave_type='BANDS'
            wave.bands_direction=direction
            wave.wave_profile='SIN'
            wave.inputs['Scale'].default_value=380 if role!='webbing' else 420
            wave.inputs['Distortion'].default_value=.3
            wave.inputs['Detail'].default_value=2
            material.node_tree.links.new(position,wave.inputs['Vector'])
            waves.append(wave.outputs['Fac'])
        weave=math_node(material,'MULTIPLY',waves[0],waves[1])
        weave=math_node(material,'ADD',.95,math_node(material,'MULTIPLY',weave,.05))
        color=mix(material,color,weave,1,'MULTIPLY')
        # Geometric seams and folded cuffs receive restrained rubbed cloth.
        edge=ramp(material,geometry.outputs['Pointiness'],
            [(.46,(0,0,0)),(.515,(.08,.08,.08)),(.57,(.34,.34,.34))])
        broken=math_node(material,'MULTIPLY',edge,broad)
        color=mix(material,color,(.16,.137,.095),broken)
        if role.startswith('cloth'):
            color=garment_seams(material,position,role,color)
    elif role=='helmet':
        # Paint variation and scuff clusters are restrained, spatially stable,
        # and biased to modeled edges; broad ivory paint remains dominant.
        chips=ramp(material,fine,[(.47,(0,0,0)),(.70,(.03,.03,.03)),(.81,(.27,.27,.27))])
        edge=ramp(material,geometry.outputs['Pointiness'],
            [(.46,(0,0,0)),(.53,(.05,.05,.05)),(.59,(.50,.50,.50))])
        mask=math_node(material,'MAXIMUM',chips,math_node(material,'MULTIPLY',edge,broad))
        color=mix(material,color,(.12,.13,.13),mask)
    elif role in ('glove','rubber','metal'):
        pore=ramp(material,fine,[(.2,(.75,.75,.75)),(.8,(1,1,1))])
        color=mix(material,color,pore,1,'MULTIPLY')
    if role!='visor':
        ao=node(material,'ShaderNodeAmbientOcclusion','Baked local seam and contact occlusion')
        ao.inputs['Distance'].default_value=.018
        ao.samples=12
        ao.inside=False
        ao.only_local=False
        contact=mix(material,(1,1,1),ao.outputs['Color'],.52)
        color=mix(material,color,contact,1,'MULTIPLY')
    material.node_tree.links.new(color,bsdf.inputs['Base Color'])
    tex=node(material,'ShaderNodeTexImage','Single shared pilot bake target')
    tex.image=atlas
    material.node_tree.nodes.active=tex
    return material


def role_for(key, center):
    x,y,z=center
    if key=='suit':
        if y>.075 and z>-.17:
            return 'glove'
        if abs(x)>.085 and z>-.17:
            return 'cloth_upper' if y<-.075 else 'cloth_forearm'
        return 'cloth'
    if key=='accent':
        return 'accent'
    if key=='shell':
        return 'helmet' if z>.07 else 'metal'
    if z>.11:
        return 'visor' if y>-.145 else 'metal'
    if .025<z<.105 or y>.025:
        return 'rubber'
    return 'webbing'


def pilot_meshes(scene):
    return [o for o in scene.objects if o.type=='MESH' and o.name.startswith('pilot-material-v2-')]


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
            is_pilot=original.type=='MESH' and original.name.startswith('teemto-pilot-v2-')
            key=original.name.split('teemto-pilot-v2-')[-1].split('.')[0] if is_pilot else None
            name='pilot-material-v2-'+key if is_pilot else 'pilot-material-study-copy-'+original.name
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
        assert len(pilots)==4
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
        atlas.filepath_raw=BASE+'pilot-color-atlas-v2.png'
        atlas.file_format='PNG'
        roles=('cloth','cloth_upper','cloth_forearm','glove','webbing','rubber','helmet','metal','accent','visor')
        materials={role:make_bake_material(role,atlas) for role in roles}
        receipts=[]
        for obj in pilots:
            key=keys[obj.name]
            obj.data.materials.clear()
            for role in roles:
                obj.data.materials.append(materials[role])
            # Classify connected mesh components so a glove/strap/helmet piece
            # never changes material abruptly halfway across one surface.
            neighbors=[set() for v in obj.data.vertices]
            for edge in obj.data.edges:
                a,b=edge.vertices
                neighbors[a].add(b);neighbors[b].add(a)
            labels={}; unseen=set(range(len(neighbors)))
            while unseen:
                stack=[unseen.pop()];component=[]
                while stack:
                    index=stack.pop();component.append(index)
                    for adjacent in neighbors[index]:
                        if adjacent in unseen:
                            unseen.remove(adjacent);stack.append(adjacent)
                center=sum((obj.data.vertices[i].co for i in component),Vector())/len(component)
                role=role_for(key,center)
                for index in component:
                    labels[index]=role
            for polygon in obj.data.polygons:
                polygon.material_index=roles.index(labels[polygon.vertices[0]])
            obj.data.calc_loop_triangles()
            receipts.append({'mesh':obj.name,'triangles':len(obj.data.loop_triangles),
                'uvLoops':len(obj.data.uv_layers.active.data),
                'bakeRoles':sorted(set(labels.values()))})
        assert sum(r['triangles'] for r in receipts)==8672
        result={'action':ACTION,'scene':stage.name,'pilotMeshes':receipts,
            'atlas':[2048,2048],'uvPacking':'joint multi-object smart projection',
            'sourceModified':False,'baked':False,'exported':False}
    else:
        stage=bpy.data.scenes[STAGE]
        bpy.context.window.scene=stage
        bpy.context.view_layer.update()
        pilots=pilot_meshes(stage)
        atlas=bpy.data.images[ATLAS_NAME]
        assert len(pilots)==4 and tuple(atlas.size)==(2048,2048)
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
                key=obj.name.split('pilot-material-v2-')[-1].split('.')[0]
                material=bpy.data.materials.new('Pilot atlas v2 runtime '+key)
                material.use_nodes=True
                bsdf=material.node_tree.nodes.get('Principled BSDF')
                bsdf.inputs['Roughness'].default_value={'suit':.85,'shell':.58,'accent':.74,'hardware':.42}[key]
                bsdf.inputs['Metallic'].default_value={'suit':.02,'shell':.13,'accent':.02,'hardware':.20}[key]
                tex=node(material,'ShaderNodeTexImage','Baked pilot atlas only')
                tex.image=atlas
                material.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
                obj.data.materials.clear()
                obj.data.materials.append(material)
                for polygon in obj.data.polygons:
                    polygon.material_index=0
            result={'action':ACTION,'atlas':atlas.filepath_raw,'imageSize':list(atlas.size),
                'pilotTriangles':8672,'pilotDraws':4,'baseColorIncludes':'original procedural color, woven value, controlled edge wear, local AO',
                'normalMap':False,'roughnessTexture':False,'exported':False}
        elif ACTION=='preview':
            assert all(len(o.data.materials)==1 for o in pilots), 'Bake before preview.'
            stage.cycles.samples=24
            stage.camera.location=(1.7,.25,.22)
            point_at(stage.camera,(0,-.04,-.012))
            stage.camera.data.lens=57
            stage.render.filepath=REVIEW+'teemto-material-side-v2.png'
            bpy.ops.render.render(write_still=True,scene=stage.name)
            stage.camera.location=(1.18,.78,.34)
            point_at(stage.camera,(0,-.035,-.02))
            stage.render.filepath=REVIEW+'teemto-material-front-quarter-v2.png'
            bpy.ops.render.render(write_still=True,scene=stage.name)
            stage.camera.location=(9,16,7)
            point_at(stage.camera,(0,5,-1))
            stage.camera.data.lens=45
            stage.render.filepath=REVIEW+'teemto-material-full-v2.png'
            bpy.ops.render.render(write_still=True,scene=stage.name)
            result={'action':ACTION,'images':['teemto-material-side-v2.png','teemto-material-front-quarter-v2.png','teemto-material-full-v2.png'],
                'renderer':'CPU Cycles, 24 samples','runtimeEvidence':False}
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
                    group=bpy.data.objects.new(group_name+'-material-v2',None)
                    destination.collection.objects.link(group);groups[group_name]=group
                mesh=original.data.copy();mesh.transform(transform@matrix)
                key=original.name.split('pilot-material-v2-')[-1].split('.')[0]
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
            path=BASE+'teemto-pilot-material-v2-normalized.glb'
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
    'activeObject':saved_active.name if saved_active else None,'selectedCount':len(bpy.context.selected_objects)}
print(json.dumps(result))
