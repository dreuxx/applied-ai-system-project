"""Audit every exported vector, display credit and genre-index entry."""

import csv, json, math
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"


def read(name):
    with (DATA / name).open(encoding="utf8", newline="") as f:
        yield from csv.DictReader(f)


model = json.loads((DATA / "model.json").read_text(encoding="utf8"))
names = json.loads((DATA / "vector_dimensions.json").read_text(encoding="utf8"))
members = set()
for t, row, v in zip(
    model["tracks"], read("tracks.csv"), read("song_vectors.csv"), strict=True
):
    assert t[0] == row["track_id"] == v["track_id"] and t[1] == row["title"]
    credit = t[7] if len(t) > 7 else model["artists"][t[6]]
    assert credit == row["artist"]
    got = {
        names[int(j)]: float(val)
        for j, val in zip(v["indices"].split(), v["values"].split(), strict=True)
    }
    assert set(row["genres"].split("|")) == {model["genres"][j] for j in t[2]}
    expected = {"genre:" + model["genres"][k]: 1.0 for k in t[2]}
    for ix, field, pre in [(3, "moods", "mood:"), (4, "instruments", "instrument:")]:
        expected.update({pre + model[field][k]: len(t[ix]) ** -0.5 for k in t[ix]})
    if t[5] is not None:
        expected.update(
            {
                "tempo:" + str(k): math.exp(-0.5 * ((t[5] - k) / 33) ** 2)
                for k in (65, 115, 165)
            }
        )
    assert expected.keys() == got.keys() and all(
        math.isclose(val, got[k], rel_tol=6e-7, abs_tol=1e-12)
        for k, val in expected.items()
    )
    members.update((t[0], model["genres"][j]) for j in t[2])
count = len(members)
for row in read("tracks_by_genre.csv"):
    members.remove((row["track_id"], row["genre"]))
assert not members
print(
    f"{len(model['tracks'])} vectors and artist credits matched; {count} genre memberships matched."
)
