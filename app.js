(() => {
  const D = window.PQE_DATA;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt = (value, digits = 2) => value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });
  const dataset = (id) => D.datasets.find((item) => item.id === id);
  const method = (id) => D.methods.find((item) => item.id === id);
  const coreKeys = ['pq','opq','mrq','rabit1','rabit5','hnsw'];
  const distortionKeys = ['pq','opq','rq','lsq','rabit1','saq5','turboMse5'];
  const state = { frontierDataset:'sift', frontierMode:'qps', distortionDataset:'sift', distortionMode:'ARE', costDataset:'deep', costMode:'it', scaleMode:'qps', visible:new Set(coreKeys) };

  function fillSelect(select, items, selected) {
    select.innerHTML = items.map((item) => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${esc(item.label)}</option>`).join('');
  }
  function setActive(selector, attr, value) {
    document.querySelectorAll(`[${attr}]`).forEach((button) => button.classList.toggle('active', button.getAttribute(attr) === value));
  }
  function renderKpis() {
    const cards = [
      ['6', 'million-scale datasets', 'SIFT · DEEP · GIST · MARCO · T2I · LAION'],
      ['19', 'methods / variants', 'product · additive · scalar · graph'],
      ['100M', 'largest scale point', 'DEEP scalability sweep'],
      ['24h', 'construction cutoff', 'RQ / LSQ gaps are explicit']
    ];
    $('kpiGrid').innerHTML = cards.map(([value,label,detail]) => `<article class="kpi"><span class="kpi-value">${value}</span><span class="kpi-label">${label}</span><span class="kpi-detail">${detail}</span></article>`).join('');
  }
  function renderDatasetStrip() {
    $('datasetStrip').innerHTML = D.datasets.map((item) => `<button type="button" class="dataset-chip ${item.id === state.frontierDataset ? 'active' : ''}" data-dataset-chip="${item.id}"><strong>${item.label}</strong>${item.dim}d · ${item.domain}</button>`).join('');
    document.querySelectorAll('[data-dataset-chip]').forEach((button) => button.addEventListener('click', () => {
      state.frontierDataset = button.dataset.datasetChip;
      $('frontierDataset').value = state.frontierDataset;
      renderDatasetStrip(); renderFrontier();
      $('frontier').scrollIntoView({ behavior:'smooth', block:'start' });
    }));
  }

  function showTooltip(event, text) {
    let tip = $('chartTooltip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'chartTooltip'; tip.className = 'tooltip'; document.body.appendChild(tip); }
    tip.textContent = text; tip.style.left = `${event.clientX}px`; tip.style.top = `${event.clientY}px`; tip.hidden = false;
  }
  function hideTooltip() { const tip = $('chartTooltip'); if (tip) tip.hidden = true; }
  function chartSvg(width = 960, height = 380) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('aria-hidden', 'true'); return svg;
  }
  function textNode(svg, x, y, text, cls, anchor = 'middle') {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('text-anchor', anchor); t.setAttribute('class', cls); t.textContent = text; svg.appendChild(t); return t;
  }
  function line(svg, x1, y1, x2, y2, cls) { const node = document.createElementNS('http://www.w3.org/2000/svg', 'line'); Object.entries({x1,y1,x2,y2}).forEach(([key,val]) => node.setAttribute(key,val)); node.setAttribute('class', cls); svg.appendChild(node); return node; }
  function scaleValue(value, min, max, pixels, log) {
    if (log) { const lo = Math.log10(Math.max(min, 1e-6)); const hi = Math.log10(Math.max(max, 1e-6)); return (Math.log10(Math.max(value, 1e-6)) - lo) / (hi-lo || 1) * pixels; }
    return (value-min) / (max-min || 1) * pixels;
  }
  function tickLabel(value, log) {
    if (!log) return fmt(value, value < 1 ? 2 : 0);
    if (value >= 1000) return `${Math.round(value/1000)}k`;
    if (value >= 1) return fmt(value, 0);
    return value.toFixed(2);
  }
  function renderLineChart(target, series, options) {
    const host = $(target); host.innerHTML = '';
    const W = 960, H = 380, margin = {left:66,right:24,top:20,bottom:48}; const iw = W-margin.left-margin.right, ih = H-margin.top-margin.bottom;
    const svg = chartSvg(W,H); const points = Object.values(series).flat();
    if (!points.length) { host.textContent = 'No data for this selection.'; return; }
    const allX = points.map((p) => p[0]); const allY = points.map((p) => p[1]);
    const xMin = options.xMin ?? Math.min(...allX); const xMax = options.xMax ?? Math.max(...allX); const yMin = options.logY ? Math.min(...allY) * .78 : Math.min(...allY); const yMax = options.logY ? Math.max(...allY) * 1.25 : Math.max(...allY);
    const x = (v) => margin.left + scaleValue(v,xMin,xMax,iw,false); const y = (v) => margin.top + ih - scaleValue(v,yMin,yMax,ih,options.logY);
    for (let i=0; i<=5; i++) { const xx = margin.left + iw*i/5; const yy = margin.top + ih - ih*i/5; line(svg,xx,margin.top,xx,margin.top+ih,'grid-line'); line(svg,margin.left,yy,margin.left+iw,yy,'grid-line'); textNode(svg,xx,margin.top+ih+22,fmt(xMin+(xMax-xMin)*i/5,2),'axis-label'); const val = options.logY ? 10 ** (Math.log10(yMin)+(Math.log10(yMax)-Math.log10(yMin))*i/5) : yMin+(yMax-yMin)*i/5; textNode(svg,margin.left-10,yy+3,tickLabel(val,options.logY),'axis-label','end'); }
    line(svg,margin.left,margin.top+ih,margin.left+iw,margin.top+ih,'axis-line'); line(svg,margin.left,margin.top,margin.left,margin.top+ih,'axis-line');
    textNode(svg,margin.left+iw/2,H-7,options.xTitle,'axis-title'); const yTitle = textNode(svg,16,margin.top+ih/2,options.yTitle,'axis-title'); yTitle.setAttribute('transform',`rotate(-90 16 ${margin.top+ih/2})`);
    Object.entries(series).forEach(([key,coords]) => {
      const m = method(key) || {color:'#777',label:key}; if (!coords || coords.length < 1) return;
      const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',coords.map((p,i) => `${i ? 'L':'M'} ${x(p[0]).toFixed(2)} ${y(p[1]).toFixed(2)}`).join(' ')); path.setAttribute('stroke',m.color); path.setAttribute('class','series-line'); svg.appendChild(path);
      coords.forEach((p) => { const c = document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('cx',x(p[0])); c.setAttribute('cy',y(p[1])); c.setAttribute('r','4'); c.setAttribute('fill',m.color); c.setAttribute('class','series-dot'); c.addEventListener('mouseenter',(e) => showTooltip(e,`${m.label} · ${options.xLabel} ${fmt(p[0],3)} · ${options.yLabel} ${fmt(p[1],2)}`)); c.addEventListener('mousemove',(e) => showTooltip(e,`${m.label} · ${options.xLabel} ${fmt(p[0],3)} · ${options.yLabel} ${fmt(p[1],2)}`)); c.addEventListener('mouseleave',hideTooltip); });
    });
    host.appendChild(svg);
  }

  function renderFrontierLegend() {
    $('frontierLegend').innerHTML = coreKeys.map((key) => { const m=method(key); return `<button type="button" class="legend-toggle ${state.visible.has(key) ? '' : 'off'}" data-legend-key="${key}"><i class="legend-swatch" style="background:${m.color}"></i>${m.label}</button>`; }).join('');
    document.querySelectorAll('[data-legend-key]').forEach((button) => button.addEventListener('click', () => { const key=button.dataset.legendKey; state.visible.has(key) ? state.visible.delete(key) : state.visible.add(key); renderFrontierLegend(); renderFrontier(); }));
  }
  function renderFrontier() {
    const selected = D.search[state.frontierDataset]; const source = selected[state.frontierMode]; const series = Object.fromEntries(coreKeys.filter((key) => state.visible.has(key) && source[key]).map((key) => [key,source[key]]));
    renderLineChart('frontierChart',series,{xTitle:'Recall@10',yTitle:state.frontierMode === 'qps' ? 'Queries / second' : 'nprobe',xLabel:'recall',yLabel:state.frontierMode === 'qps' ? 'QPS' : 'nprobe',logY:true,xMin:state.frontierMode === 'qps' ? .55 : Math.min(...Object.values(series).flat().map(p=>p[0]))*.94,xMax:1.0});
    const target = state.frontierMode === 'qps' ? .95 : .9; const rows=[]; Object.entries(series).forEach(([key,coords]) => { const point=coords.reduce((best,p)=>Math.abs(p[0]-target)<Math.abs(best[0]-target)?p:best,coords[0]); rows.push({key,point}); }); rows.sort((a,b)=>state.frontierMode === 'qps' ? b.point[1]-a.point[1] : a.point[1]-b.point[1]); const ds=dataset(state.frontierDataset);
    $('frontierInsight').innerHTML = `<div class="insight-kicker">${ds.label} · ${state.frontierMode === 'qps' ? 'QPS frontier' : 'probe budget'}</div><h3>${state.frontierMode === 'qps' ? 'Throughput separates after 0.95 recall.' : 'Routing effort is visible at a glance.'}</h3><p>${state.frontierMode === 'qps' ? 'The values below are the closest sampled points to Recall@10 = 0.95.' : 'The values below are the closest sampled points to Recall@10 = 0.90.'}</p><div class="insight-list">${rows.slice(0,4).map(({key,point})=>`<div class="insight-row"><span><i class="legend-swatch" style="background:${method(key).color};display:inline-block;margin-right:5px"></i>${method(key).label}</span><strong>${fmt(point[1],0)} ${state.frontierMode === 'qps' ? 'QPS' : 'probe'}</strong></div>`).join('')}</div>`;
  }

  function renderDistortion() {
    const source = D.distortion[state.distortionDataset]?.[state.distortionMode] || {}; const series=Object.fromEntries(distortionKeys.filter((key)=>source[key]).map((key)=>[key,source[key]]));
    renderLineChart('distortionChart',series,{xTitle:'Effective bits per dimension',yTitle:`${state.distortionMode} · squared-L2`,xLabel:'bpd',yLabel:state.distortionMode,logY:true,xMin:0,xMax:Math.max(...Object.values(series).flat().map(p=>p[0]))*1.02});
    const minima=Object.entries(series).map(([key,coords])=>({key,point:coords.reduce((best,p)=>p[1]<best[1]?p:best,coords[0])})).sort((a,b)=>a.point[1]-b.point[1]); $('distortionInsight').innerHTML=`<div class="insight-kicker">${dataset(state.distortionDataset).label} · ${state.distortionMode}</div><h3>${state.distortionMode === 'ARE' ? 'SAQ keeps the low-error tail.' : 'Additive methods dominate low rates.'}</h3><p>At matched low-rate operating points, the envelope is led by additive codes; scalar curves catch up as rate increases.</p><div class="insight-list">${minima.slice(0,4).map(({key,point})=>`<div class="insight-row"><span>${method(key)?.label || key}</span><strong>${fmt(point[1],4)} @ ${fmt(point[0],2)} bpd</strong></div>`).join('')}</div>`;
  }

  function renderCosts() {
    const ds = D.costs[state.costDataset]; const modeIndex={it:0,is:1,mo:2}[state.costMode]; const query=($('costFilter').value||'').toLowerCase(); const rows=D.methods.filter((m)=>m.label.toLowerCase().includes(query)).map((m)=>({m,value:ds[m.id]?.[modeIndex] ?? null})).sort((a,b)=>(a.value??Infinity)-(b.value??Infinity)); const values=rows.map((r)=>r.value).filter((v)=>v!=null); const max=Math.max(...values,1);
    $('costTable').innerHTML=`<table class="data-table"><thead><tr><th>Method</th><th>Family</th><th>${state.costMode==='it'?'Index time (s)':state.costMode==='is'?'Index size (MB)':'Search overhead (MB)'}</th><th>Rate</th><th>Path</th></tr></thead><tbody>${rows.map(({m,value})=>`<tr><td class="method-cell"><i class="legend-swatch" style="display:inline-block;background:${m.color};margin-right:6px"></i>${m.label}</td><td>${m.family}</td><td class="bar-cell" style="--fill:${value==null?0:(value/max*100).toFixed(2)}%"><span>${fmt(value, value != null && value > 1000 ? 1 : 2)}</span></td><td>${m.rate}</td><td>${m.rerank ? 'reranked' : m.family==='graph' ? 'graph' : 'no rerank'}</td></tr>`).join('')}</tbody></table>`;
  }

  function renderScale() {
    const source=D.scalability[state.scaleMode]; const keys=['pq','normpq','mrq','rabit1','rabit5','hnsw']; const series=Object.fromEntries(keys.map((key)=>[key,D.scalability[state.scaleMode][key].map((value,i)=>[D.scalability.sizes[i],value])]));
    renderLineChart('scaleChart',series,{xTitle:'Dataset size (M)',yTitle:state.scaleMode==='qps'?'QPS at Recall@10 = 0.9':'Indexing time (s)',xLabel:'size',yLabel:state.scaleMode==='qps'?'QPS':'seconds',logY:true,xMin:1,xMax:100});
    // Use generated labels in a small legend below the SVG without adding another control row.
    const host=$('scaleChart'); const legend=document.createElement('div'); legend.className='legend-filter'; legend.style.margin='10px 0 0'; legend.innerHTML=keys.map((key)=>`<span class="legend-toggle" style="cursor:default"><i class="legend-swatch" style="background:${method(key==='normpq'?'pq':key).color}"></i>${key==='normpq'?'PQ norm':method(key).label}</span>`).join(''); host.appendChild(legend);
  }

  function renderAblation() {
    const host=$('ablationChart'); host.innerHTML=''; const W=960,H=330,m={left:110,right:25,top:36,bottom:38}, cw=(W-m.left-m.right)/6, rh=(H-m.top-m.bottom)/D.ablation.length; const svg=chartSvg(W,H); const labels=['SIFT','DEEP','GIST','MARCO','T2I','LAION']; labels.forEach((label,i)=>textNode(svg,m.left+cw*(i+.5),22,label,'heat-label')); const max=12;
    D.ablation.forEach((row,r)=>{ textNode(svg,m.left-12,m.top+rh*(r+.5)+4,`${row.family} · ${row.variant}`,'heat-label','end'); row.values.forEach((v,c)=>{ const cell=document.createElementNS('http://www.w3.org/2000/svg','rect'); cell.setAttribute('x',m.left+c*cw+2); cell.setAttribute('y',m.top+r*rh+2); cell.setAttribute('width',cw-4); cell.setAttribute('height',rh-4); const intensity=Math.min(Math.abs(v)/max,1); const color=v>=0?`rgba(39,136,95,${.13+intensity*.72})`:`rgba(225,108,122,${.13+intensity*.72})`; cell.setAttribute('fill',color); cell.setAttribute('rx','5'); cell.setAttribute('class','heat-cell'); cell.addEventListener('mouseenter',(e)=>showTooltip(e,`${row.family} · ${row.variant} · ${labels[c]} · ${v>0?'+':''}${v} pts`)); cell.addEventListener('mouseleave',hideTooltip); svg.appendChild(cell); textNode(svg,m.left+c*cw+cw/2,m.top+r*rh+rh/2+4,`${v>0?'+':''}${v}`,'heat-label'); }); }); line(svg,m.left,m.top+D.ablation.length*rh+5,m.left+cw*6,m.top+D.ablation.length*rh+5,'axis-line'); textNode(svg,m.left+cw*3,H-7,'Dataset','axis-title'); host.appendChild(svg);
  }

  function renderOod() {
    const cards=[['t2i','T2I · text queries'],['laion','LAION · text queries']]; $('oodGrid').innerHTML=cards.map(([id,title])=>{ const values=D.ood[id]; const entries=[['exactID','Exact-ID',true],['exactOOD','Exact-OOD',true],['PQ','PQ*'],['OPQ','OPQ*'],['PQNorm','PQ Norm*'],['ScaNN','ScaNN*'],['MRQ','MRQ*'],['RaBitQ1','RaBitQ 1bit*'],['RaBitQ5','RaBitQ 5bits'],['SAQ5','SAQ 5bits'],['LVQ8','LVQ 8bits']]; return `<article class="ood-card"><h3>${title}</h3><p>Recall@10 at nprobe = 500</p><div class="ood-bars">${entries.map(([key,label,ref])=>`<div class="ood-row ${ref?'ref':''}"><span class="ood-label">${label}</span><span class="ood-track"><span class="ood-fill" style="width:${values[key]*100}%"></span></span><span class="ood-value">${(values[key]*100).toFixed(1)}%</span></div>`).join('')}</div></article>`; }).join('');
  }
  function renderMethods() { $('methodTableBody').innerHTML=D.methodSummary.map((row)=>`<tr>${row.map((cell,i)=>`<td>${i===0?`<strong>${esc(cell)}</strong>`:esc(cell)}</td>`).join('')}</tr>`).join(''); }
  function wireControls() {
    fillSelect($('frontierDataset'),D.datasets,state.frontierDataset); fillSelect($('distortionDataset'),D.datasets.slice(0,2),state.distortionDataset); fillSelect($('costDataset'),D.datasets,state.costDataset);
    $('frontierDataset').addEventListener('change',(e)=>{state.frontierDataset=e.target.value;renderDatasetStrip();renderFrontier();}); $('distortionDataset').addEventListener('change',(e)=>{state.distortionDataset=e.target.value;renderDistortion();}); $('costDataset').addEventListener('change',(e)=>{state.costDataset=e.target.value;renderCosts();}); $('costFilter').addEventListener('input',renderCosts);
    document.querySelectorAll('[data-frontier-mode]').forEach((b)=>b.addEventListener('click',()=>{state.frontierMode=b.dataset.frontierMode;setActive('[data-frontier-mode]','data-frontier-mode',state.frontierMode);renderFrontier();})); document.querySelectorAll('[data-distortion-mode]').forEach((b)=>b.addEventListener('click',()=>{state.distortionMode=b.dataset.distortionMode;setActive('[data-distortion-mode]','data-distortion-mode',state.distortionMode);renderDistortion();})); document.querySelectorAll('[data-cost-mode]').forEach((b)=>b.addEventListener('click',()=>{state.costMode=b.dataset.costMode;setActive('[data-cost-mode]','data-cost-mode',state.costMode);renderCosts();})); document.querySelectorAll('[data-scale-mode]').forEach((b)=>b.addEventListener('click',()=>{state.scaleMode=b.dataset.scaleMode;setActive('[data-scale-mode]','data-scale-mode',state.scaleMode);renderScale();}));
    $('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('pqe-theme',document.body.classList.contains('dark')?'dark':'light');}); if(localStorage.getItem('pqe-theme')==='dark')document.body.classList.add('dark');
    const sections=[...document.querySelectorAll('.panel-section, #overview')], links=[...document.querySelectorAll('.nav-link')]; const observer=new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting){links.forEach((link)=>link.classList.toggle('active',link.getAttribute('href')===`#${entry.target.id}`));}}),{rootMargin:'-20% 0px -65% 0px'}); sections.forEach((section)=>observer.observe(section));
  }
  renderKpis(); renderDatasetStrip(); renderFrontierLegend(); renderMethods(); wireControls(); renderFrontier(); renderDistortion(); renderCosts(); renderScale(); renderAblation(); renderOod();
})();
