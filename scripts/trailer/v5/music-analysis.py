import subprocess, json
import numpy as np
path='output/trailer-v5/music/race-the-sun.mp3'
y=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',path,'-f','f32le','-ar','11025','-ac','1','pipe:1']),dtype=np.float32)
hop=256;n=1024
frames=np.lib.stride_tricks.sliding_window_view(y,n)[::hop]
spec=np.abs(np.fft.rfft(frames*np.hanning(n),axis=1));on=np.maximum(0,np.diff(spec,axis=0)).mean(axis=1)
rate=11025/hop
section=on[int(60*rate):int(160*rate)];section-=section.mean()
corr=np.correlate(section,section,'full')[len(section)-1:]
lo,hi=int(rate*60/180),int(rate*60/90)
lag=lo+np.argmax(corr[lo:hi]);bpm=60*rate/lag
print('estimated bpm',bpm)
print('10-second RMS',[(i,round(float(np.sqrt(np.mean(y[i*11025:(i+10)*11025]**2))),3)) for i in range(0,280,10)])
peaks=[]
for i in range(1,len(on)-1):
 if on[i]>on[i-1] and on[i]>on[i+1] and on[i]>np.quantile(on,.93):peaks.append([round(i/rate,3),round(float(on[i]),3)])
json.dump({'autocorrelationCandidateBpm':bpm,'selectedEditBpm':123,'selectionNote':'Candidate rejected; strong onset spacing near 1.463 seconds gives three 123 BPM beats.','peaks':peaks},open('output/trailer-v5/music/analysis.json','w'),indent=2)
print('strong onsets 40-130 sec', [p for p in peaks if 40<p[0]<130][:100])
