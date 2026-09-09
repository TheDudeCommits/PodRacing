"""Blender MCP source-only V2: sculpted painted cowling, side fillets and panel joins."""
import bpy
import bmesh
import math
import json
from mathutils import Vector

STAGE='PodRacing — Teemto open cockpit round31 V2 UV finish'
SOURCE='/Users/amir/Projects/PodRacing/assets/source/inkstorm/teemto-open-cockpit-round31/teemto-open-cockpit-round31-candidate.glb'
OUTPUT='/Users/amir/Projects/PodRacing/assets/source/inkstorm/teemto-open-cockpit-round31/v2/teemto-open-cockpit-round31-v2-geometry.glb'
assert STAGE not in bpy.data.scenes
window=bpy.context.window;original=window.scene;layer=window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
memberships={s:set(s.objects) for s in bpy.data.scenes}
collections={c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
stage=bpy.data.scenes.new(STAGE)
report={'scene':STAGE,'source':SOURCE,'newTextures':0,'pilotOrEngineRelocated':False}
try:
    window.scene=stage;window.view_layer=stage.view_layers[0]
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    hull=next(o for o in stage.objects if o.type=='MESH' and o.name.startswith('teemto-cockpit-body'))
    hull.name='teemto-open-cockpit-hull-v2';hull.data.name=hull.name
    hull.data.transform(hull.matrix_world);hull.parent=None;hull.matrix_world.identity()
    old_trim=[o for o in stage.objects if o.name.startswith(('teemto-cockpit-bone-return','teemto-cockpit-coaming-graphite'))]
    for obj in old_trim:bpy.data.objects.remove(obj,do_unlink=True)
    tail=[(-6.22,.56,2.76,1.26),(-6.44,.60,2.79,1.16),(-6.66,.55,2.65,1.13),
          (-6.91,.41,2.39,1.10),(-7.18,.23,1.94,1.06),(-7.39,.075,1.29,1.055)]
    nose=[(-4.20,.53,2.80,2.36),(-3.99,.51,2.78,2.34),(-3.73,.39,2.65,2.29),
          (-3.45,.27,2.49,2.22),(-3.17,.17,2.385,2.17),(-3.08,.115,2.34,2.165)]
    def interpolate(rows,z):
        rows=sorted(rows)
        if z<=rows[0][0]:return rows[0][1:]
        if z>=rows[-1][0]:return rows[-1][1:]
        for a,b in zip(rows,rows[1:]):
            if a[0]<=z<=b[0]:
                t=(z-a[0])/(b[0]-a[0]);return tuple(a[k]+t*(b[k]-a[k]) for k in range(1,4))
    adjusted=0
    for v in hull.data.vertices:
        game_z=-v.co.y
        if abs(v.co.x-.025)>.68:continue
        rows=tail if game_z<-6.27 else nose if -4.17<game_z<-3.08 else None
        if rows:
            width,top,bottom=interpolate(rows,game_z)
            if v.co.z>top-.065:
                v.co.z=top-.065;adjusted+=1
    hull.data.update()
    shell=[];dark=[]
    blue=(.635,.691,.745,.845)
    ivory=(.325,.342,.750,.860)
    def make(name,verts,faces,group,patch=None):
        data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
        bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
        obj=bpy.data.objects.new(name,data);stage.collection.objects.link(obj)
        if patch:
            uv=data.uv_layers.new(name='UVMap')
            lows=[min(v[k] for v in verts) for k in range(3)]
            highs=[max(v[k] for v in verts) for k in range(3)]
            for polygon in data.polygons:
                normal_values=[abs(polygon.normal[k]) for k in range(3)]
                dominant=normal_values.index(max(normal_values))
                axes=[k for k in range(3) if k!=dominant]
                for index in polygon.loop_indices:
                    v=data.vertices[data.loops[index].vertex_index].co
                    u=(v[axes[0]]-lows[axes[0]])/max(.001,highs[axes[0]]-lows[axes[0]])
                    w=(v[axes[1]]-lows[axes[1]])/max(.001,highs[axes[1]]-lows[axes[1]])
                    uv.data[index].uv=(patch[0]+u*(patch[1]-patch[0]),patch[2]+w*(patch[3]-patch[2]))
        for p in data.polygons:p.use_smooth=True
        group.append(obj);return obj
    profile=[(0,1),(.6,.985),(.92,.82),(1,.55),(.94,.20),(.55,0),
             (0,0),(-.55,0),(-.94,.20),(-1,.55),(-.92,.82),(-.6,.985)]
    def loft(name,rows):
        verts=[]
        for z,width,top,bottom in rows:
            for x,y in profile:verts.append((.025+x*width,-z,bottom+y*(top-bottom)))
        count=len(profile);faces=[]
        for row in range(len(rows)-1):
            for i in range(count):faces.append((row*count+i,row*count+(i+1)%count,(row+1)*count+(i+1)%count,(row+1)*count+i))
        faces += [tuple(reversed(range(count))),tuple((len(rows)-1)*count+i for i in range(count))]
        return make(name,verts,faces,shell,blue)
    tail_object=loft('V2 tapered rear shoulder and spine fairing',tail)
    nose_object=loft('V2 low tapered forward cowling',nose)
    # The collar flares into the old circular side shell rather than hovering
    # on its cut edge. The cavity and driver anchors retain their original size.
    outline=[(0,-6.455),(-.34,-6.395),(-.49,-6.24),(-.545,-5.94),(-.56,-5.58),
             (-.56,-4.79),(-.525,-4.47),(-.43,-4.20),(-.27,-4.065),(0,-4.02),
             (.27,-4.065),(.43,-4.20),(.525,-4.47),(.56,-4.79),(.56,-5.58),
             (.545,-5.94),(.49,-6.24),(.34,-6.395)]
    def ring(name,levels,group,patch=None):
        verts=[]
        for expand,height in levels:
            for x,z in outline:
                radial=Vector((x,z+5.24));radial.normalize()
                verts.append((.025+x+radial.x*expand,-z-radial.y*expand,height))
        n=len(outline);faces=[]
        for row in range(len(levels)):
            for i in range(n):faces.append((row*n+i,row*n+(i+1)%n,((row+1)%len(levels))*n+(i+1)%n,((row+1)%len(levels))*n+i))
        return make(name,verts,faces,group,patch)
    ring('V2 cobalt collar and shaped side fillets',[(-.035,2.81),(-.035,2.59),(.09,2.31),(.14,2.47),(.115,2.64),(.045,2.81)],shell,blue)
    ring('V2 weathered ivory crown',[(-.037,2.81),(-.033,2.837),(.049,2.837),(.056,2.805)],shell,ivory)
    ring('V2 recessed graphite cockpit liner',[(-.039,2.82),(-.061,2.798),(-.061,2.57),(-.034,2.575)],dark)
    # Surface-height interpolation follows the rounded loft crown exactly.
    def surface(rows,x,z):
        obj=tail_object if rows is tail else nose_object
        hit,location,normal,index=obj.ray_cast(Vector((.025+x,-z,5)),Vector((0,0,-1)))
        assert hit, 'Panel feature must be supported by the actual cowling mesh'
        return location.z
    def panel(name,points,rows):
        # A narrow seam follows ray-tested surface heights, replacing the
        # earlier broad floating overlay on the curved loft.
        verts=[];faces=[]
        for a,b in zip(points,points[1:]+points[:1]):
            delta=Vector((b[0]-a[0],b[1]-a[1]));perp=Vector((-delta.y,delta.x)).normalized()*.004
            offset=len(verts)
            for step in range(9):
                t=step/8;x=a[0]+delta.x*t;z=a[1]+delta.y*t
                for side in [-1,1]:
                    px=x+perp.x*side;pz=z+perp.y*side
                    verts.append((.025+px,-pz,surface(rows,px,pz)+.003))
            for step in range(8):faces.append((offset+step*2,offset+step*2+1,offset+step*2+3,offset+step*2+2))
        obj=make(name+' conforming panel seam',verts,faces,dark)
        for poly in obj.data.polygons:poly.use_smooth=False
        return [(x,z,surface(rows,x,z)+.018) for x,z in points]
    bolts=[]
    bolts+=panel('V2 aft service panel',[(-.31,-6.49),(.31,-6.49),(.25,-6.75),(.13,-7.06),(-.13,-7.06),(-.25,-6.75)],tail)
    bolts+=panel('V2 forward service panel',[(-.33,-4.02),(.33,-4.02),(.22,-3.71),(.10,-3.44),(-.10,-3.44),(-.22,-3.71)],nose)
    # Bolt proportions are kept small relative to the 0.4 m helmet.
    for i,(x,z,height) in enumerate(bolts):
        radius=.015
        verts=[]
        for h,r in [(height-.008,radius),(height+.002,radius),(height+.006,radius*.72)]:
            for k in range(8):
                a=k*2*math.pi/8;verts.append((.025+x+math.cos(a)*r,-z+math.sin(a)*r,h))
        faces=[]
        for row in range(2):
            for k in range(8):faces.append((row*8+k,row*8+(k+1)%8,(row+1)*8+(k+1)%8,(row+1)*8+k))
        faces.append(tuple(range(16,24)))
        make('V2 service fastener '+str(i),verts,faces,shell,ivory)
    # One painted hull draw and one dark liner/join draw; no new texture bytes.
    hull.data.materials.clear()
    for obj in shell:obj.data.materials.clear()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [hull]+shell:obj.select_set(True)
    bpy.context.view_layer.objects.active=hull;bpy.ops.object.join()
    hull.name='teemto-open-cockpit-hull-v2';hull.data.name=hull.name
    bpy.ops.object.select_all(action='DESELECT')
    for obj in dark:obj.select_set(True)
    bpy.context.view_layer.objects.active=dark[0];bpy.ops.object.join()
    liner=bpy.context.object;liner.name='teemto-cockpit-graphite-v2';liner.data.name=liner.name
    bpy.ops.object.select_all(action='DESELECT')
    hull.select_set(True);liner.select_set(True);bpy.context.view_layer.objects.active=hull
    result=bpy.ops.export_scene.gltf(filepath=OUTPUT,export_format='GLB',use_selection=True,
        use_active_scene=True,export_materials='NONE',export_extras=False,
        export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
    report.update({'export':OUTPUT,'result':str(result),'clampedUnderlyingHullVertices':adjusted,
                   'addedServiceFasteners':len(bolts),'newGeometryDraws':2,
                   'texturePatchUVs':{'cobalt':blue,'ivory':ivory},
                   'construction':'Closed tapered fore/aft lofts; flared painted collar; ivory crown; dark liner and recessed service-panel joins'})
finally:
    window.scene=original;window.view_layer=layer
    bpy.ops.object.select_all(action='DESELECT')
    for obj in selected:obj.select_set(True)
    layer.objects.active=active
    intact=all(set(s.objects)==items for s,items in memberships.items())
    collections_intact=all((set(c.objects),set(c.children))==items for c,items in collections.items())
    assert intact and collections_intact
    report['preservation']={'existingScenes':len(memberships),'allExistingSceneMembershipsExact':intact,
        'allExistingCollectionMembershipsExact':collections_intact,'restoredScene':original.name,
        'restoredLayer':layer.name,'restoredActive':active.name if active else None,
        'restoredSelected':len(bpy.context.selected_objects),'selectedExact':set(selected)==set(bpy.context.selected_objects)}
    print(json.dumps(report))
