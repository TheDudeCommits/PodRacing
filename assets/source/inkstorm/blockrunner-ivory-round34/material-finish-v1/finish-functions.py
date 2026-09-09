def finish_graph_record(material):
    rows=[]
    for node in sorted(material.node_tree.nodes,key=name_key):
        row={'name':node.name,'type':node.bl_idname,'inputs':[(s.identifier,socket_value(s)) for s in node.inputs],
             'outputs':[(s.identifier,socket_value(s)) for s in node.outputs]}
        if hasattr(node,'operation'):row['operation']=node.operation
        if hasattr(node,'blend_type'):row['blendType']=node.blend_type
        if hasattr(node,'use_clamp'):row['clamp']=node.use_clamp
        if hasattr(node,'noise_dimensions'):row['noiseDimensions']=node.noise_dimensions
        if hasattr(node,'normalize'):row['normalize']=node.normalize
        if hasattr(node,'attribute_name'):row['attributeName']=node.attribute_name
        if hasattr(node,'attribute_type'):row['attributeType']=node.attribute_type
        if node.bl_idname=='ShaderNodeAmbientOcclusion':row['ao']=[node.samples,node.inside,node.only_local]
        rows.append(row)
    return fnv1a64_signature({'material':material_record(material),'nodes':rows})

def color_hex(value):
    return [srgb_channel(int(value[i:i+2],16)/255) for i in (0,2,4)]+[1]

def author_finish_graph(material,role):
    nodes=material.node_tree.nodes;links=material.node_tree.links
    bsdf=nodes.get('Principled BSDF');assert bsdf is not None
    def node(kind,name):
        n=nodes.new(kind);n.name=name;n.label=name;return n
    def feed(value,socket):
        if isinstance(value,(int,float)):socket.default_value=value
        else:links.new(value,socket)
    def math_node(operation,name,a,b=0,clamp=False):
        n=node('ShaderNodeMath',name);n.operation=operation;n.use_clamp=clamp
        feed(a,n.inputs[0]);feed(b,n.inputs[1]);return n.outputs[0]
    def mix(name,factor,a,b):
        n=node('ShaderNodeMixRGB',name);n.blend_type='MIX';n.use_clamp=False
        feed(factor,n.inputs[0])
        for value,socket in ((a,n.inputs[1]),(b,n.inputs[2])):
            if isinstance(value,list):socket.default_value=value
            else:links.new(value,socket)
        return n.outputs[0]
    def rgb(name,value):
        n=node('ShaderNodeRGB',name);n.outputs[0].default_value=value;return n.outputs[0]
    def inside(name,value,low,high):
        return math_node('MULTIPLY',name+' interval',math_node('GREATER_THAN',name+' low',value,low),math_node('LESS_THAN',name+' high',value,high))
    geo=node('ShaderNodeNewGeometry','Ivory original world surface')
    xyz=node('ShaderNodeSeparateXYZ','Ivory source world axes');links.new(geo.outputs['Position'],xyz.inputs[0])
    position=geo.outputs['Position'];x=xyz.outputs['X'];y=xyz.outputs['Y'];z=xyz.outputs['Z']
    region=node('ShaderNodeAttribute','Ivory own surface marking authority');region.attribute_name='ivoryFinishRegion'
    channels=node('ShaderNodeSeparateXYZ','Ivory marking region channels');links.new(region.outputs['Color'],channels.inputs[0])
    engine=math_node('MULTIPLY','Own engine front band',channels.outputs['X'],inside('Engine axial band',y,-5.805,-5.18))
    cockpit=math_node('MULTIPLY','Own rear slope stripe',channels.outputs['Y'],inside('Rear stripe width',x,.57,.88))
    shoulder_x=math_node('ABSOLUTE','Pilot center distance',math_node('SUBTRACT','Pilot own center X',x,.053))
    shoulder=math_node('MULTIPLY','Own original shoulder extent',math_node('GREATER_THAN','Shoulder outside torso',shoulder_x,.315),inside('Shoulder upper arm',z,2.52,2.77))
    shoulder=math_node('MULTIPLY','Own original shoulder role',shoulder,channels.outputs['Z'])
    shoulder=math_node('MULTIPLY','Front and outer shoulder',shoulder,math_node('LESS_THAN','Shoulder front limit',y,2.40))
    marking=math_node('MAXIMUM','Existing surface orange accents',engine,math_node('MAXIMUM','Rear and shoulder',cockpit,shoulder))
    base=rgb('Ivory retained pigment',list(bsdf.inputs['Base Color'].default_value))
    paint=mix('Ivory source owned markings',marking,base,color_hex('B96634'))
    noise=node('ShaderNodeTexNoise','Ivory medium scale chipped paint');noise.noise_dimensions='3D'
    links.new(position,noise.inputs['Vector']);noise.inputs['Scale'].default_value=18;noise.inputs['Detail'].default_value=2;noise.inputs['Roughness'].default_value=.65
    broad=node('ShaderNodeTexNoise','Ivory restrained surface variation');broad.noise_dimensions='3D'
    links.new(position,broad.inputs['Vector']);broad.inputs['Scale'].default_value=1.3;broad.inputs['Detail'].default_value=2;broad.inputs['Roughness'].default_value=.55
    attr=node('ShaderNodeAttribute','Ivory actual sharp edge distance');attr.attribute_name='ivoryFinishEdgeDistance'
    edge=node('ShaderNodeSeparateXYZ','Ivory per triangle edge distances');links.new(attr.outputs['Color'],edge.inputs[0])
    distance=math_node('MINIMUM','Closest qualifying source edge',edge.outputs['X'],math_node('MINIMUM','Other qualifying edges',edge.outputs['Y'],edge.outputs['Z']))
    width=math_node('ADD','Source units chip width',math_node('MULTIPLY','Width variation',noise.outputs['Fac'],.014),.005)
    wear=math_node('SUBTRACT','Bounded edge coverage',1,math_node('DIVIDE','Measured edge distance fraction',distance,width),True)
    breakup=math_node('MULTIPLY','Actual missing chip gaps',math_node('SUBTRACT','Patch threshold',noise.outputs['Fac'],.54),9,True)
    strength={'ivory':.48,'navy':.52,'petrol':.4,'orange':.55,'titanium':.19,'slate':.09,'amber':0,'tan':.08,'intake':.12}[role]
    wear=math_node('MULTIPLY','Restrained source edge wear',math_node('MULTIPLY','Edge only broken patches',wear,breakup),strength)
    worn=mix('Ivory exposed worn edge',wear,paint,color_hex('758078'))
    variation=math_node('MULTIPLY','Restrained pigment variation',broad.outputs['Fac'],.035 if role not in ('amber','titanium') else .012)
    varied=mix('Ivory mild broad pigment patina',variation,worn,color_hex('8F836B'))
    ao=node('ShaderNodeAmbientOcclusion','Ivory actual short contact occlusion');ao.samples=16;ao.inside=False;ao.only_local=False
    ao.inputs['Distance'].default_value=.12;assert not ao.inputs['Normal'].is_linked
    dirt=math_node('MULTIPLY','Contact-only dust pigment',math_node('SUBTRACT','Source surface cavity factor',1,ao.outputs['AO']),.12 if role not in ('slate','amber','tan') else .025)
    dirty=mix('Ivory restrained contact dust',dirt,varied,color_hex('716855'))
    if role=='amber':
        horizontal=inside('Amber upper curved lens band',z,2.987,3.020)
        horizontal=math_node('MULTIPLY','Amber upper band width',horizontal,inside('Amber central width',x,-.18,.29))
        gleam=math_node('MULTIPLY','Tiny visor vertical gleam',inside('Amber reflected slit',x,-.135,-.123),inside('Amber reflected slit height',z,2.83,2.995))
        gleam=math_node('MULTIPLY','Front lens only',gleam,math_node('LESS_THAN','Lens front plane',y,2.19))
        dirty=mix('Controlled amber highlight',math_node('MULTIPLY','Amber band strength',horizontal,.48),dirty,color_hex('C58542'))
        dirty=mix('Small warm visor gleam',math_node('MULTIPLY','Gleam strength',gleam,.7),dirty,color_hex('E8DCB3'))
    color=node('ShaderNodeMixRGB','Ivory Finish Color');color.blend_type='MIX';color.inputs[0].default_value=0;links.new(dirty,color.inputs[1]);links.new(dirty,color.inputs[2]);links.new(color.outputs[0],bsdf.inputs['Base Color'])
    roughness=math_node('ADD','Ivory Finish Roughness',material.roughness,math_node('MULTIPLY','Mild roughness field',math_node('SUBTRACT','Centered broad wear',broad.outputs['Fac'],.5),.10 if role!='amber' else .035),True)
    links.new(roughness,bsdf.inputs['Roughness'])
    material['stage']='Ivory original-surface finish V1; copy-only; no UV edit or bake'
    material['finishSourcePaletteRole']=role
    return {'nodes':len(nodes),'edgeWidthSourceUnits':[.005,.019],'edgeNoiseScale':18,'wearStrength':strength,'aoDistance':.12,'aoSamples':16,'aoOnlyLocal':False,'normalInputUntouched':not bsdf.inputs['Normal'].is_linked}

def own_edge_and_region_attributes(original,clone,row):
    mesh=clone.data;world=[original.matrix_world@v.co for v in mesh.vertices]
    faces=[];edges={};normal_matrix=original.matrix_world.to_3x3().inverted().transposed()
    for p in mesh.polygons:
        assert len(p.vertices)==3
        pts=[world[i] for i in p.vertices];centroid=(pts[0]+pts[1]+pts[2])/3
        n=Vector((0,0,0))
        for loop in p.loop_indices:n+=normal_matrix@mesh.corner_normals[loop].vector
        if n.length>1e-12:n.normalize()
        keys=[tuple(round(v,6) for v in pt) for pt in pts]
        faces.append((pts,centroid,n,keys))
        for j in range(3):
            key=tuple(sorted((keys[j],keys[(j+1)%3])))
            if key not in edges:edges[key]=[]
            edges[key].append((p.index,j))
    qualifies={};sharp_count=0
    for key,adjacent in edges.items():
        valid=False
        if len(adjacent)==2:
            first=faces[adjacent[0][0]];second=faces[adjacent[1][0]]
            delta=second[1]-first[1]
            valid=first[2].dot(second[2])<.82 and delta.dot(first[2])<=.00002 and (-delta).dot(second[2])<=.00002
        qualifies[key]=valid
        if valid:sharp_count+=1
    edge_attr=mesh.color_attributes.new(name='ivoryFinishEdgeDistance',type='FLOAT_COLOR',domain='CORNER')
    region_attr=mesh.color_attributes.new(name='ivoryFinishRegion',type='FLOAT_COLOR',domain='CORNER')
    eligible={'engineShell':0,'rearSlope':0,'originalShoulderSuit':0};marked=[]
    shell=set(row.get('shellPolygons',[]));role_names=INPUT['roleNames']
    for p in mesh.polygons:
        pts,centroid,n,keys=faces[p.index]
        channels=[[1.,1.,1.,1.] for j in range(3)]
        for j in range(3):
            key=tuple(sorted((keys[j],keys[(j+1)%3])))
            if qualifies[key]:
                delta=pts[(j+1)%3]-pts[j];length=delta.length
                assert length>1e-10
                height=delta.cross(pts[(j+2)%3]-pts[j]).length/length
                for k in range(3):channels[k][j]=height if k==(j+2)%3 else 0
        role=role_names[mesh.attributes['ivoryPaintRole'].data[p.index].value]
        engine=p.index in shell and role=='ivory'
        rear=row.get('rearSlope',False) and role=='ivory'
        shoulder=row.get('pilotContainer',False) and role=='slate'
        for key,enabled in [('engineShell',engine),('rearSlope',rear),('originalShoulderSuit',shoulder)]:
            if enabled:eligible[key]+=1
        for k,loop in enumerate(p.loop_indices):
            edge_attr.data[loop].color=channels[k];region_attr.data[loop].color=(float(engine),float(rear),float(shoulder),1)
        if engine or rear or shoulder:marked.append(p.index)
    return {'sharpConvexWeldedAnalysisEdges':sharp_count,'coordinateKeyDecimals':6,'weldAppliedToMesh':False,'eligibleFaces':eligible,
        'eligibleFaceIndicesSignature':fnv1a64_signature(marked),'edgeAttributeSignature':fnv1a64_signature(attribute_values(edge_attr)),
        'regionAttributeSignature':fnv1a64_signature(attribute_values(region_attr)),'attributeCorners':len(mesh.loops)}
