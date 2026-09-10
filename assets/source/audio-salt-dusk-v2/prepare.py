from pathlib import Path
import subprocess,hashlib,json,datetime
root=Path(__file__).resolve().parents[3]
src=root/'assets/source/audio-salt-dusk-v2';dst=root/'public/audio/salt-dusk-v2';dst.mkdir(exist_ok=True)
# Transcode complete existing recordings only; no waveform generation/composition.
choices=[
 ('propulsion.ogg','rocket-boost-hq.mp3','-3dB'),
 ('rival.ogg','little-robot/SpaceShip_Engine_Medium_Loop_00.wav','-5dB'),
 ('boost.ogg','engine_takeoff.wav','-4dB'),
 ('hull-impact.ogg','heavy-metal-thud-hq.mp3','-2dB'),
 ('weapon.ogg','little-robot/Laser/Laser_09.wav','-3dB'),
 ('shield-pulse.ogg','little-robot/Laser/Laser_07.wav','-5dB'),
 ('rupture.ogg','explosions/explode.wav','-4dB'),
]
ledger=[]
for name,source,volume in choices:
 p=src/source;o=dst/name
 command=['ffmpeg','-v','error','-y','-i',str(p),'-vn','-af','volume='+volume,'-c:a','libopus','-b:a','128k',str(o)]
 subprocess.run(command,check=True)
 ledger.append({'source':str(p.relative_to(root)),'runtime':str(o.relative_to(root)),'operation':command,'sha256':hashlib.sha256(o.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
# Existing mechanical click is retained only for direct UI/countdown and a quiet pickup cue.
p=root/'public/audio/salt-dusk/click_001.ogg';o=dst/'mechanical-click.ogg';o.write_bytes(p.read_bytes())
ledger.append({'source':str(p.relative_to(root)),'runtime':str(o.relative_to(root)),'operation':'byte-exact copy','sha256':hashlib.sha256(o.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'provenance':'assets/source/audio-salt-dusk/SOURCE_MANIFEST.json#kenney-interface'})
(src/'runtime-files.json').write_text(json.dumps(ledger,indent=2)+'\n')
print('runtime files',len(ledger),'bytes',sum((root/x['runtime']).stat().st_size for x in ledger))
