/* ══════════════════════════════════════════
   drawing.js — أدوات الرسم على الشارت
══════════════════════════════════════════ */

const DT = {
  active: null, drawing: false,
  shapes: [], current: null,
  color: '#f5c842', lineWidth: 1.5,
  toPrice: null, fromPrice: null,
};

const DRAW_TOOLS = [
  { id:'cursor',  icon:'⊹', label:'مؤشر'      },
  { id:'line',    icon:'╱', label:'خط'         },
  { id:'hline',   icon:'—', label:'خط أفقي'   },
  { id:'vline',   icon:'|', label:'خط عمودي'  },
  { id:'ray',     icon:'↗', label:'شعاع'       },
  { id:'trendch', icon:'⟰', label:'قناة اتجاه' },
  { id:'rect',    icon:'▭', label:'مستطيل'    },
  { id:'fib',     icon:'Φ', label:'فيبوناتشي'  },
  { id:'arrow',   icon:'→', label:'سهم'        },
  { id:'text',    icon:'T', label:'نص'         },
  { id:'measure', icon:'⟺', label:'قياس'       },
  { id:'eraser',  icon:'⌫', label:'مسح شكل'  },
  { id:'clear',   icon:'🗑',label:'مسح الكل'  },
];

const FIB_LVL = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618];
const FIB_COL = [
  'rgba(245,200,66,.8)', 'rgba(245,200,66,.5)', 'rgba(245,200,66,.5)',
  'rgba(245,200,66,.7)', 'rgba(245,200,66,.5)', 'rgba(245,200,66,.4)',
  'rgba(245,200,66,.8)', 'rgba(167,139,250,.5)', 'rgba(167,139,250,.5)',
];

function buildDrawingToolbar() {
  return `
  <div id="dtbar" style="
    position:absolute;top:8px;right:8px;z-index:100;
    display:flex;flex-direction:column;gap:2px;
    background:rgba(11,14,24,0.96);
    border:1px solid rgba(255,255,255,0.08);
    border-radius:6px;padding:4px;
    backdrop-filter:blur(10px);
  ">
    ${DRAW_TOOLS.map(t => `
      <button id="dtb_${t.id}" title="${t.label}" onclick="setDTool('${t.id}')" style="
        width:26px;height:26px;
        border:1px solid transparent;border-radius:3px;
        background:none;color:rgba(200,210,230,0.7);
        cursor:pointer;font-size:12px;
        display:flex;align-items:center;justify-content:center;
        font-family:inherit;line-height:1;transition:all .12s;
      ">${t.icon}</button>
    `).join('')}
    <div style="border-top:1px solid rgba(255,255,255,.07);margin:2px 0;padding-top:2px">
      <input type="color" value="#f5c842" title="اللون"
        onchange="DT.color=this.value; redrawShapes()"
        style="width:26px;height:22px;border:none;background:none;cursor:pointer;padding:0">
    </div>
    <select title="سماكة الخط"
      onchange="DT.lineWidth=parseFloat(this.value); redrawShapes()"
      style="width:26px;border:1px solid rgba(255,255,255,.1);
      background:rgba(20,24,41,1);color:rgba(200,210,230,.8);
      font-size:9px;border-radius:2px;padding:1px;cursor:pointer">
      <option value="1">1</option>
      <option value="1.5" selected>1.5</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>
  </div>
  <canvas id="dtCanvas" style="position:absolute;top:0;left:0;cursor:crosshair;z-index:50"></canvas>`;
}

function setDTool(id) {
  if (id === 'clear') { DT.shapes = []; redrawShapes(); setDTool('cursor'); return; }
  DT.active = (id === DT.active) ? null : id;
  document.querySelectorAll('[id^="dtb_"]').forEach(b => {
    b.style.background    = 'none';
    b.style.borderColor   = 'transparent';
    b.style.color         = 'rgba(200,210,230,0.7)';
  });
  if (DT.active) {
    const btn = document.getElementById('dtb_' + DT.active);
    if (btn) {
      btn.style.background  = 'rgba(74,158,255,0.2)';
      btn.style.borderColor = 'rgba(74,158,255,0.4)';
      btn.style.color       = '#4a9eff';
    }
  }
  const dtc = document.getElementById('dtCanvas');
  if (dtc) dtc.style.cursor = id === 'cursor' ? 'default' : id === 'eraser' ? 'cell' : 'crosshair';
}

function initDrawingCanvas(wrap) {
  const dtc = document.getElementById('dtCanvas');
  if (!dtc) return;
  dtc.width  = wrap.clientWidth;
  dtc.height = wrap.clientHeight;
  dtc.removeEventListener('mousedown', dtc._md);
  dtc.removeEventListener('mousemove', dtc._mm);
  dtc.removeEventListener('mouseup',   dtc._mu);
  dtc._md = dtMouseDown; dtc._mm = dtMouseMove; dtc._mu = dtMouseUp;
  dtc.addEventListener('mousedown', dtMouseDown);
  dtc.addEventListener('mousemove', dtMouseMove);
  dtc.addEventListener('mouseup',   dtMouseUp);
  redrawShapes();
}

function dtMouseDown(e) {
  if (!DT.active || DT.active === 'cursor') return;
  if (DT.active === 'eraser') { eraseAt(e.offsetX, e.offsetY); return; }
  if (DT.active === 'text')   { addDTText(e.offsetX, e.offsetY); return; }
  DT.drawing = true;
  DT.startX  = e.offsetX; DT.startY = e.offsetY;
  DT.current = { type:DT.active, x1:e.offsetX, y1:e.offsetY, x2:e.offsetX, y2:e.offsetY, color:DT.color, lw:DT.lineWidth };
}

function dtMouseMove(e) {
  if (!DT.drawing || !DT.current) return;
  DT.current.x2 = e.offsetX; DT.current.y2 = e.offsetY;
  redrawShapes();
  drawDTPreview(e.offsetX, e.offsetY);
  // Crosshair
  const dtc = document.getElementById('dtCanvas');
  if (!dtc) return;
  const ctx = dtc.getContext('2d');
  ctx.strokeStyle = 'rgba(74,158,255,0.25)'; ctx.lineWidth = 0.5; ctx.setLineDash([3,3]);
  ctx.beginPath(); ctx.moveTo(e.offsetX,0); ctx.lineTo(e.offsetX, dtc.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, e.offsetY); ctx.lineTo(dtc.width, e.offsetY); ctx.stroke();
  ctx.setLineDash([]);
}

function dtMouseUp(e) {
  if (!DT.drawing || !DT.current) return;
  DT.current.x2 = e.offsetX; DT.current.y2 = e.offsetY;
  if (Math.abs(DT.current.x2-DT.current.x1) > 2 || Math.abs(DT.current.y2-DT.current.y1) > 2)
    DT.shapes.push({ ...DT.current });
  DT.current = null; DT.drawing = false;
  redrawShapes();
}

function drawDTPreview(mx, my) {
  const dtc = document.getElementById('dtCanvas');
  if (!dtc || !DT.current) return;
  const ctx = dtc.getContext('2d');
  ctx.globalAlpha = 0.6;
  renderShape(ctx, { ...DT.current, x2:mx, y2:my }, dtc.width, dtc.height);
  ctx.globalAlpha = 1;
}

function redrawShapes() {
  const dtc = document.getElementById('dtCanvas');
  if (!dtc) return;
  const ctx = dtc.getContext('2d');
  ctx.clearRect(0, 0, dtc.width, dtc.height);
  DT.shapes.forEach(s => renderShape(ctx, s, dtc.width, dtc.height));
}

function renderShape(ctx, s, W, H) {
  ctx.strokeStyle = s.color || '#f5c842';
  ctx.fillStyle   = s.color || '#f5c842';
  ctx.lineWidth   = s.lw    || 1.5;
  ctx.setLineDash([]);

  switch (s.type) {
    case 'line':
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke(); break;

    case 'hline':
      ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(0,s.y1); ctx.lineTo(W,s.y1); ctx.stroke();
      ctx.setLineDash([]);
      if (DT.toPrice) {
        ctx.font = '9px monospace'; ctx.fillStyle = s.color; ctx.textAlign = 'left';
        ctx.fillText(DT.toPrice(s.y1).toFixed(2), W-58, s.y1-3);
      }
      break;

    case 'vline':
      ctx.beginPath(); ctx.moveTo(s.x1,0); ctx.lineTo(s.x1,H); ctx.stroke(); break;

    case 'ray': {
      const dx=s.x2-s.x1, dy=s.y2-s.y1, len=Math.sqrt(dx*dx+dy*dy)||1, t=H*3/len;
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x1+dx*t, s.y1+dy*t); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x1,s.y1,3,0,Math.PI*2); ctx.fill();
      break;
    }

    case 'trendch': {
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
      const dx=s.x2-s.x1, dy=s.y2-s.y1, len=Math.sqrt(dx*dx+dy*dy)||1, off=35;
      const nx=-dy/len*off, ny=dx/len*off;
      ctx.strokeStyle = s.color+'99'; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(s.x1+nx,s.y1+ny); ctx.lineTo(s.x2+nx,s.y2+ny); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x1-nx,s.y1-ny); ctx.lineTo(s.x2-nx,s.y2-ny); ctx.stroke();
      ctx.setLineDash([]);
      break;
    }

    case 'rect':
      ctx.strokeRect(s.x1, s.y1, s.x2-s.x1, s.y2-s.y1);
      ctx.fillStyle = s.color + '18';
      ctx.fillRect(s.x1, s.y1, s.x2-s.x1, s.y2-s.y1);
      break;

    case 'fib': {
      const dy = s.y2 - s.y1;
      FIB_LVL.forEach((f, i) => {
        const y = s.y1 + dy * f;
        ctx.strokeStyle = FIB_COL[i];
        ctx.lineWidth   = (f===0||f===1) ? 1.2 : 0.7;
        ctx.setLineDash(f===0.5 ? [4,3] : []);
        ctx.beginPath(); ctx.moveTo(Math.min(s.x1,s.x2), y); ctx.lineTo(W-62, y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle  = FIB_COL[i].replace(/[\d.]+\)/, '0.9)');
        ctx.font       = '8px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`${(f*100).toFixed(1)}% ${DT.toPrice ? DT.toPrice(y).toFixed(2) : ''}`, W-60, y+3);
      });
      ctx.strokeStyle = s.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
      break;
    }

    case 'arrow': {
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
      const ang = Math.atan2(s.y2-s.y1, s.x2-s.x1), sz = 10;
      ctx.beginPath();
      ctx.moveTo(s.x2, s.y2);
      ctx.lineTo(s.x2 - sz*Math.cos(ang-.4), s.y2 - sz*Math.sin(ang-.4));
      ctx.lineTo(s.x2 - sz*Math.cos(ang+.4), s.y2 - sz*Math.sin(ang+.4));
      ctx.closePath(); ctx.fill();
      break;
    }

    case 'text':
      ctx.font = `${s.fs||13}px IBM Plex Sans Arabic,sans-serif`;
      ctx.fillStyle = s.color; ctx.textAlign = 'start';
      ctx.fillText(s.text || '', s.x1, s.y1);
      break;

    case 'measure': {
      ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
      ctx.setLineDash([]);
      const mx=(s.x1+s.x2)/2, my=(s.y1+s.y2)/2;
      const pd = DT.toPrice ? Math.abs(DT.toPrice(s.y2)-DT.toPrice(s.y1)).toFixed(2) : '';
      ctx.fillStyle = 'rgba(11,14,24,0.88)'; ctx.fillRect(mx-40, my-20, 80, 18);
      ctx.fillStyle = s.color; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(`Δ${pd}`, mx, my-7);
      [[s.x1,s.y1],[s.x2,s.y2]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.moveTo(x,y-5); ctx.lineTo(x,y+5); ctx.stroke();
      });
      break;
    }
  }
}

function eraseAt(x, y) {
  const thresh = 12;
  DT.shapes = DT.shapes.filter(s => {
    if (s.type==='hline') return Math.abs(s.y1-y) > thresh;
    if (s.type==='vline') return Math.abs(s.x1-x) > thresh;
    if (s.type==='text')  return !(Math.abs(s.x1-x)<60 && Math.abs(s.y1-y)<20);
    return ptSegDist(x, y, s.x1||0, s.y1||0, s.x2||s.x1||0, s.y2||s.y1||0) > thresh;
  });
  redrawShapes();
}

function ptSegDist(px,py,ax,ay,bx,by) {
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  if (!l2) return Math.hypot(px-ax, py-ay);
  const t = Math.max(0, Math.min(1, ((px-ax)*dx+(py-ay)*dy)/l2));
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}

function addDTText(x, y) {
  const txt = prompt('أدخل النص:');
  if (txt?.trim()) {
    DT.shapes.push({ type:'text', x1:x, y1:y, text:txt.trim(), color:DT.color, fs:13 });
    redrawShapes();
  }
}

function injectDrawingToolbar() {
  const wrap = document.getElementById('chartWrap');
  if (!wrap || document.getElementById('dtCanvas')) return;
  wrap.insertAdjacentHTML('beforeend', buildDrawingToolbar());
  initDrawingCanvas(wrap);
  setDTool('cursor');
}
