# Survey & Benchmark — Vector Quantization for ANNS

Open [`index.html`](index.html) directly in a browser. It is a dependency-free static page; the data lives in `data.js`, rendering and interactions in `app.js`, and styling in `styles.css`.

The values are curated from the generated P1/P2/P3 fragments in `figures/` and from the dataset/method tables in `main.tex`. Curves keep representative operating points so the comparisons remain readable. Update `data.js` when a new benchmark export changes the manuscript figures.

The layout follows the dataset-first presentation used by [VQ-bench](https://vq-bench.com/) and [ANN-Benchmarks](https://ann-benchmarks.com/index.html): the protocol is documented beside the results, the search frontier has Explore and Table views, and the current selection can be copied as a URL or downloaded as SVG.

`data.js` is generated from every `plot coordinates` block in the manuscript workspace's `figures/p1-distortion.tex` and `figures/p2-end2end.tex` with `node scripts/extract-figure-data.js`; no curve points are downsampled in the published page.
