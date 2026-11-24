# CueCrate Mobile

Download **CueCrate_Movil.html** and open the saved file in a browser with JavaScript. Everything needed for recommendation and the 28 audio previews is embedded in the file. No Python installation, API key, network connection or server is required on the phone. A file preview that disables scripts cannot run this app.

## Base project and design

The Module 3 **Music Recommender Simulation** ranked 18 hand-written tracks from a taste profile and explained its scoring rules. This edition keeps the idea of user-entered preferences and implements a compact supervised model, CSV ingestion, on-device ranking, offline playback and reproducible checks. [Original project](https://github.com/dreuxx/ai110-module3show-musicrecommendersimulation-starter).

## Try it

1. Tap **Probar un perfil de jazz**. Open the score breakdown under *Samba Isobel*.
2. Open **Cargar preferencias desde CSV** and select [preferencias.csv](data/preferencias.csv). Choose the rock profile and tap **Usar este perfil**. The first suggestion becomes *Neolith*.
3. Choose the fourth CSV profile and listen to *C-Funk*. All 1,443 tracks are searchable; 28 have seven-second local previews. Only explicitly opened publisher and license links need internet.

## Data, model and architecture

Each recording has a publisher ID, genre, moods, instruments and possibly tempo. The project uses a local snapshot of Incompetech metadata. The source endpoint and snapshot checksums are in [provenance.json](data/provenance.json). Audio credits and excerpt offsets are in [credits.csv](data/credits.csv). The catalog and publisher URLs are in [tracks.csv](data/tracks.csv). The numerical [song_vectors.csv](data/song_vectors.csv) contains 21 mood features, 37 instrument-family features and three smooth tempo features centered at 65, 115 and 165 BPM. Unknown tempo gives three zeros. Tags in each feature group are normalized to unit length. A regularized logistic regression predicts the publisher's genre using these 61 features. Genre, title and identifier are excluded from training inputs. Each user profile uses the same encoding.

On the phone the model computes softmax(xW + b) across 23 genres. The song score combines mood cosine (weight 3), instrument cosine (3), tempo proximity (1.5), and the candidate genre probability divided by the largest predicted genre probability (1). Tempo proximity is exp(−0.5 × ((requested BPM − song BPM)/25)²). Only active signals are averaged. A selected genre filters candidates exactly. With a fixed genre the learned term is constant across tracks. With no genre restriction it can change their order. A score of 62/100 means feature compatibility, not a 62% probability the listener likes the track.

At least one selected tag must match. Strict mode requires every selected tag. Asking for tempo omits tracks with unknown BPM. Genre-only matches tie and are ordered by recording ID. Blank profiles or impossible requests return an explanation. Title variations are grouped, and selecting a recording as the next profile excludes its title family.

![Offline recommendation architecture](assets/architecture.png)

[Architecture diagram in Mermaid](diagrams/architecture.mmd) · [Model card](model_card.md) · [AI collaboration](ai_interactions.md).

## Reproduce the experiments

Developers can use Python 3.12 with NumPy 2.3.5 and SciPy 1.17.0 to fit and export the model, and Node 22+ to run the same ranking module used on the phone.

```bash
python -m pip install -r requirements.txt
python tools/train.py
python tools/build.py
node tests/evaluate.cjs --write
```

The HTML builds from checked-in data, weights, credited clips and source. The catalog CSV can be inspected without running code. Refit after editing source metadata. The scoring module uses the embedded fitted model. The evaluation CSVs and test profiles are never read at runtime.

To rerun the optional browser checks from the project root, install Playwright locally and its Chromium binary, then run the file-based test.

```bash
npm install --no-save playwright@1.62.1
npx playwright install chromium
node tests/browser.mjs
```

### Measured execution evidence

Command for the following sessions: `node tests/evaluate.cjs`. The profile definitions and assertions are in [the evaluation script](tests/evaluate.cjs).

```text
{ profiles: 16, slots: 48, direct: 48, hybrid: 48, changed: 3 }
```

```text
Input: Jazz | Relaxed | Piano | 90 BPM
Jazz: Samba Isobel, Ultralounge, Bass Vibes
```

```text
Input: Rock | Intense | Guitar | 140 BPM
Rock: Neolith, Metalmania, Cool Rock
```

```text
Empty: empty; Urban + harpsichord (strict): no_match.
```

The learned genre model classified 140/271 held-out recordings correctly at rank one and 201/271 within its top three. A majority-genre baseline classified 56/271 correctly. Training used 1,172 recordings in this experiment. Title families were assigned to partitions by hash. The shipped model was subsequently refit on all 1,443 rows. See [per-track held-out predictions](evidence/holdout.csv).

Recommendation relevance was assessed separately on 16 scripted profiles. A result had to match the chosen genre, at least one tag per active group, and a tempo within 30 BPM if selected. Both the direct vector baseline and the hybrid model satisfied 48/48 top-three positions. The model changed three first choices, without improving this particular relevance metric. For example, with Relaxed + Calming, Guitar and no genre filter, direct matching ranked *Somewhere Sunny* first. Adding genre estimates promoted *Windswept* from second to first. Listener ratings were not collected. See the [individual profiles and component scores](evidence/ranking.json).

The release was opened from a local file in Chromium with touch emulation and networking disabled. The test imports preferences, changes results, plays an embedded audio clip, handles a malformed CSV and checks three viewport widths. See [browser results](evidence/browser.json). Physical iOS and Android devices have not been tested.

## Reflection and portfolio

The most useful engineering distinction was separating a measurable label from a subjective outcome. Genre can be checked against the catalog. Musical taste ultimately needs a listener. This portfolio project shows how to prepare inspectable data, run a small model under mobile constraints and test the delivered artifact. The public GitHub URL is assigned when the owner uploads the project. [Presentation and demo guide](presentation/Walkthrough.pdf) · [Spanish setup and publishing](INICIO_ES.md).
