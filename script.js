// ---------- Setup ----------
const N = YEARS.length;
const COUNTRIES = Object.keys(DATA).filter(k => k !== 'Total' && k !== 'Others'); // the 10 named countries
const COLORS = ['#0E6F8F','#1E9AA7','#5CB7A6','#9AD0A0','#E3B94F','#EE8B3C','#C8553D','#8C5E8E','#5E6FA8','#7A8B93'];
const OTHERS_COLOR = '#C5CFD3';
let sel = N - 1;      // index of selected year (default: 2022)
let mode = 'year';    // ranking mode: 'year' or 'all'

const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('en-US');
const sgn = p => (p >= 0 ? '+' : '−') + Math.abs(p).toFixed(1) + '%';
const yoy = i => i === 0 ? null : (DATA.Total[i] - DATA.Total[i - 1]) / DATA.Total[i - 1] * 100;
const sum = a => a.reduce((s, v) => s + v, 0);
const colorOf = c => c === 'Others' ? OTHERS_COLOR : COLORS[COUNTRIES.indexOf(c)];

// ---------- KPI cards ----------
function drawKPIs() {
  const y = YEARS[sel], t = DATA.Total[sel], g = yoy(sel);
  const top = [...COUNTRIES].sort((a, b) => DATA[b][sel] - DATA[a][sel])[0];
  const cards = [
    ['Total registered emigrants in ' + y, fmt(t), 'all destinations'],
    ['Change from ' + (y - 1), g === null ? 'n/a' : `<span class="${g >= 0 ? 'up' : 'down'}">${sgn(g)}</span>`, g === null ? 'first year in the data' : fmt(DATA.Total[sel - 1]) + ' in ' + (y - 1)],
    ['Top destination in ' + y, top, fmt(DATA[top][sel]) + ' (' + (DATA[top][sel] / t * 100).toFixed(1) + '% of total)'],
    ['Cumulative 2001–2022', fmt(sum(DATA.Total)), 'registered emigrants, all years']
  ];
  $('kpis').innerHTML = cards.map(c => `<div class="kpi"><small>${c[0]}</small><b>${c[1]}</b><span>${c[2]}</span></div>`).join('');
}

// ---------- Line chart: annual totals ----------
function drawLine() {
  const W = 900, H = 300, L = 52, R = 16, T = 16, B = 30, iw = W - L - R, ih = H - T - B, max = 100000;
  const x = i => L + i * iw / (N - 1), y = v => T + ih - v / max * ih, tot = DATA.Total;
  let s = '';
  for (let v = 0; v <= max; v += 25000)
    s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v / 1000}k</text>`;
  YEARS.forEach((yr, i) => { if (i % 3 === 0 || i === N - 1) s += `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${yr}</text>`; });
  const pts = tot.map((v, i) => `${x(i)},${y(v)}`);
  s += `<path class="area" d="M${x(0)},${y(0)} L${pts.join(' L')} L${x(N - 1)},${y(0)}Z"/><path class="line" d="M${pts.join(' L')}"/>`;
  s += `<line class="sel" x1="${x(sel)}" x2="${x(sel)}" y1="${T}" y2="${T + ih}"/><circle class="dot" cx="${x(sel)}" cy="${y(tot[sel])}" r="5"/>`;
  tot.forEach((v, i) => {
    const g = yoy(i), tip = `${YEARS[i]}: ${fmt(v)} emigrants` + (g === null ? '' : ` (${sgn(g)} vs ${YEARS[i - 1]})`);
    s += `<rect class="hit" x="${x(i) - iw / (N - 1) / 2}" y="${T}" width="${iw / (N - 1)}" height="${ih}" data-i="${i}" data-tip="${tip}"/>`;
  });
  $('line').innerHTML = s;
}

// ---------- Ranking bars ----------
function drawRank() {
  const val = c => mode === 'year' ? DATA[c][sel] : sum(DATA[c]);
  const sorted = [...COUNTRIES].sort((a, b) => val(b) - val(a)), max = val(sorted[0]);
  $('rankTitle').textContent = mode === 'year' ? `Destinations ranked, ${YEARS[sel]}` : 'Destinations ranked, 2001–2022 total';
  $('rank').innerHTML = sorted.map((c, i) =>
    `<div class="row" data-tip="${c}: ${fmt(val(c))}"><span>${i + 1}. ${c}</span><div class="bar" style="width:${val(c) / max * 100}%"></div><b>${fmt(val(c))}</b></div>`).join('');
}

// ---------- Donut: share of total ----------
function drawDonut() {
  const t = DATA.Total[sel];
  const items = COUNTRIES.map(c => [c, DATA[c][sel]]).sort((a, b) => b[1] - a[1]);
  items.push(['Others', DATA.Others[sel]]);
  const r = 70, C = 2 * Math.PI * r; let off = 0, s = '';
  items.forEach(([c, v]) => {
    const len = v / t * C;
    s += `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${colorOf(c)}" stroke-width="28" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)" data-tip="${c}: ${(v / t * 100).toFixed(1)}% (${fmt(v)})"/>`;
    off += len;
  });
  s += `<text class="donutB" x="100" y="102">${fmt(t)}</text><text class="donutC" x="100" y="118">in ${YEARS[sel]}</text>`;
  $('donut').innerHTML = s;
  $('donutTitle').textContent = `Share of emigrants by destination, ${YEARS[sel]}`;
  $('legend').innerHTML = items.map(([c, v]) => `<li><i style="background:${colorOf(c)}"></i>${c}<em>${(v / t * 100).toFixed(1)}%</em></li>`).join('');
}

// ---------- Year-on-year bars ----------
function drawYoY() {
  const W = 900, H = 220, L = 52, R = 16, T = 12, B = 26, iw = W - L - R, ih = H - T - B, lo = -100, hi = 160;
  const y = v => T + (hi - v) / (hi - lo) * ih, step = iw / (N - 1), bw = step * .65;
  let s = '';
  [-100, -50, 0, 50, 100, 150].forEach(v => s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v}%</text>`);
  for (let i = 1; i < N; i++) {
    const g = yoy(i), cx = L + (i - .5) * step, top = Math.min(y(g), y(0)), h = Math.abs(y(g) - y(0));
    s += `<rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${Math.max(h, 1)}" fill="${g >= 0 ? '#14796B' : '#D4472B'}" ${i === sel ? 'stroke="#12262D" stroke-width="2"' : ''}/>`;
    s += `<rect class="hit" x="${cx - step / 2}" y="${T}" width="${step}" height="${ih}" data-i="${i}" data-tip="${YEARS[i]}: ${sgn(g)} vs ${YEARS[i - 1]}"/>`;
    if (i % 3 === 1 || i === N - 1) s += `<text class="ax" x="${cx}" y="${H - 8}" text-anchor="middle">${YEARS[i]}</text>`;
  }
  $('yoy').innerHTML = s;
}

// ---------- Insights (generated from the data, descriptive only) ----------
function drawInsights() {
  const sel = N - 1;
  const t = DATA.Total, hiI = t.indexOf(Math.max(...t)), loI = t.indexOf(Math.min(...t));
  const g = t.map((_, i) => i ? yoy(i) : 0), dropI = g.indexOf(Math.min(...g)), riseI = g.indexOf(Math.max(...g));
  const sorted = [...COUNTRIES].sort((a, b) => DATA[b][sel] - DATA[a][sel]), hi = sorted[0], lo = sorted[sorted.length - 1];
  const top3 = sum(sorted.slice(0, 3).map(c => DATA[c][sel])) / t[sel] * 100, oth = DATA.Others[sel] / t[sel] * 100;
  const odd = sel ? COUNTRIES.filter(c => DATA[c][sel] >= 1000 && DATA[c][sel] >= 3 * DATA[c][sel - 1]) : [];
  $('insights').innerHTML = `
    <div><h3>Historical trend</h3><p>The highest year was ${YEARS[hiI]} (${fmt(t[hiI])}) and the lowest was ${YEARS[loI]} (${fmt(t[loI])}). The sharpest drop was in ${YEARS[dropI]} (${sgn(g[dropI])}) and the sharpest rise was in ${YEARS[riseI]} (${sgn(g[riseI])}).</p></div>
    <div><h3>Destinations in ${YEARS[sel]}</h3><p>${hi} had the most registered emigrants (${fmt(DATA[hi][sel])}) and ${lo} the fewest among the ten named countries (${fmt(DATA[lo][sel])}).</p></div>
    <div><h3>Distribution in ${YEARS[sel]}</h3><p>The top three destinations (${sorted.slice(0, 3).join(', ')}) together took ${top3.toFixed(1)}% of the total. "Others" made up ${oth.toFixed(1)}%.</p></div>`;
  const ok = YEARS.every((_, i) => sum(Object.keys(DATA).filter(k => k !== 'Total').map(k => DATA[k][i])) === t[i]);
  $('quality').textContent = 'Data check: ' + (ok ? 'the ten countries plus "Others" add up to the "Total" row in every year.' : 'in some years the countries plus "Others" do not match the "Total" row.');
}

// ---------- Events ----------
function render() { $('yrOut').textContent = YEARS[sel]; $('yr').value = sel; drawKPIs(); drawLine(); drawRank(); drawDonut(); drawYoY(); drawInsights(); }
$('yr').addEventListener('input', e => { sel = +e.target.value; render(); });
$('tabs').addEventListener('click', e => {
  if (!e.target.dataset.mode) return;
  mode = e.target.dataset.mode;
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b === e.target));
  drawRank();
});
document.addEventListener('click', e => { const h = e.target.closest('[data-i]'); if (h) { sel = +h.dataset.i; render(); } });
const tip = $('tip');
document.addEventListener('mousemove', e => {
  const t = e.target.closest('[data-tip]');
  tip.style.opacity = t ? 1 : 0;
  if (t) { tip.textContent = t.dataset.tip; tip.style.left = Math.min(e.clientX + 14, innerWidth - 240) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; }
});
render();
