import pathlib,json,ast,hashlib
b=pathlib.Path(__file__).resolve().parent;old=b.parent/'control-fit-review-v1'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def defs(p,names):
 s=p.read_text();return '\n\n'.join(ast.get_source_segment(s,n) for n in ast.parse(s).body if isinstance(n,ast.FunctionDef) and n.name in names)
author=read(b/'02-author-executed-receipt.json');state={k:author[k] for k in ('targetScene','paintSignature','paintRawCornerNormalSignatures','objectLineage')};i=read(b/'operation-inputs.json');input_={'reference':i['reference']}
helper=(b/'guard-helpers.py').read_text()+'\nfrom mathutils import Vector\n'+defs(b/'02-author-body.py',('attribute_values','geometry_record','require_histories'))+'\n'+defs(old/'fitted-driver-executed-payload.py',('render_result_record',))
for view in ('driver','fullcraft'):
 receipt=old/('fitted-'+view+'-v3-executed-receipt.json');r=read(receipt);outfile=b/('ivory-palette-v1-'+view+'.png');assert not outfile.exists()
 config={'view':view,'outputPath':str(outfile),'temporaryScene':'Ivory temporary palette V1 '+view,'camera':r['camera'],'cameraReceiptSha256':sha(receipt),'authorReceiptSha256':sha(b/'02-author-executed-receipt.json'),'sourceBounds':[[-2.9344284534454346,-6.2063446044921875,.021512577310204506],[2.934427261352539,5.793654918670654,3.1749844551086426]]}
 code=helper
 for key,value in [('INPUT',input_),('STATE',state),('RENDER',config)]:code+='\n'+key+'=json.loads('+repr(json.dumps(value,separators=(',',':')))+')\n'
 code+=(b/'03-render-body.py').read_text();tree=ast.parse(code)
 for n in ast.walk(tree):
  assert not isinstance(n,ast.Lambda)
  if isinstance(n,ast.Call) and isinstance(n.func,ast.Name):
   assert n.func.id not in ('open','exec','eval','globals','compile','__import__')
   if n.func.id in ('hasattr','getattr'):assert isinstance(n.args[1],ast.Constant) and isinstance(n.args[1].value,str)
  if isinstance(n,ast.Attribute):assert not n.attr.startswith('__')
 assert len(code.encode())<200000
 p=b/('03-render-'+view+'-composed.py');p.write_text(code);print(view,len(code.encode()),sha(p))
