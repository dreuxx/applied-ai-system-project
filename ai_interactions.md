# Project decisions and evidence

The listener requested more artists, a CSV organized by genre, and vectors that fit on a phone. Joining the Hugging Face MTG-Jamendo tag and metadata tables by track ID retained artist names and overlapping genre labels. The pipeline exports an artist/track index per genre and sparse vectors keyed by the same ID. The original 28 local audio previews remain available.

In the app, selecting Hip Hop and Bass retrieves *Big Plans Remix* by Kellee Maize first. The track has Electronic, Hip Hop and Pop labels. The listener can use it as a new profile; this compares its entire genre vector. The reggae/guitar profile instead retrieves *Condition Humaine* by Le Zaarth. The app handles missing BPM by explaining which tracks are eligible. [Execution log](evidence/demo.txt) · [Component scores](evidence/ranking.json) · [Offline browser checks](evidence/browser.json).

The desktop workflow now uses Expo with a shared REST handler. A synthetic Spotify provider allowed token reuse, title/artist matching and upstream errors to be tested without live credentials. The local classifier remains independently runnable.
