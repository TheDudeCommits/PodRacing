# Freeze and inspect exact artifacts around the unchanged full-race harness.
import collections
import datetime
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
from urllib.parse import urlparse

ROOT = Path('/Users/amir/Projects/PodRacing')
EXPECTED = os.environ.get('INKSTORM_EXPECTED_BUILD', '')
if len(EXPECTED) != 64 or any(c not in '0123456789abcdef' for c in EXPECTED):
    raise ValueError('Set INKSTORM_EXPECTED_BUILD to the exact served bundle SHA256')
GROUPS = ('build', 'source', 'publicArt', 'dist', 'harness', 'configuration')

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def read(path):
    return json.loads(path.read_text())

def write(path, data):
    path.write_text(json.dumps(data, indent=2) + '\n')

def stamp(path):
    data = path.read_bytes()
    return {'path': str(path.relative_to(ROOT)), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

def manifest(output, stage):
    def tree(folder):
        return [stamp(p) for p in sorted((ROOT / folder).rglob('*')) if p.is_file()]
    builds = list((ROOT / 'dist/assets').glob('index-*.js'))
    assert len(builds) == 1, f'Unexpected build candidates: {builds}'
    build = stamp(builds[0])
    assert build['sha256'] == EXPECTED, build
    harnesses = ['scripts/competitive-flow.ts', 'scripts/lib/race-cadence.ts', 'scripts/vehicle-appearance-acceptance.mjs', 'scripts/lib/frozen-build-receipt.mjs', 'scripts/inkstorm-race-evidence.py', 'scripts/lib/result-clock.ts',
                 'scripts/polwo-appearance-acceptance.mjs', 'scripts/inkstorm-gauntlet.mjs',
                 'scripts/inkstorm-context-recovery.mjs', 'scripts/inkstorm-resource-cycles.mjs',
                 'output/playwright/full-race-performance-round32-runner.py']
    configuration = ['package.json', 'package-lock.json', 'vite.config.ts', 'index.html']
    result = {'recordedAt': now(), 'expectedBuildSha256': EXPECTED, 'build': build, 'source': tree('src'), 'publicArt': tree('public/assets/inkstorm'), 'dist': tree('dist'), 'harness': [stamp(ROOT / p) for p in harnesses], 'configuration': [stamp(ROOT / p) for p in configuration if (ROOT / p).exists()]}
    output.mkdir(parents=True, exist_ok=True)
    write(output / f'artifact-manifest-{stage}.json', result)
    print(json.dumps({'stage': stage, 'at': result['recordedAt'], 'build': build, 'counts': {k:len(result[k]) for k in GROUPS if k != 'build'}}), flush=True)
    return result

def compare(output):
    before = read(output / 'artifact-manifest-before.json')
    after = read(output / 'artifact-manifest-after.json')
    dist = {r['path']:r for r in after['dist']}
    pairs = [{'public': r['path'], 'dist': r['path'].replace('public/', 'dist/', 1), 'matches': r['sha256'] == dist.get(r['path'].replace('public/', 'dist/', 1), {}).get('sha256')} for r in after['publicArt']]
    result = {'before': before['recordedAt'], 'after': after['recordedAt'], 'unchanged': {k: before[k] == after[k] for k in GROUPS}, 'publicDistPairs': pairs}
    receipt = read(output / 'receipt.json')
    result['servedBuildMatchesExpected'] = bool(receipt.get('build')) and all(b['sha256'] == EXPECTED for b in receipt['build'])
    result['recordedHarnessMatchesBefore'] = receipt.get('scriptHash') == before['harness'][0]['sha256']
    write(output / 'artifact-manifest-comparison.json', result)
    assert all(result['unchanged'].values()) and all(p['matches'] for p in pairs) and result['servedBuildMatchesExpected'] and result['recordedHarnessMatchesBefore'], result
    print(json.dumps({'artifactComparison': 'PASS'}), flush=True)

def cleanup(output):
    receipt = read(output / 'receipt.json')
    ports = sorted(set(urlparse(b['url']).port for b in receipt.get('build', [])))
    states=[]
    for port in ports:
        assert port != 5211
        with socket.socket() as connection:
            connection.settimeout(.3)
            listening = connection.connect_ex(('127.0.0.1', port)) == 0
        detail = subprocess.run(['lsof','-nP',f'-iTCP:{port}','-sTCP:LISTEN'], capture_output=True, text=True)
        states.append({'port': port, 'listening': listening, 'lsofExitCode': detail.returncode, 'lsof': detail.stdout})
    unrelated = subprocess.run(['lsof','-nP','-iTCP:5211','-sTCP:LISTEN'], capture_output=True, text=True)
    result = {'recordedAt': now(), 'harnessBrowserFinally': 'The unmodified harness awaits browser.close() in finally before writing receipt.json.', 'previewPorts': states, 'unrelated5211': {'action':'read only; no stop signal issued','lsofExitCode':unrelated.returncode,'lsof':unrelated.stdout}}
    write(output / 'cleanup.json', result)
    assert states and not any(row['listening'] for row in states), result
    print(json.dumps({'cleanup':'PASS', 'ports':ports, 'unrelated5211Listening': unrelated.returncode == 0}), flush=True)

def quantiles(values):
    values = sorted(values)
    def q(p): return values[int((len(values)-1)*p)] if values else None
    return {'samples':len(values), 'p50':q(.5), 'p95':q(.95), 'p99':q(.99), 'max':q(1)}

def analyze(output):
    result={}
    for label in ['time-attack','cup-round-1']:
        file=output / f'{label}.json'
        if not file.exists():
            result[label]={'unavailable': 'Harness did not save a completed race file; no in-flight frames are invented.'}
            continue
        record=read(file); perf=record['performance']; samples=perf['resolutionSamples']
        shadows=[s['racerShadow'] for s in samples]; frames=perf['frames']
        def unique(key): return list(dict.fromkeys(s[key] for s in shadows))
        transitions=[{'phase':s['phase'],'time':s['raceTime'],'rafTime':s['rafTime'],'q':s['performance']['qualityLevel'],'dpr':s['pixelRatio'],'width':s['canvasWidth'],'height':s['canvasHeight'],'terrainRequested':s['performance']['terrainRequestedLevels'],'terrainEffective':s['performance']['terrainEffectiveLevels'],'coverage':s['performance']['terrainCoverageRadius']} for s in perf['transitions'] if s['type']=='resolution']
        shadow={'size':unique('size'),'draws':unique('drawCalls'),'casters':unique('casters'),'drawnTriangles':unique('drawnTriangles'),'omitted':unique('omitted'),'failures':[s['failure'] for s in shadows if s['failure'] is not None],'skips':[s['skipped'] for s in shadows if s['skipped'] is not None],'frames':[shadows[0]['frames'],shadows[-1]['frames']],'monotonic':all(a['frames']<=b['frames'] for a,b in zip(shadows, shadows[1:])),'cpu':quantiles([s['cpuMs'] for s in shadows]),'result':record['snapshot']['renderer']['racerShadow']}
        shadow['cpu']['resultLifetimeMax']=shadow['result']['maxCpuMs']
        mastery=record['snapshot']['game']['mastery']
        result[label]={'finishTime':mastery['result']['time'],'result':mastery['result'],'gate':perf['acceptance'],'summary':perf['summary'],'rawFrameCount':len(frames),'rawPhases':dict(collections.Counter(f['phase'] for f in frames)),'nonNullIntervals':sum(f['intervalMs'] is not None for f in frames),'countdownSlow':[f for f in frames if f['phase']=='countdown' and f['intervalMs'] is not None and f['intervalMs']>25],'racingSlow':[f for f in frames if f['phase']=='racing' and f['intervalMs'] is not None and f['intervalMs']>25],'transitions':transitions,'rendererExtrema':perf['rendererExtrema'],'resolutionSamples':len(samples),'shadow':shadow,'terrain':{key:list(dict.fromkeys(s['performance'][field] for s in samples)) for key,field in [('requested','terrainRequestedLevels'),('effective','terrainEffectiveLevels'),('coverage','terrainCoverageRadius')]},'staticShadowFailures':[s['sceneryShadow']['failure'] for s in samples if s['sceneryShadow']['failure'] is not None],'controller':quantiles(perf['controllerOverheadMs']),'inputCounts':perf['inputCounts'],'events':perf['observedGalacticEvents'],'vehicleCollisionCount':perf['vehicleCollisionCount'],'collisionCountScope':perf['collisionCountScope'],'traceRows':len(record['trace']),'wrongWay':sum(bool(t['wrongWay']) for t in record['trace']),'hero':record['snapshot']['game']['vehiclePresentation']['racers'][0],'racers':record['snapshot']['game']['vehiclePresentation']['racers'],'championship':record['profile']['championship']}
    receipt=read(output/'receipt.json')
    result['receipt']={k:receipt.get(k) for k in ['outcome','error','build','device','browserVersion','requestedQualityOverride','appearanceSelection','selectedAppearanceBeforeStart','scriptHash','errors','completedAt','resultsActionsBounds','highlightText']}
    if receipt.get('cupContinue'):
        next=receipt['cupContinue']['game']; result['receipt']['cupContinue']={'eventId':next['mastery']['eventId'],'championshipRound':next['mastery']['championshipRound'],'awaitingStart':next['awaitingStart']}
    write(output / 'analysis-summary.json', result)
    print(json.dumps({label:{'gate':r.get('gate'), 'summary':r.get('summary'), 'rendererExtrema':r.get('rendererExtrema')} for label,r in result.items() if label!='receipt'}), flush=True)

if __name__=='__main__':
    action=sys.argv[1]; output=ROOT / sys.argv[2]
    if action=='manifest': manifest(output,sys.argv[3])
    elif action=='finish':
        cleanup(output); manifest(output,'after'); compare(output); analyze(output)
