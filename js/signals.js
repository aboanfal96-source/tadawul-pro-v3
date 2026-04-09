/* ══════════════════════════════════════════
   signals.js — لوحة الإشارات لجميع الاستراتيجيات
══════════════════════════════════════════ */

function buildSignals() {
  const sym = ST.sel;
  const p   = ST.prices[sym];
  const sc  = ST.scores[sym];
  const ind = ST.ind[sym];
  if (!sc || !p || !ind) {
    document.getElementById('pane-signals').innerHTML =
      '<div class="ldg"><div class="spin"></div>جاري تحميل البيانات...</div>';
    return;
  }
  const { main, strength, sigs, buy, sell, entry, tp, sl, rr } = sc;
  const { rsi, macd, stoch, boll, ichi, vwap, ma9, ma20, ma50 } = ind;
  const cls  = main==='شراء'?'buy':main==='بيع'?'sell':'neutral';
  const sCol = strength>75 ? 'var(--up)' : strength>55 ? 'var(--gold)' : 'var(--dn)';

  let html = `
  <div class="scard ${cls}">
    <div class="sc-h">
      <span class="sc-strat">إشارة رئيسية — ${ST.strat.toUpperCase()}</span>
      <span class="sc-time">${nowT()}</span>
    </div>
    <div class="sc-sig ${cls}">${main==='شراء'?'▲ شراء':main==='بيع'?'▼ بيع':'◆ انتظار'}</div>
    <div class="sc-desc">${buy} إشارة شراء | ${sell} إشارة بيع | ${Object.keys(sigs).length} استراتيجية</div>
    <div class="sc-lvls">
      <div class="sc-lv"><div class="sc-ll">الدخول</div><div class="sc-lv-v ev">${fmtN(entry)}</div></div>
      <div class="sc-lv"><div class="sc-ll">الهدف</div><div class="sc-lv-v tv">${fmtN(tp)}</div></div>
      <div class="sc-lv"><div class="sc-ll">الوقف</div><div class="sc-lv-v sv">${fmtN(sl)}</div></div>
    </div>
    <div class="sc-str">
      <span class="str-lbl">قوة الإشارة</span>
      <div class="str-bar"><div class="str-fill" style="width:${strength}%;background:${sCol}"></div></div>
      <span class="str-val" style="color:${sCol}">${strength}%</span>
      <span class="rr-badge">R:R ${rr}</span>
    </div>
  </div>`;

  html += buildStratCard(sym, p, sigs, tp, sl, rr, rsi, macd, stoch, boll, ichi, vwap, ma9, ma20, ma50);
  document.getElementById('pane-signals').innerHTML = html;
}

function mkCard(title, sig, desc, lvlsHtml='', extraHtml='') {
  const cls  = sig==='شراء'?'buy':sig==='بيع'?'sell':'neutral';
  const str  = rndI(55, 88);
  const sCol = str>75 ? 'var(--up)' : str>55 ? 'var(--gold)' : 'var(--dn)';
  return `
  <div class="scard ${cls}">
    <div class="sc-h"><span class="sc-strat">${title}</span><span class="sc-time">${nowT()}</span></div>
    <div class="sc-sig ${cls}">${sig==='شراء'?'▲ شراء':sig==='بيع'?'▼ بيع':'◆ انتظار'}</div>
    <div class="sc-desc">${desc}</div>
    ${lvlsHtml}
    <div class="sc-str">
      <span class="str-lbl">قوة</span>
      <div class="str-bar"><div class="str-fill" style="width:${str}%;background:${sCol}"></div></div>
      <span class="str-val" style="color:${sCol}">${str}%</span>
    </div>
    ${extraHtml}
  </div>`;
}

function mkInfo(title, rows) {
  return `
  <div class="icard">
    <div class="ic-title">${title}</div>
    ${rows.map(([l,v,col]) =>
      `<div class="ic-row">
        <span class="ic-l">${l}</span>
        <span class="ic-v" ${col?`style="color:${col}"`:''}>${v}</span>
      </div>`
    ).join('')}
  </div>`;
}

function mkGauge(title, val, min, max, cols) {
  const pct  = Math.max(0, Math.min(100, (val-min)/(max-min)*100));
  const idx  = pct < 33 ? 0 : pct < 67 ? 1 : 2;
  const col  = cols[idx];
  return `
  <div class="gcard">
    <div class="g-title">${title}</div>
    <div class="g-val" style="color:${col}">${fmtN(val,1)}</div>
    <div class="g-track"><div class="g-fill" style="width:${pct}%;background:${col}"></div></div>
    <div class="g-marks"><span>${min}</span><span>${Math.floor((min+max)/2)}</span><span>${max}</span></div>
  </div>`;
}

function buildStratCard(sym, p, sigs, tp, sl, rr, rsi, macd, stoch, boll, ichi, vwap, ma9, ma20, ma50) {
  const cans = ST.candles[sym] || [];
  const cl   = cans.map(c => c.c);
  const n    = cl.length;
  const s    = ST.strat;

  const lvls = (e, t, stop) => `
  <div class="sc-lvls">
    <div class="sc-lv"><div class="sc-ll">الدخول</div><div class="sc-lv-v ev">${fmtN(e)}</div></div>
    <div class="sc-lv"><div class="sc-ll">الهدف</div><div class="sc-lv-v tv">${fmtN(t)}</div></div>
    <div class="sc-lv"><div class="sc-ll">الوقف</div><div class="sc-lv-v sv">${fmtN(stop)}</div></div>
  </div>`;

  if (s === 'classic') {
    const mn   = Math.min(...cans.slice(-20).map(c=>c.l));
    const mx   = Math.max(...cans.slice(-20).map(c=>c.h));
    const diff = mx - mn;
    const near = Math.abs(p-mn)/p<0.025 ? 'السعر قرب الدعم — فرصة' : Math.abs(p-mx)/p<0.025 ? 'السعر قرب المقاومة — احتياط' : 'السعر في المنتصف';
    return mkCard('الكلاسيك — دعم ومقاومة + فيبوناتشي', sigs.classic||'محايد', near, lvls(p,tp,sl)) +
      mkInfo('مستويات فيبوناتشي', [0,0.236,0.382,0.5,0.618,0.786,1].map(f => {
        const lv = (mn+diff*f).toFixed(2);
        const cur = Math.abs(lv-p)<diff*0.04;
        return [`${(f*100).toFixed(1)}%`, lv, cur?'var(--blue)':null];
      }));
  }

  if (s === 'harmonic') {
    const PATS = ['Gartley','Bat','Butterfly','Crab','Shark','Cypher'];
    const pat  = PATS[rndI(0,PATS.length)], comp=rndI(75,97);
    const ratios = { Gartley:['0.618','0.382','0.886'], Bat:['0.382','0.382','0.886'], Butterfly:['0.786','0.382','1.618'], Crab:['0.382','0.618','1.618'], Shark:['1.13','0.886','1.618'], Cypher:['0.382','1.41','0.786'] };
    const rat = ratios[pat] || ['0.618','0.382','0.886'];
    return mkCard('الهارمونيك — '+pat, sigs.harmonic||'محايد', `اكتمال النمط ${comp}%`, lvls(p,tp,sl)) +
      mkInfo(`نقاط ${pat}`, ['X','A','B','C','D'].map(k => [k, (p*(1+rnd(-0.04,0.04))).toFixed(2), 'var(--purple)'])) +
      `<div class="icard"><div class="ic-title">نسب فيبوناتشي</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;padding-top:3px">
          ${rat.map((r,i)=>`<div style="background:var(--bg3);border-radius:2px;padding:3px 6px;font-size:9px;color:var(--purple)">${['XA→AB','AB→BC','BC→CD'][i]}: ${r}</div>`).join('')}
        </div>
      </div>`;
  }

  if (s === 'elliott') {
    const wv = rndI(1,6);
    const labels = ['موجة دافعة بداية','تصحيح خفيف','موجة دافعة قوية','تصحيح متوسط','نهاية الدورة الصاعدة'];
    return mkCard('أمواج إيليوت', sigs.elliott||'محايد', `الموجة ${wv} — ${labels[wv-1]}`, lvls(p,tp,sl)) +
      `<div class="icard">
        <div class="ic-title">هيكل الأمواج</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;height:50px;margin:5px 0">
          ${[1,2,3,4,5,'A','B','C'].map((nm,i) => {
            const h=[48,22,60,28,50,24,38,18][i];
            const c=nm===wv?'var(--gold)':typeof nm==='number'&&nm%2===1?'#4a9eff':'#f0445a';
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
              <span style="font-size:8px;font-weight:700;color:${c}">${nm}</span>
              <div style="width:14px;height:${h}px;background:${c};border-radius:1px 1px 0 0;opacity:${nm===wv?1:.55}"></div>
            </div>`;
          }).join('')}
        </div>
        <div class="ic-row"><span class="ic-l">الموجة الحالية</span><span class="ic-v" style="color:var(--gold)">موجة ${wv}</span></div>
        <div class="ic-row"><span class="ic-l">الهدف</span><span class="ic-v" style="color:var(--up)">${tp}</span></div>
      </div>`;
  }

  if (s === 'ma') {
    const golden = ma9>ma20 && ma20>ma50;
    const death  = ma9<ma20 && ma20<ma50;
    return mkCard('المتوسطات المتحركة', sigs.ma||'محايد',
      golden ? 'تقاطع ذهبي ✓ MA9>MA20>MA50' : death ? 'تقاطع الموت ✗' : 'المتوسطات متشابكة', lvls(p,tp,sl)) +
      mkInfo('المتوسطات',[
        ['MA9',  ma9.toFixed(2),  'var(--gold)'],
        ['MA20', ma20.toFixed(2), 'var(--blue)'],
        ['MA50', ma50.toFixed(2), 'var(--purple)'],
        ['السعر', p.toFixed(2), 'var(--t1)'],
        ['الموقف', p>ma50?'فوق MA50 ↑':'تحت MA50 ↓', p>ma50?'var(--up)':'var(--dn)'],
      ]) +
      `<div class="icard" style="text-align:center;padding:8px;color:${golden?'var(--up)':death?'var(--dn)':'var(--gold)'};font-weight:600;font-size:11px">
        ${golden?'✓ تقاطع ذهبي — إشارة شراء قوية':death?'✗ تقاطع الموت — إشارة بيع':'⟳ المتوسطات متشابكة — انتظار'}
      </div>`;
  }

  if (s === 'osc') {
    return mkCard('المذبذبات — RSI + MACD + Stoch', sigs.osc||'محايد',
      `RSI ${rsi.toFixed(1)} — ${rsi>70?'تشبع شرائي':rsi<30?'تشبع بيعي':'منطقة محايدة'}`, lvls(p,tp,sl)) +
      mkGauge('RSI (14)', rsi, 0, 100, ['var(--up)','var(--blue)','var(--dn)']) +
      `<div class="gcard">
        <div class="g-title">MACD</div>
        <div class="orow"><span class="ol">MACD</span><span class="ov" style="color:${macd.val>0?'var(--up)':'var(--dn)'}">${macd.val.toFixed(3)}</span></div>
        <div class="orow"><span class="ol">Signal</span><span class="ov">${macd.sig.toFixed(3)}</span></div>
        <div class="orow"><span class="ol">Histogram</span><span class="ov" style="color:${macd.hist>0?'var(--up)':'var(--dn)'}">${macd.hist.toFixed(3)}</span></div>
        <div style="text-align:center;padding:4px;font-size:10px;font-weight:600;color:${macd.val>macd.sig?'var(--up)':'var(--dn)'}">
          ${macd.val>macd.sig?'تقاطع صعودي ▲':'تقاطع هبوطي ▼'}
        </div>
      </div>` +
      mkGauge('Stochastic %K', stoch.k, 0, 100, ['var(--up)','var(--cyan)','var(--dn)']);
  }

  if (s === 'ichimoku') {
    return mkCard('إيشيموكو', sigs.ichimoku||'محايد',
      p>ichi.cloud ? 'السعر فوق السحابة — إيجابي ↑' : 'السعر تحت السحابة — سلبي ↓', lvls(p,tp,sl)) +
      mkInfo('مؤشر إيشيموكو', [
        ['Tenkan-Sen', ichi.tenkan.toFixed(2), '#f0445a'],
        ['Kijun-Sen',  ichi.kijun.toFixed(2),  '#4a9eff'],
        ['Senkou A',   ichi.cloud.toFixed(2),   'var(--cyan)'],
        ['السعر',       p.toFixed(2),             'var(--blue)'],
        ['الموقع',      p>ichi.cloud?'فوق السحابة ↑':'تحت السحابة ↓', p>ichi.cloud?'var(--up)':'var(--dn)'],
        ['التقاطع', ichi.tenkan>ichi.kijun?'Tenkan فوق Kijun':'Kijun فوق Tenkan', ichi.tenkan>ichi.kijun?'var(--up)':'var(--dn)'],
      ]);
  }

  if (s === 'bollinger') {
    const { upper, mid, lower } = boll;
    const pctB = ((p-lower)/(upper-lower)*100).toFixed(1);
    const bw2  = ((upper-lower)/mid*100).toFixed(2);
    return mkCard('بولنجر', sigs.bollinger||'محايد',
      `%B = ${pctB}% | ${p>upper?'تجاوز الحد العلوي':p<lower?'كسر الحد السفلي':'داخل النطاق'}`, lvls(p,tp,sl)) +
      mkInfo('نطاقات بولنجر (20,2)', [
        ['الحد العلوي', upper.toFixed(2), '#a78bfa'],
        ['الوسط MA20',  mid.toFixed(2),   '#4a9eff'],
        ['الحد السفلي', lower.toFixed(2), '#a78bfa'],
        ['%B',          pctB+'%',          p>upper?'var(--dn)':p<lower?'var(--up)':null],
        ['عرض النطاق',  bw2+'%',           null],
        ['الإشارة', p>upper?'قرب الحد العلوي':p<lower?'قرب الحد السفلي':'في النطاق', p>upper?'var(--dn)':p<lower?'var(--up)':'var(--gold)'],
      ]);
  }

  if (s === 'vwap') {
    const dev = ((p-vwap)/vwap*100).toFixed(2);
    return mkCard('VWAP', sigs.vwap||'محايد',
      `انحراف ${dev>0?'+':''}${dev}% عن VWAP — ${p<vwap?'تحت VWAP — شراء محتمل':'فوق VWAP — حذر'}`, lvls(p,tp,sl)) +
      mkInfo('VWAP — المتوسط المرجح بالحجم', [
        ['VWAP',      vwap.toFixed(2),                'var(--cyan)'],
        ['السعر',      p.toFixed(2),                   'var(--blue)'],
        ['الانحراف',  (dev>0?'+':'')+dev+'%',          dev>0?'var(--up)':'var(--dn)'],
        ['الإشارة',   p<vwap?'دون VWAP — شراء':'فوق VWAP — بيع', p<vwap?'var(--up)':'var(--dn)'],
      ]);
  }

  if (s === 'candle') {
    const c3 = cans[n-1], c2 = cans[n-2], c1 = cans[n-3];
    const pats = detectCandles(c1, c2, c3);
    const mp   = pats[0] || { name:'—', sig:'neutral', desc:'لا نمط' };
    const sig2 = mp.sig==='buy'?'شراء':mp.sig==='sell'?'بيع':'محايد';
    return mkCard('الشموع اليابانية', sig2, `${mp.name} — ${mp.desc}`, lvls(p,tp,sl)) +
      mkInfo('الأنماط المكتشفة', pats.map(pt => [
        pt.name, pt.desc,
        pt.sig==='buy'?'var(--up)':pt.sig==='sell'?'var(--dn)':'var(--gold)'
      ]));
  }

  if (s === 'multi') {
    return `
    <div class="icard">
      <div class="ic-title">تقاطع جميع الاستراتيجيات</div>
      ${Object.entries(sigs).map(([k,v]) =>
        `<div class="ic-row">
          <span class="ic-l">${SNAMES[k]||k}</span>
          <span class="ic-v" style="color:${v==='شراء'?'var(--up)':v==='بيع'?'var(--dn)':'var(--t3)'};font-weight:600">
            ${v==='شراء'?'▲ شراء':v==='بيع'?'▼ بيع':'— محايد'}
          </span>
        </div>`
      ).join('')}
      <div style="margin-top:8px;padding:6px;background:var(--bg3);border-radius:3px;text-align:center;font-size:10px;font-weight:600;color:${ST.scores[sym]?.main==='شراء'?'var(--up)':ST.scores[sym]?.main==='بيع'?'var(--dn)':'var(--gold)'}">
        الإشارة الكلية: ${ST.scores[sym]?.main||'—'} | قوة: ${ST.scores[sym]?.strength||0}%
      </div>
    </div>`;
  }

  return '';
}

/* ── ORDER BOOK ── */
function buildDepth() {
  const sym = ST.sel, p = ST.prices[sym];
  if (!p) {
    document.getElementById('pane-depth').innerHTML = '<div class="ldg"><div class="spin"></div>جاري...</div>';
    return;
  }
  let html = '<div class="ob-hdr"><span>حجم</span><span>عرض</span><span>تراكمي</span></div>';
  let cum = 0;
  for (let i=5; i>=1; i--) {
    const ap=+(p+i*p*0.001).toFixed(2), v=rndI(200,12000); cum+=v;
    const pct=Math.min(100, v/12000*100);
    html+=`<div class="ob-row">
      <div class="ob-bar" style="background:var(--dn);width:${pct}%"></div>
      <span class="ob-p" style="color:var(--dn)">${ap.toFixed(2)}</span>
      <span class="ob-v">${fmtK(v)}</span>
      <span class="ob-t">${fmtK(cum)}</span>
    </div>`;
  }
  html += `<div class="ob-spr">${p.toFixed(2)} ر.س</div>`;
  cum = 0;
  html += '<div class="ob-hdr" style="margin-top:2px"><span>حجم</span><span>طلب</span><span>تراكمي</span></div>';
  for (let i=1; i<=5; i++) {
    const bp=+(p-i*p*0.001).toFixed(2), v=rndI(200,12000); cum+=v;
    const pct=Math.min(100, v/12000*100);
    html+=`<div class="ob-row">
      <div class="ob-bar" style="background:var(--up);width:${pct}%"></div>
      <span class="ob-p" style="color:var(--up)">${bp.toFixed(2)}</span>
      <span class="ob-v">${fmtK(v)}</span>
      <span class="ob-t">${fmtK(cum)}</span>
    </div>`;
  }
  document.getElementById('pane-depth').innerHTML = html;
}

/* ── TRADES ── */
function buildTrades() {
  const trades = ST.trades[ST.sel] || [];
  let html = '<div class="ob-hdr"><span>الوقت</span><span>السعر</span><span>حجم</span><span>↕</span></div>';
  if (!trades.length)
    html += '<div class="ldg"><span style="color:var(--t3)">لا توجد صفقات مسجلة</span></div>';
  else
    trades.slice().reverse().slice(0,25).forEach(t => {
      html+=`<div class="tr-row">
        <span class="tr-t">${t.time}</span>
        <span class="tr-p" style="color:${t.dir==='buy'?'var(--up)':'var(--dn)'}">${t.price.toFixed(2)}</span>
        <span class="tr-v">${fmtK(t.vol)}</span>
        <span style="font-size:8px;color:${t.dir==='buy'?'var(--up)':'var(--dn)'}">${t.dir==='buy'?'▲':'▼'}</span>
      </div>`;
    });
  document.getElementById('pane-trades').innerHTML = html;
}

/* ── INFO ── */
function buildInfo() {
  const sym    = ST.sel;
  const s      = STOCKS.find(x => x.sym === sym);
  const p      = ST.prices[sym];
  const sc     = ST.scores[sym];
  const isReal = ST.loaded.has(sym);
  let html = `
  <div class="icard">
    <div class="ic-title">معلومات السهم</div>
    <div class="ic-row"><span class="ic-l">الرمز</span><span class="ic-v" style="color:var(--blue);font-family:'IBM Plex Mono',monospace">${sym}</span></div>
    <div class="ic-row"><span class="ic-l">الاسم</span><span class="ic-v">${s?.name||'—'}</span></div>
    <div class="ic-row"><span class="ic-l">القطاع</span><span class="ic-v" style="color:var(--cyan)">${s?.sector||'—'}</span></div>
    <div class="ic-row"><span class="ic-l">السعر</span><span class="ic-v">${p?.toFixed(2)||'—'} ر.س</span></div>
    <div class="ic-row"><span class="ic-l">الفتح</span><span class="ic-v">${ST.open[sym]?.toFixed(2)||'—'}</span></div>
    <div class="ic-row"><span class="ic-l">الأعلى</span><span class="ic-v" style="color:var(--up)">${ST.high[sym]?.toFixed(2)||'—'}</span></div>
    <div class="ic-row"><span class="ic-l">الأدنى</span><span class="ic-v" style="color:var(--dn)">${ST.low[sym]?.toFixed(2)||'—'}</span></div>
    <div class="ic-row"><span class="ic-l">الحجم</span><span class="ic-v">${fmtK(ST.vol[sym]||0)}</span></div>
    <div class="ic-row"><span class="ic-l">مصدر البيانات</span><span class="ic-v" style="color:${isReal?'var(--up)':'var(--gold)'}">${isReal?'Yahoo Finance ✓':'تقريبي ⟳'}</span></div>
  </div>`;
  if (sc) {
    html += `
    <div class="icard">
      <div class="ic-title">ملخص إشارات الاستراتيجيات</div>
      ${Object.entries(sc.sigs).map(([k,v]) =>
        `<div class="ic-row">
          <span class="ic-l">${SNAMES[k]||k}</span>
          <span class="ic-v" style="color:${v==='شراء'?'var(--up)':v==='بيع'?'var(--dn)':'var(--t3)'}">
            ${v==='شراء'?'▲ شراء':v==='بيع'?'▼ بيع':'— محايد'}
          </span>
        </div>`
      ).join('')}
    </div>`;
  }
  document.getElementById('pane-info').innerHTML = html;
}
