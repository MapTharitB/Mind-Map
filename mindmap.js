/* MindMap 1.12.0 | apiVersion 1 | Classic mountable module.
 * Frozen source: Original/mindmap.original.html; Phase 2 extraction recipe in dev/.
 * Host supplies usable dimensions and the Outliner CSS color-token contract.
 */
(function(){
'use strict';
const DEFAULT_BRANCH_SCALE=2.5,MIN_BRANCH_SCALE=1,MAX_BRANCH_SCALE=5;
const MIN_MAP_SIZE=0.1,MAX_MAP_SIZE=1000,MAP_SIZE_UNITS=10000;
function mapSizeUnits(value){
  if(typeof value!=='number'||!Number.isFinite(value)||value<MIN_MAP_SIZE||value>MAX_MAP_SIZE)return null;
  const scaled=value*MAP_SIZE_UNITS,units=Math.round(scaled);
  return Math.abs(scaled-units)<=1e-7?units:null;
}
function mount(container,opts={}){
  if(!(container instanceof Element))throw new TypeError('MindMap.mount requires an Element');
  let destroyed=false,pdfBusy=false,sourceText='',sourcePlaceholders=[],sourceNodeTexts=null,sourceStats=null,sourcePresentation=null,presentationChanged=false,lastPresentationRender=0,sourceReady=false,rtimer=null,sourceRevision=0;
  const timers=new Set(),frames=new Set(),listeners=[],objectURLs=new Set();
  const hadClass=container.classList.contains('moa-mindmap'),hadCoveredClass=container.classList.contains('map-covered');
  container.classList.add('moa-mindmap');
  const style=document.createElement('style');
  style.textContent=".moa-mindmap{position:relative;min-width:0;min-height:0;}\n.moa-mindmap #mm-map{position:absolute;top:0;left:0;z-index:1;display:block;cursor:grab;touch-action:none}\n.moa-mindmap #mm-map:active{cursor:grabbing}\n.moa-mindmap #mm-empty{position:absolute;z-index:2;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;pointer-events:none;transition:left .26s ease,width .26s ease;}\n.moa-mindmap #mm-empty .ico{font-size:44px;opacity:.16}\n.moa-mindmap #mm-empty p{font-size:13px;font-weight:500;color:rgba(110,108,120,0.55);letter-spacing:.01em;white-space:nowrap}\n.moa-mindmap #mm-zoom-hud{position:absolute;top:14px;right:16px;z-index:10;background:var(--map-hud-bg,var(--page));backdrop-filter:blur(var(--map-glass-blur,8px));-webkit-backdrop-filter:blur(var(--map-glass-blur,8px));color:var(--map-hud-ink,var(--mute));font-size:11px;font-family:'Cascadia Code',monospace;padding:5px 10px;border-radius:var(--map-glass-radius,6px);pointer-events:none;letter-spacing:.04em}\n.moa-mindmap #mm-btn-rst{position:absolute;bottom:14px;right:16px;z-index:10;background:var(--map-glass-bg,var(--btn));backdrop-filter:blur(var(--map-glass-blur,8px));-webkit-backdrop-filter:blur(var(--map-glass-blur,8px));color:var(--map-glass-ink,var(--ink));font-size:11px;font-weight:600;padding:6px 14px;border-radius:var(--map-glass-pill,100px);border:none;outline:none;cursor:pointer;letter-spacing:.04em;transition:background .15s,color .15s;display:flex;align-items:center;gap:5px;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;-webkit-tap-highlight-color:transparent;user-select:none;}\n@media(hover:hover){.moa-mindmap #mm-btn-rst:hover{background:var(--map-glass-hover,var(--halo));color:var(--map-glass-ink,var(--ink))}}\n.moa-mindmap #mm-btn-rst:active{background:var(--map-glass-pressed,var(--accent));color:var(--map-glass-ink,var(--ink))}\n.moa-mindmap #mm-btn-rst:focus,.moa-mindmap #mm-btn-rst:focus-visible{outline:none}\n.moa-mindmap #mm-error{position:absolute;left:0;bottom:0;z-index:11;max-width:calc(100% - 150px);background:var(--page);color:var(--ink);font:inherit;pointer-events:none;}";
  const owned=document.createElement('div');
  owned.className='mm-owned';
  style.textContent+="\n.moa-mindmap .mm-owned,.moa-mindmap .mm-owned *{box-sizing:border-box;margin:0;padding:0}\n.moa-mindmap #mm-empty{font-family:'Segoe UI',system-ui,-apple-system,sans-serif}\n.moa-mindmap #mm-empty,.moa-mindmap #mm-zoom-hud,.moa-mindmap #mm-btn-rst{line-height:normal}";
  owned.innerHTML='<canvas id="mm-map"></canvas><div id="mm-empty"><div class="ico">🗺️</div><p>Start typing to build your map</p></div><div id="mm-zoom-hud">100%</div><button id="mm-btn-rst">⊡ Reset View</button><div id="mm-error" role="status" hidden></div>';
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
    errorEl.textContent=error?.message||String(error);errorEl.hidden=false;
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
const layoutTransitions=new WeakMap(),canonicalTexts=new WeakMap(),runSources=new WeakMap();
function createLayoutPreferences(){
let branchScale=DEFAULT_BRANCH_SCALE;
let lengthLimitEnabled=false,lengthLimitRatio=1.5;
let hlimitInf=true,hlimitN=3,d1Max=Infinity,wrapBoundsReady=false;
let rootEnabled=false,rootCount=3,rootFollowMax=false,visibleRootCount=0,rootOrder='down';
const rootMaximum=()=>Math.max(1,visibleRootCount-1);
const rootEffective=()=>rootFollowMax?rootMaximum():Math.min(rootCount,rootMaximum());
let levelsEnabled=false,levelsN=1,siblingLimitEnabled=true,siblingLimitN=3,branchDepthMax=1,branchSiblingMax=1,branchBoundsReady=false,levelsCountChosen=false,siblingCountChosen=false;
function hlimitCap(d){return Math.max(1,d-1);}
function apply(partial){
  if((typeof partial.branchScale==='number'||typeof partial.branchScale==='string'&&partial.branchScale.trim()!=='')&&Number.isFinite(Number(partial.branchScale)))branchScale=clamp(Math.round((Number(partial.branchScale)+Number.EPSILON)*100),MIN_BRANCH_SCALE*100,MAX_BRANCH_SCALE*100)/100;
  const length=partial.lengthLimit;
  if(length&&typeof length==='object'){
    if(typeof length.enabled==='boolean')lengthLimitEnabled=length.enabled;
    if((typeof length.ratio==='number'||typeof length.ratio==='string'&&length.ratio.trim()!=='')&&Number.isFinite(Number(length.ratio)))lengthLimitRatio=clamp(Math.round((Number(length.ratio)+Number.EPSILON)*100),100,1000)/100;
  }
  const outer=partial.rootLayout;
  if(outer&&typeof outer==='object'){
    if(typeof outer.enabled==='boolean')rootEnabled=outer.enabled;
    if(outer.order==='down'||outer.order==='across')rootOrder=outer.order;
    if('count' in outer){const n=Number(outer.count);if(Number.isFinite(n)&&Number.isSafeInteger(Math.round(n))&&n>0){rootCount=Math.max(1,Math.round(n));if(!('followMax' in outer))rootFollowMax=visibleRootCount>=2&&rootCount===rootMaximum();}}
    if(typeof outer.followMax==='boolean')rootFollowMax=outer.followMax;
  }
  const limit=partial.horizontalLimit;
  if(limit&&typeof limit==='object'){
    if('enabled' in limit)hlimitInf=!limit.enabled;
    if('count' in limit||!hlimitInf){const n='count' in limit?Number(limit.count):hlimitN;hlimitN=Math.max(1,Math.min(wrapBoundsReady?hlimitCap(d1Max):Number.MAX_SAFE_INTEGER,Math.round(isNaN(n)?1:n)));}
  }
  const deeper=partial.deeperHorizontal,siblings=partial.siblingLimit;
  const safeCount=(value,min,max,current)=>{const number=Number(value),rounded=Math.round(number);return Number.isFinite(number)&&Number.isSafeInteger(rounded)?clamp(rounded,min,branchBoundsReady?max:Number.MAX_SAFE_INTEGER):current;};
  if(deeper&&typeof deeper==='object'){if(typeof deeper.enabled==='boolean')levelsEnabled=deeper.enabled;if('levels' in deeper){const next=safeCount(deeper.levels,1,branchDepthMax,levelsN);levelsCountChosen=Number(deeper.levels)!==1;levelsN=next;}}
  if(siblings&&typeof siblings==='object'){if(typeof siblings.enabled==='boolean')siblingLimitEnabled=siblings.enabled;if('count' in siblings){const next=safeCount(siblings.count,1,branchSiblingMax,siblingLimitN);siblingCountChosen=Number(siblings.count)!==3;siblingLimitN=next;}}
  // Latest owner policy: activating either layout switches the other off.
  // If an API/bootstrap request supplies both true, LEVELS wins deterministically.
  // Latest owner override: WRAP and LEVELS persist and act independently.
}
function updateBranchBounds(root,sourceReady,sourceStats){
  if(!sourceReady)return;
  let stats=sourceStats;
  if(!stats){let depth=0,siblings=0;const walk=(n,d)=>{depth=Math.max(depth,d);siblings=Math.max(siblings,n.children.length);n.children.forEach(ch=>walk(ch,d+1));};if(root)(root.synthetic?root.children:[root]).forEach(n=>walk(n,0));stats={maxDepth:depth,maxSiblings:siblings};}
  const nextDepth=Math.max(1,stats.maxDepth),nextSiblings=Math.max(1,stats.maxSiblings);
  const follow=(value,previous,next,min,chosen)=>chosen&&branchBoundsReady&&value===previous&&next>previous?next:clamp(value,min,next);
  levelsN=levelsCountChosen?follow(levelsN,branchDepthMax,nextDepth,1,true):clamp(1,1,nextDepth);siblingLimitN=siblingCountChosen?follow(siblingLimitN,branchSiblingMax,nextSiblings,1,true):clamp(3,1,nextSiblings);
  branchDepthMax=nextDepth;branchSiblingMax=nextSiblings;branchBoundsReady=true;
}

function observeRoot(root,sourceReady,sourceStats){
  updateBranchBounds(root,sourceReady,sourceStats);
  const roots=root.synthetic?root.children:[root];visibleRootCount=roots.length;
  const nd=Math.max(1,...roots.map(n=>n.children.length));
  if(!wrapBoundsReady||nd!==d1Max){
    wrapBoundsReady=true;
    const prevCap=hlimitCap(d1Max);d1Max=nd;
    const newCap=hlimitCap(d1Max);
    if(hlimitInf&&hlimitN===prevCap)hlimitN=newCap;
    if(hlimitN>newCap)hlimitN=newCap;
  }
}
function observeBlank(sourceReady,sourceStats){
  updateBranchBounds(null,sourceReady,sourceStats);visibleRootCount=0;
if(d1Max!==1||sourceReady&&!wrapBoundsReady){d1Max=1;if(hlimitN>1)hlimitN=1;}if(sourceReady)wrapBoundsReady=true;
}
function getSettingBounds(){return{lengthLimit:{min:1,max:10,step:0.1,precision:2,default:1.5},branchScale:{min:MIN_BRANCH_SCALE,max:MAX_BRANCH_SCALE,step:0.1,precision:2,default:DEFAULT_BRANCH_SCALE},rootLayout:{min:1,max:rootMaximum(),available:visibleRootCount>=2,effectiveCount:rootEffective()},horizontalLimit:{min:1,max:hlimitCap(d1Max)},deeperHorizontal:{min:1,max:branchDepthMax},siblingLimit:{min:1,max:branchSiblingMax}};}
function getSettings(){return{lengthLimit:{enabled:lengthLimitEnabled,ratio:lengthLimitRatio},branchScale,rootLayout:{enabled:rootEnabled,count:rootCount,followMax:rootFollowMax,order:rootOrder},horizontalLimit:{enabled:!hlimitInf,count:hlimitN},deeperHorizontal:{enabled:levelsEnabled,levels:levelsN},siblingLimit:{enabled:siblingLimitEnabled,count:siblingLimitN}};}
return {apply,observeRoot,observeBlank,getSettings,getSettingBounds,
  get lengthLimitEnabled(){return lengthLimitEnabled;},
  get lengthLimitRatio(){return lengthLimitRatio;},
  get branchScale(){return branchScale;},
  get rootEnabled(){return rootEnabled;},
  get rootOrder(){return rootOrder;},
  get rootEffective(){return rootEffective();},
  get hlimitInf(){return hlimitInf;},
  get hlimitN(){return hlimitN;},
  get levelsEnabled(){return levelsEnabled;},
  get levelsN(){return levelsN;},
  get siblingLimitEnabled(){return siblingLimitEnabled;},
  get siblingLimitN(){return siblingLimitN;}
};
}
const layoutPreferences=createLayoutPreferences();
function safeFileName(label){
  return(label||'MindMap').replace(/[\/\\?%*:|"<>]/g,'-').trim()||'MindMap';
}

const C={
  BASE_FONT:10,RATIO:DEFAULT_BRANCH_SCALE,LINE_H:1.5,DESC_GAP_R:0.25,DESC_WRAP_EM:28,
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
  ANIM_FIT:        300,
  ANIM_ZOOM:       280,
  ANIM_KB:         390,
  ANIM_KB_BTN:     350,
  ANIM_RST:        320,
};

const SNAP_AMBIG_THRESH=0.30;
const TREE_PAD_FRAC=0.08;
const lnW=(d,MD)=>d<=0?0:C.BASE_LINE*Math.pow(layoutPreferences.branchScale,MD-d);
const cgap=(d,MD)=>C.BASE_GAP*Math.pow(layoutPreferences.branchScale,MD-d);

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
  if(node.synthetic){const real=node.children.filter(ch=>ch.kind!=='spacer');if(real.length===1){real[0].col=hsl(220,.10,.17);assignColors(real[0],220,0,0,seed);return;}}
  if(!node.children.length)return;
  const HLO=36,HHI=90,SLO=0.40,SHI=0.65,SMID=0.55,LLO=0.20,LHI=0.40,LMID=0.30;
  if(node.depth===0){
    let bd=nhash(seed,'d1base');
    const bH=r01(bd)*360;bd=lcg(bd);
    const bS=SLO+r01(bd)*(SHI-SLO);bd=lcg(bd);
    const bL=0.20+r01(bd)*0.10;
    let prevH=bH;
    node.children.filter(ch=>ch.kind!=='spacer').forEach(ch=>{
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
    node.children.filter(ch=>ch.kind!=='spacer').forEach(ch=>{ch.col=hsl(h,sv,l);assignColors(ch,h,sv,l,seed);});
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
    canonicalTexts.set(n,{text:lbl,titleStart:0,titleEnd:lbl.length});
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
const fsz=(d,MD)=>Math.max(C.BASE_FONT,C.BASE_FONT*Math.pow(layoutPreferences.branchScale,MD-d));
const fwt=d=>d<=2?'bold':'normal';
function mW(lbl,f,w){const s=Math.min(f,C.MAX_SAFE_FONT);_cx.font=`${w} ${s}px ${C.FONT}`;return _cx.measureText(lbl).width*(f/s);}
const _capFracCache=new Map();
function capCFrac(fs,fw){
  const k=fs+'|'+fw;
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
// Shared measured text runs: title geometry is an identity operation without descriptions.
function inkMetrics(text,fs,fw){
  const safe=Math.min(fs,C.MAX_SAFE_FONT),ratio=fs/safe;
  _cx.font=fw+' '+safe+'px '+C.FONT;_cx.textBaseline='alphabetic';
  const m=_cx.measureText(text);
  return{width:m.width*ratio,ascent:(m.actualBoundingBoxAscent??safe*0.8)*ratio,descent:(m.actualBoundingBoxDescent??safe*0.2)*ratio,
    left:(m.actualBoundingBoxLeft??0)*ratio,right:(m.actualBoundingBoxRight??m.width)*ratio};
}
// Owner update: automatic visual wrapping only; canonical description payload is untouched.
const descriptionWords=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'word'}):null;
const descriptionGraphemes=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'grapheme'}):null;
function wrapDescriptionLine(text,fs){
  if(!text)return [''];
  const width=fs*C.DESC_WRAP_EM,lines=[];
  const words=descriptionWords?Array.from(descriptionWords.segment(text),part=>part.segment):text.split(/(\s+)/).filter(Boolean);
  let line='';
  const append=part=>{
    if(line&&mW(line+part,fs,'normal')>width){lines.push(line);line='';}
    line+=part;
  };
  for(const word of words){
    if(mW(word,fs,'normal')<=width){append(word);continue;}
    // Never break a grapheme/Thai mark cluster. Older engines keep an unbreakable token intact.
    if(!descriptionGraphemes){append(word);continue;}
    for(const part of descriptionGraphemes.segment(word))append(part.segment);
  }
  if(line||!lines.length)lines.push(line);
  return lines;
}
function descriptionSize(node,MD){
  // Preserve the original arithmetic at the default scale, including its minimum.
  return (layoutPreferences.branchScale===DEFAULT_BRANCH_SCALE?fsz(node.depth+2,MD):node.baseFs/(C.RATIO*C.RATIO))*(node.mapSize??1);
}
function measureTextBlock(node,MD){
  if(node.kind==='spacer')return{runs:[],width:node.fs,minX:0,maxX:node.fs,bottom:node.fs*C.LINE_H,extraHeight:0};
  const title=inkMetrics(node.label,node.fs,node.fw),baseline=node.fs*C.BASELINE_FRAC;
  const runs=[{text:node.label,fs:node.fs,fw:node.fw,x:0,baseline,...title,description:false}];
  const source=canonicalTexts.get(node);if(source&&source.titleEnd>source.titleStart)runSources.set(runs[0],{start:source.titleStart,end:source.titleEnd});
  let width=title.width,bottom=node.fs;
  if(node.description!==undefined){
    const offsets=[];let offset=source?.descriptionStart??0;
    const fs=descriptionSize(node,MD),gap=fs*C.DESC_GAP_R,lines=node.description.split('\n').flatMap(line=>{const wrapped=wrapDescriptionLine(line,fs);for(const text of wrapped){offsets.push(offset);offset+=text.length;}offset++;return wrapped;});
    let previous=null,index=0;
    for(const text of lines){
      const ink=inkMetrics(text,fs,'normal');
      const y=previous?previous.baseline+Math.max(fs*C.LINE_H,previous.descent+ink.ascent+gap):Math.max(node.fs,baseline+title.descent)+gap+(title.descent>node.fs*0.02?title.descent*0.5:0)+Math.max(fs*C.BASELINE_FRAC,ink.ascent);
      const run={text,fs,fw:'normal',x:(title.width-ink.width)/2,baseline:y,...ink,description:true};if(source)runSources.set(run,{start:offsets[index],end:offsets[index]+text.length});index++;runs.push(run);previous=run;width=Math.max(width,ink.width);
    }
    bottom=previous.baseline+Math.max(previous.descent,fs*(C.LINE_H-C.BASELINE_FRAC));
  }
  const minX=runs.reduce((min,run)=>Math.min(min,run.x-run.left),0),maxX=runs.reduce((max,run)=>Math.max(max,run.x+Math.max(run.width,run.right)),title.width);
  return{runs,width:node.description===undefined?width:maxX-minX,minX,maxX,bottom,extraHeight:Math.max(0,bottom-node.fs)};
}
function attachNodeTexts(root,texts){
  if(!texts)return;
  let index=0;
  const walk=n=>{
    if(!n.synthetic){const text=texts[index++],at=text.indexOf('\n'),title=(at<0?text:text.slice(0,at)).trim();n.label=title||'(Untitled)';n.placeholder=!title;
      const rawTitle=at<0?text:text.slice(0,at),titleStart=rawTitle.length-rawTitle.trimStart().length;canonicalTexts.set(n,{text,titleStart,titleEnd:titleStart+title.length,...(at>=0?{descriptionStart:at+1}:{})});
      if(at>=0)n.description=text.slice(at+1);}
    n.children.forEach(walk);
  };walk(root);
}
function attachPresentation(root,values){
  if(!values)return;let index=0;const walk=n=>{if(!n.synthetic){const p=values[index++];n.mapSize=p.mapSize;n.kind=p.kind;if(n.kind==='spacer'){n.label='';delete n.description;n.placeholder=false;canonicalTexts.delete(n);}}n.children.forEach(walk);};walk(root);
  // A new spacer root is an occupied slot, never an extra real font/color level.
  if(root.synthetic&&root.children.filter(n=>n.kind!=='spacer').length<=1){root.depth=-1;const shift=n=>{n.depth--;n.children.forEach(shift);};root.children.forEach(shift);}
}
const titleWidth=n=>n.kind==='spacer'?n.fs:mW(n.label,n.fs,n.fw);
const nodeWidth=n=>n.textBlock?n.textBlock.width:titleWidth(n);

// Descriptions reserve two visual font levels, never real tree depth/statistics.
function hasDescription(n){return n.description!==undefined||n.children.some(hasDescription);}
function visualMaxD(root){let depth=0;const walk=n=>{if(!n.synthetic&&n.kind!=='spacer')depth=Math.max(depth,n.depth+(n.description!==undefined?2:0));n.children.forEach(walk);};walk(root);return depth;}
function lastLeafFs(n){return n.children.length?lastLeafFs(n.children[n.children.length-1]):n.fs;}

/* ══ ARM / SPINE HELPERS ══ */
const armLen=(d,MD)=>fsz(d,MD)*C.ARM_K;

function spineOffsetOf(node){
  const c=[...node.label],w1=c.length?mW(c[0],node.fs,node.fw):0;
  const effectiveLen=c.filter(ch=>!isThaiSpineCombining(ch.codePointAt(0))).length;
  return (effectiveLen===1?w1/2:w1);
}

function spineXOf(node){return node.x+spineOffsetOf(node);}

function assignSubtreeX(node,MD){
  if(node.subtree){for(const offset of node.subtree.childOffsets){offset.node.x=node.x+offset.x;assignSubtreeX(offset.node,MD);}return;}
  const sx=spineXOf(node);
  node.children.filter(ch=>ch.kind!=='spacer').forEach(ch=>{
    ch.x=sx+armLen(ch.depth,MD);
    assignSubtreeX(ch,MD);
  });
}

function colW(n,MD){
  if(n.subtree)return n.subtree.maxX-n.subtree.minX;
  let mx=0;
  const wk=(node,rx)=>{
    const r=rx+nodeWidth(node);
    if(r>mx)mx=r;
    const sx=rx+spineOffsetOf(node);
    node.children.forEach(ch=>wk(ch,sx+armLen(ch.depth,MD)));
  };
  wk(n,0);
  return mx;
}

/* ══ ROOT GRID HELPERS ══ */
function footprintW(node,MD){
  return Math.max(titleWidth(node),colW(node,MD));
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
function describedChildrenOffset(node,subGap){
  return node.textBlock.bottom+subGap+firstRowUpwardBonus([node.children[0]],node.children[0].fs);
}
function footprintH(node,MD){
  if(node.subtree)return node.subtree.height;
  if(!node.children.length)return node.fs*C.LINE_H+node.textBlock.extraHeight;
  const sR=(node.layoutDepth??node.depth)>=1?C.CHILD_STEP_R:1;
  const subGap=node.children[0].fs*C.SUB_GAP_R*sR;
  let h=node.description!==undefined?describedChildrenOffset(node,subGap):node.fs*C.LINE_H*sR+subGap+lowerThaiChildBonus(node,subGap)+node.textBlock.extraHeight;
  for(let i=0;i<node.children.length;i++){
    const ch=node.children[i];
    if(i>0)h+=siblingGapDelta(ch,lastLeafFs(node.children[i-1]));
    h+=footprintH(ch,MD);
  }
  return h;
}
function d1ColGap(colA,colB,ARM1){
  const mxA=colA.length?Math.max(...colA.map(ch=>titleWidth(ch))):0;
  const mxB=colB.length?Math.max(...colB.map(ch=>titleWidth(ch))):0;
  return Math.max(ARM1*C.D1_ARM_FLOOR_R,(mxA+mxB)*C.D1_TXT_PAD_R);
}
function d1RowGap(nextNode){return nextNode.fs*C.D1_ROW_GAP_R+nextNode.fs*thaiTierBonusFrac(nextNode.thaiTier);}
function firstRowUpwardBonus(nodes,d1Fs){
  if(!nodes.length)return 0;
  const maxTier=Math.max(...nodes.map(n=>n.thaiTier||0));
  if(nodes.some(n=>(n.mapSize??1)!==1))return Math.max(...nodes.map(n=>n.fs*((n.thaiTier||0)===3?C.THAI_TIER3_FIRSTROW_R:thaiTierBonusFrac(n.thaiTier||0))));
  const frac=maxTier===3?C.THAI_TIER3_FIRSTROW_R:thaiTierBonusFrac(maxTier);
  return d1Fs*frac;
}

/* ══ LAYOUT ══ */
function place(node,y0){
  if(node.subtree){node.y=y0;for(const offset of node.subtree.childOffsets)place(offset.node,y0+offset.y);return y0+node.subtree.height;}
  node.y=y0;
  if(node.children.length){
    const sR=(node.layoutDepth??node.depth)>=1?C.CHILD_STEP_R:1;
    const subGap=node.children[0].fs*C.SUB_GAP_R*sR;
    let yc=y0+(node.description!==undefined?describedChildrenOffset(node,subGap):node.fs*C.LINE_H*sR+subGap+lowerThaiChildBonus(node,subGap)+node.textBlock.extraHeight);
    for(let i=0;i<node.children.length;i++){
      const ch=node.children[i];
      if(i>0)yc+=siblingGapDelta(ch,lastLeafFs(node.children[i-1]));
      yc=place(ch,yc);
    }
    return yc;
  }
  return y0+node.fs*C.LINE_H+node.textBlock.extraHeight;
}
function annotateNodes(node,MD){
  node.baseFs=fsz(node.depth,MD);node.fs=node.baseFs*(node.mapSize??1);node.fw=fwt(node.depth);node.capFrac=capCFrac(node.fs,node.fw);
  node.textBlock=measureTextBlock(node,MD);
  node.thaiTier=node.kind==='spacer'?0:thaiHeightTier(node.label);node.hasLower=node.kind!=='spacer'&&hasThaiLower(node.label);
  node.children.forEach(ch=>annotateNodes(ch,MD));
}
// One bottom-up footprint record per node; placement never remeasures descendants.
function measureSubtree(node,MD,forceVertical=false){
  if(!forceVertical)node.children.forEach(ch=>measureSubtree(ch,MD));
  let minX=node.textBlock.runs.reduce((min,run)=>Math.min(min,run.x-run.left),0),maxX=node.textBlock.runs.reduce((max,run)=>Math.max(max,run.x+run.right),nodeWidth(node)),height=node.fs*C.LINE_H+node.textBlock.extraHeight;
  const children=node.children,offsets=[];
  const customSize=(node.mapSize??1)!==1||children.some(ch=>ch.subtree.customSize);
  const ownTop=Math.min(0,...node.textBlock.runs.map(run=>run.baseline-run.ascent));
  const ownBottom=Math.max(node.textBlock.bottom,...node.textBlock.runs.map(run=>run.baseline+run.descent));
  let minY=ownTop;
  let horizontal=!forceVertical&&layoutPreferences.levelsEnabled&&children.length>=2&&children.some(ch=>ch.children.length)&&children[0].layoutDepth>=2&&children[0].layoutDepth<=layoutPreferences.levelsN+1&&(!layoutPreferences.siblingLimitEnabled||children.length<=layoutPreferences.siblingLimitN);
  if(children.length){
    if(horizontal){
      let cursor=0;
      for(let i=0;i<children.length;i++){
        const ch=children[i],record=ch.subtree;
        offsets.push({node:ch,x:cursor-record.minX,y:0});cursor+=record.maxX-record.minX;
        if(i+1<children.length)cursor+=Math.max(armLen(ch.depth,MD),ch.fs*C.SIBLING_GAP_R);
      }
      const first=offsets[0],last=offsets[offsets.length-1],center=(first.x+titleWidth(first.node)/2+last.x+titleWidth(last.node)/2)/2;
      const childFs=Math.max(...children.map(ch=>ch.fs)),baseGap=childFs*C.GAP_R*C.D0_D1_GAP_MULT;
      let y=node.fs+node.textBlock.extraHeight+baseGap+lowerThaiChildBonus(node,baseGap)*C.LOWER_THAI_FANOUT_FRAC+firstRowUpwardBonus(children,childFs);
      if(customSize)y=Math.max(y,ownBottom+Math.max(baseGap,lnW(children[0].depth,MD)*3)-Math.min(...children.map(ch=>ch.subtree.minY)));
      for(const offset of offsets){offset.x+=titleWidth(node)/2-center;offset.y=y;height=Math.max(height,y+offset.node.subtree.height);}
      // Length limits are opt-in; left overhang alone is not a width limit.
      // Incoming connector clearance is checked by the vertical parent below.
      if(layoutPreferences.lengthLimitEnabled){
        const span=cursor,title=node.textBlock.runs[0],titleWidth=Math.max(title.width,title.right)-Math.min(0,-title.left),threshold=titleWidth*layoutPreferences.lengthLimitRatio;
        const tolerance=1e-9*Math.max(1,span,threshold);
        if(!Number.isFinite(span)||!Number.isFinite(threshold)||titleWidth<=0||span>threshold+tolerance){horizontal=false;offsets.length=0;height=node.fs*C.LINE_H+node.textBlock.extraHeight;}
      }
    }
    if(!horizontal){
      const sR=(node.layoutDepth??node.depth)>=1?C.CHILD_STEP_R:1,subGap=children[0].fs*C.SUB_GAP_R*sR;
      let y=node.description!==undefined?describedChildrenOffset(node,subGap):node.fs*C.LINE_H*sR+subGap+lowerThaiChildBonus(node,subGap)+node.textBlock.extraHeight;
      const spine=spineOffsetOf(node);
      // Latest owner correction: quietly stack an overwide horizontal group vertically.
      // Reserve the incoming vertical shaft corridor, including stroke and measured ink.
      // A one-column WRAP also gives first-level children this incoming shaft.
      // Forced rebuilds reuse measured children; each node is built at most twice.
      for(let i=0;i<children.length;i++){
        const ch=children[i];if(i)y+=siblingGapDelta(ch,children[i-1].subtree.lastLeafFs);
        // Centered own paragraphs reserve their left ink without changing title anchors within the block.
        const descriptionInset=ch.description===undefined?0:Math.max(0,-ch.textBlock.minX);
        if(((node.layoutDepth??node.depth)>0||(!node.synthetic&&(children.length===1||!layoutPreferences.hlimitInf&&layoutPreferences.hlimitN===1)))&&ch.subtree.childMode==='horizontal'&&ch.subtree.minX+descriptionInset+armLen(ch.depth,MD)<=lnW(ch.depth,MD)/2)measureSubtree(ch,MD,true);
        // Customized footprints clear actual adjacent ink; default arithmetic is unchanged.
        if(customSize)y=i===0?Math.max(y,ownBottom+subGap-ch.subtree.minY):y-Math.min(0,ch.subtree.minY);
        offsets.push({node:ch,x:spine+armLen(ch.depth,MD)+descriptionInset,y});y+=ch.subtree.height;
      }
      height=Math.max(height,y);
    }
    for(const offset of offsets){minY=Math.min(minY,offset.y+offset.node.subtree.minY);minX=Math.min(minX,offset.x+offset.node.subtree.minX);maxX=Math.max(maxX,offset.x+offset.node.subtree.maxX);}
  }
  if(customSize){
    const connected=offsets.filter(offset=>offset.node.kind!=='spacer');
    if(connected.length){
      const half=lnW(connected[0].node.depth,MD)/2;
      if(horizontal){
        for(const offset of connected){
          const center=offset.x+titleWidth(offset.node)/2;
          minX=Math.min(minX,center-half);maxX=Math.max(maxX,center+half);
        }
      }else{
        const spine=spineOffsetOf(node);
        minX=Math.min(minX,spine-half);
        maxX=Math.max(maxX,spine+Math.max(...connected.map(offset=>armLen(offset.node.depth,MD)))*.70+half);
        for(const offset of connected)height=Math.max(height,offset.y+offset.node.fs*offset.node.capFrac+half);
      }
    }
  }
  node.subtree={minX,maxX,minY,height,customSize,childMode:horizontal?'horizontal':'vertical',connectorFallback:forceVertical,childOffsets:offsets,lastLeafFs:children.length?children[children.length-1].subtree.lastLeafFs:node.fs};
}
function layoutSimple(root,MD,colorSeed,recolor=true){
  const d1=root.children,NC=d1.length;
  root.y=C.TOP_M;
  const d1Fs=NC?Math.max(...d1.map(ch=>ch.fs)):C.BASE_FONT;
  const d1TxtW=d1.map(n=>titleWidth(n));
  const d1ColW_s=d1.map((n,i)=>Math.max(colW(n,MD),d1TxtW[i]));
  const cl=[];let xc=C.LEFT_M;
  for(let i=0;i<NC;i++){
    cl.push(xc);
    const rPad=d1TxtW[i]*C.D1_TXT_PAD_R;
    const lPad=i+1<NC?d1TxtW[i+1]*C.D1_TXT_PAD_R:0;
    xc+=d1ColW_s[i]+rPad+lPad;
  }
  for(let i=0;i<NC;i++){d1[i].x=cl[i]-(d1[i].subtree?.minX||0);assignSubtreeX(d1[i],MD);}
  for(let i=0;i<NC;i++)d1[i].cx=d1[i].x+d1TxtW[i]/2;
  const rCX=NC===0?C.LEFT_M+titleWidth(root)/2:
    NC===1?d1[0].cx:(d1[0].cx+d1[NC-1].cx)/2;
  root.cx=rCX;root.x=rCX-titleWidth(root)/2;
  if(recolor){root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);}
  const d1BaseGap=d1Fs*C.GAP_R*C.D0_D1_GAP_MULT;
  let d1Y=root.y+root.fs+root.textBlock.extraHeight+d1BaseGap+lowerThaiChildBonus(root,d1BaseGap)*(NC===1?1:C.LOWER_THAI_FANOUT_FRAC);
  if(root.subtree?.customSize&&d1.length)d1Y=Math.max(d1Y,root.y+Math.max(root.textBlock.bottom,...root.textBlock.runs.map(run=>run.baseline+run.descent))+d1BaseGap-Math.min(...d1.map(ch=>ch.subtree.minY)));
  const firstRowBonus=firstRowUpwardBonus(d1,d1Fs);
  const bots=[];for(let i=0;i<NC;i++)bots.push(place(d1[i],d1Y+firstRowBonus));
  const pW=Math.max(NC?cl[NC-1]+d1ColW_s[NC-1]+d1TxtW[NC-1]*C.D1_TXT_PAD_R:0,
    root.x+titleWidth(root))+C.RIGHT_M;
  const pH=(bots.length?Math.max(...bots):d1Y+120)+C.BOT_M;
  const av=d1Y-root.y-root.fs-root.textBlock.extraHeight;
  const rg=Math.min(cgap(d1[0]?.depth||1,MD),av*0.3);
  const rb=root.y+root.fs+root.textBlock.extraHeight+rg;
  const d1BusY=rb+(d1Y-rb)*C.BUS_MID;
  const sX0=Math.min(root.x,NC?cl[0]:root.x);
  const sX1=Math.max(root.x+titleWidth(root),
    NC?cl[NC-1]+d1ColW_s[NC-1]+d1TxtW[NC-1]*C.D1_TXT_PAD_R:root.x);
  return{root,MD,pW,pH,d1Y,d1Mode:'simple',d1Cols:null,d1Groups:null,
    d1ColX:null,d1BusY,d1X0:sX0,d1X1:sX1,firstRowBonus};
}
function layoutGrid(root,MD,colorSeed,recolor=true){
  const d1=root.children,NC=d1.length;
  root.y=C.TOP_M;
  const cols=Math.min(layoutPreferences.hlimitN,NC);
  const ARM1=armLen(d1[0].depth,MD);
  const d1Fs=Math.max(...d1.map(ch=>ch.fs));
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
  let d1Y_g=root.y+(cols===1&&root.description!==undefined?describedChildrenOffset(root,d1Fs*C.SUB_GAP_R):root.fs+root.textBlock.extraHeight+d1BaseGap_g+lowerThaiChildBonus(root,d1BaseGap_g)*(cols===1?1:C.LOWER_THAI_FANOUT_FRAC));
  if(root.subtree?.customSize)d1Y_g=Math.max(d1Y_g,root.y+Math.max(root.textBlock.bottom,...root.textBlock.runs.map(run=>run.baseline+run.descent))+d1BaseGap_g-Math.min(...d1.map(ch=>ch.subtree.minY)));
  const av_g=d1Y_g-root.y-root.fs-root.textBlock.extraHeight;
  const rg_g=Math.min(cgap(d1[0]?.depth||1,MD),av_g*0.3);
  const rb_g=root.y+root.fs+root.textBlock.extraHeight+rg_g;
  const d1BusY=rb_g+(d1Y_g-rb_g)*C.BUS_MID;
  const gridStartY=d1Y_g;
  const firstRowNodes=colChildren.map(chs=>chs[0]).filter(Boolean);
  const firstRowBonus=cols>1?firstRowUpwardBonus(firstRowNodes,d1Fs):0;
  const colRowY=[];
  for(let c=0;c<cols;c++){
    let yc=gridStartY+firstRowBonus;colRowY[c]=[];
    for(let r=0;r<colChildren[c].length;r++){
      if(r>0&&root.subtree?.customSize)yc-=Math.min(0,colChildren[c][r].subtree.minY);
      colRowY[c][r]=yc;yc+=footprintH(colChildren[c][r],MD);
      if(r+1<colChildren[c].length)yc+=d1RowGap(colChildren[c][r+1]);
    }
  }
  const d1Groups=[];
  for(let c=0;c<cols;c++){
    for(let r=0;r<colChildren[c].length;r++){
      const ch=colChildren[c][r];
      ch.x=colLabelX[c]-(ch.subtree?.minX||0);assignSubtreeX(ch,MD);place(ch,colRowY[c][r]);
      ch.cx=ch.x+titleWidth(ch)/2;
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
  root.cx=rCX_g;root.x=rCX_g-titleWidth(root)/2;
  if(recolor){root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);}
  if(cols===1)assignSubtreeX(root,MD);
  let _gMaxX=root.x+titleWidth(root);
  (function _gwk(n){const rx=n.x+(n.description===undefined?nodeWidth(n):n.textBlock.maxX);if(rx>_gMaxX)_gMaxX=rx;n.children.forEach(_gwk);})(root);
  return{root,MD,pW:_gMaxX+C.RIGHT_M,pH:gridY1+C.BOT_M,d1Y:gridStartY,
    d1Mode:'grid',d1Cols:cols,d1Groups,d1ColX,d1BusY,d1X0:gridX0,d1X1:gridX1,firstRowBonus};
}
function layoutTree(root,MD,colorSeed,recolor=true){
  const NC=root.children.length;
  // A lone real root child always uses the existing left-side vertical connector.
  if(NC===1&&!root.synthetic)return layoutGrid(root,MD,colorSeed,recolor);
  return(layoutPreferences.hlimitInf||NC<=layoutPreferences.hlimitN)?layoutSimple(root,MD,colorSeed,recolor):layoutGrid(root,MD,colorSeed,recolor);
}
function translateLayout(lay,dx,dy){
  const walk=n=>{n.x+=dx;n.y+=dy;if(n.cx!=null)n.cx+=dx;n.children.forEach(walk);};walk(lay.root);
  for(const key of ['d1X0','d1X1'])lay[key]+=dx;
  for(const key of ['d1Y','d1BusY'])lay[key]+=dy;
  if(lay.d1ColX)lay.d1ColX=lay.d1ColX.map(x=>x+dx);
  if(lay.d1Groups)for(const g of lay.d1Groups){g.cellX+=dx;g.labelX+=dx;g.cellY+=dy;}
}
function layout(root,colorSeed){
  const roots=root.synthetic?root.children:[root],logical=(n,d)=>{n.layoutDepth=d;n.children.forEach(ch=>logical(ch,d+1));};
  roots.forEach(n=>logical(n,0));
  const MD=visualMaxD(root);annotateNodes(root,MD);
  const described=hasDescription(root),presented=!!sourcePresentation?.some(p=>p.kind==='spacer'||p.mapSize!==1);if(layoutPreferences.levelsEnabled||described||presented)roots.forEach(n=>measureSubtree(n,MD));
  if(!root.synthetic)return layoutTree(root,MD,colorSeed);
  // Color once in original whole-map order; outer packing only translates complete trees.
  root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);
  const trees=roots.map(n=>{const lay=layoutTree(n,MD,colorSeed,false);lay.hasDescriptions=hasDescription(n);return lay;});
  const boxes=trees.map(contentBounds),cols=layoutPreferences.rootEnabled?Math.min(layoutPreferences.rootEffective,trees.length):trees.length;
  if(layoutPreferences.rootEnabled&&layoutPreferences.rootOrder==='across'){
    // Placement indexes leave canonical preorder, color traversal and PDF order intact.
    const rows=Array.from({length:Math.ceil(trees.length/cols)},(_,r)=>Array.from({length:Math.min(cols,trees.length-r*cols)},(_,c)=>r*cols+c));
    const widths=Array.from({length:cols},(_,c)=>Math.max(...rows.filter(row=>c<row.length).map(row=>boxes[row[c]].w)));
    const xs=[C.LEFT_M];
    for(let c=1;c<cols;c++){
      const gap=Math.max(...rows.filter(row=>c<row.length).map(row=>d1ColGap([trees[row[c-1]].root],[trees[row[c]].root],armLen(trees[row[c]].root.depth,MD))));
      xs[c]=xs[c-1]+widths[c-1]+gap;
    }
    const gridWidth=xs[cols-1]+widths[cols-1]-C.LEFT_M;
    let y=C.TOP_M;
    rows.forEach((row,r)=>{
      const left=xs[0]+(widths[0]-boxes[row[0]].w)/2,last=row.length-1;
      const right=xs[last]+(widths[last]+boxes[row[last]].w)/2;
      const shift=row.length<cols?C.LEFT_M+gridWidth/2-(left+right)/2:0;
      for(const [c,i]of row.entries())translateLayout(trees[i],xs[c]+(widths[c]-boxes[i].w)/2+shift-boxes[i].x,y-boxes[i].y);
      y+=Math.max(...row.map(i=>boxes[i].h));
      if(r+1<rows.length)y+=Math.max(...rows[r+1].map(i=>d1RowGap(trees[i].root)));
    });
  }else{
    const base=Math.floor(trees.length/cols),extra=trees.length%cols;
    let index=0,x=C.LEFT_M;
    for(let c=0;c<cols;c++){
      const size=base+(c<extra?1:0),end=index+size,width=Math.max(...boxes.slice(index,end).map(box=>box.w));let y=C.TOP_M;
      for(;index<end;index++){
        const lay=trees[index],box=boxes[index];translateLayout(lay,x+(width-box.w)/2-box.x,y-box.y);y+=box.h;
        if(index+1<end)y+=d1RowGap(trees[index+1].root);
      }
      if(c+1<cols)x+=width+d1ColGap([trees[end-1].root],[trees[end].root],armLen(trees[end].root.depth,MD));
    }
  }
  const lay={root,MD,trees,hasDescriptions:described,d1Mode:'forest'};const box=contentBounds(lay);
  lay.pW=box.x+box.w+C.RIGHT_M;lay.pH=box.y+box.h+C.BOT_M;return lay;
}

/* ══ CONTENT BOUNDS ══ */
function contentBounds(lay){
  if(lay.trees){const boxes=lay.trees.map(contentBounds),x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};}
  const root=lay.root;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const walk=n=>{
    if(n.kind==='spacer'){x0=Math.min(x0,n.x);x1=Math.max(x1,n.x+n.fs);y0=Math.min(y0,n.y);y1=Math.max(y1,n.y+n.fs*C.LINE_H);return;}
    const safeFs=Math.min(n.fs,C.MAX_SAFE_FONT);
    const scaleRatio=n.fs/safeFs;
    _cx.font=`${n.fw} ${safeFs}px ${C.FONT}`;_cx.textBaseline='alphabetic';
    const m=_cx.measureText(n.label);
    const baselineY=n.y+n.fs*C.BASELINE_FRAC;
    const ny0=baselineY-(m.actualBoundingBoxAscent??safeFs*0.80)*scaleRatio;
    const ny1=baselineY+(m.actualBoundingBoxDescent??safeFs*0.20)*scaleRatio;
    const nx1=n.x+titleWidth(n);
    if(!n.synthetic){if(n.x<x0)x0=n.x;if(ny0<y0)y0=ny0;if(nx1>x1)x1=nx1;if(ny1>y1)y1=ny1;}
    if(!n.synthetic&&(n.description!==undefined||layoutPreferences.levelsEnabled||(n.mapSize??1)!==1)){
      for(const run of n.textBlock.runs){
        x0=Math.min(x0,n.x+run.x-run.left);x1=Math.max(x1,n.x+run.x+Math.max(run.width,run.right));
        y0=Math.min(y0,n.y+run.baseline-run.ascent);y1=Math.max(y1,n.y+run.baseline+run.descent);
      }
      y1=Math.max(y1,n.y+n.textBlock.bottom);
    }
    n.children.forEach(walk);
  };
  walk(root);
  if(lay.d1Mode==='grid'){x0=Math.min(x0,lay.d1X0);x1=Math.max(x1,lay.d1X1);y0=Math.min(y0,lay.d1BusY);}
  if(lay.hasDescriptions||layoutPreferences.levelsEnabled||sourcePresentation){for(const s of getConnSegments(lay)){x0=Math.min(x0,s.x1-s.lw/2,s.x2-s.lw/2);x1=Math.max(x1,s.x1+s.lw/2,s.x2+s.lw/2);y0=Math.min(y0,s.y1-s.lw/2,s.y2-s.lw/2);y1=Math.max(y1,s.y1+s.lw/2,s.y2+s.lw/2);}}
  return{x:x0,y:y0,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};
}

/* ══ CONNECTION SEGMENTS ══ */
function getConnSegments(lay){
  if(lay.trees)return lay.trees.flatMap(getConnSegments);
  const{root,MD,d1Mode,d1BusY,d1ColX,d1Groups,d1Cols,d1X0}=lay;
  const d1=root.children.filter(n=>n.kind!=='spacer');
  const segs=[];
  const seg=(col,lw,x1,y1,x2,y2)=>segs.push({col,lw,x1,y1,x2,y2});
  const subSegs=p=>{
    if(p.kind==='spacer')return;const connected=p.children.filter(ch=>ch.kind!=='spacer');if(!connected.length)return;
    if(p.subtree?.childMode==='horizontal'){
      const children=connected,depth=children[0].depth;
      const bottom=p.y+Math.max(p.textBlock.bottom,p.textBlock.runs[0].baseline+p.textBlock.runs[0].descent);
      const inkTop=ch=>ch.y+ch.textBlock.runs[0].baseline-ch.textBlock.runs[0].ascent;
      const top=Math.min(...children.map(inkTop)),gap=top-bottom,rg=Math.min(cgap(depth,MD),gap*0.3);
      const clearance=p.subtree.customSize?lnW(depth,MD)/2+1e-9:0;
      const start=bottom+Math.max(rg,clearance),bus=start+(top-start)*C.BUS_MID,center=p.x+mW(p.label,p.fs,p.fw)/2,lw=lnW(depth,MD);
      seg(p.col,lw,center,start,center,bus);
      const centers=children.map(ch=>ch.x+titleWidth(ch)/2);
      seg(p.col,lw,centers[0],bus,centers[centers.length-1],bus);
      children.forEach((ch,i)=>seg(p.col,lw,centers[i],bus,centers[i],inkTop(ch)-Math.max(clearance,Math.min(cgap(depth,MD),(inkTop(ch)-bus)*0.3))));
      children.forEach(subSegs);return;
    }
    const sx=spineXOf(p);
    const fc=connected[0];
    const lastCh=connected[connected.length-1];
    const lmy=lastCh.y+lastCh.fs*lastCh.capFrac;
    const vg=(fc.y-p.y-p.fs-p.textBlock.extraHeight)*C.VG_FRAC;
    seg(p.col,lnW(p.depth+1,MD),sx,p.y+p.fs+p.textBlock.extraHeight+vg,sx,lmy);
    for(const ch of connected){
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
      const rg=Math.min(cgap(d1[0].depth,MD),d1BaseGap*0.3);
      const rb=by-(d1BaseGap-rg)*C.BUS_MID;
      const upperLen=by-rb;
      let topX=root.cx,snapIdx=-1;
      if(d1.length>=3){
        const _sd=[];
        for(let i=1;i<d1.length-1;i++){
          const n=d1[i],dg=Math.min(cgap(d1[0].depth,MD),(n.y-by)*0.3);
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
      const lw1=lnW(d1[0].depth,MD);
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
    const lw1=lnW(d1[0].depth,MD);
    if(d1Cols===1){
      const sx=spineXOf(root);
      const fc=d1[0],lastD1=d1[d1.length-1];
      const lmy=lastD1.y+lastD1.fs*lastD1.capFrac;
      const vg=(fc.y-root.y-root.fs-root.textBlock.extraHeight)*C.VG_FRAC*0.4;
      seg(root.col,lw1,sx,root.y+root.fs+root.textBlock.extraHeight+vg,sx,lmy);
      for(const ch of d1){
        const ey=ch.y+ch.fs*ch.capFrac;
        seg(root.col,lw1,sx,ey,ch.x-armLen(ch.depth,MD)*0.30,ey);
      }
    }else{
      const d1BaseGap=d1[0].fs*C.GAP_R*C.D0_D1_GAP_MULT;
      const rg=Math.min(cgap(d1[0].depth,MD),d1BaseGap*0.3);
      seg(root.col,lw1,root.cx,d1BusY-(d1BaseGap-rg)*C.BUS_MID,root.cx,d1BusY);
      const activeColumns=d1ColX.filter((_,c)=>d1Groups.some(g=>g.col===c&&g.node.kind!=='spacer'));
      seg(root.col,lw1,Math.min(activeColumns[0],root.cx),d1BusY,Math.max(activeColumns[activeColumns.length-1],root.cx),d1BusY);
      for(let c=0;c<d1Cols;c++){
        const shaftX=d1ColX[c];
        const colGs=d1Groups.filter(g=>g.col===c&&g.node.kind!=='spacer');if(!colGs.length)continue;
        const lastCh=colGs[colGs.length-1].node;
        seg(root.col,lw1,shaftX,d1BusY,shaftX,lastCh.y+lastCh.fs*lastCh.capFrac);
        for(const g of colGs){
          const ch=g.node;
          seg(root.col,lw1,shaftX,ch.y+ch.fs*ch.capFrac,ch.x-armLen(ch.depth,MD)*0.30,ch.y+ch.fs*ch.capFrac);
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
  if(!n.synthetic&&n.kind!=='spacer'){
    ctx.textBaseline='alphabetic';
    for(const run of n.textBlock.runs){
      ctx.fillStyle=run.description?n.col:labelColor(n);
      if(run.fs<=C.MAX_SAFE_FONT){ctx.font=run.fw+' '+run.fs+'px '+C.FONT;ctx.fillText(run.text,n.x+run.x,n.y+run.baseline);}
      else{const r=run.fs/C.MAX_SAFE_FONT;ctx.save();ctx.translate(n.x+run.x,n.y+run.baseline);ctx.scale(r,r);ctx.font=run.fw+' '+C.MAX_SAFE_FONT+'px '+C.FONT;ctx.fillText(run.text,0,0);ctx.restore();}
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
    if(!n.synthetic&&n.kind!=='spacer'){
      const isB=n.fw==='bold';
      const tx=n.depth===0&&n.cx!=null?px(n.cx)-pdfStrW(n.label,isB,n.fs)/2:px(n.x);
      for(const run of n.textBlock.runs)ops.push(renderLabel(tx+run.x*PDF_SCALE,py(n.y+run.baseline),run.text,run.fw==='bold',run.fs,run.description?n.col:labelColor(n)));
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
const gesture={drag:null,mouseZoom:null,t1d:null,touchMoved:false,startX:0,startY:0,lastTapTime:0,lastTapX:0,lastTapY:0,sequence:null,twoTap:null,twoTimer:null,lastTwo:null,suppressMouseUntil:0,suppressAux:false,pointerType:'mouse'};
// Same private Safari identity as the shell; modules remain independent.
const ipadSafari=navigator.maxTouchPoints>1&&(/iPad/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&/Macintosh/i.test(navigator.userAgent))&&/AppleWebKit/i.test(navigator.userAgent)&&/Version\//i.test(navigator.userAgent)&&/Safari\//i.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Android|Edg\/|OPR\//i.test(navigator.userAgent);
function canvasInteraction(value){if(typeof opts.onCanvasInteraction==='function'){try{const result=opts.onCanvasInteraction(value);if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});}catch(error){/* Host menu failure cannot interrupt the canvas. */}}}
const DOUBLE_INTERVAL=150;
let tapCandidate=null,tapTimer=null,tapPair=null,provisionalPress=null;
function clearTap(){
  clearTimeout(tapTimer);tapTimer=null;tapCandidate=null;tapPair=null;provisionalPress=null;
}
function confirmSingleTap(candidate){
  if(candidate&&candidate.channel!=='two-touch'&&!paused&&!document.hidden)
    canvasInteraction({kind:'tap',input:candidate.channel==='mouse'?'mouse':'touch'});
}
function tapPress(channel,x,y,distance){
  const now=performance.now(),prior=tapCandidate;
  tapPair=null;
  if(prior?.channel==='two-touch'&&channel==='one-touch'&&now-prior.time<DOUBLE_INTERVAL){
    // The first contact may be joining a second chord. Never expire mid-press.
    clearTimeout(tapTimer);tapTimer=null;provisionalPress=now;return;
  }
  const pressedAt=channel==='two-touch'&&provisionalPress!==null?provisionalPress:now;
  provisionalPress=null;
  if(!prior)return;
  clearTimeout(tapTimer);tapTimer=null;tapCandidate=null;
  if(prior.channel===channel&&pressedAt-prior.time<DOUBLE_INTERVAL&&Math.hypot(x-prior.x,y-prior.y)<distance){
    tapPair={channel};
  }else if(pressedAt-prior.time>=DOUBLE_INTERVAL){
    confirmSingleTap(prior);
  }
}
function tapRelease(channel,x,y,inverse=false){
  if(tapPair?.channel===channel){
    clearTap();const r=canvas.getBoundingClientRect();canvasActivity();
    zoomAt(x-r.left,y-r.top,inverse?1/zoomFactor():zoomFactor());return;
  }
  clearTap();
  const candidate=tapCandidate={channel,x,y,time:performance.now()};
  tapTimer=setTimeout(()=>{
    if(tapCandidate!==candidate)return;
    tapTimer=null;tapCandidate=null;confirmSingleTap(candidate);
  },DOUBLE_INTERVAL);
}
function canvasActivity(){canvasInteraction({kind:'activity'});}
function insideCanvas(x,y){const r=canvas.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
function clearTwoCandidate(){clearTimeout(gesture.twoTimer);gesture.twoTimer=null;gesture.twoTap=null;}
function cancelGestures(){clearTap();gesture.drag=null;gesture.mouseZoom=null;gesture.t1d=null;gesture.sequence=null;gesture.lastTapTime=0;gesture.lastTwo=null;clearTwoCandidate();canvas.style.cursor='grab';canvasActivity();}
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
let pendingRender=false,holdDrawing=false,pendingColor=false;
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
  updateChromeEligibility();updateEmptyHint();
  if(covered){
    cancelGestures();paused=true;pendingRender=pendingRender||rtimer!==null;
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
  if(paused){return false;}
  if(canvas.width===w*dpr&&canvas.height===h*dpr){return false;}
  
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
function fitTarget(kbH){
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
  const k=Math.pow(layoutPreferences.branchScale,newLay.MD-prevLay.MD);
  const sOld=st.scale,sNew=sOld/k;
  st.panX+=sOld*aOld.x-sNew*aNew.x;st.panY+=sOld*aOld.y-sNew*aNew.y;st.scale=sNew;
}
// Scale transitions use real-node preorder only within the same accepted source revision.
function preserveViewportAcrossScaleChange(prevLay,newLay){
  const r=viewportRect(),zoom=st.scale;
  if(!(r.width>0&&r.height>0&&Number.isFinite(zoom)&&zoom>0))return;
  const center={x:r.left+r.width/2,y:r.top+r.height/2},world={x:(center.x-st.panX)/zoom,y:(center.y-st.panY)/zoom};
  const realNodes=lay=>{const nodes=[];const walk=n=>{if(!n.synthetic&&n.kind!=='spacer')nodes.push(n);n.children.forEach(walk);};walk(lay.root);return nodes;};
  const previous=layoutTransitions.get(prevLay),next=layoutTransitions.get(newLay);
  let anchor=null;
  if(previous?.revision===next?.revision){
    const nodes=realNodes(prevLay),right=(r.left+r.width-st.panX)/zoom,bottom=(r.top+r.height-st.panY)/zoom,left=(r.left-st.panX)/zoom,top=(r.top-st.panY)/zoom;
    nodes.forEach((node,index)=>{for(const run of node.textBlock.runs){
      const x0=node.x+run.x-run.left,x1=node.x+run.x+Math.max(run.width,run.right),y0=node.y+run.baseline-run.ascent,y1=node.y+run.baseline+run.descent;
      if(x1<left||x0>right||y1<top||y0>bottom)continue;
      const dx=Math.max(x0-world.x,0,world.x-x1),dy=Math.max(y0-world.y,0,world.y-y1),distance=dx*dx+dy*dy,centerDistance=Math.pow((x0+x1)/2-world.x,2)+Math.pow((y0+y1)/2-world.y,2);
      if(!anchor||distance<anchor.distance||distance===anchor.distance&&(centerDistance<anchor.centerDistance||centerDistance===anchor.centerDistance&&index<anchor.index))anchor={node,index,distance,centerDistance};
    }});
  }
  let scale=zoom,panX,panY;
  const node=anchor&&realNodes(newLay)[anchor.index];
  if(node&&node.fs>0&&Number.isFinite(node.fs)){
    scale=presentationChanged?zoom:zoom*anchor.node.fs/node.fs;
    panX=st.panX+zoom*anchor.node.x-scale*node.x;
    panY=st.panY+zoom*(anchor.node.y+anchor.node.fs*C.BASELINE_FRAC)-scale*(node.y+node.fs*C.BASELINE_FRAC);
  }else{
    const oldBounds=previous?.bounds||contentBounds(prevLay),newBounds=next?.bounds||contentBounds(newLay);
    const u=(world.x-oldBounds.x)/oldBounds.w,v=(world.y-oldBounds.y)/oldBounds.h;
    panX=center.x-zoom*(newBounds.x+u*newBounds.w);panY=center.y-zoom*(newBounds.y+v*newBounds.h);
  }
  if(![scale,panX,panY].every(Number.isFinite)||scale<=0)return;
  cancelAnimationFrame(_raf);_raf=null;cancelAnimationFrame(kbLift.animId);kbLift.animId=null;
  st.scale=scale;st.panX=panX;st.panY=panY;
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

// Decorations are transient canvas work. PDF retains its original label/connector path.
const SEARCH_FILL='rgba(255,220,0,0.55)';
let searchQuery='',highlightCache=null;
function highlightGeometry(){
  if(highlightCache?.layout===st.lay&&highlightCache.query===searchQuery)return highlightCache.rects;
  const rects=[],query=searchQuery.toLowerCase();
  const walk=node=>{
    const source=canonicalTexts.get(node);
    if(source&&node.kind!=='spacer'){
      const lower=source.text.toLowerCase(),matches=[];let at=0;
      while((at=lower.indexOf(query,at))!==-1){matches.push({start:at,end:at+query.length});at+=query.length;}
      if(matches.length)for(const run of node.textBlock.runs){
        const range=runSources.get(run);if(!range||!run.text)continue;
        const clusters=descriptionGraphemes?Array.from(descriptionGraphemes.segment(run.text),p=>({start:p.index,end:p.index+p.segment.length})):null;
        for(const match of matches){
          let start=Math.max(range.start,match.start)-range.start,end=Math.min(range.end,match.end)-range.start;
          if(end<=start)continue;
          if(clusters){start=clusters.find(c=>c.end>start)?.start??start;end=clusters.find(c=>c.end>=end)?.end??end;}
          const prefix=inkMetrics(run.text.slice(0,start),run.fs,run.fw).width,ink=inkMetrics(run.text.slice(start,end),run.fs,run.fw),padding=.08*run.fs;
          const left=node.x+run.x+prefix-Math.max(0,ink.left)-padding,right=node.x+run.x+prefix+Math.max(ink.width,ink.right)+padding;
          const top=node.y+run.baseline-Math.max(run.ascent,ink.ascent)-padding,bottom=node.y+run.baseline+Math.max(run.descent,ink.descent)+padding;
          if([left,right,top,bottom].every(Number.isFinite))rects.push({x:left,y:top,w:right-left,h:bottom-top});
        }
      }
    }
    node.children.forEach(walk);
  };
  if(query&&st.lay)walk(st.lay.root);
  highlightCache={layout:st.lay,query:searchQuery,rects};return rects;
}
function drawHighlights(){
  if(!searchQuery)return;
  const rects=highlightGeometry(),dpr=devicePixelRatio||1,W=canvas.width/dpr,H=canvas.height/dpr;
  ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();ctx.fillStyle=SEARCH_FILL;
  for(const rect of rects){
    const w=Math.max(10,rect.w*st.scale),h=Math.max(10,rect.h*st.scale),x=st.panX+(rect.x+rect.w/2)*st.scale-w/2,y=st.panY+(rect.y+rect.h/2)*st.scale-h/2;
    if(x+w<0||y+h<0||x>W||y>H)continue;
    ctx.fillRect(x,y,w,h);
  }
  ctx.restore();
}
function setSearchQuery(query){
  if(destroyed)return;query=String(query??'').trim();if(query===searchQuery)return;
  searchQuery=query;highlightCache=null;if(!paused)redraw();
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
  drawConn(ctx,st.lay);drawHighlights();drawLbls(ctx,st.lay.root);
  ctx.restore();
  const pct=st.scale*100;
  hudEl.textContent=(pct>=1?Math.round(pct):pct.toFixed(pct>=0.1?1:2))+'%';
}
function redraw(){draw();}

/* ══ ZOOM & PAN ══ */
function markTouched(){const latest=liveInsets;cancelLiveViewport();uiState.userTouchedCanvas=true;if(latest)applyViewportInsets(latest,{duration:0});cancelAnimationFrame(_raf);_raf=null;cancelAnimationFrame(kbLift.animId);kbLift.animId=null;}
const zoomFactor=()=>Math.max(2.5,layoutPreferences.branchScale);
function zoomAt(cx,cy,f=zoomFactor()){
  const ns=st.scale*f;
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
  e.preventDefault();clearTap();canvasActivity();markTouched();
  const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;
  const ns=st.scale*(e.deltaY<0?1.1:0.9);
  st.panX=mx-(mx-st.panX)*(ns/st.scale);st.panY=my-(my-st.panY)*(ns/st.scale);
  st.scale=ns;redraw();
},{passive:false});
// Outside UI actions invalidate pending taps before their confirmation timer fires.
for(const type of ['pointerdown','touchstart'])listen(document,type,e=>{if(!canvas.contains(e.target))clearTap();},{capture:true,passive:true});
listen(document,'keydown',clearTap,true);
listen(canvas,'pointerdown',e=>{gesture.pointerType=e.pointerType;});
listen(canvas,'mousedown',e=>{
  if(paused||performance.now()<gesture.suppressMouseUntil||e.sourceCapabilities?.firesTouchEvents)return;
  canvasActivity();
  if(e.button===0)tapPress('mouse',e.clientX,e.clientY,4);else clearTap();
  gesture.suppressAux=false;
  const desktop=gesture.pointerType==='mouse'&&!ipadSafari&&!/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)&&window.matchMedia('(any-pointer:fine) and (any-hover:hover)').matches;
  if(e.button===1&&e.ctrlKey&&desktop){
    e.preventDefault();markTouched();gesture.drag=null;gesture.suppressAux=true;
    const r=canvas.getBoundingClientRect();gesture.mouseZoom={x:e.clientX,y:e.clientY,scale:st.scale,panX:st.panX,panY:st.panY,anchorX:e.clientX-r.left,anchorY:e.clientY-r.top,factor:zoomFactor()};
  }else gesture.drag={sx:e.clientX-st.panX,sy:e.clientY-st.panY,x:e.clientX,y:e.clientY,time:performance.now(),button:e.button,moved:false};
  canvas.style.cursor='grabbing';
});
listen(window,'mousemove',e=>{
  const z=gesture.mouseZoom;
  if(z){
    if(!e.ctrlKey||!(e.buttons&4)){cancelGestures();return;}
    e.preventDefault();canvasActivity();
    const dx=e.clientX-z.x,dy=e.clientY-z.y,distance=dx*dy<=0?Math.sign(dx-dy)*Math.hypot(dx,dy):dx-dy;
    const scale=z.scale*Math.pow(z.factor,distance/200),panX=z.anchorX-(z.anchorX-z.panX)*scale/z.scale,panY=z.anchorY-(z.anchorY-z.panY)*scale/z.scale;
    if([scale,panX,panY].every(Number.isFinite)&&scale>0){st.scale=scale;st.panX=panX;st.panY=panY;redraw();}return;
  }
  if(!gesture.drag)return;
  const nx=e.clientX-gesture.drag.sx,ny=e.clientY-gesture.drag.sy;
  if(!gesture.drag.moved&&(Math.abs(e.clientX-gesture.drag.x)>1||Math.abs(e.clientY-gesture.drag.y)>1)){gesture.drag.moved=true;clearTap();canvasActivity();markTouched();}
  st.panX=nx;st.panY=ny;redraw();
});
listen(window,'mouseup',e=>{
  if(gesture.mouseZoom){if(e.button===1){e.preventDefault();cancelGestures();}return;}
  const drag=gesture.drag;if(!drag)return;gesture.drag=null;canvas.style.cursor='grab';
  if(drag.button===0&&e.button===0&&!drag.moved&&performance.now()-drag.time<=250&&Math.abs(e.clientX-drag.x)<=1&&Math.abs(e.clientY-drag.y)<=1&&insideCanvas(e.clientX,e.clientY))tapRelease('mouse',e.clientX,e.clientY);else clearTap();
});
listen(canvas,'auxclick',e=>{if(e.button===1&&(gesture.suppressAux||e.ctrlKey)){e.preventDefault();gesture.suppressAux=false;}});
listen(window,'keyup',e=>{if(gesture.mouseZoom&&(e.key==='Control'||!e.ctrlKey))cancelGestures();});
listen(window,'blur',cancelGestures);
listen(document,'visibilitychange',()=>{if(document.hidden)cancelGestures();});
listen(canvas,'pointercancel',cancelGestures);
listen(canvas,'dblclick',e=>{
  e.preventDefault(); // The custom release/press recognizer is the only double-gesture owner.
});
function td(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);}
function tm(t){const r=canvas.getBoundingClientRect();return{x:(t[0].clientX+t[1].clientX)/2-r.left,y:(t[0].clientY+t[1].clientY)/2-r.top};}
function applyPinch(touches){
  if(touches.length!==2||gesture.t1d===null)return;
  const nd=td(touches),m=tm(touches),ns=st.scale*nd/gesture.t1d;
  if(!(nd>0&&gesture.t1d>0&&Number.isFinite(ns)&&ns>0))return;
  if(!uiState.userTouchedCanvas&&Math.abs(ns/st.scale-1)>0.001)markTouched();
  st.panX=m.x-(m.x-st.panX)*(ns/st.scale);st.panY=m.y-(m.y-st.panY)*(ns/st.scale);
  st.scale=ns;gesture.t1d=nd;
}
function promotePinch(touches){clearTap();clearTwoCandidate();gesture.lastTwo=null;if(gesture.sequence)gesture.sequence.established=true;applyPinch(touches);}
function trackTwo(touches){
  const tap=gesture.twoTap;if(!tap)return false;
  for(const t of touches){const original=tap.points.get(t.identifier);if(!original)return false;tap.latest.set(t.identifier,{identifier:t.identifier,clientX:t.clientX,clientY:t.clientY});if(Math.hypot(t.clientX-original.clientX,t.clientY-original.clientY)>6)return false;}
  const points=[...tap.latest.values()],mid=tm(points);
  return Math.hypot(mid.x-tap.mid.x,mid.y-tap.mid.y)<=6&&Math.abs(td(points)-tap.distance)<=6;
}
listen(canvas,'touchstart',e=>{
  e.preventDefault();if(paused)return;canvasActivity();gesture.suppressMouseUntil=performance.now()+800;
  const now=performance.now();
  if(!gesture.sequence&&e.touches.length>=2)gesture.sequence={time:now,multi:true,established:false};
  if(e.touches.length===1&&!gesture.sequence){
    const t=e.touches[0];tapPress('one-touch',t.clientX,t.clientY,40);gesture.sequence={time:now,multi:false,established:false,firstId:t.identifier};
    gesture.drag={sx:t.clientX-st.panX,sy:t.clientY-st.panY};gesture.startX=t.clientX;gesture.startY=t.clientY;gesture.touchMoved=false;gesture.t1d=null;
  }else if(e.touches.length===2){
    const seq=gesture.sequence;gesture.drag=null;gesture.touchMoved=true;gesture.lastTapTime=0;gesture.t1d=td(e.touches);
    if(seq)seq.multi=true;
    if(ipadSafari&&seq&&!seq.established&&now-seq.time<=100){
      clearTwoCandidate();const points=Array.from(e.touches,t=>({identifier:t.identifier,clientX:t.clientX,clientY:t.clientY}));
      const origins=points.map(t=>t.identifier===seq.firstId?{...t,clientX:gesture.startX,clientY:gesture.startY}:t);
      const pairMid=tm(e.touches),rect=canvas.getBoundingClientRect();tapPress('two-touch',pairMid.x+rect.left,pairMid.y+rect.top,40);
      gesture.twoTap={points:new Map(origins.map(t=>[t.identifier,t])),latest:new Map(points.map(t=>[t.identifier,t])),mid:tm(e.touches),distance:td(e.touches),released:new Set()};
      gesture.twoTimer=setTimeout(()=>{gesture.twoTimer=null;if(gesture.twoTap){const touches=[...gesture.twoTap.latest.values()].filter(t=>!gesture.twoTap.released.has(t.identifier));promotePinch(touches);redraw();}},Math.max(0,251-(now-seq.time)));
    }else{clearTap();clearTwoCandidate();gesture.lastTwo=null;if(seq)seq.established=true;}
  }else if(e.touches.length>2){clearTap();clearTwoCandidate();gesture.lastTwo=null;gesture.lastTapTime=0;gesture.drag=null;gesture.t1d=null;if(gesture.sequence){gesture.sequence.multi=true;gesture.sequence.established=true;}}
},{passive:false});
listen(canvas,'touchmove',e=>{
  e.preventDefault();if(paused)return;canvasActivity();
  if(gesture.twoTap){if(trackTwo(e.touches)&&performance.now()-gesture.sequence.time<=250)return;promotePinch(e.touches);}
  else if(e.touches.length===1&&gesture.drag&&!gesture.sequence?.multi){
    const dx=e.touches[0].clientX-gesture.startX,dy=e.touches[0].clientY-gesture.startY;
    if(!gesture.touchMoved&&Math.hypot(dx,dy)>3){gesture.touchMoved=true;clearTap();gesture.sequence.established=true;gesture.lastTwo=null;markTouched();}
    st.panX=e.touches[0].clientX-gesture.drag.sx;st.panY=e.touches[0].clientY-gesture.drag.sy;
  }else if(e.touches.length===2&&gesture.t1d!==null)applyPinch(e.touches);
  redraw();
},{passive:false});
listen(canvas,'touchend',e=>{
  gesture.suppressMouseUntil=performance.now()+800;
  const seq=gesture.sequence;if(!seq)return;
  if(gesture.twoTap){
    const valid=trackTwo([...e.touches,...e.changedTouches]),tap=gesture.twoTap;
    for(const t of e.changedTouches)tap.released.add(t.identifier);
    if(!valid||performance.now()-seq.time>250){clearTap();clearTwoCandidate();gesture.lastTwo=null;}
    else if(e.touches.length===0&&tap.released.size===2){
      const mid=tm([...tap.latest.values()]),r=canvas.getBoundingClientRect();tapRelease('two-touch',mid.x+r.left,mid.y+r.top,true);
      clearTwoCandidate();
    }
  }
  if(e.touches.length)return;
  if(!seq.multi)gesture.lastTwo=null;
  if(!seq.multi&&!gesture.touchMoved&&performance.now()-seq.time<=250&&e.changedTouches.length===1&&Math.hypot(e.changedTouches[0].clientX-gesture.startX,e.changedTouches[0].clientY-gesture.startY)<=3&&insideCanvas(e.changedTouches[0].clientX,e.changedTouches[0].clientY)){
    const now=performance.now(),t=e.changedTouches[0],tx=t.clientX,ty=t.clientY;
    tapRelease('one-touch',tx,ty);
  }else if(!seq.multi){clearTap();gesture.lastTapTime=0;}
  gesture.drag=null;gesture.t1d=null;gesture.touchMoved=false;gesture.sequence=null;
});
listen(canvas,'touchcancel',cancelGestures);
/* ══ STRING INPUT / SETTINGS ══ */
function schedRender(){pendingRender=true;clearTimeout(rtimer);if(paused){rtimer=null;return;}rtimer=setTimeout(()=>{rtimer=null;render();},C.RENDER_DEBOUNCE);}
function flushRender(){clearTimeout(rtimer);rtimer=null;render();}
function render(){
  if(liveFrame!==null&&!holdDrawing){pendingRender=true;return;}
  if(paused){pendingRender=true;return;}
  pendingRender=false;
  const text=sourceText;
  const isBlank=!text.trim();
  if(isBlank)layoutPreferences.observeBlank(sourceReady,sourceStats);
  if(isBlank){
    cancelAnimationFrame(_raf);cancelAnimationFrame(kbLift.animId);
    st.lay=null;pendingColor=false;uiState.userTouchedCanvas=false;emptyEl.style.display='flex';draw();return;
  }
  const root=parse(text);if(!root)return;
  flagPlaceholders(root,sourcePlaceholders);attachNodeTexts(root,sourceNodeTexts);attachPresentation(root,sourcePresentation);layoutPreferences.observeRoot(root,sourceReady,sourceStats);
  const prevLay=st.lay;
  st.lay=layout(root,uiState.colorSeed);st.lay.hasDescriptions=!!(sourceNodeTexts&&sourceNodeTexts.some(text=>text.includes('\n')));pendingColor=false;emptyEl.style.display='none';
  const bounds=contentBounds(st.lay);fitBounds.set(st.lay,bounds);
  layoutTransitions.set(st.lay,{scale:layoutPreferences.branchScale,revision:sourceRevision,bounds});
  if(uiState.userTouchedCanvas&&prevLay){
    if(presentationChanged||layoutTransitions.get(prevLay)?.scale!==layoutPreferences.branchScale)preserveViewportAcrossScaleChange(prevLay,st.lay);
    else if(st.lay.MD!==prevLay.MD)preserveViewportAcrossLayoutChange(prevLay,st.lay);
  }
  if(!holdDrawing&&canvas.clientWidth>0&&canvas.clientHeight>0&&!uiState.userTouchedCanvas)autoFit();
  presentationChanged=false;lastPresentationRender=performance.now();draw();
}
function setText(text,options={}){
  if(destroyed)return;
  const indexes=options&&options.placeholderNodes;
  const placeholders=Array.isArray(indexes)?[...new Set(indexes.filter(i=>Number.isInteger(i)&&i>=0))].sort((a,b)=>a-b):[];
  text=String(text??'');
  let nodeTexts=null;
  if(options&&'nodeTexts' in options){
    const values=options.nodeTexts,count=text.split('\n').filter(line=>line.trim().replace(/^[-*•]\s+/,'').trim()).length;
    if(!Array.isArray(values)||values.length!==count||values.some(v=>typeof v!=='string')){const error=new TypeError('Node description metadata does not match the map outline');reportError(error);throw error;}
    nodeTexts=values.slice();
  }
  let stats=null;
  if(options&&'outlineStats' in options){const value=options.outlineStats;
    if(!value||!Number.isSafeInteger(value.maxDepth)||value.maxDepth<0||!Number.isSafeInteger(value.maxSiblings)||value.maxSiblings<0){const error=new TypeError('Invalid complete-outline statistics');reportError(error);throw error;}
    stats={maxDepth:value.maxDepth,maxSiblings:value.maxSiblings};
  }
  let presentation=null;
  if(options&&'nodePresentation' in options){
    const values=options.nodePresentation,count=text.split('\n').filter(line=>line.trim().replace(/^[-*•]\s+/,'').trim()).length;
    if(!Array.isArray(values)||values.length!==count||values.some(p=>!p||!['node','spacer'].includes(p.kind)||mapSizeUnits(p.mapSize)===null)){const error=new TypeError('Invalid node presentation metadata');reportError(error);throw error;}
    presentation=values.map(p=>({kind:p.kind,mapSize:mapSizeUnits(p.mapSize)/MAP_SIZE_UNITS}));
    const parsed=parse(text),stack=parsed?(parsed.synthetic?parsed.children.slice().reverse():[parsed]):[];let index=0;
    while(stack.length){const n=stack.pop(),p=presentation[index];if(p.kind==='spacer'&&(n.children.length||nodeTexts&&nodeTexts[index]!=='')){const error=new TypeError('A spacer must be an empty leaf');reportError(error);throw error;}index++;for(let i=n.children.length-1;i>=0;i--)stack.push(n.children[i]);}
  }
  if(text===sourceText&&JSON.stringify(presentation)===JSON.stringify(sourcePresentation)&&placeholders.join(',')===sourcePlaceholders.join(',')&&JSON.stringify(nodeTexts)===JSON.stringify(sourceNodeTexts)&&JSON.stringify(stats)===JSON.stringify(sourceStats))return;
  const onlyPresentation=text===sourceText&&JSON.stringify(nodeTexts)===JSON.stringify(sourceNodeTexts)&&JSON.stringify(stats)===JSON.stringify(sourceStats)&&placeholders.join(',')===sourcePlaceholders.join(',');
  if(!onlyPresentation)sourceRevision++;presentationChanged=presentationChanged||onlyPresentation;sourceStats=stats;sourcePresentation=presentation;sourceReady=true;
  sourceText=text;sourcePlaceholders=placeholders;sourceNodeTexts=nodeTexts;
  if(!text.trim())flushRender();else if(onlyPresentation){pendingRender=true;if(!paused&&rtimer===null)rtimer=setTimeout(()=>{rtimer=null;render();},Math.max(0,50-(performance.now()-lastPresentationRender)));}else schedRender();
}
function getSettingBounds(){return layoutPreferences.getSettingBounds();}
function getSettings(){return{...layoutPreferences.getSettings(),colorSeed:uiState.colorSeed};}
function setSettings(partial={}){
  if(destroyed)return getSettings();
  if(!paused&&rtimer!==null)flushRender();
  const before=JSON.stringify(getSettings());
  layoutPreferences.apply(partial);
  if('colorSeed' in partial){const v=String(partial.colorSeed).trim();if(v!=='')uiState.colorSeed=Math.max(0,parseInt(v,10)||0);}
  if(before===JSON.stringify(getSettings()))return getSettings();
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
const observer=new ResizeObserver(guarded(()=>{if(paused){return;}cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{resizeFrame=null;if(viewportManaged){setViewportInsets(liveInsets||viewportInsets,{duration:200,live:liveViewport});return;}resizeCanvas();});}));
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
  clearTap();
  if(destroyed)return;cancelGestures();destroyed=true;pendingColor=false;highlightCache=null;searchQuery='';
  observer.disconnect();listeners.forEach(remove=>remove());
  timers.forEach(id=>window.clearTimeout(id));frames.forEach(id=>window.cancelAnimationFrame(id));
  objectURLs.forEach(url=>URL.revokeObjectURL(url));objectURLs.clear();
  style.remove();owned.remove();if(ownsFont)fontLink.remove();
  container.removeAttribute('aria-busy');container.classList.remove('chrome-managed');container.classList.toggle('map-covered',hadCoveredClass);if(!hadClass)container.classList.remove('moa-mindmap');
}
resizeCanvas();render();
if(opts.settings)setSettings(opts.settings);
if(!ownsFont)loadFonts();
return{setText,fit,getSettings,setSettings,exportPDF,resetView,destroy,setViewportInsets,getSettingBounds,setChromeOcclusion,setColorSeed,setSearchQuery};
}
window.MindMap={version:'1.12.0',apiVersion:1,capabilities:['text-input','viewport-fit','settings-v1','pdf-export','reset-view','placeholderNodes','viewport-insets','settings-bounds','chrome-occlusion','live-viewport-fit','color-seed-only','node-descriptions','branch-layout-v1','root-layout-v1','root-order-v1','branch-scale-v1','branch-length-limit-v1','canvas-interaction-v1','search-highlight-v1','node-presentation-v1','node-presentation-v2','confirmed-single-tap-v1'],mount};
})();
