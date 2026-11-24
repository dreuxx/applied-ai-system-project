# Implementation decisions and observed workflow

The request evolved from a server-backed semantic search and audio-identification project into a phone-sized, offline recommender using musical preferences and CSVs. The final workflow uses a frozen numerical model in the local page. It validates a form or profile CSV, encodes the listener, predicts a genre distribution, filters eligible rows, ranks and explains the selected tracks. A listener can use one result as a new seed.

Sample workflow: the first CSV row selects Jazz, Relaxed, Piano, 90 BPM and strict tags. The shared ranker returns Samba Isobel. Switching to the rock profile returns Neolith. The fourth row filters to offline samples and returns C-Funk. [Machine-readable profiles, selected tracks and score contributions](evidence/ranking.json) · [Offline interaction checks](evidence/browser.json).
