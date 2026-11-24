"""Rebuild tracks.csv from pinned MTG-Jamendo TSVs plus the bundled Incompetech CSV."""

import argparse
import csv
import hashlib
import re
from pathlib import Path
from urllib.request import urlopen
from families import patterns

ROOT = Path(__file__).resolve().parents[1]
REV = "e900ccbfcc7cc73c63e1e8ec85dbc00c0039f677"
BASE = (
    f"https://huggingface.co/datasets/m-a-p/MTG/resolve/{REV}/mtg-jamendo-dataset/data/"
)
HASHES = {
    "autotagging.tsv": "a30655f45f4a7b4f9dba2d6b51d78733be33687eae3e8b9795e2234d54ef4e56",
    "raw.meta.tsv": "bb1efa2876536cbe1a8b67db5dda15249ca144f0cff69e481b638803cbdc9aca",
}
GENRE = {
    "hiphop": "Hip Hop",
    "rnb": "R&B",
    "bossanova": "Bossa Nova",
    "alternativerock": "Alternative Rock",
    "acidjazz": "Acid Jazz",
    "electronic": "Electronic",
    "jazzfunk": "Jazz Funk",
    "jazzfusion": "Jazz Fusion",
    "poprock": "Pop Rock",
    "hardrock": "Hard Rock",
    "heavymetal": "Heavy Metal",
    "drumnbass": "Drum and Bass",
    "newage": "New Age",
    "singersongwriter": "Singer-Songwriter",
    "deephouse": "Deep House",
    "synthpop": "Synth Pop",
    "punkrock": "Punk Rock",
    "classicrock": "Classic Rock",
    "bluesrock": "Blues Rock",
    "triphop": "Trip Hop",
    "darkambient": "Dark Ambient",
    "rocknroll": "Rock and Roll",
    "postrock": "Post Rock",
    "idm": "IDM",
    "edm": "EDM",
}
MOOD = {
    "relaxing": "Relaxed",
    "calm": "Calming",
    "groovy": "Grooving",
    "energetic": "Driving",
    "funny": "Humorous",
    "melancholic": "Somber",
}
INSTR = {
    "synthesizer": "Synth",
    "saxophone": "Sax",
    "bell": "Bells",
    "electricpiano": "Electric Piano",
    "classicalguitar": "Classical Guitar",
    "acousticguitar": "Acoustic Guitar",
    "electricguitar": "Electric Guitar",
    "acousticbassguitar": "Acoustic Bass Guitar",
    "doublebass": "Double Bass",
    "drummachine": "Drum Machine",
    "pipeorgan": "Pipe Organ",
}
PARENT = {
    "Electric Piano": "Piano",
    "Rhodes": "Piano",
    "Classical Guitar": "Guitar",
    "Acoustic Guitar": "Guitar",
    "Electric Guitar": "Guitar",
    "Acoustic Bass Guitar": "Bass",
    "Double Bass": "Bass",
    "Pipe Organ": "Organ",
    "Bongo": "Percussion",
}


def canonical(tags, mapping):
    return {mapping.get(t, t.capitalize()) for t in tags}


def joined(tags):
    return "|".join(sorted(tags))


def make(cache):
    cache.mkdir(parents=True, exist_ok=True)
    for name, digest in HASHES.items():
        path = cache / name
        if not path.exists():
            with urlopen(BASE + name, timeout=90) as r:
                payload = r.read()
            if hashlib.sha256(payload).hexdigest() != digest:
                raise ValueError(name + " download checksum mismatch")
            path.write_bytes(payload)
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError(name + " checksum mismatch")
    with (cache / "raw.meta.tsv").open(encoding="utf-8", newline="") as f:
        meta = {
            r["TRACK_ID"]: r
            for r in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
        }
    with (ROOT / "data/tracks.csv").open("w", encoding="utf-8", newline="") as out:
        w = csv.writer(out)
        w.writerow(
            [
                "track_id",
                "title",
                "artist_id",
                "artist",
                "genres",
                "moods",
                "instruments",
                "bpm",
                "source",
                "track_url",
            ]
        )
        with (ROOT / "data/incompetech.csv").open(
            encoding="utf-8", newline=""
        ) as originals:
            for r in csv.DictReader(originals):
                tags = r["instruments"].lower().split(",")
                ins = {
                    k
                    for k, rx in patterns.items()
                    if any(
                        re.search(r"\b(?:" + rx + r")\b", t)
                        and not (
                            k == "Bass"
                            and re.search(
                                r"\b(clarinet|flute|drum|trombone|voice|sax|horn)s?\b",
                                t,
                            )
                        )
                        for t in tags
                    )
                }
                w.writerow(
                    [
                        r["isrc"],
                        r["title"],
                        "incompetech-kevin",
                        r["artist"],
                        r["genre"],
                        joined(t.strip() for t in r["moods"].split(",") if t.strip()),
                        joined(ins),
                        r["bpm"],
                        "Incompetech",
                        r["track_url"],
                    ]
                )
        with (cache / "autotagging.tsv").open(encoding="utf-8", newline="") as f:
            rows = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
            next(rows)
            for tid, aid, album, path, seconds, *tags in rows:
                m = meta[tid]
                if m["ARTIST_ID"] != aid:
                    raise ValueError(tid)
                groups = {"genre": [], "instrument": [], "mood/theme": []}
                for tag in tags:
                    kind, value = tag.split("---", 1)
                    groups[kind].append(value)
                if (
                    not groups["genre"]
                    or not m["TRACK_NAME"].strip()
                    or not m["ARTIST_NAME"].strip()
                ):
                    continue
                ins = canonical(groups["instrument"], INSTR)
                ins.update(PARENT[t] for t in list(ins) if t in PARENT)
                w.writerow(
                    [
                        tid,
                        m["TRACK_NAME"].strip(),
                        aid,
                        m["ARTIST_NAME"].strip(),
                        joined(canonical(groups["genre"], GENRE)),
                        joined(canonical(groups["mood/theme"], MOOD)),
                        joined(ins),
                        "",
                        "MTG-Jamendo",
                        m["URL"].replace("http://", "https://", 1),
                    ]
                )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("cache", type=Path, help="TSV download/cache folder")
    make(p.parse_args().cache)
