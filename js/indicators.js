/* indicators.js — المؤشرات الفنية وجلب البيانات */

const ST={
  sel:'2222', strat:'classic', rpTab:'signals', tf:'60',
  prices:{}, open:{}, high:{}, low:{}, vol:{}, chg:{}, pct:{},
  candles:{}, trades:{}, ind:{}, scores:{},
  loaded:new Set(), loading:new Set(),
  fpOpen:true,
};

const rnd  = (a,b) => +(Math.random()*(b-a)+a).toFixed(4);
const rndI = (a,b) => Math.floor(Math.random()*(b-a)+a);
const fmtN = (n,d=2) => n==null?'—':n.toLocaleString('en',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtK = n => n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(0)+'K':''+n;
const nowT = () => { const d=new Date(); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; };
const SNAMES = {classic:'كلاسيك',harmonic:'هارمونيك',elliott:'إيليوت',ma:'متوسطات',osc:'RSI',macd:'MACD',ichimoku:'إيشيموكو',bollinger:'بولنجر',vwap:'VWAP',stoch:'ستوكاستك'};

/* ══ DEMO DATA — يعمل دائماً بدون إنترنت ══ */
function initDemo(sym){
  const base = getBasePrice(sym);
  const p    = +(base*(1+rnd(-0.015,0.015))).toFixed(2);
  const prev = +(p*(1+rnd(-0.02,0.02))).toFixed(2);
  ST.prices[sym] = p;
  ST.open[sym]   = +(p*(1+rnd(-0.01,0.01))).toFixed(2);
  ST.high[sym]   = +(p*(1+rnd(0.003,0.015))).toFixed(2);
  ST.low[sym]    = +(p*(1-rnd(0.003,0.015))).toFixed(2);
  ST.vol[sym]    = rndI(50000,3000000);
  ST.chg[sym]    = +(p-prev).toFixed(2);
  ST.pct[sym]    = +((p-prev)/prev*100).toFixed(2);
  ST.trades[sym] = [];
  const cans=[]; let cp=base;
  for(let i=0;i<90;i++){
    const o=+cp.toFixed(2), c=+(o*(1+rnd(-0.015,0.015))).toFixed(2);
    const h=+(Math.max(o,c)*(1+rnd(0,0.008))).toFixed(2);
    const l=+(Math.min(o,c)*(1-rnd(0,0.008))).toFixed(2);
    cans.push({o,h,l,c,v:rndI(20000,600000),time:Math.floor(Date.now()/1000)-(90-i)*86400});
    cp=c;
  }
  ST.candles[sym]=cans;
  calcInd(sym); calcScore(sym);
}

/* ══ YAHOO FINANCE — عبر Vercel API أو CORS proxies ══ */
function parseYahoo(res, sym){
  const meta=res.meta||{}, ts=res.timestamp||[], q=res.indicators?.quote?.[0]||{};
  const cans=[];
  for(let i=0;i<ts.length;i++){
    const o=q.open?.[i],h=q.high?.[i],l=q.low?.[i],c=q.close?.[i],v=q.volume?.[i];
    if(o!=null&&c!=null&&!isNaN(c)&&c>0)
      cans.push({o:+o.toFixed(2),h:+h.toFixed(2),l:+l.toFixed(2),c:+c.toFixed(2),v:v||0,time:ts[i]});
  }
  if(cans.length<10) return null;
  const last  = cans[cans.length-1];
  const prev  = +(meta.previousClose||meta.chartPreviousClose||cans[cans.length-2]?.c||last.o).toFixed(2);
  const price = +(meta.regularMarketPrice||last.c).toFixed(2);
  return {sym,cans,price,prev,high:last.h,low:last.l,open:last.o,vol:last.v};
}

function applyYahoo(sym, data){
  ST.candles[sym]=data.cans; ST.prices[sym]=data.price;
  ST.open[sym]=data.open;    ST.high[sym]=data.high;
  ST.low[sym]=data.low;      ST.vol[sym]=data.vol;
  ST.chg[sym]=+(data.price-data.prev).toFixed(2);
  ST.pct[sym]=+((data.price-data.prev)/data.prev*100).toFixed(2);
  ST.trades[sym]=ST.trades[sym]||[];
  calcInd(sym); calcScore(sym);
}

async function fetchWithTimeout(url, timeout=8000){
  const ctrl=new AbortController(), tid=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const r=await fetch(url,{signal:ctrl.signal});
    clearTimeout(tid);
    return r;
  }catch(e){ clearTimeout(tid); throw e; }
}

async function loadStock(sym){
  if(ST.loading.has(sym)) return;
  ST.loading.add(sym);
  let loaded=false;

  // 1) Try Vercel API first (same-origin, no CORS issues)
  try{
    const r=await fetchWithTimeout(`/api/stock?symbol=${sym}&range=3mo&interval=1d`);
    if(r.ok){
      const data=await r.json();
      const res=data?.chart?.result?.[0];
      if(res){ const parsed=parseYahoo(res,sym); if(parsed){applyYahoo(sym,parsed);loaded=true;} }
    }
  }catch(e){}

  // 2) Fallback: CORS proxies (for localhost testing)
  if(!loaded){
    const ySym=sym+'.SR';
    const yUrl=`https://query1.finance.yahoo.com/v8/finance/chart/${ySym}?range=3mo&interval=1d`;
    const proxies=['https://api.allorigins.win/raw?url=','https://corsproxy.io/?'];
    for(const px of proxies){
      if(loaded) break;
      try{
        const r=await fetchWithTimeout(px+encodeURIComponent(yUrl));
        if(r.ok){
          const data=await r.json();
          const res=data?.chart?.result?.[0];
          if(res){ const parsed=parseYahoo(res,sym); if(parsed){applyYahoo(sym,parsed);loaded=true;} }
        }
      }catch(e){}
    }
  }

  // 3) Keep demo data if all failed
  if(loaded) ST.loaded.add(sym);
  else { if(!ST.prices[sym]) initDemo(sym); ST.loaded.add(sym); }
  ST.loading.delete(sym);
}

/* ══ INDICATORS ══ */
function calcInd(sym){
  const cans=ST.candles[sym]; if(!cans||cans.length<10) return;
  const cl=cans.map(c=>c.c), hi=cans.map(c=>c.h), lo=cans.map(c=>c.l), n=cl.length;
  const rsiArr=calcRSI(cl,14);
  const e12=emaArr(cl,12), e26=emaArr(cl,26);
  const ml=e12.map((v,i)=>v-e26[i]), sl=emaArr(ml,9), hist=ml.map((v,i)=>v-sl[i]);
  const kp=Math.min(14,n), hh=Math.max(...hi.slice(-kp)), ll=Math.min(...lo.slice(-kp));
  const stochK=hh===ll?50:+((cl[n-1]-ll)/(hh-ll)*100).toFixed(1);
  const slc20=cl.slice(-Math.min(20,n)), ma20=slc20.reduce((a,b)=>a+b,0)/slc20.length;
  const std=Math.sqrt(slc20.map(v=>(v-ma20)**2).reduce((a,b)=>a+b,0)/slc20.length);
  const hi9=Math.max(...hi.slice(-Math.min(9,n))),  lo9=Math.min(...lo.slice(-Math.min(9,n)));
  const hi26=Math.max(...hi.slice(-Math.min(26,n))), lo26=Math.min(...lo.slice(-Math.min(26,n)));
  const hi52=Math.max(...hi.slice(-Math.min(52,n))), lo52=Math.min(...lo.slice(-Math.min(52,n)));
  let cumPV=0,cumV=0;
  cans.slice(-20).forEach(c=>{const tp=(c.h+c.l+c.c)/3;cumPV+=tp*c.v;cumV+=c.v;});
  const vwap=cumV?+(cumPV/cumV).toFixed(2):cl[n-1];
  const ma9=cl.slice(-Math.min(9,n)).reduce((a,b)=>a+b,0)/Math.min(9,n);
  const ma50=cl.slice(-Math.min(50,n)).reduce((a,b)=>a+b,0)/Math.min(50,n);
  ST.ind[sym]={
    rsi:rsiArr[n-1]||50, rsiArr,
    macd:{val:ml[n-1]||0,sig:sl[n-1]||0,hist:hist[n-1]||0}, macdLine:ml, macdHist:hist,
    stoch:{k:stochK,d:stochK},
    boll:{upper:+(ma20+2*std).toFixed(2),mid:+ma20.toFixed(2),lower:+(ma20-2*std).toFixed(2)},
    ichi:{tenkan:(hi9+lo9)/2,kijun:(hi26+lo26)/2,cloud:(hi52+lo52)/2},
    vwap, ma9:+ma9.toFixed(2), ma20:+ma20.toFixed(2), ma50:+ma50.toFixed(2),
  };
}

function calcRSI(cl,p){
  const out=new Array(Math.min(p,cl.length)).fill(50); let g=0,l=0;
  for(let i=1;i<Math.min(p,cl.length);i++){const d=cl[i]-cl[i-1];d>0?g+=d:l+=Math.abs(d);}
  g/=p; l/=p;
  for(let i=p;i<cl.length;i++){
    const d=cl[i]-cl[i-1];
    g=(g*(p-1)+(d>0?d:0))/p; l=(l*(p-1)+(d<0?Math.abs(d):0))/p;
    out.push(l===0?100:+(100-100/(1+g/l)).toFixed(2));
  }
  return out;
}

function emaArr(arr,p){
  const k=2/(p+1); let e=arr.slice(0,Math.min(p,arr.length)).reduce((a,b)=>a+b,0)/Math.min(p,arr.length);
  return arr.map((v,i)=>{if(i>0)e=v*k+e*(1-k);return +e.toFixed(4);});
}

/* ══ SCORE ENGINE ══ */
function calcScore(sym){
  const p=ST.prices[sym]; if(!p||!ST.ind[sym]) return;
  const {rsi,macd,stoch,boll,ichi,vwap,ma9,ma20,ma50}=ST.ind[sym];
  const cans=ST.candles[sym]||[], cl=cans.map(c=>c.c), n=cl.length;
  let sigs={}, buy=0, sell=0;
  const sup=ST.low[sym]||p*.95, res=ST.high[sym]||p*1.05;
  if(Math.abs(p-sup)/p<0.02){sigs.classic='شراء';buy++;}
  else if(Math.abs(p-res)/p<0.02){sigs.classic='بيع';sell++;}
  else sigs.classic='محايد';
  if(stoch.k<20&&p<boll.mid){sigs.harmonic='شراء';buy++;}
  else if(stoch.k>80&&p>boll.mid){sigs.harmonic='بيع';sell++;}
  else sigs.harmonic='محايد';
  const roc5=n>5?((cl[n-1]-cl[n-6])/cl[n-6]*100):0;
  if(roc5>2&&rsi<65){sigs.elliott='شراء';buy++;}
  else if(roc5<-2&&rsi>35){sigs.elliott='بيع';sell++;}
  else sigs.elliott='محايد';
  if(ma9>ma20&&ma20>ma50){sigs.ma='شراء';buy++;}
  else if(ma9<ma20&&ma20<ma50){sigs.ma='بيع';sell++;}
  else sigs.ma='محايد';
  if(rsi<30){sigs.osc='شراء';buy++;}else if(rsi>70){sigs.osc='بيع';sell++;}else sigs.osc='محايد';
  if(macd.val>macd.sig&&macd.hist>0){sigs.macd='شراء';buy++;}
  else if(macd.val<macd.sig&&macd.hist<0){sigs.macd='بيع';sell++;}
  else sigs.macd='محايد';
  if(p>ichi.cloud&&ichi.tenkan>ichi.kijun){sigs.ichimoku='شراء';buy++;}
  else if(p<ichi.cloud&&ichi.tenkan<ichi.kijun){sigs.ichimoku='بيع';sell++;}
  else sigs.ichimoku='محايد';
  if(p<boll.lower){sigs.bollinger='شراء';buy++;}
  else if(p>boll.upper){sigs.bollinger='بيع';sell++;}
  else sigs.bollinger='محايد';
  if(p<vwap*.985){sigs.vwap='شراء';buy++;}
  else if(p>vwap*1.015){sigs.vwap='بيع';sell++;}
  else sigs.vwap='محايد';
  if(stoch.k<20&&stoch.k>stoch.d){sigs.stoch='شراء';buy++;}
  else if(stoch.k>80&&stoch.k<stoch.d){sigs.stoch='بيع';sell++;}
  else sigs.stoch='محايد';
  const net=buy-sell, tot=buy+sell;
  const main=net>2?'شراء':net<-2?'بيع':'محايد';
  const str=tot>0?Math.round(Math.max(buy,sell)/tot*100):50;
  const atr=Math.max((ST.high[sym]||p)-(ST.low[sym]||p*.95),p*.01)*.5;
  const tp=main==='شراء'?+(p+atr*2).toFixed(2):+(p-atr*2).toFixed(2);
  const sl=main==='شراء'?+(p-atr).toFixed(2):+(p+atr).toFixed(2);
  const actv=Object.entries(sigs).filter(([,v])=>v!=='محايد').map(([k])=>k);
  ST.scores[sym]={sigs,main,strength:str,buy,sell,entry:p,tp,sl,rr:'2.0',activeStrats:actv,stratCount:actv.length};
}

/* ══ CANDLE PATTERNS ══ */
function detectCandles(c1,c2,c3){
  const pats=[]; if(!c1||!c2||!c3) return [{name:'—',sig:'neutral',desc:'—'}];
  const bs=c=>Math.abs(c.c-c.o), wu=c=>c.h-Math.max(c.o,c.c), wd=c=>Math.min(c.o,c.c)-c.l;
  if(bs(c3)<(c3.h-c3.l)*.1)                                  pats.push({name:'دوجي',sig:'neutral',desc:'تردد في السوق'});
  if(wd(c3)>bs(c3)*2&&c3.c>c3.o)                             pats.push({name:'مطرقة',sig:'buy',desc:'انعكاس صعودي'});
  if(wu(c3)>bs(c3)*2)                                         pats.push({name:'شهاب',sig:'sell',desc:'انعكاس هبوطي'});
  if(c3.c>c3.o&&c2.c<c2.o&&c3.o<c2.c&&c3.c>c2.o)            pats.push({name:'ابتلاع صعودي',sig:'buy',desc:'شراء قوي'});
  if(c3.c<c3.o&&c2.c>c2.o&&c3.o>c2.c&&c3.c<c2.o)            pats.push({name:'ابتلاع هبوطي',sig:'sell',desc:'بيع قوي'});
  if(c1.c>c1.o&&bs(c2)<bs(c1)*.3&&c3.c>c1.c)                 pats.push({name:'نجمة الصباح',sig:'buy',desc:'انعكاس صعودي'});
  if(c1.c<c1.o&&bs(c2)<bs(c1)*.3&&c3.c<c1.c)                 pats.push({name:'نجمة المساء',sig:'sell',desc:'انعكاس هبوطي'});
  if(bs(c3)>(c3.h-c3.l)*.9&&c3.c>c3.o)                       pats.push({name:'ماروبوزو صعودي',sig:'buy',desc:'قوة شرائية كاملة'});
  if(bs(c3)>(c3.h-c3.l)*.9&&c3.c<c3.o)                       pats.push({name:'ماروبوزو هبوطي',sig:'sell',desc:'قوة بيعية كاملة'});
  if(c3.c>c3.o&&c2.c>c2.o&&c1.c>c1.o&&c3.c>c2.c&&c2.c>c1.c) pats.push({name:'ثلاثة جنود',sig:'buy',desc:'صعود قوي'});
  if(c3.c<c3.o&&c2.c<c2.o&&c1.c<c1.o&&c3.c<c2.c&&c2.c<c1.c) pats.push({name:'ثلاثة غربان',sig:'sell',desc:'هبوط قوي'});
  if(!pats.length) pats.push({name:'شمعة عادية',sig:'neutral',desc:'لا نمط انعكاسي'});
  return pats;
}
