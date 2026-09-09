import pathlib,json,ast,hashlib
b=pathlib.Path(__file__).resolve().parent;old=b.parent/'paint-copy-v1'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def defs(p,names):
 s=p.read_text();return '\n\n'.join(ast.get_source_segment(s,n) for n in ast.parse(s).body if isinstance(n,ast.FunctionDef) and n.name in names)
a=read(b/'01-author-receipt.json');i=read(b/'operation-inputs.json')
state={k:a[k] for k in ('targetScene','paintSignature','paintRawCornerNormalSignatures','finishGraphSignatures')}
state['objectLineage']=[{k:v for k,v in r.items() if k in ('paletteObject','copiedObject','copiedMesh','geometrySignature','sourcePolygonSignature','roleSignature','finishMasks')} for r in a['objectLineage']]
for r in state['objectLineage']:
 if 'finishMasks' in r:r['finishMasks']={k:v for k,v in r['finishMasks'].items() if k in ('edgeAttributeSignature','regionAttributeSignature')}
inp={k:i[k] for k in ('reference','paletteScene','paletteSignature','paletteNormals')}
palette=defs(b/'author-body.py',('require_palette',)).replace("INPUT['objects']","STATE['objectLineage']").replace("mesh=scene.objects[row['paletteObject']].data","if 'copiedMesh' not in row:continue\n        mesh=scene.objects[row['paletteObject']].data")
helper=(b/'guard-helpers.py').read_text()+'\n'+defs(b/'finish-functions.py',('finish_graph_record',))+'\n'+palette+'\n'+defs(old/'03-render-driver-composed.py',('render_result_record',))
body=(old/'03-render-body.py').read_text().replace('IVORY_PALETTE_V1_MATCHED_RENDER','IVORY_ORIGINAL_SURFACE_FINISH_V1_MATCHED_RENDER')
body=body.replace('    return scene',"    for name,expected in STATE['finishGraphSignatures'].items():assert finish_graph_record(bpy.data.materials[name])==expected, 'Finish node graph drift'\n    return scene",1)
needle="        assert fnv1a64_signature([d.value for d in mesh.attributes['ivoryPaintRole'].data])==row['roleSignature']"
body=body.replace(needle,needle+"\n        assert fnv1a64_signature(attribute_values(mesh.attributes['ivoryFinishEdgeDistance']))==row['finishMasks']['edgeAttributeSignature']\n        assert fnv1a64_signature(attribute_values(mesh.attributes['ivoryFinishRegion']))==row['finishMasks']['regionAttributeSignature']")
body=body.replace('    require_histories()\n    inspected=require_paint()', '    require_histories();require_palette()\n    inspected=require_paint()').replace('require_histories();require_paint()', 'require_histories();require_palette();require_paint()').replace('allFiveHistoriesAndPaintMasksExact','allSixHistoriesAndFinishMasksGraphsExact')
(b/'render-body.py').write_text(body)
for view in ('driver','fullcraft'):
 r=read(old/('03-render-'+view+'-receipt.json'));outfile=b/('ivory-finish-v1-'+view+'.png');assert not outfile.exists()
 config={'view':view,'outputPath':str(outfile),'temporaryScene':'Ivory temporary finish V1 '+view,'camera':r['camera'],'cameraReceiptSha256':sha(old/('03-render-'+view+'-receipt.json')),'authorReceiptSha256':sha(b/'01-author-receipt.json'),'sourceBounds':[[-2.9344284534454346,-6.2063446044921875,.021512577310204506],[2.934427261352539,5.793654918670654,3.1749844551086426]]}
 code=helper
 for key,value in [('INPUT',inp),('STATE',state),('RENDER',config)]:code+='\n'+key+'=json.loads('+repr(json.dumps(value,separators=(',',':')))+')\n'
 code+=body
 for n in ast.walk(ast.parse(code)):
  assert not isinstance(n,ast.Lambda)
  if isinstance(n,ast.Call) and isinstance(n.func,ast.Name):
   assert n.func.id not in ('open','exec','eval','globals','compile','__import__')
   if n.func.id in ('hasattr','getattr'):assert isinstance(n.args[1],ast.Constant) and isinstance(n.args[1].value,str)
  if isinstance(n,ast.Attribute):assert not n.attr.startswith('__')
 assert len(code.encode())<200000,len(code.encode())
 p=b/('02-render-'+view+'-composed.py');p.write_text(code);print(view,len(code.encode()),sha(p))
