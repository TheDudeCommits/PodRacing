"""Original layered pit district; literal source run through Blender MCP.
Blender X frontage, Y depth, Z up; front -Y. One painted mesh/material.
Only new objects are created in Inkstorm World Kit; original scene is restored.
"""
import bpy, math
from mathutils import Vector
ROOT='/Users/amir/Projects/PodRacing'
original_scene=bpy.context.window.scene
scene=bpy.data.scenes['Inkstorm World Kit']
PAINT={'ink':(.045,.04,.065),'shadow':(.125,.10,.15),'cobalt':(.095,.21,.32),'steel':(.25,.29,.31),'coral':(.80,.255,.12),'rust':(.43,.13,.065),'cream':(.84,.65,.40),'pale':(.96,.82,.61),'cyan':(.10,.87,.79),'warm':(1.,.61,.16)}
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

def crate(m,x,y,z,w,d,h,color):
    box(m,(x,y,z+h*.5),(w,d,h),color)
    for xx in [x-w*.4,x+w*.4]:
        box(m,(xx,y-d*.51,z+h*.5),(.14,.08,h*.88),'cream')
    box(m,(x,y-d*.52,z+h*.58),(w*.46,.08,h*.19),'ink')
    chips(m,x,y-d*.53,z+h*.45,w*.9,h*.8,int(x+y+40),5)

def cloth(m,x,y,w,d,height,seed,color):
    nx=12;ny=7;verts=[]
    for j in range(ny+1):
        for i in range(nx+1):
            u=i/nx;v=j/ny
            # High fixed rear edge, lower corner poles and deeply tensioned belly.
            z=height-2.2*v-2.4*math.sin(math.pi*u)*math.sin(math.pi*v)+.45*math.sin(u*15+seed)*v
            verts.append((x+(u-.5)*w,y-v*d,z))
    for j in range(ny):
        for i in range(nx):
            a=j*(nx+1)+i
            paint=color if (i+seed)%7 else 'cream'
            if j>ny-3 and noise(i*3+j*7+seed)>.77:paint='rust'
            part(m,verts,[(a,a+1,a+nx+2,a+nx+1)],paint,False)
            part(m,verts,[(a+nx+1,a+nx+2,a+1,a)],tuple(v*.45 for v in PAINT[paint]),False)
    for side in [-1,1]:
        xx=x+side*w*.5
        beam(m,(xx,y-d,0),(xx,y-d,height-2.0),.30,'steel')
        # Guy ropes and pinned feet stay within the frontage footprint.
        beam(m,(xx,y-d,height-2.0),(xx-side*1.7,y-d-1.5,.2),.05,'cream')
        box(m,(xx,y-d,.16),(.9,.8,.32),'rust')
    for i in range(nx):
        a=i;b=i+1
        beam(m,verts[a],verts[b],.13,'steel')
        a=ny*(nx+1)+i;b=a+1
        beam(m,verts[a],verts[b],.07,'cream')

def facade(m,x,width,back,height,index):
    # Back and side skins surround a real open-front repair bay.
    color='coral' if index!=1 else 'cobalt'
    box(m,(x,back,height*.5),(width,.9,height),color)
    box(m,(x-width*.5+.35,back-6,height*.5),(.7,12,height),'cobalt')
    box(m,(x+width*.5-.35,back-6,height*.5),(.7,12,height*.78),'rust')
    box(m,(x,back-6,.2),(width,12,.4),'cream')
    # Unequal panel layers, shutters, cool recesses and service markings.
    for k in range(3):
        xx=x+(k-1)*width*.27
        box(m,(xx,back-.5,height*.56),(width*.24,.25,height*.67),'shadow')
        if k!=1:
            for row in range(6):box(m,(xx,back-.67,height*.29+row*height*.092),(width*.23,.15,.18),'steel')
        else:
            box(m,(xx,back-.70,height*.7),(width*.17,.12,.45),'warm')
        chips(m,xx,back-.81,height*.4,width*.24,height*.8,index*90+k*11,15)
    for xx in [x-width*.48,x+width*.48]:
        beam(m,(xx,back-11,0),(xx,back-11,height+1),.55,'steel')
        beam(m,(xx,back-11,height),(xx,back,height),.45,'cream')
        beam(m,(xx,back-10,height-4),(xx,back-7,height),.22,'rust')
    beam(m,(x-width*.5,back-11,height),(x+width*.5,back-11,height),.65,'cobalt')
    # An irregular folded roof and supported ledge give mass without a solid box.
    verts=[(x-width*.53,back-12,height+.3),(x+width*.53,back-12,height+.3),(x+width*.54,back+1,height+2),(x,back+1,height+3.4),(x-width*.54,back+1,height+1.5)]
    part(m,verts,[(0,1,2,3,4)],'cobalt' if index!=1 else 'coral')
    part(m,verts,[(4,3,2,1,0)],'shadow')
    for xx in [x-width*.28,x,x+width*.28]:beam(m,(xx,back-12,height+.45),(xx,back+.7,height+2.4),.18,'steel')
    cloth(m,x-.4,back-10,width*.93,11 if index!=1 else 14,height-1,index*11,'coral' if index==1 else 'cobalt')
    # Small suspended service signage has layered faces, exposed frame and glyphs.
    sx=x-width*.24
    for xx in [sx-2.7,sx+2.7]:beam(m,(xx,back-10,height),(xx,back-10,height-3.2),.09,'ink')
    box(m,(sx,back-10,height-3.0),(6.6,.7,2.6),'steel')
    box(m,(sx,back-10.4,height-3.0),(5.9,.14,2.0),'coral' if index==1 else 'cobalt')
    for k in range(5):box(m,(sx-2+k,back-10.5,height-3.0),(.35,.06,.5+(k%3)*.35),'cream')
    chips(m,sx,back-10.56,height-3,5.8,1.9,index+39,11)
    # Service benches and stacked shipping cases, leaving a clear work aisle.
    for xx,yy in [(x-width*.32,back-4),(x+width*.3,back-8)]:
        crate(m,xx,yy,.4,3.4,2.7,2.1,'cobalt')
        crate(m,xx+.5,yy,2.5,2.3,2,1.3,'coral')
        for offset in [-1.2,1.2]:tube(m,(xx+offset,yy-2,.4),(xx+offset,yy-2,1.9),.5,'cream',10)
    box(m,(x+2,back-3,2.2),(6,2.6,.45),'steel')
    for xx in [x-.4,x+4.4]:beam(m,(xx,back-3,.4),(xx,back-3,2.2),.2,'rust')
    # Supported spare engine with hollow turbine throat, uneven repair panels.
    ex=x-1;ey=back-7
    for yy in [ey-2.4,ey+2.4]:beam(m,(ex-2.5,yy,.4),(ex+2.5,yy,.4),.45,'steel')
    tube(m,(ex,ey-3,2.5),(ex,ey+3,2.5),1.6,'coral',16)
    for yy in [ey-2.6,ey+.3,ey+2.5]:flange(m,(ex,yy,2.5),(0,1,0),1.82,'cobalt')
    tube(m,(ex,ey-3.1,2.5),(ex,ey-3.25,2.5),1.34,'ink',16)
    for k in range(8):
        a=math.tau*k/8
        beam(m,(ex+math.cos(a)*.7,ey-3.29,2.5+math.sin(a)*.7),(ex+math.cos(a+.3)*1.20,ey-3.29,2.5+math.sin(a+.3)*1.20),.15,'cream')
    tube(m,(ex,ey-3.28,2.5),(ex,ey-3.32,2.5),.32,'cyan',10)
    for k in range(4):
        xx=x-width*.4+k*2.7; yy=back-20+(k%2)*1.7
        crate(m,xx,yy,0,1.9,1.6,1.2 if k%2 else 1.8,'cream' if k%3==0 else 'cobalt')
    # Ground-scale crews gather in work groups instead of evenly spaced rows.
    for k,(dx,dy) in enumerate([(4,-16),(5,-17.4),(-7,-18.0),(-3,-8.5)]):person(m,x+dx,back+dy,.05,index*4+k)

try:
    bpy.context.window.scene=scene
    m=new_mesh()
    for i,(x,w,y,h) in enumerate([(-39,33,13,12),(-2,35,17,17),(38,33,10,13.8)]):facade(m,x,w,y,h,i)
    # Rear accessible balcony, diagonals and variable-height service masts.
    box(m,(-4,16,20),(91,3.7,.45),'steel')
    rail(m,(-48,14.2,20.3),(40,14.2,20.3),1.3)
    for x in [-46,-22,9,37]:
        beam(m,(x,16,0),(x,16,20),.6,'cobalt')
        beam(m,(x,16,5),(x+6,16,20),.25,'rust')
    person(m,-25,15.6,20.25,3);person(m,27,15.6,20.25,8)
    for x,y,h in [(-56,-8,30),(18,-7,25),(56,10,33)]:
        for dx in [-.45,.45]:beam(m,(x+dx,y,0),(x+dx,y,h),.26,'steel')
        for z in range(2,int(h),3):beam(m,(x-.45,y,z),(x+.45,y,z+2),.18,'rust')
        tube(m,(x,y,h),(x,y,h+1),.35,'cream',8)
        box(m,(x+.9,y,h-.8),(2.7,1.2,.7),'warm')
    # Drooping power lines connect the roof district, with hanging service lamps.
    for row in range(2):
        path=[]
        for i in range(19):
            t=i/18;path.append((-56+112*t,-8+18*t+row*.35,30+3*t-row*.45-5.5*math.sin(math.pi*t)))
        curved_pipe(m,path,.09,'ink',6)
        for index in [3,7,12,16]:
            x,y,z=path[index]
            tube(m,(x,y,z),(x,y,z-.7),.05,'steel',6)
            tube(m,(x,y,z-.6),(x,y,z-1.2),.27,'cream',8)
    # The high cloth is asymmetric and overlaps the low roofs in silhouette.
    cloth(m,-17,9,44,14,26,39,'coral')
    for x in [-39,5]:
        beam(m,(x,9,0),(x,9,26.2),.36,'steel')
        beam(m,(x,9,20),(x+3,9,26.2),.18,'rust')
    # Two access ladders and irregular facade utility conduits.
    for x in [-47,33]:
        for xx in [x-.45,x+.45]:beam(m,(xx,11,0),(xx,11,21),.15,'steel')
        for z in range(1,21):beam(m,(x-.45,11,z),(x+.45,11,z),.12,'cream')
    for x in [-40,4,45]:
        path=[(x,16,1),(x,16,5),(x+3,16,8),(x+3,16,15)]
        curved_pipe(m,path,.23,'cream',8)
    mesh=bpy.data.meshes.new('pit-district-layered-service-mesh')
    mesh.from_pydata(m['v'],[],m['f']);mesh.update()
    material=bpy.data.materials.new('Inkstorm_Pit_District_Paint');material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.86
    paint=material.node_tree.nodes.new('ShaderNodeVertexColor');paint.layer_name='Color'
    material.node_tree.links.new(paint.outputs['Color'],shader.inputs['Base Color'])
    mesh.materials.append(material)
    attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for polygon,color,smooth in zip(mesh.polygons,m['c'],m['s']):
        polygon.use_smooth=smooth
        for index in polygon.loop_indices:attr.data[index].color=(*color,1)
    mesh.color_attributes.active_color=attr;mesh.calc_loop_triangles()
    assert len(mesh.loop_triangles)<15000,len(mesh.loop_triangles)
    obj=bpy.data.objects.new('pit-district-r15',mesh);scene.collection.objects.link(obj)
    obj['inkstorm_source']='build_pit_district.py';obj['front_axis']='-Y'
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=ROOT+'/assets/source/inkstorm/pit-district/raw-pit-district.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'asset':'pit-district','triangles':len(mesh.loop_triangles),'blenderBounds':[(min(v[i] for v in m['v']),max(v[i] for v in m['v'])) for i in range(3)],'source':'Original Blender geometry; no downloads'})
finally:
    bpy.context.window.scene=original_scene
