#!/usr/bin/env python3
"""Generate a new checked-in-style asset fixture from actual package receipts.
No environment variable is needed by ordinary tests. New source-only output only.
"""
import argparse,hashlib,json
from pathlib import Path
BASE=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--hero',type=Path,required=True);p.add_argument('--rival',type=Path,required=True)
p.add_argument('--output',type=Path,required=True);p.add_argument('--scope',required=True)
a=p.parse_args();assert a.output.resolve().is_relative_to(BASE) and not a.output.exists()
packages={};inputs=[]
for role in ['hero','rival']:
 source=getattr(a,role);r=json.loads(source.read_text());asset=Path(r['path']);data=asset.read_bytes()
 assert r['profile']==role and hashlib.sha256(data).hexdigest()==r['sha256'] and len(data)==r['bytes']
 assert r['draws']==5 and r['pilotTriangles']==4128 and r['triangles']<=(60000 if role=='hero' else 30000)
 packages[role]={'publicUrl':'/assets/inkstorm/vehicles/blockrunner-'+role+'-v1.glb',**{k:r[k] for k in ['sha256','bytes','triangles','bodyTriangles','pilotTriangles','draws']}}
 inputs.append({'path':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
a.output.parent.mkdir(parents=True,exist_ok=True)
with a.output.open('x') as f:json.dump({'version':1,'scope':a.scope,'sourceReceipts':inputs,'packages':packages},f,indent=2);f.write('\n')
print(a.output)
