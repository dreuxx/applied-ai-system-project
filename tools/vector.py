"""Read and decode the nonzero values for one track's sparse CSV vector."""

import argparse
import csv
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "data"


def read_vector(track_id):
    dimensions = json.loads(
        (DATA / "vector_dimensions.json").read_text(encoding="utf8")
    )
    with (DATA / "song_vectors.csv").open(encoding="utf8", newline="") as f:
        for row in csv.DictReader(f):
            if row["track_id"] == track_id:
                vector = [0.0] * len(dimensions)
                for j, value in zip(
                    row["indices"].split(), row["values"].split(), strict=True
                ):
                    vector[int(j)] = float(value)
                return dimensions, vector
    raise KeyError(track_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("track_id")
    parser.add_argument(
        "--dense", action="store_true", help="print all dimensions in schema order"
    )
    args = parser.parse_args()
    names, values = read_vector(args.track_id)
    print(
        json.dumps(
            values if args.dense else {k: v for k, v in zip(names, values) if v},
            ensure_ascii=False,
        )
    )
