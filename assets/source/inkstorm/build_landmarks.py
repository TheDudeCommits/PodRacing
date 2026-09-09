"""Original Inkstorm landmark kit. Execute as literal Python in Blender MCP.

Only the owned 'Inkstorm World Kit' scene is touched. Each export is a single
vertex-coloured mesh, with its origin at ground level and no external textures.
X is width, Y is depth, Z is height; architectural fronts face local -Y.
"""
import bpy, math

ROOT = '/Users/amir/Projects/PodRacing'
scene = bpy.data.scenes['Inkstorm World Kit']
bpy.context.window.scene = scene
PALETTE = {
    'ink': (.035, .055, .105), 'cobalt': (.065, .16, .32),
    'coral': (.82, .22, .11), 'cream': (.93, .76, .47),
    'steel': (.14, .21, .29), 'cyan': (.13, .78, .74),
}
mat = bpy.data.materials.get('Inkstorm_Landmark_VertexPaint')
if mat is None:
    mat = bpy.data.materials.new('Inkstorm_Landmark_VertexPaint')
    mat.use_nodes = True
    mat.diffuse_color = (.82, .22, .11, 1)
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = .86
    colour_node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
    colour_node.layer_name = 'Color'
    mat.node_tree.links.new(colour_node.outputs['Color'], bsdf.inputs['Base Color'])

def begin():
    return {'verts': [], 'faces': [], 'colors': []}

def part(m, verts, faces, color):
    offset = len(m['verts'])
    m['verts'].extend(verts)
    for i, face in enumerate(faces):
        m['faces'].append(tuple(offset + v for v in face))
        shade = (1.0, .83, .94, .77, .88, 1.04)[i % 6]
        m['colors'].append(tuple(min(1, channel * shade) for channel in PALETTE[color]))

def box(m, center, size, color):
    x, y, z = center
    w, d, h = (v * .5 for v in size)
    verts = [(x-w,y-d,z-h),(x+w,y-d,z-h),(x+w,y+d,z-h),(x-w,y+d,z-h),
             (x-w,y-d,z+h),(x+w,y-d,z+h),(x+w,y+d,z+h),(x-w,y+d,z+h)]
    part(m, verts, [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)], color)

def tube(m, a, b, radius, color, sides=12, end_radius=None):
    axis = tuple(b[i] - a[i] for i in range(3))
    length = math.sqrt(sum(v*v for v in axis))
    n = tuple(v / length for v in axis)
    reference = (0,0,1) if abs(n[2]) < .95 else (0,1,0)
    u = (n[1]*reference[2]-n[2]*reference[1], n[2]*reference[0]-n[0]*reference[2], n[0]*reference[1]-n[1]*reference[0])
    ul = math.sqrt(sum(v*v for v in u))
    u = tuple(v / ul for v in u)
    v = (n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0])
    verts = []
    for origin, r in [(a,radius),(b,radius if end_radius is None else end_radius)]:
        for i in range(sides):
            angle = math.tau * i / sides + math.pi / 4
            verts.append(tuple(origin[k] + r*(u[k]*math.cos(angle)+v[k]*math.sin(angle)) for k in range(3)))
    faces = [tuple(reversed(range(sides))),tuple(range(sides,sides*2))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    part(m, verts, faces, color)

def beam(m, a, b, width, color='steel'):
    tube(m,a,b,width*.71,color,4)

def flag(m, x, y, z, width, height, color):
    verts = []
    for i in range(7):
        wave = math.sin(i * 1.8) * .6
        verts.extend([(x+width*i/6,y+wave,z),(x+width*i/6,y+wave,z-height*(1-.07*i))])
    part(m,verts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(6)],color)

def export_asset(name, m):
    # Names are owned by this source. Re-running updates only these assets.
    existing = scene.objects.get(name)
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)
    mesh = bpy.data.meshes.new(name + '-mesh')
    mesh.from_pydata(m['verts'], [], m['faces'])
    mesh.update()
    mesh.materials.append(mat)
    attribute = mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for polygon, color in zip(mesh.polygons,m['colors']):
        for loop in polygon.loop_indices:
            attribute.data[loop].color = (*color,1)
    mesh.color_attributes.active_color = attribute
    mesh.calc_loop_triangles()
    obj = bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(obj)
    obj['inkstorm_source'] = 'build_landmarks.py'
    obj['front_axis'] = '-Y'
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/assets/inkstorm/'+name+'.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'name':name,'dimensionsXYZ':[round(v,2) for v in obj.dimensions],'triangles':len(mesh.loop_triangles),'vertices':len(mesh.vertices),'origin':tuple(obj.location)})
    return obj

# Three garages, a cantilever awning, stepped bleachers and race banners.
pit = begin()
box(pit,(0,9,1.6),(142,47,3.2),'cobalt')
box(pit,(0,17,11),(139,3,20),'ink')
for x in [-47,0,47]:
    box(pit,(x,0,2),(43,30,1),'steel')
    for side in [-1,1]:
        box(pit,(x+side*20,-1,10),(3,34,18),'coral')
        box(pit,(x+side*20,-18,10),(3.4,1,18),'cream')
    box(pit,(x,-1,20),(44,35,3),'cobalt')
    box(pit,(x,-18.5,19),(39,1,3),'cream')
    box(pit,(x,15.1,10),(34,.6,13),'steel')
    for rib in [-12,-6,0,6,12]:
        box(pit,(x+rib,14.6,10),(.65,.7,13),'cobalt')
    for lamp in [-12,12]:
        box(pit,(x+lamp,-19.3,18.8),(4,.5,.8),'cyan')
    # Small service lockers and exposed hoses create recognisable pit activity.
    box(pit,(x+13,7,6),(5,7,8),'coral')
    box(pit,(x+13,3.3,7),(3.6,.4,3),'ink')
    tube(pit,(x+13,4,9),(x+13,-7,9),.45,'cream',8)
    tube(pit,(x+13,-7,9),(x+13,-7,4),.45,'cream',8)
    for z,y in [(23,8),(26,13),(29,18),(32,23),(35,28)]:
        box(pit,(x,y,z),(42,4.3,1.5),'cream')
        for seatx in [-17,-11,-5,1,7,13,19]:
            box(pit,(x+seatx,y+.5,z+1),(3.7,2.4,.6),'coral' if seatx<3 else 'cobalt')
    for y in [9,27]:
        beam(pit,(x-18,y,2),(x-18,y,34),1.1)
        beam(pit,(x+18,y,2),(x+18,y,34),1.1)
    beam(pit,(x-19,30,35),(x+19,30,35),.8,'steel')
    # Triangular profile on awning makes a readable stretched-fabric silhouette.
    part(pit,[(x-22,-18,22),(x+22,-18,22),(x+22,-28,19),(x-22,-28,19)],[(0,1,2,3)],'coral')
    beam(pit,(x-21,-27,2),(x-21,-27,19),.7,'cream')
    beam(pit,(x+21,-27,2),(x+21,-27,19),.7,'cream')
for x in [-69,-24,24,69]:
    beam(pit,(x,30,1),(x,30,47),.7,'cream')
    flag(pit,x,30,46,10,9,'coral' if x<0 else 'cobalt')
for x in range(-62,67,8):
    box(pit,(x,-14.8,2.4),(4,1.2,.4),'cream')
export_asset('pit-complex',pit)

# Parallel supply pipes, faceted tank masses, flanges and a scaffold catwalk.
pipes = begin()
box(pipes,(0,3,2),(94,40,4),'cobalt')
for x,z,r in [(-27,34,11),(23,43,14)]:
    tube(pipes,(x,8,5),(x,8,z),r,'coral',16)
    tube(pipes,(x,8,z),(x,8,z+5),r,'cream',16,r*.62)
    tube(pipes,(x,8,z+5),(x,8,z+8),r*.25,'steel',12)
    for height in [7,18,z-2]:
        tube(pipes,(x,8,height-.65),(x,8,height+.65),r+1,'cobalt',16)
    box(pipes,(x,-r+7,24),(4,1,9),'cream')
    box(pipes,(x,-r+6.4,24),(2,.35,6),'cyan')
for y,z,r in [(-10,8,2.4),(-13,15,2.1),(-9,22,1.7)]:
    tube(pipes,(-46,y,z),(46,y,z),r,'cream',12)
    for x in [-38,-21,-3,15,34]:
        tube(pipes,(x-.8,y,z),(x+.8,y,z),r+1,'cobalt',12)
        for angle in range(0,360,90):
            yy=y+math.sin(math.radians(angle))*(r+1)
            zz=z+math.cos(math.radians(angle))*(r+1)
            tube(pipes,(x-1,yy,zz),(x+1,yy,zz),.3,'coral',6)
    tube(pipes,(40,y,z),(40,y,31),r,'coral',12)
for x in [-41,-5,39]:
    for y in [-18,20]:
        beam(pipes,(x,y,1),(x,y,29),1.3)
    beam(pipes,(x,-18,28),(x,20,28),1.4,'cream')
for a,b in [(-41,-5),(-5,39)]:
    for y in [-18,20]:
        beam(pipes,(a,y,4),(b,y,26),.8)
        beam(pipes,(b,y,4),(a,y,26),.8)
box(pipes,(0,-17,29),(86,5,1),'cobalt')
for x in range(-40,41,8):
    beam(pipes,(x,-19,29),(x,-19,33),.45,'cream')
beam(pipes,(-42,-19,33),(42,-19,33),.5,'cream')
for z in range(5,30,3):
    beam(pipes,(-44,-20,z),(-40,-20,z),.35,'cream')
for x in [-44,-40]:
    beam(pipes,(x,-20,3),(x,-20,31),.4,'coral')
export_asset('pipe-bank',pipes)

# Tall finish beacon. Split fins and a checkerboard distinguish the finish line.
tower = begin()
box(tower,(0,0,2.5),(25,23,5),'cobalt')
for x in [-8,8]:
    for y in [-7,7]:
        beam(tower,(x,y,3),(x,y,82),1.9,'steel')
for z in [12,26,40,54,68,82]:
    box(tower,(0,0,z),(20,18,1.8),'cream')
for bottom in [5,19,33,47,61]:
    for y in [-7,7]:
        beam(tower,(-8,y,bottom),(8,y,bottom+18),1.2,'coral')
        beam(tower,(8,y,bottom),(-8,y,bottom+18),.85,'cobalt')
    for x in [-8,8]:
        beam(tower,(x,-7,bottom),(x,7,bottom+18),.8,'steel')
box(tower,(0,0,59),(13,12,28),'cobalt')
box(tower,(0,-7,64),(12,.8,24),'cream')
for x in [-4.5,-1.5,1.5,4.5]:
    for z in [54,57,60,63,66,69,72]:
        if (int((x+4.5)/3)+int((z-54)/3))%2==0:
            box(tower,(x,-7.5,z),(3,.3,3),'ink')
for side in [-1,1]:
    box(tower,(side*7,0,86),(3,11,25),'coral')
    box(tower,(side*7,-6,86),(1.8,.6,20),'cream')
box(tower,(0,0,92),(8,8,10),'ink')
for z in [88,92,96]:
    box(tower,(0,0,z),(10,10,1.5),'cyan')
tube(tower,(0,0,96),(0,0,113),.8,'cream',8)
beam(tower,(-8,0,101),(20,0,101),.8,'cream')
flag(tower,9,0,100,12,28,'coral')
for z in [76,83,90]:
    box(tower,(16,-.65,z),(8,.25,1.6),'cream')
export_asset('finish-tower',tower)

# Existing gantry legs extend under uneven track banks, without raising its deck.
gantry = scene.objects.get('foundry-gantry')
if gantry and not gantry.get('inkstorm_buried_feet'):
    for vertex in gantry.data.vertices:
        if vertex.co.z < 4.1:
            vertex.co.z -= 25
    gantry.data.update()
    gantry['inkstorm_buried_feet'] = True
if gantry:
    bpy.ops.object.select_all(action='DESELECT')
    gantry.select_set(True)
    bpy.context.view_layer.objects.active = gantry
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/assets/inkstorm/foundry-gantry.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'name':'foundry-gantry','baseZ':min(v.co.z for v in gantry.data.vertices),'topZ':max(v.co.z for v in gantry.data.vertices)})
