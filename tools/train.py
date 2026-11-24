"""Fit one logistic regression per genre, with all recordings of an artist in one split."""

import os

for key in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[key] = "1"
from pathlib import Path
import csv, hashlib, json
from collections import Counter
import numpy as np
from scipy import sparse
from scipy.optimize import minimize
from scipy.special import expit

ROOT = Path(__file__).resolve().parents[1]


def tags(s):
    return s.split("|") if s else []


def write_json(path, obj):
    path.write_text(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )


def fit(x, y):
    """Regularized binary cross-entropy. Each label can be present independently."""
    n, p = x.shape
    result = []
    for j in range(y.shape[1]):
        target = y[:, j].toarray().ravel()

        def objective(v):
            logits = x @ v[:p] + v[p]
            residual = expit(logits) - target
            loss = (
                np.logaddexp(0, logits).sum() - target @ logits + 2.5 * (v[:p] @ v[:p])
            )
            return loss / n, np.r_[x.T @ residual + 5 * v[:p], residual.sum()] / n

        init = np.zeros(p + 1)
        init[p] = np.log((target.sum() + 0.5) / (n - target.sum() + 0.5))
        opt = minimize(
            objective,
            init,
            method="L-BFGS-B",
            jac=True,
            options={"maxiter": 180, "ftol": 1e-10, "gtol": 1e-6},
        )
        if not opt.success:
            raise RuntimeError(opt.message)
        result.append(opt.x)
    return np.stack(result, axis=1)


def main():
    data = ROOT / "data"
    evidence = ROOT / "evidence"
    with (data / "tracks.csv").open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    ids = [r["track_id"] for r in rows]
    assert len(set(ids)) == len(ids)
    keys = ["genres", "moods", "instruments"]
    vocab = {k: sorted({v for r in rows for v in tags(r[k])}) for k in keys}
    ix = {k: {v: i for i, v in enumerate(vocab[k])} for k in keys}
    artists = {r["artist_id"]: r["artist"] for r in rows}
    artist_ids = sorted(artists)
    artist_ix = {a: i for i, a in enumerate(artist_ids)}
    model = {**vocab, "artists": [artists[a] for a in artist_ids], "tracks": []}
    ds = [len(vocab[k]) for k in keys]
    columns = (
        ["genre:" + s for s in vocab["genres"]]
        + ["mood:" + s for s in vocab["moods"]]
        + ["instrument:" + s for s in vocab["instruments"]]
        + ["tempo:65", "tempo:115", "tempo:165"]
    )
    write_json(data / "vector_dimensions.json", columns)
    xv = []
    xr = []
    xc = []
    yr = []
    yc = []
    test = []
    counts = Counter()
    with (data / "song_vectors.csv").open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["track_id", "indices", "values"])
        for n, r in enumerate(rows):
            g, m, i = ([ix[k][v] for v in tags(r[k])] for k in keys)
            bpm = int(r["bpm"]) if r["bpm"] else None
            track = [r["track_id"], r["title"], g, m, i, bpm, artist_ix[r["artist_id"]]]
            # Some source artist IDs have different credited names across recordings.
            if r["artist"] != artists[r["artist_id"]]:
                track.append(r["artist"])
            model["tracks"].append(track)
            coords = {j: 1.0 for j in g}
            yr.extend([n] * len(g))
            yc.extend(g)
            counts.update(g)
            for offset, labels in [(ds[0], m), (ds[0] + ds[1], i)]:
                for j in labels:
                    coords[offset + j] = 1 / np.sqrt(len(labels))
            if bpm is not None:
                for j, center in enumerate([65, 115, 165]):
                    coords[sum(ds) + j] = np.exp(-0.5 * ((bpm - center) / 33) ** 2)
            for j, value in coords.items():
                if j >= ds[0]:
                    xr.append(n)
                    xc.append(j - ds[0])
                    xv.append(value)
            w.writerow(
                [
                    r["track_id"],
                    " ".join(str(j) for j in coords),
                    " ".join(format(v, ".7g") for v in coords.values()),
                ]
            )
            test.append(
                int(hashlib.sha256(r["artist_id"].encode()).hexdigest()[:8], 16) % 5
                == 0
            )
    x = sparse.csr_matrix((xv, (xr, xc)), shape=(len(rows), len(columns) - ds[0]))
    y = sparse.csr_matrix((np.ones(len(yr)), (yr, yc)), shape=(len(rows), ds[0]))
    observed = np.asarray(x.getnnz(axis=1)) > 0
    test = np.asarray(test)
    train = ~test & observed
    ev = test & observed
    train_art = {r["artist_id"] for n, r in enumerate(rows) if train[n]}
    test_art = {r["artist_id"] for n, r in enumerate(rows) if ev[n]}
    assert not train_art.intersection(test_art)
    w = fit(x[train], y[train])
    logits = x[ev] @ w[:-1] + w[-1]
    order = np.argsort(-logits, axis=1)[:, :3]
    hits = np.take_along_axis(y[ev].toarray(), order, axis=1).astype(bool)
    majority = int(np.asarray(y[train].sum(axis=0)).argmax())
    stats = dict(
        tracks=len(rows),
        artists=len(artists),
        sources=dict(Counter(r["source"] for r in rows)),
        genres=ds[0],
        moods=ds[1],
        instruments=ds[2],
        vector_dimensions=len(columns),
        eligible_for_training=int(observed.sum()),
        fit=int(train.sum()),
        holdout=int(ev.sum()),
        training_artists=len(train_art),
        holdout_artists=len(test_art),
        overlap_artists=0,
        top1=int(hits[:, 0].sum()),
        top3=int(hits.any(axis=1).sum()),
        prior_top1=int(y[ev, majority].sum()),
        missing_bpm=sum(not r["bpm"] for r in rows),
    )
    with (evidence / "holdout.csv").open("w", encoding="utf8", newline="") as f:
        out = csv.writer(f)
        out.writerow(["track_id", "artist_id", "genres", "pred1", "pred2", "pred3"])
        for n, labels in zip(np.where(ev)[0], order):
            out.writerow(
                [
                    ids[n],
                    rows[n]["artist_id"],
                    rows[n]["genres"],
                    *[vocab["genres"][j] for j in labels],
                ]
            )
    with (data / "genres.csv").open("w", encoding="utf8", newline="") as f:
        out = csv.writer(f)
        out.writerow(["genre", "tracks", "artists"])
        for label, j in ix["genres"].items():
            keep = y[:, j].nonzero()[0]
            out.writerow([label, counts[j], len({rows[n]["artist_id"] for n in keep})])
    # One row per genre membership enables spreadsheet filtering without splitting tags.
    with (data / "tracks_by_genre.csv").open("w", encoding="utf8", newline="") as f:
        out = csv.writer(f)
        out.writerow(["genre", "track_id", "artist", "title"])
        for label, j in ix["genres"].items():
            members = sorted(
                y[:, j].nonzero()[0],
                key=lambda n: (
                    rows[n]["artist"].casefold(),
                    rows[n]["title"].casefold(),
                    ids[n],
                ),
            )
            out.writerows(
                (label, ids[n], rows[n]["artist"], rows[n]["title"]) for n in members
            )
    model["w"] = np.round(fit(x[observed], y[observed]), 6).tolist()
    write_json(data / "model.json", model)
    (evidence / "classifier.json").write_text(json.dumps(stats, indent=2))
    print(stats)


if __name__ == "__main__":
    main()
