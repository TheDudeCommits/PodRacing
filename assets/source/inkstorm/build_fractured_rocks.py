"""Original fractured sandstone geometry for Inkstorm, authored through Blender MCP.

Broad polygonal wall planes, non-periodic shelf breaks and angular talus replace
the earlier repeated round column vocabulary. One vertex-painted mesh per asset.
Execute literal source in Blender; only the owned Inkstorm World Kit is edited.
"""
import bpy, math

ROOT = '/Users/amir/Projects/PodRacing'
original_scene = bpy.context.window.scene
scene = bpy.data.scenes['Inkstorm World Kit']
bpy.context.window.scene = scene
material = bpy.data.materials.get('Inkstorm_Fractured_Sandstone')
if material is None:
    material = bpy.data.materials.new('Inkstorm_Fractured_Sandstone')
    material.use_nodes = True
    material.diffuse_color = (.72,.24,.13,1)
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .96
    paint = material.node_tree.nodes.new('ShaderNodeVertexColor')
    paint.layer_name = 'Color'
    material.node_tree.links.new(paint.outputs['Color'],shader.inputs['Base Color'])

def noise(seed):
    value = math.sin(seed*12.9898+78.233)*43758.5453
    return value-math.floor(value)

def new_mesh():
    return {'vertices':[],'faces':[],'colors':[],'smooth':[]}

def face(mesh, indices, color, smooth=False):
    mesh['faces'].append(tuple(indices))
    mesh['colors'].append(color)
    mesh['smooth'].append(smooth)

def stone_color(seed, height, crevice=False, upward=False):
    if crevice:
        return (.25+.025*noise(seed),.125+.012*noise(seed+2),.24+.022*noise(seed+5))
    band = .88+.10*math.sin(height*.61)+.045*(noise(seed)-.5)
    if upward:
        return (.83*band,.39*band,.205*band)
    return (.76*band,.275*band,.145*band)

def fragment(mesh, center, dimensions, seed, angle=0, lean=0):
    """A chipped, skewed prism: broad cut faces rather than spherical pebbles."""
    start = len(mesh['vertices'])
    outline = [(-.9,-.54),(-.51,-.94),(.25,-1),(.96,-.51),(1,.37),(.49,.88),(-.44,1),(-1,.31)]
    crown=.42+.46*noise(seed*4.3)
    rings = [(0,.78),(.16,1.04),(.60,.92+.13*noise(seed)),(.87,crown+.17),(1,crown)]
    for j,(height,spread) in enumerate(rings):
        for i,(x,y) in enumerate(outline):
            scatter = .88+.2*noise(seed+i*2)
            xx = (x*spread*scatter+lean*height+.14*math.sin(seed))*dimensions[0]*.5
            yy = (y*spread*(.89+.2*noise(seed+i+4))+.17*height)*dimensions[1]*.5
            z = dimensions[2]*(height+(.06*(noise(seed+i*7)-.5) if j not in [0,4] else -.29*noise(seed+i) if j==4 else 0))
            mesh['vertices'].append((center[0]+xx*math.cos(angle)-yy*math.sin(angle),center[1]+xx*math.sin(angle)+yy*math.cos(angle),center[2]+z))
    for j in range(len(rings)-1):
        for i in range(8):
            a=start+j*8+i; b=start+j*8+(i+1)%8
            c=start+(j+1)*8+(i+1)%8; d=start+(j+1)*8+i
            color=stone_color(seed+i,center[2]+dimensions[2]*rings[j][0],j==0 and i%3==0,j==3)
            weathered=j==1 and i in [3,4] and dimensions[0]>6
            face(mesh,(a,b,c),color,weathered)
            face(mesh,(a,c,d),color,weathered)
    face(mesh,tuple(start+i for i in reversed(range(8))),stone_color(seed,0,True))
    face(mesh,tuple(start+32+i for i in range(8)),stone_color(seed,center[2]+dimensions[2],False,True))

def export_rock(name, mesh, dimensions):
    # A consistent ground origin is defined from the completed sculpture bounds.
    minima=[min(v[i] for v in mesh['vertices']) for i in range(3)]
    maxima=[max(v[i] for v in mesh['vertices']) for i in range(3)]
    scales=[dimensions[i]/(maxima[i]-minima[i]) for i in range(3)]
    center=[(maxima[i]+minima[i])*.5 for i in range(2)]+[minima[2]]
    vertices=[tuple((v[i]-center[i])*scales[i] for i in range(3)) for v in mesh['vertices']]
    existing=scene.objects.get(name)
    if existing:
        old_data=existing.data
        bpy.data.objects.remove(existing,do_unlink=True)
        if old_data.users==0: bpy.data.meshes.remove(old_data)
    orphan=bpy.data.meshes.get(name+'-mesh')
    if orphan and orphan.users==0: bpy.data.meshes.remove(orphan)
    data=bpy.data.meshes.new(name+'-mesh')
    data.from_pydata(vertices,[],mesh['faces'])
    data.materials.append(material)
    data.update()
    color=data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for polygon,tint,smooth in zip(data.polygons,mesh['colors'],mesh['smooth']):
        polygon.use_smooth=smooth
        for loop in polygon.loop_indices:
            color.data[loop].color=(*tint,1)
    data.color_attributes.active_color=color
    data.calc_loop_triangles()
    obj=bpy.data.objects.new(name,data)
    obj['inkstorm_source']='build_fractured_rocks.py'
    obj['original_art']=True
    scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/assets/inkstorm/'+name+'.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT')
    print({'name':name,'dimensionsXYZ':[round(v,2) for v in obj.dimensions],'triangles':len(data.loop_triangles),'vertices':len(data.vertices),'smoothFaces':sum(p.use_smooth for p in data.polygons),'origin':tuple(obj.location)})

# A fractured rectangular buttress. The two deep front notches produce actual
# recesses and a split apex, not painted crack lines on a circular extrusion.
buttress=new_mesh()
outline=[(-35,-40),(-12,-46),(-6,-29),(1,-43),(26,-39),(37,-20),(33,12),(27,40),(5,47),(-21,41),(-36,22),(-29,-5)]
perimeter=[]
for edge in range(len(outline)):
    a=outline[edge];b=outline[(edge+1)%len(outline)]
    for subdivision in range(7):
        t=subdivision/7
        perimeter.append((a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t,edge,t))
# Unequal formations: three deep shelf undercuts and many restrained fracture seams.
levels=[(0,1.19),(7,1.11),(17,1.0),(24,.98),(25,1.09),(28,1.085),(30,.98),(37,.97),(44,.965),(45,1.05),(48,1.04),(50,.96),(58,.955),(62,.95),(63,1.10),(66,1.08),(69,.95),(76,.945),(81,.94),(82,1.05),(85,1.02),(87,.94),(94,.92),(98,.915),(99,1.00),(102,.98),(108,.94),(114,.91),(120,.88)]
n=len(perimeter)
for row,(z,scale) in enumerate(levels):
    for i,(x,y,edge,t) in enumerate(perimeter):
        # Broader horizontal plates on the front, a quieter rear supporting mass.
        formation=row//5
        direction=(1.0 if (edge+formation)%4 in [0,1] else .22) if y<0 else .34
        wall_scale=.93+(scale-.93)*direction
        undulation=(noise(i*3.2+row*1.7)-.5)*2.9
        crack=edge in [1,2] or (edge==5 and .32<t<.62)
        recess=(4.5+3*math.sin(z*.029)) if crack else 0
        xx=x*wall_scale+4*(z/120)**2+undulation+1.2*math.sin(z*.021+edge*2)
        yy=y*wall_scale+(recess if y<0 else -recess)+1.1*math.sin(i*.4+row)
        # Apex tilts and breaks toward the back-left. No level circular crown.
        apex=1+.14*(-x/40)+.035*(y/45)
        zz=z*apex+(1.7*math.sin(i*.21)+.6*noise(i*7))*(z/120)
        if row==0: zz=0
        buttress['vertices'].append((xx,yy,zz))
for row in range(len(levels)-1):
    z,scale=levels[row]
    next_z,next_scale=levels[row+1]
    shelf=abs(next_scale-scale)>.045
    undershelf=next_scale>scale+.035
    for i,(_,_,edge,t) in enumerate(perimeter):
        a=row*n+i;b=row*n+(i+1)%n;c=(row+1)*n+(i+1)%n;d=(row+1)*n+i
        crack=edge in [1,2] or (edge==5 and .32<t<.62)
        color=stone_color(edge*17+row,z,undershelf or crack,shelf and not undershelf)
        # Broad wall spans blend; sharp ledge lips and crack planes remain hard.
        smooth=not shelf and not crack and row%5!=0
        face(buttress,(a,b,c),color,smooth)
        face(buttress,(a,c,d),color,smooth)
# Three skewed summit planes replace the flat cut cap and keep a broken apex.
summits=[]
for point in [(-18,-12,140),(18,4,130),(-8,24,143)]:
    summits.append(len(buttress['vertices']))
    buttress['vertices'].append(point)
sector=n//3
for section in range(3):
    for i in range(section*sector,(section+1)*sector):
        face(buttress,((len(levels)-1)*n+i,(len(levels)-1)*n+(i+1)%n,summits[section]),stone_color(section,124,False,True),True)
    border=(len(levels)-1)*n+((section+1)*sector)%n
    face(buttress,(border,summits[(section+1)%3],summits[section]),stone_color(section,123,False,True),True)
face(buttress,tuple(summits),stone_color(17,130,False,True),True)
face(buttress,tuple(reversed(range(n))),stone_color(1,0,True))
# Sloped scree shoulders: large fallen slabs sit against the wall; smaller pieces
# spread outward rather than forming a ring or a stack of equal blocks.
for i in range(36):
    y=-58+noise(i*7)*22
    x=-43+noise(i*9+3)*88
    size=4+10*noise(i*4.7+6)**2
    height=size*(.34+.48*noise(i*6.4))
    fragment(buttress,(x,y,0),(size,size*(.6+.6*noise(i+9)),height),210+i,noise(i*5)*math.tau,.2)
# Three split plates embedded at different wall heights give silhouette accents.
fragment(buttress,(-24,-41,36),(33,22,12),410,.21,.3)
fragment(buttress,(19,-37,68),(25,17,8),431,-.29,-.3)
fragment(buttress,(-8,7,113),(24,28,19),458,.16,-.4)
fragment(buttress,(21,-39,27),(21,18,8),477,.62,.4)
fragment(buttress,(-22,-37,85),(27,18,10),496,-.34,-.2)
export_rock('canyon-buttress',buttress,(80,100,120))

# A loose crescent of fracture blocks, led by three distinct larger slabs.
scree=new_mesh()
fragment(scree,(-7,3,0),(17,10,11),901,.36,.18)
fragment(scree,(8,4,0),(15,9,7),921,-.85,-.75)
fragment(scree,(-1,-3,0),(12,7,5),941,.12,.5)
for i in range(74):
    angle=noise(i*9.2+12)*math.tau
    distance=math.sqrt(noise(i*3.4+1))
    x=math.cos(angle)*17*distance
    y=math.sin(angle)*10*distance
    # Rock size varies spatially: a few broad mid-sized slabs, many outer chips.
    large=i%9==0
    width=(4.5+2.5*noise(i*3)) if large else 1+3.2*noise(i*7)**2
    depth=width*(.35+.85*noise(i*3+81))
    height=width*(.25+.7*noise(i*2+91))
    fragment(scree,(x,y,0),(width,depth,height),1000+i,noise(i*13)*math.tau,(noise(i*5)-.5)*.6)
export_rock('sandstone-scree',scree,(35,22,12))
bpy.context.window.scene = original_scene
