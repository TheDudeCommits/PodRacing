"""Inkstorm authored environment kit. Run in Blender 5.x, isolated named scene.
Original geometry authored for this project; no external scene data consumed.
"""
import bpy, math, random
from mathutils import Vector
ROOT='/Users/amir/Projects/PodRacing'
scene=bpy.data.scenes['Inkstorm World Kit']
bpy.context.window.scene=scene
random.seed(41091)
materials={}
for name,rgb in {'sand':(0.80,0.25,0.095),'steel':(.075,.13,.22),'rust':(.66,.15,.058),'ivory':(.8,.65,.38),'cyan':(.08,.78,.72)}.items():
    mat=bpy.data.materials.new('Inkstorm_'+name); mat.diffuse_color=(*rgb,1)
    mat.use_nodes=True; bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*rgb,1); bsdf.inputs['Roughness'].default_value=.83
    vc=mat.node_tree.nodes.new('ShaderNodeVertexColor'); vc.layer_name='Color'
    mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color'])
    materials[name]=mat

def mesh_asset(name,verts,faces,colors,mat='sand'):
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj)
    if mat=='sand':
        for poly in mesh.polygons:poly.use_smooth=True
    mesh.materials.append(materials[mat]); attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for poly,c in zip(mesh.polygons,colors):
        for li in poly.loop_indices: attr.data[li].color=(*c,1)
    return obj

def stone(name,width,depth,height,seed,blade=False):
    rng=random.Random(seed); n=18; levels=18; verts=[]
    angles=[2*math.pi*i/n + rng.uniform(-.028,.028) for i in range(n)]
    faults=[rng.uniform(.83,1.15) for i in range(n)]
    for j in range(levels+1):
        h=j/levels; taper=(1-.5*h**2); ledge=(.10 if j%4==0 else -.035 if j%4==1 else 0)
        for i,a in enumerate(angles):
            r=(taper+ledge)*faults[i]*(1+rng.uniform(-.028,.028))
            x=math.cos(a)*width*.5*r+math.sin(h*5+seed)*width*.09*h
            y=math.sin(a)*depth*.5*r+math.sin(h*7)*depth*.055
            z=height*h + (rng.uniform(-1,1)*height*.03 if j else -2)
            verts.append((x,y,z))
    faces=[]; colors=[]
    for j in range(levels):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c=(j+1)*n+(i+1)%n;d=(j+1)*n+i
            faces.extend([(a,b,c),(a,c,d)])
            tone=(.72 if j%4==0 else .95 if j%4==1 else 1.0)*rng.uniform(.88,1.08)
            for k in range(2): colors.append((min(.98,.84*tone),.29*tone,.135*tone))
    faces.append(tuple(range(levels*n,(levels+1)*n)));colors.append((.93,.39,.17))
    return mesh_asset(name,verts,faces,colors)

assets=[stone('cliff-strata',70,44,108,71),stone('wind-blade',34,15,148,128,True),stone('mesa-crown',115,90,76,91),stone('roadside-shard',10,7,12,883)]
# A real irregular voussoir arch, continuous across the playable opening.
verts=[];faces=[];colors=[];n=40;sides=10
for j in range(n+1):
    t=math.pi*j/n; x=math.cos(t)*68;z=math.sin(t)*82
    thick=13+5*math.sin(t*7+.7)**2
    for k in range(sides):
        a=math.tau*k/sides;w=thick*(1+.13*math.sin(k*4+j*2.3))
        verts.append((x+math.cos(t)*math.cos(a)*w,math.sin(a)*w*.87,z+math.sin(t)*math.cos(a)*w))
for j in range(n):
    for k in range(sides):
        a=j*sides+k;b=j*sides+(k+1)%sides;c=(j+1)*sides+(k+1)%sides;d=(j+1)*sides+k
        faces.extend([(a,b,c),(a,c,d)])
        tone=.84+random.random()*.22
        colors.extend([(.86*tone,.3*tone,.14*tone)]*2)
assets.append(mesh_asset('canyon-arch',verts,faces,colors))
# Mechanical kit uses bevelled components fused into one draw per family.
def cube_part(name,location,scale,mat,bevel=.15):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(materials[mat]); mod=o.modifiers.new('Machined edge','BEVEL');mod.width=bevel;mod.segments=1
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    attr=o.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    base=materials[mat].diffuse_color
    for poly in o.data.polygons:
        tone=random.uniform(.86,1.12)
        for li in poly.loop_indices:attr.data[li].color=(min(1,base[0]*tone),min(1,base[1]*tone),min(1,base[2]*tone),1)
    return o

def combine(name,parts):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
    scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return o
parts=[]
for x in [-46,46]:
    parts.append(cube_part('tower',(x,0,24),(5,9,48),'rust',.6))
    parts.append(cube_part('foot',(x,0,2),(12,14,4),'steel',.4))
    for z in [10,22,34]:parts.append(cube_part('collar',(x,0,z),(7,11,1.7),'ivory',.16))
parts.append(cube_part('bridge',(0,0,48),(98,8,5),'steel',.6))
parts.append(cube_part('bridgeStripe',(0,-4.2,48),(76,.5,1.2),'rust',.04))
for x in range(-36,37,9):
    parts.append(cube_part('raceLight',(x,-4.5,46),(3,.8,1.4),'cyan',.16))
    o=cube_part('truss',(x,0,51),(1,6,8),'rust',.12);o.rotation_euler.y=.7;parts.append(o)
assets.append(combine('foundry-gantry',parts))
parts=[]
parts.append(cube_part('base',(0,0,3),(23,23,6),'steel',.8))
parts.append(cube_part('tower',(0,0,37),(14,14,68),'rust',.7))
for z in [14,28,42,56,68]:parts.append(cube_part('rib',(0,0,z),(17,17,2),'steel',.2))
parts.append(cube_part('stack',(0,0,84),(8,8,27),'ivory',.4))
for x in [-9,9]:
    parts.append(cube_part('sidepipe',(x,0,26),(3,4,47),'ivory',.4))
    parts.append(cube_part('warning',(x,-8,9),(3,.6,4),'cyan',.15))
assets.append(combine('refinery-stack',parts))
# Export each authored family independently, preserving originals and bounded meshes.
receipts=[]
for obj in assets:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/assets/inkstorm/'+obj.name+'.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    receipts.append({'id':obj.name,'vertices':len(obj.data.vertices),'faces':len(obj.data.polygons)})
import json
print(json.dumps(receipts))
