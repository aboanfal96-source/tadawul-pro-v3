/* ui.js */

function buildWL(filter=''){
  const sectors={};
  STOCKS.filter(s=>!filter||(s.sym.includes(filter)||s.name.includes(filter))).forEach(s=>{
    if(!sectors[s.sector])sectors[s.sector]=[];
    sectors[s.sector].push(s);
  });
  let html='';
  Object.entries(sectors).forEach(([sec,stocks])=>{
    html+=`<div class="sec-hdr">${sec} (${stocks.length})</div>`;
    stocks.forEach(s=>{
      const p=ST.prices[s.sym]||0,pct=ST.pct[s.sym]||0;
      const sc=ST.scores[s.sym],isReal=ST.loaded.has(s.sym);
      const sig=sc?.main==='شراء'?{c:'s-buy',l:'شراء'}:sc?.main==='بيع'?{c:'s-sell',l:'بيع'}:{c:'s-wait',l:'—'};
      html+=`<div class="wi ${s.sym===ST.sel?'act':''}" onclick="selStock('${s.sym}')">
        <span class="wi-sym">${s.sym}</span>
        <span class="wi-name">${s.name}</span>
        <div class="wi-r">
          <span class="wi-p ${pct>=0?'up':'dn'}" style="${!isReal?'opacity:.55':''}">
            ${p>0?p.toFixed(2):'—'}
          </span>
          <span class="wi-pct ${pct>=0?'up':'dn'}">${pct!==0?(pct>=0?'+':'')+pct.toFixed(2)+'%':''}</span>
          ${isReal?`<span class="sig-b ${sig.c}">${sig.l}</span>`:`<span style="font-size:7px;color:var(--t3)">⟳</span>`}
        </div>
      </div>`;
    });
  });
  document.getElementById('watchlist').innerHTML=html||'<div style="padding:12px;color:var(--t3);text-align:center;font-size:10px">لا نتائج</div>';
  document.getElementById('wlCnt').textContent=`${ST.loaded.size}/${STOCKS.length}`;
}

function buildTopBar(){
  document.getElementById('topTickers').innerHTML=PRIORITY.slice(0,12).map(sym=>{
    const p=ST.prices[sym]||0,pct=ST.pct[sym]||0,isReal=ST.loaded.has(sym);
    return `<div class="tick ${sym===ST.sel?'sel':''}" onclick="selStock('${sym}')">
      <span class="t-sym">${sym}</span>
      <span class="t-p ${pct>=0?'up':'dn'}" style="${!isReal?'opacity:.5':''}">${p>0?p.toFixed(2):'…'}</span>
      <span class="t-c ${pct>=0?'up':'dn'}">${pct!==0?(pct>=0?'+':'')+pct.toFixed(2)+'%':''}</span>
    </div>`;
  }).join('');
}

function buildChartHeader(){
  const sym=ST.sel,p=ST.prices[sym]||0,c=ST.chg[sym]||0,pct=ST.pct[sym]||0;
  const s=STOCKS.find(x=>x.sym===sym),ind=ST.ind[sym],isReal=ST.loaded.has(sym);
  document.getElementById('cSym').textContent=`${sym} — ${s?.name||''}`;
  document.getElementById('cPrice').innerHTML=p>0
    ?`${p.toFixed(2)} <span style="font-size:9px;color:var(--t2)">ر.س</span>${isReal?' <span class="badge by" style="font-size:7px">Yahoo ✓</span>':''}`
    :`<span style="color:var(--t3);font-size:11px">جاري التحميل...</span>`;
  const chEl=document.getElementById('cChg');
  if(c!==0){chEl.textContent=`${c>=0?'+':''}${c.toFixed(2)} (${pct.toFixed(2)}%)`;chEl.className='c-ch '+(c>=0?'up':'dn');chEl.style.background=c>=0?'var(--up-bg)':'var(--dn-bg)';}
  else{chEl.textContent='—';chEl.className='c-ch';chEl.style.background='transparent';}
  document.getElementById('cStats').innerHTML=`
    <div class="cs"><span class="csl">فتح</span><span class="csv">${ST.open[sym]?.toFixed(2)||'—'}</span></div>
    <div class="cs"><span class="csl">أعلى</span><span class="csv" style="color:var(--up)">${ST.high[sym]?.toFixed(2)||'—'}</span></div>
    <div class="cs"><span class="csl">أدنى</span><span class="csv" style="color:var(--dn)">${ST.low[sym]?.toFixed(2)||'—'}</span></div>
    <div class="cs"><span class="csl">حجم</span><span class="csv">${fmtK(ST.vol[sym]||0)}</span></div>
    <div class="cs"><span class="csl">RSI</span><span class="csv" style="color:${ind?(ind.rsi>70?'var(--dn)':ind.rsi<30?'var(--up)':'var(--t1)'):'var(--t3)'}">${ind?ind.rsi.toFixed(1):'—'}</span></div>
    <div class="cs"><span class="csl">قطاع</span><span class="csv" style="color:var(--cyan);font-size:9px">${s?.sector||'—'}</span></div>`;
  document.getElementById('sbS').textContent=sym;
  const sc=ST.scores[sym];
  if(sc){const r=document.getElementById('sbR');r.textContent=sc.main;r.style.color=sc.main==='شراء'?'var(--up)':sc.main==='بيع'?'var(--dn)':'var(--gold)';}
}

function buildStatus(){
  const ups=STOCKS.filter(s=>(ST.pct[s.sym]||0)>0).length;
  document.getElementById('sbUp').textContent=ups;
  document.getElementById('sbDn').textContent=STOCKS.length-ups;
  document.getElementById('sbLd').textContent=ST.loaded.size;
  document.getElementById('sbTot').textContent=STOCKS.length;
  document.getElementById('sbUpd').textContent=nowT();
}

/* Filter */
const FR_SORT={col:'score',dir:-1};
const FP_FLTRS=new Set(['all']);
let FP_BUY=false,FP_SELL=false,FP_STRONG=false;

function toggleFP(){
  ST.fpOpen=!ST.fpOpen;
  document.getElementById('fpBody').style.display=ST.fpOpen?'':'none';
  document.getElementById('fpTog').textContent=ST.fpOpen?'▲':'▼';
}

function toggleFC(el,mode){
  if(mode==='all'){
    FP_FLTRS.clear();FP_FLTRS.add('all');
    document.querySelectorAll('.fc').forEach(f=>f.classList.remove('on','og'));el.classList.add('on');
  }else if(['buy_only','sell_only','strong'].includes(mode)){
    el.classList.toggle('og');
    if(mode==='buy_only')FP_BUY=el.classList.contains('og');
    if(mode==='sell_only')FP_SELL=el.classList.contains('og');
    if(mode==='strong')FP_STRONG=el.classList.contains('og');
  }else{
    FP_FLTRS.delete('all');
    document.querySelector('.fc[onclick*="\'all\'"]').classList.remove('on');
    FP_FLTRS.has(mode)?FP_FLTRS.delete(mode):FP_FLTRS.add(mode);
    el.classList.toggle('on');
    if(FP_FLTRS.size===0){FP_FLTRS.add('all');document.querySelector('.fc[onclick*="\'all\'"]').classList.add('on');}
  }
  buildFilter();
}

function sortFR(col){
  FR_SORT.dir=FR_SORT.col===col?FR_SORT.dir*-1:-1;FR_SORT.col=col;buildFilter();
}

function buildFilter(){
  let rows=STOCKS.map(s=>{
    const sc=ST.scores[s.sym],p=ST.prices[s.sym];if(!sc||!p)return null;
    let ok=FP_FLTRS.has('all');
    if(!ok)for(const f of FP_FLTRS)if(sc.sigs[f]&&sc.sigs[f]!=='محايد'){ok=true;break;}
    if(!ok||FP_BUY&&sc.main!=='شراء'||FP_SELL&&sc.main!=='بيع'||FP_STRONG&&sc.strength<80)return null;
    return{sym:s.sym,name:s.name,price:p,pct:ST.pct[s.sym]||0,score:sc.strength,signal:sc.main,rr:sc.rr,entry:sc.entry,tp:sc.tp,sl:sc.sl,activeStrats:sc.activeStrats,isReal:ST.loaded.has(s.sym)};
  }).filter(Boolean);
  rows.sort((a,b)=>{const av=typeof a[FR_SORT.col]==='string'?a[FR_SORT.col]:+a[FR_SORT.col],bv=typeof b[FR_SORT.col]==='string'?b[FR_SORT.col]:+b[FR_SORT.col];return(av>bv?1:av<bv?-1:0)*FR_SORT.dir;});
  document.getElementById('fpBadge').textContent=`${rows.length} نتيجة`;
  document.getElementById('frBody').innerHTML=rows.slice(0,60).map((r,i)=>{
    const hi=i<3&&FR_SORT.col==='score'&&FR_SORT.dir===-1;
    const sc2=r.signal==='شراء'?'up':r.signal==='بيع'?'dn':'';
    const tags=r.activeStrats.slice(0,3).map(k=>`<span class="stag">${SNAMES[k]||k}</span>`).join('');
    const dot=r.isReal?'<span style="color:var(--up);font-size:8px">●</span>':'<span style="color:var(--t3);font-size:8px">○</span>';
    return `<tr class="${hi?'hi':''}" onclick="selStock('${r.sym}')">
      <td style="font-weight:600;color:var(--blue);font-family:'IBM Plex Mono',monospace">${dot}${r.sym}</td>
      <td>${r.name}</td>
      <td style="font-family:'IBM Plex Mono',monospace">${r.price.toFixed(2)}</td>
      <td class="${sc2}">${r.pct>=0?'+':''}${r.pct.toFixed(2)}%</td>
      <td><span class="scb"><span class="scf" style="width:${r.score}%;background:${r.score>75?'var(--up)':r.score>55?'var(--gold)':'var(--dn)'}"></span></span>${r.score}%</td>
      <td>${tags}</td>
      <td class="${sc2}" style="font-weight:600">${r.signal==='شراء'?'▲ شراء':r.signal==='بيع'?'▼ بيع':'—'}</td>
      <td style="color:var(--blue)">${r.rr}</td>
      <td>${r.entry.toFixed(2)}</td>
      <td style="color:var(--up)">${r.tp.toFixed(2)}</td>
      <td style="color:var(--dn)">${r.sl.toFixed(2)}</td>
      <td><button onclick="event.stopPropagation();selStock('${r.sym}')" style="background:var(--blue2);border:1px solid rgba(74,158,255,.3);color:var(--blue);padding:1px 5px;border-radius:2px;cursor:pointer;font-size:9px;font-family:inherit">↗</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="12" style="padding:12px;text-align:center;color:var(--t3)">لا توجد نتائج</td></tr>';
}

function doScan(){STOCKS.forEach(s=>{if(ST.prices[s.sym])calcScore(s.sym);});buildFilter();}

function showTop(){
  FP_FLTRS.clear();FP_FLTRS.add('all');FP_STRONG=true;
  document.querySelectorAll('.fc').forEach(f=>f.classList.remove('on','og'));
  document.querySelector('.fc[onclick*="\'all\'"]')?.classList.add('on');
  document.querySelector('.fc[onclick*="\'strong\'"]')?.classList.add('og');
  FR_SORT.col='score';FR_SORT.dir=-1;buildFilter();
  if(!ST.fpOpen)toggleFP();
}
