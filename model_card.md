# CueCrate Mobile model card

## Intended use and decision

A listener chooses preferred musical characteristics. The app ranks credited Kevin MacLeod recordings, shows the features behind each choice and plays available excerpts. The classifier uses 1,426 weights and biases to estimate 23 genre labels. Musical preference uses a separate score. No listening history was used to train the model.

## Bias and limitations

All catalog entries come from one composer and one publisher's taxonomy. Rare genres have little training data. Average recall across represented holdout genres was about 26%, lower than overall accuracy. Instrument families reflect a curated mapping, and unlisted instruments can still be audible. Of 1,443 tracks, 247 lack BPM. The ranking test uses catalog facts rather than independent listening judgments.

## What surprised me in testing

Adding learned genre scores changed three first recommendations across 16 profiles. Both approaches still satisfied the same metadata criteria in every top-three slot. That is why I would run a blinded listening comparison before claiming that people prefer the hybrid model.

## AI collaboration and choice

I asked the AI to use real CSV data and translate musical preferences into vectors. I accepted an approach that shows the contribution of each feature group and tests against a simpler baseline. I revised the earlier server-based design because I wanted the phone itself to run the model. The AI implemented the local app and automated the tests. My next evaluation would use feedback from different listeners and physical phones.

## Misuse and safeguards

These outputs could be misrepresented as personal preference probabilities or recommendations across the entire music industry. The app labels compatibility separately from genre estimates and identifies the catalog author. Invalid options and unsupported CSVs are rejected. Empty profiles produce no unsolicited ranking. The page processes preferences locally in memory.
