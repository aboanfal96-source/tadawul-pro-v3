/* app.js — المتحكم الرئيسي */

async function selStock(sym){
  ST.sel=sym;
  buildChartHeader(); buildTopBar();
  buildWL(document.getElementById('wlSearch').value);
  drawChart(); drawSub(); buildSignals(); buildDepth(); buildTrades(); buildInfo();
  if(!ST.loaded.has(sym)&&!ST.loading.has(sym)){
    await loadStock(sym);
    buildChartHeader(); drawChart(); drawSub(); buildSignals();
    buildFilter(); buildWL(document.getElementById('wlSearch').value);
  }
  setTimeout(()=>{
    if(!document.getElementById('dtCanvas')) injectDrawingToolbar();
    else initDrawingCanvas(document.getElementById('chartWrap'));
  },50);
}

function setSt(st,el){
  ST.strat=st;
  document.querySelectorAll('.stab').forEach(t=>t.classList.remove('active')); el.classList.add('active');
  document.getElementById('sbSt').textContent=el.textContent.trim();
  drawChart(); drawSub(); buildSignals();
}

function setTF(tf,el){
  ST.tf=tf;
  document.querySelectorAll('.tfb').forEach(b=>b.classList.remove('active')); el.classList.add('active');
  drawChart();
}

function setRpTab(tab,el){
  ST.rpTab=tab;
  document.querySelectorAll('.rpt').forEach(t=>t.classList.remove('active')); el.classList.add('active');
  document.querySelectorAll('.rp-pane').forEach(p=>p.classList.remove('active'));
  document.getElementById('pane-'+tab).classList.add('active');
  if(tab==='signals') buildSignals();
  else if(tab==='depth') buildDepth();
  else if(tab==='trades') buildTrades();
  else buildInfo();
}

async function doRefresh(){
  const sym=ST.sel, btn=document.getElementById('rfBtn');
  btn.textContent='↻...'; btn.disabled=true;
  ST.loaded.delete(sym); ST.loading.delete(sym);
  await loadStock(sym);
  buildChartHeader(); drawChart(); drawSub(); buildSignals();
  buildFilter(); buildWL(document.getElementById('wlSearch').value);
  btn.textContent='↻ تحديث'; btn.disabled=false;
}

window.addEventListener('resize',()=>{
  drawChart(); drawSub();
  const wrap=document.getElementById('chartWrap'), dtc=document.getElementById('dtCanvas');
  if(wrap&&dtc){ dtc.width=wrap.clientWidth; dtc.height=wrap.clientHeight; redrawShapes(); }
});

/* ══ INIT ══ */
async function init(){
  // 1) إظهار البيانات التجريبية فوراً لجميع الأسهم
  STOCKS.forEach(s=>initDemo(s.sym));

  // 2) بناء الواجهة فوراً
  buildTopBar(); buildWL(); buildChartHeader();
  buildStatus(); buildFilter(); drawChart(); drawSub();
  buildSignals(); buildDepth(); buildTrades(); buildInfo();
  setTimeout(injectDrawingToolbar, 200);

  // 3) تحميل الأسعار الحقيقية للأسهم المهمة
  const batchLoad = async(syms) => {
    await Promise.allSettled(syms.map(sym=>loadStock(sym)));
    buildTopBar(); buildWL(document.getElementById('wlSearch').value);
    buildChartHeader(); buildStatus(); buildFilter();
    if(ST.sel&&ST.loaded.has(ST.sel)){ drawChart(); drawSub(); buildSignals(); }
  };

  // تحميل الأسهم الرئيسية أولاً
  await batchLoad(PRIORITY.slice(0,5));
  // ثم باقي الأسهم المهمة
  batchLoad(PRIORITY.slice(5));

  // 4) تحميل بقية الأسهم في الخلفية
  setTimeout(async()=>{
    const rest=STOCKS.filter(s=>!PRIORITY.includes(s.sym)).map(s=>s.sym);
    for(let i=0;i<rest.length;i+=4){
      await Promise.allSettled(rest.slice(i,i+4).map(sym=>loadStock(sym)));
      await new Promise(r=>setTimeout(r,500));
      buildTopBar();
      buildWL(document.getElementById('wlSearch').value);
      buildStatus(); buildFilter();
    }
  }, 3000);

  // 5) ساعة
  setInterval(()=>{
    document.getElementById('clk').textContent=new Date().toLocaleTimeString('ar-SA');
    buildStatus();
  }, 5000);
}

init();
