# Composed after shared guards and SOURCE_RECEIPT, DAMAGE_RECEIPT actual JSON.
from mathutils import Matrix, Euler
SOURCE=bpy.data.scenes[SOURCE_RECEIPT['scene']]
DAMAGE=bpy.data.scenes[DAMAGE_RECEIPT['scene']]
assert source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
assert source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
STAGE='PodRacing — Teemto damage V16 neutral render temporary'
assert STAGE not in bpy.data.scenes
snapshot=global_snapshot()
old_worlds=set(bpy.data.worlds);old_lights=set(bpy.data.lights);old_cameras=set(bpy.data.cameras)
stage=None
report={'stage':'V16 neutral damage geometry preview','images':[],'scope':'Authored damaged asset in an illustrative grounded pose under neutral studio lighting, not runtime animation, actual contact timing, performance or art acceptance.'}
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
poses={'teemto-damage-severed-tethers-v16':((-2.8,0,-1.0),(.10,-.25,.65)),
       'teemto-damage-right-front-v16':((3.4,0,1.6),(.18,.30,.65)),
       'teemto-damage-right-rear-v16':((1.5,0,-3.3),(-.35,-.40,1.3))}
try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage;snapshot['window'].view_layer=stage.view_layers[0]
    copies=[]
    for original in DAMAGE.objects:
        if original.type!='MESH':continue
        ob=original.copy();ob.parent=None;ob.matrix_world=original.matrix_world.copy()
        ob.name='V16 neutral | '+original.name;stage.collection.objects.link(ob)
        if original.name in poses:
            delta,angles=poses[original.name]
            center=Vector(original['pivotGame'])
            transform=Matrix.Translation(center+Vector(delta))@Euler(angles,'XYZ').to_matrix().to_4x4()@Matrix.Translation(-center)
            ob.matrix_world=C@transform@C.inverted()@original.matrix_world
            minimum=min((ob.matrix_world@v.co).z for v in ob.data.vertices)
            ob.location.z += .12-minimum
        copies.append(ob)
    stage.render.engine='CYCLES';stage.cycles.device='CPU';stage.cycles.samples=24;stage.cycles.use_denoising=True
    stage.render.resolution_x=1400;stage.render.resolution_y=900;stage.render.resolution_percentage=100
    stage.render.image_settings.file_format='PNG';stage.render.image_settings.color_mode='RGBA'
    stage.view_settings.view_transform='AgX';stage.view_settings.look='AgX - Medium High Contrast';stage.view_settings.exposure=0;stage.view_settings.gamma=1
    world=bpy.data.worlds.new('V16 neutral world');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.18,.18,.18,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6;stage.world=world
    def aim(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
    for name,gamepos,power,color,size in [('key',(12,22,-3),4200,(1,.94,.85),14),('fill',(-18,14,8),3200,(.80,.88,1),14),('rim',(0,14,28),3800,(1,1,1),12)]:
        data=bpy.data.lights.new('V16 neutral '+name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
        ob=bpy.data.objects.new(data.name,data);stage.collection.objects.link(ob);ob.location=C@Vector(gamepos);aim(ob,C@Vector((0,2,9)))
    groundmesh=bpy.data.meshes.new('V16 neutral ground');groundmesh.from_pydata([(-60,-60,0),(60,-60,0),(60,60,0),(-60,60,0)],[],[(0,1,2,3)]);groundmesh.update()
    ground=bpy.data.objects.new('V16 neutral ground',groundmesh);stage.collection.objects.link(ground)
    material=bpy.data.materials.new('V16 neutral ground');material.diffuse_color=(.16,.15,.14,1);material.roughness=.95;groundmesh.materials.append(material)
    camera_data=bpy.data.cameras.new('V16 neutral camera');camera=bpy.data.objects.new(camera_data.name,camera_data);stage.collection.objects.link(camera);stage.camera=camera;camera_data.type='ORTHO';camera_data.sensor_fit='HORIZONTAL';camera_data.clip_start=.1;camera_data.clip_end=500
    all_points=[ob.matrix_world@v.co for ob in copies for v in ob.data.vertices]
    low=Vector([min(p[k] for p in all_points) for k in range(3)]);high=Vector([max(p[k] for p in all_points) for k in range(3)]);target=(low+high)*.5
    for view,game_eye,focus,scale in [('full',(34,20,-20),target,None),('torn-engine',(28,11,6),C@Vector((6,2.5,13)),17)]:
        camera.location=C@Vector(game_eye);aim(camera,focus)
        if scale is None:
            inverse=camera.rotation_euler.to_matrix().inverted();points=[inverse@(p-target) for p in all_points]
            width=max(p.x for p in points)-min(p.x for p in points);height=max(p.y for p in points)-min(p.y for p in points)
            camera_data.ortho_scale=max(width,height*1400/900)*1.18
        else:camera_data.ortho_scale=scale
        stage.render.filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/neutral-a-'+view+'.png'
        bpy.ops.render.render(write_still=True)
        report['images'].append({'view':view,'path':stage.render.filepath,'camera':list(camera.location),'target':list(focus),'orthoScale':camera_data.ortho_scale})
finally:
    for ob in list(bpy.data.objects):
        if ob not in snapshot['objects']:bpy.data.objects.remove(ob,do_unlink=True)
    if stage:bpy.data.scenes.remove(stage)
    for mesh in list(bpy.data.meshes):
        if mesh not in snapshot['meshes'] and mesh.users==0:bpy.data.meshes.remove(mesh)
    for material in list(bpy.data.materials):
        if material not in snapshot['materials'] and material.users==0:bpy.data.materials.remove(material)
    for data in list(bpy.data.worlds):
        if data not in old_worlds and data.users==0:bpy.data.worlds.remove(data)
    for data in list(bpy.data.lights):
        if data not in old_lights and data.users==0:bpy.data.lights.remove(data)
    for data in list(bpy.data.cameras):
        if data not in old_cameras and data.users==0:bpy.data.cameras.remove(data)
    report['preservation']=verify_global(snapshot)
    report['sourceExact']=source_signature(SOURCE)==SOURCE_RECEIPT['sourceSignature']
    report['damageExact']=source_signature(DAMAGE)==DAMAGE_RECEIPT['damageSignature']
    report['sourceNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in SOURCE.objects if o.type=='MESH'}==SOURCE_RECEIPT['sourceCornerNormalSignature']
    report['damageNormalsExact']={o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in DAMAGE.objects if o.type=='MESH'}==DAMAGE_RECEIPT['damageCornerNormalSignature']
    assert report['sourceExact'] and report['damageExact'] and report['sourceNormalsExact'] and report['damageNormalsExact']
    print('TEEMTO_DAMAGE_RECEIPT_BEGIN');print(json.dumps(report,sort_keys=True));print('TEEMTO_DAMAGE_RECEIPT_END')
