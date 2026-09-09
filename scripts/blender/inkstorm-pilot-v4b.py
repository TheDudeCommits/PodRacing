"""Build an isolated original adult pilot study through Blender MCP.

No source/study object, public asset, runtime file, or scene configuration is
modified. Six material batches, deterministic authored geometry, +Y forward.
Render/export are deliberately separate acceptance steps. Pelvis and helmet
anchors are retained; inherited hand pose references are distinguished from
the corrected source grip centers. No full .blend save.
"""
import bpy
import math
import json
from mathutils import Vector

SOURCE = 'PodRacing — Teemto material study v1'
STAGE = 'PodRacing — Teemto pilot construction v4b final'
assert STAGE not in bpy.data.scenes, 'Inspect the existing study; do not replace it.'
source = bpy.data.scenes[SOURCE]
saved_scene = bpy.context.window.scene
saved_layer = bpy.context.window.view_layer
saved_active = saved_layer.objects.active
saved_selected = list(bpy.context.selected_objects)
stage = bpy.data.scenes.new(STAGE)
batches = {key: {'v': [], 'f': [], 'smooth': [], 'colors': [], 'wear': []} for key in ('suit', 'shell', 'accent', 'hardware', 'webbing', 'rubber')}
features = []


def geometry(key, name, vertices, faces, smooth=True, color=None):
    # Original v2 helmet/controls retain geometry; revised material grouping
    # keeps flexible seals and harness out of the reflective hard-parts batch.
    if any(word in name for word in ('neck-seal','double-cuff','glove','racing-boot','boot-closure')):
        key='rubber'
    if any(word in name for word in ('harness-webbing','lap-harness','anti-submarine','harness-edge-binding')):
        key='webbing'
    colors={'suit':(.017,.025,.033,1),'shell':(.56,.505,.402,1),
        'accent':(.38,.10,.029,1),'hardware':(.018,.024,.028,1),
        'webbing':(.041,.038,.031,1),'rubber':(.012,.016,.020,1)}
    if color is None:
        color=colors[key]
        if any(word in name for word in ('fastener','adjuster','buckle','zipper-tooth','anchor-bolt')):
            color=(.18,.19,.17,1)
    batch = batches[key]
    base = len(batch['v'])
    batch['v'].extend([tuple(v) for v in vertices])
    batch['colors'].extend([color]*len(vertices))
    wear=.62 if any(w in name for w in ('seam','stitch','selvedge','glove','collar')) else .12
    batch['wear'].extend([wear]*len(vertices))
    batch['f'].extend([tuple(base + i for i in face) for face in faces])
    batch['smooth'].extend([smooth] * len(faces))
    features.append({'name': name, 'material': key, 'vertices': len(vertices)})


def tube(key, name, points, radius, sides=8, closed=False, squash=1.0):
    """Swept non-spherical seams/fingers/hoses. Deliberately small side count."""
    points = [Vector(p) for p in points]
    vertices, faces = [], []
    for i, p in enumerate(points):
        prev = points[(i-1) % len(points)] if (closed or i) else p
        after = points[(i+1) % len(points)] if (closed or i+1 < len(points)) else p
        tangent = (after - prev).normalized()
        ref = Vector((0, 0, 1)) if abs(tangent.z) < .85 else Vector((1, 0, 0))
        u = tangent.cross(ref).normalized()
        v = tangent.cross(u).normalized()
        r = radius[i] if isinstance(radius, (list, tuple)) else radius
        for j in range(sides):
            a = j * math.tau / sides
            vertices.append(p + r * (math.cos(a)*u + math.sin(a)*v*squash))
    spans = len(points) if closed else len(points)-1
    for i in range(spans):
        nxt = (i+1) % len(points)
        for j in range(sides):
            faces.append((i*sides+j, i*sides+(j+1)%sides,
                          nxt*sides+(j+1)%sides, nxt*sides+j))
    if not closed:
        faces.extend([tuple(reversed(range(sides))), tuple((len(points)-1)*sides+j for j in range(sides))])
    geometry(key, name, vertices, faces)


def loft(key, name, rings, sides=16, exponent=.82):
    """Tailored cross sections: (cx,cy,z,halfwidth,halfdepth), not ellipsoids."""
    vertices, faces = [], []
    for cx, cy, z, rx, ry in rings:
        for j in range(sides):
            angle = j * math.tau/sides
            sn, cs = math.sin(angle), math.cos(angle)
            vertices.append((cx+rx*math.copysign(abs(sn)**exponent, sn),
                             cy+ry*math.copysign(abs(cs)**exponent, cs), z))
    for i in range(len(rings)-1):
        for j in range(sides):
            faces.append((i*sides+j, (i+1)*sides+j,
                          (i+1)*sides+(j+1)%sides, i*sides+(j+1)%sides))
    faces.extend([tuple(range(sides)), tuple((len(rings)-1)*sides+j for j in reversed(range(sides)))])
    geometry(key, name, vertices, faces)


def ribbon(key, name, points, width, thickness=.002, axis=(1, 0, 0)):
    axis = Vector(axis).normalized()*width*.5
    vertices, faces = [], []
    for point in points:
        p = Vector(point)
        for shift in (-thickness*.5, thickness*.5):
            vertices.extend([p-axis+Vector((0,shift,0)), p+axis+Vector((0,shift,0))])
    for i in range(len(points)-1):
        a, b = i*4, (i+1)*4
        faces.extend([(a,a+1,b+1,b),(a+2,b+2,b+3,a+3),
                      (a,b,b+2,a+2),(a+1,a+3,b+3,b+1)])
    faces.extend([(0,2,3,1),tuple((len(points)-1)*4+j for j in (0,1,3,2))])
    geometry(key, name, vertices, [tuple(reversed(f)) for f in faces], False)


def box(key, name, center, halfsize, bevel=.0018):
    """Eight-corner clipped prism: crisp fabricated clothing/helmet hardware."""
    cx, cy, cz = center
    x, y, z = halfsize
    b = min(bevel,x*.4,z*.4)
    outline = [(-x+b,-z),(x-b,-z),(x,-z+b),(x,z-b),
               (x-b,z),(-x+b,z),(-x,z-b),(-x,-z+b)]
    vertices=[(cx+px,cy+py,cz+pz) for py in (-y,y) for px,pz in outline]
    faces=[tuple(reversed(range(8))),tuple(range(8,16))]
    faces.extend([(j,(j+1)%8,(j+1)%8+8,j+8) for j in range(8)])
    geometry(key,name,vertices,[tuple(reversed(f)) for f in faces],False)


def sleeve(key, name, points, radii, sides=12):
    tube(key,name,points,radii,sides=sides,squash=.88)


# Continuous garment shells replace the old stacked cylinders and rib tubes.
# Creases are signed displacements in the base surface. Their directional
# centers and angular extent vary; no separate fold/rib mesh is added.
def gauss(x,w):
    return math.exp(-((x/w)**2))

def angle_delta(a,b):
    return math.atan2(math.sin(a-b),math.cos(a-b))

def interp(values,t):
    index=min(len(values)-2,int(t*(len(values)-1)))
    f=t*(len(values)-1)-index
    return values[index]*(1-f)+values[index+1]*f

def bezier(a,b,c,d,t):
    return a*(1-t)**3+3*b*t*(1-t)**2+3*c*t*t*(1-t)+d*t**3

surface_configs={}
def cloth_sample(kind,t,a,offset=0):
    if kind=='jacket':
        return jacket(t,a,offset)
    config=surface_configs[kind]
    if kind=='arm':
        p=arm_center(t)
        tangent=(arm_center(min(1,t+.001))-arm_center(max(0,t-.001))).normalized()
    else:
        p=leg_center(t)
        tangent=(leg_center(min(1,t+.001))-leg_center(max(0,t-.001))).normalized()
    u=Vector((1,0,0))
    u=(u-tangent*u.dot(tangent)).normalized()
    v=tangent.cross(u).normalized()
    radius=interp(config['radii'],t)
    displacement=0
    for tc,aw,ac,amp,phase,slant,extent in config['creases']:
        angular=angle_delta(a,ac)
        direction=tc+slant*math.sin(angular)+.008*math.sin(angular*2+phase)
        mask=gauss(angular,extent)
        d=t-direction
        q=d/aw
        ridge=max(0,1-abs(q-.45)/.86)
        valley=max(0,1-abs(q+.50)/.48)
        displacement+=amp*mask*(ridge-.65*valley)
    displacement+=.00055*math.sin(3*a+12*t)*math.sin(math.pi*t)**2
    if kind=='arm':
        displacement*=min(1,max(0,(.985-t)/.085))
    radial_vec=math.cos(a)*u+math.sin(a)*v*config['squash']
    return p+(radius+displacement+offset)*radial_vec

def fabric_surface(name,kind,radii,rings,sides,crease_specs,squash=1):
    surface_configs[kind]={'radii':radii,'creases':crease_specs,'squash':squash,'rings':rings,'sides':sides}
    verts=[cloth_sample(kind,i/(rings-1),j*math.tau/sides) for i in range(rings) for j in range(sides)]
    faces=[];patch_faces=[]
    for i in range(rings-1):
        for j in range(sides):
            p00=i*sides+j;p01=i*sides+(j+1)%sides
            p10=(i+1)*sides+j;p11=(i+1)*sides+(j+1)%sides
            triangles=[(p00,p01,p11),(p00,p11,p10)]
            angle=(j+.5)*math.tau/sides
            oriented=angle if side>0 else math.pi-angle
            patch=kind=='arm' and 8<=i<14 and -.14<angle_delta(oriented,.14)<.44
            (patch_faces if patch else faces).extend(triangles)
    if kind!='arm':faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((rings-1)*sides+j for j in range(sides)))
    geometry('suit',name,verts,faces)
    if patch_faces:
        used=sorted(set(v for f in patch_faces for v in f));mapping={v:i for i,v in enumerate(used)}
        geometry('accent','native garment-face orange patch '+str(side),[verts[i] for i in used],
            [tuple(mapping[v] for v in f) for f in patch_faces],True)
        start_patch=len(batches['accent']['v'])-len(used)
        for index,original in enumerate(used):
            row=original//sides
            shade=(.19,.058,.015,1) if row in (8,14) else (.35,.095,.027,1)
            batches['accent']['colors'][start_patch+index]=shade
            batches['accent']['wear'][start_patch+index]=.35 if row in (8,14) else .16
    start=len(batches['suit']['v'])-len(verts)
    for i in range(rings):
        t=i/(rings-1)
        for j in range(sides):
            a=j*math.tau/sides
            wear=.08
            for tc,aw,ac,amp,phase,slant,extent in crease_specs:
                angular=angle_delta(a,ac)
                ridge=tc+slant*math.sin(angular)+.008*math.sin(angular*2+phase)+aw*.45
                wear=max(wear,.72*gauss(t-ridge,aw*.60)*gauss(angular,extent))
            batches['suit']['wear'][start+i*sides+j]=wear


def conform_sample(kind,t,a,offset=0):
    rings=24 if kind=='jacket' else surface_configs[kind]['rings']
    sides=28 if kind=='jacket' else surface_configs[kind]['sides']
    ri=min(rings-2,int(t*(rings-1)));rt=t*(rings-1)-ri
    angle=a%math.tau;ai=int(angle/math.tau*sides);at=angle/math.tau*sides-ai
    p00=cloth_sample(kind,ri/(rings-1),ai*math.tau/sides)
    p01=cloth_sample(kind,ri/(rings-1),(ai+1)*math.tau/sides)
    p10=cloth_sample(kind,(ri+1)/(rings-1),ai*math.tau/sides)
    p11=cloth_sample(kind,(ri+1)/(rings-1),(ai+1)*math.tau/sides)
    # Same p00-p11 diagonal as the explicit rendered garment triangles.
    if at>=rt:
        p=p00*(1-at)+p01*(at-rt)+p11*rt
        normal=(p01-p00).cross(p11-p00).normalized()
    else:
        p=p00*(1-rt)+p11*at+p10*(rt-at)
        normal=(p11-p00).cross(p10-p00).normalized()
    if kind=='jacket':normal=-normal
    return p+normal*offset

def cross2(a,b,c):
    return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])

def clip_triangle(poly,triangle):
    sign=1 if cross2(triangle[0],triangle[1],triangle[2])>0 else -1
    for k in range(3):
        a,b=triangle[k],triangle[(k+1)%3]
        output=[]
        for index,q in enumerate(poly):
            p=poly[index-1]
            dp=sign*cross2(a,b,p);dq=sign*cross2(a,b,q)
            if (dp>=-1e-12)!=(dq>=-1e-12):
                f=dp/(dp-dq)
                output.append((p[0]+(q[0]-p[0])*f,p[1]+(q[1]-p[1])*f))
            if dq>=-1e-12:output.append(q)
        poly=output
        if len(poly)<3:return []
    return poly

def clipped_seam_piece(name,kind,poly,color,height):
    rings=24 if kind=='jacket' else surface_configs[kind]['rings']
    sides=28 if kind=='jacket' else surface_configs[kind]['sides']
    imin=max(0,int(math.floor(min(p[0] for p in poly)*(rings-1))))
    imax=min(rings-2,int(math.floor(max(p[0] for p in poly)*(rings-1))))
    jmin=int(math.floor(min(p[1] for p in poly)/math.tau*sides))
    jmax=int(math.floor(max(p[1] for p in poly)/math.tau*sides))
    for i in range(imin,imax+1):
        for j in range(jmin,jmax+1):
            t0,t1=i/(rings-1),(i+1)/(rings-1);a0,a1=j*math.tau/sides,(j+1)*math.tau/sides
            for tri in [((t0,a0),(t0,a1),(t1,a1)),((t0,a0),(t1,a1),(t1,a0))]:
                clipped=clip_triangle(poly,tri)
                if len(clipped)<3:continue
                # Project with this triangle's constant normal, so no strip
                # spans a crease or chooses a different diagonal from the suit.
                w0=cloth_sample(kind,tri[0][0],tri[0][1]);w1=cloth_sample(kind,tri[1][0],tri[1][1]);w2=cloth_sample(kind,tri[2][0],tri[2][1])
                normal=(w1-w0).cross(w2-w0).normalized()
                if kind=='jacket':normal=-normal
                denom=cross2(tri[0],tri[1],tri[2]);vertices=[]
                for uv in clipped:
                    f0=cross2(tri[1],tri[2],uv)/denom
                    f1=cross2(tri[2],tri[0],uv)/denom
                    f2=1-f0-f1
                    vertices.append(w0*f0+w1*f1+w2*f2+normal*height)
                faces=[(0,k,k+1) for k in range(1,len(vertices)-1)
                    if (vertices[k]-vertices[0]).cross(vertices[k+1]-vertices[0]).length>1e-11]
                if faces:geometry('suit',name,vertices,faces,False,color)

def surface_seam(name,kind,points,width=.0015,color=(.012,.017,.021,1),stitches=True):
    # Spend seam geometry on visible interfaces; the seat occludes these runs.
    if name.startswith('jacket side seam') or name.startswith('trouser side'):
        return
    # Exact clipped surface strokes replace unconstrained floating seam quads.
    for index in range(len(points)-1):
        t,a=points[index];t2,a2=points[index+1]
        radius=max(.018,(cloth_sample(kind,t,a)-cloth_sample(kind,t,a+math.pi)).length*.5)
        eps=width/radius*.5
        poly=[(t,a-eps),(t,a+eps),(t2,a2+eps),(t2,a2-eps)]
        clipped_seam_piece(name+' seam',kind,poly,color,.00030)
        if stitches and 'outside sleeve' in name and index%3==0:
            delta=eps+.024
            poly=[(t,a+delta),(t,a+delta+.010),(t2,a2+delta+.010),(t2,a2+delta)]
            clipped_seam_piece(name+' topstitch',kind,poly,(.070,.056,.033,1),.00040)

jacket_rings=[(0,-.130,-.198,.067,.049),(0,-.137,-.173,.073,.054),
    (0,-.149,-.139,.069,.048),(0,-.158,-.095,.077,.051),
    (0,-.167,-.047,.088,.056),(0,-.171,.005,.096,.054),
    (0,-.170,.026,.088,.046),(0,-.168,.041,.058,.038)]

def jacket(t,a,offset=0):
    value=[interp([v[k] for v in jacket_rings],t) for k in range(5)]
    cx,cy,z,rx,ry=value
    sn,cs=math.sin(a),math.cos(a)
    front=max(0,cs)**2
    displacement=0
    for zz,width,amplitude,phase in [(-.166,.009,.0082,0),(-.139,.011,.0093,1.2),(-.107,.012,.0058,2.4)]:
        d=z-zz-.007*math.sin(a*2+phase)-.003*math.sin(a*5+phase)
        envelope=front*(.45+.55*abs(sn))
        q=d/width
        displacement+=amplitude*envelope*(max(0,1-abs(q-.40)/.90)-.62*max(0,1-abs(q+.45)/.55))
    # Shoulder-to-chest tension from sewn armhole and loaded harness.
    displacement+=.0018*gauss(z+.012,.045)*math.sin(5*a+z*60)*abs(sn)**4
    return Vector((cx+(rx+offset+displacement)*math.copysign(abs(sn)**.91,sn),
        cy+(ry+offset+displacement)*math.copysign(abs(cs)**.91,cs),z))
verts=[jacket(i/23,j*math.tau/28) for i in range(24) for j in range(28)]
faces=[]
for i in range(23):
    for j in range(28):
        a=i*28+j;b=(i+1)*28+j;c=(i+1)*28+(j+1)%28;d=i*28+(j+1)%28
        faces.extend([(a,b,c),(a,c,d)])
faces.extend([tuple(range(28)),tuple(23*28+j for j in reversed(range(28)))])
geometry('suit','continuous tailored jacket with compressed waist',verts,faces)
for i in range(24):
    for j in range(28):
        z=verts[i*28+j].z;a=j*math.tau/28
        batches['suit']['wear'][i*28+j]=max(.10,.62*gauss(z+.14,.045)*max(0,math.cos(a)))
        if .035<abs(math.sin(a))<.60 and z>-.10:
            batches['suit']['colors'][i*28+j]=(.021,.031,.039,1)
loft('suit','seated-pelvis',[(0,-.133,-.250,.067,.049),
    (0,-.129,-.233,.085,.061),(0,-.130,-.195,.083,.057),
    (0,-.136,-.177,.068,.049)],24)
# Compact rounded stand and a softly folded dark seal overlap below helmet.
loft('rubber','compact overlapped balaclava neck-seal',[(0,-.160,.028,.032,.027),
    (0,-.160,.047,.035,.029),(0,-.160,.060,.036,.030),
    (0,-.159,.066,.038,.032),(0,-.158,.071,.037,.031),
    (0,-.157,.077,.040,.034),(0,-.155,.083,.040,.037)],24,.91)
collar_vertices=[]
for row in range(5):
    for j in range(24):
        a=j*math.tau/24;top=.060-.003*math.cos(a)+.0013*math.sin(2*a)
        rx,ry,z=[(.049,.039,.028),(.050,.039,.043),(.044,.035,top),
            (.040,.032,top-.0015),(.038,.030,.030)][row]
        collar_vertices.append((rx*math.sin(a),-.162+ry*math.cos(a),z))
collar_faces=[]
for i in range(4):
    for j in range(24):
        a=i*24+j;b=(i+1)*24+j;c=(i+1)*24+(j+1)%24;d=i*24+(j+1)%24
        collar_faces.extend([(a,b,c),(a,c,d)])
geometry('suit','compact rounded racing stand collar',collar_vertices,collar_faces,True,(.010,.015,.020,1))
for side in (-1,1):
    # Double seam follows each chest panel into the folded waist.
    surface_seam('jacket princess seam '+str(side),'jacket',
        [(i/40,side*(.65+.10*math.sin(i/40*math.pi))) for i in range(4,40)],.0015)
    surface_seam('jacket side seam '+str(side),'jacket',
        [(i/30,side*1.55) for i in range(1,30)],.0015)
# Shell rings explicitly leave a visor opening; crown, cheeks and chin are
# constructed pieces around it. The total helmet is narrower than the v1 blob.
helmet_rings=[(.076,.038,.042,-.151),(.087,.052,.061,-.148),
              (.105,.062,.073,-.151),(.124,.067,.076,-.156),
              (.162,.068,.074,-.162),(.183,.062,.066,-.165),
              (.201,.049,.051,-.166),(.214,.029,.030,-.166),
              (.218,.006,.008,-.166)]
vertices, faces = [], []
N=32
for row,(z,rx,ry,cy) in enumerate(helmet_rings):
    for j in range(N):
        a=j*math.tau/N
        front_angle=min(a,math.tau-a)
        zz=z
        if front_angle<1.10 and row in (3,4):
            zz=z+(.010 if row==3 else -.004)*(front_angle/1.10)
        vertices.append((rx*math.sin(a),cy+ry*math.cos(a),zz))
for r in range(len(helmet_rings)-1):
    for j in range(N):
        theta=(j+.5)*math.tau/N
        front=min(theta,math.tau-theta)<1.15
        if r==3 and front:
            continue
        faces.append((r*N+j,(r+1)*N+j,(r+1)*N+(j+1)%N,r*N+(j+1)%N))
faces.extend([tuple(range(N)),tuple((len(helmet_rings)-1)*N+j for j in reversed(range(N)))])
geometry('shell','helmet-crown-cheek-and-chin-shell',vertices,faces)

def visor_point(a,z,offset=0):
    t=max(0,min(1,(z-.123)/.042))
    cy=-.156-.006*t
    return ((.071+offset)*math.sin(a),cy+(.079-.002*t+offset)*math.cos(a),z)

verts=[]
for row in range(5):
    for col in range(25):
        a=-1.14+col*2.28/24
        lo=.123+.011*(abs(a)/1.14)
        hi=.165-.005*(abs(a)/1.14)
        verts.append(visor_point(a,lo+(hi-lo)*row/4))
faces=[(r*25+c,(r+1)*25+c,(r+1)*25+c+1,r*25+c+1) for r in range(4) for c in range(24)]
geometry('hardware','recessed-wrap-visor',verts,faces)
for upper in (False,True):
    pts=[]
    for j in range(25):
        a=-1.15+j*2.30/24
        z=(.168-.005*abs(a)/1.15) if upper else (.120+.011*abs(a)/1.15)
        pts.append(visor_point(a,z,.001))
    tube('hardware','thick-visor-gasket',pts,.004,8)
    if upper:
        tube('shell','armored-brow-lip',[(x,y+.001,z+.006) for x,y,z in pts],.003,8)
for side in (-1,1):
    a=side*1.15
    tube('hardware','visor-side-gasket',[visor_point(a,z,.001) for z in (.131,.145,.164)],.003,8)
    # Flat inset hinge plate replaces the circular orange ear disc.
    tube('hardware','helmet-hinge-pivot',[(side*.068,-.161,.137),(side*.072,-.161,.137)],.011,16)
    tube('shell','helmet-hinge-fastener',[(side*.074,-.161,.137),(side*.076,-.161,.137)],.005,6)
    # Deliberate swept crown construction seam and narrow worn paint stripe.
    tube('hardware','helmet-crown-seam',[(side*.033,-.116,.193),
        (side*.027,-.150,.215),(side*.023,-.184,.212),(side*.032,-.217,.181)],.0012,6)
    ribbon('accent','helmet-top-stripe',[(side*.022,-.108,.194),
        (side*.018,-.145,.217),(side*.014,-.180,.216),(side*.020,-.222,.184)],.008,.0013)
# Flush chin-bar intake slots follow the curved lower shell. No projecting box.
for i in range(-2,3):
    x=i*.008
    y=-.0775+(abs(i)*.0016)
    box('hardware','flush-chin-vent',(x,y,.104),(.0018,.0013,.0048),.0007)

# Fabric volumes follow the driving pose; the original control center remains
# invariant. Tapered ring sections and local fold ribs replace smooth cylinders.
for side in (-1,1):
    shoulder=Vector((side*.087,-.153,.014))
    elbow=Vector((side*.115,-.072,-.101))
    hand=Vector((side*.122,.103,-.071))
    fore=(hand-elbow).normalized()
    wrist=hand-fore*.029
    def arm_center(t):
        if t<.46:
            k=t/.46
            return bezier(shoulder,shoulder+Vector((side*.012,.017,-.044)),
                elbow+Vector((0,-.025,.018)),elbow,k)
        k=(t-.46)/.54
        return bezier(elbow,elbow+Vector((0,.028,-.001)),wrist-fore*.040,wrist,k)
    arm_creases=[
        (.145,.065,-.25,.0085,.2,.050,1.30),
        (.34,.060,.20,.0088,1.2,-.075,1.30),
        (.465,.055,-.80,.0120,2,.075,1.65),
        (.60,.062,.15,.0084,.3,-.063,1.40),
        (.84,.052,-.35,.0071,1.6,.045,1.35),
        (.955,.040,-.80,.0053,2.5,-.037,1.45)]
    arm_creases=[(t,w,a if side>0 else math.pi-a,amp,phase+side*.2,slant*side,extent)
        for t,w,a,amp,phase,slant,extent in arm_creases]
    fabric_surface('continuous bent sleeve '+str(side),'arm',
        [.031,.033,.029,.027,.026,.028,.026,.024,.022,.021],
        48,22,arm_creases,.90)
    # Reinforcement value is sewn into the continuous garment surface.
    offset=len(batches['suit']['v'])-48*22
    for i in range(48):
        for j in range(22):
            t=i/47;a=j*math.tau/22
            oriented=a if side>0 else math.pi-a
            if .60<t<.93 and -.55<angle_delta(oriented,.2)<.7:
                batches['suit']['colors'][offset+i*22+j]=(.013,.019,.024,1)
            if .05<t<.25 and abs(angle_delta(oriented,.35))<1.15:
                batches['suit']['colors'][offset+i*22+j]=(.024,.031,.035,1)
            if .30<t<.59 and abs(angle_delta(oriented,.75))<1.25:
                batches['suit']['colors'][offset+i*22+j]=(.012,.017,.022,1)
            if .22<t<.43 and abs(angle_delta(oriented,math.pi))<.85:
                batches['suit']['colors'][offset+i*22+j]=(.009,.013,.016,1)
    surface_seam('outside sleeve '+str(side),'arm',
        [(i/66,(-.55+.1*math.sin(i/66*5)) if side>0 else (math.pi+.55-.1*math.sin(i/66*5))) for i in range(4,64)],.00165)
    surface_seam('forearm reinforcement '+str(side),'arm',
        [(.60+i*.009,.86 if side>0 else math.pi-.86) for i in range(39)],.0014)
    # Sleeve-setting seam curves around shoulder rather than spanning open air.
    surface_seam('armhole '+str(side),'arm',
        [(.12+.018*math.sin(j*math.tau/44),j*math.tau/44) for j in range(45)],.0018)
    surface_seam('reinforced shoulder cut '+str(side),'arm',
        [(.245+.025*math.cos(j/18*2.30),(-.80+j/18*2.30) if side>0 else math.pi-(-.80+j/18*2.30)) for j in range(19)],.0021)
    surface_seam('reinforced elbow cut '+str(side),'arm',
        [(.33+.030*math.sin(j/18*2.6),(-.50+j/18*2.60) if side>0 else math.pi-(-.50+j/18*2.60)) for j in range(19)],.0020)
    # The glove gauntlet overlaps the narrowed sleeve; no exposed orange wedge.
    sleeve('rubber','overlapping glove cuff',[wrist-fore*.017,wrist-fore*.012,
        wrist-fore*.003,wrist+fore*.008],[.0235,.024,.0225,.020],12)
    # The palm is a clipped glove volume; four folded fingers curl around the
    # same cylindrical control contact, with a separate opposing thumb.
    palm=hand+Vector((0,.004,-.003))
    # Inherited hand anchor is 0.0258/0.0318 units behind source hardware.
    # Retain it as the pose reference, extending the glove to the actual grip.
    grip_center=Vector((-.145 if side<0 else .130,.153,-.096))
    glove_axis=(grip_center-hand).normalized()
    tube('suit','rounded-articulated-glove-palm',
        [hand-fore*.030,hand,hand.lerp(grip_center,.60),grip_center-glove_axis*.007],
        [.017,.020,.021,.018],12,squash=.63)
    tube('hardware','flexible-glove-knuckle-panel',
        [hand+Vector((-side*.012,.008,.011)),
         hand+Vector((0,.015,.013)),hand+Vector((side*.012,.021,.010))],
        [.002,.003,.002],8)
    grip_axis=Vector((0,-.68,.733)).normalized()
    u=Vector((1,0,0)); v=grip_axis.cross(u).normalized()
    for finger in range(4):
        axis_offset=(finger-1.5)*.007
        points=[]
        for k in range(8):
            a=-.35*math.pi+k*1.40*math.pi/7
            points.append(grip_center+grip_axis*axis_offset+
                          .020*(math.cos(a)*u+math.sin(a)*v))
        tube('suit','curled-glove-finger',points,.0035,7)
        # Small defined knuckle seam catches the light without ivory mittens.
        tube('hardware','glove-finger-joint-seam',[points[2],points[3]],.0009,5)
    # Wider anatomically connected thumb web, with a separate padded knuckle
    # bridge. Contact center and curled finger paths remain the v2 grip basis.
    thumb_root=palm+Vector((-side*.014,0,-.002))
    thumb_knuckle=grip_center+Vector((-side*.025,-.006,-.010))
    tube('rubber','opposing-glove-thumb',[thumb_root,thumb_knuckle,
        grip_center+Vector((-side*.020,.014,-.004)),
        grip_center+Vector((-side*.006,.020,.001))],[.009,.008,.0055,.0045],8)
    web=[hand+Vector((-side*.014,.006,.003)),hand+Vector((-side*.011,.018,.009)),
        thumb_knuckle+Vector((side*.004,.001,.006)),thumb_root+Vector((0,0,.007)),
        hand+Vector((-side*.014,.006,-.009)),hand+Vector((-side*.011,.018,-.004)),
        thumb_knuckle+Vector((side*.004,.001,-.004)),thumb_root+Vector((0,0,-.005))]
    geometry('rubber','continuous glove thumb web',web,
        [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],True,(.020,.023,.025,1))

    hip=Vector((side*.050,-.110,-.207))
    knee=Vector((side*.075,.088,-.272))
    boot=Vector((side*.075,.254,-.218))
    def leg_center(t):
        if t<.57:
            k=t/.57
            return bezier(hip,hip+Vector((side*.007,.060,-.028)),
                knee-Vector((0,.028,0)),knee,k)
        k=(t-.57)/.43
        return bezier(knee,knee+Vector((0,.024,.003)),boot-Vector((0,.046,.014)),boot,k)
    leg_creases=[(.09,.04,1.2,.0035,.4,.025,1.8),(.19,.04,.4,.003,1.6,-.028,1.5),
        (.29,.033,2,.0025,1,.028,1.3),(.48,.025,1.6,.0028,.5,.02,1.4),
        (.59,.030,2,.0035,1.3,.025,1.2),(.73,.03,.6,.002,2,-.02,1.3)]
    fabric_surface('continuous seated trouser '+str(side),'leg',
        [.038,.041,.038,.035,.032,.029,.028,.026,.024,.022],
        16,14,leg_creases,.93)
    surface_seam('trouser side '+str(side),'leg',
        [(i/42,0 if side>0 else math.pi) for i in range(1,42)],.0017)
    # Boot shell and sole have a defined toe and heel break, not an oval blob.
    loft('hardware','racing-boot',[(boot.x,boot.y-.005,boot.z-.025,.024,.037),
        (boot.x,boot.y+.006,boot.z-.016,.027,.043),
        (boot.x,boot.y+.008,boot.z+.006,.027,.040),
        (boot.x,boot.y-.008,boot.z+.025,.021,.025)],12,.65)
    for j in range(3):
        ribbon('suit','boot-closure-strap',[(boot.x-.021,boot.y+j*.010,boot.z+.014),
            (boot.x,boot.y+j*.010,boot.z+.026),(boot.x+.021,boot.y+j*.010,boot.z+.014)],
            .006,.002,axis=(0,1,0))

def tension_webbing(name,points,width):
    ps=[Vector(p) for p in points]
    # Smooth longitudinal sampling retains the authored anchor endpoints.
    path=[]
    for i in range(len(ps)-1):
        for k in range(4):
            t=k/4
            path.append(ps[i].lerp(ps[i+1],t))
    path.append(ps[-1])
    vertices=[]
    for i,p in enumerate(path):
        tangent=(path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized()
        across=Vector((1,0,0));across=(across-tangent*across.dot(tangent)).normalized()
        normal=tangent.cross(across)
        if normal.y<0: normal=-normal
        for f in (-.5,-.27,0,.27,.5):
            crown=(1-(abs(f)*2)**2)*.00065
            vertices.append(p+across*width*f+normal*crown)
    faces=[(i*5+j,i*5+j+1,(i+1)*5+j+1,(i+1)*5+j) for i in range(len(path)-1) for j in range(4)]
    geometry('webbing',name+' woven loaded surface',vertices,faces,True)
    # Thin dark selvedge bands and broken flax stitching lie flat on webbing.
    for edge in (-1,1):
        vv=[]
        for i,p in enumerate(path):
            tangent=(path[min(i+1,len(path)-1)]-path[max(0,i-1)]).normalized()
            across=Vector((1,0,0));across=(across-tangent*across.dot(tangent)).normalized()
            normal=tangent.cross(across)
            if normal.y<0:normal=-normal
            for f in (edge*.40,edge*.47): vv.append(p+across*width*f+normal*.0003)
        ff=[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(path)-1)]
        geometry('webbing',name+' soft selvedge',vv,ff,True,(.062,.053,.040,1))
        for i in range(0,len(path)-1,2):
            geometry('webbing',name+' interrupted border stitch',
                [vv[2*i],vv[2*i+1],vv[2*i+3],vv[2*i+2]],[(0,1,2,3)],False,(.125,.102,.062,1))

# Harness follows front garment surfaces, bends over shoulders, then terminates
# at visible seat-contact pads. A central rotary buckle has separate latch tabs.
for side in (-1,1):
    strap=[(side*.052,-.202,.007),(side*.055,-.186,.041),
        (side*.057,-.150,.049),(side*.055,-.112,.028),
        (side*.048,-.101,-.036),(side*.034,-.088,-.099),
        (side*.015,-.075,-.127)]
    tension_webbing('shoulder harness '+str(side),strap,.020)
    box('shell','harness-adjuster',(side*.048,-.098,-.029),(.011,.003,.014),.002)
    box('hardware','adjuster-center-slot',(side*.048,-.094,-.029),(.006,.001,.008),.001)
    lap=[(side*.078,-.148,-.200),(side*.063,-.080,-.178),
         (side*.017,-.073,-.137)]
    tension_webbing('lap harness '+str(side),lap,.024)
    box('accent','harness-anchor-tab',(side*.080,-.147,-.197),(.014,.006,.013),.002)
    tube('shell','harness-anchor-bolt',[(side*.080,-.139,-.197),
        (side*.080,-.137,-.197)],.0045,6)
tension_webbing('anti submarine harness',[(0,-.093,-.224),(0,-.069,-.171),(0,-.070,-.135)],.018)
box('shell','harness-rotary-buckle',(0,-.069,-.128),(.020,.006,.016),.006)
tube('hardware','buckle-rotary-hub',[(0,-.061,-.128),(0,-.058,-.128)],.009,12)
box('accent','buckle-release-tab',(0,-.055,-.128),(.0028,.0018,.007),.001)
# Jacket zip and restrained individual zipper teeth complete the center opening.
tube('hardware','jacket-center-zip',[(0,-.105,.027),(0,-.099,-.045),(0,-.087,-.098)],.002,6)
for i in range(12):
    z=.015-i*.008
    y=-.104+(i/12)*.015
    box('shell','zipper-tooth',(0,y-.001,z),(.0025,.001,.00065),.0003)

try:
    # Evaluate source before copying world matrices; inactive Blender matrices
    # may be stale after render(scene=...). No source selection is changed.
    bpy.context.window.scene=source
    bpy.context.view_layer.update()
    originals=[(o,o.matrix_world.copy()) for o in source.objects
               if o.type=='MESH' and not o.name.startswith('teemto-pilot-')]
    bpy.context.window.scene=stage
    copied=[]
    for original,matrix in originals:
        mesh=original.data.copy()
        mesh.name='Pilot v4b unchanged body '+original.data.name
        mesh.transform(matrix)
        obj=bpy.data.objects.new('pilot-v4b-body-'+original.name,mesh)
        stage.collection.objects.link(obj)
        copied.append(obj)
    root=bpy.data.objects.new('teemto-pilot-construction-v4b',None)
    stage.collection.objects.link(root)
    definitions={
        'suit':((.032,.045,.060,1),.88,.02),
        'shell':((.64,.57,.43,1),.55,.13),
        'accent':((.40,.105,.026,1),.76,.02),
        'hardware':((.010,.016,.021,1),.36,.25),
        'webbing':((.041,.038,.031,1),.94,0),
        'rubber':((.012,.016,.020,1),.91,0),
    }
    receipt=[]
    for key,batch in batches.items():
        material=bpy.data.materials.new('Inkstorm pilot v4b '+key)
        material.use_nodes=True
        color,roughness,metallic=definitions[key]
        material.diffuse_color=color
        bsdf=material.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value=color
        bsdf.inputs['Roughness'].default_value=roughness
        bsdf.inputs['Metallic'].default_value=metallic
        mesh=bpy.data.meshes.new('Original Inkstorm pilot v4b '+key)
        mesh.from_pydata(batch['v'],[],batch['f'])
        mesh.update()
        for polygon,smooth in zip(mesh.polygons,batch['smooth']):
            polygon.use_smooth=smooth
        invalid_corrected=mesh.validate(verbose=False)
        colors=mesh.color_attributes.new(name='PilotFabricColor',type='FLOAT_COLOR',domain='POINT')
        for index,color_value in enumerate(batch['colors']):
            colors.data[index].color=color_value
        wear=mesh.color_attributes.new(name='PilotWear',type='FLOAT_COLOR',domain='POINT')
        for index,value in enumerate(batch['wear']):
            wear.data[index].color=(value,value,value,1)
        attribute=material.node_tree.nodes.new('ShaderNodeVertexColor')
        attribute.layer_name='PilotFabricColor'
        material.node_tree.links.new(attribute.outputs['Color'],bsdf.inputs['Base Color'])
        mesh.materials.append(material)
        obj=bpy.data.objects.new('teemto-pilot-v4b-'+key,mesh)
        stage.collection.objects.link(obj)
        obj.parent=root
        mesh.calc_loop_triangles()
        receipt.append({'mesh':obj.name,'triangles':len(mesh.loop_triangles),
            'vertices':len(mesh.vertices),'validationCorrected':invalid_corrected})
    total=sum(item['triangles'] for item in receipt)
    assert total<=16000, 'Pilot exceeds agreed geometry budget'
    # Lights/camera are independent review copies; no extras/config are copied.
    for original in source.objects:
        if original.type not in ('LIGHT','CAMERA'):
            continue
        data=original.data.copy()
        obj=bpy.data.objects.new('Pilot v4b review '+original.name,data)
        stage.collection.objects.link(obj)
        obj.matrix_world=original.matrix_world.copy()
        if original==source.camera:
            stage.camera=obj
    stage.world=source.world.copy() if source.world else None
    stage.render.engine='CYCLES'
    stage.cycles.device='CPU'
    stage.cycles.samples=24
    stage.cycles.use_denoising=True
    stage.render.resolution_x=1400
    stage.render.resolution_y=1000
    stage.render.resolution_percentage=100
    stage.render.image_settings.file_format='PNG'
    stage.view_settings.view_transform='AgX'
    bpy.context.view_layer.update()
    pilot_points=[v.co for o in root.children for v in o.data.vertices]
    result={'scene':STAGE,'sourceScene':SOURCE,'sourceModified':False,
        'runtimeModified':False,'pilotMeshes':len(receipt),'pilotTriangles':total,
        'bodyCopies':len(copied),'featureCount':len(features),'geometrySeed':'authored-static-v4b-explicit-triangle-cloth',
        'meshes':receipt,'anchors':{'pelvis':[0,-.130,-.205],
        'helmetCenter':[0,-.160,.143],
        'inheritedHandPoseReferences':[[-.122,.103,-.071],[.122,.103,-.071]],
        'authoredGripCenters':[[-.145,.153,-.096],[.130,.153,-.096]]},
        'pilotBounds':[[min(p[k] for p in pilot_points) for k in range(3)],
                       [max(p[k] for p in pilot_points) for k in range(3)]],
        'pose':'static, grip geometry needs visual contact acceptance',
        'rendered':False,'exported':False}
finally:
    bpy.context.window.scene=saved_scene
    bpy.context.window.view_layer=saved_layer
    # None of the construction uses selection operators, but verify/restore
    # exactly instead of assuming a Blender context switch preserves it.
    for obj in saved_layer.objects:
        if obj.select_get() and obj not in saved_selected:
            obj.select_set(False)
    for obj in saved_selected:
        obj.select_set(True)
    saved_layer.objects.active=saved_active
result['restoredContext']={'scene':bpy.context.window.scene.name,
    'viewLayer':bpy.context.window.view_layer.name,
    'activeObject':saved_layer.objects.active.name if saved_layer.objects.active else None,
    'selectedCount':len(bpy.context.selected_objects),'exactSelectionRestored':set(bpy.context.selected_objects)==set(saved_selected)}
print(json.dumps(result))
