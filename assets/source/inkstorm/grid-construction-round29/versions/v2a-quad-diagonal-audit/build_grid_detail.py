"""STAGED: send this literal source to Blender MCP only after root GO.

Original additive grid construction. X frontage, Y depth, Z up; front -Y.
No existing objects are edited. Export overlays only, never publish runtime GLBs.
No external assets, dynamic execution, file reads, network, full blend save or render.
"""
import bpy
import math
import json
from mathutils import Vector

OUTPUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/grid-construction-round29/'
PAINT = {
    'ink': (.045, .04, .065), 'shadow': (.125, .10, .15),
    'cobalt': (.095, .21, .32), 'steel': (.25, .29, .31),
    'coral': (.80, .255, .12), 'rust': (.43, .13, .065),
    'cream': (.84, .65, .40), 'pale': (.96, .82, .61),
    'cyan': (.10, .87, .79), 'warm': (1., .61, .16),
}
# Frozen asset bounds in Blender's source coordinate convention.
BOUNDS = {
    'pit-complex': [(-71, 79), (-28, 32.5), (0, 47)],
    'pit-district': [(-56.81999969482422, 58.25), (-12.535015106201172, 18), (0, 34.05223083496094)],
    'foundry-gantry': [(-52, 52), (-7, 7), (-25, 54.30417251586914)],
}
OVERLAY_CAPS = {'pit-complex': 6468, 'pit-district': 4246, 'foundry-gantry': 2006}
# Literal copy of task-light-anchors.json, verified by CPU packaging tests.
TASK_LIGHTS = {
    'pit-complex': [(-50,3,9.44),(-8,3,9.44),(36,6,9.44)],
    'pit-district': [(-36,2,11.38),(1,6,16.38),(41,-1,13.18)],
}


def new_mesh():
    return {'v': [], 'f': [], 'c': [], 'smooth': []}


def part(m, verts, faces, color, smooth=False):
    offset = len(m['v'])
    m['v'].extend(tuple(p) for p in verts)
    for face in faces:
        m['f'].append(tuple(offset + i for i in face))
        m['c'].append(PAINT[color] if isinstance(color, str) else color)
        m['smooth'].append(smooth)


def box(m, center, size, color):
    x, y, z = center
    w, d, h = [v / 2 for v in size]
    verts = [(x-w,y-d,z-h),(x+w,y-d,z-h),(x+w,y+d,z-h),(x-w,y+d,z-h),
             (x-w,y-d,z+h),(x+w,y-d,z+h),(x+w,y+d,z+h),(x-w,y+d,z+h)]
    part(m, verts, [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)], color)


def frame(a, b):
    n = (Vector(b)-Vector(a)).normalized()
    ref = Vector((0,0,1)) if abs(n.z) < .94 else Vector((0,1,0))
    u = n.cross(ref).normalized()
    return n, u, n.cross(u)


def tube(m, a, b, r, color, sides=10, r2=None):
    _, u, v = frame(a,b)
    verts = []
    for p, radius in [(a,r),(b,r if r2 is None else r2)]:
        for i in range(sides):
            t = i*math.tau/sides
            verts.append(Vector(p)+radius*(u*math.cos(t)+v*math.sin(t)))
    faces = [tuple(reversed(range(sides))), tuple(range(sides,2*sides))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    part(m, verts, faces, color)


def beam(m, a, b, width, color='steel'):
    tube(m,a,b,width*.7071,color,4)


def pipe(m, points, radius, color, sides=6):
    # Continuous sweep: connected hose/chain runs have no orphan pipe mouths.
    verts = []
    for i,p in enumerate(points):
        _,u,v = frame(points[max(0,i-1)],points[min(len(points)-1,i+1)])
        for k in range(sides):
            t = math.tau*k/sides
            verts.append(Vector(p)+radius*(u*math.cos(t)+v*math.sin(t)))
    faces = []
    for j in range(len(points)-1):
        for k in range(sides):
            faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
    part(m,verts,faces,color)


def ring(m,x,y,z,outer,inner,depth,color,sides=12):
    # An actual open collar around the turbine: no dark disk pretending to be a hole.
    verts = []
    for yy,rr in [(y-depth/2,outer),(y+depth/2,outer),(y-depth/2,inner),(y+depth/2,inner)]:
        for k in range(sides):
            a=math.tau*k/sides
            verts.append((x+rr*math.cos(a),yy,z+rr*math.sin(a)))
    faces=[]
    for k in range(sides):
        n=(k+1)%sides
        faces.extend([(k,n,sides+n,sides+k),(2*sides+n,2*sides+k,3*sides+k,3*sides+n),
                      (k,2*sides+k,2*sides+n,n),(sides+n,3*sides+n,3*sides+k,sides+k)])
    part(m,verts,[tuple(reversed(face)) for face in faces],color)


def bolt(m,x,y,z,r=.18):
    tube(m,(x,y,z),(x,y-.18,z),r,'cream',6)


def cargo(m,x,y,z,w=3.6,d=2.6,h=2.1,color='cobalt'):
    # Forklift-clear pallet, corner guards, two transport straps and recessed handles.
    for xx in [-w*.34,w*.34]:
        box(m,(x+xx,y,z+.16),(.4,d+.25,.32),'steel')
    box(m,(x,y,z+.39),(w+.22,d+.2,.18),'rust')
    box(m,(x,y,z+.52+h/2),(w,d,h),color)
    for xx in [-w*.31,w*.31]:
        box(m,(x+xx,y-d*.5-.055,z+.52+h/2),(.18,.11,h+.08),'cream')
        box(m,(x+xx,y,z+.56+h),(.18,d+.08,.12),'cream')
    for side in [-1,1]:
        box(m,(x+side*w*.45,y-d*.5-.08,z+.65),(.26,.14,.4),'steel')
        box(m,(x+side*w*.45,y-d*.5-.08,z+.4+h),(.26,.14,.4),'steel')
    box(m,(x,y-d*.5-.07,z+.65+h*.47),(w*.34,.12,.36),'ink')
    beam(m,(x-w*.12,y-d*.5-.16,z+.78+h*.47),(x+w*.12,y-d*.5-.16,z+.78+h*.47),.10,'pale')


def trolley(m,x,y,z,color='cobalt'):
    for xx in [-1.15,1.15]:
        for yy in [-.75,.75]:
            tube(m,(x+xx-.14,y+yy,z+.38),(x+xx+.14,y+yy,z+.38),.32,'ink',8)
    box(m,(x,y,z+.65),(2.7,1.95,.3),'steel')
    box(m,(x,y,z+1.65),(2.45,1.72,1.75),color)
    for zz in [1.15,1.6,2.05]:
        box(m,(x,y-.90,z+zz),(2.08,.10,.31),'shadow')
        beam(m,(x-.45,y-.99,z+zz+.03),(x+.45,y-.99,z+zz+.03),.10,'cream')
    box(m,(x,y,z+2.58),(2.8,2.1,.16),'steel')
    for xx in [-1.1,1.1]:
        beam(m,(x+xx,y+.84,z+2.6),(x+xx,y+1.18,z+3.0),.13,'steel')
    beam(m,(x-1.1,y+1.18,z+3),(x+1.1,y+1.18,z+3),.13,'cream')


def welder(m,x,y,z):
    trolley(m,x,y,z,'coral')
    for xx,color in [(-.56,'cream'),(.56,'cobalt')]:
        tube(m,(x+xx,y+.15,z+2.7),(x+xx,y+.15,z+4.45),.39,color,10)
        tube(m,(x+xx,y+.15,z+4.45),(x+xx,y+.15,z+4.7),.39,'steel',10,.12)
        tube(m,(x+xx,y+.15,z+4.7),(x+xx,y+.15,z+4.94),.1,'rust',6)
    pipe(m,[(x-.5,y-.1,z+4.8),(x-1.1,y-.7,z+3.7),(x-1.3,y-1.4,z+1.3),
            (x-.9,y-2,z+.2),(x+.6,y-2.25,z+.18),(x+1.7,y-1.7,z+.45)],.09,'ink')
    beam(m,(x+1.7,y-1.7,z+.45),(x+2.2,y-1.65,z+.65),.16,'steel')


def engine(m,x,y,z,scale=1,paint='coral'):
    s=scale
    # Four-legged trestle, supporting saddles, exposed turbine and aft service ring.
    for yy in [-2.15,2.15]:
        for xx in [-2.3,2.3]:
            beam(m,(x+xx*s,y+yy*s,z+.2*s),(x+xx*.68*s,y+yy*s,z+2.7*s),.32*s,'steel')
            box(m,(x+xx*s,y+yy*s,z+.16*s),(.8*s,.9*s,.32*s),'rust')
        beam(m,(x-2.4*s,y+yy*s,z+.7*s),(x+2.4*s,y+yy*s,z+.7*s),.34*s)
        ring(m,x,y+yy*s,z+3.45*s,2.33*s,2.03*s,.4*s,'steel')
    for xx in [-1.7,1.7]:
        beam(m,(x+xx*s,y-2.5*s,z+2.6*s),(x+xx*s,y+2.6*s,z+2.6*s),.22*s)
    tube(m,(x,y-2.5*s,z+3.45*s),(x,y+2.1*s,z+3.45*s),2.0*s,paint,14)
    tube(m,(x,y+2.1*s,z+3.45*s),(x,y+3.0*s,z+3.45*s),2.0*s,'steel',14,1.25*s)
    ring(m,x,y-2.73*s,z+3.45*s,2.18*s,1.70*s,.52*s,'cobalt',14)
    # Blades inset behind the open lip; dark broad body face stays far back.
    for k in range(10):
        a=math.tau*k/10
        verts=[]
        for r,aa in [(.35,a),(1.65,a+.07),(1.65,a+.29),(.42,a+.44)]:
            verts.append((x+r*s*math.cos(aa),y-2.52*s,z+3.45*s+r*s*math.sin(aa)))
        part(m,verts,[(0,1,2,3)],'cream' if k%3==0 else 'steel')
    tube(m,(x,y-2.53*s,z+3.45*s),(x,y-2.83*s,z+3.45*s),.37*s,'ink',10,.22*s)
    for xx in [-.65,.65]:
        pipe(m,[(x+xx*s,y-1.5*s,z+5.35*s),(x+xx*s,y-.8*s,z+5.65*s),
                (x+xx*s,y+1.5*s,z+5.65*s),(x+xx*s,y+2.1*s,z+4.95*s)],.13*s,'cream')
    box(m,(x+1.74*s,y+.5*s,z+4.2*s),(.24*s,1.9*s,1.15*s),'cobalt')


def hoist(m,x,y,z,width=9,height=8):
    for xx in [-width/2,width/2]:
        for yy in [-1.3,1.3]:
            beam(m,(x+xx,y+yy,z+.25),(x+xx,y,z+height),.27,'steel')
            box(m,(x+xx,y+yy,z+.2),(.72,.95,.4),'rust')
    for zz in [height,height+.65]:
        beam(m,(x-width/2-.3,y,z+zz),(x+width/2+.3,y,z+zz),.3,'cobalt')
    for i in range(4):
        xx=x-width/2+i*width/4
        beam(m,(xx,y,z+height),(xx+width/8,y,z+height+.65),.17,'cream')
        beam(m,(xx+width/8,y,z+height+.65),(xx+width/4,y,z+height),.17,'steel')
    box(m,(x+.6,y,z+height-.15),(1.05,.95,.75),'coral')
    tube(m,(x+.6,y,z+height-.55),(x+.6,y,z+height-3),.08,'ink',6)
    path=[]
    for i in range(7):
        t=-math.pi/2+i*math.pi*1.35/6
        path.append((x+.6+.36*math.cos(t),y,z+height-3.3+.36*math.sin(t)))
    pipe(m,path,.11,'cream')


def cloth_shell(m,x,y,w,d,height,color,kind,seed=0):
    # Reuse the exact existing tension field, sealing original triangles inside.
    nx,ny=(8,5) if kind=='pit' else (12,7)
    verts=[]
    for thickness in [.09,-.16]:
        for j in range(ny+1):
            for i in range(nx+1):
                u=i/nx;v=j/ny
                if kind=='pit':
                    zz=height-2.5*v-2.2*math.sin(math.pi*u)*math.sin(math.pi*v)+.7*math.sin(u*10)*v
                else:
                    zz=height-2.2*v-2.4*math.sin(math.pi*u)*math.sin(math.pi*v)+.45*math.sin(u*15+seed)*v
                verts.append((x+(u-.5)*w,y-v*d,zz+thickness))
    layer=(nx+1)*(ny+1)
    faces=[]
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i
            faces.append((a,a+1,a+nx+2,a+nx+1))
    part(m,verts,[tuple(reversed(face)) for face in faces],color)
    part(m,verts,[tuple(layer+i for i in face) for face in faces],'shadow')
    perimeter=list(range(nx+1))+[j*(nx+1)+nx for j in range(1,ny+1)]
    perimeter += [ny*(nx+1)+i for i in range(nx-1,-1,-1)]
    perimeter += [j*(nx+1) for j in range(ny-1,0,-1)]
    part(m,verts,[(a,perimeter[(k+1)%len(perimeter)],layer+perimeter[(k+1)%len(perimeter)],layer+a)
                  for k,a in enumerate(perimeter)],'rust')
    # Visible bound seams on every third cloth panel and front hem.
    for i in range(0,nx+1,3 if kind=='pit' else 6):
        path=[tuple(Vector(verts[j*(nx+1)+i])+Vector((0,0,.035))) for j in range(ny+1)]
        pipe(m,path,.055,'cream',4)
    front=[verts[ny*(nx+1)+i] for i in range(nx+1)]
    pipe(m,front,.095,'steel',4)


def pit_detail():
    m=new_mesh()
    for i,(x,w,h,d) in enumerate([(-47,40,17,32),(-5,34,14,30),(39,46,20,38)]):
        y=4 if i<2 else 7
        cloth_shell(m,x-1,y-d*.5-.1,w*.84,10 if i<2 else 12,h*.85+2.2,
                    'coral' if i==1 else 'cobalt','pit')
    engine(m,-47,-10,1,1.05,'coral')
    hoist(m,-47,-8.5,1,11,9.2)
    trolley(m,-59,-14,1)
    cargo(m,-36,-18,1,4.2,3.0,2.5)
    cargo(m,-30,-15.5,1,3.3,2.5,1.5,'coral')
    welder(m,-12,-13,1)
    hoist(m,-4,-8,1,8,8)
    cargo(m,3,-15,1,3.4,2.4,2.8)
    engine(m,38,-9,1,.88,'cobalt')
    trolley(m,48,-13,1,'coral')
    cargo(m,54,-18,1,4.6,3.0,2.0,'cream')
    task_fixtures(m,'pit-complex')
    return m


def district_detail():
    m=new_mesh()
    for i,(x,w,back,h) in enumerate([(-39,33,13,12),(-2,35,17,17),(38,33,10,13.8)]):
        cloth_shell(m,x-.4,back-10,w*.93,11 if i!=1 else 14,h-1,
                    'coral' if i==1 else 'cobalt','district',i*11)
    cloth_shell(m,-17,9,44,14,26,'coral','district',39)
    engine(m,-37,-5,.4,.72)
    trolley(m,7,-5,.4)
    cargo(m,29,-7,.4,3.5,2.4,2.2)
    cargo(m,34,-7,.4,2.7,2.2,1.2,'coral')
    # Short connected service rails behind the front working strip.
    for x,back,h in [(-39,13,12),(-2,17,17),(38,10,13.8)]:
        for zz in [h-3.5,h-2.9]:
            beam(m,(x-9,back-9,zz),(x+9,back-9,zz),.15,'steel')
        for xx in [-8,0,8]:
            beam(m,(x+xx,back-9,h-3.6),(x+xx,back-7.8,h-1),.13,'rust')
    task_fixtures(m,'pit-district')
    return m


def task_fixtures(m,family):
    # Two closed boxes each: 24 triangles, no material or draw-call growth.
    # Existing crossbeam intersects the body's upper portion; lens bottom is emitter Z.
    for x,y,z in TASK_LIGHTS[family]:
        box(m,(x,y,z+.20),(2.6,.95,.32),'steel')
        box(m,(x,y,z+.035),(2.1,.68,.07),'warm')


def gantry_detail():
    m=new_mesh()
    # Road approach is Blender +Y: put construction on that face as well.
    for x in [-46,-31,-15,1,17,32,46]:
        box(m,(x,4.14,47.6),(2.65,.22,5.85),'steel')
        for dx in [-.86,.86]:
            for z in [45.35,49.8]:
                tube(m,(x+dx,4.27,z),(x+dx,4.46,z),.18,'cream',6)
        part(m,[(x-1.1,4.27,45.6),(x+.4,4.27,45.6),(x+.1,4.27,45.94),(x-.92,4.27,46.0)],[(3,2,1,0)],'rust')
    # Actual connected conduits rest below the span and meet both upright collars.
    for y,z,r in [(5.3,43.7,.20),(5.9,44.45,.14)]:
        pipe(m,[(-46,y,31),(-46,y,41),(-43,y,z),(43,y,z),(46,y,41),(46,y,31)],r,'cream',8)
    for x in [-11,-5.5,0,5.5,11]:
        # A shallow lens and raised ring make the existing five lights readable from both sides.
        tube(m,(x,-.56,41),(x,-.24,41),1.03,'warm' if x<0 else 'cyan',14)
        ring(m,x,-.14,41,1.24,1.02,.22,'steel',14)
    for x,drop in [(-25,3.5),(25,4.2)]:
        beam(m,(x,3.6,44.5),(x,3.6,44.5-drop),.11,'ink')
        tube(m,(x,3.6,44.6-drop),(x,3.6,44.0-drop),.52,'steel',10,.83)
        tube(m,(x,3.6,44.0-drop),(x,3.6,43.87-drop),.70,'warm',10)
    return m


def export_overlay(scene,name,data):
    bounds=[(min(p[i] for p in data['v']),max(p[i] for p in data['v'])) for i in range(3)]
    for i in range(3):
        assert bounds[i][0]>=BOUNDS[name][i][0]-.00001,(name,'min',i,bounds[i])
        assert bounds[i][1]<=BOUNDS[name][i][1]+.00001,(name,'max',i,bounds[i])
    mesh=bpy.data.meshes.new(name+'-grid-construction-r29-v2-overlay')
    mesh.from_pydata(data['v'],[],data['f']);mesh.update();mesh.calc_loop_triangles()
    assert len(mesh.loop_triangles)<=OVERLAY_CAPS[name],(name,len(mesh.loop_triangles))
    material=bpy.data.materials.new(name+'-grid-r29-v2-paint')
    material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value=.86
    vertex=material.node_tree.nodes.new('ShaderNodeVertexColor');vertex.layer_name='Color'
    material.node_tree.links.new(vertex.outputs['Color'],shader.inputs['Base Color'])
    mesh.materials.append(material)
    colors=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for polygon,color,smooth in zip(mesh.polygons,data['c'],data['smooth']):
        polygon.use_smooth=smooth
        for li in polygon.loop_indices:colors.data[li].color=(*color,1)
    mesh.color_attributes.active_color=colors
    obj=bpy.data.objects.new(name+'-grid-r29-v2-overlay',mesh);scene.collection.objects.link(obj)
    obj['source']='build_grid_detail.py';obj['purpose']='Original grid construction overlay; no simulation authority'
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=OUTPUT+name+'-overlay.glb',export_format='GLB',use_selection=True,
        use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'family':name,'triangles':len(mesh.loop_triangles),'boundsBlender':bounds,
           'object':obj.name,'export':'staging overlay only','primitive':1,'material':1})


previous_scene=bpy.context.window.scene
previous_layer=bpy.context.window.view_layer
previous_active=previous_layer.objects.active
previous_selection=list(bpy.context.selected_objects)
previous_memberships={item.name:tuple(sorted(obj.name for obj in item.objects)) for item in bpy.data.scenes}
previous_membership_fingerprint=14695981039346656037
for char in json.dumps(previous_memberships,sort_keys=True):
    previous_membership_fingerprint=((previous_membership_fingerprint^ord(char))*1099511628211)&0xffffffffffffffff
scene=bpy.data.scenes.new('Inkstorm Grid Construction Round29 v2')
try:
    bpy.context.window.scene=scene
    export_overlay(scene,'pit-complex',pit_detail())
    export_overlay(scene,'pit-district',district_detail())
    export_overlay(scene,'foundry-gantry',gantry_detail())
finally:
    bpy.context.window.scene=previous_scene
    bpy.context.window.view_layer=previous_layer
    for obj in previous_layer.objects:
        obj.select_set(obj in previous_selection)
    previous_layer.objects.active=previous_active
    assert bpy.context.window.scene==previous_scene
    assert bpy.context.window.view_layer==previous_layer
    assert previous_layer.objects.active==previous_active
    assert set(bpy.context.selected_objects)==set(previous_selection)
    assert all(tuple(sorted(obj.name for obj in bpy.data.scenes[name].objects))==members
               for name,members in previous_memberships.items())
    print(json.dumps({'context_restored':True,'active_scene':previous_scene.name,'view_layer':previous_layer.name,
        'active_object':previous_active.name if previous_active else None,
        'selection':sorted(obj.name for obj in previous_selection),
        'existing_scene_count':len(previous_memberships),'existing_scene_membership_fnv1a64':hex(previous_membership_fingerprint),
        'all_existing_scene_memberships_unchanged':True,'new_scene':scene.name,
        'new_scene_object_count':len(scene.objects)},sort_keys=True))
