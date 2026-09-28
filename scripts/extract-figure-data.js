const fs = require('fs');
const path = require('path');
const vm = require('vm');

const siteRoot = path.resolve(__dirname, '..');
const sourceRoot = path.resolve(siteRoot, '..');
const datasetIds = { SIFT: 'sift', DEEP: 'deep', GIST: 'gist', MARCO: 'marco', T2I: 't2i', LAION: 'laion' };
const methodIds = {
  normpq: 'neq', rabitq: 'rabit1', extrabitq_b2: 'rabit2', extrabitq_b5: 'rabit5',
  turbo_mse_b2: 'turboMse2', turbo_mse_b5: 'turboMse5', turbo_prod_b2: 'turboProd2', turbo_prod_b5: 'turboProd5',
  saq_b2: 'saq2', saq_b5: 'saq5', lvq_4x0: 'lvq4', lvq_8x0: 'lvq8'
};
const colorMethods = {
  PQ: 'pq', OPQ: 'opq', NormPQ: 'neq', SCANN: 'scann', RQ: 'rq', LSQ: 'lsq', LVQ: 'lvq8',
  RaBitQ: 'rabit1', MRQ: 'mrq', SAQ: 'saq5', HNSW: 'hnsw'
};

function parseCoordinates(text) {
  const points = [];
  const pointPattern = /\(([-+0-9.eE]+)\s*,\s*([-+0-9.eE]+)\)/g;
  let match;
  while ((match = pointPattern.exec(text))) points.push([Number(match[1]), Number(match[2])]);
  return points;
}

function parsePlots(filename) {
  const text = fs.readFileSync(path.join(sourceRoot, 'figures', filename), 'utf8');
  const result = {};
  let context = null;
  let pendingMethod = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/\\subfloat\[([A-Z0-9]+)-(QPS|Nprobe|ARE|MRE)\]/i);
    if (heading) {
      const dataset = datasetIds[heading[1].toUpperCase()];
      const mode = ['ARE','MRE'].includes(heading[2].toUpperCase()) ? heading[2].toUpperCase() : heading[2].toLowerCase();
      context = dataset ? { dataset, mode } : null;
      if (context) result[dataset] = result[dataset] || {};
      pendingMethod = null;
    }
    const comment = line.match(/^\s*%\s*([A-Za-z][A-Za-z0-9_]*):/);
    if (comment) pendingMethod = methodIds[comment[1]] || comment[1];
    const addplot = line.match(/^\s*\\addplot[^\n]*color=col([A-Za-z0-9]+)/);
    if (addplot) {
      const mark = line.match(/mark=([A-Za-z+]+)/);
      if (addplot[1] === 'TurboQuant') pendingMethod = mark?.[1] === '+' ? 'turboMse5' : 'turboProd5';
      else pendingMethod = colorMethods[addplot[1]] || pendingMethod;
    }
    const coordinates = line.match(/^\s*plot coordinates \{(.*?)\};/);
    if (coordinates && context && pendingMethod) {
      const points = parseCoordinates(coordinates[1]);
      if (points.length) {
        result[context.dataset][context.mode] = result[context.dataset][context.mode] || {};
        result[context.dataset][context.mode][pendingMethod] = points;
      }
      pendingMethod = null;
    }
  }
  return result;
}

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(siteRoot, 'data.js'), 'utf8'), sandbox);
const data = sandbox.window.PQE_DATA;
const endToEnd = parsePlots('p2-end2end.tex');
const distortion = parsePlots('p1-distortion.tex');

// Keep the generated source readable and preserve the hand-authored metadata/cost tables.
data.search = endToEnd;
data.distortion = distortion;
const output = `// Generated from figures/p1-distortion.tex and figures/p2-end2end.tex.\n// Every coordinate in those plot fragments is retained for hover and table views.\nwindow.PQE_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(path.join(siteRoot, 'data.js'), output);

const countPoints = (group) => Object.values(group).reduce((total, modes) => total + Object.values(modes).reduce((sum, series) => sum + Object.values(series).reduce((n, points) => n + points.length, 0), 0), 0);
console.log(`search points: ${countPoints(endToEnd)}`);
console.log(`distortion points: ${countPoints(distortion)}`);
