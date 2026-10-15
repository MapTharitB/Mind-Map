/* MindMap 1.5.0 | apiVersion 1 | Classic mountable module.
 * Frozen source: Original/mindmap.original.html; Phase 2 extraction recipe in dev/.
 * Host supplies usable dimensions and the Outliner CSS color-token contract.
 */
(function(){
'use strict';
function mount(container,opts={}){
  if(!(container instanceof Element))throw new TypeError('MindMap.mount requires an Element');
  let destroyed=false,pdfBusy=false,sourceText='',sourcePlaceholders=[],rtimer=null;
  const timers=new Set(),frames=new Set(),listeners=[],objectURLs=new Set();
  const hadClass=container.classList.contains('moa-mindmap');
  container.classList.add('moa-mindmap');
  const style=document.createElement('style');
  style.textContent=".moa-mindmap{position:relative;min-width:0;min-height:0;}\n.moa-mindmap #mm-map{position:absolute;top:0;left:0;z-index:1;display:block;cursor:grab;touch-action:none}\n.moa-mindmap #mm-map:active{cursor:grabbing}\n.moa-mindmap #mm-empty{position:absolute;z-index:2;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;pointer-events:none;transition:left .26s ease,width .26s ease;}\n.moa-mindmap #mm-empty .ico{font-size:44px;opacity:.16}\n.moa-mindmap #mm-empty p{font-size:13px;font-weight:500;color:rgba(110,108,120,0.55);letter-spacing:.01em;white-space:nowrap}\n.moa-mindmap #mm-zoom-hud{position:absolute;top:14px;right:16px;z-index:10;background:var(--map-hud-bg,var(--page));backdrop-filter:blur(var(--map-glass-blur,8px));-webkit-backdrop-filter:blur(var(--map-glass-blur,8px));color:var(--map-hud-ink,var(--mute));font-size:11px;font-family:'Cascadia Code',monospace;padding:5px 10px;border-radius:var(--map-glass-radius,6px);pointer-events:none;letter-spacing:.04em}\n.moa-mindmap #mm-btn-rst{position:absolute;bottom:14px;right:16px;z-index:10;background:var(--map-glass-bg,var(--btn));backdrop-filter:blur(var(--map-glass-blur,8px));-webkit-backdrop-filter:blur(var(--map-glass-blur,8px));color:var(--map-glass-ink,var(--ink));font-size:11px;font-weight:600;padding:6px 14px;border-radius:var(--map-glass-pill,100px);border:none;outline:none;cursor:pointer;letter-spacing:.04em;transition:background .15s,color .15s;display:flex;align-items:center;gap:5px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;}\n@media(hover:hover){.moa-mindmap #mm-btn-rst:hover{background:var(--map-glass-hover,var(--halo));color:var(--map-glass-ink,var(--ink))}}\n.moa-mindmap #mm-btn-rst:active{background:var(--map-glass-pressed,var(--accent));color:var(--map-glass-ink,var(--ink))}\n.moa-mindmap #mm-btn-rst:focus,.moa-mindmap #mm-btn-rst:focus-visible{outline:none}\n.moa-mindmap #mm-error{position:absolute;left:0;bottom:0;z-index:11;max-width:calc(100% - 150px);background:var(--page);color:var(--ink);font:inherit;pointer-events:none;}";
  const owned=document.createElement('div');
  owned.className='mm-owned';
  style.textContent+="\n.moa-mindmap .mm-owned,.moa-mindmap .mm-owned *{box-sizing:border-box;margin:0;padding:0}\n.moa-mindmap #mm-empty{font-family:'Segoe UI',system-ui,-apple-system,sans-serif}\n.moa-mindmap #mm-empty,.moa-mindmap #mm-zoom-hud,.moa-mindmap #mm-btn-rst{line-height:normal}";
  owned.innerHTML='<canvas id="mm-map"></canvas><div id="mm-empty"></div><div id="mm-zoom-hud">100%</div><button id="mm-btn-rst">⊡ Reset View</button><div id="mm-error" role="status" hidden></div>';
  // Placement variables are optional; standalone chrome retains its original positions.
  style.textContent+="\n.moa-mindmap #mm-zoom-hud,.moa-mindmap #mm-btn-rst{visibility:var(--map-chrome-visibility,visible)}\n.moa-mindmap #mm-zoom-hud{top:var(--map-hud-top,14px);bottom:var(--map-hud-bottom,auto);right:var(--map-control-right,16px);width:auto;max-width:var(--map-hud-max-width,none);height:var(--map-hud-height,auto);overflow:hidden}\n.moa-mindmap #mm-btn-rst{bottom:var(--map-reset-bottom,14px);top:var(--map-reset-top,auto);right:var(--map-control-right,16px);width:var(--map-reset-width,auto);height:var(--map-reset-height,auto);justify-content:center}\n.moa-mindmap.map-covered #mm-zoom-hud,.moa-mindmap.map-covered #mm-btn-rst{visibility:hidden;pointer-events:none}";
  // R12 managed chrome only; no drawing/layout/fit change.
  style.textContent+="\n.moa-mindmap.chrome-managed #mm-zoom-hud{left:var(--map-hud-left,14px);right:auto;white-space:nowrap}\n.moa-mindmap.chrome-managed #mm-btn-rst:focus-visible{outline:2px solid var(--accent);outline-offset:-3px}";
  container.append(style,owned);
  const canvas=owned.querySelector('#mm-map'),ctx=canvas.getContext('2d');
  const emptyEl=owned.querySelector('#mm-empty'),hudEl=owned.querySelector('#mm-zoom-hud');
  const btnRst=owned.querySelector('#mm-btn-rst'),errorEl=owned.querySelector('#mm-error');
  function reportError(error){
    if(destroyed)return;
    errorEl.textContent=error.message||String(error);errorEl.hidden=false;
    if(typeof opts.onError==='function'){try{opts.onError(error);}catch(hostError){console.error(hostError);}}
  }
  function guarded(fn){return function(...args){if(destroyed)return;try{return fn.apply(this,args);}catch(error){reportError(error);}};}
  function listen(target,type,fn,options){const safe=guarded(fn);target.addEventListener(type,safe,options);listeners.push(()=>target.removeEventListener(type,safe,options));}
  function setTimeout(fn,delay){const id=window.setTimeout(()=>{timers.delete(id);guarded(fn)();},delay);timers.add(id);return id;}
  function clearTimeout(id){window.clearTimeout(id);timers.delete(id);}
  function requestAnimationFrame(fn){const id=window.requestAnimationFrame(now=>{frames.delete(id);guarded(fn)(now);});frames.add(id);return id;}
  function cancelAnimationFrame(id){window.cancelAnimationFrame(id);frames.delete(id);}
  const fontURL='https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap';
  let fontLink=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(link=>link.getAttribute('href')===fontURL);
  const ownsFont=!fontLink;
  if(!fontLink){fontLink=document.createElement('link');fontLink.rel='stylesheet';fontLink.href=fontURL;}
  listen(fontLink,'error',()=>reportError(new Error('Sarabun font stylesheet failed to load. Canvas uses the original fallback font.')));
  listen(fontLink,'load',()=>loadFonts());
  if(ownsFont)document.head.appendChild(fontLink);
let hlimitInf=true,hlimitN=3,d1Max=Infinity;
function hlimitCap(d){return Math.max(1,d-1);}
function safeFileName(label){
  return(label||'MindMap').replace(/[\/\\?%*:|"<>]/g,'-').trim()||'MindMap';
}

const C={
  BASE_FONT:10,RATIO:2.5,LINE_H:1.5,
  GAP_R:0.75,SUB_GAP_R:0.20125,CHILD_STEP_R:0.85,RISE_PAD_R:0.70,LOWER_THAI_CHILD_R:1.5,LOWER_THAI_FANOUT_FRAC:0.5,
  D0_D1_GAP_MULT:1.145,D1_TXT_PAD_R:0.105,
  D1_ROW_GAP_R:0.195,SIBLING_GAP_R:0.135,D1_ARM_FLOOR_R:0.5,
  THAI_TIER1_R:0.08,THAI_TIER2_R:0.18,THAI_TIER3_R:0.30,THAI_TIER3_FIRSTROW_R:0.45,
  CAP_FRAC:0.70,
  VG_FRAC:0.85,BASE_LINE:0.6,BASE_GAP:50,
  LEFT_M:80,RIGHT_M:80,TOP_M:60,BOT_M:100,
  BUS_MID:0.4,
  ARM_K:0.54,
  BG:'#F5F4EE',
  FONT:"'Sarabun',system-ui,-apple-system,sans-serif",
  BASELINE_FRAC:   0.82,
  MAX_SAFE_FONT:   500,
  RENDER_DEBOUNCE: 180,
  BTN_DRAG_THRESH: 14,
  EXPAND_THRESH:   10,
  ANIM_FIT:        300,
  ANIM_ZOOM:       280,
  ANIM_PANEL:      200,
  ANIM_KB:         390,
  ANIM_KB_BTN:     350,
  ANIM_RST:        320,
};

const SNAP_AMBIG_THRESH=0.30;
const TREE_PAD_FRAC=0.08;
const lnW=(d,MD)=>d<=0?0:C.BASE_LINE*Math.pow(C.RATIO,MD-d);
const cgap=(d,MD)=>C.BASE_GAP*Math.pow(C.RATIO,MD-d);

/* ══ COLOR ══ */
function hsl(h,s,l){
  const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(Math.min(k-3,9-k,1),-1)));};
  return`rgb(${f(0)},${f(8)},${f(4)})`;
}
function nhash(seed,label){let h=seed>>>0;for(let i=0;i<label.length;i++)h=(Math.imul(31,h)+label.charCodeAt(i))>>>0;return h;}
function lcg(s){return(s*1664525+1013904223)>>>0}
function r01(s){return s/0x100000000}
function clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v}

function assignColors(node,ph,ps,pl,seed){
  if(!node.children.length)return;
  const HLO=36,HHI=90,SLO=0.40,SHI=0.65,SMID=0.55,LLO=0.20,LHI=0.40,LMID=0.30;
  if(node.depth===0){
    let bd=nhash(seed,'d1base');
    const bH=r01(bd)*360;bd=lcg(bd);
    const bS=SLO+r01(bd)*(SHI-SLO);bd=lcg(bd);
    const bL=0.20+r01(bd)*0.10;
    let prevH=bH;
    node.children.forEach(ch=>{
      let sd=nhash(seed,ch.label);
      const shift=HLO+r01(sd)*(HHI-HLO);sd=lcg(sd);
      const h=(prevH+shift)%360;prevH=h;sd=lcg(sd);
      const sv=clamp(bS+(bS<SMID?1:-1)*r01(sd)*0.05,SLO,SHI);sd=lcg(sd);
      const lW=(bL<LMID?1:-1)*r01(sd)*0.10;sd=lcg(sd);
      const l=clamp(bL+lW,LLO,LHI);
      ch.col=hsl(h,sv,l);
      assignColors(ch,h,sv,l,nhash(seed,ch.label));
    });
  }else{
    let sd=nhash(seed,String(node.depth+1));
    const shift=HLO+r01(sd)*(HHI-HLO);sd=lcg(sd);
    const h=(ph+shift)%360;sd=lcg(sd);
    const sW=(ps<SMID?1:-1)*r01(sd)*0.10;sd=lcg(sd);
    const sv=clamp(ps+sW,SLO,SHI);sd=lcg(sd);
    const lW=(pl<LMID?1:-1)*r01(sd)*0.10;sd=lcg(sd);
    const l=clamp(pl+lW,LLO,LHI);
    node.children.forEach(ch=>{ch.col=hsl(h,sv,l);assignColors(ch,h,sv,l,seed);});
  }
}

/* ══ PARSER ══ */
function getIndentUnits(line){
  let u=0;
  for(const c of line){
    if(c==='\t')u+=2;
    else if(c===' ')u+=1;
    else break;
  }
  return u;
}

function parse(raw){
  const lines=raw.split('\n').filter(l=>l.trim());
  if(!lines.length)return null;
  const clean=s=>s.trim().replace(/^[-*•]\s+/,'').trim();
  const root={label:'__s__',children:[],depth:-1};
  const stk=[{ind:-1,node:root}];
  for(const line of lines){
    const sp=getIndentUnits(line);
    const lbl=clean(line);
    if(!lbl)continue;
    while(stk.length>1&&stk[stk.length-1].ind>=sp)stk.pop();
    const p=stk[stk.length-1].node,n={label:lbl,children:[],depth:p.depth+1};
    p.children.push(n);stk.push({ind:sp,node:n});
  }
  if(root.children.length===1)return root.children[0];
  const shift=(n,d)=>{n.depth+=d;n.children.forEach(c=>shift(c,d));};
  root.children.forEach(c=>shift(c,1));
  return{label:'Root',children:root.children,depth:0,synthetic:true};
}

// R11 metadata indexes count real parsed nodes in preorder, excluding the synthetic root.
function flagPlaceholders(root,indexes){
  const flagged=new Set(indexes),stack=root.synthetic?root.children.slice().reverse():[root];
  let index=0;
  while(stack.length){
    const node=stack.pop();node.placeholder=flagged.has(index++);
    for(let i=node.children.length-1;i>=0;i--)stack.push(node.children[i]);
  }
}

/* ══ MEASURE ══ */
const _mc=document.createElement('canvas'),_cx=_mc.getContext('2d');
const fsz=(d,MD)=>Math.max(C.BASE_FONT,C.BASE_FONT*Math.pow(C.RATIO,MD-d));
const fwt=d=>d<=2?'bold':'normal';
function mW(lbl,f,w){const s=Math.min(f,C.MAX_SAFE_FONT);_cx.font=`${w} ${s}px ${C.FONT}`;return _cx.measureText(lbl).width*(f/s);}
const _capFracCache=new Map();
function capCFrac(fs,fw){
  const k=Math.round(fs)+'|'+fw;
  if(_capFracCache.has(k))return _capFracCache.get(k);
  const _s=Math.min(fs,C.MAX_SAFE_FONT);
  _cx.font=`${fw} ${_s}px ${C.FONT}`;
  _cx.textBaseline='alphabetic';
  const m=_cx.measureText('H');
  const v=0.82-(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)/(2*_s);
  const r=(isFinite(v)&&v>0.05&&v<0.95)?v:C.CAP_FRAC;
  _capFracCache.set(k,r);
  return r;
}
function maxD(n,c=0){if(!n.children.length)return c;return Math.max(...n.children.map(ch=>maxD(ch,c+1)));}
function lastLeafFs(n){return n.children.length?lastLeafFs(n.children[n.children.length-1]):n.fs;}

/* ══ ARM / SPINE HELPERS ══ */
const armLen=(d,MD)=>fsz(d,MD)*C.ARM_K;

function spineXOf(node){
  const c=[...node.label],w1=c.length?mW(c[0],node.fs,node.fw):0;
  const effectiveLen=c.filter(ch=>!isThaiSpineCombining(ch.codePointAt(0))).length;
  return node.x+(effectiveLen===1?w1/2:w1);
}

function assignSubtreeX(node,MD){
  const sx=spineXOf(node);
  node.children.forEach(ch=>{
    ch.x=sx+armLen(ch.depth,MD);
    assignSubtreeX(ch,MD);
  });
}

function colW(n,MD){
  let mx=0;
  const wk=(node,rx)=>{
    const r=rx+mW(node.label,node.fs,node.fw);
    if(r>mx)mx=r;
    const c=[...node.label],w1=c.length?mW(c[0],node.fs,node.fw):0;
    const effectiveLen=c.filter(ch=>!isThaiSpineCombining(ch.codePointAt(0))).length;
    const sx=rx+(effectiveLen===1?w1/2:w1);
    node.children.forEach(ch=>wk(ch,sx+armLen(ch.depth,MD)));
  };
  wk(n,0);
  return mx;
}

/* ══ ROOT GRID HELPERS ══ */
function footprintW(node,MD){
  return Math.max(mW(node.label,node.fs,node.fw),colW(node,MD));
}
function thaiTierBonusFrac(tier){
  switch(tier){case 1:return C.THAI_TIER1_R;case 2:return C.THAI_TIER2_R;case 3:return C.THAI_TIER3_R;default:return 0;}
}
function siblingGapDelta(ch,prevLastLeafFs){
  let g=ch.fs*C.SIBLING_GAP_R;
  if(ch.fs>prevLastLeafFs)g+=ch.fs*C.RISE_PAD_R;
  g+=ch.fs*thaiTierBonusFrac(ch.thaiTier);
  return g;
}
function lowerThaiChildBonus(parentNode,baseGap){
  return parentNode.hasLower?baseGap*C.LOWER_THAI_CHILD_R:0;
}
function footprintH(node,MD){
  if(!node.children.length)return node.fs*C.LINE_H;
  const sR=node.depth>=1?C.CHILD_STEP_R:1;
  const subGap=node.children[0].fs*C.SUB_GAP_R*sR;
  let h=node.fs*C.LINE_H*sR+subGap+lowerThaiChildBonus(node,subGap);
  for(let i=0;i<node.children.length;i++){
    const ch=node.children[i];
    if(i>0)h+=siblingGapDelta(ch,lastLeafFs(node.children[i-1]));
    h+=footprintH(ch,MD);
  }
  return h;
}
function d1ColGap(colA,colB,ARM1){
  const mxA=colA.length?Math.max(...colA.map(ch=>mW(ch.label,ch.fs,ch.fw))):0;
  const mxB=colB.length?Math.max(...colB.map(ch=>mW(ch.label,ch.fs,ch.fw))):0;
  return Math.max(ARM1*C.D1_ARM_FLOOR_R,(mxA+mxB)*C.D1_TXT_PAD_R);
}
function d1RowGap(nextNode){return nextNode.fs*C.D1_ROW_GAP_R+nextNode.fs*thaiTierBonusFrac(nextNode.thaiTier);}
function firstRowUpwardBonus(nodes,d1Fs){
  if(!nodes.length)return 0;
  const maxTier=Math.max(...nodes.map(n=>n.thaiTier||0));
  const frac=maxTier===3?C.THAI_TIER3_FIRSTROW_R:thaiTierBonusFrac(maxTier);
  return d1Fs*frac;
}

/* ══ LAYOUT ══ */
function place(node,y0){
  node.y=y0;
  if(node.children.length){
    const sR=node.depth>=1?C.CHILD_STEP_R:1;
    const subGap=node.children[0].fs*C.SUB_GAP_R*sR;
    let yc=y0+node.fs*C.LINE_H*sR+subGap+lowerThaiChildBonus(node,subGap);
    for(let i=0;i<node.children.length;i++){
      const ch=node.children[i];
      if(i>0)yc+=siblingGapDelta(ch,lastLeafFs(node.children[i-1]));
      yc=place(ch,yc);
    }
    return yc;
  }
  return y0+node.fs*C.LINE_H;
}
function annotateNodes(node,MD){
  node.fs=fsz(node.depth,MD);node.fw=fwt(node.depth);node.capFrac=capCFrac(node.fs,node.fw);
  node.thaiTier=thaiHeightTier(node.label);node.hasLower=hasThaiLower(node.label);
  node.children.forEach(ch=>annotateNodes(ch,MD));
}
function layoutSimple(root,MD,colorSeed){
  const d1=root.children,NC=d1.length;
  root.y=C.TOP_M;
  const d1Fs=NC?d1[0].fs:C.BASE_FONT;
  const d1TxtW=d1.map(n=>mW(n.label,n.fs,n.fw));
  const d1ColW_s=d1.map((n,i)=>Math.max(colW(n,MD),d1TxtW[i]));
  const cl=[];let xc=C.LEFT_M;
  for(let i=0;i<NC;i++){
    cl.push(xc);
    const rPad=d1TxtW[i]*C.D1_TXT_PAD_R;
    const lPad=i+1<NC?d1TxtW[i+1]*C.D1_TXT_PAD_R:0;
    xc+=d1ColW_s[i]+rPad+lPad;
  }
  for(let i=0;i<NC;i++){d1[i].x=cl[i];assignSubtreeX(d1[i],MD);}
  for(let i=0;i<NC;i++)d1[i].cx=d1[i].x+d1TxtW[i]/2;
  const rCX=NC===0?C.LEFT_M+mW(root.label,root.fs,root.fw)/2:
    NC===1?d1[0].cx:(d1[0].cx+d1[NC-1].cx)/2;
  root.cx=rCX;root.x=rCX-mW(root.label,root.fs,root.fw)/2;
  root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);
  const d1BaseGap=d1Fs*C.GAP_R*C.D0_D1_GAP_MULT;
  const d1Y=root.y+root.fs+d1BaseGap+lowerThaiChildBonus(root,d1BaseGap)*(NC===1?1:C.LOWER_THAI_FANOUT_FRAC);
  const firstRowBonus=firstRowUpwardBonus(d1,d1Fs);
  const bots=[];for(let i=0;i<NC;i++)bots.push(place(d1[i],d1Y+firstRowBonus));
  const pW=Math.max(NC?cl[NC-1]+d1ColW_s[NC-1]+d1TxtW[NC-1]*C.D1_TXT_PAD_R:0,
    root.x+mW(root.label,root.fs,root.fw))+C.RIGHT_M;
  const pH=(bots.length?Math.max(...bots):d1Y+120)+C.BOT_M;
  const av=d1Y-root.y-root.fs;
  const rg=Math.min(cgap(1,MD),av*0.3);
  const rb=root.y+root.fs+rg;
  const d1BusY=rb+(d1Y-rb)*C.BUS_MID;
  const sX0=Math.min(root.x,NC?cl[0]:root.x);
  const sX1=Math.max(root.x+mW(root.label,root.fs,root.fw),
    NC?cl[NC-1]+d1ColW_s[NC-1]+d1TxtW[NC-1]*C.D1_TXT_PAD_R:root.x);
  return{root,MD,pW,pH,d1Y,d1Mode:'simple',d1Cols:null,d1Groups:null,
    d1ColX:null,d1BusY,d1X0:sX0,d1X1:sX1,firstRowBonus};
}
function layoutGrid(root,MD,colorSeed){
  const d1=root.children,NC=d1.length;
  root.y=C.TOP_M;
  const cols=Math.min(hlimitN,NC);
  const ARM1=armLen(1,MD);
  const d1Fs=d1[0].fs;
  const base=Math.floor(NC/cols),extra=NC%cols;
  const colChildren=[];let cidx=0;
  for(let c=0;c<cols;c++){const sz=c<extra?base+1:base;colChildren.push(d1.slice(cidx,cidx+sz));cidx+=sz;}
  const colWidths=colChildren.map(chs=>ARM1+(chs.length?Math.max(...chs.map(ch=>footprintW(ch,MD))):0));
  const gridX0=C.LEFT_M;
  const d1ColX=[],colLabelX=[];
  let xcg=gridX0;
  for(let c=0;c<cols;c++){
    d1ColX.push(xcg);colLabelX.push(xcg+ARM1);
    xcg+=colWidths[c]+(c+1<cols?d1ColGap(colChildren[c],colChildren[c+1],ARM1):0);
  }
  const gridX1=d1ColX[cols-1]+colWidths[cols-1];
  const d1BaseGap_g=d1Fs*C.GAP_R*C.D0_D1_GAP_MULT;
  const d1Y_g=root.y+root.fs+d1BaseGap_g+lowerThaiChildBonus(root,d1BaseGap_g)*(cols===1?1:C.LOWER_THAI_FANOUT_FRAC);
  const av_g=d1Y_g-root.y-root.fs;
  const rg_g=Math.min(cgap(1,MD),av_g*0.3);
  const rb_g=root.y+root.fs+rg_g;
  const d1BusY=rb_g+(d1Y_g-rb_g)*C.BUS_MID;
  const gridStartY=d1Y_g;
  const firstRowNodes=colChildren.map(chs=>chs[0]).filter(Boolean);
  const firstRowBonus=cols>1?firstRowUpwardBonus(firstRowNodes,d1Fs):0;
  const colRowY=[];
  for(let c=0;c<cols;c++){
    let yc=gridStartY+firstRowBonus;colRowY[c]=[];
    for(let r=0;r<colChildren[c].length;r++){
      colRowY[c][r]=yc;yc+=footprintH(colChildren[c][r],MD);
      if(r+1<colChildren[c].length)yc+=d1RowGap(colChildren[c][r+1]);
    }
  }
  const d1Groups=[];
  for(let c=0;c<cols;c++){
    for(let r=0;r<colChildren[c].length;r++){
      const ch=colChildren[c][r];
      ch.x=colLabelX[c];assignSubtreeX(ch,MD);place(ch,colRowY[c][r]);
      ch.cx=ch.x+mW(ch.label,ch.fs,ch.fw)/2;
      d1Groups.push({node:ch,col:c,row:r,cellX:d1ColX[c],cellY:colRowY[c][r],
        labelX:colLabelX[c],cellW:colWidths[c],cellH:footprintH(ch,MD)});
    }
  }
  let gridY1=gridStartY;
  for(let c=0;c<cols;c++){
    const chs=colChildren[c];if(!chs.length)continue;
    const bot=colRowY[c][chs.length-1]+footprintH(chs[chs.length-1],MD);
    if(bot>gridY1)gridY1=bot;
  }
  const gridTotalW=gridX1-gridX0;
  const existingCX=gridX0+gridTotalW/2;
  const spineCX=(d1ColX[0]+d1ColX[cols-1])/2;
  const rCX_g=(existingCX+spineCX)/2;
  root.cx=rCX_g;root.x=rCX_g-mW(root.label,root.fs,root.fw)/2;
  root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);
  if(cols===1)assignSubtreeX(root,MD);
  let _gMaxX=root.x+mW(root.label,root.fs,root.fw);
  (function _gwk(n){const rx=n.x+mW(n.label,n.fs,n.fw);if(rx>_gMaxX)_gMaxX=rx;n.children.forEach(_gwk);})(root);
  return{root,MD,pW:_gMaxX+C.RIGHT_M,pH:gridY1+C.BOT_M,d1Y:gridStartY,
    d1Mode:'grid',d1Cols:cols,d1Groups,d1ColX,d1BusY,d1X0:gridX0,d1X1:gridX1,firstRowBonus};
}
function layout(root,colorSeed){
  const MD=maxD(root);annotateNodes(root,MD);
  const NC=root.children.length;
  return(hlimitInf||NC<=hlimitN)?layoutSimple(root,MD,colorSeed):layoutGrid(root,MD,colorSeed);
}

/* ══ CONTENT BOUNDS ══ */
function contentBounds(lay){
  const root=lay.root;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const walk=n=>{
    const safeFs=Math.min(n.fs,C.MAX_SAFE_FONT);
    const scaleRatio=n.fs/safeFs;
    _cx.font=`${n.fw} ${safeFs}px ${C.FONT}`;_cx.textBaseline='alphabetic';
    const m=_cx.measureText(n.label);
    const baselineY=n.y+n.fs*C.BASELINE_FRAC;
    const ny0=baselineY-(m.actualBoundingBoxAscent??safeFs*0.80)*scaleRatio;
    const ny1=baselineY+(m.actualBoundingBoxDescent??safeFs*0.20)*scaleRatio;
    const nx1=n.x+mW(n.label,n.fs,n.fw);
    if(!n.synthetic){if(n.x<x0)x0=n.x;if(ny0<y0)y0=ny0;if(nx1>x1)x1=nx1;if(ny1>y1)y1=ny1;}
    n.children.forEach(walk);
  };
  walk(root);
  if(lay.d1Mode==='grid'){x0=Math.min(x0,lay.d1X0);x1=Math.max(x1,lay.d1X1);y0=Math.min(y0,lay.d1BusY);}
  return{x:x0,y:y0,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};
}

/* ══ CONNECTION SEGMENTS ══ */
function getConnSegments(lay){
  const{root,MD,d1Y,d1Mode,d1BusY,d1ColX,d1Groups,d1Cols,d1X0,d1X1}=lay;
  const d1=root.children;
  const segs=[];
  const seg=(col,lw,x1,y1,x2,y2)=>segs.push({col,lw,x1,y1,x2,y2});
  const subSegs=p=>{
    if(!p.children.length)return;
    const sx=spineXOf(p);
    const fc=p.children[0];
    const lastCh=p.children[p.children.length-1];
    const lmy=lastCh.y+lastCh.fs*lastCh.capFrac;
    const vg=(fc.y-p.y-p.fs)*C.VG_FRAC;
    seg(p.col,lnW(p.depth+1,MD),sx,p.y+p.fs+vg,sx,lmy);
    for(const ch of p.children){
      const cy=ch.y+ch.fs*ch.capFrac;
      seg(p.col,lnW(ch.depth,MD),sx,cy,sx+armLen(ch.depth,MD)*0.70,cy);
    }
    p.children.forEach(subSegs);
  };
  if(root.synthetic){d1.forEach(subSegs);return segs;}
  if(d1Mode==='simple'){
    if(d1.length){
      const by=d1BusY;
      const d1BaseGap=d1[0].fs*C.GAP_R*C.D0_D1_GAP_MULT;
      const rg=Math.min(cgap(1,MD),d1BaseGap*0.3);
      const rb=by-(d1BaseGap-rg)*C.BUS_MID;
      const upperLen=by-rb;
      let topX=root.cx,snapIdx=-1;
      if(d1.length>=3){
        const _sd=[];
        for(let i=1;i<d1.length-1;i++){
          const n=d1[i],dg=Math.min(cgap(1,MD),(n.y-by)*0.3);
          const dist=Math.abs(n.cx-root.cx);
          if(dist<Math.min(upperLen,(n.y-dg)-by))_sd.push({i,dist});
        }
        if(_sd.length){
          _sd.sort((a,b)=>a.dist-b.dist);
          const _ambig=d1.length%2===0&&_sd.length>=2&&
            (_sd[1].dist-_sd[0].dist)/Math.max(_sd[1].dist,0.001)<=SNAP_AMBIG_THRESH;
          if(!_ambig)snapIdx=_sd[0].i;
        }
        if(snapIdx!==-1)topX=(d1[snapIdx].cx+root.cx)/2;
      }
      const lw1=lnW(1,MD);
      seg(root.col,lw1,topX,rb,topX,by);
      if(d1.length>1)seg(root.col,lw1,d1[0].cx,by,d1[d1.length-1].cx,by);
      for(let i=0;i<d1.length;i++){
        const n=d1[i],nx=i===snapIdx?topX:n.cx;
        seg(root.col,lw1,nx,by,nx,by+(by-rb));
      }
    }
    d1.forEach(subSegs);return segs;
  }
  if(d1.length){
    const lw1=lnW(1,MD);
    if(d1Cols===1){
      const sx=spineXOf(root);
      const fc=d1[0],lastD1=d1[d1.length-1];
      const lmy=lastD1.y+lastD1.fs*lastD1.capFrac;
      const vg=(fc.y-root.y-root.fs)*C.VG_FRAC*0.4;
      seg(root.col,lw1,sx,root.y+root.fs+vg,sx,lmy);
      for(const ch of d1){
        const ey=ch.y+ch.fs*ch.capFrac;
        seg(root.col,lw1,sx,ey,ch.x-armLen(1,MD)*0.30,ey);
      }
    }else{
      const d1BaseGap=d1[0].fs*C.GAP_R*C.D0_D1_GAP_MULT;
      const rg=Math.min(cgap(1,MD),d1BaseGap*0.3);
      seg(root.col,lw1,root.cx,d1BusY-(d1BaseGap-rg)*C.BUS_MID,root.cx,d1BusY);
      seg(root.col,lw1,Math.min(d1X0,root.cx),d1BusY,Math.max(d1ColX[d1Cols-1],root.cx),d1BusY);
      for(let c=0;c<d1Cols;c++){
        const shaftX=d1ColX[c];
        const colGs=d1Groups.filter(g=>g.col===c);if(!colGs.length)continue;
        const lastCh=colGs[colGs.length-1].node;
        seg(root.col,lw1,shaftX,d1BusY,shaftX,lastCh.y+lastCh.fs*lastCh.capFrac);
        for(const g of colGs){
          const ch=g.node;
          seg(root.col,lw1,shaftX,ch.y+ch.fs*ch.capFrac,ch.x-armLen(1,MD)*0.30,ch.y+ch.fs*ch.capFrac);
        }
      }
    }
  }
  d1.forEach(subSegs);return segs;
}

/* ══ DRAW (canvas) ══ */
function drawConn(ctx,lay){
  ctx.lineCap='round';ctx.lineJoin='round';
  for(const s of getConnSegments(lay)){
    ctx.strokeStyle=s.col;ctx.lineWidth=s.lw;
    ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();
  }
}
// R11: label-only override after normal color assignment; connections still use node.col.
const PLACEHOLDER_COLOR='rgb(180,178,170)';
function labelColor(node){return node.placeholder?PLACEHOLDER_COLOR:node.col;}
function drawLbls(ctx,n){
  if(!n.synthetic){
    ctx.fillStyle=labelColor(n);ctx.textBaseline='alphabetic';
    if(n.fs<=C.MAX_SAFE_FONT){
      ctx.font=`${n.fw} ${n.fs}px ${C.FONT}`;
      ctx.fillText(n.label,n.x,n.y+n.fs*C.BASELINE_FRAC);
    }else{
      const r=n.fs/C.MAX_SAFE_FONT;ctx.save();
      ctx.translate(n.x,n.y+n.fs*C.BASELINE_FRAC);ctx.scale(r,r);
      ctx.font=`${n.fw} ${C.MAX_SAFE_FONT}px ${C.FONT}`;ctx.fillText(n.label,0,0);ctx.restore();
    }
  }
  n.children.forEach(c=>drawLbls(ctx,c));
}

/* ══ TTF MINI-PARSER (simplified — no GPOS; HarfBuzz handles shaping) ══ */
function parseTTF(u8){
  try{
    const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
    const nT=dv.getUint16(4);
    const T={};
    for(let i=0;i<nT;i++){
      const b=12+i*16;
      T[String.fromCharCode(u8[b],u8[b+1],u8[b+2],u8[b+3])]={o:dv.getUint32(b+8)};
    }
    if(!T.head||!T.hhea||!T.maxp||!T.hmtx||!T.cmap)return null;
    const hd=T.head.o;
    const upm=dv.getUint16(hd+18);
    const bbox=[dv.getInt16(hd+36),dv.getInt16(hd+38),dv.getInt16(hd+40),dv.getInt16(hd+42)];
    const hh=T.hhea.o;
    const asc=dv.getInt16(hh+4),desc=dv.getInt16(hh+6);
    const nHM=dv.getUint16(hh+34);
    const nG=dv.getUint16(T.maxp.o+4);
    const hm=T.hmtx.o;
    const aw=new Uint16Array(nG);
    for(let i=0;i<nHM;i++)aw[i]=dv.getUint16(hm+i*4);
    const lastAW=aw[nHM-1]||0;
    for(let i=nHM;i<nG;i++)aw[i]=lastAW;
    const cm=T.cmap.o;
    const ns=dv.getUint16(cm+2);
    let f4=0;
    for(let i=0;i<ns&&!f4;i++){
      const pid=dv.getUint16(cm+4+i*8),eid=dv.getUint16(cm+6+i*8);
      const so=dv.getUint32(cm+8+i*8);
      if((pid===0&&eid<=3)||(pid===3&&eid===1))
        if(dv.getUint16(cm+so)===4)f4=cm+so;
    }
    if(!f4)return null;
    const segCt=dv.getUint16(f4+6)>>1;
    const eE=f4+14,eS=eE+segCt*2+2,eD=eS+segCt*2,eR=eD+segCt*2;
    const u2g=new Map();
    for(let i=0;i<segCt;i++){
      const s=dv.getUint16(eS+i*2),e=dv.getUint16(eE+i*2);
      const dl=dv.getInt16(eD+i*2),ro=dv.getUint16(eR+i*2);
      if(s===0xFFFF)break;
      for(let c=s;c<=e;c++){
        let g;
        if(ro===0){g=(c+dl)&0xFFFF;}
        else{g=dv.getUint16(eR+i*2+ro+(c-s)*2);if(g)g=(g+dl)&0xFFFF;}
        if(g)u2g.set(c,g);
      }
    }
    return{upm,bbox,asc,desc,nG,aw,u2g,data:u8};
  }catch(e){return null;}
}

/* ══ THAI HELPERS ══ */
const THAI_ABOVE_V=new Set([0x0E31,0x0E34,0x0E35,0x0E36,0x0E37,0x0E47,0x0E4D]);
const THAI_TONE=new Set([0x0E48,0x0E49,0x0E4A,0x0E4B]);
const isThaiDiacritic=cp=>THAI_ABOVE_V.has(cp)||THAI_TONE.has(cp)||(cp>=0x0E38&&cp<=0x0E3A);
const isThaiSpineCombining=cp=>isThaiDiacritic(cp)||cp===0x0E4C;
const THAI_LOWER_SET=new Set([0x0E38,0x0E39,0x0E3A,0x0E0D,0x0E0E,0x0E0F,0x0E10,0x0E24,0x0E26]);
function hasThaiLower(label){for(const ch of label){if(THAI_LOWER_SET.has(ch.codePointAt(0)))return true;}return false;}

function decomposeThaiSaraAm(text){
  const cps=[...text],out=[];
  for(let i=0;i<cps.length;i++){
    const cp=cps[i].codePointAt(0);
    if(cp===0x0E33){
      if(out.length>0&&THAI_TONE.has(out[out.length-1].codePointAt(0))){
        const tone=out.pop();out.push('\u0E4D',tone,'\u0E32');
      }else{out.push('\u0E4D','\u0E32');}
    }else if(cp===0x0E4D){
      if(out.length>0&&THAI_TONE.has(out[out.length-1].codePointAt(0))){
        const tone=out.pop();out.push('\u0E4D',tone);
      }else{out.push(cps[i]);}
    }else{out.push(cps[i]);}
  }
  return out.join('');
}

function thaiHeightTier(label){
  const norm=decomposeThaiSaraAm(label);
  let maxTier=0,base=0,hasAbove=false,hasTone=false;
  const AC_CONS=new Set([0x0E1B,0x0E1D,0x0E1F,0x0E2C]);
  const finalize=()=>{
    const t=(hasAbove&&hasTone)?3:(hasAbove||hasTone)?2:(AC_CONS.has(base)?1:0);
    if(t>maxTier)maxTier=t;
  };
  for(const ch of norm){
    const cp=ch.codePointAt(0);
    if(THAI_ABOVE_V.has(cp)||THAI_TONE.has(cp)){
      if(THAI_ABOVE_V.has(cp))hasAbove=true;
      if(THAI_TONE.has(cp))hasTone=true;
    }else{finalize();if(maxTier===3)return 3;base=cp;hasAbove=false;hasTone=false;}
  }
  finalize();return maxTier;
}

/* ══ PDF EXPORT ══ */
const SARABUN_REGULAR_URLS=[
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf',
];
const SARABUN_BOLD_URLS=[
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Bold.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Bold.ttf',
];

async function fetchTTF(urls){
  for(const url of urls){
    try{const r=await fetch(url);if(r.ok){const tf=parseTTF(new Uint8Array(await r.arrayBuffer()));if(tf)return tf;}}catch(e){}
  }
  return null;
}

// Creates a HarfBuzz v1 font object from a parsed TTF descriptor.
// v1 uses FinalizationRegistry for WASM memory — no .destroy() calls needed.
function makeHbFont(hb,tf){
  if(!tf)return null;
  const blob=new hb.Blob(tf.data);
  const face=new hb.Face(blob,0);
  const font=new hb.Font(face);
  return font;
}

async function exportPDF(){
  if(destroyed)return;
  flushRender();
  if(!st.lay||pdfBusy)return;
  pdfBusy=true;container.setAttribute('aria-busy','true');
  try{
    const [hb,tfR,tfB]=await Promise.all([
      import('https://unpkg.com/harfbuzzjs@1.4.0'),
      fetchTTF(SARABUN_REGULAR_URLS),
      fetchTTF(SARABUN_BOLD_URLS),
    ]);
    if(destroyed)return;
    if(!tfR||!tfB)reportError(new Error('PDF font download failed. Thai output may be incomplete; the original font fallback will be used.'));
    const hbFontR=makeHbFont(hb,tfR);
    const hbFontB=makeHbFont(hb,tfB);
    _buildAndDownloadPDF(hb,hbFontR,hbFontB,tfR,tfB);
  }catch(err){
    if(!destroyed)reportError(new Error('PDF export failed: '+(err.message||err)));
    throw err;
  }finally{
    pdfBusy=false;
    if(!destroyed)container.removeAttribute('aria-busy');
  }
}

/* ── PDF object store ── */
function createPdfStore(){
  let _oid=0;
  const nid=()=>++_oid;
  const objArr=[];
  function set(id,content){objArr[id-1]=`${id} 0 obj\n${content}\nendobj\n`;}
  function totalObjs(){return _oid;}
  function assembleBody(baseOffset=0){
    const offs=[],parts=[];let pos=baseOffset;
    for(const o of objArr){offs.push(pos);parts.push(o);pos+=o.length;}
    return{body:parts.join(''),offs,xrefPos:pos};
  }
  return{nid,set,totalObjs,assembleBody};
}

/* ── TTF font embedding ── */
function embedTTFFont(setObj,tf,t0Id,cidId,dscId,fid,ucId,bname){
  if(!tf)return;
  const H='0123456789abcdef';
  let hex='';for(let i=0;i<tf.data.length;i++){const b=tf.data[i];hex+=H[b>>4]+H[b&0xF];}
  const hexLen=hex.length+1;
  const g2u=new Map();
  for(const[cp,g]of tf.u2g)if(!g2u.has(g))g2u.set(g,cp);
  const _fw2=bname.includes('Bold')?'bold':'normal';
  _cx.font=`${_fw2} 1000px ${C.FONT}`;
  const wVals=Array.from({length:tf.nG},(_,i)=>{const cp=g2u.get(i);return cp&&cp>31?Math.round(_cx.measureText(String.fromCodePoint(cp)).width):Math.round((tf.aw[i]||0)*1000/tf.upm);});
  // Thai combining marks must carry zero PDF advance: their horizontal
  // placement is fully controlled by the TJ kern pairs in renderLabel.
  for(const cp of[...THAI_ABOVE_V,...THAI_TONE]){const gid=tf.u2g.get(cp);if(gid!=null)wVals[gid]=0;}
  const wArr=`0 [${wVals.join(' ')}]`;
  const bfe=[];
  for(const[g,cp]of g2u)bfe.push(`<${g.toString(16).padStart(4,'0')}> <${cp.toString(16).padStart(4,'0')}>`);
  let tuc=`/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n`+
    `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> def\n`+
    `/CMapName /Identity-H def\n/CMapType 1 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n`;
  for(let i=0;i<bfe.length;i+=100){const blk=bfe.slice(i,i+100);tuc+=`${blk.length} beginbfchar\n${blk.join('\n')}\nendbfchar\n`;}
  tuc+=`endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`;
  const sc=tf.bbox.map(v=>Math.round(v*1000/tf.upm));
  const pA=Math.round(tf.asc*1000/tf.upm),pD=Math.round(tf.desc*1000/tf.upm);
  const dw=Math.round((tf.aw[0]||500)*1000/tf.upm);
  setObj(t0Id,`<< /Type /Font /Subtype /Type0 /BaseFont /${bname} /Encoding /Identity-H /DescendantFonts [${cidId} 0 R] /ToUnicode ${ucId} 0 R >>`);
  setObj(cidId,`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${bname} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${dscId} 0 R /DW ${dw} /W [${wArr}] >>`);
  setObj(dscId,`<< /Type /FontDescriptor /FontName /${bname} /Flags 4 /FontBBox [${sc.join(' ')}] /ItalicAngle 0 /Ascent ${pA} /Descent ${pD} /CapHeight ${Math.round(pA*0.72)} /StemV 80 /FontFile2 ${fid} 0 R >>`);
  setObj(fid,`<< /Length ${hexLen} /Filter /ASCIIHexDecode /Length1 ${tf.data.length} >>\nstream\n${hex}>\nendstream`);
  setObj(ucId,`<< /Length ${tuc.length} >>\nstream\n${tuc}\nendstream`);
}

function resolvePdfFont(tfR,tfB,isB){
  if(isB){if(tfB)return{tf:tfB,slot:'F4'};if(tfR)return{tf:tfR,slot:'F3'};return{tf:null,slot:'F2'};}
  if(tfR)return{tf:tfR,slot:'F3'};if(tfB)return{tf:tfB,slot:'F4'};return{tf:null,slot:'F1'};
}

function _buildAndDownloadPDF(hb,hbFontR,hbFontB,tfR,tfB){
  const{root}=st.lay;
  const PDF_SCALE=0.25;
  const cb=contentBounds(st.lay);
  const PAD=Math.round(Math.max(cb.w,cb.h)*TREE_PAD_FRAC);
  const pgW=+((cb.w+PAD*2)*PDF_SCALE).toFixed(3);
  const pgH=+((cb.h+PAD*2)*PDF_SCALE).toFixed(3);
  const ox=cb.x-PAD,oy=cb.y-PAD;
  const px=v=>+((v-ox)*PDF_SCALE).toFixed(3);
  const py=v=>+(pgH-(v-oy)*PDF_SCALE).toFixed(3);
  const pdfFS=fs=>(fs*PDF_SCALE).toFixed(2);
  const pdfRgb=col=>{
    const m=col.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return m?[+m[1]/255,+m[2]/255,+m[3]/255].map(v=>v.toFixed(4)).join(' '):'0 0 0';
  };
  const pdfLit=s=>{
    let r='';
    for(let i=0;i<s.length;i++){
      const c=s.charCodeAt(i);
      if(c===92)r+='\\\\';else if(c===40)r+='\\(';else if(c===41)r+='\\)';
      else if(c>=32&&c<=126)r+=s[i];else if(c>=128&&c<=255)r+='\\'+c.toString(8).padStart(3,'0');
      else r+='?';
    }
    return r;
  };

  const store=createPdfStore();
  const{nid,set:setObj}=store;
  const catId=nid(),pagesId=nid(),pageId=nid(),stmId=nid(),f1Id=nid(),f2Id=nid();
  let f3Id,f3CId,f3DId,f3FId,f3UId;
  if(tfR){f3Id=nid();f3CId=nid();f3DId=nid();f3FId=nid();f3UId=nid();}
  let f4Id,f4CId,f4DId,f4FId,f4UId;
  if(tfB){f4Id=nid();f4CId=nid();f4DId=nid();f4FId=nid();f4UId=nid();}
  const fontRes=`/F1 ${f1Id} 0 R /F2 ${f2Id} 0 R`+(tfR?` /F3 ${f3Id} 0 R`:'')+(tfB?` /F4 ${f4Id} 0 R`:'');

  const renderLabel=(x,y,label,isB,fs,col)=>{
    const{tf,slot:fontSlot}=resolvePdfFont(tfR,tfB,isB);
    const hbFont=isB?hbFontB:hbFontR;
    const lines=['BT',`${pdfRgb(col)} rg`,`${x} ${y} Td`,`/${fontSlot} ${pdfFS(fs)} Tf`];

    // Fallback: no Sarabun or HarfBuzz — ASCII/Latin only.
    if(!tf||!hbFont){lines.push(`(${pdfLit(label)}) Tj`,'ET');return lines.join('\n');}

    const scale=(fs*PDF_SCALE)/tf.upm;

    // Shape with HarfBuzz. Do NOT pre-decompose sara-am (U+0E33):
    // HarfBuzz handles it via GSUB rules internally.
    // Phase 2A: repair Latin-first Thai sara-am/nikhahit labels with runs.
    // Keep Thai-first/non-Thai labels on the original whole-buffer path.
    const firstScript=label.match(/[^\p{Script=Common}\p{Script=Inherited}]/u);
    const runs=[];
    if(firstScript&&/\p{Script=Latin}/u.test(firstScript[0])&&/[\u0E33\u0E4D]/.test(label)){
      let start=0;
      for(const match of label.matchAll(/\p{Script=Thai}+/gu)){
        if(match.index>start)runs.push({start,length:match.index-start,thai:false});
        runs.push({start:match.index,length:match[0].length,thai:true});
        start=match.index+match[0].length;
      }
      if(start<label.length)runs.push({start,length:label.length-start,thai:false});
    }
    const glyphs=[];
    for(const run of runs.length?runs:[null]){
      const buf=new hb.Buffer();
      // Pinned addText uses UTF-16 offsets and retains full-label context;
      // returned clusters are label-relative, including surrogate pairs.
      if(run)buf.addText(label,run.start,run.length);
      else buf.addText(label);
      if(run&&run.thai)buf.setScript('Thai');
      buf.guessSegmentProperties();
      hb.shape(hbFont,buf);          // full GSUB + GPOS pass
      for(const g of buf.getGlyphInfosAndPositions())glyphs.push(g);
    }
    // codepoint = glyph index (post-GSUB), NOT a Unicode codepoint.
    // xAdvance=0 for combining marks; yOffset = GPOS vertical displacement.

    let hbCursor=0,pdfCursor=0,curTs=0;

    for(const g of glyphs){
      const gid=g.codepoint;
      const{xAdvance,xOffset,yOffset}=g;
      const hex=gid.toString(16).padStart(4,'0');

      // Vertical: yOffset is positive-upward in design units; PDF Ts is also positive-upward.
      const newTs=yOffset*scale;
      if(Math.abs(newTs-curTs)>0.001){lines.push(`${newTs.toFixed(3)} Ts`);curTs=newTs;}

      // Horizontal: bridge hbCursor+xOffset → pdfCursor via TJ kern.
      // PDF TJ: negative number = advance forward (right).
      const drawX=hbCursor+xOffset;
      const kernTJ=Math.round(-(drawX-pdfCursor)*1000/tf.upm);

      if(xAdvance===0){
        // Combining mark: /W=0 so PDF engine won't auto-advance.
        // Round-trip kern: advance to drawX, draw, return to pdfCursor.
        if(Math.abs(kernTJ)>0.5)lines.push(`[${kernTJ} <${hex}> ${-kernTJ}] TJ`);
        else lines.push(`<${hex}> Tj`);
        // pdfCursor unchanged — mark has zero advance.
      }else{
        // Base character: /W ≈ xAdvance; PDF auto-advances after draw.
        if(Math.abs(kernTJ)>0.5)lines.push(`[${kernTJ} <${hex}>] TJ`);
        else lines.push(`<${hex}> Tj`);
        pdfCursor=hbCursor+xAdvance;
      }
      hbCursor+=xAdvance;
    }

    if(curTs!==0)lines.push('0 Ts');
    lines.push('ET');
    return lines.join('\n');
  };

  const ops=[];
  ops.push('q 1 J 1 j');
  for(const s of getConnSegments(st.lay)){
    ops.push(`${pdfRgb(s.col)} RG ${(s.lw*PDF_SCALE).toFixed(3)} w ${px(s.x1)} ${py(s.y1)} m ${px(s.x2)} ${py(s.y2)} l S`);
  }
  ops.push('Q');

  const pdfStrW=(label,isB,fs)=>{
    const tf=(isB&&tfB)?tfB:(tfR||tfB);
    if(!tf)return mW(label,fs,isB?'bold':'normal')*PDF_SCALE;
    _cx.font=`${isB?'bold':'normal'} 1000px ${C.FONT}`;
    let w=0;
    for(const ch of label){
      const cp=ch.codePointAt(0);
      if(cp>31)w+=Math.round(_cx.measureText(String.fromCodePoint(cp)).width);
      else{const gid=tf.u2g.get(cp)||0;w+=Math.round((tf.aw[gid]||0)*1000/tf.upm);}
    }
    return w*fs*PDF_SCALE/1000;
  };
  const dtNode=n=>{
    if(!n.synthetic){
      const isB=n.fw==='bold';
      const tx=n.depth===0&&n.cx!=null?px(n.cx)-pdfStrW(n.label,isB,n.fs)/2:px(n.x);
      ops.push(renderLabel(tx,py(n.y+n.fs*C.BASELINE_FRAC),n.label,isB,n.fs,labelColor(n)));
    }
    n.children.forEach(dtNode);
  };
  dtNode(root);

  const stream=ops.join('\n');
  setObj(catId,`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  setObj(pagesId,`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  setObj(pageId,`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pgW} ${pgH}] /Contents ${stmId} 0 R /Resources << /Font << ${fontRes} >> >> >>`);
  setObj(stmId,`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  setObj(f1Id,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  setObj(f2Id,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
  if(tfR)embedTTFFont(setObj,tfR,f3Id,f3CId,f3DId,f3FId,f3UId,'Sarabun-Regular');
  if(tfB)embedTTFFont(setObj,tfB,f4Id,f4CId,f4DId,f4FId,f4UId,'Sarabun-Bold');

  const hdr='%PDF-1.4\n';
  const{body,offs,xrefPos}=store.assembleBody(hdr.length);
  const totalObjs=store.totalObjs();
  let xref=`xref\n0 ${totalObjs+1}\n0000000000 65535 f \n`;
  for(const off of offs)xref+=`${String(off).padStart(10,'0')} 00000 n \n`;
  const trailer=`trailer\n<< /Size ${totalObjs+1} /Root ${catId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  const pdfStr=hdr+body+xref+trailer;
  const bytes=Uint8Array.from({length:pdfStr.length},(_,i)=>pdfStr.charCodeAt(i)&0xFF);
  const blob=new Blob([bytes],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=safeFileName(root.synthetic?root.children[0]?.label||'MindMap':root.label)+' Mind-Map.pdf';
  objectURLs.add(url);container.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url);objectURLs.delete(url);},1500);
}

const st={lay:null,scale:1,panX:0,panY:0};
const gesture={drag:null,t1d:null,touchMoved:false,startX:0,startY:0,lastTapTime:0,lastTapX:0,lastTapY:0};
const kbLift={h:0,targetH:0,animId:null,btnH:0,btnTarget:0,btnAnimId:null};
const uiState={userTouchedCanvas:false,colorSeed:0};
let chromeOcclusion=null;
function updateChromeEligibility(){
  if(!chromeOcclusion||destroyed)return;
  const base=container.getBoundingClientRect(),o=chromeOcclusion;
  for(const node of [hudEl,btnRst]){
    const r=node.getBoundingClientRect();
    const full=r.width>0&&r.height>0&&r.left>=base.left+o.left-.01&&r.right<=base.right-o.right+.01&&r.top>=base.top+o.top-.01&&r.bottom<=base.bottom-o.bottom+.01;
    const hidden=r.right<=base.left+o.left||o.left>=base.width||o.top+o.bottom>=base.height;
    node.inert=!full;node.style.pointerEvents=full&&node===btnRst?'':'none';node.style.visibility=hidden?'hidden':'';
    if(!full&&node.contains(document.activeElement))document.activeElement.blur();
  }
}
function setChromeOcclusion(value){
  if(!value||!['left','top','right','bottom'].every(k=>Number.isFinite(value[k])&&value[k]>=0))throw new TypeError('Chrome occlusion must use finite nonnegative insets');
  if(destroyed)return;
  if(!chromeOcclusion){cancelAnimationFrame(kbLift.btnAnimId);kbLift.btnAnimId=null;btnRst.style.bottom='';container.classList.add('chrome-managed');}
  chromeOcclusion={left:value.left,top:value.top,right:value.right,bottom:value.bottom};
  updateChromeEligibility();
}
let viewportInsets={left:0,top:0,right:0,bottom:0},viewportManaged=false,paused=false;
let pendingRender=false,pendingResize=false,holdDrawing=false,pendingColor=false;
let committedRect=null,interruptedFit=false;
// R12-3: one latest live rectangle; bounds belong to a layout/font identity.
let liveFrame=null,liveInsets=null,liveViewport=false,fitBounds=new WeakMap();
function cancelLiveViewport(){cancelAnimationFrame(liveFrame);liveFrame=null;liveInsets=null;}
function queueLiveViewport(value){
  liveInsets={left:value.left,top:value.top,right:value.right,bottom:value.bottom};
  if(liveFrame!==null)return;
  liveFrame=requestAnimationFrame(()=>{
    const latest=liveInsets;liveFrame=null;liveInsets=null;
    applyViewportInsets(latest,{duration:0});
  });
}
function viewportRect(kbH=kbLift.h){
  const W=container.clientWidth,H=container.clientHeight;
  const left=Math.min(W,viewportInsets.left),top=Math.min(H,viewportInsets.top);
  return {left,top,width:Math.max(0,W-left-viewportInsets.right),height:Math.max(0,H-top-Math.max(viewportInsets.bottom,kbH))};
}
function setViewportInsets(value,{duration=0,live=false}={}){
  if(!value || !['left','top','right','bottom'].every(k=>Number.isFinite(value[k])&&value[k]>=0) || !Number.isFinite(duration)||duration<0)throw new TypeError('Viewport insets and duration must be finite and nonnegative');
  if(destroyed)return;
  liveViewport=live===true;
  if(liveViewport){
    const W=container.clientWidth,H=container.clientHeight;
    if(W-Math.min(W,value.left)-value.right>0&&H-Math.min(H,value.top)-Math.max(value.bottom,kbLift.h)>0){
      if(!uiState.userTouchedCanvas){cancelAnimationFrame(_raf);_raf=null;cancelAnimationFrame(kbLift.animId);kbLift.animId=null;}
      queueLiveViewport(value);return;
    }
  }
  cancelLiveViewport();
  applyViewportInsets(value,{duration});
}
function applyViewportInsets(value,{duration=0}={}){
  viewportManaged=true;viewportInsets={left:value.left,top:value.top,right:value.right,bottom:value.bottom};
  const rect=viewportRect(),signature=JSON.stringify([container.clientWidth,container.clientHeight,rect]);
  const changed=signature!==committedRect;committedRect=signature;
  const covered=rect.width<=0||rect.height<=0;
  container.classList.toggle('map-covered',covered);btnRst.inert=covered;hudEl.inert=covered;
  updateChromeEligibility();
  if(covered){
    paused=true;pendingRender=pendingRender||rtimer!==null;
    clearTimeout(rtimer);rtimer=null;cancelAnimationFrame(_raf);_raf=null;
    cancelAnimationFrame(resizeFrame);resizeFrame=null;
    cancelAnimationFrame(kbLift.animId);kbLift.animId=null;cancelAnimationFrame(kbLift.btnAnimId);kbLift.btnAnimId=null;
    return;
  }
  paused=false;
  if(duration===0&&(!liveViewport||!uiState.userTouchedCanvas)){interruptedFit=interruptedFit||(!changed&&!uiState.userTouchedCanvas&&_raf!==null);cancelAnimationFrame(_raf);_raf=null;}
  const needsRender=pendingRender||rtimer!==null;
  holdDrawing=true;
  const resized=resizeCanvas();
  if(needsRender)flushRender();
  const recolored=pendingColor;applyPendingColor();
  holdDrawing=false;
  if(!uiState.userTouchedCanvas&&st.lay&&(changed||needsRender||resized||duration>0&&interruptedFit)){
    interruptedFit=false;
    if(duration>0)animateFit(duration);else{autoFit();redraw();}
  }else if(needsRender||resized||recolored)redraw();
}
function resizeCanvas(){
  const dpr=devicePixelRatio||1,w=container.clientWidth,h=container.clientHeight;
  if(paused){pendingResize=true;return false;}
  if(canvas.width===w*dpr&&canvas.height===h*dpr){pendingResize=false;return false;}
  pendingResize=false;
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  canvas.width=w*dpr;canvas.height=h*dpr;
  updateEmptyHint();
  if(_isTouch)_kbUpdate();
  if(!holdDrawing&&w>0&&h>0&&!uiState.userTouchedCanvas&&st.lay)autoFit();
  if(!holdDrawing)redraw();
  return true;
}
function updateEmptyHint(){
  const r=viewportRect();emptyEl.style.left=r.left+'px';emptyEl.style.top=r.top+'px';
  emptyEl.style.width=r.width+'px';emptyEl.style.height=r.height+'px';
}
function fitTarget(kbH,effectivePanelW){
  if(kbH===undefined)kbH=kbLift.h;
  const r=viewportRect(kbH),panW=r.left,aW=r.width,aH=r.height;
  let cb=fitBounds.get(st.lay);
  if(!cb){cb=contentBounds(st.lay);fitBounds.set(st.lay,cb);}
  const pad=Math.max(cb.w,cb.h)*TREE_PAD_FRAC;
  const scale=Math.min(aW/(cb.w+pad*2),aH/(cb.h+pad*2));
  const cW=cb.w*scale,cH=cb.h*scale;
  return{scale,panX:panW+(aW-cW)/2-cb.x*scale,panY:r.top+(aH-cH)/2-cb.y*scale};
}
function autoFit(){if(paused||!st.lay)return;const t=fitTarget();st.scale=t.scale;st.panX=t.panX;st.panY=t.panY;}
function preserveViewportAcrossLayoutChange(prevLay,newLay){
  const aOld=contentBounds(prevLay),aNew=contentBounds(newLay);
  const k=Math.pow(C.RATIO,newLay.MD-prevLay.MD);
  const sOld=st.scale,sNew=sOld/k;
  st.panX+=sOld*aOld.x-sNew*aNew.x;st.panY+=sOld*aOld.y-sNew*aNew.y;st.scale=sNew;
}
let _raf=null;
const easeOut3=p=>1-Math.pow(1-p,3);
function animateFit(dur=C.ANIM_FIT){
  if(paused||!st.lay)return;
  cancelAnimationFrame(_raf);cancelAnimationFrame(kbLift.animId);kbLift.animId=null;
  const t=fitTarget(kbLift.h),s0=st.scale,x0=st.panX,y0=st.panY,t0=performance.now();
  function step(now){
    const p=Math.min(1,(now-t0)/dur),e=easeOut3(p);
    st.scale=s0+(t.scale-s0)*e;st.panX=x0+(t.panX-x0)*e;st.panY=y0+(t.panY-y0)*e;
    redraw();if(p<1)_raf=requestAnimationFrame(step);else _raf=null;
  }
  _raf=requestAnimationFrame(step);
}

function draw(){
  if(paused||holdDrawing)return;
  const dpr=devicePixelRatio||1;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=C.BG;ctx.fillRect(0,0,canvas.width,canvas.height);
  if(!st.lay){
    const W=canvas.width,H=canvas.height,sp=35*dpr,r=1.5*dpr;
    ctx.fillStyle='rgba(0,0,0,0.065)';
    for(let x=sp/2;x<W;x+=sp)for(let y=sp/2;y<H;y+=sp){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    hudEl.textContent='100%';return;
  }
  ctx.save();
  ctx.setTransform(st.scale*dpr,0,0,st.scale*dpr,st.panX*dpr,st.panY*dpr);
  drawConn(ctx,st.lay);drawLbls(ctx,st.lay.root);
  ctx.restore();
  const pct=st.scale*100;
  hudEl.textContent=(pct>=1?Math.round(pct):pct.toFixed(pct>=0.1?1:2))+'%';
}
function redraw(){draw();}

/* ══ ZOOM & PAN ══ */
function markTouched(){const latest=liveInsets;cancelLiveViewport();uiState.userTouchedCanvas=true;if(latest)applyViewportInsets(latest,{duration:0});cancelAnimationFrame(_raf);_raf=null;cancelAnimationFrame(kbLift.animId);kbLift.animId=null;}
function zoomAt(cx,cy){
  const f=2.5,ns=st.scale*f;
  const tx=cx-(cx-st.panX)*(ns/st.scale),ty=cy-(cy-st.panY)*(ns/st.scale);
  const s0=st.scale,x0=st.panX,y0=st.panY,t0=performance.now();
  cancelAnimationFrame(_raf);
  function step(now){
    const p=Math.min(1,(now-t0)/C.ANIM_ZOOM),e=easeOut3(p);
    st.scale=s0+(ns-s0)*e;st.panX=x0+(tx-x0)*e;st.panY=y0+(ty-y0)*e;
    redraw();if(p<1)_raf=requestAnimationFrame(step);
  }
  markTouched();_raf=requestAnimationFrame(step);
}
listen(canvas,'wheel',e=>{
  e.preventDefault();markTouched();
  const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  const ns=st.scale*(e.deltaY<0?1.1:0.9);
  st.panX=mx-(mx-st.panX)*(ns/st.scale);st.panY=my-(my-st.panY)*(ns/st.scale);
  st.scale=ns;redraw();
},{passive:false});
listen(canvas,'mousedown',e=>{
  gesture.drag={sx:e.clientX-st.panX,sy:e.clientY-st.panY,moved:false};canvas.style.cursor='grabbing';
});
listen(window,'mousemove',e=>{
  if(!gesture.drag)return;
  const nx=e.clientX-gesture.drag.sx,ny=e.clientY-gesture.drag.sy;
  if(!gesture.drag.moved&&(Math.abs(nx-st.panX)>1||Math.abs(ny-st.panY)>1)){gesture.drag.moved=true;markTouched();}
  st.panX=nx;st.panY=ny;redraw();
});
listen(window,'mouseup',()=>{if(!gesture.drag)return;gesture.drag=null;canvas.style.cursor='grab';});
listen(canvas,'dblclick',e=>{
  gesture.drag=null;const r=canvas.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top);
});
function td(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);}
function tm(t){const r=canvas.getBoundingClientRect();return{x:(t[0].clientX+t[1].clientX)/2-r.left,y:(t[0].clientY+t[1].clientY)/2-r.top};}
listen(canvas,'touchstart',e=>{
  e.preventDefault();
  if(e.touches.length===1){
    gesture.drag={sx:e.touches[0].clientX-st.panX,sy:e.touches[0].clientY-st.panY};
    gesture.startX=e.touches[0].clientX;gesture.startY=e.touches[0].clientY;
    gesture.touchMoved=false;gesture.t1d=null;
  }else if(e.touches.length===2){gesture.drag=null;gesture.touchMoved=true;gesture.t1d=td(e.touches);}
},{passive:false});
listen(canvas,'touchmove',e=>{
  e.preventDefault();
  if(e.touches.length===1&&gesture.drag){
    const dx=e.touches[0].clientX-gesture.startX,dy=e.touches[0].clientY-gesture.startY;
    if(!gesture.touchMoved&&Math.hypot(dx,dy)>3){gesture.touchMoved=true;markTouched();}
    st.panX=e.touches[0].clientX-gesture.drag.sx;st.panY=e.touches[0].clientY-gesture.drag.sy;
  }else if(e.touches.length===2&&gesture.t1d!==null){
    const nd=td(e.touches),m=tm(e.touches),ns=st.scale*nd/gesture.t1d;
    if(!uiState.userTouchedCanvas&&Math.abs(ns/st.scale-1)>0.001)markTouched();
    st.panX=m.x-(m.x-st.panX)*(ns/st.scale);st.panY=m.y-(m.y-st.panY)*(ns/st.scale);
    st.scale=ns;gesture.t1d=nd;
  }
  redraw();
},{passive:false});
listen(canvas,'touchend',e=>{
  if(e.changedTouches.length===1&&!gesture.touchMoved){
    const now=performance.now();
    const tx=e.changedTouches[0].clientX,ty=e.changedTouches[0].clientY;
    if(now-gesture.lastTapTime<300&&Math.hypot(tx-gesture.lastTapX,ty-gesture.lastTapY)<40){
      const r=canvas.getBoundingClientRect();zoomAt(tx-r.left,ty-r.top);gesture.lastTapTime=0;
    }else{gesture.lastTapTime=now;gesture.lastTapX=tx;gesture.lastTapY=ty;}
  }
  gesture.drag=null;gesture.t1d=null;gesture.touchMoved=false;
});
/* ══ STRING INPUT / SETTINGS ══ */
function schedRender(){pendingRender=true;clearTimeout(rtimer);if(paused){rtimer=null;return;}rtimer=setTimeout(()=>{rtimer=null;render();},C.RENDER_DEBOUNCE);}
function flushRender(){clearTimeout(rtimer);rtimer=null;render();}
function render(){
  if(liveFrame!==null&&!holdDrawing){pendingRender=true;return;}
  if(paused){pendingRender=true;return;}
  pendingRender=false;
  const text=sourceText;
  const isBlank=!text.trim();
  if(isBlank){
    if(d1Max!==1){d1Max=1;if(hlimitN>1)hlimitN=1;}
    cancelAnimationFrame(_raf);cancelAnimationFrame(kbLift.animId);
    st.lay=null;pendingColor=false;uiState.userTouchedCanvas=false;emptyEl.style.display='flex';draw();return;
  }
  const root=parse(text);if(!root)return;
  flagPlaceholders(root,sourcePlaceholders);
  const nd=root.children.length||1;
  if(nd!==d1Max){
    const prevCap=hlimitCap(d1Max);d1Max=nd;
    const newCap=hlimitCap(d1Max);
    if(hlimitInf&&hlimitN===prevCap)hlimitN=newCap;
    if(hlimitN>newCap)hlimitN=newCap;
  }
  const prevLay=st.lay;
  st.lay=layout(root,uiState.colorSeed);pendingColor=false;emptyEl.style.display='none';
  if(uiState.userTouchedCanvas&&prevLay&&st.lay.MD!==prevLay.MD)preserveViewportAcrossLayoutChange(prevLay,st.lay);
  if(!holdDrawing&&canvas.clientWidth>0&&canvas.clientHeight>0&&!uiState.userTouchedCanvas)autoFit();
  draw();
}
function setText(text,options={}){
  if(destroyed)return;
  const indexes=options&&options.placeholderNodes;
  const placeholders=Array.isArray(indexes)?[...new Set(indexes.filter(i=>Number.isInteger(i)&&i>=0))].sort((a,b)=>a-b):[];
  text=String(text??'');if(text===sourceText&&placeholders.join(',')===sourcePlaceholders.join(','))return;
  sourceText=text;sourcePlaceholders=placeholders;schedRender();
}
function getSettingBounds(){return{horizontalLimit:{min:1,max:hlimitCap(d1Max)}};}
function getSettings(){return{horizontalLimit:{enabled:!hlimitInf,count:hlimitN},colorSeed:uiState.colorSeed};}
function setSettings(partial={}){
  if(destroyed)return getSettings();
  if(!paused&&rtimer!==null)flushRender();
  const limit=partial.horizontalLimit;
  if(limit&&typeof limit==='object'){
    if('enabled' in limit)hlimitInf=!limit.enabled;
    if(!hlimitInf){const n='count' in limit?Number(limit.count):hlimitN;hlimitN=Math.max(1,Math.min(hlimitCap(d1Max),Math.round(isNaN(n)?1:n)));}
  }
  if('colorSeed' in partial){const v=String(partial.colorSeed).trim();if(v!=='')uiState.colorSeed=Math.max(0,parseInt(v,10)||0);}
  flushRender();
  if(!paused&&!uiState.userTouchedCanvas&&st.lay&&canvas.clientWidth>0&&canvas.clientHeight>0)animateFit(300);
  return getSettings();
}
// R12-4B: recolor the retained layout without touching source, geometry or animation.
function applyPendingColor(){
  if(!pendingColor||paused||destroyed)return;
  if(st.lay)assignColors(st.lay.root,220,0,0,uiState.colorSeed);
  pendingColor=false;
}
function setColorSeed(seed){
  if(!Number.isFinite(seed)||!Number.isInteger(seed)||seed<0)throw new TypeError('Color seed must be a finite nonnegative integer');
  if(destroyed)return uiState.colorSeed;
  uiState.colorSeed=seed;pendingColor=true;
  if(!paused){applyPendingColor();draw();}
  return seed;
}
function fit(){if(destroyed)return;if(liveInsets){const latest=liveInsets;cancelLiveViewport();applyViewportInsets(latest,{duration:0});}flushRender();if(st.lay&&canvas.clientWidth>0&&canvas.clientHeight>0)animateFit();}
function resetView(){
  if(destroyed)return;if(liveInsets){const latest=liveInsets;cancelLiveViewport();applyViewportInsets(latest,{duration:0});}flushRender();if(!st.lay)return;
  uiState.userTouchedCanvas=false;
  if(canvas.clientWidth>0&&canvas.clientHeight>0)animateFit(C.ANIM_RST);
}
const _isTouch='ontouchstart' in window||navigator.maxTouchPoints>0;
function _kbVisH(){return window.visualViewport?Math.min(window.innerHeight,window.visualViewport.height):window.innerHeight;}
function _kbSetPos(kbH){if(emptyEl)emptyEl.style.transform=kbH>40?`translateY(${(-(kbH/2)).toFixed(1)}px)`:''; }
function _kbBezier(p){
  const x1=0.38,y1=0.70,x2=0.125,y2=1.00;let t=p;
  for(let i=0;i<8;i++){const bx=3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t;const dbx=3*(1-t)*(1-t)*x1+6*(1-t)*t*(x2-x1)+3*t*t*(1-x2);if(Math.abs(dbx)<1e-6)break;t-=(bx-p)/dbx;}
  return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t;
}
function _kbAnimateTo(targetH){
  if(paused||holdDrawing)return;
  if(Math.abs(targetH-kbLift.targetH)<2)return;kbLift.targetH=targetH;
  cancelAnimationFrame(kbLift.animId);cancelAnimationFrame(_raf);_raf=null;
  const fromH=kbLift.h,dur=C.ANIM_KB,t0=performance.now();
  let fmS,fmX,fmY,toS,toX,toY,doFit=false;
  if(st.lay&&!uiState.userTouchedCanvas){doFit=true;fmS=st.scale;fmX=st.panX;fmY=st.panY;const ft=fitTarget(targetH);toS=ft.scale;toX=ft.panX;toY=ft.panY;}
  function step(now){
    const p=Math.min(1,(now-t0)/dur),e=easeOut3(p);
    kbLift.h=fromH+(targetH-fromH)*e;_kbSetPos(kbLift.h);
    if(doFit){st.scale=fmS+(toS-fmS)*e;st.panX=fmX+(toX-fmX)*e;st.panY=fmY+(toY-fmY)*e;}
    redraw();
    if(p<1){kbLift.animId=requestAnimationFrame(step);}else{kbLift.h=targetH;_kbSetPos(targetH);kbLift.animId=null;}
  }
  kbLift.animId=requestAnimationFrame(step);
}
function _kbAnimateBtn(targetH){
  if(paused||chromeOcclusion)return; // Managed shell counts keyboard intersection once.
  if(Math.abs(targetH-kbLift.btnTarget)<2)return;kbLift.btnTarget=targetH;
  cancelAnimationFrame(kbLift.btnAnimId);
  const fromH=kbLift.btnH,dur=C.ANIM_KB_BTN,t0=performance.now();
  function step(now){
    const p=Math.min(1,(now-t0)/dur),e=_kbBezier(p);
    kbLift.btnH=fromH+(targetH-fromH)*e;
    if(btnRst)btnRst.style.bottom=(14+Math.round(kbLift.btnH))+'px';
    if(p<1){kbLift.btnAnimId=requestAnimationFrame(step);}else{kbLift.btnH=targetH;if(btnRst)btnRst.style.bottom=(14+Math.round(targetH))+'px';kbLift.btnAnimId=null;}
  }
  kbLift.btnAnimId=requestAnimationFrame(step);
}
function _kbUpdate(){
  if(paused)return;
  const r=container.getBoundingClientRect();
  const visibleBottom=window.visualViewport?window.visualViewport.offsetTop+_kbVisH():window.innerHeight;
  const target=Math.max(0,Math.min(r.height,r.bottom-visibleBottom));
  _kbAnimateTo(target);_kbAnimateBtn(target);
}
if(_isTouch){
  if(window.visualViewport){listen(window.visualViewport,'resize',_kbUpdate);listen(window.visualViewport,'scroll',_kbUpdate);}
  listen(window,'resize',_kbUpdate);
}
(()=>{
  const T=C.BTN_DRAG_THRESH;let _b=null,_sx=0,_sy=0,_dr=false;
  const end=()=>{if(_b)_b.classList.remove('pressing');_b=null;};
  listen(btnRst,'mousedown',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;_b=b;_sx=e.clientX;_sy=e.clientY;_dr=false;b.classList.add('pressing');},{capture:true});
  listen(window,'mousemove',e=>{if(_b&&Math.hypot(e.clientX-_sx,e.clientY-_sy)>T){_dr=true;_b.classList.remove('pressing');}});
  listen(btnRst,'mouseout',e=>{if(_b&&e.target===_b){_dr=true;_b.classList.remove('pressing');}});
  listen(window,'mouseup',end,{capture:true});
  listen(btnRst,'click',e=>{if(!_dr)return;const b=e.target.closest('button');if(b){e.stopImmediatePropagation();e.preventDefault();_dr=false;}},{capture:true});
  listen(btnRst,'touchstart',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;_b=b;_sx=e.touches[0].clientX;_sy=e.touches[0].clientY;_dr=false;b.classList.add('pressing');},{capture:true,passive:true});
  listen(window,'touchend',e=>{if(!_b)return;const b=_b,t=e.changedTouches[0];end();if(b&&Math.hypot(t.clientX-_sx,t.clientY-_sy)>T)_dr=true;},{capture:true});
})();
listen(btnRst,'click',()=>{resetView();setTimeout(()=>btnRst.blur(),0);});
let resizeFrame=null;
const observer=new ResizeObserver(guarded(()=>{if(paused){pendingResize=true;return;}cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;if(viewportManaged){setViewportInsets(liveInsets||viewportInsets,{duration:200,live:liveViewport});return;}resizeCanvas();});}));
observer.observe(container);
let fontGeneration=0;
function loadFonts(){
  const generation=++fontGeneration;
  if(!document.fonts)return;
  Promise.all([document.fonts.load("400 16px Sarabun",'H\u0e01'),document.fonts.load("700 16px Sarabun",'H\u0e01')]).then(guarded(faces=>{
    if(generation!==fontGeneration)return;
    if(faces.some(list=>!list.length))reportError(new Error('Sarabun font faces are unavailable. Canvas uses the original fallback font.'));
    if(!uiState.userTouchedCanvas)cancelAnimationFrame(_raf);
    fitBounds=new WeakMap();_capFracCache.clear();render();
  })).catch(error=>{if(!destroyed)reportError(new Error('Sarabun font download failed: '+error.message));});
}
listen(document.fonts,'loadingdone',()=>{
  if(!uiState.userTouchedCanvas)cancelAnimationFrame(_raf);
  fitBounds=new WeakMap();_capFracCache.clear();render();
});
function destroy(){
  if(destroyed)return;destroyed=true;pendingColor=false;
  observer.disconnect();listeners.forEach(remove=>remove());
  timers.forEach(id=>window.clearTimeout(id));frames.forEach(id=>window.cancelAnimationFrame(id));
  objectURLs.forEach(url=>URL.revokeObjectURL(url));objectURLs.clear();
  style.remove();owned.remove();if(ownsFont)fontLink.remove();
  container.removeAttribute('aria-busy');container.classList.remove('chrome-managed');if(!hadClass)container.classList.remove('moa-mindmap');
}
resizeCanvas();render();
if(opts.settings)setSettings(opts.settings);
if(!ownsFont)loadFonts();
return{setText,fit,getSettings,setSettings,exportPDF,resetView,destroy,setViewportInsets,getSettingBounds,setChromeOcclusion,setColorSeed};
}
window.MindMap={version:'1.5.0',apiVersion:1,capabilities:['text-input','viewport-fit','settings-v1','pdf-export','reset-view','placeholderNodes','viewport-insets','settings-bounds','chrome-occlusion','live-viewport-fit','color-seed-only'],mount};
})();
