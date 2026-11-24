"""Reproduce the logistic model and grouped holdout on CPU from the original CSV."""
import os
for var in ["OMP_NUM_THREADS","OPENBLAS_NUM_THREADS","MKL_NUM_THREADS"]: os.environ[var]="1"
import csv, json, hashlib, re
from pathlib import Path
import numpy as np
from scipy.optimize import minimize
from scipy.special import logsumexp
ROOT=Path(__file__).resolve().parents[1]
patterns={
"Piano":"pianos?", "Guitar":"guitars?", "Bass":"bass|basses", "Drums":"drums?|drum kit|snare|brushed kit", "Percussion":"percussion|shakers?|rattles?|congas?|bongos?|tambourines?|cajon", "Synth":"synths?|synthesizers?", "Strings":"strings","Violin":"violins?|fiddles?","Cello":"cellos?","Viola":"violas?","Flute":"flutes?|piccolos?","Clarinet":"clarinets?","Harp":"harps?","Organ":"organs?","Trumpet":"trumpets?","Trombone":"trombones?","Horn":"horns?","Tuba":"tubas?","Sax":"sax|saxes|saxophones?","Voice":"choirs?|voices?|vocals?|chorus","Oboe":"oboes?","Bassoon":"bassoons?|contrabassoons?","Marimba":"marimbas?","Bells":"bells?|chimes?|glockenspiel","Vibraphone":"vibraphones?","Xylophone":"xylophones?","Accordion":"accordions?","Ukulele":"ukuleles?","Banjo":"banjos?","Lute":"lutes?","Timpani":"timpani","Celesta":"celesta","Orchestra":"orchestras?","Mandolin":"mandolins?","Kalimba":"kalimbas?","Harmonica":"harmonicas?","Harpsichord":"harpsichords?"}
def labels(s):return [v.strip() for v in s.split(",") if v.strip()]
def family(s):return re.split(r"\s+-\s+|\s*\(",s.casefold(),maxsplit=1)[0].strip()
def fit(x,y,k):
    n,dim=x.shape
    def loss(flat):
        w=flat.reshape(dim+1,k);z=x@w[:-1]+w[-1];z-=logsumexp(z,axis=1)[:,None]
        obj=-z[np.arange(n),y].mean()+.002*(w[:-1]**2).sum()
        p=np.exp(z);p[np.arange(n),y]-=1;p/=n
        return obj,np.vstack((x.T@p+.004*w[:-1],p.sum(0))).ravel()
    opt=minimize(loss,np.zeros((dim+1)*k),jac=True,method="L-BFGS-B",options=dict(maxiter=350,ftol=1e-12,gtol=1e-7))
    if not opt.success:raise RuntimeError(opt.message)
    return opt.x.reshape(dim+1,k)
def main():
    rows=list(csv.DictReader((ROOT/'data/tracks.csv').open(encoding="utf8")))
    gs=sorted({r['genre'] for r in rows});ms=sorted({t for r in rows for t in labels(r['moods'])});ins=sorted(patterns)
    tracks=[];vectors=[]
    for r in rows:
        m=sorted({ms.index(v) for v in labels(r['moods'])});a=[]
        for j,i in enumerate(ins):
            hits=[v for v in labels(r['instruments'].lower()) if re.search(r"\b(?:"+patterns[i]+r")\b",v)]
            if i=="Bass":hits=[v for v in hits if not re.search(r"\b(clarinet|flute|drum|trombone|voice|sax|horn)s?\b",v)]
            if hits:a.append(j)
        bpm=int(r['bpm']) if r['bpm'] else None
        x=np.zeros(len(ms)+len(ins)+3)
        if m:x[m]=1/np.sqrt(len(m))
        if a:x[len(ms)+np.array(a)]=1/np.sqrt(len(a))
        if bpm is not None:x[-3:]=np.exp(-.5*((bpm-np.array([65,115,165]))/33)**2)
        tracks.append([r['isrc'],r['title'],gs.index(r['genre']),m,a,bpm]);vectors.append(x)
    x=np.asarray(vectors);y=np.array([s[2] for s in tracks])
    test=np.array([int(hashlib.sha256(family(s[1]).encode()).hexdigest()[:8],16)%5==0 for s in tracks])
    w=fit(x[~test],y[~test],len(gs));order=np.argsort(-(x[test]@w[:-1]+w[-1]),axis=1);truth=y[test];prior=np.bincount(y[~test]).argmax()
    report=dict(train=int((~test).sum()),test=int(test.sum()),prior_top1=int((truth==prior).sum()),top1=int((truth==order[:,0]).sum()),top3=int((truth[:,None]==order[:,:3]).any(1).sum()),macro_recall=float(np.mean([(order[truth==i,0]==i).mean() for i in np.unique(truth)])))
    with (ROOT/'evidence/holdout.csv').open('w',newline='') as f:
        out=csv.writer(f);out.writerow(['isrc','genre','pred1','pred2','pred3'])
        for ix,p in zip(np.where(test)[0],order):out.writerow([tracks[ix][0],gs[y[ix]],*[gs[j] for j in p[:3]]])
    with (ROOT/'data/song_vectors.csv').open('w',newline='') as f:
        out=csv.writer(f);out.writerow(['isrc','genre',*['mood_'+t for t in ms],*['instrument_'+t for t in ins],'bpm_slow','bpm_medium','bpm_fast'])
        for s,v in zip(tracks,x):out.writerow([s[0],gs[s[2]],*[format(j,'.7g') for j in v]])
    model=dict(genres=gs,moods=ms,instruments=ins,tracks=tracks,w=np.round(fit(x,y,len(gs)),6).tolist())
    (ROOT/'data/model.json').write_text(json.dumps(model,ensure_ascii=False,separators=(',',':')))
    (ROOT/'evidence/classifier.json').write_text(json.dumps(report,indent=2));print(report)
if __name__=='__main__':main()
