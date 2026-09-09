"""Download only explicit official Poly Haven manifest URLs; preserve original bytes."""
from pathlib import Path, PurePosixPath
import hashlib, json, urllib.request, urllib.parse, zipfile
ROOT=Path(__file__).resolve().parent
UA='Inkstorm-PodRacing-asset-production/1.0 (https://github.com/TheDudeCommits/PodRacing)'
records=[]
for asset in ['boulder_01']:
    manifest_path=ROOT/(asset+'-files-manifest.json')
    manifest=json.loads(manifest_path.read_bytes())
    bundle=manifest['gltf']['1k']['gltf']
    entries={asset+'_1k.gltf':bundle,**bundle['include']}
    files=[]
    for relative,metadata in entries.items():
        p=PurePosixPath(relative)
        assert not p.is_absolute() and '..' not in p.parts
        url=metadata['url'];parsed=urllib.parse.urlparse(url)
        assert parsed.scheme=='https' and parsed.hostname=='dl.polyhaven.org'
        target=ROOT/'originals'/asset/relative
        target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists():raw=target.read_bytes()
        else:
            request=urllib.request.Request(url,headers={'User-Agent':UA})
            raw=urllib.request.urlopen(request,timeout=60).read()
            assert len(raw)==metadata['size']
            assert hashlib.md5(raw).hexdigest()==metadata['md5']
            target.write_bytes(raw)
        assert len(raw)==metadata['size']
        assert hashlib.md5(raw).hexdigest()==metadata['md5']
        files.append({'path':str(target.relative_to(ROOT)),'url':url,'bytes':len(raw),'md5':metadata['md5'],'md5Verified':True,'sha256':hashlib.sha256(raw).hexdigest()})
    gltf=json.loads((ROOT/'originals'/asset/(asset+'_1k.gltf')).read_bytes())
    actual_dependencies={x['uri'] for x in gltf.get('buffers',[])+gltf.get('images',[]) if 'uri' in x}
    assert actual_dependencies==set(bundle['include']),actual_dependencies
    archive=ROOT/'originals'/(asset+'-1k-original-files.zip')
    with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_STORED) as z:
        for relative in sorted(entries):
            info=zipfile.ZipInfo(relative,date_time=(2026,9,7,0,0,0));info.compress_type=zipfile.ZIP_STORED
            z.writestr(info,(ROOT/'originals'/asset/relative).read_bytes())
    records.append({'asset':asset,'page':'https://polyhaven.com/a/'+asset,'author':'Rico Cilliers','processing':'Rico Cilliers' if asset=='rock_face_02' else None,'license':'CC0','licenseUrl':'https://polyhaven.com/license','manifestUrl':'https://api.polyhaven.com/files/'+asset,'manifestSha256':hashlib.sha256(manifest_path.read_bytes()).hexdigest(),'resolution':'1k','files':files,'archive':{'path':str(archive.relative_to(ROOT)),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'purpose':'Locally packaged unmodified downloaded files; not an official provider ZIP'}})
receipt={'date':'2026-09-07','userAgent':UA,'scope':'Volumetric fallback art experiment only; no runtime/public replacement','licenseVerification':'Official boulder_01 model page explicitly labels the asset CC0; Poly Haven license page permits use, modification and redistribution. Verified 2026-09-07.','assets':records}
(ROOT/'boulder-source-download-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'assets':len(records),'files':sum(len(x['files']) for x in records),'downloadedBytes':sum(f['bytes'] for x in records for f in x['files']),'allProviderMD5Verified':True},indent=2))
