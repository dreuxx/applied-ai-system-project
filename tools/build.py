from pathlib import Path
import json, base64

root = Path(__file__).resolve().parents[1]
s = (root / "src/page.html").read_text()


def embed(v):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":")).replace(
        "<", "\\u003c"
    )


art = {path.stem: "data:image/webp;base64," + base64.b64encode(path.read_bytes()).decode("ascii")
       for path in sorted((root / "assets/art").glob("*.webp"))}
for token, value in [
    ("/*STYLE*/", (root / "src/app.css").read_text()),
    *[(f"__IMG_{key}__", art[key]) for key in ("concert", "hiphop", "jazz", "rock")],
    ("__ART__", embed({key: art[key] for key in ("window", "rain", "petals")})),
    ("__MODEL__", embed(json.loads((root / "data/model.json").read_text()))),
    (
        "__AUDIO__",
        embed(
            {
                p.stem: base64.b64encode(p.read_bytes()).decode()
                for p in sorted((root / "assets/audio").glob("*.mp3"))
            }
        ),
    ),
    ("/*ENGINE*/", (root / "src/rank.js").read_text()),
    ("/*UI*/", (root / "src/ui.js").read_text()),
]:
    s = s.replace(token, value)
(root / "CueCrate_Movil.html").write_text(s)
print(len(s.encode()), "bytes")
