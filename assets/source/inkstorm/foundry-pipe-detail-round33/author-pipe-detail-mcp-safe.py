"""PREPARED SOURCE ONLY: execute literally through Blender MCP after caller release.

Imports preserved pipe-bank GLB into a new scene and retains every source
triangle, color and normal. Adds original pressure-vessel construction only.
No existing scene, object, material, collision or connected mouth is edited.
No filesystem API, texture, shared blend save, bake or runtime copy is used.
Caller must verify the external source SHA256 receipt before invoking this file.
"""
import bpy
import math
import json
import collections
from mathutils import Vector, Matrix

SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-pipe-detail-round33/predecessors/pipe-bank-round32.glb'
SOURCE_SHA256 = '4b3510d0f8b10e1a44158edb0b0bbdc25bac33019176368638937ab1834a3b81'
STAGE = 'PodRacing — Foundry pipe detail round33 V1'
FAMILY = 'pipe-bank-detail-v1'
TRIANGLE_CAP = 20000
RETAINED_TRIANGLES = 7160
BOUNDS = [(-47,47),(-20.20081901550293,23),(0,51)]
SOCKETS = [((-42,-9,7),(-1,0,0),3.0),((-38,-13,19),(-1,0,0),1.8),((8,-10,30),(-1,0,0),2.25)]
TERMINALS = [((1,-9,38),(0,0,1),3.0),((-10,-13,3),(0,0,-1),1.8),((37,-10,10),(0,0,-1),2.25)]
PAINT = {
    'ink': (.040,.045,.085), 'shadow': (.105,.095,.165),
    'cobalt': (.075,.18,.29), 'steel': (.19,.25,.29),
    'coral': (.80,.225,.10), 'rust': (.42,.095,.055),
    'cream': (.86,.68,.40), 'pale': (.96,.83,.59),
    'cyan': (.10,.87,.79), 'warm': (1.0,.61,.16),
}


def add(a, b): return tuple(x+y for x, y in zip(a, b))
def sub(a, b): return tuple(x-y for x, y in zip(a, b))
def mul(a, k): return tuple(x*k for x in a)
def dot(a, b): return sum(x*y for x, y in zip(a, b))
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def unit(a):
    length = math.sqrt(dot(a, a))
    assert length > 1e-9
    return mul(a, 1/length)


def frame(a, b):
    n = unit(sub(b, a))
    u = unit(cross(n, (0, 0, 1) if abs(n[2]) < .94 else (0, 1, 0)))
    return n, u, cross(n, u)


def new_geometry():
    return {'vertices': [], 'faces': [], 'colors': [], 'smooth': [], 'groups': []}


def part(data, vertices, faces, color, group, smooth=False):
    offset = len(data['vertices'])
    data['vertices'].extend(tuple(p) for p in vertices)
    base = PAINT[color] if isinstance(color, str) else color
    for face in faces:
        data['faces'].append(tuple(offset+i for i in face))
        data['colors'].append((*base, 1.0))
        data['smooth'].append(smooth)
        data['groups'].append(group)


def box(data, center, size, color, group):
    x, y, z = center
    w, d, h = [v*.5 for v in size]
    vertices = [(x-w,y-d,z-h),(x+w,y-d,z-h),(x+w,y+d,z-h),(x-w,y+d,z-h),
                (x-w,y-d,z+h),(x+w,y-d,z+h),(x+w,y+d,z+h),(x-w,y+d,z+h)]
    part(data, vertices, [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)], color, group)


def tube(data, a, b, radius, color, group, sides=8, radius_end=None):
    _, u, v = frame(a, b)
    vertices = []
    for p, r in [(a, radius), (b, radius if radius_end is None else radius_end)]:
        for i in range(sides):
            t = math.tau*i/sides
            vertices.append(add(p, mul(add(mul(u, math.cos(t)), mul(v, math.sin(t))), r)))
    part(data, vertices, [tuple(reversed(range(sides))), tuple(range(sides, 2*sides))], color, group)
    part(data, vertices, [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)], color, group, sides >= 8)


def beam(data, a, b, width, color, group):
    tube(data, a, b, width*.7071, color, group, 4)


def ring(data, center, axis, outer, inner, depth, color, group, sides=12):
    """Closed annulus: a pipe flange has a real bore, not a blocking disk."""
    n, u, v = frame(center, add(center, axis))
    vertices = []
    for longitudinal, radius in [(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)]:
        for i in range(sides):
            t = math.tau*i/sides
            vertices.append(add(add(center, mul(n, longitudinal)),
                                mul(add(mul(u, math.cos(t)), mul(v, math.sin(t))), radius)))
    faces = []
    for k in range(sides):
        j = (k+1)%sides
        faces.extend([(k,j,sides+j,sides+k), (2*sides+j,2*sides+k,3*sides+k,3*sides+j),
                      (k,2*sides+k,2*sides+j,j), (sides+j,3*sides+j,3*sides+k,sides+k)])
    part(data, vertices, faces, color, group)


def sweep(data, path, radius, color, group, sides=16):
    """Connected sweep with finished caps; no intersecting straight elbow pieces."""
    vertices = []
    for i, p in enumerate(path):
        n = unit(sub(path[min(i+1,len(path)-1)], path[max(0,i-1)]))
        # These paths lie in X/Z, so a fixed lateral axis avoids frame twisting.
        u = (0, 1, 0)
        assert abs(dot(u,n)) < 1e-7
        v = cross(n, u)
        for k in range(sides):
            t = math.tau*k/sides
            vertices.append(add(p, mul(add(mul(u,math.cos(t)),mul(v,math.sin(t))),radius)))
    faces = []
    for j in range(len(path)-1):
        for k in range(sides):
            faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
    part(data, vertices, faces, color, group, True)
    part(data, vertices, [tuple(reversed(range(sides))),tuple(range((len(path)-1)*sides,len(path)*sides))], color, group)


def wedge(data, triangle, axis, depth, color, group):
    if dot(cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0])),axis)<0:
        triangle = list(reversed(triangle))
    shift = mul(unit(axis), depth*.5)
    vertices = [sub(p,shift) for p in triangle]+[add(p,shift) for p in triangle]
    part(data, vertices, [(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)], color, group)


def bolt_circle(data, center, axis, radius, length, group, count=6, bolt_radius=.17):
    n, u, v = frame(center, add(center, axis))
    for i in range(count):
        angle = math.tau*(i+.5)/count
        p = add(center, mul(add(mul(u, math.cos(angle)),mul(v, math.sin(angle))), radius))
        tube(data, sub(p,mul(n,length*.5)), add(p,mul(n,length*.5)), bolt_radius, 'cream', group, 6)


def axis_point(center, axis, distance):
    return add(center,mul(unit(axis),distance))


def dish(data, center, axis, radius, color, group, sides=16):
    """Shallow convex pressure plate, recessed behind the paired flange face."""
    n,u,v = frame(center,add(center,axis))
    verts = []
    for distance, scale in [(.10,.97),(.25,.78),(.34,.28)]:
        for i in range(sides):
            a = math.tau*i/sides
            verts.append(add(axis_point(center,n,distance),mul(add(mul(u,math.cos(a)),mul(v,math.sin(a))),radius*scale)))
    faces = []
    for row in range(2):
        for i in range(sides):
            j = (i+1)%sides
            faces.append((row*sides+i,row*sides+j,(row+1)*sides+j,(row+1)*sides+i))
    faces.append(tuple(range(2*sides,3*sides)))
    part(data,verts,faces,color,group,True)


def pressure_cap(data, center, axis, radius, group, bolts=8):
    """Two thick annular flanges, a real seam, inset dish and radial fasteners."""
    n,u,v = frame(center,add(center,axis))
    ring(data,axis_point(center,n,-.21),n,radius+.55,radius*.89,.42,'steel',group,16)
    ring(data,axis_point(center,n,.40),n,radius+.55,radius*.89,.42,'cobalt',group,16)
    ring(data,axis_point(center,n,.095),n,radius+.29,radius*.91,.12,'ink',group,16)
    dish(data,center,n,radius,'coral',group,16)
    bolt_circle(data,axis_point(center,n,.25),n,radius+.23,1.06,group,bolts,.235)
    # Opposed hinge ears and a raised crossbar give the plate a service function
    # at chase scale; no tiny etched marks or decorative glowing aperture.
    for side in [-1,1]:
        p = add(axis_point(center,n,.16),mul(u,(radius+.45)*side))
        tube(data,sub(p,mul(v,.46)),add(p,mul(v,.46)),.37,'rust',group,8)
    a = add(axis_point(center,n,.43),mul(u,-radius*.46))
    b = add(axis_point(center,n,.43),mul(u,radius*.46))
    beam(data,a,b,.25,'steel',group)


def extruded_polygon(data, points, bottom, top, color, group):
    count = len(points)
    verts = [(p[0],p[1],bottom) for p in points]+[(p[0],p[1],top) for p in points]
    faces = [tuple(reversed(range(count))),tuple(range(count,2*count))]
    for i in range(count):
        j = (i+1)%count
        faces.append((i,j,j+count,i+count))
    part(data,verts,faces,color,group)


def clip_front(points, front):
    """Keep deck extension behind old rectangular deck edge, avoiding overlap."""
    result = []
    for a,b in zip(points,points[1:]+points[:1]):
        ia,ib = a[1]>=front,b[1]>=front
        if ia: result.append(a)
        if ia!=ib:
            t = (front-a[1])/(b[1]-a[1])
            result.append((a[0]+t*(b[0]-a[0]),front))
    return result


def vessel_bands(data, x, y, radius, height, index):
    group = 'tank-'+str(index)+'-split-bands-and-lugs'
    for z in [4,12,height-7]:
        for offset in [-.40,.40]:
            ring(data,(x,y,z+offset),(0,0,1),radius+.67,radius-.08,.44,'cobalt',group,20)
        # Broad clamp lugs straddle the joint; the cream hex heads are accents
        # on a readable metal assembly, not the primary detail budget.
        for i in range(6):
            angle = math.tau*(i+.5)/6
            radial = (math.cos(angle),math.sin(angle),0)
            center = (x+radial[0]*(radius+.48),y+radial[1]*(radius+.48),z)
            beam(data,axis_point(center,(0,0,1),-.83),axis_point(center,(0,0,1),.83),.62,'steel',group)
            bolt_circle(data,center,(0,0,1),.01,1.96,group,1,.235)
    # A pair of broad longitudinal joining straps is visible between rings.
    for angle in [math.pi*1.22,math.pi*1.79]:
        radial = (math.cos(angle),math.sin(angle),0)
        a = (x+radial[0]*(radius+.055),y+radial[1]*(radius+.055),4.8)
        b = (a[0],a[1],height-7.8)
        beam(data,a,b,.22,'rust',group)


def access_deck(data, x, y, radius, z, old_width, index):
    group = 'tank-'+str(index)+'-supported-wrap-deck'
    inner,outer = radius-.13,radius+2.6
    # Current deck is exactly y[-8.5,-3.5], z[z-.3,z+.3].
    # New closed wedge segments butt to its -3.5 rear edge with no coplanar
    # top overlap. All old deck vertices/floors remain untouched.
    for i in range(12):
        a = math.pi+math.pi*i/12; b = math.pi+math.pi*(i+1)/12
        points = [(x+math.cos(a)*inner,y+math.sin(a)*inner),
                  (x+math.cos(a)*outer,y+math.sin(a)*outer),
                  (x+math.cos(b)*outer,y+math.sin(b)*outer),
                  (x+math.cos(b)*inner,y+math.sin(b)*inner)]
        points = clip_front(points,-3.5)
        if len(points)>2: extruded_polygon(data,points,z-.30,z+.30,'steel',group)
    # Side rails and toe plates are substantial enough to catch silhouette.
    for i in range(12):
        if index==2 and i in [5,6]: continue  # Small-vessel bridge entry.
        a = math.pi+math.pi*i/12; b = math.pi+math.pi*(i+1)/12
        pa = (x+math.cos(a)*outer,y+math.sin(a)*outer)
        pb = (x+math.cos(b)*outer,y+math.sin(b)*outer)
        if max(pa[1],pb[1]) < -3.5: continue
        if min(pa[1],pb[1]) < -3.5:
            t = (-3.5-pa[1])/(pb[1]-pa[1])
            cut = (pa[0]+t*(pb[0]-pa[0]),-3.5)
            if pa[1]<-3.5: pa=cut
            else: pb=cut
        for zz,width,color in [(z+.45,.20,'cobalt'),(z+2.1,.20,'cream')]:
            beam(data,(pa[0],pa[1],zz),(pb[0],pb[1],zz),width,color,group)
        beam(data,(pa[0],pa[1],z+.3),(pa[0],pa[1],z+2.1),.22,'steel',group)
    for i in range(5):
        angle = math.pi+math.pi*(i+.5)/5
        u = (math.cos(angle),math.sin(angle),0)
        inner_point = (x+u[0]*(radius-.05),y+u[1]*(radius-.05),z-4.4)
        outer_point = (x+u[0]*(outer-.18),y+u[1]*(outer-.18),z-.34)
        beam(data,inner_point,outer_point,.43,'rust',group)
        beam(data,(inner_point[0],inner_point[1],z-.35),outer_point,.34,'cobalt',group)
        # Triangular gusset beside each bracket creates a legible structural node.
        tangent = (-u[1],u[0],0)
        wedge(data,[inner_point,(inner_point[0],inner_point[1],z-1.9),outer_point],tangent,.22,'steel',group)
    # Ladder rails are reinforced over the already-present source ladder.
    ladder_x = (35 if index==2 else x)+old_width*.42
    for xx in [ladder_x-.17,ladder_x+1.17]:
        beam(data,(xx,-8,2.1),(xx,-8,z+1.0),.20,'cobalt',group)
    for zz in [5,z*.52,z-2.5]:
        beam(data,(ladder_x-.18,-8.2,zz),(ladder_x+1.18,-8.2,zz),.23,'rust',group)
    if index==2:
        # The retained small-tank rectangular deck is centered at x35 and its
        # rear edge stops at y-3.5. Two new closed quads bridge the real gap to
        # the curved platform, meeting its actual12-segment boundary exactly.
        edge_x = math.sin(math.pi/12)*outer
        edge_y = y-math.cos(math.pi/12)*outer
        center_y = y-outer
        extruded_polygon(data,[(x-edge_x,-3.5),(x,-3.5),(x,center_y),(x-edge_x,edge_y)],z-.3,z+.3,'steel',group)
        extruded_polygon(data,[(x,-3.5),(x+edge_x,-3.5),(x+edge_x,edge_y),(x,center_y)],z-.3,z+.3,'steel',group)
        for xx in [x-edge_x,x+edge_x]:
            for height,width,color in [(z+.45,.2,'cobalt'),(z+2.1,.2,'cream')]:
                beam(data,(xx,-3.5,height),(xx,edge_y,height),width,color,group)
            for yy in [-3.5,edge_y]: beam(data,(xx,yy,z+.3),(xx,yy,z+2.1),.22,'steel',group)
            beam(data,(xx,edge_y,z-3.9),(xx,-3.5,z-.34),.43,'rust',group)


def vessel_maintenance(data, x, y, radius, height, index):
    group = 'tank-'+str(index)+'-inspection-manway'
    axis = (-.65,-.7599342077,0)
    center = (x+axis[0]*(radius-.03),y+axis[1]*(radius-.03),8.0 if index==2 else height*.54)
    cap_radius = radius*.23
    # A raised reinforcement pad and thick neck tie the door into the shell.
    tube(data,axis_point(center,axis,-.22),axis_point(center,axis,.53),cap_radius+.70,'rust',group,20)
    pressure_cap(data,axis_point(center,axis,.52),axis,cap_radius,group,8)
    # Oversized hinge keeper/operating spindle deliberately reads above pixel scale.
    tube(data,axis_point(center,axis,.88),axis_point(center,axis,1.22),cap_radius*.22,'cream',group,8)
    group = 'tank-'+str(index)+'-crown-pressure-hardware'
    ring(data,(x,y,height-2),(0,0,1),radius*.68+.24,radius*.68-.1,.40,'steel',group,16)
    ring(data,(x,y,height+1.0),(0,0,1),radius*.25+.45,radius*.25-.1,.60,'cobalt',group,16)
    bolt_circle(data,(x,y,height+1.0),(0,0,1),radius*.25+.18,.96,group,6,.19)
    # Two visible lifting ears sit on the tapered crown without changing skyline.
    for a in [0,math.pi]:
        p = (x+math.cos(a)*radius*.65,y+math.sin(a)*radius*.65,height-1.55)
        ring(data,p,(math.cos(a),math.sin(a),0),.69,.37,.35,'steel',group,8)


def build_pipe_detail_geometry():
    data = new_geometry()
    for index,(x,y,r,h,z,w) in enumerate([(-27,7,10,32,24,28),(17,8,13,44,35,31),(37,11,6,22,13,18)]):
        vessel_bands(data,x,y,r,h,index)
        access_deck(data,x,y,r,z,w,index)
        vessel_maintenance(data,x,y,r,h,index)
    for index,(center,axis,radius) in enumerate(TERMINALS):
        pressure_cap(data,center,axis,radius,'free-terminal-'+str(index)+'-inset-pressure-cap',8)
    return data


def geometry_summary(data):
    groups = collections.Counter()
    for face,group in zip(data['faces'],data['groups']): groups[group]+=len(face)-2
    bounds = [[min(v[i] for v in data['vertices']),max(v[i] for v in data['vertices'])] for i in range(3)]
    new_triangles = sum(groups.values())
    return {'addedTriangles':new_triangles,'retainedTriangles':RETAINED_TRIANGLES,
            'candidateTriangles':RETAINED_TRIANGLES+new_triangles,'groups':dict(sorted(groups.items())),
            'addedBoundsBlender':bounds,'addedVertices':len(data['vertices']),
            'floorMinimumZ':min(v[2] for v in data['vertices'])}


def clip_axis(points, axis, boundary, sense):
    result = []
    for a,b in zip(points,points[1:]+points[:1]):
        da = (dot(a,axis)-boundary)*sense
        db = (dot(b,axis)-boundary)*sense
        ia,ib = da>=0,db>=0
        if ia: result.append(a)
        if ia!=ib:
            t = da/(da-db)
            result.append(add(a,mul(sub(b,a),t)))
    return result


def radial_distance(points, center, axis):
    _,u,v = frame(center,add(center,axis))
    projected = [(dot(sub(p,center),u),dot(sub(p,center),v)) for p in points]
    minimum = min(p[0]*p[0]+p[1]*p[1] for p in projected)
    signed = []; area = 0
    for a,b in zip(projected,projected[1:]+projected[:1]):
        dx,dy = b[0]-a[0],b[1]-a[1]
        t = max(0,min(1,-(a[0]*dx+a[1]*dy)/(dx*dx+dy*dy))) if dx*dx+dy*dy>1e-12 else 0
        minimum = min(minimum,(a[0]+dx*t)**2+(a[1]+dy*t)**2)
        signed.append(a[0]*b[1]-a[1]*b[0]); area+=signed[-1]
    if abs(area)>1e-10 and (min(signed)>=-1e-10 or max(signed)<=1e-10): return 0
    return math.sqrt(minimum)


def detail_clearance_receipt(data):
    """Clip actual polygons to collector reservation and connected mouth slabs."""
    socket_minimum = [None,None,None]
    for face,group in zip(data['faces'],data['groups']):
        points = [data['vertices'][i] for i in face]
        clipped = points
        for axis,boundary,sense in [((1,0,0),-4.3,1),((1,0,0),4.3,-1),((0,1,0),-21.3,1),((0,1,0),-12.7,-1)]:
            clipped = clip_axis(clipped,axis,boundary,sense)
            if not clipped: break
        assert not clipped, ('New geometry enters reserved collector column',group,clipped)
        for index,(center,axis,radius) in enumerate(SOCKETS):
            plane = dot(center,axis)
            clipped = clip_axis(points,axis,plane-1.0,1)
            if clipped: clipped = clip_axis(clipped,axis,plane+1.0,-1)
            if clipped:
                distance = radial_distance(clipped,center,axis)
                socket_minimum[index] = distance if socket_minimum[index] is None else min(socket_minimum[index],distance)
                assert distance>radius+.15, ('Added geometry obstructs connected source socket',index,group,distance)
    return {'reservedCollectorXYBlender':[[-4.3,4.3],[-21.3,-12.7]],
            'reservedCollectorAddedPolygonIntersections':0,'socketSlabHalfDepth':1.0,
            'socketMinimumAddedRadialDistance':socket_minimum,'socketProtectedRadii':[r+.15 for _,_,r in SOCKETS]}


def source_evidence(mesh, polygons):
    colors = mesh.color_attributes.active_color
    assert colors is not None and colors.domain in {'CORNER','POINT'}
    result = []
    for index in polygons:
        polygon = mesh.polygons[index]
        loops = list(polygon.loop_indices)
        result.append((tuple(tuple(mesh.vertices[mesh.loops[i].vertex_index].co) for i in loops),
                       tuple(tuple(mesh.corner_normals[i].vector) for i in loops),
                       tuple(tuple(colors.data[i if colors.domain=='CORNER' else mesh.loops[i].vertex_index].color) for i in loops),
                       polygon.use_smooth))
    return result


def validate_source_terminal(mesh, center, axis, radius, expected_triangles):
    """Attribute the actual retained terminal disk before covering a free end."""
    ids = []
    for polygon in mesh.polygons:
        points = [tuple(mesh.vertices[i].co) for i in polygon.vertices]
        if all(abs(dot(sub(p,center),axis))<2e-4 and dot(sub(p,center),sub(p,center))<=(radius+.0002)**2 for p in points):
            ids.append(polygon.index)
    assert len(ids)==expected_triangles, ('Terminal attribution drift',center,len(ids),expected_triangles)
    return {'centerBlender':center,'outwardBlender':axis,'radius':radius,'retainedDiskTriangles':len(ids)}


def execute_source_authoring():
    assert STAGE not in bpy.data.scenes, 'Version already exists; choose a new version.'
    assert bpy.context.mode=='OBJECT', 'Leave shared editing mode untouched.'
    window = bpy.context.window
    old_scene,old_layer = window.scene,window.view_layer
    old_active,old_selected = old_layer.objects.active,list(bpy.context.selected_objects)
    old_layer_collection = old_layer.active_layer_collection
    scene_members = {s:(set(s.objects),set(s.collection.children)) for s in bpy.data.scenes}
    collection_members = {c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
    old_objects,old_meshes = set(bpy.data.objects),set(bpy.data.meshes)
    old_materials,old_images = set(bpy.data.materials),set(bpy.data.images)
    stage = None; success = False
    owned_meshes = set(); owned_materials = set(); owned_images = set(); owned_collections = set()
    report = {'status':'executing source authoring','source':SOURCE,'expectedSourceSha256':SOURCE_SHA256,
              'sourceHashVerification':'External receipt required; no filesystem/hash API in MCP.',
              'newScene':STAGE,'family':FAMILY,'runtimeInstalled':False,'exported':False,'renderedAcceptance':False}
    try:
        stage = bpy.data.scenes.new(STAGE)
        window.scene = stage; window.view_layer = stage.view_layers[0]
        window.view_layer.active_layer_collection = window.view_layer.layer_collection
        try:
            result = bpy.ops.import_scene.gltf(filepath=SOURCE)
        finally:
            owned_meshes.update(set(bpy.data.meshes)-old_meshes)
            owned_materials.update(set(bpy.data.materials)-old_materials)
            owned_images.update(set(bpy.data.images)-old_images)
            owned_collections.update(set(bpy.data.collections)-set(collection_members))
        assert 'FINISHED' in result
        objects = [o for o in stage.objects if o.type=='MESH']
        assert len(objects)==1, 'Expected one original pipe-bank mesh.'
        source = objects[0]
        assert source not in old_objects and source.data not in old_meshes
        assert len(source.data.materials)==1 and source.data.materials[0] not in old_materials
        material = source.data.materials[0]
        assert material.use_nodes and not any(n.type=='TEX_IMAGE' for n in material.node_tree.nodes)
        source.data.transform(source.matrix_world)
        source.parent = None; source.matrix_world = Matrix.Identity(4)
        mesh = source.data; mesh.update(); mesh.calc_loop_triangles()
        assert len(mesh.loop_triangles)==RETAINED_TRIANGLES and all(len(p.vertices)==3 for p in mesh.polygons)
        bounds = [[min(v.co[k] for v in mesh.vertices),max(v.co[k] for v in mesh.vertices)] for k in range(3)]
        assert all(abs(bounds[k][j]-BOUNDS[k][j])<2e-4 for k in range(3) for j in range(2)), bounds
        free_receipts = []
        for (center,axis,radius),count in zip(TERMINALS,[14,10,12]):
            free_receipts.append(validate_source_terminal(mesh,center,axis,radius,count))
        socket_receipts = []
        for (center,axis,radius),count in zip(SOCKETS,[14,10,12]):
            socket_receipts.append(validate_source_terminal(mesh,center,axis,radius,count))
        retained = list(range(len(mesh.polygons)))
        before = source_evidence(mesh,retained)
        data = build_pipe_detail_geometry(); summary = geometry_summary(data)
        clearance = detail_clearance_receipt(data)
        assert summary['candidateTriangles']<=TRIANGLE_CAP, summary
        assert all(BOUNDS[k][0]<=p[k]<=BOUNDS[k][1] for p in data['vertices'] for k in range(3))
        assert min(p[2] for p in data['vertices'])>=1.2, 'Existing platform floor must remain unobstructed.'
        vertices = [tuple(v.co) for v in mesh.vertices]
        faces = [tuple(p.vertices) for p in mesh.polygons]
        source_vertex_count = len(vertices)
        vertices.extend(data['vertices'])
        faces.extend(tuple(source_vertex_count+i for i in f) for f in data['faces'])
        replacement = bpy.data.meshes.new(FAMILY+'-source'); owned_meshes.add(replacement)
        replacement.from_pydata(vertices,[],faces); replacement.update()
        replacement.materials.append(material)
        colors = replacement.color_attributes.new(name=mesh.color_attributes.active_color.name,type='FLOAT_COLOR',domain='CORNER')
        normals = []
        for polygon,evidence in zip(replacement.polygons,before):
            _,source_normals,source_colors,smooth = evidence
            polygon.use_smooth = smooth
            for loop,normal,color in zip(polygon.loop_indices,source_normals,source_colors):
                normals.append(normal); colors.data[loop].color = color
        for i,polygon in enumerate(list(replacement.polygons)[len(retained):]):
            polygon.use_smooth = data['smooth'][i]
            for loop in polygon.loop_indices:
                colors.data[loop].color = data['colors'][i]; normals.append((0,0,0))
        replacement.color_attributes.active_color = colors; replacement.update()
        # FLOAT_VECTOR/CORNER bypasses the Blender5.2 packed short2 setter drift.
        # New corners need actual computed vectors; zero is not an auto sentinel.
        retained_loops = sum(len(p.vertices) for p in mesh.polygons)
        calculated = [tuple(n.vector) for n in replacement.corner_normals]
        assert len(calculated)==len(normals)
        for i in range(retained_loops,len(normals)): normals[i]=calculated[i]
        assert all(sum(c*c for c in n)>.99 for n in normals), 'Invalid corner normal.'
        explicit_normals = replacement.attributes.new(name='custom_normal',type='FLOAT_VECTOR',domain='CORNER')
        assert explicit_normals.name=='custom_normal' and explicit_normals.data_type=='FLOAT_VECTOR'
        explicit_normals.data.foreach_set('vector',[c for normal in normals for c in normal])
        replacement.update(); replacement.calc_loop_triangles()
        after = source_evidence(replacement,retained)
        assert all(a[0]==b[0] and a[2]==b[2] and a[3]==b[3] for a,b in zip(before,after)), 'Retained position/color/winding/smoothing drift.'
        normal_error = max(abs(x-y) for a,b in zip(before,after) for n,m in zip(a[1],b[1]) for x,y in zip(n,m))
        assert normal_error<3e-5, ('Retained normal drift',normal_error)
        assert len(replacement.loop_triangles)==summary['candidateTriangles']
        final_bounds = [[min(v.co[k] for v in replacement.vertices),max(v.co[k] for v in replacement.vertices)] for k in range(3)]
        assert final_bounds==bounds, 'AABB changed.'
        source.data = replacement; source.name = FAMILY
        if mesh.users==0: owned_meshes.discard(mesh); bpy.data.meshes.remove(mesh)
        source['sourceSha256'] = SOURCE_SHA256
        source['provenance'] = 'Original authored Inkstorm pipe-bank; additive pressure-vessel detail round33. All7160 original triangles retained.'
        source['sourcePreflightPassed'] = True
        source['retainedTriangles'] = RETAINED_TRIANGLES
        source['candidateTriangles'] = summary['candidateTriangles']
        source['retainedNormalMaximumDelta'] = normal_error
        source['retainedNormalStorage'] = 'FLOAT_VECTOR/CORNER custom_normal'
        source['supportsAndFootprintsUnchanged'] = True
        source['connectedMouthsUnchanged'] = True
        source['runtimeInstalled'] = False
        source['front_axis'] = '-Y'
        report.update({'status':'isolated source scene authored; export/review pending','retainedTriangles':RETAINED_TRIANGLES,
                       'retainedPositionColorAndWindingExact':True,'retainedNormalMaximumDelta':normal_error,
                       'retainedNormalStorage':'FLOAT_VECTOR/CORNER custom_normal','sourceBoundsBlender':bounds,
                       'finalBoundsBlender':final_bounds,'newGeometry':summary,'freeTerminalAttribution':free_receipts,
                       'newGeometryClearance':clearance,
                       'untouchedConnectedMouths':socket_receipts,'meshes':1,'materials':1,'textures':0,'animations':0,
                       'materialReadOnly':True,'platformFloorUnchanged':True,'collisionUnchanged':True,
                       'tradeoffs':['Static triangle count increases; actual visible instances and FPS must be measured later.',
                                    'Existing three connected mouth disks remain exact and are covered by the established runtime tube links.',
                                    'Free-end dishes are pressure-vessel closures only; they do not claim new fluid-network connectivity.',
                                    'Original vertex-color paint remains; source and gameplay visual criticism are still required.']})
        success = True
    finally:
        window.scene = old_scene; window.view_layer = old_layer
        old_layer.active_layer_collection = old_layer_collection
        if not success and stage is not None:
            for obj in list(stage.objects):
                assert obj not in old_objects
                bpy.data.objects.remove(obj,do_unlink=True)
            bpy.data.scenes.remove(stage)
            for mesh in owned_meshes:
                if mesh.users==0: bpy.data.meshes.remove(mesh)
            for material in owned_materials:
                if material.users==0: bpy.data.materials.remove(material)
            for image in owned_images:
                if image.users==0: bpy.data.images.remove(image)
            for collection in owned_collections:
                if collection.users==0: bpy.data.collections.remove(collection)
        for obj in old_layer.objects: obj.select_set(obj in old_selected,view_layer=old_layer)
        old_layer.objects.active = old_active
        scenes_exact = all((set(s.objects),set(s.collection.children))==members for s,members in scene_members.items())
        collections_exact = all((set(c.objects),set(c.children))==members for c,members in collection_members.items())
        restored = window.scene==old_scene and window.view_layer==old_layer and old_layer.objects.active==old_active and set(bpy.context.selected_objects)==set(old_selected)
        assert scenes_exact and collections_exact and restored
        report['preservation'] = {'allExistingSceneMembershipsExact':scenes_exact,'allExistingCollectionMembershipsExact':collections_exact,
                                  'contextRestored':restored,'scene':old_scene.name,'viewLayer':old_layer.name,
                                  'active':old_active.name if old_active else None,'selectedCount':len(old_selected),
                                  'noExistingObjectsOrMaterialsEdited':True}
        print(json.dumps(report,sort_keys=True))


execute_source_authoring()
