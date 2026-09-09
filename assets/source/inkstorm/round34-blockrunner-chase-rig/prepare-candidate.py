"""Write review-only camera sources and patch; never writes live files."""
from pathlib import Path
import difflib, hashlib, json

ROOT=Path('/Users/amir/Projects/PodRacing')
OUT=Path(__file__).parent
paths=['src/camera/CinematicCamera.ts','src/render/app/GameApp.ts','src/game/vehicleAppearance.ts']
baseline={p:(ROOT/p).read_text() for p in paths}
candidate=dict(baseline)
def once(text,old,new):
    assert text.count(old)==1,old
    return text.replace(old,new)

p=paths[0];t=candidate[p]
t=once(t,'export interface CameraSubject {','''/** Authored chase composition in metres relative to the simulated subject.
 * Speed, route preview, junction framing and comfort still use the shared rig. */
export interface CameraChaseRig {
  readonly boom: number;
  readonly height: number;
  readonly aimHeight: number;
}

export interface CameraSubject {''')
t=once(t,'  chaseClearance?: number;','''  chaseClearance?: number;
  /** Optional base pose for an unusually shaped imported craft; chase only. */
  chaseRig?: CameraChaseRig;''')
t=once(t,'        this.framingForward.copy(forward);','''        const requestedRig = subject.chaseRig;
        const rig = requestedRig && Number.isFinite(requestedRig.boom) && requestedRig.boom > 0
          && Number.isFinite(requestedRig.height) && requestedRig.height > 0
          && Number.isFinite(requestedRig.aimHeight) ? requestedRig : undefined;
        this.framingForward.copy(forward);''')
t=once(t,'          .addScaledVector(this.framingForward, -16.5 - speedT * 0.8 - clearance * .45)\n          .addScaledVector(UP, 7.1 + speedT * 0.5 + clearance + this.landingCompression)', '''          .addScaledVector(this.framingForward, rig ? -rig.boom - speedT * 0.8 : -16.5 - speedT * 0.8 - clearance * .45)
          .addScaledVector(UP, rig ? rig.height + speedT * 0.5 + this.landingCompression : 7.1 + speedT * 0.5 + clearance + this.landingCompression)''')
t=once(t,'          .addScaledVector(UP, 5.8);','          .addScaledVector(UP, rig?.aimHeight ?? 5.8);')
candidate[p]=t
p=paths[1];t=candidate[p]
t=once(t,'saveVehicleAppearance, vehicleChaseClearance, type VehicleAppearanceId','saveVehicleAppearance, vehicleChaseClearance, vehicleChaseRig, type VehicleAppearanceId')
t=once(t,'    this.subject.chaseClearance = vehicleChaseClearance(this.playerView.activeAppearanceId);','''    this.subject.chaseClearance = vehicleChaseClearance(this.playerView.activeAppearanceId);
    this.subject.chaseRig = vehicleChaseRig(this.playerView.activeAppearanceId);''')
candidate[p]=t
p=paths[2];t=candidate[p]
t="import type { CameraChaseRig } from '../camera/CinematicCamera';\n"+t
t=once(t,'const MAX_APPEARANCE_JSON_LENGTH = 1024;','''/** A close shoulder view clears the measured 5.146m source roof. The legacy
 * clearance still supplies the existing descent horizon compensation. */
const BLOCKRUNNER_CHASE_RIG: CameraChaseRig = Object.freeze({ boom: 11.3, height: 7.9, aimHeight: 1.4 });
export function vehicleChaseRig(appearance: VehicleAppearanceId): CameraChaseRig | undefined {
  return appearance === 'blockrunner' ? BLOCKRUNNER_CHASE_RIG : undefined;
}
const MAX_APPEARANCE_JSON_LENGTH = 1024;''')
candidate[p]=t
patch='';records=[]
for p in paths:
    for folder,data in [('baseline',baseline[p]),('candidate',candidate[p])]:
        target=OUT/folder/p;target.parent.mkdir(parents=True,exist_ok=True)
        assert not target.exists(),'Private prepared versions already exist.'
        target.write_text(data)
    patch+=''.join(difflib.unified_diff(baseline[p].splitlines(True),candidate[p].splitlines(True),fromfile='a/'+p,tofile='b/'+p))
    records.append({'path':p,'baselineSha256':hashlib.sha256(baseline[p].encode()).hexdigest(),'candidateSha256':hashlib.sha256(candidate[p].encode()).hexdigest()})
(OUT/'blockrunner-chase-rig-v1.patch').write_text(patch)
(OUT/'candidate-inputs.json').write_text(json.dumps({'scope':'Prepared after parent applied pilot-material candidate; includes that unchanged baseline. Only three camera/metadata glue files differ.','files':records},indent=2)+'\n')
print(json.dumps({'bytes':len(patch.encode()),'sha256':hashlib.sha256(patch.encode()).hexdigest(),'files':records},indent=2))
