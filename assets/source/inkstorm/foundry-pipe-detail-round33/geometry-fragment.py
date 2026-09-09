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
