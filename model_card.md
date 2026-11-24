# CueCrate Mobile model card

## Intended use and model

Recommend tracks from two music collections using explicit genre, instrumentation, mood and optional tempo. The phone displays the artist, the matching features and the score breakdown. A separate bank of 103 regularized logistic regressions estimates genre membership, using 126 non-genre features and an intercept per classifier. A track can have many positive genre labels.

## Limitations and biases

Jamendo contributors supply tags. A zero can mean a missing annotation. Independent artists from this collection dominate the catalog, and 55,460 tracks lack BPM. Choosing a tempo limits recommendations to the Incompetech collection. Similar artist names or aliases may have distinct IDs. Benchmarks use track metadata and artist IDs, with no human ratings, physical-phone trials or calibration study. Estimated genre likelihoods and ranking scores should not be used to predict individual enjoyment.

## What surprised me in testing

A direct vector comparison and the learned hybrid met the same criteria in all 57 tested positions. The learned model still changed four first choices. An artist-disjoint test also produced a stronger top-one genre hit rate than the frequency baseline (50.6% versus 32.0%). These results answer different questions. A future listening study could present randomized pairs of tracks from the two rankings.

## AI collaboration

The user proposed the offline CSV-and-vector design. The first implementation used a single composer, and the user asked for more artists and genre coverage. We revised the single-composer catalog by incorporating MTG-Jamendo from Hugging Face. We accepted compact numerical features for mobile inference and revised the original single-label genre model because thousands of tracks have multiple labels. The assistant implemented the pipeline and ran the reported tests.

## Misuse and safeguards

The app labels results as feature compatibility, shows the artist and links to the recording. Only supplied BPM are used, and selecting tempo explains the coverage limit. All preferences stay in device memory. Academic dataset terms and source credits are in DATA_LICENSES.md. No Jamendo audio is distributed.
