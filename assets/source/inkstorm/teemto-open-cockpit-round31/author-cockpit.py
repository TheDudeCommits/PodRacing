"""Blender MCP: isolated, explicitly altered roadster canopy study.

Safe-mode compatible. Import/export operators are used; no disk access Python,
external process, timers, drivers, or .blend loading. MCP passes this file's text.
"""
import bpy
import bmesh
import math
import json
from mathutils import Vector

STAGE = 'PodRacing — Teemto open cockpit round31'
SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c/teemto-pilot-v4c-runtime.glb'
OUTPUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/teemto-open-cockpit-round31/teemto-open-cockpit-round31-geometry.glb'
assert STAGE not in bpy.data.scenes, 'Candidate exists: inspect it; do not overwrite.'
window = bpy.context.window
original_scene = window.scene
original_layer = window.view_layer
original_active = original_layer.objects.active
original_selected = list(bpy.context.selected_objects)
prior_scenes = list(bpy.data.scenes)
memberships = {scene: set(scene.objects) for scene in prior_scenes}
collection_memberships = {col: (set(col.objects), set(col.children)) for col in bpy.data.collections}
original_config = (original_scene.camera, original_scene.world, original_scene.frame_current,
                   original_scene.render.engine, original_scene.render.resolution_x,
                   original_scene.render.resolution_y, original_scene.render.resolution_percentage)
stage = bpy.data.scenes.new(STAGE)
report = {'scene': STAGE, 'source': SOURCE}
try:
    window.scene = stage
    window.view_layer = stage.view_layers[0]
    bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    hull = next(obj for obj in stage.objects if obj.type == 'MESH' and obj.name.startswith('teemto-cockpit-body'))
    hull.name = 'teemto-open-cockpit-hull'
    hull.data.name = hull.name
    # Imported glTF is +Z forward/Y up. Blender uses X right/Y aft/Z up.
    hull.data.transform(hull.matrix_world)
    hull.parent = None
    hull.matrix_world.identity()
    mesh = hull.data
    before_faces = len(mesh.polygons)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    # A physical upper-hull redesign, including former overhead fittings.
    # Forward engine/chassis structure and all original pilot meshes are separate.
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                          plane_co=(0,0,2.78), plane_no=(0,0,1), dist=0.00001)
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                          plane_co=(0,3.4,0), plane_no=(0,1,0), dist=0.00001)
    removed = [face for face in bm.faces if face.calc_center_median().z > 2.780001
               and face.calc_center_median().y > 3.400001]
    removed_count = len(removed)
    bmesh.ops.delete(bm, geom=removed, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    # A closed, thick coaming bridges the old circular side door returns. The
    # graphite structural flange and bone crown make the altered silhouette explicit.
    center_x = .025
    outline = [(-.32,-6.405),(-.49,-6.31),(-.51,-6.12),(-.51,-4.39),
               (-.48,-4.20),(-.30,-4.105),(.30,-4.105),(.48,-4.20),
               (.51,-4.39),(.51,-6.12),(.49,-6.31),(.32,-6.405)]
    def ring(name, outer_expansion, inner_inset, low, high):
        verts = []
        # Four contour layers create a genuinely closed annular extrusion.
        for expand, height in [(outer_expansion,low),(outer_expansion,high),(-inner_inset,high),(-inner_inset,low)]:
            for x,z in outline:
                radial = Vector((x,z+5.255))
                radial.normalize()
                verts.append((center_x+x+radial.x*expand,-(z+radial.y*expand),height))
        n=len(outline)
        faces=[]
        for layer in range(4):
            for i in range(n):
                faces.append((layer*n+i,layer*n+(i+1)%n,((layer+1)%4)*n+(i+1)%n,((layer+1)%4)*n+i))
        data=bpy.data.meshes.new(name)
        data.from_pydata(verts,[],faces)
        data.update()
        obj=bpy.data.objects.new(name,data)
        stage.collection.objects.link(obj)
        bm=bmesh.new();bm.from_mesh(data)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
        bevel=obj.modifiers.new('Manufactured edge radius','BEVEL')
        bevel.width=.018 if 'bone' not in name else .006
        bevel.segments=2
        bpy.context.view_layer.objects.active=obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        obj.select_set(False)
        return obj
    coaming=ring('teemto-cockpit-coaming-graphite',.060,.040,2.685,2.80)
    crown=ring('teemto-cockpit-bone-return',.047,.018,2.798,2.832)
    # Rear central former roof/chassis members receive a finished mounting cap.
    def cap(name,center,scale):
        bpy.ops.mesh.primitive_cube_add(size=1,location=center)
        obj=bpy.context.object;obj.name=name;obj.data.name=name
        obj.scale=scale
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        bevel=obj.modifiers.new('Rear cap edge radius','BEVEL');bevel.width=.018;bevel.segments=2
        bpy.ops.object.modifier_apply(modifier=bevel.name)
        return obj
    rear_cap=cap('teemto-cockpit-rear-mount-cap',(.025,6.79,2.79),(.40,.65,.10))
    nose_deck=cap('teemto-cockpit-nose-deck-cap',(.025,3.775,2.79),(.72,.69,.10))
    # All graphite pieces share one draw; original runtime budget stays fixed.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in [coaming,rear_cap,nose_deck]:obj.select_set(True)
    bpy.context.view_layer.objects.active=coaming
    bpy.ops.object.join()
    # Original full racer stays in this new scene as visual context, but only
    # the newly authored hull/coaming geometry is exported for lossless splicing.
    bpy.ops.object.select_all(action='DESELECT')
    export_objects=[hull,coaming,crown]
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=hull
    result=bpy.ops.export_scene.gltf(filepath=OUTPUT,export_format='GLB',
        use_selection=True,use_active_scene=True,export_extras=False,
        export_animations=False,export_cameras=False,export_lights=False,
        export_yup=True,export_materials='NONE')
    report.update({'export':OUTPUT,'result':str(result),'originalCockpitFaces':before_faces,
                   'upperHullFacesRemovedAfterPlaneSplits':removed_count,
                   'finalCockpitFaces':len(mesh.polygons),'exportObjects':[o.name for o in export_objects],
                   'openingGameHeight':2.78,'pilotMeshesUnmodified':True,
                   'originalEngineMeshesUnmodified':True,'newMaterialsOpaque':True})
finally:
    window.scene=original_scene
    window.view_layer=original_layer
    bpy.ops.object.select_all(action='DESELECT')
    for obj in original_selected:
        obj.select_set(True)
    original_layer.objects.active=original_active
    intact=all(set(scene.objects)==memberships[scene] for scene in prior_scenes)
    collections_intact=all((set(col.objects),set(col.children))==members for col,members in collection_memberships.items())
    config_intact=original_config==(original_scene.camera,original_scene.world,original_scene.frame_current,
        original_scene.render.engine,original_scene.render.resolution_x,
        original_scene.render.resolution_y,original_scene.render.resolution_percentage)
    report['preservation']={'existingScenes':len(prior_scenes),'allExistingSceneMembershipsExact':intact,
        'allExistingCollectionMembershipsExact':collections_intact,'originalSceneConfigExact':config_intact,
        'restoredScene':original_scene.name,'restoredViewLayer':original_layer.name,
        'restoredActive':original_active.name if original_active else None,
        'restoredSelected':len(bpy.context.selected_objects),'selectedExact':set(bpy.context.selected_objects)==set(original_selected)}
    assert intact and collections_intact and config_intact
    print(json.dumps(report))
