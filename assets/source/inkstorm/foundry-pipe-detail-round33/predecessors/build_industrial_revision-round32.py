"""Original Inkstorm repaired industrial kit, authored through Blender MCP.

Only three owned meshes in Inkstorm World Kit are replaced. Coordinates remain
Blender X width, Y depth, Z up, front -Y, identity transform at the old origin.
Existing export bounds are exact, including the gantry's buried foot geometry.
All components join into one vertex-painted primitive. No external model data.
"""
import bpy, math
from mathutils import Vector

ROOT = '/Users/amir/Projects/PodRacing'
BUILD_NAMES = ['foundry-gantry', 'pit-complex', 'pipe-bank']
original_scene = bpy.context.window.scene
scene = bpy.data.scenes['Inkstorm World Kit']
bpy.context.window.scene = scene
PAINT = {
    'ink': (.040,.045,.085), 'shadow': (.105,.095,.165),
    'cobalt': (.075,.18,.29), 'steel': (.19,.25,.29),
    'coral': (.80,.225,.10), 'rust': (.42,.095,.055),
    'cream': (.86,.68,.40), 'pale': (.96,.83,.59),
    'cyan': (.10,.87,.79), 'warm': (1.0,.61,.16),
}
BOUNDS = {
 'foundry-gantry': [(-52,52),(-7,7),(-25,54.30417251586914)],
 'pit-complex': [(-71,79),(-28,32.5),(0,47)],
 'pipe-bank': [(-47,47),(-20.20081901550293,23),(0,51)],
}
material = bpy.data.materials.get('Inkstorm_Industrial_Revision_Paint')
if material is None:
    material = bpy.data.materials.new('Inkstorm_Industrial_Revision_Paint')
    material.use_nodes = True
    material.diffuse_color = (.8,.225,.1,1)
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .84
    paint = material.node_tree.nodes.new('ShaderNodeVertexColor')
    paint.layer_name = 'Color'
    material.node_tree.links.new(paint.outputs['Color'],shader.inputs['Base Color'])

def noise(n):
    f=math.sin(n*12.9898+78.233)*43758.5453
    return f-math.floor(f)

def new_mesh():
    return {'v':[],'f':[],'c':[],'s':[]}

def part(m, verts, faces, color, smooth=False, shade=True):
    offset=len(m['v']);m['v'].extend(verts)
    base=PAINT[color] if isinstance(color,str) else color
    for i,face in enumerate(faces):
        indices=tuple(offset+v for v in face)
        m['f'].append(indices);m['s'].append(smooth)
        a,b,c=[Vector(m['v'][k]) for k in indices[:3]]
        normal=(b-a).cross(c-a).normalized()
        value=(.66 if normal.z<-.5 else .91+.055*noise(offset+i)) if shade else 1
        m['c'].append(tuple(min(1,v*value) for v in base))

def box(m, center, size, color):
    x,y,z=center;w,d,h=[v*.5 for v in size]
    v=[(x-w,y-d,z-h),(x+w,y-d,z-h),(x+w,y+d,z-h),(x-w,y+d,z-h),
       (x-w,y-d,z+h),(x+w,y-d,z+h),(x+w,y+d,z+h),(x-w,y+d,z+h)]
    part(m,v,[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],color)

def tube(m,a,b,r,color,sides=12,r2=None):
    a=Vector(a);b=Vector(b);n=(b-a).normalized()
    u=n.cross(Vector((0,0,1)) if abs(n.z)<.95 else Vector((0,1,0))).normalized()
    v=n.cross(u);verts=[]
    for center,radius in [(a,r),(b,r if r2 is None else r2)]:
        for i in range(sides):
            angle=math.tau*i/sides
            verts.append(tuple(center+radius*(u*math.cos(angle)+v*math.sin(angle))))
    faces=[tuple(reversed(range(sides))),tuple(range(sides,sides*2))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    part(m,verts,faces,color,smooth=False)
    for i in range(len(m['s'])-sides,len(m['s'])):m['s'][i]=sides>=12

def beam(m,a,b,width,color='steel'):
    tube(m,a,b,width*.7071,color,4)

def curved_pipe(m,path,r,color,sides=12):
    # A continuous elbow sweep, not intersecting straight cylinders.
    verts=[];count=len(path)
    for j,p in enumerate(path):
        n=(Vector(path[min(count-1,j+1)])-Vector(path[max(0,j-1)])).normalized()
        ref=Vector((0,1,0)) if abs(n.y)<.93 else Vector((0,0,1))
        u=n.cross(ref).normalized();v=n.cross(u)
        for k in range(sides):
            t=math.tau*k/sides
            verts.append(tuple(Vector(p)+r*(math.cos(t)*u+math.sin(t)*v)))
    faces=[]
    for j in range(count-1):
        for k in range(sides):faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
    part(m,verts,faces,color,True)
    part(m,verts,[tuple(reversed(range(sides))),tuple(range((count-1)*sides,count*sides))],'ink')

def flange(m,p,axis,r,color='cobalt'):
    p=Vector(p);n=Vector(axis).normalized()
    tube(m,tuple(p-n*.45),tuple(p+n*.45),r,color,12)
    u=n.cross(Vector((0,0,1)) if abs(n.z)<.93 else Vector((0,1,0))).normalized();v=n.cross(u)
    for i in range(6):
        q=p+(u*math.cos(i*math.tau/6)+v*math.sin(i*math.tau/6))*r*.80
        tube(m,tuple(q-n*.58),tuple(q+n*.58),.20,'cream',6)

def rail(m,a,b,height=1.6):
    a=Vector(a);b=Vector(b)
    for z in [height*.5,height]:beam(m,tuple(a+Vector((0,0,z))),tuple(b+Vector((0,0,z))),.15,'cream')
    count=max(2,int((b-a).length/3.5)+1)
    for i in range(count):
        p=a+(b-a)*i/(count-1)
        beam(m,tuple(p),tuple(p+Vector((0,0,height))),.18,'steel')

def chips(m,x,y,z,w,h,seed,count=12):
    # Small angular paint losses sit on front panels, with a rust substrate.
    for i in range(count):
        xx=x+(noise(seed+i*3)-.5)*w;zz=z+(noise(seed+i*7)-.5)*h
        ww=.16+noise(seed+i*5)*.6;hh=.10+noise(seed+i*11)*.38
        part(m,[(xx-ww,y,zz),(xx+ww,y,zz+.15*hh),(xx+.36*ww,y,zz+hh),(xx-.8*ww,y,zz+.7*hh)],[(0,1,2,3)],'rust' if i%3 else 'cream',shade=False)

def person(m,x,y,z,seed):
    # 1.8 m pit crew silhouettes: boots, bent arms, overalls and helmet.
    suit='cream' if seed%2 else 'coral'
    for s in [-1,1]:
        box(m,(x+s*.14,y-.035,z+.12),(.19,.35,.24),'ink')
        beam(m,(x+s*.14,y,z+.20),(x+s*.13,y,z+.83),.20,suit)
    box(m,(x,y,z+1.06),(.5,.30,.57),suit)
    tube(m,(x,y,z+1.43),(x,y,z+1.70),.21,'pale',8)
    box(m,(x,y-.19,z+1.59),(.32,.08,.12),'ink')
    beam(m,(x-.26,y,z+1.24),(x-.42,y-.12,z+.99),.15,suit)
    beam(m,(x+.26,y,z+1.24),(x+.42,y-.15,z+1.10),.15,suit)
    beam(m,(x+.42,y-.15,z+1.10),(x+.35,y-.47,z+1.11),.13,'ink')

def export_asset(name,m):
    bounds=BOUNDS[name]
    actual=[(min(v[i] for v in m['v']),max(v[i] for v in m['v'])) for i in range(3)]
    for i in range(3):
        assert abs(actual[i][0]-bounds[i][0])<.00001 and abs(actual[i][1]-bounds[i][1])<.00001,(name,i,actual[i],bounds[i])
    old=scene.objects.get(name)
    if old:
        oldmesh=old.data;bpy.data.objects.remove(old,do_unlink=True)
        if oldmesh.users==0:bpy.data.meshes.remove(oldmesh)
    mesh=bpy.data.meshes.new(name+'-industrial-revision');mesh.from_pydata(m['v'],[],m['f']);mesh.update()
    mesh.materials.append(material)
    attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for polygon,color,smooth in zip(mesh.polygons,m['c'],m['s']):
        polygon.use_smooth=smooth
        for li in polygon.loop_indices:attr.data[li].color=(*color,1)
    mesh.color_attributes.active_color=attr;mesh.calc_loop_triangles()
    assert len(mesh.loop_triangles)<=18000,(name,len(mesh.loop_triangles))
    obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj)
    obj['inkstorm_source']='build_industrial_revision.py';obj['front_axis']='-Y'
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/assets/inkstorm/'+name+'.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'name':name,'triangles':len(mesh.loop_triangles),'boundsBlender':actual,'one_mesh':True})
    return obj

def build_gantry():
    m=new_mesh()
    # Foot width fixes the exact corridor: all supports stay outside [-40,40].
    for side in [-1,1]:
        x=46*side
        box(m,(x,0,-11.5),(12,14,27),'shadow')
        box(m,(x,0,2),(11,13,4),'rust')
        box(m,(x,0,23),(4.8,5.4,42),'coral' if side<0 else 'cobalt')
        for z in [5,16,31,43]:
            box(m,(x,0,z),(8.3,8.6,1.1),'steel')
            for dx in [-2.8,2.8]:tube(m,(x+dx,-4.5,z),(x+dx,-4.8,z),.28,'cream',6)
        for y in [-3.5,3.5]:
            beam(m,(x-2.7,y,3),(x+2.7,y,43),.8,'steel')
        # Exposed supply line and repaired collar on the outer face.
        tube(m,(x+side*3.4,0,4),(x+side*3.4,0,42),.65,'cream',12)
        for z in [9,25,39]:flange(m,(x+side*3.4,0,z),(0,0,1),1.0)
        box(m,(x,-3.1,28),(4.4,.5,8),'steel');chips(m,x,-3.37,28,4,7,side+15,12)
        box(m,(x,-3.42,29),(2.5,.08,.35),'cyan')
    # Triangular span is open sky between chords; unequal machinery weights it.
    for y in [-3.6,3.6]:
        beam(m,(-47,y,44.5),(47,y,44.5),1.1,'ink')
        beam(m,(-47,y,50.9),(47,y,50.9),1.15,'cobalt')
        for i in range(12):
            x=-47+i*94/12;nx=-47+(i+1)*94/12
            beam(m,(x,y,44.6 if i%2==0 else 50.8),(nx,y,50.8 if i%2==0 else 44.6),.63,'coral' if i%3 else 'cream')
    for x in [-46,-31,-15,1,17,32,46]:
        beam(m,(x,-3.6,44.5),(x,3.6,44.5),.7)
        box(m,(x,-3.9,47.6),(2.2,.65,5.8),'cobalt')
        chips(m,x,-4.24,47.6,2,5,21+x,7)
    box(m,(0,1.8,50.2),(93,2.0,.30),'steel')
    rail(m,(-45,2.8,50.3),(45,2.8,50.3),1.25)
    for x in [-11,-5.5,0,5.5,11]:
        for y in [-1.5,1.5]:beam(m,(x,y,44.5),(x,y,41.5),.25,'steel')
        tube(m,(x,-.9,41.0),(x,-2.2,41.0),1.30,'ink',16)
        tube(m,(x,-2.21,41.0),(x,-2.45,41.0),1.05,'warm' if x<0 else 'cyan',16)
        flange(m,(x,-1.0,41.0),(0,1,0),1.40,'steel')
    box(m,(-37,0,48),(10.5,8,8),'cobalt')
    box(m,(-37,-4.1,48),(8.7,.2,5.7),'coral')
    chips(m,-37,-4.22,48,8,5,86,26)
    for x in [-40,-37.5,-35]:box(m,(x,-4.32,48),(1.8,.15,1.0),'ink')
    box(m,(32,0,47),(6.7,7,5.7),'coral');chips(m,32,-3.52,47,6,5,112,14)
    tube(m,(-37,0,52),(-37,0,54.30417251586914),.35,'cream',8)
    for x in [-22,22]:
        curved_pipe(m,[(x-4,-1,51.5),(x-2,-1,53),(x+1,-1,53),(x+4,-1,51.5)],.4,'rust',8)
    return export_asset('foundry-gantry',m)

def hangar(m,x,y,w,d,h,paint):
    # Faceted barrel-vault shell, open front, with contrasting interior and ribs.
    n=14;verts=[]
    for depth in [y-d*.5,y+d*.5]:
        for r in [1,.94]:
            for i in range(n+1):
                a=math.pi*i/n
                verts.append((x+math.cos(a)*w*.5*r,depth,2.2+math.sin(a)*h*r))
    ring=n+1
    for i in range(n):
        color=paint if i<5 or i>10 else 'cobalt'
        part(m,verts,[(i,2*ring+i,2*ring+i+1,i+1)],color)
        part(m,verts,[(ring+i,ring+i+1,3*ring+i+1,3*ring+i)],'shadow')
        part(m,verts,[(i,i+1,ring+i+1,ring+i)],'cream')
    # Solid rear wall makes the opening read as a usable shaded work bay.
    part(m,[(x-w*.47,y+d*.5,1),(x+w*.47,y+d*.5,1)]+[(x+math.cos(math.pi*i/n)*w*.47,y+d*.5,2.2+math.sin(math.pi*i/n)*h*.94) for i in range(n+1)], [tuple(range(n+3))],'ink')
    for yy in [y-d*.5-.12,y,y+d*.5]:
        for i in range(n):
            a=math.pi*i/n;b=math.pi*(i+1)/n
            beam(m,(x+math.cos(a)*w*.5,yy,2.2+math.sin(a)*h),(x+math.cos(b)*w*.5,yy,2.2+math.sin(b)*h),.35,'steel')
    for i in range(15):
        a=.18+noise(x+i*3)*2.75;aa=a+.025+noise(i)*.065
        yy=y-d*.4+noise(i*7+x)*d*.75;dy=.3+noise(i*9)*1.1
        part(m,[(x+math.cos(a)*(w*.5+.025),yy,2.23+math.sin(a)*h),(x+math.cos(aa)*(w*.5+.025),yy+.17,2.23+math.sin(aa)*h),(x+math.cos(aa)*(w*.5+.025),yy+dy,2.23+math.sin(aa)*h)],[(0,2,1)],'rust',shade=False)

def canopy(m,x,y,w,d,z,color):
    verts=[];nx=8;ny=5
    for j in range(ny+1):
        for i in range(nx+1):
            u=i/nx;v=j/ny
            verts.append((x+(u-.5)*w,y-v*d,z-2.5*v-2.2*math.sin(math.pi*u)*math.sin(math.pi*v)+.7*math.sin(u*10)*v))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i
            part(m,verts,[(a,a+nx+1,a+nx+2,a+1)],color if i<6 else 'cream')
    for side in [-1,1]:beam(m,(x+side*w*.5,y-d,1),(x+side*w*.5,y-d,z-2.5),.25,'cream')

def build_pit():
    m=new_mesh();box(m,(4,2.25,.5),(150,60.5,1),'shadow')
    for index,(x,w,h,d) in enumerate([(-47,40,17,32),(-5,34,14,30),(39,46,20,38)]):
        y=4 if index<2 else 7
        hangar(m,x,y,w,d,h,'coral' if index!=1 else 'cobalt')
        canopy(m,x-1,y-d*.5-.1,w*.84,10 if index<2 else 12,h*.85+2.2,'coral' if index==1 else 'cobalt')
        box(m,(x,y+d*.4,4),(w*.55,1.1,5.5),'steel')
        box(m,(x,y+d*.4-.61,5),(w*.42,.12,.7),'warm')
        for dx in [-w*.27,w*.27]:
            box(m,(x+dx,y+1,2.6),(4.6,3.5,3.2),'cobalt' if dx<0 else 'coral')
            box(m,(x+dx,y-.80,3.2),(3.6,.15,1.35),'ink')
            chips(m,x+dx,y-.9,3.2,3,1,42+index*20+dx,8)
            for yy in [y-2,y+3]:tube(m,(x+dx,yy,1.1),(x+dx,yy,2.5),.65,'cream',10)
        # Engine cradles, hoist rails and a mechanic working on each bay.
        box(m,(x,y,1.5),(9,8,1),'steel')
        for dx in [-2.1,2.1]:
            tube(m,(x+dx,y-3.5,3.3),(x+dx,y+3.5,3.3),1.3,'coral',14)
            flange(m,(x+dx,y-2.4,3.3),(0,1,0),1.65)
            tube(m,(x+dx,y-3.65,3.3),(x+dx,y-3.8,3.3),1.03,'ink',14)
            tube(m,(x+dx,y-3.81,3.3),(x+dx,y-3.85,3.3),.42,'cyan',12)
        for dx in [-7,7]:beam(m,(x+dx,y-1,1),(x+dx,y-1,10),.4)
        beam(m,(x-7,y-1,10),(x+7,y-1,10),.55,'cream')
        tube(m,(x+1,y-1,10),(x+1,y-1,5),.09,'ink',6)
        person(m,x+5,y-4,1,index);person(m,x-w*.32,y-6,1,index+1)
        for k in range(4):
            xx=x-w*.36+k*2.1
            box(m,(xx,y-d*.5-5,1.4),(1.6,1.6,.8),'cream' if k%2 else 'coral')
        for xx in [x-w*.47,x+w*.47]:
            tube(m,(xx,y-d*.5,1),(xx,y-d*.5,h+3),.18,'steel',8)
            beam(m,(xx,y-d*.5,h+3),(xx+(2 if xx<x else -2),y-d*.5,h+3),.22,'steel')
            box(m,(xx+(2 if xx<x else -2),y-d*.5,h+2.65),(.85,.8,.35),'warm')
    # Raised rear service walk and small asymmetric timing cabin.
    box(m,(-5,27,11),(125,7,.65),'steel');rail(m,(-66,30,11.4),(56,30,11.4))
    for x in [-60,-35,-11,16,43]:
        beam(m,(x,28,1),(x,28,11),.55,'cobalt')
        beam(m,(x,27,1),(x+5,27,11),.38,'rust')
    box(m,(59,21,20),(13,14,11),'cobalt')
    box(m,(59,13.85,21),(10,.2,4),'ink');box(m,(59,13.7,20.8),(8.5,.1,.25),'cyan')
    box(m,(59,21,26),(15,16,1),'coral');chips(m,59,13.68,23.5,10,1.8,51,17)
    for x in [53,65]:beam(m,(x,20,1),(x,20,14.5),.9,'steel')
    for x,z in [(-67,32),(70,47)]:
        tube(m,(x,30,1),(x,30,z),.20,'cream',8)
        verts=[]
        width=8 if x<0 else 9
        for i in range(7):
            xx=x+i*width/6;yy=30+.5*math.sin(i*1.3)
            verts.extend([(xx,yy,z-.3),(xx,yy,z-5+.2*i)])
        part(m,verts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(6)],'coral' if x<0 else 'cobalt')
    return export_asset('pit-complex',m)

def build_pipes():
    m=new_mesh();box(m,(0,1.399590492248535,.6),(94,43.20081901550293,1.2),'shadow')
    # Unequal tanks and a squat accumulator leave a stepped, serviceable skyline.
    for x,y,r,h in [(-27,7,10,32),(17,8,13,44),(37,11,6,22)]:
        tube(m,(x,y,1.2),(x,y,h-5),r,'coral',20)
        tube(m,(x,y,h-5),(x,y,h-2),r,'rust',20,r*.68)
        tube(m,(x,y,h-2),(x,y,h),r*.68,'cobalt',20,r*.25)
        for z in [4,12,h-7]:flange(m,(x,y,z),(0,0,1),r+.35,'cobalt')
        tube(m,(x,y,h),(x,y,h+3),r*.25,'steel',12)
        box(m,(x,y-r-.12,h*.55),(r*.65,.20,3.5),'cream')
        chips(m,x,y-r-.25,h*.55,r*.6,3,28+x,13)
        box(m,(x,y-r-.32,h*.55),(r*.4,.10,.3),'cyan')
        if h>40:tube(m,(x,y,h+3),(x,y,51),.26,'cream',8)
    # Large rising elbow, a low return elbow, and a narrower hanging service loop.
    path=[(-42,-9,7),(-33,-9,7),(-20,-9,7),(-8,-9,7)]
    path.extend([(-8+9*math.sin(math.pi*i/16),-9,16-9*math.cos(math.pi*i/16)) for i in range(1,9)])
    path.extend([(1,-9,23),(1,-9,31),(1,-9,38)])
    curved_pipe(m,path,3.0,'coral',16)
    for x in [-34,-17,-5]:flange(m,(x,-9,7),(1,0,0),3.55)
    for z in [21,33]:flange(m,(1,-9,z),(0,0,1),3.55)
    path=[(-38,-13,19),(-27,-13,19),(-16,-13,19)]
    path.extend([(-16+6*math.sin(math.pi*i/16),-13,13+6*math.cos(math.pi*i/16)) for i in range(1,9)])
    path.extend([(-10,-13,7),(-10,-13,3)])
    curved_pipe(m,path,1.8,'cream',12)
    for x in [-31,-20]:flange(m,(x,-13,19),(1,0,0),2.4,'rust')
    path=[(8,-10,30),(12,-10,30),(17,-10,30),(24,-10,30),(31,-10,30)]
    path.extend([(31+6*math.sin(math.pi*i/16),-10,24+6*math.cos(math.pi*i/16)) for i in range(1,9)])
    path.extend([(37,-10,16),(37,-10,10)])
    curved_pipe(m,path,2.25,'coral',14)
    for x in [13,26]:flange(m,(x,-10,30),(1,0,0),2.85,'steel')
    # Short catwalks attached to the tanks; no repeated full-height box cage.
    for x,z,w in [(-27,24,28),(17,35,31),(35,13,18)]:
        box(m,(x,-6,z),(w,5,.6),'steel')
        rail(m,(x-w*.5,-8.4,z+.3),(x+w*.5,-8.4,z+.3))
        for dx in [-w*.34,w*.34]:
            beam(m,(x+dx,-4,z-7),(x+dx,-8,z),.44,'rust')
        tube(m,(x-3,-8,z+.3),(x-3,-8,z+4.3),.13,'steel',8)
        box(m,(x-3,-8,z+4.3),(1.2,.7,.6),'warm')
        for zz in range(3,int(z),2):beam(m,(x+w*.42,-8,zz),(x+w*.42+1.0,-8,zz),.15,'cream')
        for dx in [w*.42,w*.42+1]:beam(m,(x+dx,-8,2),(x+dx,-8,z+1),.16,'steel')
    # Valve mechanisms, inspection cabinet and ground-scale service crew.
    for x,z in [(-35,7),(1,23),(25,30)]:
        tube(m,(x,-12,z),(x,-14,z),.4,'steel',8)
        for i in range(10):
            a=math.tau*i/10;b=math.tau*(i+1)/10
            beam(m,(x+math.cos(a)*1.15,-14,z+math.sin(a)*1.15),(x+math.cos(b)*1.15,-14,z+math.sin(b)*1.15),.16,'warm')
        for a in [0,math.pi*.5]:beam(m,(x-math.cos(a),-14,z-math.sin(a)),(x+math.cos(a),-14,z+math.sin(a)),.13,'steel')
    box(m,(25,-14,3.6),(6,4,4.8),'cobalt');box(m,(25,-16.1,4.4),(4.4,.2,1.3),'ink')
    box(m,(25,-16.23,4.6),(3,.08,.2),'cyan');chips(m,25,-16.24,2.5,5,1.5,198,13)
    person(m,19,-15,1.2,4);person(m,-36,-16,1.2,5)
    for x in [-41,-38,-33]:tube(m,(x,-15,1.2),(x,-15,3),.66,'cream',10)
    return export_asset('pipe-bank',m)

try:
    for name in BUILD_NAMES:
        if name=='foundry-gantry':build_gantry()
        elif name=='pit-complex':build_pit()
        elif name=='pipe-bank':build_pipes()
finally:
    bpy.context.window.scene=original_scene
