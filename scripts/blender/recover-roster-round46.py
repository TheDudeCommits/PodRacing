"""Isolated, reproducible source-preserving roster exports. Run with --background --factory-startup.
Never opens or saves the user's interactive Blender scene. Original sources stay byte-identical.
"""
import bpy, json, math, hashlib, sys
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/inkstorm/vehicles'; RECEIPTS=ROOT/'assets/source/inkstorm/roster-round46'; RECEIPTS.mkdir(exist_ok=True)
SPECS=[
 dict(id='verdigris',uid='4022e489f3d74eebb0aa3305f38dcc3f',scale=1.48,centerX=0,rearY=2.339,floor=.2104,seat=[0,1.15,2.05],pilotScale=1.15,exhaust=[[-2.95,-5.5,1.17],[2.95,-5.5,1.17]],coupling=[[-1.65,-7.6,1.3],[1.65,-7.6,1.3]]),
 dict(id='skybolt',uid='dac6d14dcf914e88af8625b59f4020bc',scale=2.0,centerX=0,rearY=1.2491,floor=-1.3801,seat=[0,.30,.015],pilotScale=1.05,exhaust=[[-1.54,-3.4,-.6],[1.54,-3.4,-.6]],coupling=[[-1,-7.6,-.6],[1,-7.6,-.6]],atlas=True),
 dict(id='needle',uid='5a927a9fa0984371bd970b31f5f06086',scale=1.32,centerX=-.51385,rearY=7.1551,floor=.2008,seat=[-.51385,3.0,2.35],pilotScale=1.1,exhaust=[[-3.48,-2.5,2],[2.45,-2.5,2]],coupling=[[-2.4,-3.6,2],[1.4,-3.6,2]]),
 dict(id='pog',uid='c0d192c145a44459a454627708e46cf5',scale=.61,centerX=0,rearY=4.371,floor=.0002,seat=None,pilotScale=1,exhaust=[[0,4.1,2.3]],coupling=[]),
]
manifest=json.loads((ROOT/'assets/source/inkstorm/vehicle-manifest.json').read_text())

def select(obs):
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0]
def tris(o):o.data.calc_loop_triangles();return len(o.data.loop_triangles)
def simplify(o,budget):
 n=tris(o)
 if n<=budget:return
 select([o]);mod=o.modifiers.new('Runtime triangle budget','DECIMATE');mod.ratio=budget/n;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
def gltfpoint(v):return [round(v.x,5),round(v.z,5),round(-v.y,5)]

for spec in SPECS:
 if '--' in sys.argv and spec['id'] not in sys.argv[sys.argv.index('--')+1:]:continue
 bpy.ops.wm.read_factory_settings(use_empty=True)
 source=ROOT/f"assets/source/inkstorm/vehicles/{spec['uid']}/source-imported.glb"
 before=hashlib.sha256(source.read_bytes()).hexdigest()
 bpy.ops.import_scene.gltf(filepath=str(source));bpy.context.view_layer.update()
 body=[o for o in bpy.context.scene.objects if o.type=='MESH']
 transform=Matrix.Translation((-spec['centerX']*spec['scale'],6-spec['rearY']*spec['scale'],.15-spec['floor']*spec['scale'])) @ Matrix.Scale(spec['scale'],4)
 for o in body:
  w=o.matrix_world.copy();o.parent=None;o.data.transform(transform@w);o.matrix_world=Matrix.Identity(4)
 # Resize embedded source textures before export; do not mutate external files.
 for im in bpy.data.images:
  if im.size[0]>1024 or im.size[1]>1024:
   r=1024/max(im.size);im.scale(max(1,round(im.size[0]*r)),max(1,round(im.size[1]*r)));im.pack()
 for mat in bpy.data.materials:
  if not mat.use_nodes:continue
  bs=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if bs:
   # Runtime uses opaque surfaces. Skybolt's small windscreen retains its blue pigment.
   for link in list(bs.inputs['Alpha'].links):mat.node_tree.links.remove(link)
   bs.inputs['Alpha'].default_value=1
   bs.inputs['Metallic'].default_value=min(.65,bs.inputs['Metallic'].default_value)
 # Join compatible primitives: no atlas changes for 3/4 recovered models.
 groups={}
 for o in body:groups.setdefault(o.data.materials[0].name if o.data.materials else 'empty',[]).append(o)
 merged=[]
 for i,obs in enumerate(groups.values()):
  select(obs);bpy.ops.object.join();obj=bpy.context.object;obj.name=f"{spec['id']}-body-{i}";merged.append(obj)
 body=merged
 if spec.get('atlas'):
  # Bake the existing diffuse pigments into one draw; nothing is repainted.
  select(body);bpy.ops.object.join();o=bpy.context.object;body=[o];o.name=spec['id']+'-body-0'
  uv=o.data.uv_layers.new(name='RuntimeAtlas');o.data.uv_layers.active=uv
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
  image=bpy.data.images.new(spec['id']+'-color',width=2048,height=2048,alpha=False)
  for mat in o.data.materials:
   nt=mat.node_tree
   # Imported map nodes continue sampling their original UV layer.
   for n in list(nt.nodes):
    if n.type=='TEX_IMAGE' and not n.inputs['Vector'].is_linked:
     uvn=nt.nodes.new('ShaderNodeUVMap');uvn.uv_map=o.data.uv_layers[0].name;nt.links.new(uvn.outputs['UV'],n.inputs['Vector'])
   node=nt.nodes.new('ShaderNodeTexImage');node.image=image;nt.nodes.active=node
  scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.margin=8;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
  bpy.ops.object.bake(type='DIFFUSE')
  mat=bpy.data.materials.new(spec['id']+' recovered pigment atlas');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=image;mat.node_tree.links.new(tx.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Metallic'].default_value=.45;bs.inputs['Roughness'].default_value=.5
  o.data.materials.clear();o.data.materials.append(mat)
  for poly in o.data.polygons:poly.material_index=0
  old=[x.name for x in o.data.uv_layers if x.name!='RuntimeAtlas']
  for name in old:o.data.uv_layers.remove(o.data.uv_layers[name])
  image.pack()
 total=sum(tris(o) for o in body)
 for o in body:simplify(o,max(64,int(41000*tris(o)/max(1,total))))
 pilot=[]
 if spec['seat']:
  existing=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/'teemto-hero-open-v2.glb'));bpy.context.view_layer.update()
  added=[o for o in bpy.context.scene.objects if o not in existing]
  pilot=[o for o in added if o.type=='MESH' and o.name.startswith('teemto-pilot-')]
  target=transform@Vector(spec['seat']);fit=Matrix.Translation(target) @ Matrix.Scale(spec['pilotScale'],4) @ Matrix.Translation((0,-5.2,-2.2))
  for i,o in enumerate(pilot):
   w=o.matrix_world.copy();o.parent=None;o.data.transform(fit@w);o.matrix_world=Matrix.Identity(4);o.name=f"{spec['id']}-pilot-{i}"
  for o in added:
   if o not in pilot:bpy.data.objects.remove(o,do_unlink=True)
 objects=body+pilot
 anchors={'pilot':gltfpoint(transform@Vector(spec['seat'])) if spec['seat'] else [0,6,-3]}
 for label,v in zip(['exhaustLeft','exhaustRight'],spec['exhaust']):anchors[label]=gltfpoint(transform@Vector(v))
 for label,v in zip(['couplingLeft','couplingRight'],spec['coupling']):anchors[label]=gltfpoint(transform@Vector(v))
 rec={'id':spec['id'],'uid':spec['uid'],'sourceSha256':before,'normalization':spec,'attachments':anchors,'variants':{}}
 for lod in ['hero','rival']:
  if lod=='rival':
   for o in body:simplify(o,max(64,int(tris(o)*.4)))
   for o in pilot:simplify(o,max(64,int(tris(o)*.5)))
  select(objects);path=OUT/f"{spec['id']}-{lod}-v1.glb"
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=False,export_extras=False,export_tangents=True,export_cameras=False,export_lights=False)
  bounds=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
  rec['variants'][lod]={'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'triangles':sum(tris(o) for o in objects),'bodyDraws':len(body),'pilotDraws':len(pilot),'blenderBounds':[[min(v[i] for v in bounds) for i in range(3)],[max(v[i] for v in bounds) for i in range(3)]]}
 assert hashlib.sha256(source.read_bytes()).hexdigest()==before
 (RECEIPTS/f"{spec['id']}.json").write_text(json.dumps(rec,indent=2)+'\n')
 print('ROSTER_READY',spec['id'],rec['variants'],flush=True)
