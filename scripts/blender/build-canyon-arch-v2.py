"""Original canyon arch v2b. Execute through Blender MCP after GPU release.

No source scene is modified or saved. Send this literal source to the safe
Blender MCP endpoint; change the final dispatch argument for each stage:
build, export, front, quarter, underside, inspect.
glTF coordinates are (Blender X,Z,-Y).
The editable source is this deterministic script; no .blend is written.
"""
import bpy
import bmesh
import math
import json
from mathutils import Vector

ROOT = '/Users/amir/Projects/PodRacing'
SOURCE = ROOT + '/assets/source/inkstorm/canyon-arch-v2/v2b'
OUTPUT = ROOT + '/output/arch-v2/v2b'
SCENE = 'PodRacing — original canyon arch v2b'
OBJECT = 'canyon-arch-v2b'
ORIGINAL_SHA = '36876e340a578993c9c3d01084029d1ca0b757ef140ae482bbd1e0e1ff6b0453'

# Ordered from left toe, over the crown, to right toe. Deliberately unequal
# profiles replace the original ellipse and round tube cross-section.
INNER = [(-53,0),(-53,15),(-51,27),(-45,36),(-33,45),(-16,52),
         (1,54),(18,49),(34,41),(45,32),(52,23),(55,10),(55,0)]
OUTER = [(-80,0),(-82,19),(-81,42),(-76,64),(-64,81),(-44,87),
         (-17,83),(12,76),(42,70),(64,64),(79,48),(83,24),(85,0)]
ALONG, ACROSS, DEEP = 144, 28, 10


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def lerp(a, b, t):
    return a + (b-a)*t


def profile(points, u):
    p = u*(len(points)-1)
    k = min(len(points)-2, int(p))
    t = p-k
    return tuple(lerp(points[k][j], points[k+1][j], t) for j in range(2))


def tent(x):
    return max(0.0, 1.0-abs(x))


def smooth01(x):
    t=clamp(x,0,1)
    return t*t*(3-2*t)


def stratum(x, h, side):
    # Five authored, unequal shelf remnants. No periodic phase/modulo and
    # no full-span grooves: each terminates over a different lateral range.
    # Parameters: center X, center height, slope, start X, end X, height
    # half-width, projection, endpoint fade length. All dimensions in metres.
    ledges=[(-64,18,-0.13,-83,-49,6.5,2.7,9),
            (-38,62,-0.19,-78,5,8.5,3.6,16),
            (-2,77,-0.17,-42,55,7.5,3.1,19),
            (57,40,-0.28,24,85,9.0,3.8,15),
            (69,12,0.11,51,87,6.0,2.5,11)]
    total=0.0
    for cx,ch,slope,x0,x1,width,depth,endfade in ledges:
        shift=side*(1.1+0.012*cx)
        fade=smooth01((x-x0-shift)/endfade)*smooth01((x1+shift-x)/endfade)
        line=ch+slope*(x-cx)+side*1.25
        profile=smooth01(1-abs(h-line)/width)
        total+=depth*fade*profile
    return total


def fracture(x, h, side):
    # Three broad, independent faults rather than decorative dark lines.
    a = smooth01(tent((x-(-35+0.38*(h-60)+side*1.4))/6.5))*smooth01((h-36)/23)*4.9
    b = smooth01(tent((x-(15-0.23*(h-78)-side*1.2))/5.8))*smooth01((h-51)/18)*5.3
    c = smooth01(tent((x-(59+0.1*(h-45)+side*1.8))/7.0))*smooth01((h-15)/21)*4.7
    return max(a,b,c)


def stone_point(u, v, side):
    ix, ih = profile(INNER,u)
    ox, oh = profile(OUTER,u)
    x, h = lerp(ix,ox,v), lerp(ih,oh,v)
    base_fade = clamp(h/9.0,0,1)
    # Low amplitude broken contour; all major silhouette comes from the
    # authored profile, not noise. Preserve planar foot contacts exactly.
    contour = 0.44*math.sin(u*25.0) + 0.25*math.sin(u*43.0+v*2.1)
    h += base_fade*contour*(0.3+0.7*v)
    x += base_fade*(0.32*math.sin(u*23.0+v*1.4))
    # Reserve toes plus a 5m lateral buffer around the guaranteed box.
    if h <= 24.3:
        x = min(x,-50.0) if x < 0 else max(x,50.0)
    x, h = clamp(x,-83.6,86.8), clamp(h,0,99.6)
    left_plane=0.021*(x+60)+0.030*(h-45)
    center_plane=-0.025*(x+8)+0.016*(h-61)
    right_plane=0.026*(x-54)-0.022*(h-35)
    broad=lerp(left_plane,center_plane,smooth01((x+42)/15))
    broad=lerp(broad,right_plane,smooth01((x-28)/21))
    broad+=0.50*math.sin(x*0.039+h*0.047+side*1.3)
    # v-shaped weathered shoulders have broad bevel planes, never a circular
    # torus section. Faces retain depth at the inner and outer boundaries.
    bevel = 1.2*abs(2*v-1)
    lip = stratum(x,h,side)
    thick = clamp(11.40+broad+lip-bevel-fracture(x,h,side),5.0,16.65)
    # Arch front is negative Blender Y, positive glTF Z.
    return (x,side*thick,h)


def vertex_value(co):
    x,y,h = co
    side = -1 if y < 0 else 1
    seam = stratum(x,h,side)
    fault = fracture(x,h,side)
    # InkstormSurfaceMaterial normalizes authored linear luminance by .19.
    # Center this value there; bright .6-range colors would all hit its 1.45
    # clamp and erase the authored cavity/stratum values in the actual game.
    value = clamp(0.205 + 0.014*seam - 0.014*fault
                  + 0.009*math.sin(x*0.051+h*0.032),0.072,0.295)
    # Warm neutral values, not a baked directional-light map. Runtime stone
    # tint and directional shadow can therefore remain authoritative.
    return (value, value*0.91, value*0.80, 1.0)


def make_geometry():
    verts, faces = [], []
    grids = []
    for side in (-1,1):
        grid=[]
        for i in range(ALONG+1):
            row=[]
            for j in range(ACROSS+1):
                row.append(len(verts))
                verts.append(stone_point(i/ALONG,j/ACROSS,side))
            grid.append(row)
        grids.append(grid)
        for i in range(ALONG):
            for j in range(ACROSS):
                a,b,c,d=grid[i][j],grid[i+1][j],grid[i+1][j+1],grid[i][j+1]
                faces.extend(((a,b,d),(b,c,d)) if (i+j)%2 else ((a,b,c),(a,c,d)))

    # Connect the exact perimeter vertices. No floating slabs, hidden caps,
    # interior faces, or talus occupy the protected lower opening.
    perimeter = [(i,0) for i in range(ALONG+1)]
    perimeter += [(ALONG,j) for j in range(1,ACROSS+1)]
    perimeter += [(i,ACROSS) for i in range(ALONG-1,-1,-1)]
    perimeter += [(0,j) for j in range(ACROSS-1,0,-1)]
    strips=[]
    for i,j in perimeter:
        a,b=grids[0][i][j],grids[1][i][j]
        row=[a]
        for k in range(1,DEEP):
            t=k/DEEP
            aa,bb=verts[a],verts[b]
            xx,yy,hh=(lerp(aa[q],bb[q],t) for q in range(3))
            # Real broken underside/crown ledges along depth; the foot caps
            # stay flat and low toes stay outside the guaranteed corridor.
            fade=math.sin(t*math.pi)*clamp(hh/15,0,1)
            hh+=fade*(0.52*math.sin(i*0.095+t*4.0)+0.26*math.sin(i*0.18+t*2))
            xx+=fade*0.36*math.sin(i*0.085+t*5.0)
            if hh<=24.3: xx=min(xx,-50) if xx<0 else max(xx,50)
            row.append(len(verts));verts.append((clamp(xx,-83.6,86.8),yy,clamp(hh,0,99.6)))
        row.append(b);strips.append(row)
    for i,row in enumerate(strips):
        nxt=strips[(i+1)%len(strips)]
        for k in range(DEEP):
            a,b,c,d=row[k],nxt[k],nxt[k+1],row[k+1]
            faces.extend(((a,b,c),(a,c,d)))
    return verts,faces


def point_at(obj, location):
    obj.rotation_euler=(Vector(location)-obj.location).to_track_quat('-Z','Y').to_euler()


def mesh_receipt(obj):
    mesh=obj.data;mesh.calc_loop_triangles()
    bounds=[(v.co.x,v.co.z,-v.co.y) for v in mesh.vertices]
    bm=bmesh.new();bm.from_mesh(mesh)
    topology={'boundaryEdges':sum(e.is_boundary for e in bm.edges),
              'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),
              'wireEdges':sum(e.is_wire for e in bm.edges)}
    bm.free()
    return {'triangles':len(mesh.loop_triangles),'vertices':len(mesh.vertices),
            'bounds':[[min(p[k] for p in bounds) for k in range(3)],
                      [max(p[k] for p in bounds) for k in range(3)]],
            'topology':topology,'materials':len(mesh.materials),
            'hardEdges':sum(e.use_edge_sharp for e in mesh.edges),
            'reservedLowerOpening':{'x':[-44,44],'y':[0,24],'z':'entire depth'},
            'sourceBasis':'Blender Z up; glTF (x,z,-y)',
            'sourceScene':SCENE,'originalPublicExpectedSHA256':ORIGINAL_SHA}


def author_normals(mesh):
    for p in mesh.polygons:p.use_smooth=True
    if hasattr(mesh,'set_sharp_from_angle'):
        mesh.set_sharp_from_angle(angle=math.radians(38))
    else:
        bm=bmesh.new();bm.from_mesh(mesh)
        for e in bm.edges:e.smooth=(e.is_manifold and e.calc_face_angle()<math.radians(38))
        bm.to_mesh(mesh);bm.free()
    # A threshold can split only alternate triangles along an oblique fault,
    # producing a false strip of teeth. Weathered front/back faces interpolate
    # continuously; explicit perimeter/soffit/cap junctions stay hard.
    face_count=(ALONG+1)*(ACROSS+1)
    for edge in mesh.edges:
        a,b=edge.vertices
        if a<2*face_count and b<2*face_count and a//face_count==b//face_count:
            aa,bb=a%face_count,b%face_count
            ai,aj=divmod(aa,ACROSS+1);bi,bj=divmod(bb,ACROSS+1)
            edge.use_edge_sharp=(aj==bj and aj in (0,ACROSS)) or (ai==bi and ai in (0,ALONG))
    mesh.update()


def build():
    assert SCENE not in bpy.data.scenes, 'Owned scene already exists; inspect before revision.'
    scene=bpy.data.scenes.new(SCENE)
    bpy.context.window.scene=scene
    verts,faces=make_geometry()
    mesh=bpy.data.meshes.new(OBJECT+'-mesh');mesh.from_pydata(verts,[],faces);mesh.update()
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    author_normals(mesh)
    color=mesh.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
    for i,v in enumerate(mesh.vertices):color.data[i].color=vertex_value(v.co)
    mesh.color_attributes.active_color=color
    mat=bpy.data.materials.new(OBJECT+'-stone');mat.diffuse_color=(0.58,0.36,0.20,1);mat.use_nodes=True
    nodes=mat.node_tree.nodes;bsdf=nodes.get('Principled BSDF')
    attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='COLOR_0'
    mat.node_tree.links.new(attr.outputs['Color'],bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value=0.93
    mesh.materials.append(mat)
    obj=bpy.data.objects.new(OBJECT,mesh);scene.collection.objects.link(obj)
    obj.select_set(True);scene.view_layers[0].objects.active=obj
    scene.world=bpy.data.worlds.new(OBJECT+'-world');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0.17,0.21,0.29,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=0.35
    camera=bpy.data.objects.new(OBJECT+'-camera',bpy.data.cameras.new(OBJECT+'-camera'))
    scene.collection.objects.link(camera);scene.camera=camera;camera.data.lens=48
    for name,location,energy,size,color in (
        ('key',(-90,-110,165),190000,95,(1.0,0.75,0.49)),
        ('fill',(80,-85,95),65000,110,(0.52,0.65,1.0)),
        ('rim',(20,60,125),170000,85,(1.0,0.69,0.37))):
        data=bpy.data.lights.new(OBJECT+'-'+name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
        light=bpy.data.objects.new(data.name,data);scene.collection.objects.link(light);light.location=location;point_at(light,(0,0,45))
    available={x.identifier for x in scene.render.bl_rna.properties['engine'].enum_items}
    scene.render.engine='BLENDER_EEVEE' if 'BLENDER_EEVEE' in available else 'BLENDER_EEVEE_NEXT'
    scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    scene.view_settings.view_transform='AgX'
    receipt=mesh_receipt(obj)
    assert receipt['triangles']<=30000
    assert receipt['topology']['nonManifoldEdges']==0
    print('ARCH_V2_GEOMETRY_RECEIPT='+json.dumps(receipt))


def export():
    scene=bpy.data.scenes[SCENE];bpy.context.window.scene=scene
    bpy.ops.object.select_all(action='DESELECT')
    obj=scene.objects[OBJECT];obj.select_set(True);scene.view_layers[0].objects.active=obj
    path=SOURCE+'/canyon-arch-v2b-source.glb'
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,
        use_active_scene=True,export_extras=False,export_animations=False,
        export_cameras=False,export_lights=False,export_yup=True,
        export_normals=True,export_texcoords=False,export_materials='EXPORT')
    print(json.dumps({'path':path,'receipt':mesh_receipt(obj)}))


def render(view):
    scene=bpy.data.scenes[SCENE];bpy.context.window.scene=scene
    camera=scene.camera;camera.data.type='PERSP';camera.data.lens=48
    if view=='front':camera.location=(0,-270,88);target=(0,0,47)
    elif view=='quarter':camera.location=(148,-223,125);target=(0,0,45)
    elif view=='underside':camera.location=(34,-114,16);target=(-2,2,55);camera.data.lens=24
    else:raise ValueError(view)
    point_at(camera,target);scene.render.filepath=OUTPUT+'/'+view+'.png'
    bpy.ops.render.render(write_still=True)
    print(json.dumps({'render':scene.render.filepath,'camera':list(camera.location),'target':target,
                      'engine':scene.render.engine,'geometry':OBJECT,'material':'vertex color, actual area lights'}))


def dispatch(action):
    # Snapshot exact ordinary local state; never use driver_namespace and
    # never select/deselect or mutate objects in the user's scene.
    window=bpy.context.window
    old_scene=window.scene;old_layer=window.view_layer
    old_active=old_layer.objects.active
    old_selection=[o for o in old_layer.objects if o.select_get(view_layer=old_layer)]
    before={'scene':old_scene.name,'viewLayer':old_layer.name,'active':old_active.name if old_active else None,
            'selected':sorted(o.name for o in old_selection),'objectCount':len(old_scene.objects)}
    try:
        if action=='build':build()
        elif action=='export':export()
        elif action=='refine-normals':
            author_normals(bpy.data.scenes[SCENE].objects[OBJECT].data)
            print('ARCH_V2_GEOMETRY_RECEIPT='+json.dumps(mesh_receipt(bpy.data.scenes[SCENE].objects[OBJECT])))
        elif action=='inspect':print(json.dumps(mesh_receipt(bpy.data.scenes[SCENE].objects[OBJECT])))
        else:render(action)
    finally:
        window.scene=old_scene;window.view_layer=old_layer
        # Assigning the old layer/scene preserves selection. Only restore it
        # if Blender's operator context unexpectedly changed it.
        current={o for o in old_layer.objects if o.select_get(view_layer=old_layer)}
        if current!=set(old_selection):
            for o in current-set(old_selection):o.select_set(False,view_layer=old_layer)
            for o in set(old_selection)-current:o.select_set(True,view_layer=old_layer)
        old_layer.objects.active=old_active
        after={'scene':window.scene.name,'viewLayer':window.view_layer.name,
               'active':old_layer.objects.active.name if old_layer.objects.active else None,
               'selected':sorted(o.name for o in old_layer.objects if o.select_get(view_layer=old_layer)),
               'objectCount':len(window.scene.objects)}
        assert before==after, 'Blender user context changed.'
        print(json.dumps({'contextPreserved':True,'before':before,'after':after}))


dispatch('build')
