"""Build an isolated original adult pilot study through Blender MCP.

No source/study object, public asset, runtime file, or scene configuration is
modified. Four material batches, deterministic authored geometry, +Y forward.
Render/export are deliberately separate acceptance steps. Pelvis and helmet
anchors are retained; inherited hand pose references are distinguished from
the corrected source grip centers. No full .blend save.
"""
import bpy
import math
import json
from mathutils import Vector

SOURCE = 'PodRacing — Teemto material study v1'
STAGE = 'PodRacing — Teemto pilot detail v2'
assert STAGE not in bpy.data.scenes, 'Inspect the existing study; do not replace it.'
source = bpy.data.scenes[SOURCE]
saved_scene = bpy.context.window.scene
saved_layer = bpy.context.window.view_layer
saved_active = saved_layer.objects.active
saved_selected = list(bpy.context.selected_objects)
stage = bpy.data.scenes.new(STAGE)
batches = {key: {'v': [], 'f': [], 'smooth': []} for key in ('suit', 'shell', 'accent', 'hardware')}
features = []


def geometry(key, name, vertices, faces, smooth=True):
    batch = batches[key]
    base = len(batch['v'])
    batch['v'].extend([tuple(v) for v in vertices])
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


# A reclined jacket with a shaped ribcage, waist, seated pelvis and high collar.
loft('suit','tailored-jacket',[
    (0,-.130,-.198,.067,.049),(0,-.137,-.173,.073,.054),
    (0,-.149,-.139,.069,.048),(0,-.158,-.095,.077,.051),
    (0,-.167,-.047,.088,.056),(0,-.171,.005,.096,.054),
    (0,-.170,.026,.088,.046),(0,-.168,.041,.058,.038)],20)
loft('suit','seated-pelvis',[(0,-.133,-.250,.067,.049),
    (0,-.129,-.233,.085,.061),(0,-.130,-.195,.083,.057),
    (0,-.136,-.177,.068,.049)],16)
loft('hardware','ribbed-neck-seal',[(0,-.160,.032,.043,.034),
    (0,-.160,.043,.045,.037),(0,-.160,.049,.044,.036),
    (0,-.160,.052,.047,.038),(0,-.160,.057,.044,.036),
    (0,-.160,.061,.046,.037),(0,-.160,.069,.042,.034),
    (0,-.158,.080,.039,.034)],20)
for side in (-1,1):
    # Chest panel and its bound seam lie over the tailored jacket surface.
    panel=[(side*.014,-.110,.012),(side*.065,-.113,.011),
           (side*.072,-.104,-.067),(side*.021,-.098,-.107)]
    geometry('suit','separate-jacket-chest-panel-'+str(side),panel,[(0,1,2,3)],False)
    tube('hardware','chest-panel-bound-edge-'+str(side),panel,.0018,6,True)
    # Stitched shoulder yokes, small orange affiliation patches, pocket welts.
    ribbon('accent','shoulder-yoke-'+str(side),[(side*.056,-.150,.039),
        (side*.086,-.145,.028),(side*.105,-.134,.009)],.020,.0025)
    box('accent','upper-arm-cloth-patch-'+str(side),(side*.114,-.134,-.017),(.011,.013,.017),.003)
    ribbon('hardware','jacket-pocket-welt-'+str(side),
        [(side*.028,-.098,-.057),(side*.064,-.103,-.054)],.003,.0018,axis=(0,0,1))
    for row in range(3):
        tube('suit','compressed-waist-fold',[(side*.009,-.096,-.130-row*.011),
            (side*.033,-.090,-.134-row*.009),(side*.065,-.101,-.132-row*.012)],
            [.0014,.0032,.0014],6)

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
    for i in range(3):
        # Raised thin shell rubs are directed along panel edges, not dirt blobs.
        tube('shell','helmet-edge-abrasion',[(side*(.039+i*.003),-.098-i*.001,.190-i*.003),
            (side*(.046+i*.003),-.104-i*.001,.189-i*.003)],.00065,5)
# Flush chin-bar intake slots follow the curved lower shell. No projecting box.
for i in range(-2,3):
    x=i*.008
    y=-.0775+(abs(i)*.0016)
    box('hardware','flush-chin-vent',(x,y,.104),(.0018,.0013,.0048),.0007)

# Fabric volumes follow the driving pose; the original control center remains
# invariant. Tapered ring sections and local fold ribs replace smooth cylinders.
for side in (-1,1):
    shoulder=Vector((side*.093,-.148,.018))
    elbow=Vector((side*.115,-.072,-.101))
    hand=Vector((side*.122,.103,-.071))
    fore=(hand-elbow).normalized()
    wrist=hand-fore*.029
    sleeve('suit','upper-jacket-sleeve',[shoulder,
        shoulder.lerp(elbow,.18),shoulder.lerp(elbow,.52),
        shoulder.lerp(elbow,.77),elbow],[.030,.034,.029,.027,.026])
    sleeve('suit','shaped-forearm',[elbow,elbow.lerp(wrist,.14),
        elbow.lerp(wrist,.40),elbow.lerp(wrist,.73),wrist],
        [.027,.029,.027,.024,.021])
    # Shoulder cap is a shallow curved fabric panel over the sleeve surface.
    tube('suit','shoulder-bound-seam',[(side*.066,-.142,.030),
        (side*.091,-.119,.021),(side*.116,-.135,-.010),
        (side*.119,-.151,-.030)],.0025,7)
    for step in range(3):
        center=elbow.lerp(wrist,.12+step*.115)
        points=[]
        for j in range(9):
            a=-1.05+j*2.10/8
            points.append(center+Vector((math.sin(a)*.023,
                -.002*math.cos(a),math.cos(a)*.023)))
        tube('suit','broad-elbow-compression-fold',points,
            [.0008,.0012,.0017,.002,.0022,.002,.0017,.0012,.0008],7)
    sleeve('hardware','double-cuff',[wrist-fore*.010,wrist-fore*.006,wrist+fore*.002],
           [.022,.023,.021],12)
    tube('accent','cuff-pull-tab',[wrist+Vector((side*.020,0,0)),
        wrist+Vector((side*.024,.008,0))],.003,6)
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
    tube('suit','opposing-glove-thumb',[
        palm+Vector((-side*.016,0,-.006)),
        grip_center+Vector((-side*.025,-.008,-.011)),
        grip_center+Vector((-side*.020,.014,-.004)),
        grip_center+Vector((-side*.006,.020,.001))],
        [.006,.006,.005,.004],8)

    hip=Vector((side*.050,-.110,-.207))
    knee=Vector((side*.075,.088,-.272))
    boot=Vector((side*.075,.254,-.218))
    sleeve('suit','seated-trouser-thigh',[hip,hip.lerp(knee,.2),
        hip.lerp(knee,.7),knee],[.039,.041,.033,.029])
    sleeve('suit','bent-trouser-shin',[knee,knee.lerp(boot,.2),
        knee.lerp(boot,.78),boot],[.029,.029,.024,.022])
    tube('hardware','trouser-outside-seam',[hip+Vector((side*.034,0,0)),
        knee+Vector((side*.028,0,0)),boot+Vector((side*.022,0,0))],.0016,6)
    box('suit','tailored-knee-reinforcement',knee+Vector((0,.004,.020)),(.025,.023,.006),.007)
    for j in range(3):
        tube('suit','seated-hip-fold',[hip+Vector((-side*.025,j*.014,-.006)),
            hip+Vector((0,j*.014,.017)),hip+Vector((side*.026,j*.014,-.003))],.0024,6)
    # Boot shell and sole have a defined toe and heel break, not an oval blob.
    loft('hardware','racing-boot',[(boot.x,boot.y-.005,boot.z-.025,.024,.037),
        (boot.x,boot.y+.006,boot.z-.016,.027,.043),
        (boot.x,boot.y+.008,boot.z+.006,.027,.040),
        (boot.x,boot.y-.008,boot.z+.025,.021,.025)],12,.65)
    for j in range(3):
        ribbon('suit','boot-closure-strap',[(boot.x-.021,boot.y+j*.010,boot.z+.014),
            (boot.x,boot.y+j*.010,boot.z+.026),(boot.x+.021,boot.y+j*.010,boot.z+.014)],
            .006,.002,axis=(0,1,0))

# Harness follows front garment surfaces, bends over shoulders, then terminates
# at visible seat-contact pads. A central rotary buckle has separate latch tabs.
for side in (-1,1):
    strap=[(side*.052,-.202,.007),(side*.055,-.186,.041),
        (side*.057,-.150,.049),(side*.055,-.112,.028),
        (side*.048,-.101,-.036),(side*.034,-.088,-.099),
        (side*.015,-.075,-.127)]
    ribbon('hardware','shoulder-harness-webbing',strap,.018,.003)
    for edge in (-1,1):
        tube('suit','harness-edge-binding',[(x+edge*.0075,y+.002,z) for x,y,z in strap],.0012,5)
    box('shell','harness-adjuster',(side*.048,-.098,-.029),(.011,.003,.014),.002)
    box('hardware','adjuster-center-slot',(side*.048,-.094,-.029),(.006,.001,.008),.001)
    lap=[(side*.078,-.148,-.200),(side*.063,-.080,-.178),
         (side*.017,-.073,-.137)]
    ribbon('hardware','lap-harness',lap,.021,.003)
    box('accent','harness-anchor-tab',(side*.080,-.147,-.197),(.014,.006,.013),.002)
    tube('shell','harness-anchor-bolt',[(side*.080,-.139,-.197),
        (side*.080,-.137,-.197)],.0045,6)
ribbon('hardware','anti-submarine-harness',[(0,-.093,-.224),(0,-.069,-.171),(0,-.070,-.135)],.018,.003)
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
        mesh.name='Pilot v2 unchanged body '+original.data.name
        mesh.transform(matrix)
        obj=bpy.data.objects.new('pilot-v2-body-'+original.name,mesh)
        stage.collection.objects.link(obj)
        copied.append(obj)
    root=bpy.data.objects.new('teemto-pilot-detail-v2',None)
    stage.collection.objects.link(root)
    definitions={
        'suit':((.032,.045,.060,1),.88,.02),
        'shell':((.64,.57,.43,1),.55,.13),
        'accent':((.40,.105,.026,1),.76,.02),
        'hardware':((.010,.016,.021,1),.36,.25),
    }
    receipt=[]
    for key,batch in batches.items():
        material=bpy.data.materials.new('Inkstorm pilot v2 '+key)
        material.use_nodes=True
        color,roughness,metallic=definitions[key]
        material.diffuse_color=color
        bsdf=material.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value=color
        bsdf.inputs['Roughness'].default_value=roughness
        bsdf.inputs['Metallic'].default_value=metallic
        mesh=bpy.data.meshes.new('Original Inkstorm pilot v2 '+key)
        mesh.from_pydata(batch['v'],[],batch['f'])
        mesh.update()
        for polygon,smooth in zip(mesh.polygons,batch['smooth']):
            polygon.use_smooth=smooth
        invalid_corrected=mesh.validate(verbose=False)
        mesh.materials.append(material)
        obj=bpy.data.objects.new('teemto-pilot-v2-'+key,mesh)
        stage.collection.objects.link(obj)
        obj.parent=root
        mesh.calc_loop_triangles()
        receipt.append({'mesh':obj.name,'triangles':len(mesh.loop_triangles),
            'vertices':len(mesh.vertices),'validationCorrected':invalid_corrected})
    total=sum(item['triangles'] for item in receipt)
    assert total<=10500, 'Pilot exceeds agreed geometry budget'
    # Lights/camera are independent review copies; no extras/config are copied.
    for original in source.objects:
        if original.type not in ('LIGHT','CAMERA'):
            continue
        data=original.data.copy()
        obj=bpy.data.objects.new('Pilot v2 review '+original.name,data)
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
        'bodyCopies':len(copied),'featureCount':len(features),'geometrySeed':'authored-static-v2',
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
    'selected':[o.name for o in bpy.context.selected_objects]}
print(json.dumps(result))
