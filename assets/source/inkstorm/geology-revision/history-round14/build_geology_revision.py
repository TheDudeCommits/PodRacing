"""Original Inkstorm canyon buttress, geology revision 14.

Run this literal source through Blender MCP. Only the owned Inkstorm World Kit
receives new datablocks; the active user scene and selection are restored. No
old object, source file, scene or material is deleted or modified. Raw export is
staged here; build_geology_revision.mjs validates, optimizes and publishes it.

The prior sculpture's periodic perimeter ledges are deliberately absent:
irregular vertical fracture planes, a deep split crown, two local alcoves,
asymmetric fallen slabs and broad vertex-painted mineral faces define the form.
"""
import bpy, math, json
from mathutils import Vector

ROOT = '/Users/amir/Projects/PodRacing'
SOURCE = ROOT + '/assets/source/inkstorm/geology-revision'

def noise(seed):
    value = math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return value - math.floor(value)

def smooth(a, b, x):
    t = min(1, max(0, (x-a)/(b-a)))
    return t*t*(3-2*t)

vertices, faces, paint_keys = [], [], []

def vertex(point):
    vertices.append(tuple(point))
    return len(vertices)-1

def triangle(a, b, c, key=0):
    faces.append((a, b, c))
    paint_keys.append(key)

def painted_quad(a, b, c, d, key, detail=2):
    """Split a large stone plane into irregular paint patches, not ledge rings.

    Interior vertices stay on the bilinear plane, so the broad fracture normal
    remains readable. Jittered grid placement avoids a regular checkerboard.
    """
    corners = [Vector(vertices[i]) for i in (a,b,c,d)]
    grid=[]
    for row in range(detail+1):
        line=[]
        for col in range(detail+1):
            u=col/detail; v=row/detail
            if 0<col<detail: u += (noise(key+col*11+row*17)-.5)*.24/detail
            if 0<row<detail: v += (noise(key+col*13+row*19)-.5)*.24/detail
            p=corners[0]*(1-u)*(1-v)+corners[1]*u*(1-v)+corners[2]*u*v+corners[3]*(1-u)*v
            line.append(vertex(p))
        grid.append(line)
    for row in range(detail):
        for col in range(detail):
            aa=grid[row][col]; bb=grid[row][col+1]; cc=grid[row+1][col+1]; dd=grid[row+1][col]
            if noise(key+row*7+col)>.46:
                triangle(aa,bb,dd,key); triangle(bb,cc,dd,key+.35)
            else:
                triangle(aa,bb,cc,key); triangle(aa,cc,dd,key+.35)

# Uneven front/back fracture traces. The narrow recesses run primarily upward;
# height divisions tilt independently so no horizontal tier encircles the mass.
xs=[-35,-31,-24,-18,-13,-8,-3,2,7,13,21,29,35]
front=[-24,-35,-39,-35,-23,-30,-23,-18,-28,-37,-29,-33,-21]
back=[21,31,38,33,36,27,31,26,36,39,30,26,17]
crown=[58,92,118,109,84,63,52,78,99,109,89,68,50]
fractions=[0,.08,.23,.36,.44,.63,.76,.85,1]
walls=[]
for side, depth in enumerate((front,back)):
    rows=[]
    for row,t in enumerate(fractions):
        line=[]
        for i,x in enumerate(xs):
            h=crown[i]*(.75+.035*noise(i+73) if side else .85+.04*noise(i+19))
            z=h*t
            if row not in (0,len(fractions)-1): z += (noise(i*7+row*21+side*41)-.5)*6.8
            taper=1-.25*t+.045*math.sin(t*3.3+i*.81)
            xx=x*taper+2.3*t*t+3.5*math.sin(t*3.8+i*.68)*math.sin(math.pi*t)+1.2*math.sin(i*1.3)*t
            yy=depth[i]*(1-.17*t)+3.4*math.sin(i*.7+t*2.4)*t+1.8*math.sin(i*1.9+t*4.2)*math.sin(math.pi*t)
            if side==0:
                # Only two local alcoves. Their tapered shoulders never wrap
                # around the mass or form repeated shelves at common heights.
                alcove_a=7.1*math.exp(-((x+21)/8.5)**4)*(smooth(21,30,z)-smooth(39,45,z))
                alcove_b=4.3*math.exp(-((x-21)/7.0)**4)*(smooth(57,65,z)-smooth(71,79,z))
                yy += alcove_a+alcove_b
            line.append(vertex((xx,yy,max(0,z))))
        rows.append(line)
    for row in range(len(rows)-1):
        for i in range(len(xs)-1):
            a,b,c,d=rows[row][i],rows[row][i+1],rows[row+1][i+1],rows[row+1][i]
            if side: a,b,c,d=b,a,d,c
            painted_quad(a,b,c,d,17+i*9+row*.7+side*61,2)
    walls.append(rows)

# Crown is a broken ribbon of intersecting slanted planes. The center trough is
# tens of metres below the two unequal peaks, rather than a flat cap on a tube.
top=[]
for depth_row,v in enumerate((0,.24,.61,1)):
    line=[]
    for i in range(len(xs)):
        f=Vector(vertices[walls[0][-1][i]]); b=Vector(vertices[walls[1][-1][i]])
        p=f.lerp(b,v)
        if depth_row in (1,2):
            p.z = crown[i]*(.98+.08*noise(i*3+depth_row))
            p.x += (noise(i*5+depth_row)-.5)*2.1
        line.append(vertex(p))
    top.append(line)
for row in range(len(top)-1):
    for i in range(len(xs)-1):
        painted_quad(top[row][i],top[row][i+1],top[row+1][i+1],top[row+1][i],120+i*3+row*.4,2)
for edge in (0,len(xs)-1):
    for row in range(len(fractions)-1):
        a,b,c,d=walls[0][row][edge],walls[1][row][edge],walls[1][row+1][edge],walls[0][row+1][edge]
        if edge==0: a,b,c,d=b,a,d,c
        painted_quad(a,b,c,d,170+edge+row*.83,2)
for i in range(len(xs)-1):
    painted_quad(walls[1][0][i],walls[1][0][i+1],walls[0][0][i+1],walls[0][0][i],210+i,1)

def talus(center,dimensions,seed,angle):
    """A fallen fracture plate with a bevel and asymmetric split upper face."""
    outline=[(-.91,-.63),(-.4,-1),(.62,-.86),(1,-.18),(.78,.76),(-.24,1),(-1,.22)]
    rings=[]
    for row,(height,scale) in enumerate(((0,.75),(.18,1),(1,.58+.17*noise(seed)))):
        line=[]
        for i,(x,y) in enumerate(outline):
            xx=x*dimensions[0]*.5*scale+.12*height*dimensions[0]
            yy=y*dimensions[1]*.5*scale
            zz=dimensions[2]*(height*(.70+.30*noise(seed+i*7)) if row==2 else height)
            line.append(vertex((center[0]+xx*math.cos(angle)-yy*math.sin(angle),center[1]+xx*math.sin(angle)+yy*math.cos(angle),center[2]+zz)))
        rings.append(line)
    for row in range(2):
        for i in range(7):
            j=(i+1)%7
            triangle(rings[row][i],rings[row][j],rings[row+1][j],seed+i)
            triangle(rings[row][i],rings[row+1][j],rings[row+1][i],seed+i+.1)
    peak=vertex(tuple(sum(vertices[index][j] for index in rings[-1])/7 for j in range(3)))
    for i in range(7): triangle(rings[-1][i],rings[-1][(i+1)%7],peak,seed+i)
    for i in range(1,6): triangle(rings[0][0],rings[0][i+1],rings[0][i],seed)

# Three asymmetric groups of debris, including a few large fallen sheets; no
# uniform collar or evenly spaced pebbles surrounds the sculpture.
for center,size,seed,angle in [((-25,-39,0),(22,17,15),301,.4),((18,-39,0),(20,11,10),337,-.7),((-7,-44,0),(14,9,5),357,.1),((29,17,0),(16,18,13),377,.7),((-25,-30,13),(18,14,29),381,.2),((20,-28,27),(13,11,24),389,-.6)]:
    talus(center,size,seed,angle)
for i in range(30):
    group=i%3
    if group==0: cx,cy=-26,-39
    elif group==1: cx,cy=19,-38
    else: cx,cy=30,14
    x=cx+(noise(i*13+21)-.5)*23; y=cy+(noise(i*11+71)-.5)*23
    size=2+8*noise(i*7+42)**2
    talus((x,y,0),(size,size*(.48+.55*noise(i+5)),size*(.3+.55*noise(i+17))),400+i,noise(i+83)*math.tau)

# Ground-centered Blender XYZ -> glTF X/Y/Z bounds are exactly
# (-40,0,-50)..(40,120,50). Normalize the completed sculpture, including talus.
minimum=[min(v[i] for v in vertices) for i in range(3)]
maximum=[max(v[i] for v in vertices) for i in range(3)]
span=(80,100,120)
offset=[(minimum[i]+maximum[i])*.5 if i<2 else minimum[i] for i in range(3)]
vertices=[tuple((v[i]-offset[i])*span[i]/(maximum[i]-minimum[i]) for i in range(3)) for v in vertices]

def stone_paint(point,normal,key):
    x,y,z=point
    # Directional mineral faces are painted independently of the runtime sun.
    # Low-amplitude mottling adds brush variation without horizontal striping.
    mineral=.5+.5*math.sin(x*.19+z*.019+math.sin(z*.045)*.9)
    stain=.5+.5*math.sin(x*.73+y*.27+z*.043)
    brush=(noise(key*2.31)-.5)*.020
    base=(.60+.12*mineral,.205+.10*mineral,.078+.040*mineral)
    upward=max(0,normal.z)
    crevice=max(0,min(1,(normal.x*.5-normal.y*.15)-.25))
    shade=1-.2*crevice
    return tuple(max(0,min(1,value*shade+brush+(upward*.040 if i==0 else upward*.025 if i==1 else upward*.01)-(stain*.022 if i<2 else 0))) for i,value in enumerate(base))+(1,)

original_scene=bpy.context.window.scene
original_selection=list(bpy.context.selected_objects)
original_active=bpy.context.view_layer.objects.active
scene=bpy.data.scenes.get('Inkstorm World Kit')
if scene is None: raise RuntimeError('Owned Inkstorm World Kit scene is missing')
before_scenes={s.name:[o.name for o in s.objects] for s in bpy.data.scenes if s!=scene}
try:
    bpy.context.window.scene=scene
    material=bpy.data.materials.new('Inkstorm_Geology_R14')
    material.use_nodes=True
    material.diffuse_color=(.65,.24,.11,1)
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value=.97
    vertex_color=material.node_tree.nodes.new('ShaderNodeVertexColor')
    vertex_color.layer_name='Color'
    material.node_tree.links.new(vertex_color.outputs['Color'],shader.inputs['Base Color'])
    data=bpy.data.meshes.new('canyon-buttress-geology-r14-mesh')
    data.from_pydata(vertices,[],faces)
    data.materials.append(material)
    data.update()
    # Build consistent outward normals for each disconnected sculpted piece.
    # The graph is authored with winding; zero-area triangles are rejected.
    color=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for polygon,key in zip(data.polygons,paint_keys):
        if polygon.area<1e-8: raise RuntimeError('Degenerate authored face')
        polygon.use_smooth=False
        for loop in polygon.loop_indices:
            point=data.vertices[data.loops[loop].vertex_index].co
            color.data[loop].color=stone_paint(point,polygon.normal,key)
    data.color_attributes.active_color=color
    data.calc_loop_triangles()
    if len(data.loop_triangles)>8000: raise RuntimeError('High geometry exceeds 8000 triangles')
    obj=bpy.data.objects.new('canyon-buttress-geology-r14',data)
    obj['inkstorm_source']='build_geology_revision.py'
    obj['original_art']=True
    obj['revision_note']='Original fractured geology; no downloaded model or source reuse'
    scene.collection.objects.link(obj)
    for selected in bpy.context.selected_objects: selected.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.context.view_layer.update()
    raw_path=SOURCE+'/raw-canyon-buttress.glb'
    bpy.ops.export_scene.gltf(filepath=raw_path,export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    report={'source':'Original Blender geometry authored through Blender MCP','sourceScript':'build_geology_revision.py','object':obj.name,'triangles':len(data.loop_triangles),'rawVertices':len(data.vertices),'blenderBounds':{'min':[min(v.co[i] for v in data.vertices) for i in range(3)],'max':[max(v.co[i] for v in data.vertices) for i in range(3)]},'previousObjectsPreserved':True,'originalActiveScene':original_scene.name,'ownedScene':scene.name,'geometryNotes':['No periodic perimeter shelves','Two localized front alcoves','Tall irregular fracture planes','Deep unequal split crown','34 clustered talus plates plus 2 embedded fracture shoulders','One corner-painted material']}
    # Retain the authored object for future editing without overlaying the old
    # scene presentation. The original sculpture remains completely unchanged.
    obj.hide_render=True
    obj.hide_set(True)
    print(json.dumps(report,indent=2))
finally:
    bpy.context.window.scene=original_scene
    for selected in bpy.context.selected_objects: selected.select_set(False)
    for selected in original_selection:
        if selected.name in original_scene.objects: selected.select_set(True)
    bpy.context.view_layer.objects.active=original_active
    after_scenes={s.name:[o.name for o in s.objects] for s in bpy.data.scenes if s!=scene}
    assert before_scenes==after_scenes, 'An unrelated scene changed'
    assert bpy.context.window.scene==original_scene
