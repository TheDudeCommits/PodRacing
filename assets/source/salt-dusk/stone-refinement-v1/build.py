"""Original bounded surface refinement; standalone Blender --background --factory-startup.
Never attaches to the shared Blender GUI and never saves a .blend file.
"""
import bpy, bmesh, json, math, hashlib, time
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path('/Users/amir/Projects/PodRacing')
STAGE=ROOT/'assets/source/salt-dusk/stone-refinement-v1'
SPECS=[('canyon-arch-v3','canyon-arch-dusk-v1',70000,'1b950e08b0004fec5590b1167a7c1f7311c0389a2d48b2e43c387c1ef82d9b01'),('wind-blade','wind-blade-dusk-v1',10000,'ba6164eb49629f3283c66e160ede136488f69bbfbf8fc8d340e72bc3a0002153')]
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def smooth(a,b,x):
 t=max(0.,min(1.,(x-a)/(b-a)));return t*t*(3-2*t)
def bounds(vs):return ([min(v[k] for v in vs)for k in range(3)],[max(v[k]for v in vs)for k in range(3)])
def topology(mesh):
 bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bm.verts.index_update();seen=set();groups=[]
 for v in bm.verts:
  if v.index in seen:continue
  q=[v];seen.add(v.index);group=[]
  while q:
   w=q.pop();group.append(w.index)
   for edge in w.link_edges:
    n=edge.other_vert(w)
    if n.index not in seen:seen.add(n.index);q.append(n)
  groups.append(group)
 stats={'vertices':len(bm.verts),'faces':len(bm.faces),'boundaryEdges':sum(e.is_boundary for e in bm.edges),'nonManifoldEdges':sum(not e.is_manifold for e in bm.edges),'components':len(groups),'signedVolume':bm.calc_volume(signed=True)}
 bm.free();return stats,groups

def build(source,name,target,expected):
 start=time.time();sourcepath=ROOT/'public/assets/inkstorm'/f'{source}.glb';assert sha(sourcepath)==expected
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(sourcepath),merge_vertices=True)
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];assert len(objects)==1
 obj=objects[0];mesh=obj.data;mesh.transform(obj.matrix_world);obj.matrix_world.identity();obj.name=name;mesh.name=name
 # Weld import seams only; triangles, color corners and source faces remain available.
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
 bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
 initial,groups=topology(mesh);assert initial['components']==(9 if source.startswith('canyon') else 1)
 points=[v.co.copy()for v in mesh.vertices];original_bounds=bounds(points)
 component={v:i for i,group in enumerate(groups)for v in group};boxes=[bounds([points[i]for i in group])for group in groups]
 faces=[list(p.vertices)for p in mesh.polygons];assert all(len(f)==3 for f in faces)
 normals=[v.normal.copy()for v in mesh.vertices]
 color=mesh.color_attributes.active_color or mesh.color_attributes[0]
 face_colors=[]
 for poly in mesh.polygons:
  face_colors.append([tuple(color.data[li if color.domain=='CORNER' else mesh.loops[li].vertex_index].color)for li in poly.loop_indices])
 bvh=BVHTree.FromPolygons(points,faces,all_triangles=True)
 face_scale=[max((points[f[a]]-points[f[b]]).length for a,b in [(0,1),(1,2),(2,0)])for f in faces]
 vertex_scale=[0.]*len(points)
 for fi,f in enumerate(faces):
  for vi in f:vertex_scale[vi]=max(vertex_scale[vi],face_scale[fi])
 # The original procedural blade has an open underground toe. Close that toe,
 # at its unchanged Z=-2 base, before subdividing. Arch components stay separate.
 bm=bmesh.new();bm.from_mesh(mesh)
 boundary=[e for e in bm.edges if e.is_boundary]
 if boundary:
  assert source=='wind-blade' and len(boundary)==18
  bmesh.ops.holes_fill(bm,edges=boundary,sides=0)
  bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 iterations=[]
 for iteration in range(8):
  remaining=(target-len(bm.faces))//2
  if remaining<=0:break
  edges=sorted((e for e in bm.edges if e.calc_length()>1.0),key=lambda e:e.calc_length(),reverse=True)[:remaining]
  if not edges:break
  before=len(bm.faces);bmesh.ops.subdivide_edges(bm,edges=edges,cuts=1,use_grid_fill=True,smooth=0)
  bmesh.ops.triangulate(bm,faces=list(bm.faces));iterations.append({'before':before,'after':len(bm.faces),'splitEdges':len(edges)})
  assert len(bm.faces)<=target
 bm.to_mesh(mesh);bm.free();mesh.update();assert len(mesh.polygons)<=target
 # Build a continuous source correspondence before moving vertices. Use the
 # original source triangle and barycentric coordinates for color and normals.
 anchors=[];outcolors=[];moved=0;maxmove=0.;disp=[];maxcolorerror=0.
 for vertex in mesh.vertices:
  p=vertex.co.copy();hit,normal,fi,distance=bvh.find_nearest(p)
  assert hit is not None and (distance<1e-3 or (source=='wind-blade' and abs(p.z-original_bounds[0][2])<1e-4)), ('off-source refinement',source,tuple(p),distance)
  f=faces[fi];a,b,c=[points[i]for i in f];v0=b-a;v1=c-a;v2=hit-a
  d00=v0.dot(v0);d01=v0.dot(v1);d11=v1.dot(v1);d20=v2.dot(v0);d21=v2.dot(v1);den=d00*d11-d01*d01
  if abs(den)<1e-12:w=[1.,0.,0.]
  else:
   w1=(d11*d20-d01*d21)/den;w2=(d00*d21-d01*d20)/den;w=[1-w1-w2,w1,w2]
  w=[max(0.,min(1.,v))for v in w];total=sum(w);w=[v/total for v in w]
  col=[sum(face_colors[fi][j][k]*w[j]for j in range(3))for k in range(4)];outcolors.append(col)
  n=sum((normals[f[j]]*w[j]for j in range(3)),Vector()).normalized()
  if n.length<.5:n=normal.copy()
  if source=='wind-blade':n=Vector((p.x,p.y,0)).normalized() # retain every horizontal contact section
  low,high=boxes[component[f[0]]]
  # Exact per-component bounds and toe collars. These bands include all extrema.
  edge=min(min(p[k]-low[k],high[k]-p[k])for k in range(3))
  pin=smooth(0.,1.6,edge)*smooth(low[2]+1.0,low[2]+3.5,p.z)
  if source=='wind-blade':pin*=1-smooth(high[2]-15.,high[2]-12.,p.z) # retain original irregular crown cap
  broad=smooth(1.5,7.,sum(vertex_scale[f[j]]*w[j]for j in range(3))) if source.startswith('canyon') else 1.
  # Bedding is a laterally warped joint field. Flutes run down the face; their
  # amplitude varies by bed. No random samples or per-vertex white noise.
  bed=p.z*.49 + .48*math.sin(p.x*.105) + .31*math.sin(p.y*.19+p.x*.031)
  joint=abs(math.sin(bed))
  shelf=smooth(.08,.34,joint)*(0.63+.37*smooth(-.8,.8,math.cos(bed)))
  flute=.56+.44*math.sin(p.x*.62+p.y*.39+math.sin(p.z*.073)*.9)**2
  wide=.78+.22*math.sin(p.x*.137-p.y*.173+p.z*.09)
  amount=(.92 if source.startswith('canyon') else .72)*pin*broad*shelf*flute*wide
  # Relief grows outward from the source skin, never carves a collision-facing
  # void. Local bounds clamp only trims excursions; extremum bands are pinned.
  q=p+n*amount
  for k in range(3):q[k]=max(low[k],min(high[k],q[k]))
  move=(q-p).length
  assert move<=.93
  if move>.01:moved+=1
  maxmove=max(maxmove,move);disp.append(move);anchors.append((p,fi,w));vertex.co=q
 mesh.update()
 # Explicit source-triangle interpolation, no newly painted palette or texture.
 for attr in list(mesh.color_attributes):mesh.color_attributes.remove(attr)
 out=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for i,col in enumerate(outcolors):out.data[i].color=col
 mesh.color_attributes.active_color=out
 for polygon in mesh.polygons:polygon.use_smooth=True
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
 final,_=topology(mesh)
 assert final['boundaryEdges']==0 and final['nonManifoldEdges']==0 and final['signedVolume']>0
 assert final['components']==initial['components'];assert moved>500
 profile={'rays':0,'largestInwardMetres':0.}
 if source=='wind-blade':
  live=BVHTree.FromPolygons([v.co for v in mesh.vertices],[list(f.vertices)for f in mesh.polygons],all_triangles=True)
  for h in range(31):
   z=original_bounds[0][2]+.2+(original_bounds[1][2]-original_bounds[0][2]-.4)*h/30
   for i in range(48):
    angle=math.tau*i/48;direction=Vector((-math.cos(angle),-math.sin(angle),0));origin=Vector((math.cos(angle)*80,math.sin(angle)*80,z))
    old=bvh.ray_cast(origin,direction);new=live.ray_cast(origin,direction)
    if old[0]is not None:
     assert new[0]is not None
     inward=new[3]-old[3];profile['rays']+=1;profile['largestInwardMetres']=max(profile['largestInwardMetres'],inward)
     assert inward<.01,('contact profile shrank',h,i,inward)
 newbounds=bounds([v.co for v in mesh.vertices]);assert max(abs(original_bounds[j][k]-newbounds[j][k])for j in range(2)for k in range(3))<1e-4
 # Source color interpolation is validated independently from stored weights.
 current=mesh.color_attributes['Color']
 for i,(_,fi,w)in enumerate(anchors):
  expected_col=[sum(face_colors[fi][j][k]*w[j]for j in range(3))for k in range(4)]
  maxcolorerror=max(maxcolorerror,max(abs(current.data[i].color[k]-expected_col[k])for k in range(4)))
 assert maxcolorerror<1e-6
 obj.data.materials.clear();mat=bpy.data.materials.new(name+'-stone');mat.use_nodes=True
 mat.diffuse_color=(1,1,1,1);bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.9
 vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color']);obj.data.materials.append(mat)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 outpath=STAGE/(name+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(outpath),export_format='GLB',use_selection=True,export_yup=True,export_normals=True,export_texcoords=False,export_materials='EXPORT',export_animations=False,export_extras=False)
 assert sha(sourcepath)==expected
 receipt={'source':str(sourcepath.relative_to(ROOT)),'sourceSha256':expected,'output':str(outpath.relative_to(ROOT)),'sha256':sha(outpath),'bytes':outpath.stat().st_size,'sourceTopology':initial,'topology':final,'originalBoundsBlender':original_bounds,'finalBoundsBlender':newbounds,'subdivision':iterations,'contactProfile':profile,'movedVertices':moved,'maxDisplacementMetres':maxmove,'meanDisplacementMetres':sum(disp)/len(disp),'sourceColorMaxInterpolationError':maxcolorerror,'method':'Adaptive longest-edge subdivision; outward coherent warped bedding and vertical flute relief on broad panels; per-component bound/toe pins. Source triangle barycentric color correspondence.','blender':bpy.app.version_string,'seconds':time.time()-start}
 (STAGE/(name+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n');print('REFINEMENT_RECEIPT='+json.dumps(receipt),flush=True)
for spec in SPECS:build(*spec)
