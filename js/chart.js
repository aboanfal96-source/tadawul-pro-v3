/* ══════════════════════════════════════════
   chart.js — رسم الشارت والمؤشرات
══════════════════════════════════════════ */

let _cc = null; // chart coords

function drawChart() {
  const wrap   = document.getElementById('chartWrap');
  const canvas = document.getElementById('mc');
  if (!wrap || !canvas) return;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (!W || !H) return;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const cans = ST.candles[ST.sel];
  if (!cans || cans.length < 2 || !ST.prices[ST.sel]) {
    ctx.fillStyle = 'rgba(61,74,96,0.4)';
    ctx.font = '12px IBM Plex Sans Arabic,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⟳ جاري تحميل البيانات من Yahoo Finance...', W/2, H/2);
    return;
  }

  const vis = cans.slice(-80);
  const pad = { t:8, b:18, r:58, l:6 };
  const maxH = Math.max(...vis.map(c => c.h));
  const minL = Math.min(...vis.map(c => c.l));
  const range = maxH - minL || 1;
  const cw = (W - pad.l - pad.r) / vis.length;
  const bw = Math.max(1, cw * 0.65);
  const gap = (cw - bw) / 2;
  const py = p => pad.t + (1 - (p-minL)/range) * (H - pad.t - pad.b);

  // Save coords for drawing tools
  _cc = { W, H, pad, maxH, minL, range, py, cw, bw, gap };
  DT.toPrice   = y  => maxH - (y - pad.t) / ((H - pad.t - pad.b) / range);
  DT.fromPrice = py;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y  = pad.t + i * (H - pad.t - pad.b) / 5;
    const pv = maxH - i * range / 5;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.fillStyle = 'rgba(122,139,168,0.7)';
    ctx.font = '9px IBM Plex Mono,monospace';
    ctx.textAlign = 'left';
    ctx.fillText(pv.toFixed(2), W - pad.r + 4, y + 3);
  }

  // Strategy overlay
  drawOverlay(ctx, vis, W, H, pad, py, cw, bw, gap);

  // Candles
  vis.forEach((c, i) => {
    const x    = pad.l + i * cw + gap;
    const isUp = c.c >= c.o;
    const col  = isUp ? '#0fcf82' : '#f0445a';
    const oy = py(c.o), cy = py(c.c), hy = py(c.h), ly = py(c.l);
    const bt = Math.min(oy, cy);
    const bh = Math.max(1, Math.abs(cy - oy));
    const mx = x + bw / 2;
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx, hy); ctx.lineTo(mx, bt); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx, bt+bh); ctx.lineTo(mx, ly); ctx.stroke();
    ctx.fillStyle = isUp ? 'rgba(15,207,130,0.85)' : 'rgba(240,68,90,0.85)';
    ctx.fillRect(x, bt, bw, bh);
  });

  // Current price line
  const lc = vis[vis.length-1];
  const lp = py(lc.c);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = 'rgba(74,158,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.l, lp); ctx.lineTo(W - pad.r, lp); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#4a9eff';
  ctx.fillRect(W - pad.r, lp - 9, pad.r, 18);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px IBM Plex Mono,monospace';
  ctx.textAlign = 'center';
  ctx.fillText(lc.c.toFixed(2), W - pad.r + pad.r/2, lp + 4);

  // Sync drawing canvas
  const dtc = document.getElementById('dtCanvas');
  if (dtc && (dtc.width !== W || dtc.height !== H)) {
    dtc.width = W; dtc.height = H; redrawShapes();
  }
}

/* ── STRATEGY OVERLAYS ── */
function drawOverlay(ctx, vis, W, H, pad, py, cw, bw, gap) {
  const s = ST.strat;
  if (s === 'classic' || s === 'multi') drawClassic(ctx, vis, W, H, pad, py);
  if (s === 'ma'      || s === 'multi') drawMA(ctx, vis, W, H, pad, py, cw, bw, gap);
  if (s === 'harmonic')  drawHarmonic(ctx, vis, W, H, pad, py, cw, bw, gap);
  if (s === 'elliott')   drawElliott(ctx, vis, W, H, pad, py, cw, bw, gap);
  if (s === 'ichimoku')  drawIchimoku(ctx, vis, W, H, pad, py, cw, bw, gap);
  if (s === 'bollinger') drawBollinger(ctx, vis, W, H, pad, py, cw, bw, gap);
  if (s === 'vwap')      drawVWAP(ctx, vis, W, H, pad, py, cw, bw, gap);
}

function drawClassic(ctx, vis, W, H, pad, py) {
  const mxH = Math.max(...vis.map(c => c.h));
  const mnL = Math.min(...vis.map(c => c.l));
  const diff = mxH - mnL;
  ctx.strokeStyle = 'rgba(240,68,90,.55)'; ctx.lineWidth = 1.2; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(pad.l, py(mxH)); ctx.lineTo(W-pad.r, py(mxH)); ctx.stroke();
  ctx.fillStyle = 'rgba(240,68,90,.65)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('مقاومة ' + mxH.toFixed(2), W-pad.r-4, py(mxH)-3);
  ctx.strokeStyle = 'rgba(15,207,130,.55)';
  ctx.beginPath(); ctx.moveTo(pad.l, py(mnL)); ctx.lineTo(W-pad.r, py(mnL)); ctx.stroke();
  ctx.fillStyle = 'rgba(15,207,130,.65)';
  ctx.fillText('دعم ' + mnL.toFixed(2), W-pad.r-4, py(mnL)+10);
  [0.236, 0.382, 0.5, 0.618, 0.786].forEach(f => {
    const lv = mnL + diff * f;
    ctx.strokeStyle = 'rgba(245,200,66,.2)'; ctx.lineWidth = .7; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(pad.l, py(lv)); ctx.lineTo(W-pad.r, py(lv)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(245,200,66,.55)'; ctx.font = '8px monospace';
    ctx.fillText(f.toFixed(3), W-pad.r-3, py(lv)-2);
  });
}

function drawMA(ctx, vis, W, H, pad, py, cw, bw, gap) {
  const cl = vis.map(c => c.c);
  [{ p:9, col:'#f5c842' }, { p:20, col:'#4a9eff' }, { p:50, col:'#a78bfa' }].forEach(m => {
    const vals = cl.map((_, i) => i < m.p-1 ? null : cl.slice(i-m.p+1, i+1).reduce((a,b)=>a+b,0)/m.p);
    ctx.strokeStyle = m.col; ctx.lineWidth = 1.4; ctx.setLineDash([]);
    ctx.beginPath(); let first = true;
    vals.forEach((v, i) => {
      if (!v) return;
      const x = pad.l + i*cw + cw/2, y = py(v);
      first ? (ctx.moveTo(x,y), first=false) : ctx.lineTo(x,y);
    });
    ctx.stroke();
    const lv = vals.filter(v => v).pop();
    if (lv) {
      ctx.fillStyle = m.col; ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('MA'+m.p, W-pad.r-2, py(lv)-2);
    }
  });
}

function drawHarmonic(ctx, vis, W, H, pad, py, cw, bw, gap) {
  const len  = vis.length;
  const idxs = [Math.floor(len*.05), Math.floor(len*.25), Math.floor(len*.45), Math.floor(len*.65), len-2];
  const pts  = idxs.map((i, k) => {
    const ci = Math.min(i, len-1);
    return { i: ci, p: (vis[ci].h+vis[ci].l)/2, key: ['X','A','B','C','D'][k] };
  });
  ctx.setLineDash([3,2]); ctx.lineWidth = 1.5;
  pts.forEach((pt, i) => {
    if (i === pts.length-1) return;
    const nx = pts[i+1]; ctx.strokeStyle = '#a78bfa';
    ctx.beginPath();
    ctx.moveTo(pad.l + pt.i*cw + cw/2, py(pt.p));
    ctx.lineTo(pad.l + nx.i*cw + cw/2, py(nx.p));
    ctx.stroke();
  });
  ctx.setLineDash([]);
  pts.forEach(pt => {
    const x = pad.l + pt.i*cw + cw/2, y = py(pt.p);
    ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e9d8fd'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pt.key, x, y-8);
  });
}

function drawElliott(ctx, vis, W, H, pad, py, cw, bw, gap) {
  const len = vis.length;
  const wpts = [0, .15, .28, .44, .58, .72, .84, 1].map(r => {
    const i = Math.min(Math.floor(r*(len-1)), len-1);
    return { i, p: vis[i].c };
  });
  const labs = ['0','①','②','③','④','⑤','A','B'];
  const cols = ['#4a9eff','#4a9eff','#f0445a','#4a9eff','#f0445a','#4a9eff','#f0445a','#0fcf82'];
  ctx.lineWidth = 2; ctx.setLineDash([]);
  wpts.forEach((pt, i) => {
    if (i === wpts.length-1) return;
    const nx = wpts[i+1]; ctx.strokeStyle = cols[i];
    ctx.beginPath();
    ctx.moveTo(pad.l + pt.i*cw + cw/2, py(pt.p));
    ctx.lineTo(pad.l + nx.i*cw + cw/2, py(nx.p));
    ctx.stroke();
  });
  wpts.forEach((pt, i) => {
    const x = pad.l + pt.i*cw + cw/2, y = py(pt.p);
    ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(labs[i], x, y + (i%2 ? 9 : -6));
  });
}

function drawIchimoku(ctx, vis, W, H, pad, py, cw, bw, gap) {
  const cl = vis.map(c => c.c), hi = vis.map(c => c.h), lo = vis.map(c => c.l);
  const don = (n, i) => {
    const s = Math.max(0, i-n+1);
    return (Math.max(...hi.slice(s,i+1)) + Math.min(...lo.slice(s,i+1))) / 2;
  };
  const tenkan = cl.map((_, i) => don(9,i));
  const kijun  = cl.map((_, i) => don(26,i));
  const sA     = tenkan.map((t, i) => (t+kijun[i])/2);
  const sB     = cl.map((_, i)    => don(52,i));
  // Cloud
  ctx.beginPath();
  sA.forEach((v, i) => { const x=pad.l+i*cw+cw/2; i===0?ctx.moveTo(x,py(v)):ctx.lineTo(x,py(v)); });
  sB.slice().reverse().forEach((v, i) => { const ri=sB.length-1-i; ctx.lineTo(pad.l+ri*cw+cw/2, py(v)); });
  ctx.closePath(); ctx.fillStyle = 'rgba(74,158,255,0.07)'; ctx.fill();
  [[tenkan,'#f0445a',1],[kijun,'#4a9eff',1.2]].forEach(([arr, col, lw]) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash([]);
    ctx.beginPath();
    arr.forEach((v, i) => { const x=pad.l+i*cw+cw/2; i===0?ctx.moveTo(x,py(v)):ctx.lineTo(x,py(v)); });
    ctx.stroke();
  });
  ctx.fillStyle = '#f0445a'; ctx.font = '8px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('T', W-pad.r-2, py(tenkan[tenkan.length-1])-2);
  ctx.fillStyle = '#4a9eff';
  ctx.fillText('K', W-pad.r-2, py(kijun[kijun.length-1])+8);
}

function drawBollinger(ctx, vis, W, H, pad, py, cw, bw, gap) {
  const cl = vis.map(c => c.c), n = 20;
  const upper=[], mid=[], lower=[];
  cl.forEach((_, i) => {
    if (i < n-1) { upper.push(null); mid.push(null); lower.push(null); return; }
    const sl = cl.slice(i-n+1, i+1);
    const m  = sl.reduce((a,b)=>a+b,0)/n;
    const s  = Math.sqrt(sl.map(v=>(v-m)**2).reduce((a,b)=>a+b,0)/n);
    upper.push(m+2*s); mid.push(m); lower.push(m-2*s);
  });
  const fi = upper.findIndex(v => v !== null);
  ctx.beginPath();
  upper.forEach((v,i) => { if(!v)return; const x=pad.l+i*cw+cw/2; i===fi?ctx.moveTo(x,py(v)):ctx.lineTo(x,py(v)); });
  lower.slice().reverse().forEach((v,i) => { if(!v)return; const ri=lower.length-1-i; ctx.lineTo(pad.l+ri*cw+cw/2,py(v)); });
  ctx.closePath(); ctx.fillStyle = 'rgba(167,139,250,0.07)'; ctx.fill();
  [[upper,'#a78bfa',.8],[mid,'#4a9eff',.7],[lower,'#a78bfa',.8]].forEach(([arr,col,lw]) => {
    ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.setLineDash([]);
    ctx.beginPath(); let f=true;
    arr.forEach((v,i) => { if(!v)return; const x=pad.l+i*cw+cw/2; f?(ctx.moveTo(x,py(v)),f=false):ctx.lineTo(x,py(v)); });
    ctx.stroke();
  });
}

function drawVWAP(ctx, vis, W, H, pad, py, cw, bw, gap) {
  const cl=vis.map(c=>c.c), vols=vis.map(c=>c.v);
  let cv=0, cpv=0;
  const vwap = cl.map((c,i) => { cv+=vols[i]; cpv+=c*vols[i]; return cv?cpv/cv:c; });
  ctx.strokeStyle='#22d3ee'; ctx.lineWidth=1.8; ctx.setLineDash([4,3]);
  ctx.beginPath();
  vwap.forEach((v,i) => { const x=pad.l+i*cw+cw/2; i===0?ctx.moveTo(x,py(v)):ctx.lineTo(x,py(v)); });
  ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='#22d3ee'; ctx.font='9px sans-serif'; ctx.textAlign='right';
  ctx.fillText('VWAP '+vwap[vwap.length-1].toFixed(2), W-pad.r-2, py(vwap[vwap.length-1])-3);
}

/* ── SUB CHART ── */
function drawSub() {
  const wrap   = document.getElementById('subWrap');
  const canvas = document.getElementById('sc');
  if (!wrap || !canvas) return;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (!W || !H) return;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  const cans = ST.candles[ST.sel];
  if (!cans || cans.length < 14) return;
  const cl = cans.map(c => c.c).slice(-80);
  const s  = ST.strat;
  if (['classic','ma','candle','harmonic','elliott','osc'].includes(s)) {
    document.getElementById('subLbl').textContent = 'RSI(14)';
    drawRSIChart(ctx, cl, W, H);
  } else if (s === 'bollinger') {
    document.getElementById('subLbl').textContent = 'MACD';
    drawMACDChart(ctx, cl, W, H);
  } else if (s === 'ichimoku' || s === 'vwap') {
    document.getElementById('subLbl').textContent = 'Volume';
    drawVolChart(ctx, cans.slice(-80), W, H);
  } else {
    document.getElementById('subLbl').textContent = 'MACD';
    drawMACDChart(ctx, cl, W, H);
  }
}

function drawRSIChart(ctx, cl, W, H) {
  const rsis = calcRSI(cl, 14);
  const pad  = { t:4, b:12, l:6, r:40 };
  [30,50,70].forEach(lv => {
    const y = pad.t + (1-lv/100) * (H-pad.t-pad.b);
    ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=.5;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    ctx.fillStyle='rgba(122,139,168,0.5)'; ctx.font='8px monospace'; ctx.textAlign='left';
    ctx.fillText(lv, W-pad.r+3, y+3);
  });
  ctx.fillStyle='rgba(240,68,90,0.05)';   ctx.fillRect(pad.l, pad.t, W-pad.l-pad.r, (H-pad.t-pad.b)*0.3);
  ctx.fillStyle='rgba(15,207,130,0.05)';  ctx.fillRect(pad.l, H-pad.b-(H-pad.t-pad.b)*0.3, W-pad.l-pad.r, (H-pad.t-pad.b)*0.3);
  const cw = (W-pad.l-pad.r) / rsis.length;
  ctx.strokeStyle='#4a9eff'; ctx.lineWidth=1.2; ctx.setLineDash([]);
  ctx.beginPath();
  rsis.forEach((v,i) => { const x=pad.l+i*cw+cw/2, y=pad.t+(1-v/100)*(H-pad.t-pad.b); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
  ctx.fillStyle='#4a9eff'; ctx.font='8px monospace'; ctx.textAlign='left';
  ctx.fillText(rsis[rsis.length-1].toFixed(1), W-pad.r+3, pad.t+10);
}

function drawMACDChart(ctx, cl, W, H) {
  const e12   = emaArr(cl,12), e26 = emaArr(cl,26);
  const ml    = cl.map((_,i) => (e12[i]||0)-(e26[i]||0));
  const sl    = emaArr(ml,9);
  const hist  = ml.map((v,i) => v-(sl[i]||0));
  const pad   = { t:4, b:12, l:6, r:40 };
  const maxV  = Math.max(...hist.map(Math.abs)) || 1;
  const midY  = (H-pad.t-pad.b)/2 + pad.t;
  const cw    = (W-pad.l-pad.r) / cl.length;
  ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=.5;
  ctx.beginPath(); ctx.moveTo(pad.l,midY); ctx.lineTo(W-pad.r,midY); ctx.stroke();
  hist.forEach((v,i) => {
    const bh = Math.abs(v/maxV)*(midY-pad.t);
    const y  = v>=0 ? midY-bh : midY;
    ctx.fillStyle = v>=0 ? 'rgba(15,207,130,0.7)' : 'rgba(240,68,90,0.7)';
    ctx.fillRect(pad.l+i*cw, y, cw*.8, Math.max(1,bh));
  });
  ctx.strokeStyle='#4a9eff'; ctx.lineWidth=1; ctx.setLineDash([]);
  ctx.beginPath();
  ml.forEach((v,i) => { const x=pad.l+i*cw+cw/2, y=midY-(v/maxV)*(midY-pad.t); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
}

function drawVolChart(ctx, cans, W, H) {
  const pad  = { t:4, b:12, l:6, r:40 };
  const maxV = Math.max(...cans.map(c=>c.v)) || 1;
  const cw   = (W-pad.l-pad.r) / cans.length;
  cans.forEach((c,i) => {
    const bh = (c.v/maxV)*(H-pad.t-pad.b);
    ctx.fillStyle = c.c>=c.o ? 'rgba(15,207,130,0.5)' : 'rgba(240,68,90,0.5)';
    ctx.fillRect(pad.l+i*cw, H-pad.b-bh, cw*.8, bh);
  });
}
