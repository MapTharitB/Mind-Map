/* MindMap 1.20.6 | apiVersion 1 | Classic mountable module.
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
  let destroyed=false,pdfBusy=false,sourceText='',sourceNodeIds=null,sourcePlaceholders=[],sourceNodeTexts=null,sourceTitleLines=null,sourceStats=null,sourcePresentation=null,sourceHasChildren=null,presentationChanged=false,lastPresentationRender=0,sourceReady=false,rtimer=null,sourceRevision=0,layoutSettingsRevision=0;
  let pdfPhotoLease=null;
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
// Canonical child presence is independent of collapse, pruning and spacers.
function realFamily(node,depth){
  const children=node.children.filter(ch=>ch.kind!=='spacer');
  return{children,depth,count:children.length,hasLeaf:children.some(ch=>!(ch.canonicalHasChildren??ch.children.some(n=>n.kind!=='spacer')))};
}
function createLayoutPreferences(){
let branchScale=DEFAULT_BRANCH_SCALE;
let lengthLimitEnabled=false,lengthLimitRatio=1.5;
let hlimitInf=true,hlimitN=3,d1Max=Infinity,wrapBoundsReady=false;
let rootEnabled=false,rootCount=3,rootFollowMax=false,visibleRootCount=0,completeRootCount=0,rootOrder='down',families=[];
const rootMaximum=()=>Math.max(1,completeRootCount-1);
const rootEffective=()=>rootFollowMax?rootMaximum():Math.min(rootCount,rootMaximum());
let allowLeaves=true,levelsEnabled=false,levelsN=1,siblingLimitEnabled=true,siblingLimitN=3,branchDepthMax=1,branchSiblingMax=1,branchBoundsReady=false,levelsCountChosen=false,siblingCountChosen=false;
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
  if(deeper&&typeof deeper==='object'){if(typeof deeper.allowLeaves==='boolean')allowLeaves=deeper.allowLeaves;if(typeof deeper.enabled==='boolean')levelsEnabled=deeper.enabled;if('levels' in deeper){const next=safeCount(deeper.levels,1,branchDepthMax,levelsN);levelsCountChosen=Number(deeper.levels)!==1;levelsN=next;}}
  if(siblings&&typeof siblings==='object'){if(typeof siblings.enabled==='boolean')siblingLimitEnabled=siblings.enabled;if('count' in siblings){const next=safeCount(siblings.count,1,branchSiblingMax,siblingLimitN);siblingCountChosen=Number(siblings.count)!==3;siblingLimitN=next;}}
  // Latest owner policy: activating either layout switches the other off.
  // If an API/bootstrap request supplies both true, LEVELS wins deterministically.
  // Latest owner override: WRAP and LEVELS persist and act independently.
}
function updateBranchBounds(root,sourceReady,sourceStats){
  if(!sourceReady)return;
  let stats=sourceStats;
  if(!stats){let depth=0,siblings=0;const walk=(n,d)=>{if(n.kind==='spacer')return;depth=Math.max(depth,d);siblings=Math.max(siblings,n.children.filter(ch=>ch.kind!=='spacer').length);n.children.forEach(ch=>walk(ch,d+1));};if(root)(root.synthetic?root.children:[root]).forEach(n=>walk(n,0));stats={maxDepth:depth,maxSiblings:siblings};}
  const nextDepth=Math.max(1,stats.maxDepth),nextSiblings=Math.max(1,stats.maxSiblings);
  const follow=(value,previous,next,min,chosen)=>chosen&&branchBoundsReady&&value===previous&&next>previous?next:clamp(value,min,next);
  levelsN=levelsCountChosen?follow(levelsN,branchDepthMax,nextDepth,1,true):clamp(1,1,nextDepth);siblingLimitN=siblingCountChosen?follow(siblingLimitN,branchSiblingMax,nextSiblings,1,true):clamp(3,1,nextSiblings);
  branchDepthMax=nextDepth;branchSiblingMax=nextSiblings;branchBoundsReady=true;
}

function observeRoot(root,sourceReady,sourceStats){
  updateBranchBounds(root,sourceReady,sourceStats);
  const roots=(root.synthetic?root.children:[root]).filter(n=>n.kind!=='spacer');visibleRootCount=roots.length;
  completeRootCount=sourceStats?.rootCount??visibleRootCount;
  families=[];const walk=(n,d)=>{const family=realFamily(n,d+1);if(family.count>=2)families.push({depth:family.depth,count:family.count,hasLeaf:family.hasLeaf});family.children.forEach(ch=>walk(ch,d+1));};roots.forEach(n=>walk(n,0));
  const nd=Math.max(1,sourceStats?.maxFirstLevel??Math.max(0,...roots.map(n=>realFamily(n,1).count)));
  if(!wrapBoundsReady||nd!==d1Max){
    wrapBoundsReady=true;
    const prevCap=hlimitCap(d1Max);d1Max=nd;
    const newCap=hlimitCap(d1Max);
    if(hlimitInf&&hlimitN===prevCap)hlimitN=newCap;
    if(hlimitN>newCap)hlimitN=newCap;
  }
}
function observeBlank(sourceReady,sourceStats){
  updateBranchBounds(null,sourceReady,sourceStats);visibleRootCount=0;completeRootCount=sourceStats?.rootCount??0;families=[];
const next=Math.max(1,sourceStats?.maxFirstLevel??1);if(d1Max!==next||sourceReady&&!wrapBoundsReady){d1Max=next;if(hlimitN>hlimitCap(next))hlimitN=hlimitCap(next);}if(sourceReady)wrapBoundsReady=true;
}
function depthEligible(family){return family.count>=2&&family.depth>=2&&family.depth<=levelsN+1;}
function leafEligible(family){return depthEligible(family)&&(allowLeaves||!family.hasLeaf);}
function horizontalFamily(node){const family=realFamily(node,(node.layoutDepth??node.depth)+1);return levelsEnabled&&leafEligible(family)&&(!siblingLimitEnabled||family.count<=siblingLimitN);}
function getSettingBounds(){
const deeperAvailable=families.some(f=>f.count>=2&&f.depth>=2),limitsAvailable=levelsEnabled&&families.some(leafEligible);
return{lengthLimit:{min:1,max:10,step:0.1,precision:2,default:1.5,available:limitsAvailable},branchScale:{min:MIN_BRANCH_SCALE,max:MAX_BRANCH_SCALE,step:0.1,precision:2,default:DEFAULT_BRANCH_SCALE},rootLayout:{min:1,max:rootMaximum(),available:visibleRootCount>=2,effectiveCount:rootEffective()},horizontalLimit:{min:1,max:hlimitCap(d1Max),available:families.some(f=>f.depth===1&&f.count>=2)},deeperHorizontal:{min:1,max:branchDepthMax,available:deeperAvailable,leavesAvailable:levelsEnabled&&families.some(f=>depthEligible(f)&&f.hasLeaf)},siblingLimit:{min:1,max:branchSiblingMax,available:limitsAvailable}};}
function getSettings(){return{lengthLimit:{enabled:lengthLimitEnabled,ratio:lengthLimitRatio},branchScale,rootLayout:{enabled:rootEnabled,count:rootCount,followMax:rootFollowMax,order:rootOrder},horizontalLimit:{enabled:!hlimitInf,count:hlimitN},deeperHorizontal:{enabled:levelsEnabled,levels:levelsN,allowLeaves},siblingLimit:{enabled:siblingLimitEnabled,count:siblingLimitN}};}
return {apply,observeRoot,observeBlank,getSettings,getSettingBounds,horizontalFamily,
  get lengthLimitEnabled(){return lengthLimitEnabled;},
  get lengthLimitRatio(){return lengthLimitRatio;},
  get branchScale(){return branchScale;},
  get rootEnabled(){return rootEnabled;},
  get rootOrder(){return rootOrder;},
  get rootEffective(){return rootEffective();},
  get hlimitInf(){return hlimitInf;},
  get hlimitN(){return hlimitN;},
  get levelsEnabled(){return levelsEnabled;}
};
}
const layoutPreferences=createLayoutPreferences();
function safeFileName(label){
  return(label||'MindMap').replace(/[\/\\?%*:|"<>]/g,'-').trim()||'MindMap';
}

const C={
  BASE_FONT:10,LINE_H:1.5,DESC_GAP_R:0.25,
  GAP_R:0.75,SUB_GAP_R:0.20125,CHILD_STEP_R:0.85,RISE_PAD_R:0.70,LOWER_THAI_CHILD_R:1.5,LOWER_THAI_FANOUT_FRAC:0.5,
  D0_D1_GAP_MULT:1.145,D1_TXT_PAD_R:0.105,
  D1_ROW_GAP_R:0.195,SIBLING_GAP_R:0.135,D1_ARM_FLOOR_R:0.5,
  THAI_TIER1_R:0.08,THAI_TIER2_R:0.18,THAI_TIER3_R:0.30,THAI_TIER3_FIRSTROW_R:0.45,
  CAP_FRAC:0.70,
  VG_FRAC:0.85,BASE_LINE:0.6,BASE_GAP:50,
  LEFT_M:80,RIGHT_M:80,TOP_M:60,BOT_M:100,
  BUS_MID:0.4,
  ARM_K:0.54,INCOMING_PAD_R:0.30,HORIZONTAL_GAP_MULT:1.75,
  BG:'#F5F4EE',
  FONT:"'Sarabun',system-ui,-apple-system,sans-serif",
  BASELINE_FRAC:   0.82,
  MAX_SAFE_FONT:   500,
  RENDER_DEBOUNCE: 180,
  BTN_DRAG_THRESH: 14,
  ANIM_FIT:        300,
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
    canonicalTexts.set(n,{text:lbl,titleStart:0});
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
    const node=stack.pop();node.outlineId=sourceNodeIds?.[index];node.placeholder=flagged.has(index++);
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
// Search highlights retain grapheme boundaries for Thai marks.
const descriptionGraphemes=typeof Intl.Segmenter==='function'?new Intl.Segmenter('th',{granularity:'grapheme'}):null;
function descriptionSize(node,MD){
  return 0.75*fsz(node.depth+1,MD)*(node.mapSize??1);
}
// Halve free interline whitespace; measured Thai/Latin ink retains its existing safety gap.
function textLineAdvance(previous,ink,fs){
  const occupied=previous.descent+ink.ascent;
  return occupied+Math.max((fs*C.LINE_H-occupied)*0.5,fs*C.DESC_GAP_R);
}
// Average within one font-size section; never let descriptions compress title lines.
function averageTextBaselines(runs,start=0){
  const count=runs.length-start;if(count<3)return;
  const first=runs[start].baseline,advance=(runs[runs.length-1].baseline-first)/(count-1);
  for(let i=1;i<count-1;i++)runs[start+i].baseline=first+i*advance;
}
function measureTextBlock(node,MD){
  if(node.kind==='spacer')return{runs:[],width:node.fs,minX:0,maxX:node.fs,bottom:node.fs*C.LINE_H,extraHeight:0};
  const source=canonicalTexts.get(node),lines=node.titleLines??[node.label],metrics=lines.map(text=>inkMetrics(text,node.fs,node.fw)),titleWidth=Math.max(...metrics.map(ink=>ink.width));
  const runs=[];let offset=source?.titleStart??0;
  for(let i=0;i<lines.length;i++){
    const text=lines[i],ink=metrics[i],previous=runs[i-1];
    const baseline=previous?previous.baseline+textLineAdvance(previous,ink,node.fs):node.fs*C.BASELINE_FRAC;
    const run={text,fs:node.fs,fw:node.fw,x:0,baseline,...ink,description:false};
    if(source&&text.length)runSources.set(run,{start:offset,end:offset+text.length});offset+=text.length+1;runs.push(run);
  }
  averageTextBaselines(runs);
  const title=runs[runs.length-1],baseline=title.baseline,titleBottom=node.titleLines?node.fs+baseline-node.fs*C.BASELINE_FRAC:node.fs;
  let width=titleWidth,bottom=titleBottom;
  if(node.description!==undefined){
    let offset=source?.descriptionStart??0;
    const fs=descriptionSize(node,MD),gap=fs*C.DESC_GAP_R,lines=node.description.split('\n');
    let previous=null;
    for(const text of lines){
      const ink=inkMetrics(text,fs,'normal');
      const y=previous?previous.baseline+textLineAdvance(previous,ink,fs):Math.max(titleBottom,baseline+title.descent)+gap+(title.descent>node.fs*0.02?title.descent*0.5:0)+Math.max(fs*C.BASELINE_FRAC,ink.ascent);
      const run={text,fs,fw:'normal',x:0,baseline:y,...ink,description:true};if(source)runSources.set(run,{start:offset,end:offset+text.length});offset+=text.length+1;runs.push(run);previous=run;width=Math.max(width,ink.width);
    }
    averageTextBaselines(runs,runs.length-lines.length);
    bottom=previous.baseline+Math.max(previous.descent,fs*(C.LINE_H-C.BASELINE_FRAC));
  }
  const block={runs,titleWidth,descriptionWidth:runs.reduce((w,run)=>run.description?Math.max(w,run.width):w,0),width,bottom,extraHeight:Math.max(0,bottom-node.fs)};
  if(node.titleLines?.length>1&&node.description===undefined){
    for(let i=runs.length-1;i>=0;i--){
      const run=runs[i];
      if(run.text.trim()&&run.right+run.left>0){block.lastTitleInk=run;break;}
    }
  }
  alignTextBlock(block,false);
  return block;
}
const centeredTitleX=(block,run)=>(block.titleWidth-run.width)/2;
// Ordinary alignment follows incoming placement. Correct a missed outgoing shaft using visible ink.
function titleStartOverSpine(block,spine){
  const run=block.lastTitleInk,centered=centeredTitleX(block,run),left=-run.left,right=run.right;
  const tolerance=1e-9*Math.max(1,Math.abs(spine),Math.abs(centered+left),Math.abs(centered+right));
  if(spine>=centered+left-tolerance&&spine<=centered+right+tolerance)return null;
  if(spine<left-tolerance)return null; // Preserve leading indentation.
  return spine<=right+tolerance?0:spine-(left+right)/2;
}
// All consumers share these measured run coordinates, including independently aligned descriptions.
function alignTextBlock(block,leftAligned,descriptionLeftAligned=leftAligned,descriptionAnchor=block.descriptionAnchor??0,titleStart=null){
  if(!block.runs.length)return false;
  block.leftAligned=leftAligned;block.descriptionAnchor=descriptionAnchor;
  // A short left-aligned paragraph sits over its outgoing shaft; longer ones stop at the left edge.
  const descriptionX=Math.max(0,descriptionAnchor-block.descriptionWidth/2);
  let changed=false;
  for(const run of block.runs){
    const x=run.description?(descriptionLeftAligned?descriptionX:centeredTitleX(block,run)):
      titleStart??(leftAligned?0:centeredTitleX(block,run));
    changed=changed||run.x!==x;run.x=x;
  }
  block.minX=block.runs.reduce((min,run)=>Math.min(min,run.x-run.left),0);
  block.maxX=block.runs.reduce((max,run)=>Math.max(max,run.x+Math.max(run.width,run.right)),block.titleWidth);
  block.width=titleStart!==null||block.runs.some(run=>run.description)?block.maxX-block.minX:block.titleWidth;
  return changed;
}
function attachNodeTexts(root,texts,counts){
  if(!texts)return;
  let index=0;
  const walk=n=>{
    if(!n.synthetic){const count=counts?.[index]??1,text=texts[index++];let at=-1;for(let i=0;i<count;i++){at=text.indexOf('\n',at+1);if(at<0)break;}
      const title=count>1?(at<0?text:text.slice(0,at)):(at<0?text:text.slice(0,at)).trim();n.label=count>1?title:title||'(Untitled)';n.placeholder=count===1&&!title;
      if(count>1)n.titleLines=title.split('\n');
      const rawTitle=at<0?text:text.slice(0,at),titleStart=count>1?0:rawTitle.length-rawTitle.trimStart().length;canonicalTexts.set(n,{text,titleStart,...(at>=0?{descriptionStart:at+1}:{})});
      if(at>=0)n.description=text.slice(at+1);}
    n.children.forEach(walk);
  };walk(root);
}
function attachPresentation(root,values){
  if(!values)return;let index=0;const walk=n=>{if(!n.synthetic){const p=values[index++];n.mapSize=p.mapSize;n.kind=p.kind;if(p.photos){n.photos=p.photos;if(n.placeholder){n.label='';n.placeholder=false;}}if(p.childrenInRow)n.childrenInRow=true;if(n.kind==='spacer'){n.label='';delete n.description;delete n.titleLines;n.placeholder=false;canonicalTexts.delete(n);}}n.children.forEach(walk);};walk(root);
  // A new spacer root is an occupied slot, never an extra real font/color level.
  if(root.synthetic&&root.children.filter(n=>n.kind!=='spacer').length<=1){root.depth=-1;const shift=n=>{n.depth--;n.children.forEach(shift);};root.children.forEach(shift);}
}
function attachChildPresence(root,values){
  if(!values)return;let index=0;const walk=n=>{if(!n.synthetic)n.canonicalHasChildren=values[index++];n.children.forEach(walk);};walk(root);
}
const titleWidth=n=>n.kind==='spacer'?n.fs:n.textBlock.titleWidth;
const nodeWidth=n=>n.textBlock.width;

// Descriptions reserve two visual font levels, never real tree depth/statistics.
function hasDescription(n){return n.description!==undefined||n.children.some(hasDescription);}
const isPhotoOnly = node => node.photos?.length && !node.label.trim() && node.description === undefined;
function visualMaxD(root){
  let depth=0;
  const walk=node=>{
    if(!node.synthetic&&node.kind!=='spacer'&&!isPhotoOnly(node))depth=Math.max(depth,node.depth+(node.description!==undefined?2:0));
    node.children.forEach(walk);
  };
  walk(root);return depth;
}

/* ══ ARM / SPINE HELPERS ══ */
const armLen=(d,MD)=>fsz(d,MD)*C.ARM_K;
// Ephemeral direct-child metrics: no spacer/synthetic vote and no inherited growth.
function prepareFamily(node,MD){
  let count=0,votes=0,sum=0,first=1,max=1,homogeneous=true,unit=0;
  for(const ch of node.children){
    if(ch.kind==='spacer')continue;
    count++;unit=Math.max(unit,ch.baseFs);
    if(isPhotoOnly(ch))continue;
    const value=Math.max(1,ch.mapSize??1);
    if(!votes)first=value;else if(value!==first)homogeneous=false;
    votes++;sum+=Math.log(value);max=Math.max(max,value);
  }
  const growth=node.synthetic||!votes?1:homogeneous?first:clamp(Math.exp(sum/votes),1,max);
  node.family={count,growth,unit:unit||Math.max(0,...node.children.map(ch=>ch.baseFs))};
  for(const ch of node.children)ch.incomingWidth=familyWidth(node,ch.depth,MD);
}
const grow=(node,value)=>node.family.growth===1?value:value*node.family.growth;
const familyWidth=(node,d,MD)=>grow(node,lnW(d,MD));
const familyArm=(node,d,MD)=>grow(node,armLen(d,MD));
const familyGap=(node,d,MD)=>grow(node,cgap(d,MD));
const familyUnit=node=>grow(node,node.family.unit);
const structuralTitle=n=>n.structuralTitleWidth;
const familySubGap=node=>grow(node,node.children[0].baseFs*C.SUB_GAP_R*((node.layoutDepth??node.depth)>=1?C.CHILD_STEP_R:1));

// Vertical stack anchor: base-font character rule, direct-child growth, actual title ink cap.
// Exact local defaults and synthetic/spacer helper behavior retain their original arithmetic.
function spineOffsetOf(node){
  const helper=node.synthetic||node.kind==='spacer',fs=helper?node.fs:node.baseFs;
  const c=[...node.label],w1=c.length?mW(c[0],fs,node.fw):0;
  const effectiveLen=c.filter(ch=>!isThaiSpineCombining(ch.codePointAt(0))).length;
  const offset=effectiveLen===1?w1/2:w1;
  if(helper||(node.mapSize??1)===1&&node.family.growth===1)return offset;
  return Math.min(grow(node,offset),Math.max(0,node.textBlock.runs[0].right));
}

function spineXOf(node){return node.x+spineOffsetOf(node);}

function assignSubtreeX(node){
  for(const {node:child,x} of node.subtree.childOffsets){
    child.x=node.x+x;
    assignSubtreeX(child);
  }
}

/* ══ ROOT GRID HELPERS ══ */
function footprintW(node){
  const {minX,maxX}=node.subtree;
  return Math.max(titleWidth(node),maxX-minX);
}
function thaiTierBonusFrac(tier){
  switch(tier){case 1:return C.THAI_TIER1_R;case 2:return C.THAI_TIER2_R;case 3:return C.THAI_TIER3_R;default:return 0;}
}
const siblingBaseGap=(child,parent)=>grow(parent,child.baseFs*C.SIBLING_GAP_R);
function siblingGapDelta(ch,prevLastLeafFs,parent){
  let g=siblingBaseGap(ch,parent);
  if(ch.baseFs>prevLastLeafFs)g+=grow(parent,ch.baseFs*C.RISE_PAD_R);
  g+=ch.fs*thaiTierBonusFrac(ch.thaiTier);
  return g;
}
function lowerThaiChildBonus(parentNode,baseGap){
  return parentNode.hasLower?baseGap*C.LOWER_THAI_CHILD_R:0;
}
function describedChildrenOffset(node,subGap,first=node.children[0],block=node.textBlock){
  return block.bottom+subGap+firstRowUpwardBonus([first],first.fs);
}
function stackedChildrenOffset(node,subGap,sR,first=node.children[0],block=node.textBlock){
  return node.description!==undefined?describedChildrenOffset(node,subGap,first,block):node.fs*C.LINE_H*sR+subGap+lowerThaiChildBonus(node,subGap)+block.extraHeight;
}
const sideConnectorOffset=node=>node.fs*node.capFrac;
const sideConnectorY=node=>node.y+sideConnectorOffset(node);
const occupiedFootprint=row=>row.subtree;
const textFootprint=row=>row.subtree.reference;
function sharesStackDistance(row,anchor){
  return textFootprint(row)?.text&&(!anchor||(!row.canonicalHasChildren&&!row.children.length));
}
// Childless connector rows share a pitch with a minimum based on ink clearance.
function measureStack(columns,spacing,minimum,clearInk=false,anchor=null){
  let sum=0,count=0,floor=anchor?0:Infinity;
  for(const rows of columns){
    let previous;
    for(const row of rows){
      const ref=textFootprint(row);
      if(!sharesStackDistance(row,anchor)){
        // A branch ends the run. Photos and spacers leave the text samples intact.
        if(ref?.text)previous=undefined;
        continue;
      }
      if(previous){
        const prior=textFootprint(previous);
        const advance=prior.height+spacing(previous,row)-(clearInk?Math.min(0,ref.top):0);
        if(anchor){
          const delta=anchor(row)-anchor(previous);
          sum+=advance+delta;
          floor=Math.max(floor,prior.bottom-ref.top+delta+minimum(row));
        }else{
          sum+=advance-prior.bottom+ref.top;
          floor=Math.min(floor,minimum(row));
        }
        count++;
      }
      previous=row;
    }
  }
  return {distance:count?Math.max(sum/count,floor):null,spacing,minimum,anchor};
}
// With photos or spacers, extra clearance affects only the occupied boundary.
function placeStack(rows,start,{distance,spacing,minimum,anchor},visit,footprint=occupiedFootprint){
  let previous,y=start,end=start;
  for(const row of rows){
    const box=footprint(row);
    if(previous){
      const prior=footprint(previous),clearance=prior.bottom-box.top;
      if(distance!==null&&sharesStackDistance(previous,anchor)&&sharesStackDistance(row,anchor)){
        const advance=anchor?Math.max(distance+anchor(previous)-anchor(row),clearance+minimum(row)):clearance+distance;
        y+=advance;
      }else{
        y+=Math.max(prior.height,clearance)+spacing(previous,row);
      }
    }
    visit(row,y);
    end=Math.max(end,y+box.height);
    previous=row;
  }
  return end;
}
// Scale only computed horizontal separation; vertical and spacer footprints stay independent.
function horizontalGap(gap){return gap*C.HORIZONTAL_GAP_MULT;}
function siblingPadding(gap, neighbors){
  const cap = Math.min(...neighbors.map(node => mW('    ', node.fs, node.fw)));
  return Math.min(horizontalGap(gap), cap);
}
function d1ColGap(colA,colB,ARM1,parent){
  const mxA=colA.length?Math.max(...colA.map(ch=>parent?structuralTitle(ch):titleWidth(ch))):0;
  const mxB=colB.length?Math.max(...colB.map(ch=>parent?structuralTitle(ch):titleWidth(ch))):0;
  return siblingPadding(Math.max(ARM1*C.D1_ARM_FLOOR_R,parent?grow(parent,(mxA+mxB)*C.D1_TXT_PAD_R):(mxA+mxB)*C.D1_TXT_PAD_R),colA.concat(colB));
}
const d1RowPadding=(node,parent)=>parent?grow(parent,node.baseFs*C.D1_ROW_GAP_R):node.fs*C.D1_ROW_GAP_R;
const d1RowGap=(node,parent)=>d1RowPadding(node,parent)+node.fs*thaiTierBonusFrac(node.thaiTier);
function firstRowUpwardBonus(nodes,d1Fs){
  if(!nodes.length)return 0;
  nodes=nodes.filter(n=>n.kind!=='spacer'&&!isPhotoOnly(n));if(!nodes.length)return 0;
  const maxTier=Math.max(...nodes.map(n=>n.thaiTier||0));
  if(nodes.some(n=>(n.mapSize??1)!==1))return Math.max(...nodes.map(n=>n.fs*((n.thaiTier||0)===3?C.THAI_TIER3_FIRSTROW_R:thaiTierBonusFrac(n.thaiTier||0))));
  const frac=maxTier===3?C.THAI_TIER3_FIRSTROW_R:thaiTierBonusFrac(maxTier);
  return d1Fs*frac;
}

/* ══ LAYOUT ══ */
function place(node,y){
  node.y=y;
  for(const offset of node.subtree.childOffsets)place(offset.node,y+offset.y);
  return y+node.subtree.height;
}
function annotateNodes(node,MD){
  node.baseFs=fsz(node.depth,MD);
  node.fs=node.baseFs*(isPhotoOnly(node)?1:node.mapSize??1);node.fw=fwt(node.depth);node.capFrac=capCFrac(node.fs,node.fw);
  const block=node.textBlock=measureTextBlock(node,MD);
  const ink=block.runs.filter(run=>run.text.trim());
  node.textGeometry={
    top:ink.length?Math.min(...ink.map(run=>run.baseline-run.ascent)):0,
    bottom:ink.length?Math.max(...ink.map(run=>run.baseline+run.descent)):node.kind==='spacer'?block.bottom:0,
    block:{bottom:block.bottom,extraHeight:block.extraHeight}
  };
  measurePhotos(node,block);
  node.structuralTitleWidth=node.kind==='spacer'?node.baseFs:node.fs===node.baseFs?node.textBlock.titleWidth:Math.max(...(node.titleLines??[node.label]).map(text=>mW(text,node.baseFs,node.fw)));
  node.thaiTier=node.kind==='spacer'?0:thaiHeightTier(node.label);node.hasLower=node.kind!=='spacer'&&hasThaiLower(node.label);
  node.children.forEach(ch=>annotateNodes(ch,MD));prepareFamily(node,MD);
}
function forcesChildRow(node){
  return node.childrenInRow===true&&node.family.count>=2;
}
function stackSpacing(parent){
  return (previous,next)=>siblingGapDelta(next,previous.subtree.reference?.lastLeafBaseFs??previous.baseFs,parent);
}
function horizontalChildrenOffset(node,children,block=node.textBlock){
  const gap=grow(node,node.family.unit*C.GAP_R*C.D0_D1_GAP_MULT);
  return node.fs+block.extraHeight+gap+lowerThaiChildBonus(node,gap)*C.LOWER_THAI_FANOUT_FRAC+firstRowUpwardBonus(children,familyUnit(node));
}
function referenceFootprint(node,horizontal,MD,textSize,stack){
  if(!hasConnector(node))return null;
  const own=node.textGeometry,children=node.children.filter(textFootprint);
  const first=children[0],last=children.at(-1);
  const result={top:own.top,bottom:own.bottom,height:node.fs*C.LINE_H+own.block.extraHeight,
    text:true,lastLeafBaseFs:last?.subtree.reference.lastLeafBaseFs??node.baseFs};
  if(!first)return result;
  const step=node.layoutDepth>=1?C.CHILD_STEP_R:1,subGap=familySubGap(node);
  const firstRef=textFootprint(first);
  const baseGap=grow(node,node.family.unit*C.GAP_R*C.D0_D1_GAP_MULT);
  const ownBottom=Math.max(own.block.bottom,own.bottom);
  let y=horizontal
    ?horizontalChildrenOffset(node,children,own.block)
    :stackedChildrenOffset(node,subGap,step,first,own.block);
  if(textSize){
    const clearance=horizontal?Math.max(baseGap,familyWidth(node,first.depth,MD)*3):subGap;
    const top=horizontal?Math.min(...children.map(child=>child.subtree.reference.top)):firstRef.top;
    y=Math.max(y,ownBottom+clearance-Math.min(0,top));
  }
  const measure=(child,offset)=>{
    const ref=textFootprint(child);
    result.top=Math.min(result.top,offset+ref.top);
    result.bottom=Math.max(result.bottom,offset+ref.bottom);
    result.height=Math.max(result.height,offset+ref.height,result.bottom);
  };
  if(horizontal){
    for(const child of children)measure(child,Math.max(y,own.bottom-textFootprint(child).top));
  }else{
    placeStack(children,Math.max(y,own.bottom-firstRef.top),stack,measure,textFootprint);
  }
  return result;
}
// One bottom-up footprint record per node; placement never remeasures descendants.
function measureSubtree(node,MD,nominal=false,reuseChildren=false,separateRoot=false){
  if(!reuseChildren)node.children.forEach(ch=>measureSubtree(ch,MD,nominal));
  let height=node.fs*C.LINE_H+node.textBlock.extraHeight;
  const children=node.children,offsets=[];
  const textSize=!isPhotoOnly(node)&&(node.mapSize??1)!==1||children.some(ch=>ch.kind!=='spacer'&&ch.subtree.textSize);
  const own=node.textGeometry,pictures=node.textBlock.photos;
  let top=pictures?Math.min(own.top,pictures[0].y):own.top;
  let bottom=pictures?Math.max(own.bottom,node.textBlock.bottom):own.bottom;
  const ownBottom=Math.max(node.textBlock.bottom,own.bottom);
  const forced=forcesChildRow(node);
  const rootStack=node.layoutDepth===0&&rootChildrenStacked(node);
  const rootColumns=rootStack?rootChildColumns(children.filter(hasConnector).length):0;
  let spine,stack;
  let horizontal=forced||layoutPreferences.horizontalFamily(node);
  if(children.length){
    const alignChildren=stacked=>{
      const leftAligned=node.layoutDepth===0?rootStack:stacked;
      for(const ch of children){
        const block=ch.textBlock;
        if(block.leftAligned===leftAligned||!block.runs.length)continue;
        const changed=alignTextBlock(block,leftAligned,ch.family.count?ch.subtree.childMode==='vertical':leftAligned);
        // Reevaluate eligible titles even when two placements happen to use the same starting X.
        if(changed||block.lastTitleInk&&ch.family.count)measureSubtree(ch,MD,nominal,true);
      }
    };
    alignChildren(!horizontal);
    if(horizontal){
      let cursor=0,remaining=node.family.count;
      for(let i=0;i<children.length;i++){
        const ch=children[i],record=ch.subtree;
        offsets.push({node:ch,x:cursor-record.minX,y:0});cursor+=record.maxX-record.minX;
        if(ch.kind!=='spacer')remaining--;
        if(i+1<children.length){
          const gap=grow(node,Math.max(armLen(ch.depth,MD),ch.baseFs*C.SIBLING_GAP_R));
          cursor+=ch.kind!=='spacer'&&remaining>0?siblingPadding(gap,[ch,children[i+1]]):gap;
        }
      }
      const first=offsets[0],last=offsets[offsets.length-1],center=(first.x+titleWidth(first.node)/2+last.x+titleWidth(last.node)/2)/2;
      const baseGap=grow(node,node.family.unit*C.GAP_R*C.D0_D1_GAP_MULT);
      let y=horizontalChildrenOffset(node,children);
      if(textSize){
        const textChildren=children.filter(ch=>!isPhotoOnly(ch));
        if(textChildren.length)y=Math.max(y,ownBottom+Math.max(baseGap,familyWidth(node,children[0].depth,MD)*3)-Math.min(...textChildren.map(ch=>ch.subtree.minY)));
      }
      const centerOffset=titleWidth(node)/2-center;
      for(const offset of offsets){
        offset.x+=centerOffset;offset.y=Math.max(y,bottom-offset.node.subtree.top);
        height=Math.max(height,offset.y+offset.node.subtree.height);
      }
      // Length limits are opt-in; left overhang alone is not a width limit.
      // Incoming connector clearance is checked by the vertical parent below.
      if(!forced&&layoutPreferences.lengthLimitEnabled){
        const span=cursor,titles=node.textBlock.runs.filter(run=>!run.description),titleWidth=Math.max(...titles.map(run=>run.x+Math.max(run.width,run.right)))-Math.min(0,...titles.map(run=>run.x-run.left)),threshold=titleWidth*layoutPreferences.lengthLimitRatio;
        const tolerance=1e-9*Math.max(1,span,threshold);
        if(!Number.isFinite(span)||!Number.isFinite(threshold)||titleWidth<=0||span>threshold+tolerance){horizontal=false;offsets.length=0;height=node.fs*C.LINE_H+node.textBlock.extraHeight;alignChildren(true);}
      }
    }
    if(!horizontal){
      const sR=(node.layoutDepth??node.depth)>=1?C.CHILD_STEP_R:1,subGap=familySubGap(node);
      const first=children[0],spacing=stackSpacing(node);
      const start=Math.max(stackedChildrenOffset(node,subGap,sR),
        textSize&&!isPhotoOnly(first)?ownBottom+subGap-first.subtree.minY:bottom-first.subtree.top);
      stack=measureStack([children],spacing,ch=>siblingBaseGap(ch,node),textSize,sideConnectorOffset);
      spine=spineOffsetOf(node);
      // Latest owner correction: quietly stack an overwide horizontal group vertically.
      // Reserve the incoming vertical shaft corridor, including stroke and measured ink.
      // A one-column WRAP also gives first-level children this incoming shaft.
      // Forced rebuilds reuse measured children; each node is built at most twice.
      const end=placeStack(children,start,stack,(ch,y)=>{
        // Centered own paragraphs reserve their left ink without changing title anchors within the block.
        const descriptionInset=ch.description===undefined?0:Math.max(0,-ch.textBlock.minX);
        // Supersedes forced vertical rebuilding: one local offset keeps eligible descendants horizontal.
        const clearance=incomingClearance(node,ch,MD,descriptionInset);
        offsets.push({node:ch,x:spine+familyArm(node,ch.depth,MD)+descriptionInset+clearance,y,clearance});
      });
      height=Math.max(height,end);
    }
  }
  // Resolve outgoing alignment after Length has chosen the final child layout.
  const block=node.textBlock;
  const descriptionLeft=node.family.count?(node.layoutDepth===0?rootStack:!horizontal):block.leftAligned;
  const descriptionAnchor=node.family.count&&descriptionLeft?(rootColumns>1?titleWidth(node)/2:spine):0;
  const hasLeftShaft=separateRoot?rootColumns===1:node.layoutDepth>0&&!horizontal;
  const titleStart=node.family.count&&hasLeftShaft&&!block.leftAligned&&block.lastTitleInk?titleStartOverSpine(block,spine):null;
  alignTextBlock(block,block.leftAligned,descriptionLeft,descriptionAnchor,titleStart);
  let minX=titleStart!==null?block.minX:nominal?0:block.runs.reduce((min,run)=>Math.min(min,run.x-run.left),0);
  let maxX=titleStart!==null?Math.max(block.maxX,block.photos?block.width:0):nominal?nodeWidth(node):block.runs.reduce((max,run)=>Math.max(max,run.x+run.right),nodeWidth(node));
  for(const offset of offsets){
    const sub=offset.node.subtree;
    top=Math.min(top,offset.y+sub.top);bottom=Math.max(bottom,offset.y+sub.bottom);
    minX=Math.min(minX,offset.x+sub.minX);maxX=Math.max(maxX,offset.x+sub.maxX);
  }
  if(textSize||pictures){
    const connected=offsets.filter(offset=>offset.node.kind!=='spacer');
    if(connected.length){
      const half=familyWidth(node,connected[0].node.depth,MD)/2;
      if(horizontal){
        for(const offset of connected){
          const center=offset.x+titleWidth(offset.node)/2;
          minX=Math.min(minX,center-half);maxX=Math.max(maxX,center+half);
        }
      }else{
        minX=Math.min(minX,spine-half);
        maxX=Math.max(maxX,spine+Math.max(...connected.map(offset=>familyArm(node,offset.node.depth,MD)))*.70+half);
        for(const offset of connected)height=Math.max(height,offset.y+offset.node.fs*offset.node.capFrac+half);
      }
    }
  }
  node.subtree={minX,maxX,minY:Math.min(0,top),top,bottom,height:Math.max(height,bottom),textSize,
    reference:referenceFootprint(node,horizontal,MD,textSize,stack),
    hasHorizontalRow:horizontal&&node.family.count>1||children.some(ch=>ch.subtree.hasHorizontalRow),
    childMode:horizontal?'horizontal':'vertical',childOffsets:offsets};
}
const isPackingAnchor = node => node.kind !== 'spacer';
const hasConnector = node => isPackingAnchor(node) && !node.photos?.length;
function packingUnits(nodes, isAnchor = isPackingAnchor){
  const units=[],leading=[];
  for(const node of nodes){
    if(isAnchor(node))units.push({node,before:units.length?[]:leading,after:[]});
    else (units.at(-1)?.after ?? leading).push(node);
  }
  return units;
}
// For a finite incoming shaft, inspect only ink at or above its painted endpoint.
function leftAbove(node,ceiling){
  let left=Infinity;
  for(const run of node.textBlock.runs)if(run.baseline-run.ascent<=ceiling)left=Math.min(left,run.x-run.left);
  for(const offset of node.subtree.childOffsets)if(offset.y+offset.node.subtree.minY<=ceiling)left=Math.min(left,offset.x+leftAbove(offset.node,ceiling-offset.y));
  return left;
}
function incomingClearance(parent,child,MD,inset=0){
  if(child.kind==='spacer')return 0;
  const count=parent.family.count,root=(parent.layoutDepth??parent.depth)===0&&!parent.synthetic;
  if(root&&count>1&&(layoutPreferences.hlimitInf||count<=layoutPreferences.hlimitN))return 0;
  const half=(child.incomingWidth??lnW(child.depth,MD))/2;
  const left=root&&count===1?leftAbove(child,child.fs*child.capFrac+half):child.subtree.minX;
  const arm=familyArm(parent,child.depth,MD);
  const padding=arm*C.INCOMING_PAD_R;
  return Math.max(0,half+(child.subtree.hasHorizontalRow?horizontalGap(padding):padding)-(arm+inset+left));
}
function rootChildrenClearance(root,gap,y){
  if(!root.subtree.textSize)return y;
  const children=root.children.filter(ch=>!isPhotoOnly(ch));
  if(!children.length)return y;
  const bottom=Math.max(root.textBlock.bottom,root.textGeometry.bottom);
  return Math.max(y,root.y+bottom+gap-Math.min(...children.map(ch=>ch.subtree.minY)));
}
function layoutSimple(root,MD,colorSeed,recolor=true){
  const d1=root.children,NC=d1.length;
  root.y=C.TOP_M;
  const d1Fs=NC?familyUnit(root):C.BASE_FONT;
  const d1TxtW=d1.map(n=>titleWidth(n));
  const d1ColW_s=d1.map(footprintW);
  const units=packingUnits(d1),nextReal=new Map(units.map((u,i)=>[u.node,units[i+1]?.node]));
  const cl=[];let xc=C.LEFT_M;
  for(let i=0;i<NC;i++){
    cl.push(xc);
    if(d1[i].kind==='spacer'){xc+=d1ColW_s[i];continue;}
    const rPad=grow(root,structuralTitle(d1[i])*C.D1_TXT_PAD_R),next=nextReal.get(d1[i]);
    const lPad=next?grow(root,structuralTitle(next)*C.D1_TXT_PAD_R):0;
    xc+=d1ColW_s[i]+(next?siblingPadding(rPad+lPad,[d1[i],next]):rPad+lPad);
  }
  for(let i=0;i<NC;i++){d1[i].x=cl[i]-d1[i].subtree.minX;assignSubtreeX(d1[i]);}
  for(let i=0;i<NC;i++)d1[i].cx=d1[i].x+d1TxtW[i]/2;
  const rCX=NC===0?C.LEFT_M+titleWidth(root)/2:
    NC===1?d1[0].cx:(d1[0].cx+d1[NC-1].cx)/2;
  root.cx=rCX;root.x=rCX-titleWidth(root)/2;
  if(recolor){root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);}
  const d1BaseGap=grow(root,root.family.unit*C.GAP_R*C.D0_D1_GAP_MULT);
  const d1Y=rootChildrenClearance(root,d1BaseGap,root.y+root.fs+root.textBlock.extraHeight+d1BaseGap+
    lowerThaiChildBonus(root,d1BaseGap)*(NC===1?1:C.LOWER_THAI_FANOUT_FRAC));
  const firstRowBonus=firstRowUpwardBonus(d1,d1Fs);
  const bottom=root.y+Math.max(root.textGeometry.bottom,root.photos?root.textBlock.bottom:0);
  const bots=d1.map(ch=>place(ch,Math.max(d1Y+firstRowBonus,bottom-ch.subtree.top)));
  const pW=Math.max(NC?cl[NC-1]+d1ColW_s[NC-1]+(d1[NC-1].kind==='spacer'?0:grow(root,structuralTitle(d1[NC-1])*C.D1_TXT_PAD_R)):0,
    root.x+titleWidth(root))+C.RIGHT_M;
  const pH=(bots.length?Math.max(...bots):d1Y+120)+C.BOT_M;
  const av=d1Y-root.y-root.fs-root.textBlock.extraHeight;
  const rg=Math.min(familyGap(root,d1[0]?.depth||1,MD),av*0.3);
  const rb=root.y+root.fs+root.textBlock.extraHeight+rg;
  const d1BusY=rb+(d1Y-rb)*C.BUS_MID;
  const sX0=Math.min(root.x,NC?cl[0]:root.x);
  const sX1=Math.max(root.x+titleWidth(root),
    NC?cl[NC-1]+d1ColW_s[NC-1]+(d1[NC-1].kind==='spacer'?0:grow(root,structuralTitle(d1[NC-1])*C.D1_TXT_PAD_R)):root.x);
  return{root,MD,pW,pH,d1Y,d1Mode:'simple',d1Cols:null,d1Groups:null,
    d1ColX:null,d1BusY,d1X0:sX0,d1X1:sX1,firstRowBonus};
}
function gridChildrenOffset(root,cols,gap,unit){
  return cols===1&&root.description!==undefined?describedChildrenOffset(root,unit*C.SUB_GAP_R):root.fs+root.textBlock.extraHeight+gap+lowerThaiChildBonus(root,gap)*(cols===1?1:C.LOWER_THAI_FANOUT_FRAC);
}
function layoutGrid(root,MD,colorSeed,recolor=true){
  const d1=root.children,units=packingUnits(d1,hasConnector),NC=units.length;
  root.y=C.TOP_M;
  const cols=rootChildColumns(NC);
  const ARM1=familyArm(root,d1[0].depth,MD);
  const d1Fs=familyUnit(root);
  const base=Math.floor(NC/cols),extra=NC%cols;
  const colChildren=[];
  if (!NC) colChildren.push(d1);
  else {
    let first = 0;
    for (let column = 0; column < cols; column++) {
      const count = base + (column < extra ? 1 : 0);
      colChildren.push(units.slice(first, first + count).flatMap(unit => [...unit.before, unit.node, ...unit.after]));
      first += count;
    }
  }
  const placements=new Map(root.subtree.childOffsets.map(offset=>[offset.node,offset]));
  const childX=ch=>{
    const clearance=placements.get(ch)?.clearance??0;
    if(!clearance)return -ch.subtree.minX;
    const inset=ch.description===undefined?0:Math.max(0,-ch.textBlock.minX);
    return inset+clearance;
  };
  const colWidths=colChildren.map(chs=>ARM1+Math.max(...chs.map(ch=>{
    return Math.max(footprintW(ch),ch.kind==='spacer'?0:childX(ch)+ch.subtree.maxX);
  })));
  const gridX0=C.LEFT_M;
  const d1ColX=[],colLabelX=[];
  let xcg=gridX0;
  for(let c=0;c<cols;c++){
    d1ColX.push(xcg);colLabelX.push(xcg+ARM1);
    xcg+=colWidths[c]+(c+1<cols?d1ColGap(colChildren[c],colChildren[c+1],ARM1,root):0);
  }
  const gridX1=d1ColX[cols-1]+colWidths[cols-1];
  const d1BaseGap_g=grow(root,root.family.unit*C.GAP_R*C.D0_D1_GAP_MULT);
  const d1Y_g=rootChildrenClearance(root,d1BaseGap_g,root.y+gridChildrenOffset(root,cols,d1BaseGap_g,familyUnit(root)));
  const av_g=d1Y_g-root.y-root.fs-root.textBlock.extraHeight;
  const rg_g=Math.min(familyGap(root,d1[0]?.depth||1,MD),av_g*0.3);
  const rb_g=root.y+root.fs+root.textBlock.extraHeight+rg_g;
  const d1BusY=rb_g+(d1Y_g-rb_g)*C.BUS_MID;
  const gridStartY=d1Y_g;
  const firstRowNodes=colChildren.map(chs=>chs.find(hasConnector)).filter(Boolean);
  const firstRowBonus=cols>1?firstRowUpwardBonus(firstRowNodes,d1Fs):0;
  const spacing=(previous,ch)=>hasConnector(ch)?d1RowGap(ch,root):0;
  const stack=measureStack(colChildren,spacing,ch=>d1RowPadding(ch,root),root.subtree.textSize,sideConnectorOffset);
  const d1Groups=[];
  const bottom=root.y+Math.max(root.textGeometry.bottom,root.photos?root.textBlock.bottom:0);
  let gridY1=gridStartY;
  for(let c=0;c<cols;c++){
    const children=colChildren[c],start=Math.max(gridStartY+firstRowBonus,bottom-children[0].subtree.top);
    let row=0;
    const end=placeStack(children,start,stack,(ch,y)=>{
      ch.x=colLabelX[c]+(ch.kind==='spacer'?0:childX(ch));assignSubtreeX(ch);place(ch,y);
      ch.cx=ch.x+titleWidth(ch)/2;
      d1Groups.push({node:ch,col:c,row:row++,cellX:d1ColX[c],cellY:y,
        labelX:colLabelX[c],cellW:colWidths[c],cellH:ch.subtree.height});
    });
    gridY1=Math.max(gridY1,end);
  }
  const gridTotalW=gridX1-gridX0;
  const existingCX=gridX0+gridTotalW/2;
  const spineCX=(d1ColX[0]+d1ColX[cols-1])/2;
  const rCX_g=(existingCX+spineCX)/2;
  root.cx=rCX_g;root.x=rCX_g-titleWidth(root)/2;
  if(recolor){root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);}
  if(cols===1)assignSubtreeX(root);
  let _gMaxX=root.x+titleWidth(root);
  (function _gwk(n){const rx=n.x+(n.description===undefined?nodeWidth(n):n.textBlock.maxX);if(rx>_gMaxX)_gMaxX=rx;n.children.forEach(_gwk);})(root);
  return{root,MD,pW:_gMaxX+C.RIGHT_M,pH:gridY1+C.BOT_M,d1Y:gridStartY,
    d1Mode:'grid',d1Cols:cols,d1Groups,d1ColX,d1BusY,d1X0:gridX0,d1X1:gridX1,firstRowBonus};
}
function rootChildrenStacked(root){
  if(forcesChildRow(root))return false;
  const NC=root.family.count;
  // A lone real root child always uses the existing left-side vertical connector.
  return NC===1&&!root.synthetic||NC>0&&!layoutPreferences.hlimitInf&&
    (NC>layoutPreferences.hlimitN||root.children.some(node=>node.photos?.length));
}
function rootChildColumns(count){return Math.max(1,Math.min(layoutPreferences.hlimitN,count));}
function layoutTree(root,MD,colorSeed,recolor=true){
  return rootChildrenStacked(root)?layoutGrid(root,MD,colorSeed,recolor):layoutSimple(root,MD,colorSeed,recolor);
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
  const described=hasDescription(root),separateRoots=root.synthetic&&root.family.count>1;
  // Spacer-only footprints retain the original nominal widths of unaffected real branches.
  const nominal=!layoutPreferences.levelsEnabled&&!described&&!sourcePresentation?.some(p=>p.kind!=='spacer'&&!p.photos&&p.mapSize!==1);
  for(const n of roots)measureSubtree(n,MD,nominal,false,separateRoots);
  if(!root.synthetic)return layoutTree(root,MD,colorSeed);
  // Color once in original whole-map order; outer packing only translates complete trees.
  root.col=hsl(220,.10,.17);assignColors(root,220,0,0,colorSeed);
  const trees=roots.map(n=>{const lay=layoutTree(n,MD,colorSeed,false);lay.hasDescriptions=hasDescription(n);return lay;});
  const boxes=trees.map(contentBounds),indexes=new Map(roots.map((n,i)=>[n,i])),units=packingUnits(roots);
  if(!units.length){let y=C.TOP_M;trees.forEach((lay,i)=>{translateLayout(lay,C.LEFT_M-boxes[i].x,y-boxes[i].y);y+=boxes[i].h;});}
  else{
    const cols=layoutPreferences.rootEnabled?Math.min(layoutPreferences.rootEffective,units.length):units.length;
    const across=layoutPreferences.rootEnabled&&layoutPreferences.rootOrder==='across';
    const footprint=(height,text)=>({top:0,bottom:height,height,reference:{top:0,bottom:height,height,text}});
    const cells=units.map(u=>{
      const items=[...u.before,u.node,...u.after].map(n=>indexes.get(n));
      const w=across?items.reduce((v,i)=>v+boxes[i].w,0):Math.max(...items.map(i=>boxes[i].w));
      const h=across?Math.max(...items.map(i=>boxes[i].h)):items.reduce((v,i)=>v+boxes[i].h,0);
      return {items,w,node:u.node,subtree:footprint(h,!isPhotoOnly(u.node))};
    });
    const placeCell=(cell,x,y)=>{for(const i of cell.items){const box=boxes[i];translateLayout(trees[i],x+(across?0:(cell.w-box.w)/2)-box.x,y-box.y);if(across)x+=box.w;else y+=box.h;}};
    if(across){
      // Placement indexes leave canonical preorder, color traversal and PDF order intact.
      const rows=Array.from({length:Math.ceil(units.length/cols)},(_,r)=>Array.from({length:Math.min(cols,units.length-r*cols)},(_,c)=>r*cols+c));
      const widths=Array.from({length:cols},(_,c)=>Math.max(...rows.filter(row=>c<row.length).map(row=>cells[row[c]].w)));
      const xs=[C.LEFT_M];
      for(let c=1;c<cols;c++){
        const gap=Math.max(...rows.filter(row=>c<row.length).map(row=>d1ColGap([units[row[c-1]].node],[units[row[c]].node],armLen(units[row[c]].node.depth,MD))));
        xs[c]=xs[c-1]+widths[c-1]+gap;
      }
      const gridWidth=xs[cols-1]+widths[cols-1]-C.LEFT_M;
      const bands=rows.map(row=>{
        const members=row.map(i=>cells[i]),text=members.filter(cell=>cell.subtree.reference.text);
        return {members,text,subtree:footprint(Math.max(...members.map(cell=>cell.subtree.height)),text.length>0)};
      });
      const spacing=(previous,band)=>Math.max(...(band.text.length?band.text:band.members).map(cell=>d1RowGap(cell.node)));
      const minimum=band=>Math.min(...band.text.map(cell=>d1RowPadding(cell.node)));
      const stack=measureStack([bands],spacing,minimum);
      placeStack(bands,C.TOP_M,stack,({members},y)=>{
        const last=members.length-1,left=xs[0]+(widths[0]-members[0].w)/2;
        const right=xs[last]+(widths[last]+members[last].w)/2;
        const shift=members.length<cols?C.LEFT_M+gridWidth/2-(left+right)/2:0;
        members.forEach((cell,c)=>placeCell(cell,xs[c]+(widths[c]-cell.w)/2+shift,y));
      });
    }else{
      const base=Math.floor(units.length/cols),extra=units.length%cols;
      const columns=[];
      let index=0;
      for(let c=0;c<cols;c++){
        const end=index+base+(c<extra?1:0);
        columns.push(cells.slice(index,end));index=end;
      }
      const spacing=(previous,cell)=>d1RowGap(cell.node);
      const stack=measureStack(columns,spacing,cell=>d1RowPadding(cell.node));
      let x=C.LEFT_M;
      for(const [c,column] of columns.entries()){
        const width=Math.max(...column.map(cell=>cell.w));
        placeStack(column,C.TOP_M,stack,(cell,y)=>placeCell(cell,x+(width-cell.w)/2,y));
        const next=columns[c+1]?.[0].node;
        if(next)x+=width+d1ColGap([column.at(-1).node],[next],armLen(next.depth,MD));
      }
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
    if(!n.synthetic&&(n.description!==undefined||n.titleLines||layoutPreferences.levelsEnabled||(n.mapSize??1)!==1)){
      for(const run of n.textBlock.runs){
        x0=Math.min(x0,n.x+run.x-run.left);x1=Math.max(x1,n.x+run.x+Math.max(run.width,run.right));
        y0=Math.min(y0,n.y+run.baseline-run.ascent);y1=Math.max(y1,n.y+run.baseline+run.descent);
      }
      y1=Math.max(y1,n.y+n.textBlock.bottom);
    }
    for(const box of n.textBlock.photos || []){
      x0=Math.min(x0,n.x+box.x);x1=Math.max(x1,n.x+box.x+box.w);
      y0=Math.min(y0,n.y+box.y);y1=Math.max(y1,n.y+box.y+box.h);
    }
    n.children.forEach(walk);
  };
  walk(root);
  if(lay.d1Mode==='grid'){x0=Math.min(x0,lay.d1X0);x1=Math.max(x1,lay.d1X1);y0=Math.min(y0,lay.d1BusY);}
  if(lay.hasDescriptions||layoutPreferences.levelsEnabled||sourcePresentation){for(const s of getConnSegments(lay)){x0=Math.min(x0,s.x1-s.lw/2,s.x2-s.lw/2);x1=Math.max(x1,s.x1+s.lw/2,s.x2+s.lw/2);y0=Math.min(y0,s.y1-s.lw/2,s.y2-s.lw/2);y1=Math.max(y1,s.y1+s.lw/2,s.y2+s.lw/2);}}
  return{x:x0,y:y0,w:Math.max(1,x1-x0),h:Math.max(1,y1-y0)};
}

/* ══ CONNECTION SEGMENTS ══ */
// Match the original bus rule: interior stems only, with a clear nearest candidate.
function snappedStem(center,centers,upperLength,lowerLength){
  const candidates=[];
  for(let i=1;i<centers.length-1;i++){
    const distance=Math.abs(centers[i]-center);
    if(distance<Math.min(upperLength,lowerLength(i)))candidates.push({i,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);
  const [first,second]=candidates;
  if(!first)return -1;
  if(centers.length%2===0&&second&&
    (second.distance-first.distance)/Math.max(second.distance,0.001)<=SNAP_AMBIG_THRESH)return -1;
  return first.i;
}
function getConnSegments(lay){
  if(lay.trees)return lay.trees.flatMap(getConnSegments);
  const{root,MD,d1Mode,d1BusY,d1ColX,d1Groups,d1Cols}=lay;
  const d1=root.children.filter(hasConnector);
  const segs=[];
  const seg=(col,lw,x1,y1,x2,y2)=>segs.push({col,lw,x1,y1,x2,y2});
  // Leading decorative rows can grow independently. Anchor their spine to ordinary row spacing.
  const stackedSpine=(parent,lastChild,lw,rootColumn=false)=>{
    const x=spineXOf(parent),bottom=parent.y+parent.fs+parent.textBlock.extraHeight;
    const first=parent.children[0];
    let rowY=first.y;
    if(!hasConnector(first)){
      const unit=first.baseFs,step=(parent.layoutDepth??parent.depth)>=1?C.CHILD_STEP_R:1;
      rowY=parent.y+(rootColumn?gridChildrenOffset(parent,1,unit*C.GAP_R*C.D0_D1_GAP_MULT,unit)
        :stackedChildrenOffset(parent,unit*C.SUB_GAP_R*step,step));
    }
    const start=bottom+(rowY-bottom)*C.VG_FRAC*(rootColumn?0.4:1);
    seg(parent.col,lw,x,start,x,sideConnectorY(lastChild));
    return x;
  };
  const branchSegments=p=>{
    if(!hasConnector(p))return;
    const connected=p.children.filter(hasConnector);if(!connected.length)return;
    if(p.subtree?.childMode==='horizontal'){
      const children=connected,depth=children[0].depth;
      const bottom=p.y+Math.max(p.textBlock.bottom,p.textBlock.runs[0].baseline+p.textBlock.runs[0].descent);
      const inkTop=ch=>ch.y+ch.textBlock.runs[0].baseline-ch.textBlock.runs[0].ascent;
      const top=Math.min(...children.map(inkTop)),gap=top-bottom,rg=Math.min(familyGap(p,depth,MD),gap*0.3);
      const clearance=p.subtree.textSize?familyWidth(p,depth,MD)/2+1e-9:0;
      const start=bottom+Math.max(rg,clearance),bus=start+(top-start)*C.BUS_MID,center=p.x+titleWidth(p)/2,lw=familyWidth(p,depth,MD);
      const centers=children.map(ch=>ch.x+titleWidth(ch)/2);
      const ends=children.map(ch=>{
        const y=inkTop(ch);
        return y-Math.max(clearance,Math.min(familyGap(p,depth,MD),(y-bus)*0.3));
      });
      const idx=snappedStem(center,centers,bus-start,i=>ends[i]-bus);
      const stem=idx<0?center:(center+centers[idx])/2;
      if(idx>=0)centers[idx]=stem;
      seg(p.col,lw,stem,start,stem,bus);
      seg(p.col,lw,centers[0],bus,centers[centers.length-1],bus);
      children.forEach((ch,i)=>seg(p.col,lw,centers[i],bus,centers[i],ends[i]));
      return;
    }
    const sx=stackedSpine(p,connected[connected.length-1],familyWidth(p,p.depth+1,MD));
    for(const {node:ch,clearance=0} of p.subtree?.childOffsets??connected.map(node=>({node}))){
      if(!hasConnector(ch))continue;
      const cy=sideConnectorY(ch);
      seg(p.col,familyWidth(p,ch.depth,MD),sx,cy,sx+familyArm(p,ch.depth,MD)*0.70+clearance,cy);
    }
  };
  const walk=node=>{branchSegments(node);node.children.forEach(walk);};
  if(root.synthetic||!hasConnector(root)){root.children.forEach(walk);return segs;}
  if(d1Mode==='simple'){
    if(d1.length){
      const by=d1BusY;
      const d1BaseGap=grow(root,root.family.unit*C.GAP_R*C.D0_D1_GAP_MULT);
      const rg=Math.min(familyGap(root,d1[0].depth,MD),d1BaseGap*0.3);
      const rb=by-(d1BaseGap-rg)*C.BUS_MID;
      const upperLen=by-rb;
      const snapIdx=snappedStem(root.cx,d1.map(n=>n.cx),upperLen,i=>{
        const y=d1[i].y;
        return (y-Math.min(familyGap(root,d1[0].depth,MD),(y-by)*0.3))-by;
      });
      const topX=snapIdx<0?root.cx:(d1[snapIdx].cx+root.cx)/2;
      const lw1=familyWidth(root,d1[0].depth,MD);
      seg(root.col,lw1,topX,rb,topX,by);
      if(d1.length>1)seg(root.col,lw1,d1[0].cx,by,d1[d1.length-1].cx,by);
      for(let i=0;i<d1.length;i++){
        const n=d1[i],nx=i===snapIdx?topX:n.cx;
        seg(root.col,lw1,nx,by,nx,by+(by-rb));
      }
    }
    root.children.forEach(walk);return segs;
  }
  if(d1.length){
    const lw1=familyWidth(root,d1[0].depth,MD);
    if(d1Cols===1){
      const sx=stackedSpine(root,d1[d1.length-1],lw1,true);
      for(const ch of d1){
        const ey=sideConnectorY(ch);
        seg(root.col,lw1,sx,ey,ch.x-familyArm(root,ch.depth,MD)*0.30,ey);
      }
    }else{
      const d1BaseGap=grow(root,root.family.unit*C.GAP_R*C.D0_D1_GAP_MULT);
      const rg=Math.min(familyGap(root,d1[0].depth,MD),d1BaseGap*0.3);
      seg(root.col,lw1,root.cx,d1BusY-(d1BaseGap-rg)*C.BUS_MID,root.cx,d1BusY);
      const connectedGroups=d1Groups.filter(group=>hasConnector(group.node));
      const activeColumns=d1ColX.filter((_,c)=>connectedGroups.some(group=>group.col===c));
      seg(root.col,lw1,Math.min(activeColumns[0],root.cx),d1BusY,Math.max(activeColumns[activeColumns.length-1],root.cx),d1BusY);
      for(let c=0;c<d1Cols;c++){
        const shaftX=d1ColX[c];
        const colGs=connectedGroups.filter(group=>group.col===c);if(!colGs.length)continue;
        const lastCh=colGs[colGs.length-1].node;
        seg(root.col,lw1,shaftX,d1BusY,shaftX,sideConnectorY(lastCh));
        for(const g of colGs){
          const ch=g.node;
          const y=sideConnectorY(ch);
          seg(root.col,lw1,shaftX,y,ch.x-familyArm(root,ch.depth,MD)*0.30,y);
        }
      }
    }
  }
  root.children.forEach(walk);return segs;
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
// Multiplying RGB by one common factor preserves HSV hue/saturation; cap V at 1.
function alternateInk(color){
  const rgb=color.match(/\d+/g).map(Number),peak=Math.max(...rgb),factor=peak?Math.min(1.10,255/peak):1;
  return 'rgb('+rgb.map(v=>Math.round(v*factor)).join(',')+')';
}
// Layout owns row membership. Rebuild presentation from base colors after layout or recolor.
function refreshLabelColors(lay){
  const row=nodes=>{
    const real=nodes.filter(n=>n.kind!=='spacer');
    if(real.length<2||!real.every(n=>n.col===real[0].col))return;
    real.forEach((n,i)=>{if(i%2)n.inkColor=alternateInk(n.col);});
  };
  const walk=n=>{n.inkColor=n.col;n.children.forEach(walk);if((n.layoutDepth??n.depth)>0&&n.subtree?.childMode==='horizontal')row(n.children);};
  walk(lay.root);
  for(const tree of lay.trees??[lay]){
    if(tree.d1Mode==='simple')row(tree.root.children);
    else if(tree.d1Groups){
      const rows=[],ranks=[];
      for(const g of tree.d1Groups)if(g.node.kind!=='spacer'){
        const rank=ranks[g.col]??0;ranks[g.col]=rank+1;(rows[rank]??=[]).push(g.node);
      }
      rows.forEach(row);
    }
  }
}
function labelColor(node,description=false){return node.placeholder&&!description?PLACEHOLDER_COLOR:node.inkColor??node.col;}
function drawLbls(ctx,n){
  if(!n.synthetic&&n.kind!=='spacer'){
    ctx.textBaseline='alphabetic';
    for(const run of n.textBlock.runs){
      ctx.fillStyle=labelColor(n,run.description);
      if(run.fs<=C.MAX_SAFE_FONT){ctx.font=run.fw+' '+run.fs+'px '+C.FONT;ctx.fillText(run.text,n.x+run.x,n.y+run.baseline);}
      else{const r=run.fs/C.MAX_SAFE_FONT;ctx.save();ctx.translate(n.x+run.x,n.y+run.baseline);ctx.scale(r,r);ctx.font=run.fw+' '+C.MAX_SAFE_FONT+'px '+C.FONT;ctx.fillText(run.text,0,0);ctx.restore();}
    }
  }
  for(const box of n.textBlock.photos || []) drawPhoto(ctx,n,box);
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

async function exportPDF({onWarning,prepareOnly=false}={}){
  if(destroyed||pdfBusy)return;
  const hosted=typeof onWarning==='function';
  pdfBusy=true;container.setAttribute('aria-busy','true');
  try{
    flushRender(true);
    if(pendingRender)throw new Error('The map is updating. Try downloading again.');
    if(!st.lay)return;
    const snapshot=capturePdfLayout(st.lay);
    const [hb,tfR,tfB]=await Promise.all([
      import('https://unpkg.com/harfbuzzjs@1.4.0').catch(error=>{
        throw new Error('Could not load the PDF text engine. Check your connection, then reload and try again.',{cause:error});
      }),
      fetchTTF(SARABUN_REGULAR_URLS),
      fetchTTF(SARABUN_BOLD_URLS),
    ]);
    if(destroyed)return;
    const hbFontR=makeHbFont(hb,tfR);
    const hbFontB=makeHbFont(hb,tfB);
    const file=await _buildPDF(snapshot,hb,hbFontR,hbFontB,tfR,tfB);
    if(!file||destroyed)return;
    if(!prepareOnly)downloadPDF(file);
    if(!destroyed&&(!tfR||!tfB)){
      const message='PDF font download failed. Thai output may be incomplete.';
      if(hosted){try{onWarning(message);}catch(error){console.error(error);}}
      else reportError(new Error(message));
    }
    if(prepareOnly&&!destroyed)return file;
  }catch(err){
    if(destroyed)return;
    if(!hosted)reportError(new Error('PDF export failed: '+(err.message||err)));
    throw err;
  }finally{
    pdfBusy=false;
    if(!destroyed)container.removeAttribute('aria-busy');
  }
}

function capturePdfLayout(lay){
  const {root}=lay;
  const nodes=[],photos=new Map();
  const collect=node=>{
    if(!node.synthetic&&node.kind!=='spacer'){
      const center=!node.titleLines&&node.depth===0&&node.cx!=null
        ? {x:node.cx,label:node.label,bold:node.fw==='bold',fs:node.fs} : null;
      const labels=node.textBlock.runs.map(run=>({
        x:run.x,y:node.y+run.baseline,text:run.text,bold:run.fw==='bold',fs:run.fs,color:labelColor(node,run.description),
        left:run.left,right:run.right,ascent:run.ascent,descent:run.descent
      }));
      const images=(node.textBlock.photos||[]).map(({photo,x,y,w,h})=>{
        photos.set(photo.id,photo);
        return {id:photo.id,x:node.x+x,y:node.y+y,w,h};
      });
      nodes.push({x:node.x,center,labels,images});
    }
    node.children.forEach(collect);
  };
  collect(root);
  const filename=safeFileName(root.synthetic?root.children[0]?.label||'MindMap':root.label)+' Mind-Map.pdf';
  return {nodes,photos,filename,bounds:contentBounds(lay),segments:getConnSegments(lay)};
}

/* ── PDF object store ── */
function createPdfStore(){
  let _oid=0;
  const nid=()=>++_oid;
  const objArr=[];
  function set(id,...parts){objArr[id-1]=new Blob([`${id} 0 obj\n`,...parts,'\nendobj\n']);}
  function setStream(id,data,entries=''){
    const content=data instanceof Blob?data:new Blob([data]);
    set(id,`<< /Length ${content.size}${entries?' '+entries:''} >>\nstream\n`,content,'\nendstream');
  }
  function totalObjs(){return _oid;}
  function assembleBody(baseOffset=0){
    const offs=[],parts=[];let pos=baseOffset;
    for(const o of objArr){offs.push(pos);parts.push(o);pos+=o.size;}
    return{parts,offs,xrefPos:pos};
  }
  return{nid,set,setStream,totalObjs,assembleBody};
}

/* ── TTF font embedding ── */
function embedTTFFont({set:setObj,setStream},tf,t0Id,cidId,dscId,fid,ucId,bname){
  if(!tf)return;
  const H='0123456789abcdef';
  let hex='';for(let i=0;i<tf.data.length;i++){const b=tf.data[i];hex+=H[b>>4]+H[b&0xF];}
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
  setStream(fid,hex+'>',`/Filter /ASCIIHexDecode /Length1 ${tf.data.length}`);
  setStream(ucId,tuc);
}

function resolvePdfFont(tfR,tfB,isB){
  if(isB){if(tfB)return{tf:tfB,slot:'F4'};if(tfR)return{tf:tfR,slot:'F3'};return{tf:null,slot:'F2'};}
  if(tfR)return{tf:tfR,slot:'F3'};if(tfB)return{tf:tfB,slot:'F4'};return{tf:null,slot:'F1'};
}

function readPdfRaster(canvas,width,height,paint){
  canvas.width=width;canvas.height=height;
  try{
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    paint(ctx);
    const {data}=ctx.getImageData(0,0,width,height);
    const rgb=new Uint8Array(width*height*3);
    let alpha=null;
    for(let pixel=0,source=0,target=0;source<data.length;pixel++,source+=4){
      rgb[target++]=data[source];
      rgb[target++]=data[source+1];
      rgb[target++]=data[source+2];
      const opacity=data[source+3];
      if(!alpha&&opacity!==255){
        alpha=new Uint8Array(width*height);
        alpha.fill(255,0,pixel);
      }
      if(alpha)alpha[pixel]=opacity;
    }
    return {width,height,rgb,alpha};
  }finally{canvas.width=canvas.height=1;}
}

async function addPdfImage(store,images,key,{rgb,alpha,width,height}){
  const canCompress=typeof CompressionStream==='function';
  async function writeImage(samples,width,height,colorSpace,mask=''){
    const id=store.nid();
    const data=canCompress?await new Response(new Blob([samples]).stream().pipeThrough(new CompressionStream('deflate'))).blob():samples;
    const filter=canCompress?' /Filter /FlateDecode':'';
    store.setStream(id,data,`/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace ${colorSpace} /BitsPerComponent 8${filter}${mask}`);
    return id;
  }
  const mask=alpha?` /SMask ${await writeImage(alpha,width,height,'/DeviceGray')} 0 R`:'';
  if(destroyed)return;
  const id=await writeImage(rgb,width,height,'/DeviceRGB',mask);
  if(destroyed)return;
  images.set(key,{name:'Im'+(images.size+1),id});
}

async function writePdfImages(store,photos,images,scratch){
  for(const photo of photos.values()){
    let samples;
    try{
      pdfPhotoLease=opts.acquirePhoto(photo,'detail');
      const image=await pdfPhotoLease.ready;
      if(destroyed)return;
      samples=readPdfRaster(scratch,image.naturalWidth,image.naturalHeight,ctx=>ctx.drawImage(image,0,0));
    }catch(error){
      throw new Error('Could not load a photo for the PDF. Try opening it in the Outliner.',{cause:error});
    }finally{
      pdfPhotoLease?.release();
      pdfPhotoLease=null;
    }
    await addPdfImage(store,images,photo.id,samples);
    if(destroyed)return;
  }
}

function pdfLabelRaster(label){
  const inkWidth=label.left+label.right,inkHeight=label.ascent+label.descent;
  if(inkWidth<=0||inkHeight<=0)return null;
  const padding=2,maxEdge=2048;
  // Keep small labels sharp and bound the scratch canvas even for very wide lines.
  const scale=Math.min(Math.max(1,24/label.fs),(maxEdge-2*padding)/Math.max(inkWidth,inkHeight));
  const width=Math.ceil(inkWidth*scale)+2*padding,height=Math.ceil(inkHeight*scale)+2*padding;
  const x=label.left*scale+padding,y=label.ascent*scale+padding;
  const fs=Math.min(label.fs,C.MAX_SAFE_FONT),rasterScale=scale*label.fs/fs;
  return {
    x:-x/scale,y:-y/scale,w:width/scale,h:height/scale,
    width,height,paint(ctx){
      ctx.setTransform(rasterScale,0,0,rasterScale,x,y);
      ctx.font=(label.bold?'bold':'normal')+' '+fs+'px '+C.FONT;
      ctx.textBaseline='alphabetic';ctx.fillStyle=label.color;
      ctx.fillText(label.text,0,0);
    }
  };
}

async function _buildPDF(snapshot,hb,hbFontR,hbFontB,tfR,tfB){
  const PDF_SCALE=0.25;
  const cb=snapshot.bounds;
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
  const{nid,set:setObj,setStream}=store;
  const catId=nid(),pagesId=nid(),pageId=nid(),stmId=nid(),f1Id=nid(),f2Id=nid();
  let f3Id,f3CId,f3DId,f3FId,f3UId;
  if(tfR){f3Id=nid();f3CId=nid();f3DId=nid();f3FId=nid();f3UId=nid();}
  let f4Id,f4CId,f4DId,f4FId,f4UId;
  if(tfB){f4Id=nid();f4CId=nid();f4DId=nid();f4FId=nid();f4UId=nid();}
  const fontRes=`/F1 ${f1Id} 0 R /F2 ${f2Id} 0 R`+(tfR?` /F3 ${f3Id} 0 R`:'')+(tfB?` /F4 ${f4Id} 0 R`:'');
  const images=new Map(),scratch=document.createElement('canvas');
  if(snapshot.photos.size)await writePdfImages(store,snapshot.photos,images,scratch);
  if(destroyed)return;
  const renderImage=(key,x,y,w,h)=>{
    const {name}=images.get(key);
    const width=(w*PDF_SCALE).toFixed(6),height=(h*PDF_SCALE).toFixed(6);
    return `q ${width} 0 0 ${height} ${px(x)} ${py(y+h)} cm /${name} Do Q`;
  };

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
    // Glyph zero is .notdef. Use the browser font stack for the intact line.
    if(glyphs.some(g=>g.codepoint===0))return null;
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
  for(const s of snapshot.segments){
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
  for(const {x,center,labels,images:placements} of snapshot.nodes){
    const tx=center?px(center.x)-pdfStrW(center.label,center.bold,center.fs)/2:px(x);
    for(const label of labels){
      const text=renderLabel(tx+label.x*PDF_SCALE,py(label.y),label.text,label.bold,label.fs,label.color);
      if(text!==null){ops.push(text);continue;}
      const raster=pdfLabelRaster(label);
      if(!raster)continue;
      const key=JSON.stringify([label.text,label.bold,label.fs,label.color]);
      if(!images.has(key)){
        const samples=readPdfRaster(scratch,raster.width,raster.height,raster.paint);
        await addPdfImage(store,images,key,samples);
        if(destroyed)return;
      }
      ops.push(renderImage(key,x+label.x+raster.x,label.y+raster.y,raster.w,raster.h));
    }
    for(const box of placements)ops.push(renderImage(box.id,box.x,box.y,box.w,box.h));
  }

  const imageRes=images.size
    ? ' /XObject << '+Array.from(images.values(),({name,id})=>`/${name} ${id} 0 R`).join(' ')+' >>' : '';
  const stream=ops.join('\n');
  setObj(catId,`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  setObj(pagesId,`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  setObj(pageId,`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pgW} ${pgH}] /Contents ${stmId} 0 R /Resources << /Font << ${fontRes} >>${imageRes} >> >>`);
  setStream(stmId,stream);
  setObj(f1Id,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
  setObj(f2Id,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
  if(tfR)embedTTFFont(store,tfR,f3Id,f3CId,f3DId,f3FId,f3UId,'Sarabun-Regular');
  if(tfB)embedTTFFont(store,tfB,f4Id,f4CId,f4DId,f4FId,f4UId,'Sarabun-Bold');

  const headerParts=['%PDF-1.4\n'];
  // A PDF with binary streams marks its header as binary.
  if(images.size)headerParts.push(new Uint8Array([37,226,227,207,211,10]));
  const hdr=new Blob(headerParts);
  const{parts,offs,xrefPos}=store.assembleBody(hdr.size);
  const totalObjs=store.totalObjs();
  let xref=`xref\n0 ${totalObjs+1}\n0000000000 65535 f \n`;
  for(const off of offs)xref+=`${String(off).padStart(10,'0')} 00000 n \n`;
  const trailer=`trailer\n<< /Size ${totalObjs+1} /Root ${catId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new File([hdr,...parts,xref,trailer],snapshot.filename,{type:'application/pdf'});
}

function downloadPDF(file){
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');
  a.href=url;a.download=file.name;a.hidden=true;
  objectURLs.add(url);container.appendChild(a);a.click();
  // Let the browser finish taking ownership of the file before releasing its URL.
  setTimeout(()=>{a.remove();if(objectURLs.delete(url))URL.revokeObjectURL(url);},60000);
}

const st={lay:null,scale:1,panX:0,panY:0};
const gesture={drag:null,mouseZoom:null,t1d:null,touchMoved:false,startX:0,startY:0,sequence:null,suppressMouseUntil:0,suppressAux:false,pointerType:'mouse'};
// Same private Safari identity as the shell; modules remain independent.
const ipadSafari=navigator.maxTouchPoints>1&&(/iPad/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&/Macintosh/i.test(navigator.userAgent))&&/AppleWebKit/i.test(navigator.userAgent)&&/Version\//i.test(navigator.userAgent)&&/Safari\//i.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Android|Edg\/|OPR\//i.test(navigator.userAgent);
function canvasInteraction(value){if(typeof opts.onCanvasInteraction==='function'){try{const result=opts.onCanvasInteraction(value);if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});}catch(error){/* Host menu failure cannot interrupt the canvas. */}}}
const DOUBLE_INTERVAL=150;
let tapCandidate=null,tapTimer=null,tapPair=null;
function clearTap(){
  clearTimeout(tapTimer);tapTimer=null;tapCandidate=null;tapPair=null;
}
function confirmSingleTap(candidate){
  if(candidate&&!paused&&!document.hidden)
    canvasInteraction({kind:'tap',input:candidate.channel==='mouse'?'mouse':'touch'});
}
function tapPress(channel,x,y,distance){
  const now=performance.now(),prior=tapCandidate;
  tapPair=null;
  if(!prior)return;
  clearTimeout(tapTimer);tapTimer=null;tapCandidate=null;
  if(prior.channel===channel&&now-prior.time<DOUBLE_INTERVAL&&Math.hypot(x-prior.x,y-prior.y)<distance){
    tapPair={channel};
  }else if(now-prior.time>=DOUBLE_INTERVAL){
    confirmSingleTap(prior);
  }
}
function tapRelease(channel,x,y){
  if(tapPair?.channel===channel){
    clearTap();
    const hit=mapHit(x,y,channel==='mouse'?4:12);
    if(hit)canvasInteraction({kind:'reveal',...hit});
    return;
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
function cancelGestures(){clearTap();gesture.drag=null;gesture.mouseZoom=null;gesture.t1d=null;gesture.sequence=null;canvas.style.cursor='grab';canvasActivity();}
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
    cancelGestures();clearMapPhotos();paused=true;pendingRender=pendingRender||rtimer!==null;
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
// Settings/presentation transitions match real-node preorder only within the same source revision.
function preserveViewportAroundVisibleNode(prevLay,newLay){
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
function defaultPhotoHeight(node, localCapHeight) {
  const depth = Math.max(1, node.depth);
  const scale = layoutPreferences.branchScale;
  if (scale === DEFAULT_BRANCH_SCALE) return 3 * depth * localCapHeight;

  // Interpolate in log scale, with limited extra compensation above the default.
  const progress = Math.log(scale) / Math.log(DEFAULT_BRANCH_SCALE);
  const extra = Math.max(0, progress - 1);
  const extraCompensationLimit = 0.25;
  const strength = Math.min(1, progress) + extraCompensationLimit * extra / (extraCompensationLimit + extra);
  const depthMultiplier = 6 * Math.pow(depth / 2, strength);

  if (scale > DEFAULT_BRANCH_SCALE) return depthMultiplier * localCapHeight;
  const referenceInk = inkMetrics('H', C.BASE_FONT, 'normal');
  const referenceHeight = (referenceInk.ascent + referenceInk.descent) * (node.baseFs / C.BASE_FONT);
  const capHeight = scale === MIN_BRANCH_SCALE
    ? referenceHeight
    : referenceHeight * Math.pow(localCapHeight / referenceHeight, strength);
  return depthMultiplier * capHeight;
}

function measurePhotos(node, block) {
  if (!node.photos?.length) return;
  const ink = inkMetrics('H', node.baseFs, node.fw);
  const height = defaultPhotoHeight(node, ink.ascent + ink.descent) * Math.min(4, node.mapSize ?? 1);
  // Anchor to ordinary title ink and retain the center used by layout clearance.
  const gap = height / 12, y = node.fs * C.BASELINE_FRAC - ink.ascent;
  node.capFrac = (y + height / 2) / node.fs;
  let width = 0;
  block.photos = node.photos.map(photo => {
    const w = height * photo.width / photo.height;
    const x = width ? width + gap : 0;
    width = x + w;
    return {photo, x, y, w, h: height};
  });
  block.titleWidth = width;
  block.width = Math.max(block.width, width);
  block.bottom = Math.max(block.bottom, y + height);
  block.extraHeight = Math.max(0, block.bottom - node.fs);
}

const mapPhotos = new Map();
const visibleMapPhotos = new Set();
let photoRepaint = null, mapPhotoPixels = 0;
function clearMapPhotos() {
  for (const state of mapPhotos.values()) state.lease.release();
  mapPhotos.clear();
  if (photoRepaint !== null) cancelAnimationFrame(photoRepaint);
  photoRepaint = null;
}

function drawPhoto(ctx, node, box) {
  const {photo, w, h} = box, x = node.x + box.x, y = node.y + box.y;
  const scale = st.scale, dpr = window.devicePixelRatio || 1;
  const right = st.panX + (x + w) * scale, bottom = st.panY + (y + h) * scale;
  if (right < 0 || bottom < 0 || st.panX + x * scale > canvas.width / dpr || st.panY + y * scale > canvas.height / dpr) return;
  const aspect = photo.width / photo.height, drawWidth = Math.min(w, h * aspect), drawHeight = drawWidth / aspect;
  const maxEdge = Math.max(photo.width, photo.height);
  function load(quality, edge) {
    const key = `${photo.id}:${quality}`;
    if (!visibleMapPhotos.has(key)) {
      const pixels = Math.ceil(edge * edge * Math.min(aspect, 1 / aspect));
      if (mapPhotoPixels + pixels > 3_000_000) return null;
      mapPhotoPixels += pixels;
      visibleMapPhotos.add(key);
    }
    if (!mapPhotos.has(key)) {
      const lease = opts.acquirePhoto(photo, quality), state = {lease};
      mapPhotos.set(key, state);
      lease.ready.then(image => { state.image = image; settle(); }).catch(() => { state.failed = true; settle(); });
      function settle() {
        if (mapPhotos.get(key) !== state || destroyed || photoRepaint !== null) return;
        photoRepaint = requestAnimationFrame(() => { photoRepaint = null; draw(); });
      }
    }
    return mapPhotos.get(key);
  }
  const thumb = load('thumb', Math.min(maxEdge, 320));
  const detail = maxEdge > 320 && Math.max(drawWidth, drawHeight) * scale * dpr > 320 ? load('detail', maxEdge) : null;
  const image = detail?.image || thumb?.image;
  if (image) {
    ctx.drawImage(image, x + (w - drawWidth) / 2, y + (h - drawHeight) / 2, drawWidth, drawHeight);
  } else {
    ctx.strokeStyle = labelColor(node, false);
    ctx.lineWidth = Math.max(1, 1 / scale);
    ctx.strokeRect(x, y, w, h);
    if (thumb?.failed) {
      ctx.font = `${Math.min(12, h / 3)}px ${C.FONT}`;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText('Unavailable', x + 2, y + h / 2, Math.max(1, w - 4));
    }
  }
}

function draw(){
  if(paused||holdDrawing)return;
  const dpr=devicePixelRatio||1;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=C.BG;ctx.fillRect(0,0,canvas.width,canvas.height);
  if(!st.lay){
    clearMapPhotos();
    const W=canvas.width,H=canvas.height,sp=35*dpr,r=1.5*dpr;
    ctx.fillStyle='rgba(0,0,0,0.065)';
    for(let x=sp/2;x<W;x+=sp)for(let y=sp/2;y<H;y+=sp){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    hudEl.textContent='100%';return;
  }
  ctx.save();
  ctx.setTransform(st.scale*dpr,0,0,st.scale*dpr,st.panX*dpr,st.panY*dpr);
  visibleMapPhotos.clear(); mapPhotoPixels=0;
  drawConn(ctx,st.lay);drawHighlights();drawLbls(ctx,st.lay.root);
  for(const [key,state] of mapPhotos){
    if(!visibleMapPhotos.has(key)){state.lease.release();mapPhotos.delete(key);}
  }
  ctx.restore();
  const pct=st.scale*100;
  hudEl.textContent=(pct>=1?Math.round(pct):pct.toFixed(pct>=0.1?1:2))+'%';
}
function redraw(){draw();}

/* ══ ZOOM & PAN ══ */
function markTouched(){const latest=liveInsets;cancelLiveViewport();uiState.userTouchedCanvas=true;if(latest)applyViewportInsets(latest,{duration:0});cancelAnimationFrame(_raf);_raf=null;cancelAnimationFrame(kbLift.animId);kbLift.animId=null;}
const zoomFactor=()=>Math.max(2.5,layoutPreferences.branchScale);
// Use the same run and photo geometry and paint order as drawLbls.
function mapHit(clientX,clientY,radius){
  if(!st.lay||pendingRender||rtimer!==null||paused||holdDrawing)return null;
  const rect=canvas.getBoundingClientRect();
  const x=(clientX-rect.left-st.panX)/st.scale,y=(clientY-rect.top-st.panY)/st.scale;
  let nearest=null,limit=(radius/st.scale)**2;
  function consider(node,left,top,right,bottom,photoId){
    const dx=Math.max(left-x,0,x-right),dy=Math.max(top-y,0,y-bottom);
    const distance=dx*dx+dy*dy;
    if(distance<=limit){limit=distance;nearest={nodeId:node.outlineId,photoId};}
  }
  function visit(node){
    if(Number.isSafeInteger(node.outlineId)&&node.kind!=='spacer'){
      for(const run of node.textBlock.runs){
        if(!run.text.trim())continue;
        const origin=node.x+run.x,baseline=node.y+run.baseline;
        consider(node,origin-run.left,baseline-run.ascent,origin+run.right,baseline+run.descent);
      }
      for(const box of node.textBlock.photos||[]){
        const left=node.x+box.x,top=node.y+box.y;
        consider(node,left,top,left+box.w,top+box.h,box.photo.id);
      }
    }
    node.children.forEach(visit);
  }
  visit(st.lay.root);
  return nearest;
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
listen(canvas,'touchstart',e=>{
  e.preventDefault();if(paused)return;canvasActivity();gesture.suppressMouseUntil=performance.now()+800;
  const now=performance.now();
  if(!gesture.sequence&&e.touches.length>=2)gesture.sequence={time:now,multi:true};
  if(e.touches.length===1&&!gesture.sequence){
    const t=e.touches[0];tapPress('one-touch',t.clientX,t.clientY,40);gesture.sequence={time:now,multi:false};
    gesture.drag={sx:t.clientX-st.panX,sy:t.clientY-st.panY};gesture.startX=t.clientX;gesture.startY=t.clientY;gesture.touchMoved=false;gesture.t1d=null;
  }else if(e.touches.length>=2){
    clearTap();gesture.sequence.multi=true;gesture.drag=null;
    gesture.t1d=e.touches.length===2?td(e.touches):null;
  }
},{passive:false});
listen(canvas,'touchmove',e=>{
  e.preventDefault();if(paused)return;canvasActivity();
  if(e.touches.length===1&&gesture.drag&&!gesture.sequence?.multi){
    const dx=e.touches[0].clientX-gesture.startX,dy=e.touches[0].clientY-gesture.startY;
    if(!gesture.touchMoved&&Math.hypot(dx,dy)>3){gesture.touchMoved=true;clearTap();markTouched();}
    st.panX=e.touches[0].clientX-gesture.drag.sx;st.panY=e.touches[0].clientY-gesture.drag.sy;
  }else if(e.touches.length===2&&gesture.t1d!==null)applyPinch(e.touches);
  redraw();
},{passive:false});
listen(canvas,'touchend',e=>{
  gesture.suppressMouseUntil=performance.now()+800;
  const seq=gesture.sequence;if(!seq)return;
  if(e.touches.length)return;
  if(!seq.multi&&!gesture.touchMoved&&performance.now()-seq.time<=250&&e.changedTouches.length===1&&Math.hypot(e.changedTouches[0].clientX-gesture.startX,e.changedTouches[0].clientY-gesture.startY)<=3&&insideCanvas(e.changedTouches[0].clientX,e.changedTouches[0].clientY)){
    const t=e.changedTouches[0],tx=t.clientX,ty=t.clientY;
    tapRelease('one-touch',tx,ty);
  }else if(!seq.multi){clearTap();}
  gesture.drag=null;gesture.t1d=null;gesture.touchMoved=false;gesture.sequence=null;
});
listen(canvas,'touchcancel',cancelGestures);
/* ══ STRING INPUT / SETTINGS ══ */
function schedRender(){pendingRender=true;clearTimeout(rtimer);if(paused){rtimer=null;return;}rtimer=setTimeout(()=>{rtimer=null;render();},C.RENDER_DEBOUNCE);}
function flushRender(forExport=false){clearTimeout(rtimer);rtimer=null;render(forExport);}
function render(forExport=false){
  if(liveFrame!==null&&!holdDrawing&&!forExport){pendingRender=true;return;}
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
  flagPlaceholders(root,sourcePlaceholders);attachNodeTexts(root,sourceNodeTexts,sourceTitleLines);attachPresentation(root,sourcePresentation);attachChildPresence(root,sourceHasChildren);layoutPreferences.observeRoot(root,sourceReady,sourceStats);
  const prevLay=st.lay;
  st.lay=layout(root,uiState.colorSeed);st.lay.hasDescriptions=!!(sourceNodeTexts&&sourceNodeTexts.some(text=>text.includes('\n')));refreshLabelColors(st.lay);pendingColor=false;emptyEl.style.display='none';
  const bounds=contentBounds(st.lay);fitBounds.set(st.lay,bounds);
  layoutTransitions.set(st.lay,{settingsRevision:layoutSettingsRevision,revision:sourceRevision,bounds});
  if(uiState.userTouchedCanvas&&prevLay){
    if(presentationChanged||layoutTransitions.get(prevLay)?.settingsRevision!==layoutSettingsRevision)preserveViewportAroundVisibleNode(prevLay,st.lay);
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
  let metadataCount=null;
  function countMetadataNodes(){return metadataCount??(metadataCount=text.split('\n').filter(line=>line.trim().replace(/^[-*•]\s+/,'').trim()).length);}
  let nodeIds=null;
  if(options && 'nodeIds' in options){
    const ids=options.nodeIds;
    if(!Array.isArray(ids)||ids.length!==countMetadataNodes()||!Array.from(ids).every(Number.isSafeInteger)||new Set(ids).size!==ids.length)
      throw new TypeError('Invalid outline node IDs');
    nodeIds=ids.slice();
  }
  let nodeTexts=null;
  if(options&&'nodeTexts' in options){
    const values=options.nodeTexts,count=countMetadataNodes();
    if(!Array.isArray(values)||values.length!==count||Array.from(values).some(v=>typeof v!=='string')){const error=new TypeError('Node description metadata does not match the map outline');reportError(error);throw error;}
    nodeTexts=values.slice();
  }
  let titleLines=null;
  if(options&&'nodeTitleLines' in options){
    const values=options.nodeTitleLines;
    if(!nodeTexts||!Array.isArray(values)||values.length!==nodeTexts.length||Array.from(values).some((count,i)=>!Number.isSafeInteger(count)||count<1||count>nodeTexts[i].split('\n').length)){
      const error=new TypeError('Invalid node title-line metadata');reportError(error);throw error;
    }
    titleLines=values.slice();
  }
  let stats=null;
  if(options&&'outlineStats' in options){const value=options.outlineStats;
    if(!value||!Number.isSafeInteger(value.maxDepth)||value.maxDepth<0||!Number.isSafeInteger(value.maxSiblings)||value.maxSiblings<0){const error=new TypeError('Invalid complete-outline statistics');reportError(error);throw error;}
    stats={maxDepth:value.maxDepth,maxSiblings:value.maxSiblings};
    for(const key of ['rootCount','maxFirstLevel'])if(key in value){if(!Number.isSafeInteger(value[key])||value[key]<0){const error=new TypeError('Invalid complete-outline statistics');reportError(error);throw error;}stats[key]=value[key];}
  }
  let presentation=null;
  if(options&&'nodePresentation' in options){
    const values=options.nodePresentation,count=countMetadataNodes();
    const invalid=p=>!p||!['node','spacer'].includes(p.kind)||mapSizeUnits(p.mapSize)===null
      ||p.childrenInRow!==undefined&&(p.childrenInRow!==true||p.kind==='spacer')
      ||p.photos!==undefined&&(p.kind==='spacer'||typeof opts.acquirePhoto!=='function'||!Array.isArray(p.photos)||!p.photos.length||p.photos.length>5
      ||Array.from(p.photos).some(photo=>!photo||typeof photo.id!=='string'||!/^[0-9a-f]{32}$/.test(photo.id)
      ||[photo.width,photo.height].some(value=>!Number.isInteger(value)||value<1||value>1600)));
    if(!Array.isArray(values)||values.length!==count||Array.from(values).some(invalid)){const error=new TypeError('Invalid node presentation metadata');reportError(error);throw error;}
    presentation=values.map(p=>({kind:p.kind,mapSize:mapSizeUnits(p.mapSize)/MAP_SIZE_UNITS,...(p.childrenInRow?{childrenInRow:true}:{}),...(p.photos?{photos:p.photos.map(({id,width,height})=>({id,width,height}))}:{})}));
    const parsed=parse(text),stack=parsed?(parsed.synthetic?parsed.children.slice().reverse():[parsed]):[];let index=0;
    while(stack.length){const n=stack.pop(),p=presentation[index];if(p.kind==='spacer'&&(n.children.length||nodeTexts&&nodeTexts[index]!==''||titleLines&&titleLines[index]!==1)){const error=new TypeError('A spacer must be an empty leaf');reportError(error);throw error;}index++;for(let i=n.children.length-1;i>=0;i--)stack.push(n.children[i]);}
  }
  let hasChildren=null;
  if(options&&'nodeHasChildren' in options){
    const values=options.nodeHasChildren,count=countMetadataNodes();
    if(!Array.isArray(values)||values.length!==count||Array.from(values).some((v,i)=>typeof v!=='boolean'||presentation?.[i].kind==='spacer'&&v)){const error=new TypeError('Invalid canonical child-presence metadata');reportError(error);throw error;}
    hasChildren=values.slice();
  }
  const onlyPresentation=JSON.stringify(nodeIds)===JSON.stringify(sourceNodeIds)&&text===sourceText&&JSON.stringify(titleLines)===JSON.stringify(sourceTitleLines)&&JSON.stringify(hasChildren)===JSON.stringify(sourceHasChildren)&&JSON.stringify(nodeTexts)===JSON.stringify(sourceNodeTexts)&&JSON.stringify(stats)===JSON.stringify(sourceStats)&&placeholders.join(',')===sourcePlaceholders.join(',');
  if(onlyPresentation&&JSON.stringify(presentation)===JSON.stringify(sourcePresentation))return;
  if(!onlyPresentation)sourceRevision++;presentationChanged=presentationChanged||onlyPresentation;sourceStats=stats;sourcePresentation=presentation;sourceHasChildren=hasChildren;sourceReady=true;
  sourceNodeIds=nodeIds;sourceTitleLines=titleLines;sourceText=text;sourcePlaceholders=placeholders;sourceNodeTexts=nodeTexts;
  if(!text.trim())flushRender();else if(onlyPresentation){pendingRender=true;if(!paused&&rtimer===null)rtimer=setTimeout(()=>{rtimer=null;render();},Math.max(0,50-(performance.now()-lastPresentationRender)));}else schedRender();
}
function getSettingBounds(){return layoutPreferences.getSettingBounds();}
function getSettings(){return{...layoutPreferences.getSettings(),colorSeed:uiState.colorSeed};}
function setSettings(partial={}){
  if(destroyed)return getSettings();
  if(!paused&&rtimer!==null)flushRender();
  const before=JSON.stringify(getSettings()),beforeLayout=JSON.stringify(layoutPreferences.getSettings());
  layoutPreferences.apply(partial);
  if(beforeLayout!==JSON.stringify(layoutPreferences.getSettings()))layoutSettingsRevision++;
  if('colorSeed' in partial){const v=String(partial.colorSeed).trim();if(v!=='')uiState.colorSeed=Math.max(0,parseInt(v,10)||0);}
  if(before===JSON.stringify(getSettings()))return getSettings();
  flushRender();
  if(!paused&&!uiState.userTouchedCanvas&&st.lay&&canvas.clientWidth>0&&canvas.clientHeight>0)animateFit(300);
  return getSettings();
}
// R12-4B: recolor the retained layout without touching source, geometry or animation.
function applyPendingColor(){
  if(!pendingColor||paused||destroyed)return;
  if(st.lay){assignColors(st.lay.root,220,0,0,uiState.colorSeed);refreshLabelColors(st.lay);}
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
  if(destroyed)return;cancelGestures();clearMapPhotos();destroyed=true;pendingColor=false;highlightCache=null;searchQuery='';
  pdfPhotoLease?.release();pdfPhotoLease=null;
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
window.MindMap={version:'1.20.6',apiVersion:1,capabilities:['text-input','photo-attachments-v1','node-title-lines','viewport-fit','settings-v1','pdf-export','pdf-photo-export-v1','pdf-prepare-v1','reset-view','placeholderNodes','viewport-insets','settings-bounds','chrome-occlusion','live-viewport-fit','color-seed-only','node-descriptions','branch-layout-v1','branch-layout-v2','root-layout-v1','root-order-v1','branch-scale-v1','branch-length-limit-v1','canvas-interaction-v1','search-highlight-v1','node-presentation-v1','node-presentation-v2','node-presentation-v3','confirmed-single-tap-v1','outline-reveal-v1'],mount};
})();
