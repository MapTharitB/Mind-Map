/* Outliner version 1.23.3 | apiVersion 1. Classic, single-instance mountable module. */
(function () {
// One DOM-only numeric lifecycle, shared by the editor and optional shell adapters.
function createNumericStepper(config){
  const {button}=config,removers=[];
  let active=null,observer=null,disposed=false,suppressClick=false;
  function on(target,type,fn,options){
    target.addEventListener(type,fn,options);
    removers.push(()=>target.removeEventListener(type,fn,options));
  }
  function usable(){
    const bound=config.bounds?.(),atLimit=active?.held&&bound&&Number(config.read())===(config.direction>0?bound.max:bound.min);
    return !disposed&&button.isConnected&&(!button.disabled||atLimit)&&!document.hidden&&
      button.getClientRects().length&&(!config.allowed||config.allowed());
  }
  function publishScale(a,value){
    a.last=value;config.write(value);
  }
  function finish(){
    const a=active;
    if(!a)return;
    active=null;observer?.disconnect();observer=null;
    clearTimeout(a.timer);cancelAnimationFrame(a.frame);
    if(a.held){
      suppressClick=true;
      if(config.scale&&a.latest!==a.last)publishScale(a,a.latest);
      config.finish?.();
    }
    if(button.hasPointerCapture?.(a.id)){
      try{button.releasePointerCapture(a.id);}catch(_){}
    }
  }
  // Hold time and projected distance use the same value curve and publication budget.
  function scaledValue(a,direction,seconds,drag=false){
    const bounds=config.bounds(),elapsed=Math.max(0,seconds),ramp=Math.max(0,Math.min(1.4,elapsed-.3));
    const delta=(drag?0:.01)+.5*Math.min(elapsed,.3)+.5*ramp+
      (1.5/2.8)*ramp*ramp+2*Math.max(0,elapsed-1.7);
    return config.valueAt?config.valueAt({startValue:a.value,direction,elapsedSeconds:elapsed,bounds,initialStep:!drag}):Math.max(bounds.min,Math.min(bounds.max,Math.round((a.value+direction*delta+Number.EPSILON)*100)/100));
  }
  function publishPending(a,now){
    if(a.latest!==a.last&&now-a.publishedAt>=50){a.publishedAt=now;publishScale(a,a.latest);}
  }
  function drag(a,x,y){
    const dx=x-a.dragX,dy=y-a.dragY;
    const distance=dx*dy<=0?Math.sign(dx-dy)*Math.hypot(dx,dy):dx-dy;
    if(config.scale){
      a.latest=scaledValue(a,Math.sign(distance),Math.abs(distance)/120,true);
      publishPending(a,performance.now());
      if(a.latest!==a.last&&!a.frame)a.frame=requestAnimationFrame(function flush(now){
        a.frame=null;if(active!==a)return;if(!usable()){finish();return;}
        publishPending(a,now);if(a.latest!==a.last)a.frame=requestAnimationFrame(flush);
      });
      const bounds=config.bounds();if(a.latest===bounds.min||a.latest===bounds.max){a.value=a.latest;a.dragX=x;a.dragY=y;}
    }else{
      const steps=Math.trunc(distance/12),delta=steps-a.dragSteps;
      if(delta){
        config.step(Math.sign(delta),Math.abs(delta));a.dragSteps=steps;
        const bounds=config.bounds?.(),value=Number(config.read());
        if(bounds&&(value===bounds.min&&distance<0||value===bounds.max&&distance>0)){
          a.value=value;a.dragX=x;a.dragY=y;a.dragSteps=0;
        }
      }
    }
  }
  function beginDrag(a){
    clearTimeout(a.timer);cancelAnimationFrame(a.frame);a.frame=null;
    // Transition from the last visible value, without a second history session.
    a.dragging=true;a.value=Number(config.read());a.last=a.latest=a.value;a.dragX=a.x;a.dragY=a.y;a.dragSteps=0;
  }
  function move(event){
    const a=active;if(!a||event.pointerId!==a.id)return;
    a.x=event.clientX;a.y=event.clientY;
    if(!a.held)return;
    if(!usable()){finish();return;}
    if(!a.dragging&&Math.hypot(a.x-a.pressX,a.y-a.pressY)>=8)beginDrag(a);
    if(a.dragging){event.preventDefault();drag(a,a.x,a.y);}
  }
  function tick(now){
    const a=active;
    if(!a)return;
    if(!usable()){finish();return;}
    if(config.scale){
      const elapsed=Math.max(0,(now-a.repeatAt)/1000);
      a.latest=scaledValue(a,config.direction,elapsed);
      publishPending(a,now);
      a.frame=requestAnimationFrame(tick);
    }else{
      config.step(config.direction);
      if(!usable()){finish();return;}
      // Schedule from this tick, never catch up missed discrete steps.
      a.timer=setTimeout(()=>{
        if(active===a)a.frame=requestAnimationFrame(tick);
      },100);
    }
  }
  function startRepeat(a){
    if(active!==a||!usable()){finish();return;}
    if(config.start?.()===false){finish();return;}
    a.held=true;a.value=Number(config.read());a.last=a.latest=a.value;
    a.repeatAt=performance.now();a.publishedAt=a.repeatAt-50;
    try{button.setPointerCapture(a.id);}catch(_){}
    if(Math.hypot(a.x-a.pressX,a.y-a.pressY)>=8)beginDrag(a);
    else if(config.valueAt)tick(a.repeatAt);else a.frame=requestAnimationFrame(tick);
  }
  function press(event){
    finish();suppressClick=false;
    if(event.button!==0||event.isPrimary===false||event.isComposing||event.keyCode===229||!usable())return;
    const a=active={id:event.pointerId,held:false,dragging:false,pressX:event.clientX,pressY:event.clientY,x:event.clientX,y:event.clientY,timer:null,frame:null};
    // Only an active press observes DOM lifetime/availability changes.
    observer=new MutationObserver(()=>{if(active&&!usable())finish();});
    observer.observe(document.documentElement,{subtree:true,attributes:true,childList:true,
      attributeFilter:['disabled','hidden','class','style']});
    a.timer=setTimeout(()=>startRepeat(a),300);
  }
  function click(event){
    if(suppressClick||!usable()){
      suppressClick=false;event.preventDefault();event.stopImmediatePropagation();return;
    }
    config.step();
  }
  function key(event){
    if(active)finish();
    if(event.target!==button||![' ','Enter'].includes(event.key))return;
    suppressClick=false;
    if(event.repeat){event.preventDefault();event.stopImmediatePropagation();}
  }
  on(button,'pointerdown',press);on(button,'click',click,true);
  on(window,'pointermove',move,{capture:true,passive:false});
  for(const type of ['pointerup','pointercancel','lostpointercapture']){
    on(window,type,event=>{if(active&&event.pointerId===active.id)finish();},true);
  }
  on(document,'pointerdown',event=>{
    if(active&&(event.pointerId!==active.id||!button.contains(event.target)))finish();
  },true);
  on(document,'keydown',key,true);on(window,'blur',finish);
  on(document,'visibilitychange',()=>{if(document.hidden)finish();});
  return{finish,dispose(){
    finish();disposed=true;observer?.disconnect();
    removers.splice(0).forEach(remove=>remove());
  }};
}
// One numeric draft lifecycle for the editor and the shell. Adapters own application state.
function bindNumericInputs(root,{ipad=false}={}){
  const fields=new Map(),removers=[],legacyComposition=new WeakSet();
  let active=null,pointer=null,releaseTimer=null,viewport=null;
  const vv=ipad?window.visualViewport:null;
  function on(target,type,fn,options){
    target.addEventListener(type,fn,options);removers.push(()=>target.removeEventListener(type,fn,options));
  }
  function register(input,{read,write,bounds,precision=0,format=String,explicit=false,deferPointer=false,onCompose,onDraft}){
    input.type='text';
    input.inputMode=precision?'decimal':'numeric';
    input.spellcheck=false;input.autocomplete='off';input.setAttribute('autocapitalize','off');
    const pattern=precision?/^-?[0-9]*(?:\.[0-9]*)?$/:/^-?[0-9]*$/;
    let last=input.value,dirty=false,composing=false,pending=false,settling=false,discardComposition=false;
    function refresh(value=read()){if(!dirty&&!composing){last=format(value);input.value=last;}}
    function normalize(number){
      const {min,max}=bounds(),factor=10**precision;
      const value=Math.max(min,Math.min(Number.isFinite(max)?max:Number.MAX_SAFE_INTEGER,number));
      return Math.round((value+Number.EPSILON)*factor)/factor;
    }
    const field={input,pattern,deferPointer,normalize,get dirty(){return dirty;},get composing(){return composing;},
      get pointerPending(){return pointer?.field===field;},refresh,
      accept(){
        if(pattern.test(input.value)){last=input.value;dirty=true;onDraft?.();}
        else {const pos=Math.max(0,(input.selectionStart??last.length)-Math.max(0,input.value.length-last.length));input.value=last;input.setSelectionRange(pos,pos);}
      },
      compose(start){
        composing=start;
        if(start){discardComposition=false;onCompose?.();return;}
        if(discardComposition)refresh();
        else if(input.value!==last)field.accept();
        if(pending){pending=false;queueMicrotask(()=>{if(fields.get(input)===field&&document.activeElement!==input&&!field.pointerPending)field.settle();});}
      },
      settle(submit=false){
        if(settling)return true;
        if(composing){pending=true;return false;}
        if(!dirty&&!(submit&&explicit)){refresh();return true;}
        const text=input.value,number=pattern.test(text)?Number(text):NaN;
        dirty=false;settling=true;
        try{
          if(!input.disabled&&/\d/.test(text)&&!Number.isNaN(number))write(normalize(number));
        }finally{settling=false;refresh();}
        return true;
      },
      reset(){pending=dirty=false;if(composing)discardComposition=true;else refresh();},
    };
    fields.set(input,field);refresh();return field;
  }
  function selection(e){
    const input=e.target,field=fields.get(input);
    if(input.disabled||e.isComposing||field?.composing||legacyComposition.has(input))return;
    if(field){
      if(active!==field){active=field;viewport=null;trackViewport();}
      input.select();
    }else if(input.matches?.('input[type="number"]'))input.select();
  }
  function blockInsertion(e,data){
    const field=fields.get(e.target);
    if(!field||typeof data!=='string')return;
    const {value,selectionStart:start,selectionEnd:end}=field.input;
    if(!field.pattern.test(value.slice(0,start)+data+value.slice(end)))e.preventDefault();
  }
  function settlePointer(){
    const previous=pointer;pointer=null;clearTimeout(releaseTimer);
    if(previous)previous.field.settle();
  }
  function trackViewport(){
    if(!vv||!active||document.activeElement!==active.input)return;
    const height=vv.height*vv.scale,width=document.documentElement.clientWidth,full=document.documentElement.clientHeight;
    if(!viewport||viewport.width!==width||viewport.scale!==vv.scale){viewport={width,scale:vv.scale,opened:false};}
    if(full-height>120)viewport.opened=true;
    else if(viewport.opened&&height>=full-2){
      viewport.opened=false;
      const field=active;if(field.dirty&&!field.composing){field.settle();field.input.blur();}
    }
  }
  for(const type of ['focusin','click'])on(root,type,selection);
  for(const type of ['compositionstart','compositionend'])on(root,type,e=>{
    const field=fields.get(e.target),start=type==='compositionstart';
    if(field)field.compose(start);else if(start)legacyComposition.add(e.target);else legacyComposition.delete(e.target);
  });
  on(root,'beforeinput',e=>{if(e.inputType?.startsWith('insert'))blockInsertion(e,e.data??e.dataTransfer?.getData('text/plain'));});
  on(root,'paste',e=>blockInsertion(e,e.clipboardData?.getData('text/plain')));
  on(root,'input',e=>{const field=fields.get(e.target);if(field&&!field.composing&&!e.isComposing)field.accept();});
  on(root,'keydown',e=>{
    const input=e.target,field=fields.get(input);
    if(input.disabled||e.isComposing||e.keyCode===229||field?.composing||legacyComposition.has(input))return;
    if(e.key==='Enter'&&(field||input.matches?.('input[type="number"]'))){e.preventDefault();field?.settle(true);input.blur();}
    else if(field&&['ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();
  });
  on(root,'focusout',e=>{
    const field=fields.get(e.target);if(!field)return;
    if(active===field){active=null;viewport=null;}
    if(!field.pointerPending)field.settle();
  });
  on(document,'pointerdown',e=>{
    if(pointer)settlePointer();
    if(!active||e.target===active.input||!active.deferPointer||e.button!==0||e.isPrimary===false)return;
    pointer={field:active,id:e.pointerId};
  },true);
  on(document,'click',e=>{
    if(pointer&&e.target!==pointer.field.input)settlePointer();
    else if(active&&e.target!==active.input&&!active.deferPointer)active.settle();
  });
  for(const type of ['pointerup','pointercancel'])on(document,type,e=>{
    if(pointer?.id===e.pointerId)releaseTimer=setTimeout(settlePointer,80);
  },true);
  if(vv)on(vv,'resize',trackViewport);
  return{register,dispose(){clearTimeout(releaseTimer);fields.clear();removers.forEach(remove=>remove());}};
}
const MIN_MAP_SIZE=0.1,MAX_MAP_SIZE=1000,MAP_SIZE_UNITS=10000;
function mapSizeUnits(value){
  if(typeof value!=='number'||!Number.isFinite(value)||value<MIN_MAP_SIZE||value>MAX_MAP_SIZE)return null;
  const scaled=value*MAP_SIZE_UNITS,units=Math.round(scaled);
  return Math.abs(scaled-units)<=1e-7?units:null;
}
function normalizeMapSize(value){return Math.round(Math.max(MIN_MAP_SIZE,Math.min(MAX_MAP_SIZE,value))*MAP_SIZE_UNITS)/MAP_SIZE_UNITS;}
function mapSizeAt({startValue,direction,elapsedSeconds,bounds,initialStep=true}){
  const t=Math.max(0,elapsedSeconds),r=Math.max(0,Math.min(1.5,t-.5)),exponent=(initialStep?1:0)+4*t+4*r*r+12*Math.max(0,t-2);
  const signed=Math.max(Math.log(bounds.min/startValue),Math.min(Math.log(bounds.max/startValue),direction*Math.log(1.1)*exponent));
  return normalizeMapSize(startValue*Math.exp(signed));
}
function displayMapSize(value){return (Math.round(mapSizeUnits(value)/100)/100).toFixed(2);}
const MAX_PHOTOS = 5;
function validPhotos(photos) {
  return Array.isArray(photos) && photos.length > 0 && photos.length <= MAX_PHOTOS && new Set(photos.map(photo => photo?.id)).size === photos.length && photos.every(photo =>
    photo && typeof photo.id === 'string' && /^[0-9a-f]{32}$/.test(photo.id) &&
    [photo.width, photo.height].every(value => Number.isInteger(value) && value > 0 && value <= 1600));
}

function createPhotoService() {
  const budget = 24 * 1024 * 1024;
  const cache = new Map();
  let closed = false, database, opening, decoding = Promise.resolve(), used = 0;
  function open() {
    if (closed) return Promise.reject(new Error('The photo store is closed'));
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open('moa:photos', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('images');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (closed) { request.result.close(); reject(new Error('The photo store is closed')); return; }
        database = request.result;
        database.onversionchange = () => { database.close(); opening = null; };
        resolve(database);
      };
    }).catch(error => { opening = null; throw error; });
    return opening;
  }
  async function request(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('images', mode);
      const result = action(tx.objectStore('images'));
      tx.oncomplete = () => resolve(result?.result);
      tx.onabort = () => reject(tx.error || new Error('Photo storage failed'));
    });
  }
  const read = id => request('readonly', store => store.get(id));
  const write = entries => request('readwrite', store => {
    for (const [id, asset] of entries) store.add(asset, id);
  });
  function evict() {
    for (const [key, entry] of cache) {
      if (used <= budget) break;
      if (!entry.refs && entry.image) {
        used -= entry.bytes;
        entry.image.src = '';
        cache.delete(key);
      }
    }
  }
  function acquire(photo, quality) {
    if (closed) return { ready: Promise.reject(new Error('The photo store is closed')), release() {} };
    const key = `${photo.id}:${quality}`;
    let entry = cache.get(key);
    if (entry) cache.delete(key);
    else {
      entry = { refs: 0, image: null, bytes: 0 };
      entry.ready = decoding.then(async () => {
        if (closed || !entry.refs) throw new Error('Photo load canceled');
        const asset = await read(photo.id);
        if (closed || !entry.refs || !asset?.[quality]) throw new Error('Photo unavailable');
        const image = await decodePhoto(asset[quality]);
        if (closed || !entry.refs) { image.src = ''; throw new Error('Photo load canceled'); }
        entry.image = image;
        entry.bytes = image.naturalWidth * image.naturalHeight * 4;
        used += entry.bytes;
        evict();
        return image;
      }).catch(error => { if (cache.get(key) === entry) cache.delete(key); throw error; });
      decoding = entry.ready.catch(() => {});
    }
    cache.set(key, entry);
    entry.refs++;
    let released = false;
    return { ready: entry.ready, release() {
      if (released) return;
      released = true;
      entry.refs--;
      evict();
    } };
  }
  return {read, write, acquire, close() {
    closed = true;
    database?.close();
    for (const entry of cache.values()) if (entry.image) entry.image.src = '';
    cache.clear();
  }};
}

function decodePhoto(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob), image = new Image();
    const finish = ok => {
      URL.revokeObjectURL(url);
      image.onload = image.onerror = null;
      if (ok) resolve(image); else reject(new Error('Could not read this image'));
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

function resizePhoto(image, limit, type = 'image/png') {
  const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  const width = canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  return new Promise((resolve, reject) => {
    try {
      canvas.getContext('2d').drawImage(image, 0, 0, width, height);
      canvas.toBlob(blob => {
        canvas.width = canvas.height = 1;
        if (blob) resolve({blob, width, height}); else reject(new Error('Could not resize this image'));
      }, type, 0.88);
    } catch (error) { canvas.width = canvas.height = 1; reject(error); }
  });
}

function newPhotoId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

function photoDimensions(bytes, type) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (type === 'image/png') {
    if (bytes.length < 33 || view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a ||
        view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452) return null;
    return {width: view.getUint32(16), height: view.getUint32(20)};
  }
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return null;
  for (let offset = 2; offset + 4 < bytes.length;) {
    if (bytes[offset++] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (offset + 2 > bytes.length || marker === 0xda || marker === 0xd9) return null;
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker) && length >= 8) {
      return {width: view.getUint16(offset + 5), height: view.getUint16(offset + 3)};
    }
    offset += length;
  }
  return null;
}

async function preparePhoto(file) {
  if (!file.size || file.size > 24 * 1024 * 1024 || !/^image\/(jpeg|png|heic|heif|webp|avif)$/i.test(file.type) &&
      !/\.(jpe?g|png|hei[cf]|webp|avif)$/i.test(file.name)) throw new Error('Choose a supported photo under 24 MB');
  const bytes = new Uint8Array(await file.slice(0, 512 * 1024).arrayBuffer());
  const jpeg = photoDimensions(bytes, 'image/jpeg');
  const dimensions = jpeg || photoDimensions(bytes, 'image/png');
  if (dimensions && dimensions.width * dimensions.height > 32_000_000) throw new Error('This photo is too large');
  const type = jpeg ? 'image/jpeg' : 'image/png';
  const image = await decodePhoto(file);
  try {
    if (image.naturalWidth * image.naturalHeight > 32_000_000) throw new Error('This photo is too large');
    const {blob: detail, width, height} = await resizePhoto(image, 1600, type);
    const {blob: thumb} = await resizePhoto(image, 320, type);
    return {photo: {id: newPhotoId(), width, height}, asset: {detail, thumb}};
  } finally { image.src = ''; }
}

const photoZipLimit = 64 * 1024 * 1024;
const photoZipMaxDepth = 500;
const photoCrcTable = Uint32Array.from({length: 256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
  return value;
});
function photoCrc(bytes) {
  let crc = -1;
  for (const byte of bytes) crc = (crc >>> 8) ^ photoCrcTable[(crc ^ byte) & 255];
  return (crc ^ -1) >>> 0;
}

function photoZipHeader(name, size, crc, offset, central) {
  const filename = new TextEncoder().encode(name);
  const base = central ? 46 : 30, at = central ? 4 : 0;
  const header = new Uint8Array(base + filename.length), view = new DataView(header.buffer);
  view.setUint32(0, central ? 0x02014b50 : 0x04034b50, true);
  if (central) { view.setUint16(4, 20, true); view.setUint32(42, offset, true); }
  view.setUint16(4 + at, 20, true);
  view.setUint16(12 + at, 33, true);
  view.setUint32(14 + at, crc, true);
  view.setUint32(18 + at, size, true);
  view.setUint32(22 + at, size, true);
  view.setUint16(26 + at, filename.length, true);
  header.set(filename, base);
  return header;
}

function photoZipEnd(count, length, offset) {
  const end = new Uint8Array(22), view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, count, true); view.setUint16(10, count, true);
  view.setUint32(12, length, true); view.setUint32(16, offset, true);
  return end;
}

async function writePhotoZip(files) {
  const local = [], central = [];
  let offset = 0, directorySize = 0;
  for (const [name, blob] of files) {
    const crc = photoCrc(new Uint8Array(await blob.arrayBuffer()));
    const header = photoZipHeader(name, blob.size, crc, offset, false);
    const entry = photoZipHeader(name, blob.size, crc, offset, true);
    local.push(header, blob); central.push(entry);
    offset += header.length + blob.size;
    directorySize += entry.length;
  }
  if (offset + directorySize + 22 > photoZipLimit || files.size > 4096) throw new Error('Choose a smaller outline section to export');
  return new Blob([...local, ...central, photoZipEnd(files.size, directorySize, offset)], {type: 'application/zip'});
}

function readPhotoZip(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(buffer), entries = new Map(), central = [];
  const utf8 = new TextDecoder('utf-8', {fatal: true});
  const invalid = () => { throw new Error('Invalid or unsupported project ZIP'); };
  const check = (offset, expected) => {
    if (offset + expected.length > bytes.length || expected.some((byte, i) => bytes[offset + i] !== byte)) invalid();
    return offset + expected.length;
  };
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const length = view.getUint16(offset + 26, true), size = view.getUint32(offset + 18, true);
    const start = offset + 30 + length, end = start + size;
    if (length > 64 || end > bytes.length || entries.size >= 4096) invalid();
    const name = utf8.decode(bytes.subarray(offset + 30, start)), data = bytes.subarray(start, end);
    if (entries.has(name) || !/^(outline\.json|images\/[0-9a-f]{32}\.(?:png|jpg))$/.test(name)) invalid();
    const crc = photoCrc(data);
    check(offset, photoZipHeader(name, size, crc, offset, false));
    central.push(photoZipHeader(name, size, crc, offset, true));
    entries.set(name, data);
    offset = end;
  }
  const directory = offset;
  for (const entry of central) offset = check(offset, entry);
  if (check(offset, photoZipEnd(entries.size, offset - directory, directory)) !== bytes.length) invalid();
  if (!entries.has('outline.json')) invalid();
  return entries;
}

function copyPresentation(from,to){
  if (from.photos) to.photos = from.photos.map(({id, width, height}) => ({id, width, height})); else delete to.photos;
  delete to.titleLineCount;
  delete to.mapSize;
  delete to.kind;
  delete to.childrenInRow;
  if(from.titleLineCount>1)to.titleLineCount=from.titleLineCount;
  if(from.mapSize!==undefined&&from.mapSize!==1)to.mapSize=mapSizeUnits(from.mapSize)/MAP_SIZE_UNITS;
  if(from.kind==='spacer')to.kind='spacer';
  if(from.childrenInRow===true)to.childrenInRow=true;
  return to;
}
function clearSpacerKind(node){
  if(node.kind!=='spacer')return false;
  delete node.kind;return true;
}
// Saved and portable data may have legacy photo parents; separatePhotoText repairs them before use.
function validPresentation(node){
  return validTitleLines(node)
    && (node.photos === undefined || node.kind !== "spacer" && validPhotos(node.photos))
    &&(node.mapSize===undefined||mapSizeUnits(node.mapSize)!==null)
    &&(node.childrenInRow===undefined||node.childrenInRow===true&&node.kind!=='spacer')
    &&(node.kind===undefined||node.kind==='spacer'&&node.text===''&&node.titleLineCount===undefined&&node.children.length===0);
}
const originalHeader = String.raw`<!-- OUTLINER (WorkFlowy style outliner) - one self-contained file. READ THIS BEFORE EDITING.
     Every REQUIREMENT comment records something the owner explicitly asked for.
     Every DO NOT comment records something the owner rejected or that caused a real bug.
     Please do not refactor, simplify, rename, restyle, split the file or add features nobody asked for.
     Behaviour the owner described matters more than code elegance. Change only what the owner asks you to change. -->`;
const ipadCSS = String.raw`
/* Latest owner iPad toolbar exception: transient press feedback, never sticky touch hover. */
.moa-outliner.ipad-safari .ic:hover{color:var(--mute)!important;border-color:transparent!important}
.moa-outliner.ipad-safari .ic:active{color:var(--ink)!important;border-color:var(--line)!important}
.moa-outliner.ipad-safari .kids{padding-left:36px}
.moa-outliner.ipad-safari .row{padding-block:calc(var(--bh) * .075)}
.moa-outliner.ipad-safari .arrow,.moa-outliner.ipad-safari .dots{top:calc(var(--bh) * .075);opacity:1}
.moa-outliner.ipad-safari .arrow.open{transform:none}
/* 48px nesting: centers fall between 1px guide centers at -84.5/-36.5/+11.5px. */
.moa-outliner.ipad-safari .dots{left:-71px}
/* Owner-approved V1.1: full glyph/width scale; vertical target fits the accepted first-line pitch. */
.moa-outliner.ipad-safari{--arrow-width:20px}
.moa-outliner.ipad-safari .arrow{left:-22.5px;font-size:32.5px;top:0;height:calc(var(--bh) * 1.15)}
/* Owner-approved iPad gutter: give the outermost More button room while retaining guide/control geometry. */
@container moa-outline (max-width:700px){.moa-outliner.ipad-safari .sheet,.moa-outliner.ipad-safari .head{--gutter-padding:80px}}
.moa-outliner.ipad-safari .arrow span{display:block;line-height:1}
.moa-outliner.ipad-safari .arrow.open span{transform:rotate(90deg)}
.moa-outliner.touch-moving .row.dragging,.moa-outliner.touch-moving .row.dragging *{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
`;
const css = String.raw`/* REQUIREMENT (full width layout): the toolbar and breadcrumb row span the whole app width and the outline scrollbar sits at the far right edge of the app.
   The outline TEXT must stay at the same horizontal position as the original centred 1040px column: --gut is that column's old side margin
   (14px, or half of the width beyond 1040px). .sheet and .head add their old paddings on top of --gut.
   DO NOT put max-width or side padding back on .page or its children: that moves the scrollbar away from the app edge. */
.moa-outliner{box-sizing:border-box;--bullet-width:22px;--arrow-width:16px;--focus-control-gap:10px;--sheet-border:1px;--text-right:max(12px,env(safe-area-inset-right,0px));--gut:max(14px,(100% - 1040px) / 2);display:flex;flex-direction:column;min-height:0;container-type:inline-size;container-name:moa-outline}
.moa-outliner *,.moa-outliner *::before,.moa-outliner *::after{box-sizing:inherit}
.moa-outliner .page{flex:1;min-height:0;display:flex;flex-direction:column;padding:12px 0 10px}
.moa-outliner .page>*{width:100%}
/* REQUIREMENT (toolbar): ONE line in the wide layout and it must NEVER wrap (a lone ... button dropping to a second line was a reported bug).
   It switches to the stacked layouts defined near the end of this stylesheet before it runs out of room. The 14px inner padding keeps buttons off the window edge. */
.moa-outliner .bar{flex:none;display:flex;padding:0 14px;gap:8px;align-items:center;flex-wrap:nowrap;margin-bottom:14px}
/* REQUIREMENT (breadcrumb): always a SINGLE fixed-height line (a long path used to wrap, grow tall and push the toolbar around). 1.25em left padding is for looks.
   Abbreviation order is implemented in crumbs() in the script: names shrink first, then the middle folds into an ellipsis. */
.moa-outliner .bar .crumbs{flex:1;min-width:140px;font-size:14px;color:var(--mute);display:flex;gap:6px;flex-wrap:nowrap;overflow:hidden;white-space:nowrap;padding-left:1.25em}
/* Ancestors shrink 3x faster than the current (last) crumb. crumbs() sets an inline min-width on each one so names stay readable. */
.moa-outliner .crumbs a{cursor:pointer;color:var(--accent);min-width:1.5em;flex:0 1 auto;overflow:hidden;text-overflow:ellipsis}
.moa-outliner .crumbs a:not(:last-of-type){flex-shrink:3}
.moa-outliner .crumbs .ell{color:var(--mute);cursor:default}
/* Measuring mode, used only by crumbs(): natural widths, no shrinking, so overflow can be detected. */
.moa-outliner .crumbs.m a{flex-shrink:0!important;overflow:visible!important;text-overflow:clip!important}.moa-outliner .crumbs a:hover{text-decoration:underline}
.moa-outliner button.t{font:inherit;font-size:13px;background:var(--btn);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:5px 11px;cursor:pointer}
.moa-outliner button.t:hover:not(#ol-moreBtn){border-color:var(--accent)}.moa-outliner button.t.p{background:var(--accent);border-color:var(--accent);color:#fff}
/* REQUIREMENT (scrollbar): invisible by default; shown only while scrolling or when the pointer is near the right edge (JS toggles .sb), then it fades out.
   The fade (0.18s) and the idle delay (450ms in JS) are deliberately fast: the owner asked for twice as fast as the first version.
   DO NOT switch to ::-webkit-scrollbar rules (Chrome ignores them once scrollbar-color is set) and DO NOT make the scrollbar always visible.
   .sheet is the scroll container and spans the full app width; its side padding uses --gut so the text does not move. */
.moa-outliner .sheet,.moa-outliner .head{--gutter-padding:88px;padding-left:calc(var(--gut) + var(--gutter-padding))}
.moa-outliner .sheet{background:none;border:var(--sheet-border) solid transparent;padding-block:16px 120px;padding-right:var(--text-right);flex:1;min-height:0;overflow:auto;cursor:default;scrollbar-width:thin;scrollbar-color:transparent transparent;transition:scrollbar-color .18s ease}
/* REQUIREMENT: Indent, Outdent, Undo and Redo are minimal icon-only buttons (arrows and circular arrows), no text labels, no border until hover. */
.moa-outliner .ic{background:none!important;border-color:transparent!important;color:var(--mute)!important;padding:3px 8px!important;font-size:18px!important;line-height:1.1}
.moa-outliner .ic:hover{color:var(--ink)!important;border-color:var(--line)!important}
/* REQUIREMENT (zoom title): the zoomed-in bullet is shown as a big editable heading above its children, aligned with the bullets.
   Its font size and weight are size level 0 (49px bold, see levelStyle()) in the two hierarchy modes, plain 16px in Plain Text mode; set by head(). Its line height is the shared textarea rule. */
/* Owner override: the Focus title uses the top-level hierarchy size, or the regular size in Plain Text. It stays bold in both styles. */
.moa-outliner .head{flex:none;display:none;padding-block:7.5px 6.5px;padding-right:var(--text-right)}
/* Owner override 2026-10-16 (R12-3A): balance the complete title in the first-row slot.
   The focused sheet border adds 1px below: 7.5px above = 6.5px + 1px below.
   Total 15px plus the title's extra 2px preserves the Home child anchor (16px + 1px). */
.moa-outliner .head.show{display:block}
.moa-outliner .head.show,.moa-outliner .head.show + .sheet{padding-left:calc(var(--gut) + var(--gutter-padding) - var(--bullet-width) + var(--focus-gutter-inset,0px))}
.moa-outliner .head.show + .sheet{padding-top:0}
/* Hidden chevrons keep their flex slot so More stays in the left column. */
.moa-outliner .head-controls{position:absolute;right:100%;top:1px;height:var(--bh);display:flex;gap:var(--focus-control-gap)}
/* The header ends at the title edge; the direct children start one sheet border farther right. */
.moa-outliner .head.show + .sheet > .node > .row > .arrow{left:auto;right:calc(100% + var(--sheet-border))}
.moa-outliner .head.show + .sheet > .node > .row > .dots{left:auto;right:calc(100% + var(--sheet-border) + var(--arrow-width) + var(--focus-control-gap))}
.moa-outliner .head.show .head-controls>button{position:static;height:100%;opacity:1}
.moa-outliner .head textarea{display:block;width:100%;flex:none;font-size:var(--fs);font-weight:var(--fw);padding:4px 4px;min-height:calc(var(--lh) + 8px);color:var(--ink)}
.moa-outliner .head textarea::placeholder{color:var(--mute)}
.moa-outliner .sheet.sb{scrollbar-color:var(--mute) transparent}
@container moa-outline (max-width:700px){
  .moa-outliner .sheet,.moa-outliner .head{--gutter-padding:56px}
  .moa-outliner .head.show,.moa-outliner .head.show + .sheet{--focus-gutter-inset:8px}
}
/* Drag-selecting several bullets. The class is removed on mouseup and also when the mouse comes back with no button pressed (endDrag).
   Do not let it stay on: it disables clicking into text. */
.moa-outliner.multi,.moa-outliner.multi *{user-select:none;-webkit-user-select:none;cursor:default}
.moa-outliner.multi textarea{pointer-events:none}
.moa-outliner .node{position:relative}
/* Depth text size: every row and the zoom title carry --fs (font size), --lh (line height), --bh (row height = line height + 6px padding) and --fw (weight).
   They are set inline by setLevel() from levelStyle() (rows in row(), the zoom title in head()), so the rules below have no fallback values. */
.moa-outliner .row{position:relative;display:flex;align-items:flex-start;border-radius:6px}
.moa-outliner .row.sel{background:color-mix(in srgb,var(--accent) 20%,transparent)}
/* REQUIREMENT (drag and drop): the drop position is shown by ONE straight line (.dropline, positioned by JS) or by highlighting a whole row (.drop-in = drop inside as a child).
   DO NOT go back to per-row top/bottom box-shadows: the rounded row corners made the line look bent and neighbouring rows flashed. */
.moa-outliner .row.dragging{opacity:.4}
.moa-outliner .dropline{position:fixed;display:none;height:2px;background:var(--accent);pointer-events:none;z-index:15}
.moa-outliner .row.drop-in,.moa-outliner .map-reveal-flash{background:var(--halo);box-shadow:inset 0 0 0 1px var(--accent)}
.moa-outliner .map-reveal-flash{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
.moa-outliner .head:has(>.map-reveal-flash){position:relative;border-radius:6px}
.moa-outliner :is(.row,.head,.photo-row):has(>.map-reveal-flash){isolation:isolate}
.moa-outliner .dots{position:absolute;left:-47px;top:0;width:21px;height:var(--bh);display:flex;align-items:center;justify-content:center;background:none;border:0;color:var(--mute);cursor:pointer;padding:0;opacity:0}
.moa-outliner .dots>span{flex:none;width:24px;aspect-ratio:1;display:grid;place-items:center;border-radius:50%;pointer-events:none}
.moa-outliner .dots>span::before{
  --dot-spacing:4.75px;
  content:"";width:3px;aspect-ratio:1;border-radius:50%;background:currentColor;
  box-shadow:calc(-1 * var(--dot-spacing)) 0, var(--dot-spacing) 0;
}
@media(forced-colors:active){.moa-outliner .dots>span::before{forced-color-adjust:none;color:ButtonText}}
.moa-outliner .dots:focus-visible{outline:none}
.moa-outliner .dots:focus-visible>span{outline:1px solid var(--accent);outline-offset:3px}
.moa-outliner .row:hover .dots,.moa-outliner .dots:focus-visible{opacity:1}
/* Pointer feedback shares the shell palette; menu state does not change these hit boxes. */
@media(hover:hover){.moa-outliner #ol-moreBtn:enabled:hover{background:var(--halo);color:var(--ink);border-color:var(--line)}.moa-outliner .dots:enabled:hover{color:var(--ink)}.moa-outliner .dots:enabled:hover>span{background:var(--halo)}}
.moa-outliner .dots:enabled:active{color:var(--ink)}
.moa-outliner .dots:enabled:active>span{background:var(--halo)}
.moa-outliner .menu{position:fixed;display:none;z-index:20;background:var(--page);border:1px solid var(--line);border-radius:8px;padding:4px;box-shadow:0 6px 24px rgba(0,0,0,.25);min-width:170px;overflow-y:auto;overscroll-behavior:contain}
.moa-outliner .menu.show{display:block}
.moa-outliner .menu button{display:block;width:100%;text-align:left;font:inherit;font-size:14px;color:var(--ink);background:none;border:0;border-radius:5px;padding:6px 10px;cursor:pointer}
.moa-outliner .menu [hidden]{display:none}
.moa-outliner .menu button:hover{background:var(--btn)}
.moa-outliner .menu .sep{border-top:1px solid var(--line);margin:4px 0}
.moa-outliner .text-style button::before{content:"";display:inline-block;width:1em}
.moa-outliner .text-style button[aria-pressed="true"]::before{content:"✓" / ""}
.moa-outliner .menu .child-row-toggle:not([hidden]){display:flex;align-items:center;white-space:nowrap}
.moa-outliner .menu .child-row-toggle::before{content:"";flex:0 0 1em}
.moa-outliner .menu .child-row-toggle[aria-pressed="true"]::before{content:"✓" / ""}
.moa-outliner .arrow{position:absolute;left:-13px;top:0;width:var(--arrow-width);height:var(--bh);flex:none;display:flex;align-items:center;justify-content:center;line-height:1;background:none;border:0;color:var(--mute);cursor:pointer;padding:0;font-size:26px;opacity:0;transition:transform .12s,opacity .12s}
.moa-outliner .row:hover .arrow,.moa-outliner .arrow:focus-visible{opacity:1}
.moa-outliner:not(.ipad-safari) .arrow span{display:block;line-height:1;transition:transform .12s}
.moa-outliner:not(.ipad-safari) .arrow.open span{transform:rotate(90deg)}.moa-outliner .arrow.hide{visibility:hidden}
.moa-outliner .bullet{width:var(--bullet-width);height:var(--bh);flex:none;display:flex;align-items:center;justify-content:center;cursor:pointer}
.moa-outliner .bullet i{width:7px;height:7px;border-radius:50%;background:var(--ink);opacity:.75}
.moa-outliner .bullet:hover i{opacity:1}
.moa-outliner .bullet.closed::before{content:"";position:absolute;width:20px;height:20px;border-radius:50%;background:var(--halo);z-index:0}
.moa-outliner .bullet i{position:relative;z-index:1}
.moa-outliner .bullet{position:relative}
.moa-outliner textarea{flex:1;min-width:0;min-height:var(--bh);font:inherit;color:inherit;background:transparent;border:0;outline:0;resize:none;padding:3px 4px;overflow:hidden;line-height:var(--lh);display:block}
.moa-outliner .kids{margin-left:11px;padding-left:20px;border-left:1px solid var(--line)}
/* REQUIREMENT: export feedback is this small Copied toast, NOT a dialog. */
#ol-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,8px);width:max-content;max-width:calc(100% - 28px - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px));overflow-wrap:anywhere;background:var(--page);color:var(--ink);border:1px solid var(--accent);border-radius:8px;padding:7px 14px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:30}
#ol-toast.show{opacity:1;transform:translate(-50%,0)}
.moa-outliner .search{position:relative;display:flex;align-items:center}
.moa-outliner .search input{font:inherit;font-size:13px;width:230px;background:var(--btn);color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:5px 28px 5px 10px;outline:0}
.moa-outliner .search input:focus,.moa-outliner .search.on input{border-color:var(--accent)}
.moa-outliner .search .x{display:none;position:absolute;right:5px;top:50%;transform:translateY(-50%);width:18px;height:18px;align-items:center;justify-content:center;border:0;border-radius:50%;background:var(--halo);color:var(--ink);font-size:14px;line-height:1;padding:0;cursor:pointer}
.moa-outliner .search.on .x{display:flex}
/* .tw carries the depth font size and weight so the textarea and its search-highlight backdrop (.hl) inherit exactly the same text metrics. */
.moa-outliner .tw{position:relative;flex:1;min-width:0;font-size:var(--fs);font-weight:var(--fw)}
.moa-outliner .tw textarea{position:relative;z-index:1;width:100%}
.moa-outliner .hl{position:absolute;left:0;right:0;top:0;z-index:0;margin:0;padding:3px 4px;font:inherit;line-height:var(--lh);white-space:pre-wrap;overflow-wrap:break-word;word-wrap:break-word;overflow:hidden;color:transparent;pointer-events:none}
.moa-outliner .hl mark{color:transparent;background:rgba(255,196,87,.24);border-radius:3px;box-shadow:0 0 0 1px rgba(255,196,87,.38)}
.moa-outliner .nomatch{color:var(--mute);font-size:14px;padding:3px 4px}
/* REQUIREMENT (responsive toolbar). Items inside .bar: breadcrumb, tools (indent, outdent, undo, redo), search, ... menu button.
   Wide (over 700px): one line   [breadcrumb ........ tools | search | ...]
   Narrow (700px or less): line 1 [tools | search (stretches) | ...], line 2 [breadcrumb]
   Very narrow (400px or less): line 1 [search (stretches) | ...], line 2 [all four tool buttons together, centred], line 3 [breadcrumb]
   The outline always comes after these lines. The breakpoints were raised on purpose so the ... button never wraps alone just before a switch. */
.moa-outliner .tools{display:flex;gap:8px;align-items:center;flex:none}
.moa-outliner .tg{display:flex;gap:8px;align-items:center}
.moa-outliner .search{flex:none}
/* The wide layout never wraps; it switches to the narrow one before it runs out of room. Narrow: [tools | search | ...] on the first line, breadcrumb below. */
@container moa-outline (max-width:700px){
  .moa-outliner .bar{flex-wrap:wrap}
  .moa-outliner .bar .crumbs{order:3;flex:1 1 100%;min-width:0}
  .moa-outliner .tools{order:0}
  .moa-outliner .search{order:1;flex:1;min-width:0}
  .moa-outliner .search input{width:100%}
  .moa-outliner #ol-moreBtn{order:2}
}
/* Very narrow: [search | ...] on the first line, tools on the second, breadcrumb on the third. */
@container moa-outline (max-width:400px){
  .moa-outliner .search{order:0}
  .moa-outliner #ol-moreBtn{order:1}
  .moa-outliner .tools{order:2;flex:1 1 100%;justify-content:center}
}`;
// R2 is opt-in; standalone hosts keep their original toolbar.
// Latest owner exception: reserve the trailing column only for a visible badge; scrollport alone clears the centered divider.
const presentationCSS=String.raw`
.moa-outliner .page>.sheet{width:calc(100% - var(--outline-scrollport-inset,0px))}
.moa-outliner .row>.tw,.moa-outliner .head>.tw{min-width:42px}
.moa-outliner .tw.map-size-active{--map-size-reserve:58px}
.moa-outliner .tw.map-child-row-active{--map-child-row-width:24px;--map-child-row-reserve:calc(var(--map-child-row-width) + 4px)}
.moa-outliner .tw.map-presentation-active{--map-badge-inset:3px;--map-badge-reserve:calc(var(--map-badge-inset) + var(--map-size-reserve,0px) + var(--map-child-row-reserve,0px))}
.moa-outliner .row>.tw.map-presentation-active,.moa-outliner .head>.tw.map-presentation-active{padding-right:var(--map-badge-reserve);min-width:calc(42px + var(--map-badge-reserve))}
.moa-outliner .tw.map-presentation-active>.hl{right:var(--map-badge-reserve)}
.moa-outliner .tw.map-presentation-active>.description-field{margin-right:calc(0px - var(--map-badge-inset) - var(--map-child-row-reserve,0px))}
.moa-outliner .map-size-badge,.moa-outliner .map-child-row-badge{position:absolute;top:var(--map-badge-inset);right:var(--map-badge-inset);min-height:24px;border:1px solid var(--line);border-radius:5px;background:var(--btn);color:var(--accent);pointer-events:none}
.moa-outliner .map-size-badge{pointer-events:auto;cursor:pointer;z-index:1;padding:0;width:54px;text-align:center;font:12px/22px 'Cascadia Code',monospace}
.moa-outliner .map-child-row-badge{right:calc(var(--map-badge-inset) + var(--map-size-reserve,0px));width:var(--map-child-row-width);display:grid;place-items:center}
.moa-outliner .map-size-badge[hidden],.moa-outliner .map-child-row-badge[hidden]{display:none}
.moa-outliner .tw.map-presentation-active::before,.moa-outliner .tw.photo-row>.map-reveal-flash{left:-22px;right:0;top:0;border-radius:6px}
.moa-outliner .tw.map-presentation-active::before{content:"";position:absolute;height:max(var(--bh),var(--map-size-title-height,0px));background:color-mix(in srgb,var(--bg),var(--ink) 6%);pointer-events:none}
.moa-outliner .head>.tw.map-presentation-active::before,.moa-outliner .head>.tw.photo-row>.map-reveal-flash{left:0}
.moa-outliner :is(.row,.head):has(>.map-reveal-flash)>.tw.map-presentation-active::before,.moa-outliner .tw.photo-row.map-presentation-active:has(>.map-reveal-flash)::before{z-index:-1}
.moa-outliner .row.sel>.tw.map-presentation-active::before,.moa-outliner .row.drop-in>.tw.map-presentation-active::before{display:none}
.moa-outliner .spacer-editor>textarea::placeholder{color:var(--mute);font-style:italic}
.moa-outliner #ol-menu{width:238px;min-width:0;max-width:calc(100vw - 16px)}
.moa-outliner #ol-menu button{min-height:40px}
.moa-outliner .size-header{display:flex;align-items:center;height:40px;margin:0 8px}
.moa-outliner .size-label{display:block;padding:5px 6px;color:var(--mute);font-size:12px}
.moa-outliner .size-scope{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;font-size:12px;cursor:pointer}
.moa-outliner #ol-menu.size-only > :not(.size-header):not(.size-controls):not(.size-scope),.moa-outliner .size-scope[hidden]{display:none}
.moa-outliner .tw.photo-row.map-presentation-active::before,.moa-outliner .tw.photo-row>.map-reveal-flash{height:auto;bottom:0}
.moa-outliner .size-scope input{margin:0}
.moa-outliner .size-controls{display:flex;gap:8px;align-items:center;margin:0 8px}
.moa-outliner #ol-menu .size-stepper{display:flex;height:40px;border:1px solid var(--line);border-radius:6px;background:var(--btn);flex:1;min-width:0;overflow:hidden}
.moa-outliner #ol-menu .size-stepper button{width:20px;min-width:20px;flex:1 1 20px;padding:0;text-align:center;font-size:20px}
.moa-outliner .size-stepper input{width:calc(7ch + 8px);min-width:0;flex:none;padding:0 4px;border:0;background:none;color:var(--ink);text-align:center;font:13px 'Cascadia Code',monospace;-moz-appearance:textfield}
.moa-outliner #ol-menu .size-stepper button{touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.moa-outliner .size-stepper input::-webkit-inner-spin-button,.moa-outliner .size-stepper input::-webkit-outer-spin-button{-webkit-appearance:none}
.moa-outliner #ol-menu #ol-size-reset{width:52px;flex:0 0 52px;padding:0;text-align:center;border:1px solid var(--line);background:var(--btn)}
`;
const depthCSS = String.raw`
.moa-outliner #ol-topMenu{min-width:max-content;width:max-content}
.moa-outliner .depth-controls{margin:4px 10px;padding-bottom:4px;font-size:14px}
.moa-outliner .depth-row{display:flex;align-items:center;gap:16px;min-height:40px}
.moa-outliner .depth-row>label{flex:none;white-space:nowrap}
.moa-outliner .depth-stepper{display:flex;flex:0 0 123.6px;width:123.6px;height:40px;border:1px solid var(--line);border-radius:6px;background:var(--btn);overflow:hidden;min-width:0}
.moa-outliner #ol-topMenu .depth-stepper button{width:30.8px;min-width:30.8px;flex:0 0 30.8px;padding:0;text-align:center;font-size:20px;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.moa-outliner .depth-stepper input{width:60px;min-width:60px;flex:0 0 60px;padding:0 4px;border:0;background:none;color:var(--ink);text-align:center;font:13px 'Cascadia Code',monospace;-moz-appearance:textfield}
.moa-outliner .depth-stepper input::-webkit-inner-spin-button,.moa-outliner .depth-stepper input::-webkit-outer-spin-button{-webkit-appearance:none}
.moa-outliner #ol-topMenu .depth-controls button:disabled,.moa-outliner .depth-stepper input:disabled{opacity:.5;cursor:default}
`;
const paneCSS = String.raw`
.moa-outliner.pane-controls .pane-actions{display:flex;flex:none;gap:0;align-items:center;order:0}
.moa-outliner.pane-controls .pane-actions>#ol-moreBtn{order:0}
.moa-outliner.pane-controls .pane-action{position:relative;width:44px;min-width:44px;height:28px;padding:0!important;display:flex;align-items:center;justify-content:center}
.moa-outliner.pane-controls .pane-action::after{content:"";position:absolute;width:44px;height:44px;left:50%;top:50%;transform:translate(-50%,-50%)}
.moa-outliner.pane-controls .bar{flex-wrap:nowrap;column-gap:8px}
.moa-outliner.pane-controls .bar .crumbs{order:0;flex:1;min-width:140px}
.moa-outliner.pane-controls .tools{order:0;flex:none;justify-content:normal}
.moa-outliner.pane-controls .search{order:0;flex:0 1 230px;min-width:0}
.moa-outliner.pane-controls .search input{width:100%}
.moa-outliner.pane-controls.pane-narrow .bar{flex-wrap:wrap;column-gap:6px}
.moa-outliner.pane-controls.pane-narrow .bar .crumbs{order:3;flex:1 1 100%;min-width:0}
.moa-outliner.pane-controls.pane-narrow .search{order:1;flex:1;min-width:0}
.moa-outliner.pane-controls.pane-narrow .pane-actions{order:2}
.moa-outliner.pane-controls.pane-small .search{order:0}
.moa-outliner.pane-controls.pane-small .pane-actions{order:1}
.moa-outliner.pane-controls.pane-small .tools{order:2;flex:1 1 100%;justify-content:center}
.moa-outliner.pane-controls.narrow-portrait #ol-pane-expand{display:none}
`;
// R12 opt-in exception: branding row / shared Search slot; original integrated thresholds were 700/420.
// Original standalone toolbar and all original requirement comments remain above.
const headerCSS = String.raw`
.moa-outliner.integrated-header .page{padding-top:0}
.moa-outliner.integrated-header .r12-header{display:flex;flex:none;align-items:center;gap:4px;padding:10px 10px 10px 14px;min-height:64px;box-shadow:inset 0 -1px var(--line);overflow-x:auto;scrollbar-width:none}
.moa-outliner.integrated-header .header-slot{display:flex;flex:1;min-width:0}
.moa-outliner.integrated-header .pane-actions{gap:4px;order:0}
.moa-outliner.integrated-header .pane-action{height:44px}
.moa-outliner.integrated-header .pane-action::after{display:none}
.moa-outliner.integrated-header.pane-full:not(.narrow-portrait) #ol-pane-toggle{display:none}
/* Owner override 2026-10-16: wide Search is 150% of 170px; the 785px compact switch preserves the prior breadcrumb allowance. */
.moa-outliner.integrated-header .bar{display:grid;grid-template-columns:minmax(0,1fr) auto 255px 44px;gap:0 4px;padding:6px 10px 6px 14px;margin:0;flex:none}
.moa-outliner.integrated-header .bar .crumbs{grid-column:1;grid-row:1;min-width:0;order:0}
.moa-outliner.integrated-header .tools{grid-column:2;grid-row:1;gap:0;order:0}
.moa-outliner.integrated-header .tg{gap:0}
.moa-outliner.integrated-header .tools button,.moa-outliner.integrated-header #ol-moreBtn{width:44px;height:44px;padding:0;display:flex;align-items:center;justify-content:center}
.moa-outliner.integrated-header #ol-moreBtn{grid-column:4;grid-row:1;order:0}
.moa-outliner.integrated-header .search{grid-column:3;grid-row:1;display:flex;width:100%;min-width:0;height:44px;order:0;border:1px solid var(--line);border-radius:6px;background:var(--btn)}
.moa-outliner.integrated-header .search:focus-within,.moa-outliner.integrated-header .search.on{border-color:var(--accent)}
.moa-outliner.integrated-header .search input{width:100%;min-width:0;height:42px;border:0;background:none;padding:0 44px 0 10px}
.moa-outliner.integrated-header .search .x{display:flex;right:-1px;top:-1px;transform:none;width:44px;height:44px;border:0;border-radius:6px;background:none;font-size:16px}
.moa-outliner.integrated-header .search .x:focus-visible{outline:1px solid var(--accent);outline-offset:-3px}
.moa-outliner.integrated-header.pane-narrow .bar{grid-template-columns:176px minmax(0,1fr) 44px;grid-template-rows:44px 32px;gap:4px}
.moa-outliner.integrated-header.pane-narrow .tools{grid-column:1;grid-row:1;flex:none;justify-content:normal}
.moa-outliner.integrated-header.pane-narrow .search{grid-column:2;grid-row:1}
.moa-outliner.integrated-header.pane-narrow #ol-moreBtn{grid-column:3;grid-row:1}
.moa-outliner.integrated-header.pane-narrow .bar .crumbs{grid-column:1 / -1;grid-row:2;align-self:center;flex:none;min-width:0}
.moa-outliner.integrated-header.pane-small .bar{padding-left:12px;padding-right:12px;grid-template-columns:minmax(70px,1fr) 44px;grid-template-rows:44px 44px 32px;overflow-x:auto}
.moa-outliner.integrated-header.pane-small .search{grid-column:1;grid-row:1}
.moa-outliner.integrated-header.pane-small #ol-moreBtn{grid-column:2;grid-row:1}
.moa-outliner.integrated-header.pane-small .tools{grid-column:1 / -1;grid-row:2;justify-self:center;flex:none}
.moa-outliner.integrated-header.pane-small .bar .crumbs{grid-row:3}
@media(max-height:300px){.moa-outliner.integrated-header .r12-header{min-height:0}.moa-outliner.integrated-header .page{overflow-y:auto;flex:1}.moa-outliner.integrated-header .sheet{flex:1 0 44px}}
`;
const descriptionCSS = String.raw`
/* Owner description exception: native visible fields, one canonical node.text. */
.moa-outliner{--description-ink:color-mix(in srgb,var(--ink) 30%,transparent)}
.moa-outliner .description-field{position:relative;font-size:var(--fs);font-weight:var(--fw);color:var(--description-ink)}
.moa-outliner .has-description>textarea[data-role="title"],.moa-outliner .has-description>.hl{padding-bottom:0;min-height:calc(var(--lh) + 3px)}
.moa-outliner .description-field textarea,.moa-outliner .description-field .hl{padding-top:0;min-height:calc(var(--lh) + 3px);color:var(--description-ink)}
.moa-outliner .description-field .hl{color:transparent}
.moa-outliner .head .has-description>textarea[data-role="title"]{min-height:calc(var(--lh) + 4px)}
.moa-outliner .head .description-field textarea{padding-top:0;min-height:calc(var(--lh) + 4px);font-size:var(--fs);font-weight:var(--fw);color:var(--description-ink)}
`;
const photoCSS = `
.moa-outliner .photo-group{position:relative;display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 2px}
.moa-outliner .photo-thumb{display:grid;place-items:center;min-width:0;max-width:100%;height:80px;padding:0;border:0;border-radius:6px;overflow:hidden;background:color-mix(in srgb,var(--bg),var(--ink) 8%);color:var(--ink);cursor:zoom-in}
.moa-outliner .photo-thumb canvas{width:100%;height:100%;object-fit:contain;pointer-events:none}
.moa-outliner .photo-sortable .photo-thumb{cursor:grab;user-select:none;-webkit-touch-callout:none}
.moa-outliner .photo-thumb.sorting{opacity:.6;cursor:grabbing}
.moa-outliner .photo-insertion-line{position:absolute;width:2px;transform:translateX(-50%);border-radius:2px;background:var(--accent);pointer-events:none;z-index:2}
.moa-outliner .photo-tile{position:relative;max-width:100%}
.moa-outliner .photo-tile .photo-thumb{width:100%}
.moa-outliner .photo-delete{position:absolute;right:-3px;top:-3px;width:24px;height:24px;border:1px solid var(--line);box-shadow:0 1px 3px #0004}
.moa-outliner .photo-cross{display:grid;place-items:center;padding:0;border-radius:50%;background:var(--bg);color:var(--ink);cursor:pointer}
.moa-outliner .photo-cross::before,.moa-outliner .photo-cross::after{content:"";grid-area:1/1;width:42%;height:2px;border-radius:2px;background:currentColor;transform:rotate(45deg)}
.moa-outliner .photo-cross::after{transform:rotate(-45deg)}
.moa-outliner .tw.photo-row>textarea,.moa-outliner .photo-row>.hl{display:none}
.moa-outliner .photo-editable{padding-inline:8px}
.moa-outliner .photo-editable>.photo-tile{z-index:1}
.moa-outliner .photo-caret-target{position:absolute;inset:0;width:100%;height:100%;border:0;background:none;padding:0;cursor:text}
.moa-outliner .photo-caret-slot{position:absolute;z-index:2;width:14px;transform:translateX(-50%);pointer-events:none}
.moa-outliner .photo-group textarea.photo-caret{position:absolute;inset:0;width:100%;height:100%;min-height:0;padding:0;font:16px/22px sans-serif;text-align:center;color:transparent;caret-color:transparent}
.moa-outliner .photo-caret-slot:focus-within::after{content:'';position:absolute;inset-block:0;left:calc(50% - 1px);width:2px;background:var(--ink);animation:moa-photo-caret-blink 1s step-end infinite}
.moa-outliner .photo-reordering .photo-caret-slot::after{visibility:hidden}
@keyframes moa-photo-caret-blink{50%{opacity:0}}
@media(prefers-reduced-motion:reduce){.moa-outliner .photo-caret-slot:focus-within::after{animation:none}}
.moa-outliner.ipad-safari .sheet{padding-bottom:max(120px,var(--photo-keyboard-space,0px))}
.moa-outliner .photo-thumb span{font-size:12px;overflow:hidden}
.moa-outliner .photo-viewer{pointer-events:auto;position:fixed;box-sizing:border-box;max-width:none;max-height:none;margin:0;border:0;background:transparent;overflow:hidden;color:var(--ink);--photo-margin:24px;padding:max(var(--photo-margin),env(safe-area-inset-top)) max(var(--photo-margin),env(safe-area-inset-right)) max(var(--photo-margin),env(safe-area-inset-bottom)) max(var(--photo-margin),env(safe-area-inset-left))}
.moa-outliner.ipad-safari .photo-viewer{--photo-margin:16px}
.moa-outliner .photo-viewer[open]{display:grid;place-items:center}
.moa-outliner .photo-viewer::backdrop{background:rgba(0,0,0,.35)}
.moa-outliner .photo-frame{position:relative;display:grid;row-gap:8px;justify-items:center}
.moa-outliner .photo-frame button{justify-self:end;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:var(--bg);color:var(--ink);font:24px system-ui;cursor:pointer}
.moa-outliner .photo-frame canvas{display:block;border-radius:4px}
.moa-outliner .photo-group [hidden],.moa-outliner .photo-frame [hidden]{display:none}
.moa-outliner .photo-frame [role=status]:not(:empty){position:absolute;bottom:8px;max-width:100%;padding:4px 8px;background:var(--bg);border-radius:4px;pointer-events:none}
`;
const paneExpand = "<svg width=\"11\" height=\"11\" viewBox=\"0 0 11 11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 4V1H7\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M1 7V10H4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", paneMinimize = "<svg width=\"11\" height=\"11\" viewBox=\"0 0 11 11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 1V4H10\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M4 10V7H1\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", paneToggle = "<svg width=\"18\" height=\"14\" viewBox=\"0 0 18 14\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <defs>\n      <filter id=\"ol-tog-glow\" x=\"-80%\" y=\"-20%\" width=\"260%\" height=\"140%\">\n        <feGaussianBlur in=\"SourceGraphic\" stdDeviation=\"1.4\" result=\"blur\"/>\n        <feMerge><feMergeNode in=\"blur\"/><feMergeNode in=\"SourceGraphic\"/></feMerge>\n      </filter>\n    </defs>\n    <rect x=\"0.75\" y=\"0.75\" width=\"16.5\" height=\"12.5\" rx=\"2.25\" stroke=\"currentColor\" stroke-width=\"1.5\"/>\n    <line x1=\"6.5\" y1=\"0.75\" x2=\"6.5\" y2=\"13.25\" stroke=\"currentColor\" stroke-width=\"1.5\"/>\n  </svg>";
const menuSeparator = '<div class="sep" role="separator"></div>';
function textMenuActions(scopes) {
  const group = (action, verb) => scopes.map(([scope, label]) =>
    `<button data-a="${action}" data-scope="${scope}">${verb}${label}</button>`).join('');
  return group('copy', 'Copy') + menuSeparator + group('download', 'Export');
}
const template = String.raw`<div class="page">
  <!-- Toolbar. DOM order (breadcrumb, tools, search, menu button) is the wide layout; CSS "order" rearranges it on narrow screens.
       Keep the four icon buttons (indent, outdent, undo, redo) inside .tools. See the responsive CSS block for the exact layouts. -->
  <div class="bar">
    <div class="crumbs" id="ol-crumbs"></div>
    <div class="tools">
    <span class="tg">
    <button class="t ic kb" id="ol-outBtn" title="Outdent (Shift+Tab)" aria-label="Outdent">←</button>
    <button class="t ic kb" id="ol-inBtn" title="Indent (Tab)" aria-label="Indent">→</button>
    </span><span class="tg">
    <button class="t ic kb" id="ol-undoBtn" title="Undo (Ctrl+Z)" aria-label="Undo">↺</button>
    <button class="t ic kb" id="ol-redoBtn" title="Redo (Ctrl+Y)" aria-label="Redo">↻</button>
    </span>
    </div>
    <div class="search" id="ol-qBox"><input id="ol-qIn" type="text" placeholder="Search" aria-label="Search" autocomplete="off" spellcheck="false" enterkeyhint="search"><button class="x" id="ol-qx" title="Clear search" aria-label="Clear search">×</button></div>
    <button class="t" id="ol-moreBtn" title="More" aria-label="More">⋯</button>
  </div>
  <!-- REQUIREMENT: big editable title of the bullet the user zoomed into (clicked its dot). Hidden at Home. Do not remove it,
       the breadcrumb alone was not readable enough for the owner. -->
  <div class="head" id="ol-head"><textarea id="ol-title" rows="1" placeholder="Untitled" spellcheck="false" aria-label="Current topic"></textarea></div>
  <div class="sheet" id="ol-tree"></div>
</div>

<!-- REQUIREMENT (menu wording). Top menu: Plain Text, Static Hierarchy, Dynamic Hierarchy (three choices, a check mark shows the current one, they must stay the FIRST buttons), Expand All, Collapse All, Export Visible, Export All (Export Visible must stay ABOVE Export All).
     Bullet menu: Expand All, Collapse All, Export Visible, Export, Delete. The word "subtree" was removed on purpose because context makes it clear.
     Export Visible exports only bullets that are currently expanded, never the children hidden by a collapsed bullet. -->
<!-- Owner override 2026-10-16 (R12-3A): Clear All first; then separated style, expand/collapse and export groups. Historical REQUIREMENT above is retained verbatim. -->
<!-- Latest owner override 2026-10-16 (V1.1): styles first; Clear All last after a separator. Supersedes the earlier Clear-All-first override retained above. -->
<!-- Owner-approved 2026-10-26: focused-branch Expand to level follows Collapse All; target/live stay private to this menu. -->
<!-- Latest owner override: Expand to Level applies intentional valid adjustments immediately; no Apply or optional live mode. -->
<!-- Owner override 2026-10-27: idle depth observes this branch; Apply normalizes it, and deliberate depth commands enable Sync Collapse. -->
<!-- Owner override: hierarchy styling is automatic and Expand All is the first top menu action. -->
<!-- Owner override: file import opens first. Copy keeps the clipboard behavior and Export as .txt downloads the same outline text. -->
<!-- Owner override: Home and Focus share Plain Text and Hierarchy between Import and expansion. -->
<div class="menu" id="ol-topMenu"><button data-a="importFile">Import File to Home</button>${menuSeparator}
<div class="text-style" role="group" aria-label="Outliner text style">
<button type="button" data-a="textStyle" data-style="plain" aria-pressed="false">Plain Text</button>
<button type="button" data-a="textStyle" data-style="hierarchy" aria-pressed="true">Hierarchy</button>
${menuSeparator}</div>
<button data-a="expandAll">Expand All</button><button data-a="collapseAll">Collapse All</button><div class="depth-controls" title="Current focused branch; direct children are level 1."><div class="depth-row"><label for="ol-depth">Expand to Level</label><div class="depth-stepper"><button id="ol-depth-down" aria-label="Decrease Expansion Level">‹</button><input id="ol-depth" type="number" inputmode="numeric" min="1" step="1" value="1"><button id="ol-depth-up" aria-label="Increase Expansion Level">›</button></div></div></div>${menuSeparator}
${textMenuActions([['visible', ' Visible'], ['focus', ' Focus'], ['all', ' All']])}${menuSeparator}<button data-a="clearAll">Clear All</button></div>
<div class="menu" id="ol-menu"><button data-a="importFile" hidden>Import File</button><div class="sep" data-group="import" role="separator" hidden></div>
<button data-a="pinFocus">Pin Focus</button><div class="sep" data-group="pin" role="separator"></div><div class="size-header"><label class="size-label" for="ol-map-size">Map Size</label></div><div class="size-controls"><div class="size-stepper"><button id="ol-size-down" aria-label="Decrease Map Size">‹</button><input id="ol-map-size" aria-label="Map Size" type="number" inputmode="decimal" min="0.1" max="1000" step="0.01" value="1.00"><button id="ol-size-up" aria-label="Increase Map Size">›</button></div><button id="ol-size-reset">Reset</button></div><label class="size-scope"><input id="ol-size-subtree" type="checkbox">Include Subtree</label><button type="button" class="child-row-toggle" aria-pressed="false" hidden>Arrange Children in 1 Row</button>${menuSeparator}<button data-a="removeSpacer" hidden>Unmark as Spacer</button><button data-a="description" hidden>Insert Description</button><button type="button" data-a="addPhoto" hidden>Add Photo</button><button data-a="spacer" aria-keyshortcuts="Alt+Enter">Mark as Spacer</button>${menuSeparator}<button data-a="expand">Expand All</button><button data-a="collapse">Collapse All</button><div class="sep" data-group="branches" role="separator"></div>
${textMenuActions([['visible', ' Visible'], ['node', '']])}${menuSeparator}<button data-a="delete">Delete</button></div>
<input id="ol-import-file" type="file" accept=".txt,.zip,text/plain,application/zip" hidden>
<input id="ol-photo-file" type="file" accept="image/*" multiple hidden>
<dialog class="photo-viewer" aria-label="Photo viewer"><div class="photo-frame"><button class="photo-cross" type="button" aria-label="Close photo"></button><canvas role="img" aria-label="Enlarged photo" hidden></canvas><span role="status"></span></div></dialog>
<div class="toast" id="ol-toast" role="status" aria-atomic="true"></div>`;
// Session notices/persistent-storage request survive a destroy/remount.
let saveFailureShown = false, persistRequested = false;
function encodeNodeText(node, depth, quoted, titleOverride) {
  const parts = splitNodeText(node.text, node.titleLineCount);
  const title = titleOverride ?? parts.title;
  const lines = parts.hasDescription ? parts.description.split('\n') : [];
  const prefix = '  '.repeat(depth);
  const out = [prefix + '- ' + (quoted ? JSON.stringify(title) : title)];
  if (lines.length) {
    const bodyPrefix = prefix + '  ';
    out.push(bodyPrefix + '[desc]');
    lines.forEach(line => out.push(bodyPrefix + (/^\\/.test(line) || line === '[desc]' || line === '[/desc]' ? '\\' : '') + line));
    out.push(bodyPrefix + '[/desc]');
  }
  return out.join('\n');
}
function decodeDescriptionOutline(text, allowPlainOutline = false) {
  // Accept one conventional terminal line ending; no extra trailing content.
  if(/\[\/moa\](?:\r?\n)$/.test(text))text=text.replace(/\r?\n$/, '');
  const quotedHeader=/^ *\[moa(?: v=[34])?\](\r?\n|$)/.exec(text);
  if (allowPlainOutline && !/^ *\[moa(?:\]| v=)/.test(text)) text = text.replace(/\r?\n$/, '');
  // In LF documents with quoted titles a description's literal CR remains payload. A CRLF
  // envelope declares conventional CRLF transport; remove only that added CR.
  const raw = (quotedHeader&&quotedHeader[1]!=='\r\n'?text:text.replace(/\r\n/g, '\n')).split('\n');
  // Only the first physical line can declare an extended document.
  const reject = { recognized: false, attempted: /^\s*\[\/?moa(?:\s|\])/.test(raw[0] || '') };
  if (!raw.length || !quotedHeader&&raw.some(line => /\r/.test(line))) return reject;
  const common = raw.reduce((min, line) => line.length ? Math.min(min, line.match(/^ */)[0].length) : min, Infinity);
  if (!Number.isFinite(common) || common % 2) return reject;
  let lines = raw.map(line => line.slice(common)), extended=false,codecVersion=1;
  const attempted=reject.attempted;
  if(attempted){
    const header=/^\[moa(?: v=([1-4]))?\]$/.exec(lines[0]);
    if(!header||lines[lines.length-1]!=='[/moa]')return reject;
    codecVersion=Number(header[1] ?? 4);extended=true;lines=lines.slice(1,-1);
  }
  const items = [], stack = [];
  let owner = null, ownerDepth = -1, mayDescribe = false, recognized = extended, mayPresent=false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], match = /^( *)(- )(.*)$/.exec(line);
    if (match) {
      const depth = match[1].length / 2;
      if (!Number.isInteger(depth) || depth > stack.length) return reject;
      owner = { text: match[3], children: [] }; ownerDepth = depth;
      if(codecVersion>=3){try{const title=JSON.parse(match[3]);if(typeof title!=='string')return{...reject,attempted:true};setNodeText(owner,{title,hasDescription:false,description:''});}catch(_){return{...reject,attempted:true};}}
      if (depth === 0) items.push(owner); else stack[depth - 1].children.push(owner);
      stack.length = depth; stack.push(owner); mayDescribe = true; mayPresent=extended; continue;
    }
    const prefix = '  '.repeat(ownerDepth + 1);
    if(extended&&owner&&mayPresent&&line.startsWith(prefix+'[map')){
      const metadata=/^\[map (spacer )?size=([0-9]+(?:\.[0-9]+)?)( children=row)?\]$/.exec(line.slice(prefix.length));
      if(!metadata||metadata[3]&&codecVersion<4)return reject;
      const token=metadata[2],value=Number(token),units=mapSizeUnits(value);
      if(units===null||(token.split('.')[1]||'').length>(codecVersion===1?2:4)||codecVersion===1&&value>10)return{...reject,attempted:true};
      if(value!==1)owner.mapSize=units/MAP_SIZE_UNITS;
      if(metadata[1])owner.kind='spacer';
      if(metadata[3])owner.childrenInRow=true;
      mayPresent=false;continue;
    }
    if (!owner || !mayDescribe || line !== prefix + '[desc]') return extended?{...reject,attempted:true}:reject;
    mayPresent=false;
    const body = []; let closed = false;
    while (++i < lines.length) {
      if (!lines[i].startsWith(prefix)) return reject;
      let payload = lines[i].slice(prefix.length);
      if (payload === '[/desc]') { closed = true; break; }
      if (payload === '[desc]') return reject;
      if (payload[0] === '\\' && (payload[1] === '\\' || payload.slice(1) === '[desc]' || payload.slice(1) === '[/desc]')) payload = payload.slice(1);
      body.push(payload);
    }
    if (!closed || !body.length) return reject;
    owner.text += '\n' + body.join('\n'); mayDescribe = false; recognized = true;
  }
  if(extended){const pending=items.slice();if(!pending.length)return{...reject,attempted:true};while(pending.length){const n=pending.pop();if(!validPresentation(n))return{...reject,attempted:true};pending.push(...n.children);}}
  return recognized || (allowPlainOutline && items.length) ? { recognized: true, items, extended } : reject;
}

// A single canonical string; the optional count selects the title/description boundary.
function validTitleLines(node) {
  const count=node.titleLineCount;
  return count===undefined||Number.isSafeInteger(count)&&count>=1&&count<=node.text.split('\n').length;
}
function splitNodeText(text, count = 1) {
  let at=-1;
  for(let line=0;line<count;line++){at=text.indexOf('\n',at+1);if(at<0)break;}
  return at<0?{title:text,description:'',hasDescription:false}:{title:text.slice(0,at),description:text.slice(at+1),hasDescription:true};
}
function joinNodeText(parts) { return parts.title + (parts.hasDescription ? '\n' + parts.description : ''); }
function setNodeText(node, parts) {
  node.text=joinNodeText(parts);const count=parts.title.split('\n').length;
  if(count>1)node.titleLineCount=count;else delete node.titleLineCount;
  return node;
}
function mount(container, opts = {}) {
if (!(container instanceof Element)) throw new TypeError('Outliner.mount requires an Element');
// Owner-approved iPad Safari exception. Identity is best-effort, never a viewport/pointer gate.
const ipadSafari = navigator.maxTouchPoints > 1 &&
  (/iPad/i.test(navigator.userAgent) || navigator.platform === 'MacIntel' && /Macintosh/i.test(navigator.userAgent)) &&
  /AppleWebKit/i.test(navigator.userAgent) && /Version\//i.test(navigator.userAgent) && /Safari\//i.test(navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Android|Edg\/|OPR\//i.test(navigator.userAgent);
const numericSelection=bindNumericInputs(container,{ipad:ipadSafari});
const integratedHeader = !!(opts.paneControls && opts.headerContent instanceof Element);
let headerSlot = null;
// R12-4B: optional opaque host edges share the existing private chronology.
let historyHost = opts.historyHost && ['beforeCommand', 'apply', 'ownsKey'].every(k => typeof opts.historyHost[k] === 'function') ? opts.historyHost : null;
let ipadToolbarHistoryNoFocus = false;
let historyBusy = false, historyPreparing = false, historyPreparedCommit = false, historyComposing = false, historyNativeContext = false;
function historyCallback(name, ...args) {
  try { return historyHost && historyHost[name](...args) === true; }
  catch (_) { toast('History action could not complete'); return false; }
}
function historyEditable(node) { return node instanceof Element && (!!node.closest('input,textarea,select') || node.isContentEditable); }
function historyBullet(node) { return node instanceof Element && container.contains(node) && node.matches('#ol-tree textarea[data-id], #ol-tree .photo-caret'); }
function historyNative(node) { return historyEditable(node) && !historyBullet(node); }
function trackHistoryContext(e) {
  if (!historyHost) return;
  if (historyNative(e.target)) historyNativeContext = true;
  else if (container.contains(e.target)) {
    if (e.target.id !== 'ol-tree' || !historyNative(document.activeElement)) historyNativeContext = false;
  } else if (historyCallback('ownsKey', e)) historyNativeContext = false;
}
function ownsHistoryKey(e) {
  if (!historyHost || destroyed || !container.isConnected || e.defaultPrevented || e.isComposing || e.keyCode === 229 || historyComposing) return false;
  if ([e.target, document.activeElement, ...(e.composedPath ? e.composedPath() : [])].some(historyNative)) return false;
  if (historyBullet(e.target) || historyBullet(document.activeElement)) return true;
  if (historyNativeContext) return false;
  return historyCallback('ownsKey', e);
}
let depthController = null;
let destroyed = false, resizeObserver = null, lastOwnedInteraction = false, historyShortcutOwned = false;
const timers = new Set(), frames = new Set(), listeners = new WeakMap(), globalListeners = [];
const hadHostClass = container.classList.contains('moa-outliner');
container.classList.add('moa-outliner');
if (ipadSafari) container.classList.add('ipad-safari');
const style = document.createElement('style'); style.textContent = photoCSS + presentationCSS + depthCSS + css + descriptionCSS + (ipadSafari ? ipadCSS : '') + (opts.paneControls ? paneCSS : '') + (integratedHeader ? headerCSS : '');
const fragment = document.createElement('template'); fragment.innerHTML = originalHeader + template;
const ownedNodes = [...fragment.content.childNodes];
container.append(style, fragment.content);
function listen(target, type, fn, options) {
  const guarded = e => { if (!destroyed) fn(e); };
  target.addEventListener(type, guarded, options);
  const entry = [type, guarded, options];
  if (target === document || target === window || target === container || target === window.visualViewport) globalListeners.push([target, ...entry]);
  else { if (!listeners.has(target)) listeners.set(target, []); listeners.get(target).push(entry); }
}
function setTimeout(fn, delay) {
  if (destroyed) return 0;
  const id = window.setTimeout(() => { timers.delete(id); if (!destroyed) fn(); }, delay);
  timers.add(id); return id;
}
function clearTimeout(id) { window.clearTimeout(id); timers.delete(id); }
function requestAnimationFrame(fn) {
  if (destroyed) return 0;
  const id = window.requestAnimationFrame(time => { frames.delete(id); if (!destroyed) fn(time); });
  frames.add(id); return id;
}
function cancelAnimationFrame(id) { window.cancelAnimationFrame(id); frames.delete(id); }
function ownedActiveElement() { const a = document.activeElement; return a && container.contains(a) ? a : null; }
function visibleHost() {
  const r = container.getBoundingClientRect();
  return !destroyed && container.isConnected && r.width > 0 && r.height > 0 && getComputedStyle(container).visibility === 'visible';
}
function trackOwnership(e) { historyShortcutOwned = false; lastOwnedInteraction = visibleHost() && container.contains(e.target) && !headerSlot?.contains(e.target); }
listen(document, 'pointerdown', trackOwnership, true);
listen(document, 'mousedown', trackOwnership, true);
listen(document, 'touchstart', trackOwnership, { capture: true, passive: true });
listen(document, 'focusin', trackOwnership, true);
listen(document, 'pointerdown', trackHistoryContext, true);
listen(document, 'focusin', trackHistoryContext, true);
listen(container, 'compositionstart', () => { historyComposing = true; }, true);
listen(container, 'compositionend', () => { historyComposing = false; }, true);
function ownsEvent(e, historyShortcut = false) {
  if (photoDialog.open || e.target?.closest?.(".photo-viewer")) return false;
  if (!visibleHost()) return false;
  if (headerSlot?.contains(e.target) || e.target?.closest?.('#ol-menu input,.depth-controls')) return false;
  if (container.contains(e.target)) return true;
  const a = document.activeElement, neutral = n => n === document.body || n === document.documentElement || n === null;
  return lastOwnedInteraction && (sel.size > 0 || (historyShortcut && historyShortcutOwned)) && neutral(e.target) && neutral(a) && !e.target?.isContentEditable;
}
function destroy() {
  if (destroyed) return;
  clearRevealHighlight();
  cancelPhotoSort(); cleanupViewer(); removePhotoPreviews(container); photoObserver.disconnect(); photoService.close();
  depthController?.dispose();endAdjustment();numericBindings.forEach(b=>b.dispose());numericSelection.dispose();cancelTouch('destroy'); destroyed = true; lastOwnedInteraction = historyShortcutOwned = false;
  historyHost = null; hist.length = 0; typingSnapshot = null; historyBusy = historyPreparing = historyComposing = false;
  timers.forEach(id => window.clearTimeout(id)); timers.clear();
  textDownloadUrls.forEach(url => URL.revokeObjectURL(url)); textDownloadUrls.clear();
  frames.forEach(id => window.cancelAnimationFrame(id)); frames.clear();
  if (resizeObserver) resizeObserver.disconnect();
  globalListeners.forEach(([target, type, fn, options]) => target.removeEventListener(type, fn, options));
  globalListeners.length = 0;
  const clean = node => {
    if (node.nodeType !== 1) return;
    [node, ...node.querySelectorAll('*')].forEach(e => {
      (listeners.get(e) || []).forEach(([type, fn, options]) => e.removeEventListener(type, fn, options));
      listeners.delete(e);
      ['onclick', 'ondragstart', 'ondragend'].forEach(key => { e[key] = null; });
    });
  };
  if (headerSlot) opts.headerContent.remove(); // Supplied content/listeners belong to the host.
  ownedNodes.forEach(node => { clean(node); node.remove(); });
  dropLine.remove(); style.remove(); container.classList.remove('ipad-safari', 'touch-moving', 'multi', 'pane-controls', 'pane-narrow', 'pane-small', 'integrated-header', 'pane-full');
  if (!hadHostClass) container.classList.remove('moa-outliner');
  subscribers.forEach(set => set.clear()); transientToggles.clear();
  publicationQueued = false; dragSet = null; dragFrom = dragTA = null;
}

// Integration API only. Original persistence/history and editing decisions remain below.
const subscribers = new Map(['change', 'toggle', 'zoom', 'paneAction', 'pinFocus', 'search', 'expansionLevel', 'focusExpansion'].map(event => [event, new Set()]));
let publicationReady = false, publicationQueued = false, changeTimer = null, revision = 0;
let immediateSnapshot, observedTree, publishedTree;
const transientToggles = new Map();
function getSnapshot(options = {}) {
  const tree = [], stack = [{ nodes: root.children, into: tree }];
  while (stack.length) {
    const { nodes, into } = stack.pop();
    for (const n of nodes) {
      if (n === phNode && phOwner && phOwner.children.length === 1 && phOwner.children[0] === n && !n.text && !n.children.length) continue;
      if(n.titleLineCount>1&&options.titleLines!==true)throw new Error('Multiline title compatibility error: request getSnapshot({titleLines:true, focusExpansion:true}) from a node-title-lines capable Outliner.');
      const copy = copyPresentation(n, { id: n.id, text: n.text, open: n.open, children: [] });
      into.push(copy); stack.push({ nodes: n.children, into: copy.children });
    }
  }
  const snapshot = { zoomId: zoom === root ? null : zoom.id, tree };
  if (options.focusExpansion === true) snapshot.focusViews = snapshotFocusViews();
  return snapshot;
}
function on(event, fn) {
  if (!subscribers.has(event) || typeof fn !== 'function') throw new TypeError('Expected change, toggle, zoom, paneAction, pinFocus, search, expansionLevel or focusExpansion and a callback');
  if (destroyed) return () => {};
  subscribers.get(event).add(fn);
  return () => subscribers.get(event).delete(fn);
}
function emit(event, payload) {
  for (const fn of [...subscribers.get(event)]) {
    if (destroyed) break;
    try { if(event==='search'||event==='expansionLevel'){const result=fn({...payload});if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});continue;} fn(event === 'toggle' ? { changes: payload.changes.map(c => ({ ...c })), transient: payload.transient } : { ...payload }); } catch (error) { /* A subscriber cannot interrupt editing or other subscribers. */ }
  }
}
let paneMode = 'split';
function setPaneMode(mode) {
  if (!['split', 'full', 'collapsed'].includes(mode)) throw new TypeError('Invalid pane mode');
  if (destroyed) return;
  const button = container.querySelector('#ol-pane-expand');
  if (button) {
    button.innerHTML = mode === 'full' ? paneMinimize : paneExpand;
    button.title = mode === 'full' ? (integratedHeader ? 'Shrink Outliner' : 'Minimize Outliner') : 'Expand Outliner';
    button.setAttribute('aria-label', button.title);
  }
  depthController?.close();commitSize();container.querySelectorAll('.menu').forEach(menu => menu.classList.remove('show'));
  paneMode = mode;
  if (integratedHeader) container.classList.toggle('pane-full', mode === 'full');
}
function paneLayout() {
  if (!opts.paneControls) return;
  const width = container.getBoundingClientRect().width;
  if (headerSlot) headerSlot.style.minWidth = getComputedStyle(opts.headerContent).minWidth;
  container.classList.toggle('pane-narrow', width <= (integratedHeader ? 785 : 700));
  container.classList.toggle('pane-small', integratedHeader ? width < 420 : width <= 400);
}
if (opts.paneControls) {
  container.classList.add('pane-controls');
  const more = container.querySelector('#ol-moreBtn'), group = document.createElement('div');
  group.className = 'pane-actions';
  if (integratedHeader) {
    container.classList.add('integrated-header');
    const header = document.createElement('div'); header.className = 'r12-header';
    headerSlot = document.createElement('div'); headerSlot.className = 'header-slot';
    headerSlot.append(opts.headerContent); header.append(headerSlot, group);
    container.querySelector('.bar').before(header);
  } else { more.before(group); group.append(more); }
  for (const action of ['expand', 'toggle']) {
    const button = document.createElement('button');
    button.id = 'ol-pane-' + action; button.className = 't ic pane-action';
    button.innerHTML = action === 'expand' ? paneExpand : paneToggle;
    button.title = action === 'expand' ? 'Expand Outliner' : (integratedHeader ? 'Toggle Sidebar' : 'Toggle sidebar');
    button.setAttribute('aria-label', button.title);
    listen(button, 'click', () => {
      if (integratedHeader && (!button.getClientRects().length || action === 'toggle' && paneMode === 'full' && !container.classList.contains('narrow-portrait'))) return;
      depthController?.close();commitSize();container.querySelectorAll('.menu').forEach(menu => menu.classList.remove('show'));
      emit('paneAction', { action });
    });
    group.append(button);
  }
  paneLayout();
}
function nodeStates(snapshot) {
  const states = new Map(), stack = [...snapshot.tree].reverse();
  while (stack.length) { const n = stack.pop(); states.set(n.id, n.open); for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]); }
  return states;
}
function initializePublication() {
  immediateSnapshot = getSnapshot({titleLines:true, focusExpansion:true});
  observedTree = publishedTree = JSON.stringify(immediateSnapshot.tree);
  publicationReady = true;
}
function observeToggle(n, before, open, transient) {
  if (!transient || before === open) return;
  const previous = transientToggles.get(n.id);
  transientToggles.set(n.id, { before: previous ? previous.before : before, open });
  schedulePublication();
}
function schedulePublication() {
  if (!publicationReady || destroyed || publicationQueued) return;
  publicationQueued = true;
  queueMicrotask(() => {
    if (destroyed) return;
    publicationQueued = false;
    const current = getSnapshot({titleLines:true, focusExpansion:true}), data = JSON.stringify(current.tree);
    const before = nodeStates(immediateSnapshot), after = nodeStates(current), changes = [];
    after.forEach((open, id) => { if (before.has(id) && before.get(id) !== open) changes.push({ id, open }); });
    const transientChanges = [];
    transientToggles.forEach((v, id) => { if (v.before !== v.open) transientChanges.push({ id, open: v.open }); });
    transientToggles.clear();
    const zoomChanged = current.zoomId !== immediateSnapshot.zoomId;
    const focusChanged = JSON.stringify(current.focusViews) !== JSON.stringify(immediateSnapshot.focusViews);
    immediateSnapshot = current;
    if (data !== observedTree) {
      observedTree = data; clearTimeout(changeTimer); changeTimer = null;
      if (data !== publishedTree) changeTimer = setTimeout(() => {
        changeTimer = null; publishedTree = observedTree;
        emit('change', { revision: ++revision });
      }, 40);
    }
    if (changes.length) emit('toggle', { changes, transient: false });
    if (transientChanges.length) emit('toggle', { changes: transientChanges, transient: true });
    if (zoomChanged) emit('zoom', { zoomId: current.zoomId });
    else if (focusChanged) emit('focusExpansion');
  });
}

// ===== REQUIREMENTS SUMMARY (owner specified, keep behaviour exactly) =====
// 1. Export (top menu Export All / Export Visible, bullet menu Export / Export Visible): one click copies to the clipboard and shows a toast.
//    Output format is fixed: 2-space indent and a "- " prefix. No dialog, no options. Visible means children of collapsed bullets are skipped (shownKids).
// 2. Ctrl/Cmd+click on a triangle expands or collapses that bullet and ALL levels below it, and must NOT select anything.
//    Ctrl/Cmd/Shift+click anywhere else on a row still multi-selects.
// 3. Clicking a bullet dot zooms in: big editable title plus breadcrumb (Home > ... > this node).
// 4. Drag and drop: one straight indicator line; pointer x chooses the level (sibling of the row above, of its parent, of its grandparent...);
//    middle of a row = drop inside as a child.
// 5. Toolbar: indent / outdent / undo / redo icon buttons, search, ... menu; responsive layouts live in the CSS.
// 6. The scrollbar auto-hides (CSS .sheet). Bullet heights are re-measured when the width changes (no leftover gaps after widening).
// 7. Keyboard shortcuts must work on any keyboard layout (for example Thai), see the global keydown handler.
// 8. Text style: 28px bold for Home topics and the Focus title, 16px bold for direct children, and 16px regular deeper down.
//    The Focus title takes the place of a top-level topic in the hierarchy.
// ===== EXPLICITLY REJECTED, DO NOT "IMPROVE" =====
// - Do NOT stop buttons, menus or triangles from taking focus (no mousedown preventDefault on them) and do NOT restore the caret after a redraw.
//   Clicking a control leaves focus wherever the browser puts it. (Only the toolbar buttons with class kb keep the caret; that is original behaviour.)
// - Do NOT focus a bullet automatically when the user types or presses Enter while nothing is focused. Intentional: stray keystrokes must never edit text.
// - Do NOT add an export dialog, an indent or prefix selector, or the word subtree to menu labels.
// - Do NOT add frameworks or a build step, do not split the file, do not add features nobody asked for.
let uid = 0;
const mk = (t = '') => ({ id: ++uid, text: t, children: [], open: true });
const KEY = 'outliner-v1';
let root, zoom, par = new Map();
const focusVisits = [];

function snapshotFocusViews() {
  return focusVisits.map(({id, expansion}) => ({id, expansion:[...expansion]}));
}
function viewOpen(node, visit = focusVisits.at(-1)) {
  return visit?.expansion.get(node.id) ?? node.open;
}
function writeViewOpen(node, open) {
  const visit = focusVisits.at(-1);
  if (visit && isWithin(node, visit.id)) visit.expansion.set(node.id, open);
  else node.open = open;
}
function isWithin(node, ancestorId) {
  for (let current = node; current; current = par.get(current)) {
    if (current.id === ancestorId) return true;
  }
  return false;
}
function enterFocus(node) {
  // Retain ancestor visits and inherit only the expansion visible in the source.
  while (focusVisits.length && !isWithin(node, focusVisits.at(-1).id)) focusVisits.pop();
  if (node === root || focusVisits.at(-1)?.id === node.id) return;
  const source = focusVisits.at(-1);
  let visible = true;
  for (let parent = par.get(node); parent && parent !== root; parent = par.get(parent)) {
    if (!viewOpen(parent, source)) { visible = false; break; }
    if (parent.id === source?.id) break;
  }
  const expansion = new Map();
  function inherit(current, reachable) {
    const open = reachable && viewOpen(current, source);
    expansion.set(current.id, current === node || open);
    realChildren(current).forEach(child => inherit(child, open));
  }
  inherit(node, visible);
  focusVisits.push({id:node.id, expansion});
}
function reconcileFocusVisits(nodes) {
  let parent = root;
  for (let i = 0; i < focusVisits.length; i++) {
    const visit = focusVisits[i], node = nodes.get(visit.id);
    if (!node || !isWithin(node, parent.id)) {
      focusVisits.length = i;
      zoom = parent;
      sOver.clear();
      return;
    }
    for (const id of visit.expansion.keys()) {
      if (!nodes.has(id)) visit.expansion.delete(id);
    }
    parent = node;
  }
  if (!focusVisits.length && zoom !== root) enterFocus(zoom);
}
let saveBlocked = false, blockedTree = null, loadedPresentationSnapshot = null;

function updateUidFromTree(n) { uid = Math.max(uid, n.id); n.children.forEach(updateUidFromTree); return n; }
function load() {
  try {
    const s = localStorage.getItem(KEY);
    if (s !== null) {
      const d = JSON.parse(s);
      // Validate before assigning any stored tree; malformed data stays untouched.
      if (!d || !Number.isSafeInteger(d.zoom)) throw new Error('Invalid outline');
      const stack = [d.root], ids = new Set();
      while (stack.length) {
        const n = stack.pop();
        if (!n || !Number.isSafeInteger(n.id) || ids.has(n.id) || typeof n.text !== 'string' || typeof n.open !== 'boolean' || !Array.isArray(n.children)) throw new Error('Invalid outline');
        if(!validPresentation(n)||n===d.root&&(n.kind!==undefined||n.mapSize!==undefined||n.titleLineCount!==undefined||n.childrenInRow!==undefined||n.photos!==undefined))throw new Error('Invalid outline presentation');
        if(n.titleLineCount===1)delete n.titleLineCount;
        if(n.mapSize!==undefined)n.mapSize=mapSizeUnits(n.mapSize)/MAP_SIZE_UNITS;if(n.mapSize===1)delete n.mapSize;ids.add(n.id); for (const child of n.children) stack.push(child);
      }
      root = updateUidFromTree(d.root);
      separatePhotoText(root);
      zoom = find(root, d.zoom) || root;
      loadedPresentationSnapshot=snap(false);
      return;
    }
  } catch (e) {
    saveBlocked = true;
    toast("Couldn't load saved outline; kept original data");
  }
  root = mk('root');
  zoom = root;
}
function find(n, id) { if (n.id === id) return n; for (const c of n.children) { const r = find(c, id); if (r) return r; } return null; }
const sel = new Set(), els = new Map();
let anchor = null, cursor = null, hist = [], hi = -1, tm = null, dragSet = null, menuT = [];
// The empty placeholder bullet shown when a view has no children is only a typing target. It must never become data:
// it is left out of every snapshot and of localStorage (replacer below), removed again when the user leaves that view without typing,
// and skipped by export. phNode = the placeholder, phOwner = the bullet (or root) it was added to.
let phNode = null, phOwner = null;
function realChildren(node) {
  const children = node.children;
  return node === phOwner && children.length === 1 && children[0] === phNode && !phNode.text && !phNode.children.length ? [] : children;
}
// A transient typing row is only a placeholder until its owner gains real content.
function discardUnusedPlaceholder(owner) {
  if (phOwner !== owner || realChildren(owner).length) return;
  owner.children.length = 0;
  phNode = phOwner = null;
}
function canMarkSpacer(node) {
  return node.kind !== 'spacer' && !node.photos && !realChildren(node).length && !node.text.includes('\n') && /^[\s\u200b]*$/u.test(node.text);
}
// A saved leaf may be closed. Its first real child opens it in the same edit.
function openPlaceholderOwner(node) {
  if (node !== phNode || !phOwner || phOwner === root || realChildren(phOwner).length) return;
  const owner = phOwner;
  writeViewOpen(owner, true);
  if (clearSpacerKind(owner) && headBinding?.getNode() === owner) refreshNodeEditor(headBinding);
}
const snap = (includeFocus = true) => JSON.stringify({ root, zoom: zoom.id,
  ...(includeFocus && focusVisits.length ? {focusViews:snapshotFocusViews()} : {}) }, (k, v) => k === 'children' && phNode && v.length === 1 && v[0] === phNode && !phNode.text ? [] : v);
// History snapshots include visit state. Optional row IDs belong to the history entry only.
const outlineValue = entry => typeof entry === 'string' ? entry : entry?.outline;
function outlineHistoryIndex(i = hi) { while (i >= 0 && !outlineValue(hist[i])) i--; return i; }
function historyRootEqual(a, b) { return !!b && JSON.stringify(JSON.parse(a).root) === JSON.stringify(JSON.parse(b).root); }
function appendHistory(entry) {
  hist.length = hi + 1; hist.push(entry);
  if (hist.length > 300) {
    const baseline = hist[0]; hist.shift();
    if (historyHost && typeof hist[0] !== 'string') hist[0] = outlineValue(hist[0]) || baseline;
  }
  hi = hist.length - 1;
}
let typingSnapshot = null,adjustment=null,adjustmentSaveTimer=null;
function endAdjustment(token){if(token&&adjustment?.token!==token)return;depthController?.endTransaction();adjustment=null;clearTimeout(adjustmentSaveTimer);adjustmentSaveTimer=null;flushSave();}
function beginAdjustment(kind){
  endAdjustment();if(historyComposing||destroyed)return null;
  if(historyHost&&!historyCallback('beforeCommand','adjustment'))return null;
  if(tm)record(snap(),true);else record();
  const token={};adjustment={token,kind,index:hi,edge:null,writing:false};return token;
}
function beginHostAdjustment(){return beginAdjustment('host');}
function endHostAdjustment(token){endAdjustment(token);}
function appendAdjustment(entry,kind){
  const a=adjustment;if(!a||a.kind!==kind||!a.writing)return false;
  if(a.edge&&hi===a.index&&hist[hi]===a.edge){
    if(kind==='host')entry={...entry,before:a.edge.before};
    else if(a.edge.focus)entry=typeof entry==='string'?{outline:entry,focus:a.edge.focus}:{...entry,focus:a.edge.focus};
    hist[hi]=entry;a.edge=entry;return true;
  }
  if(hi!==a.index){endAdjustment();return false;}
  appendHistory(entry);a.index=hi;a.edge=entry;return true;
}
function record(x = snap(), settleTyping = false, scrollNodeId = null) {
  if(adjustment&&!adjustment.writing)endAdjustment();
  const pending = tm && typingSnapshot; clearTimeout(tm); tm = null; typingSnapshot = null;
  // Owner V1.1 exception: a changed zoom is an outline history step, even with identical text.
  if (x === outlineValue(hist[outlineHistoryIndex()])) return;
  let focus = null;
  if (historyHost && (!historyBusy || settleTyping) && typeof historyHost.reconcileFocus === 'function') {
    try {
      const d = JSON.parse(x), edge = historyHost.reconcileFocus({zoomId:d.zoom===d.root.id?null:d.zoom,tree:d.root.children});
      if (edge) {
        const before = detachedHostValue(edge.before), after = detachedHostValue(edge.after);
        // Only a compound pin removal needs the last typing snapshot here.
        // Enter and explicit host actions already close typing before mutation.
        if (pending && pending !== x) record(pending);
        if (historyCallback('apply', after)) focus = {before,after};
      }
    } catch (_) { toast('History action could not complete'); }
  }
  const entry = focus || scrollNodeId !== null ? {outline:x, focus, scrollNodeId} : x;
  if (!appendAdjustment(entry, 'outline')) appendHistory(entry);
}
function detachedHostValue(value) {
  const text = JSON.stringify(value);
  if (!text) throw new TypeError('Host history requires a JSON value');
  const copy = JSON.parse(text);
  if (!copy || typeof copy !== 'object' || Array.isArray(copy) || 'root' in copy || 'tree' in copy) throw new TypeError('Invalid host history value');
  return copy;
}
function commitHostHistory(edge) {
  depthController?.finishGesture();
  if (!historyHost || destroyed || !container.isConnected || historyBusy || historyComposing || historyPreparing && historyPreparedCommit) return false;
  // A finished hold cannot append a new edge after Undo or another command.
  if(edge.adjustmentToken&&edge.adjustmentToken!==adjustment?.token)return false;
  if(adjustment&&edge.adjustmentToken!==adjustment.token)endAdjustment();
  if(adjustment)adjustment.writing=true;
  historyBusy = true;
  try {
    // Pending typing is a new change, even while this command is guarded against reentry.
    if (tm) record(snap(), true);
    if (destroyed || !historyHost) return false;
    let before, after, prepared;
    try {
      // Optional capture observes any pin removal caused by settling the outline first.
      prepared = typeof edge.capture === 'function' ? edge.capture() : edge;
      before = detachedHostValue(prepared.before); after = detachedHostValue(prepared.after);
    } catch (_) { return false; }
    if (!edge.force && JSON.stringify(before) === JSON.stringify(after)) return false;
    if (!historyCallback('apply', detachedHostValue(after)) || destroyed) return false;
    if(!appendAdjustment({before,after},'host'))appendHistory({ before, after });
    if (historyPreparing) historyPreparedCommit = true;
    return true;
  } finally { historyBusy = false; if(adjustment)adjustment.writing=false; }
}
function runHistory(direction) {
  depthController?.invalidate();
  endAdjustment();
  if (!historyHost || destroyed || !container.isConnected || historyBusy || historyPreparing || historyComposing || !['undo', 'redo'].includes(direction)) return false;
  historyPreparing = true; historyPreparedCommit = false;
  let ready;
  try { ready = historyCallback('beforeCommand', direction); } finally { historyPreparing = false; }
  if (!ready || destroyed || !historyHost) return false;
  historyBusy = true;
  try {
    if (tm) record(snap(), true);
    if (destroyed || !historyHost) return false;
    const next = direction === 'undo' ? hi - 1 : hi + 1;
    if (next < 0 || next >= hist.length) return false;
    const edge = hist[direction === 'undo' ? hi : next];
    if (outlineValue(edge)) {
      if (edge.focus && !historyCallback('apply', detachedHostValue(edge.focus[direction === 'undo' ? 'before' : 'after']))) return false;
      hi = next; restore(outlineHistoryIndex(), edge.scrollNodeId);
    }
    else { if (!historyCallback('apply', detachedHostValue(edge[direction === 'undo' ? 'before' : 'after'])) || destroyed) return false; hi = next; }
    return true;
  } finally { historyBusy = false; }
}
function reportSaveFailure() {
  if (!saveFailureShown && !destroyed) { saveFailureShown = true; toast("Couldn't save changes"); }
}
function flushSave() {
  try {
    const value = snap(false);
    if(loadedPresentationSnapshot!==null){if(value===loadedPresentationSnapshot)return;loadedPresentationSnapshot=null;}
    if (saveBlocked) {
      if (JSON.stringify(JSON.parse(value).root) === blockedTree) return;
      saveBlocked = false;
    }
    localStorage.setItem(KEY, value);
  } catch (e) {
    reportSaveFailure();
  }
}
function save(typing, scrollNodeId) {
  if (zoom !== root && headControls) updateChevron(headControls.arrow, zoom);
  depthController?.reconcile();
  if(adjustment?.writing){if(!adjustmentSaveTimer)adjustmentSaveTimer=setTimeout(()=>{adjustmentSaveTimer=null;flushSave();},50);}else flushSave();
  if (typing) { typingSnapshot = snap(); clearTimeout(tm); tm = setTimeout(record, 500); } else record(undefined, false, scrollNodeId);
  schedulePublication();
}
function restore(i, scrollNodeId) {
  const value = outlineValue(hist[i]), d = JSON.parse(value);
  const viewOnly = d.zoom !== zoom.id && historyRootEqual(snap(), value);
  if (viewOnly) blurOutlineText();
  // Search state is keyed by node objects, and undo/redo rebuilds every node: carry it over by id so bullets typed during a search stay visible.
  const keepIds = [...sKeep].map(n => n.id), overIds = [...sOver].map(([n, v]) => [n.id, v]);
  root = updateUidFromTree(d.root); zoom = find(root, d.zoom) || root; sel.clear();
  focusVisits.length = 0;
  for (const {id, expansion} of d.focusViews ?? []) focusVisits.push({id, expansion:new Map(expansion)});
  sKeep.clear(); keepIds.forEach(id => { const n = find(root, id); if (n) sKeep.add(n); });
  sOver.clear(); overIds.forEach(([id, v]) => { const n = find(root, id); if (n) sOver.set(n, v); });
  const a = viewOnly || ipadToolbarHistoryNoFocus || historyHost && !visibleHost() ? null : ownedActiveElement();
  const focusId = a?.dataset?.id ? +a.dataset.id : null;
  render(focusId, undefined, {anchorId:scrollNodeId, restoringHistory:true});
  reconcilePresentationMenu();
}
function undo() { depthController?.invalidate(); endAdjustment(); if (tm) record(); if (hi > 0) { const entry = hist[hi]; restore(--hi, entry.scrollNodeId); } }
function redo() { depthController?.invalidate(); endAdjustment(); if (tm) record(); if (hi < hist.length - 1) restore(++hi, hist[hi].scrollNodeId); }

// Parser for the seed text and for pasted text (pre-existing behaviour): indented lines, optional bullet markers, also WorkFlowy exports. Multi-line paste rebuilds the tree.
function parseOutline(text) {
  const raw = text.replace(/\r/g, '').split('\n'), ents = [];
  raw.forEach((line, i) => {
    if (!line.trim()) return;
    const m = line.match(/^([ \t]*)(.*)$/);
    const w = [...m[1]].reduce((a, ch) => a + (ch === '\t' ? 4 : 1), 0);
    ents.push({ w, bullet: /^[-*+•–·◦▪●○■]\s+/.test(m[2]), gap: i + 1 < raw.length && !raw[i + 1].trim(), txt: m[2].replace(/^(?:[-*+•–·◦▪●○■]\s+)?(?:\[[ xX]?\]\s+)?/, '').trim() });
  });
  const top = mk(); const stack = [{ w: -1, node: top }]; let bump = 0, hw = 0;
  ents.forEach((e, i) => {
    const nx = ents[i + 1]; let w = e.w;
    // WorkFlowy export: plain "Title", blank line, then "- " bullets at the same indent => bullets are children of Title
    if (!e.bullet && e.gap && nx && nx.bullet && nx.w <= e.w) { bump = 1; hw = e.w; }
    else if (!e.bullet) bump = 0;
    else if (bump && e.w >= hw) w = e.w + 1;
    while (stack.length > 1 && stack[stack.length - 1].w >= w) stack.pop();
    const n = mk(e.txt); stack[stack.length - 1].node.children.push(n); stack.push({ w, node: n });
  });
  return top.children;
}

// V1.1 description interchange: validate the complete document before allocating IDs.
function buildPar(n, nodes) {
  nodes?.set(n.id, n);
  n.children.forEach(c => { par.set(c, n); buildPar(c, nodes); });
}
// Search state. While a search is active the outline is a filtered, temporary view: n.open is never touched there,
// so ending the search brings back the real expand/collapse state exactly as it was.
// Shown = matches plus the ancestors leading to them; Anc = shown bullets with a shown descendant (expanded in the view);
// Keep = bullets edited or created during the search, so they don't vanish while being typed in; Over = expand/collapse clicks made during the search.
let sq = '';
const sShown = new Set(), sAnc = new Set(), sKeep = new Set(), sOver = new Map();
const searching = () => !!sq;
function computeSets() {
  sShown.clear(); sAnc.clear(); const ql = sq.toLowerCase();
  const w = n => { let any = false; for (const c of n.children) { const sub = w(c); if (sub) sAnc.add(c); if (sub || sKeep.has(c) || c.text.toLowerCase().includes(ql)) { sShown.add(c); any = true; } } return any; };
  w(zoom);
}
const isOpen = n => searching() ? (sOver.has(n) ? sOver.get(n) : n === zoom || sAnc.has(n)) : viewOpen(n);
const setNodeOpen = (n, o) => { const before = isOpen(n), transient = searching(); if(n.children.length&&before!==o)depthController?.invalidate(); if (searching()) sOver.set(n, o); else writeViewOpen(n, o); observeToggle(n, before, isOpen(n), transient); };
function shownKids(n) {
  if (!searching()) return n === root || viewOpen(n) || (n === zoom && !realChildren(n).length) ? n.children : [];
  if (!isOpen(n)) return [];
  return n !== zoom && sOver.get(n) === true ? n.children : n.children.filter(c => sShown.has(c));
}
function vis() { const o = []; (function w(n) { for (const c of shownKids(n)) { o.push(c); w(c); } })(zoom); return o; }
const esc = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Backdrop markup for the textarea: same text, transparent, with the matches wrapped in <mark>. The trailing newline keeps a last empty line's height.
const el = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
// Height is measured before the web font loads, so it is re-measured once fonts are ready (see the end of the script).
// scrollTop is reset because a leftover internal scroll offset shifts the caret upward and clips it on an empty bullet.
const setEditorHeight = (t,height) => { t.style.height=height; if(t.dataset.role==='title')t.parentElement.style.setProperty('--map-size-title-height',height); };
const fit = t => { t.style.height = 'auto'; setEditorHeight(t,t.scrollHeight + 'px'); t.scrollTop = 0; };

const REGULAR_LEVEL = 2;
// Keep the existing preference key so saved Home choices also apply in Focus.
const TEXT_STYLE_KEY = 'moa:outliner:homeTextStyle';
let plainText = false;
try { plainText = localStorage.getItem(TEXT_STYLE_KEY) === 'plain'; } catch (_) {}
// Line height keeps the default 22/16 ratio; the row height adds the 6px of vertical padding so the dots stay centred on the first line.
function levelStyle(level) {
  const fs = !plainText && level === 0 ? 28 : 16, lh = Math.round(fs * 22 / 16);
  const bold = plainText ? level === 0 && zoom !== root : level < REGULAR_LEVEL;
  return { '--fs': fs + 'px', '--lh': lh + 'px', '--bh': (lh + 6) + 'px', '--fw': bold ? 600 : 400 };
}
function setLevel(e, level) {
  if (level < REGULAR_LEVEL) e.dataset.textLevel = level;
  Object.entries(levelStyle(level)).forEach(([k, v]) => e.style.setProperty(k, v));
}

// Shared row/head editor binding. Canonical offsets never depend on the active field.
function readEditorRange(n, textarea) {
  const role = textarea.dataset.role || 'title', offset = role === 'description' ? splitNodeText(n.text,n.titleLineCount).title.length + 1 : 0;
  return { text: n.text, value: n.text, start: offset + textarea.selectionStart, end: offset + textarea.selectionEnd,
    selectionStart: offset + textarea.selectionStart, selectionEnd: offset + textarea.selectionEnd, role };
}
function editorMark(text, start, length) {
  if (!searching()) return '';
  const q = sq.toLowerCase(), lower = text.toLowerCase(), end = start + length;
  let at = 0, cursor = start, html = '';
  while ((at = lower.indexOf(q, at)) !== -1) {
    const lo = Math.max(start, at), hi = Math.min(end, at + q.length);
    if (hi > lo) { html += esc(text.slice(cursor, lo)) + '<mark>' + esc(text.slice(lo, hi)) + '</mark>'; cursor = hi; }
    at += q.length;
  }
  return html + esc(text.slice(cursor, end)) + '\n';
}
function refreshNodeEditor(binding) {
  const { host, title, getNode, head } = binding, n = getNode(), parts = splitNodeText(n.text,n.titleLineCount);
  if (title.value !== parts.title) title.value = parts.title;
  host.classList.toggle('has-description', parts.hasDescription);
  host.classList.toggle('spacer-editor',n.kind==='spacer');title.placeholder=n.kind==='spacer'?'Spacer':head?'Untitled':'';
  updateBadge(host,n);
  syncPhotoRow(binding);
  if (parts.hasDescription && !binding.description) {
    const field = el('div', 'description-field'), t = el('textarea'); setLevel(field, REGULAR_LEVEL);
    t.rows = 1; t.spellcheck = false; t.dataset.role = 'description'; t.dataset.id = n.id;
    t.setAttribute('aria-label', head ? 'Current topic description' : 'Node description');
    field.appendChild(t); host.appendChild(field); binding.description = t; binding.descriptionHost = field;
    bindField(binding, t);
  } else if (!parts.hasDescription && binding.description) {
    binding.descriptionHost.remove(); binding.description = binding.descriptionHost = null;
  }
  if (binding.description && binding.description.value !== parts.description) binding.description.value = parts.description;
  for (const [t, parent, offset] of [[title, host, 0], ...(binding.description ? [[binding.description, binding.descriptionHost, parts.title.length + 1]] : [])]) {
    t.dataset.id = n.id;
    let hl = parent.querySelector(':scope > .hl');
    if (searching() && !head) { if (!hl) { hl = el('div', 'hl'); hl.setAttribute('aria-hidden', 'true'); parent.insertBefore(hl, t); } hl.innerHTML = editorMark(n.text, offset, t.value.length); }
    else if (hl) hl.remove();
    fit(t);
  }
}
const childRowGlyph = '<svg width="18" height="16" viewBox="0 0 18 16" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5.5V11M2.5 11V8.25h13V11"/><rect x="6.75" y="1" width="4.5" height="4.5" rx="1"/><rect x=".75" y="11" width="3.5" height="3.5" rx=".8"/><rect x="7.25" y="11" width="3.5" height="3.5" rx=".8"/><rect x="13.75" y="11" width="3.5" height="3.5" rx=".8"/></svg>';
function updateBadge(host,n){
  let badge=host.querySelector(':scope > .map-size-badge');if(!badge){badge=el('button','map-size-badge');badge.type='button';badge.setAttribute('aria-label','Edit Map Size');host.appendChild(badge);}
  badge.onclick=e=>{e.stopPropagation();openMenu(n,badge,true);};
  const size=n.mapSize??1,hasSize=size!==1,hasRow=n.childrenInRow===true;
  const layoutChanged=host.classList.contains('map-size-active')!==hasSize
    ||host.classList.contains('map-child-row-active')!==hasRow;
  host.classList.toggle('map-size-active',hasSize);
  host.classList.toggle('map-child-row-active',hasRow);
  host.classList.toggle('map-presentation-active',hasSize||hasRow);
  badge.textContent='×'+displayMapSize(size).replace(/\.?0+$/,'');badge.hidden=!hasSize;

  let rowBadge=host.querySelector(':scope > .map-child-row-badge');
  if(hasRow&&!rowBadge){
    rowBadge=el('span','map-child-row-badge');
    rowBadge.setAttribute('role','img');
    rowBadge.setAttribute('aria-label','Arrange children in one row enabled');
    rowBadge.innerHTML=childRowGlyph;
    host.appendChild(rowBadge);
  }
  if(rowBadge)rowBadge.hidden=!hasRow;
  return layoutChanged;
}
function updateEditorBadge(binding,node){
  if(binding&&updateBadge(binding.host,node)){
    fit(binding.title);
    if(binding.description)fit(binding.description);
  }
}
function focusEditor(binding, pos, preventScroll = false) {
  if (binding.getNode().photos) {
    const button = binding.photos?.querySelector('.photo-thumb');
    button?.focus({preventScroll});
    return button;
  }
  const n = binding.getNode(), p = pos == null ? n.text.length : Math.max(0, Math.min(pos, n.text.length)), parts = splitNodeText(n.text,n.titleLineCount);
  const desc = parts.hasDescription && p > parts.title.length, t = desc ? binding.description : binding.title, local = desc ? p - parts.title.length - 1 : p;
  if (!t) return;
  t.focus({preventScroll}); t.setSelectionRange(local, local);
  return t;
}
function saveFieldCommand(binding) {
  save();
  if(binding.head&&typeof hist[hi]==='string')hist[hi]={outline:hist[hi],titleBoundary:binding.getNode().id};
}
function insertDescription(binding,start,end) {
  const n=binding.getNode(), parts=splitNodeText(n.text,n.titleLineCount);
  record();
  openPlaceholderOwner(n);
  const tail=parts.title.slice(end);
  const description=tail+(parts.hasDescription?(tail?'\n':'')+parts.description:'');
  setNodeText(n,{title:parts.title.slice(0,start),description,hasDescription:true});
  refreshNodeEditor(binding);
  focusEditor(binding,binding.title.value.length+1);
  if(binding.head)crumbs();
  saveFieldCommand(binding);
}
function bindField(binding, t) {
  const isBreak = e => e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph';
  let soft = false, composing = false, pendingBreak = null;
  const writeField = () => {
    const n = binding.getNode(), parts = { title: binding.title.value, description: binding.description ? binding.description.value : '', hasDescription: !!binding.description };
    if (t.dataset.role === 'description') parts.description = t.value; else parts.title = t.value;
    if(n.kind==='spacer'&&(composing||historyComposing))return n;
    if (parts.title || parts.hasDescription) openPlaceholderOwner(n);
    setNodeText(n,parts); if(!composing&&!historyComposing&&n.text!=='')clearSpacerKind(n); if (searching() && !binding.head) sKeep.add(n);
    return n;
  };
  listen(t, 'compositionstart', () => { composing = true; soft = false; });
  listen(t, 'compositionend', () => { composing = false; writeField(); refreshNodeEditor(binding); save(true); });
  listen(t, 'blur', () => { soft = false; });
  listen(t, 'keyup', e => { if (e.key === 'Enter') soft = false; });
  // Owner correction: one Enter intent for hardware and both software-input paths.
  const applyBreak = () => {
    const n = binding.getNode(), range = readEditorRange(n, t), intent = enterIntent(n, range, binding.head);
    if (intent.kind === 'newline') {
      t.setRangeText('\n', t.selectionStart, t.selectionEnd, 'end');
      writeField(); refreshNodeEditor(binding); if (binding.head) crumbs(); save(true);
    } else if (intent.kind === 'firstChild') {
      record();
      const child = phOwner === n && !realChildren(n).length ? phNode : mk();
      if (child === phNode) promotePresentation(child);
      else n.children.unshift(child);
      clearSpacerKind(n);
      writeViewOpen(n, true);
      if (searching()) { sKeep.add(child); sOver.set(n, true); }
      render(child.id, 0);
    } else if (intent.kind === 'navigate') {
      if (range.role === 'description' && t.selectionStart !== t.selectionEnd) {
        t.setRangeText('', t.selectionStart, t.selectionEnd, 'end');writeField();refreshNodeEditor(binding);crumbs();save(true);
      }
      toFirst();
    }
    else enter(n, range);
  };
  // Native header Undo traverses text transactions; a boundary command uses
  // the existing outline edge. Align those owners without recording Undo as new typing.
  const hasBoundary = () => binding.head&&hist.some(edge=>edge?.titleBoundary===binding.getNode().id);
  const alignHeaderHistory = () => {
    clearTimeout(tm);tm=null;typingSnapshot=null;
    const value=snap();let match=-1;
    for(let i=0;i<hist.length;i++)if(outlineValue(hist[i])===value&&(match<0||Math.abs(i-hi)<Math.abs(match-hi)))match=i;
    if(match>=0)hi=match;
    flushSave();schedulePublication();
  };
  const boundaryHistory = direction => {
    if(!binding.head||composing||historyComposing)return false;
    const id=binding.getNode().id,edge=hist[direction==='undo'?hi:hi+1],current=outlineValue(hist[outlineHistoryIndex()]);
    if(current!==snap())return false;
    if(edge?.titleBoundary!==id){
      // Recreated description fields have no browser transaction to redo. Only
      // fall back for a title-text-only adjacent outline edge in this command's lineage.
      if(!hasBoundary()||document.queryCommandEnabled(direction))return false;
      const adjacent=outlineValue(hist[direction==='undo'?hi-1:hi+1]);if(!adjacent)return false;
      const shape=value=>JSON.stringify(JSON.parse(value),(key,value)=>value&&value.id===id&&Array.isArray(value.children)?{...value,text:'',titleLineCount:undefined}:value);
      if(shape(current)!==shape(adjacent))return false;
    }
    return historyHost?runHistory(direction):(direction==='undo'?undo():redo(),true);
  };
  listen(t, 'beforeinput', e => {
    if(!e.isComposing&&e.cancelable&&(e.inputType==='historyUndo'||e.inputType==='historyRedo')&&boundaryHistory(e.inputType==='historyUndo'?'undo':'redo')){e.preventDefault();return;}
    pendingBreak = null;
    if (composing || e.isComposing || historyComposing || soft || !isBreak(e)) return;
    // Interior description Enter is a native newline, preserving native header Undo.
    if (enterIntent(binding.getNode(), readEditorRange(binding.getNode(), t), binding.head).kind === 'newline') { soft = true; return; }
    if (e.cancelable) { e.preventDefault(); applyBreak(); }
    else pendingBreak = { value: t.value, start: t.selectionStart, end: t.selectionEnd };
  });
  listen(t, 'input', e => {
    const nativeHistory=!composing&&!e.isComposing&&!historyComposing&&binding.head&&(e.inputType==='historyUndo'||e.inputType==='historyRedo')&&hasBoundary();
    if(nativeHistory&&tm)record(typingSnapshot,true);
    const wasSoft = soft; soft = false;
    if (!composing && !e.isComposing && !historyComposing && !wasSoft && isBreak(e)) {
      const parts = splitNodeText(binding.getNode().text,binding.getNode().titleLineCount), old = pendingBreak || {
        value: t.dataset.role === 'description' ? parts.description : parts.title,
        start: Math.max(0, t.selectionStart - 1),
        end: Math.max(0, (t.dataset.role === 'description' ? parts.description : parts.title).length - (t.value.length - t.selectionStart))
      };
      const n = binding.getNode(), offset = t.dataset.role === 'description' ? parts.title.length + 1 : 0;
      const intent = enterIntent(n, {value:n.text,role:t.dataset.role,selectionStart:offset+old.start,selectionEnd:offset+old.end}, binding.head);
      pendingBreak = null;
      // Input-only fallback must also keep a legitimate browser-inserted description LF.
      if (intent.kind !== 'newline') { t.value = old.value; t.setSelectionRange(old.start, old.end); applyBreak(); return; }
    }
    pendingBreak = null;
    writeField();
    if (composing || e.isComposing || historyComposing) { fit(t); save(true); return; }
    refreshNodeEditor(binding);
    if (binding.head) crumbs();
    if(nativeHistory)alignHeaderHistory();else save(true);
  });
  listen(t, 'keydown', e => {
    if (composing || e.isComposing || e.keyCode === 229 || historyComposing) { soft = false; return; }
    if(binding.head&&(e.ctrlKey||e.metaKey)&&!e.altKey){const key=(e.code||e.key).toLowerCase();if(['keyz','z','keyy','y'].includes(key)&&boundaryHistory(key.endsWith('y')||e.shiftKey?'redo':'undo')){e.preventDefault();return;}}
    const enter = e.key === 'Enter' || e.keyCode === 13;
    const descriptionEnter = enter && e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
    soft = descriptionEnter ? t.dataset.role === 'description' : enter && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey;
    const n = binding.getNode(), range = readEditorRange(n, t), parts = splitNodeText(n.text,n.titleLineCount), collapsed = range.start === range.end;
    if(!binding.head&&e.key==='Enter'&&e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();e.stopPropagation();presentationCommand('spacer',n);return;}
    if (soft && descriptionEnter) {
      e.preventDefault();
      // Keep the active textarea's native Undo transaction when supported.
      let inserted=false;try{inserted=document.execCommand('insertText',false,'\n');}catch(_){}
      if(!inserted){record();t.setRangeText('\n',t.selectionStart,t.selectionEnd,'end');writeField();refreshNodeEditor(binding);saveFieldCommand(binding);}
      soft=false;return;
    }
    if (soft) return; // Native title/description LF; input recomputes the title boundary.
    if (descriptionEnter) {
      e.preventDefault();insertDescription(binding,t.selectionStart,t.selectionEnd);return;
    }
    if ((e.key === 'Enter' || e.keyCode === 13) && (e.altKey || e.shiftKey || e.ctrlKey || e.metaKey)) {e.preventDefault();return;}
    if ((e.key === 'Enter' || e.keyCode === 13) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (enterIntent(n, range, binding.head).kind === 'newline') { soft = true; return; }
      e.preventDefault(); applyBreak(); return;
    }
    if (collapsed && ((e.key === 'Backspace' && range.role === 'description' && t.selectionStart === 0) || (e.key === 'Delete' && range.role === 'title' && parts.hasDescription && t.selectionEnd === t.value.length))) {
      e.preventDefault(); setNodeText(n,splitNodeText(parts.title+parts.description,n.titleLineCount)); refreshNodeEditor(binding); focusEditor(binding, parts.title.length); if (binding.head) crumbs(); save(true); return;
    }
    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && ((e.key === 'ArrowDown' && range.role === 'title' && parts.hasDescription && t.value.indexOf('\n',t.selectionEnd) === -1) || (e.key === 'ArrowUp' && range.role === 'description' && (t.selectionStart === 0 || t.value.lastIndexOf('\n', t.selectionStart - 1) === -1)))) {
      e.preventDefault();const lastTitleStart=parts.title.lastIndexOf('\n')+1,column=t.selectionStart-(range.role==='title'?lastTitleStart:0);
      focusEditor(binding, range.role === 'title' ? parts.title.length + 1 + Math.min(column, parts.description.indexOf('\n') < 0 ? parts.description.length : parts.description.indexOf('\n')) : lastTitleStart+Math.min(column,parts.title.length-lastTitleStart)); return;
    }
    if (binding.head) {
      if (e.key === 'Enter' || (e.key === 'ArrowDown' && range.end === n.text.length)) { e.preventDefault(); toFirst(); }
    } else keys(e, n, range);
  });
  if (!binding.head) listen(t, 'focus', () => { const n = binding.getNode(); anchor = n; if (sel.size) setSel(new Set()); });
}
function bindNodeEditor(host, n, head = false, title = null) {
  const t = title || el('textarea'); t.rows = 1; t.spellcheck = false; t.dataset.role = 'title'; t.dataset.id = n.id;
  if (!title) host.appendChild(t);
  const binding = { host, title: t, getNode: head ? () => zoom : () => n, head, description: null };
  host._nodeEditor = binding; bindField(binding, t); refreshNodeEditor(binding); return binding;
}

// Redraws everything. DO NOT add automatic caret restoration here (rejected). Callers pass focusId when they want a bullet focused.
// Every same-view redraw uses the old DOM, even when history has replaced the node objects.
function keepSheetPosition(update, anchorId, fallbackToTop = false) {
  const scope = zoom.id, scroll = treeEl.scrollTop, bounds = treeEl.getBoundingClientRect();
  if (!bounds.height || !els.size) { update(); return; }
  const rows = [...els], anchors = [];
  let first = -1, after = rows.length, preferred;
  for (const [index, [node, row]] of rows.entries()) {
    const rect = row.getBoundingClientRect();
    if (rect.top >= bounds.bottom) { after = index; break; }
    if (rect.bottom <= bounds.top) continue;
    if (first < 0) first = index;
    const anchor = [node.id, rect.top - bounds.top];
    if (node.id === anchorId) preferred = anchor;
    else anchors.push(anchor);
  }
  update();
  if (zoom.id !== scope) return;
  const top = treeEl.getBoundingClientRect().top;
  function restoreAnchor([id, offset = 0]) {
    const row = treeEl.querySelector(`.node[data-id="${id}"] > .row`);
    if (!row) return false;
    treeEl.scrollTop += row.getBoundingClientRect().top - top - offset;
    return true;
  }
  if ((preferred && restoreAnchor(preferred)) || anchors.some(restoreAnchor)) return;
  // A whole screen of children can disappear. Return to their branch or the nearest surviving row.
  if (first >= 0 && !fallbackToTop) {
    const remaining = new Set([...els.keys()].map(node => node.id));
    for (let group = rows[first][1].parentElement.parentElement?.closest('.node'); group;
         group = group.parentElement?.closest('.node')) {
      const id = +group.dataset.id;
      if (remaining.has(id) && restoreAnchor([id])) return;
    }
    const neighbor = rows.slice(after).find(([node]) => remaining.has(node.id)) ??
      rows.slice(0, first).findLast(([node]) => remaining.has(node.id));
    if (neighbor && restoreAnchor([neighbor[0].id])) return;
  }
  treeEl.scrollTop = fallbackToTop ? 0 : scroll;
}

let renderedZoomId;
function render(focusId, pos, {anchorId, restoringHistory = false, keepPosition = true, fallbackToTop = false} = {}) {
  const sameView = keepPosition && zoom.id === renderedZoomId;
  const draw = () => drawOutline(restoringHistory ? undefined : anchorId);
  if (sameView) keepSheetPosition(draw, anchorId ?? focusId, fallbackToTop);
  else draw();
  renderedZoomId = zoom.id;
  if (!focusId) return;
  const field = focusNode(focusId, pos, sameView);
  // Editing can intentionally move the caret to a new row just outside the viewport.
  if (sameView && !restoringHistory) revealFocusedField(field);
}

function drawOutline(scrollNodeId) {
  const nodes = zoom !== root || focusVisits.length ? new Map() : null;
  par = new Map(); buildPar(root, nodes);
  if (nodes) reconcileFocusVisits(nodes);
  // The empty placeholder bullet must exist before the parent map is built; otherwise it has no parent,
  // and Enter, Tab, paste and Backspace all fail on it until some later redraw.
  if (phNode && phOwner !== zoom) {
    if (!phNode.text && !phNode.children.length && phOwner.children.length === 1 && phOwner.children[0] === phNode) { phOwner.children.length = 0; par.delete(phNode); }
    phNode = phOwner = null;
  }
  if (!zoom.children.length && !zoom.photos) { phNode = mk(); phOwner = zoom; zoom.children.push(phNode); par.set(phNode, zoom); }
  // Drop selection / anchor entries that are gone or outside the current view; a stale selection used to swallow Enter, Delete and Tab.
  for (const n of [...sel]) { let x = n; while (x && x !== zoom) x = par.get(x); if (!x) sel.delete(n); }
  if (anchor && !par.has(anchor)) anchor = null; if (cursor && !par.has(cursor)) cursor = null;
  els.clear(); removePhotoPreviews(treeEl); treeEl.innerHTML = '';
  if (searching()) computeSets();
  const children = shownKids(zoom);
  if (zoom !== root && !isOpen(zoom) && realChildren(zoom).length) { sel.clear(); anchor = cursor = null; }
  children.forEach(c => treeEl.appendChild(row(c, false, 0)));
  if (searching() && !sShown.size) { const m = el('div', 'nomatch'); m.textContent = 'No matches'; treeEl.appendChild(m); }
  treeEl.querySelectorAll('textarea[data-id]').forEach(fit);
  crumbs(); head(); save(false, scrollNodeId);
}
// Big title for the bullet you zoomed into (hidden at Home). It edits that bullet's text.
const titleEl = container.querySelector('#ol-title'), headEl = container.querySelector('#ol-head');
let headBinding = null, headControls = null;
function head() {
  const on = zoom !== root, wasFocused = headEl.classList.contains('show');
  headEl.classList.toggle('show', on);
  const previousId = +titleEl.dataset.id;
  if (wasFocused && previousId !== zoom.id && menuNode?.id === previousId && menu.classList.contains('show')) {
    numericBindings.forEach(binding => binding.finish());
    menu.classList.remove('show');
  }
  if (!on) {
    if (headBinding?.photos) syncPhotoRow(headBinding);
    return;
  }
  setLevel(headEl, 0);
  if (!headBinding) {
    const host = el('div', 'tw'), controls = el('div', 'head-controls');
    headControls = createNodeControls(() => zoom, true);
    controls.append(headControls.more, headControls.arrow);
    titleEl.before(host); host.append(controls, titleEl);
    headBinding = bindNodeEditor(host, zoom, true, titleEl);
  } else refreshNodeEditor(headBinding);
}
const toFirst = () => { const c = zoom.children[0]; if (c) focusNode(c.id, 0); };
function focusNode(id, pos, preventScroll = false) {
  const n = find(root, +id), r = n && els.get(n), host = r && r.querySelector('.tw');
  if (host && host._nodeEditor) return focusEditor(host._nodeEditor, pos, preventScroll);
}
function revealFocusedField(field, onlyWhenHidden = false) {
  if (!field) return;
  if (onlyWhenHidden) {
    const bounds = treeEl.getBoundingClientRect(), rect = field.getBoundingClientRect();
    if (rect.bottom > bounds.top && rect.top < bounds.bottom) return;
  }
  field.scrollIntoView({block:'nearest', inline:'nearest', behavior:'instant'});
}
// Shared bullet/breadcrumb navigation: separate pending typing from the view step.
function blurOutlineText() {
  const a = ownedActiveElement(); if (a && a.tagName === 'TEXTAREA') a.blur();
}
function navigate(n) {
  blurOutlineText();
  if (n === zoom) return;
  depthController?.invalidate();
  record();
  enterFocus(n);
  zoom = n;
  // Search-only toggles belong to the view where they were made.
  sOver.clear();
  render();
}
let revealHighlight = null;
function clearRevealHighlight() {
  if (!revealHighlight) return;
  revealHighlight.effect.target.remove();
  revealHighlight.cancel();
  revealHighlight = null;
}
// Reveal through the nearest enclosing Focus, keeping its expansion visit local.
function revealNode(id, photoId) {
  if (destroyed || historyComposing || !Number.isSafeInteger(id)) return false;
  const node = find(root, id);
  const photoIndex = photoId === undefined ? -1 : node?.photos?.findIndex(photo => photo.id === photoId) ?? -1;
  if (!node || node === root || node.kind === 'spacer' ||
      (photoId !== undefined && photoIndex < 0)) return false;
  const path = new Set();
  for (let item = node; item; item = par.get(item)) path.add(item);
  let scope = zoom;
  while (!path.has(scope)) scope = par.get(scope);
  const moved = scope !== zoom;
  if (moved) {
    blurOutlineText(); record(); depthController?.invalidate();
    enterFocus(scope); zoom = scope; sOver.clear();
    if (searching()) computeSets();
  }
  let changed = moved;
  const steps = [];
  for (let child = node; child !== scope; child = par.get(child)) steps.push(child);
  const filtered = searching() && steps.some(child => {
    const parent = par.get(child);
    return !sShown.has(child) && !(parent !== zoom && sOver.get(parent) === true);
  });
  if (filtered) endSearch(false);
  for (const child of steps) {
    const parent = par.get(child);
    if ((parent !== root || searching()) && !isOpen(parent)) {
      if (!changed) record();
      setNodeOpen(parent, true); changed = true;
    }
  }
  if (changed || filtered) render(undefined, undefined, {keepPosition:false});
  const row = node === zoom ? headEl : els.get(node);
  const target = photoId === undefined ? row :
    row?.querySelectorAll('.photo-thumb')[photoIndex];
  if (!target) return false;
  requestAnimationFrame(() => {
    if (!target.isConnected || destroyed) return;
    target.scrollIntoView({block:'center', inline:'nearest', behavior:'instant'});
    clearRevealHighlight();
    const marker = el('span', 'map-reveal-flash');
    marker.setAttribute('aria-hidden', 'true');
    const highlightHost = photoId === undefined ? row : target.closest('.photo-row');
    highlightHost.prepend(marker);
    const highlight = revealHighlight = marker.animate([
      {opacity:1, offset:0},
      {opacity:1, offset:1/6},
      {opacity:0, offset:1}
    ], {duration:600, id:'map-reveal-highlight'});
    highlight.onfinish = () => { if (revealHighlight === highlight) clearRevealHighlight(); };
  });
  return true;
}
// REQUIREMENT (breadcrumb abbreviation), in this order:
// 1. Everything fits: show the full path.
// 2. Too long: names shrink with an ellipsis first (ancestors down to ANC px, the current one down to CUR px) so the user still sees enough of each.
// 3. Still too long: fold the middle into one ellipsis, one crumb at a time, giving Home > ... > parent > this node, finally Home > ... > this node.
// 4. Even that does not fit: the current name shrinks further.
// Recomputed on window resize and when fonts load. The line must stay a single line.
function crumbs() {
  const c = container.querySelector('#ol-crumbs');
  const label = n => n === root ? 'Home' : n.photos ? photoLabel(n.photos.length, {titleCase:true}) :
    (splitNodeText(n.text,n.titleLineCount).title.replace(/\n/g,' ') || 'Untitled');
  const path = []; for (let n = zoom; n; n = par.get(n)) path.unshift(n);
  // h = how many crumbs right after Home are folded into "…"
  const draw = h => {
    c.innerHTML = '';
    path.forEach((n, i) => {
      if (h && i >= 1 && i <= h) {
        if (i === 1) {
          c.appendChild(document.createTextNode('›'));
          const e = el('span', 'ell'); e.textContent = '…'; e.title = path.slice(1, h + 1).map(label).join(' › '); c.appendChild(e);
        }
        return;
      }
      if (i) c.appendChild(document.createTextNode('›'));
      const a = el('a'); a.textContent = label(n); a.title = a.textContent;
      if (n === zoom) { a.style.color = 'var(--ink)'; a.style.cursor = 'default'; }
      a.onclick = () => navigate(n);
      c.appendChild(a);
    });
  };
  // Names shrink first (ancestors down to ANC px, the current one down to CUR px); only when that is not enough is the middle folded into "…".
  const ANC = 90, CUR = 140;
  c.classList.add('m'); let h = 0, as, last;
  for (;;) {
    draw(h); as = [...c.querySelectorAll('a')]; last = h >= path.length - 2; let save = 0;
    as.forEach((a, i) => { const w = a.offsetWidth, m = Math.min(w, i === as.length - 1 ? CUR : ANC); a._mn = m; save += w - m; });
    if (last || c.scrollWidth - save <= c.clientWidth + 1) break;
    h++;
  }
  c.classList.remove('m');
  // Nothing fits even folded: let the current name shrink further.
  as.forEach((a, i) => { a.style.minWidth = last && i === as.length - 1 ? '1.5em' : a._mn + 'px'; });
}
let crumbRaf = 0;
const resizeCrumbs = () => { cancelAnimationFrame(crumbRaf); crumbRaf = requestAnimationFrame(crumbs); };
listen(window, 'resize', resizeCrumbs);

function updateChevron(arrow, node) {
  const hasChildren = !!realChildren(node).length, open = !!isOpen(node);
  arrow.classList.toggle('hide', !hasChildren);
  arrow.classList.toggle('open', open);
  if (hasChildren) arrow.setAttribute('aria-expanded', String(open));
  else arrow.removeAttribute('aria-expanded');
}
function createNodeControls(getNode, focused = false) {
  const arrow = el('button', 'arrow'), more = el('button', 'dots');
  const chevron = el('span'), dots = el('span');
  chevron.textContent = '▸'; chevron.setAttribute('aria-hidden', 'true');
  dots.setAttribute('aria-hidden', 'true');
  arrow.appendChild(chevron); more.appendChild(dots);
  arrow.type = more.type = 'button';
  if (!focused) arrow.tabIndex = more.tabIndex = -1;
  arrow.title = 'Collapse / expand (Ctrl+click: all levels)';
  more.title = 'More'; more.setAttribute('aria-label', focused ? 'More for current topic' : 'More');
  if (!focused) updateChevron(arrow, getNode());
  // REQUIREMENT: Ctrl/Cmd+click on the triangle = expand all / collapse all for this bullet and everything below it.
  // The click must not select the row (see the row mousedown handler below, which skips the arrow).
  // Ctrl/Cmd+click expands or collapses this bullet and everything under it.
  arrow.onclick = e => {
    const node = getNode();
    if (!realChildren(node).length) return;
    const open = !isOpen(node);
    if (e.ctrlKey || e.metaKey) setOpen(node, open); else setNodeOpen(node, open);
    render(undefined, undefined, {anchorId:node.id});
  };
  // The ... button on each bullet opens the bullet menu. DO NOT add mousedown preventDefault to it or to the triangle (rejected, see summary at the top).
  more.onclick = e => { e.stopPropagation(); openMenu(getNode(), more); };
  return {more, arrow};
}

// d = depth of this row in the current view (0 = top level), used only for text size and weight.
function row(n, inSel, d) {
  const wrap = el('div', 'node'); wrap.dataset.id = n.id;
  const r = el('div', 'row'); const selOn = inSel || sel.has(n); if (selOn) r.classList.add('sel'); els.set(n, r);
  setLevel(r, zoom === root ? d : d + 1);
  const {more, arrow} = createNodeControls(() => n);
  const bu = el('a', 'bullet' + (n.children.length && !isOpen(n) ? ' closed' : '')); bu.innerHTML = '<i></i>'; bu.title = 'Zoom in';
  // Owner V1.1 exception: bullet navigation opens the view without starting text entry.
  bu.onclick = () => navigate(n);
  const tw = el('div', 'tw'); bindNodeEditor(tw, n);
  bu.draggable = true;
  bu.ondragstart = e => { dragSet = sel.has(n) ? roots() : [n]; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', toText(dragSet)); e.dataTransfer.setDragImage(r, 10, 10); r.classList.add('dragging'); };
  bu.ondragend = () => { dragSet = null; clearDrop(); r.classList.remove('dragging'); };
  // Ctrl/Cmd/Shift+click multi-selects rows, EXCEPT when the click is on the triangle (.arrow): that is the expand-all shortcut and must not select.
  listen(r, 'mousedown', e => { if ((e.shiftKey || e.ctrlKey || e.metaKey) && !e.target.closest('.arrow')) { e.preventDefault(); pick(n, e); } });
  r.append(more, arrow, bu, tw); wrap.appendChild(r);
  const kk = shownKids(n);
  if (kk.length) {
    const k = el('div', 'kids'); kk.forEach(c => k.appendChild(row(c, selOn, d + 1))); wrap.appendChild(k);
  }
  return wrap;
}

const rm = n => { const p = par.get(n); p.children.splice(p.children.indexOf(n), 1); };
function indent(n) {
  const p = par.get(n), i = p.children.indexOf(n); if (!i) return false;
  const prev = p.children[i - 1]; if (prev.photos) return false;
  p.children.splice(i, 1); clearSpacerKind(prev); prev.children.push(n); writeViewOpen(prev, true); return true;
}
function outdent(n) {
  const p = par.get(n); if (!p || p === zoom) return false;
  const g = par.get(p); rm(n); g.children.splice(g.children.indexOf(p) + 1, 0, n); return true;
}
// The bullet that toolbar buttons act on: the last one that had the caret, else the last visible one.
const cur = () => { const l = vis(); return l.includes(anchor) ? anchor : l[l.length - 1]; };
// Indent / outdent the selection, or the current bullet when nothing is selected. Shared by Tab, Alt+Arrows and the toolbar.
function tab(back, photoCaret) {
  const it = sel.size ? roots() : [cur()]; if (!it[0]) return;
  // All or none: indent needs a previous sibling for EVERY selected item; outdent is impossible if ANY selected item is at the top level of the view.
  if (!back) {
    const moving = new Set(it);
    for (const node of it) {
      const siblings = par.get(node).children;
      let index = siblings.indexOf(node) - 1;
      while (index >= 0 && moving.has(siblings[index])) index--;
      if (index < 0 || siblings[index].photos) return;
    }
  }
  if (back && it.some(n => par.get(n) === zoom)) return;
  const active = ownedActiveElement(), t = sel.size ? null : active && active.matches(`textarea[data-id="${it[0].id}"]`) ? active : container.querySelector(`#ol-tree textarea[data-id="${it[0].id}"]`), pos = t ? readEditorRange(it[0], t).start : null;
  (back ? it.slice().reverse() : it).forEach(n => back ? outdent(n) : indent(n));
  render(sel.size || photoCaret ? null : it[0].id, pos, {anchorId:it[0].id});
  if(photoCaret)focusPhotoCaret(it[0],photoCaret);
}
// Split the bullet at the caret into a new bullet (or outdent when the bullet is empty). Shared by Enter and the toolbar.
// Current owner override: split titles into same-level siblings; descriptions keep their own newlines.
function enterIntent(n, t, head = false) {
  const original = splitNodeText(t.value,n.titleLineCount), start = t.selectionStart, end = t.selectionEnd;
  const parts={...original};
  if(t.role==='description'){const offset=original.title.length+1;parts.description=original.description.slice(0,start-offset)+original.description.slice(end-offset);}
  else parts.title=original.title.slice(0,start)+original.title.slice(end);
  const text=joinNodeText(parts);
  const result=kind=>({kind,text,start,parts});
  if (t.role === 'description') return result(start < text.length ? 'newline' : head ? 'navigate' : 'insert');
  if (head && n.photos) return result('navigate');
  if (head) return result(start === end && start === original.title.length ? 'firstChild' : 'navigate');
  // Explicit spacers insert below; ordinary empty rows keep their existing rules.
  if (n.kind === 'spacer' || n.photos && !text) return result('insert');
  if (!text && !n.children.length && par.get(n) !== zoom) return result('outdent');
  return result(start === 0 || start < parts.title.length ? 'split' : 'insert');
}
function insertAfterNodeEnd(n,newNode){
  const parent=par.get(n);if(n===root||!parent)return false;
  if(!n.photos&&isOpen(n)&&realChildren(n).length)n.children.unshift(newNode);
  else { openPlaceholderOwner(n); parent.children.splice(parent.children.indexOf(n)+1,0,newNode); }
  return true;
}
function enter(n, t) {
  const p = par.get(n), intent = enterIntent(n, t), parts = intent.parts;
  record(); // Commit pending typing before the single structural history step.
  if (intent.kind === 'outdent') { setNodeText(n,parts); outdent(n); render(n.id, 0); return; }
  if (intent.kind === 'newline') {
    setNodeText(n,{...parts,description:parts.description.slice(0,intent.start-parts.title.length-1)+'\n'+parts.description.slice(intent.start-parts.title.length-1)}); render(n.id, intent.start + 1); return;
  }
  if (intent.kind === 'split') {
    const upper = setNodeText(mk(),{title:parts.title.slice(0,intent.start),hasDescription:false,description:''});
    setNodeText(n,{...parts,title:parts.title.slice(intent.start)});
    p.children.splice(p.children.indexOf(n), 0, upper);
    if (searching()) { sKeep.add(n); sKeep.add(upper); }
    render(intent.start === 0 ? upper.id : n.id, 0, {anchorId:n.id}); return;
  }
  setNodeText(n,parts); insertSiblingAfter(n);
}
function insertSiblingAfter(n){
  const nn=mk();
  if (searching()) { sKeep.add(n); sKeep.add(nn); }
  insertAfterNodeEnd(n,nn);
  render(nn.id, 0, {anchorId:n.id});
}

function paint() { const mark = (n, p) => { const r = els.get(n), on = p || sel.has(n); if (r) r.classList.toggle('sel', on); n.children.forEach(c => mark(c, on)); }; zoom.children.forEach(c => mark(c, false)); }
function setSel(set) { sel.clear(); set.forEach(n => sel.add(n)); paint(); if (sel.size && ownedActiveElement() && ownedActiveElement().blur) ownedActiveElement().blur(); }
const roots = () => { const o = []; (function w(n) { for (const c of n.children) sel.has(c) ? o.push(c) : w(c); })(zoom); return o; };
function pick(n, e) {
  const l = vis(), a = l.indexOf(anchor);
  if (e.shiftKey && a > -1) { const b = l.indexOf(n); cursor = n; setSel(new Set(l.slice(Math.min(a, b), Math.max(a, b) + 1))); }
  else { const x = new Set(sel); x.has(n) ? x.delete(n) : x.add(n); if (!anchor || !x.size) anchor = n; cursor = n; setSel(x); }
}
// REQUIREMENT (drag and drop): a single straight line, depth chosen by pointer x (WorkFlowy style), middle of a row = become a child.
// DO NOT replace the single .dropline with per-row borders or box-shadows, and do not attach dragover handlers to each row (that caused flashing).
// Drag & drop. The tree decides the drop target from the pointer position and draws ONE straight indicator line,
// so neighbouring rows never flash their own (rounded) borders.
// Middle of a row = drop inside it (row is highlighted). Near a row edge = drop in the gap between two rows; when the gap
// follows the last child of a deeper branch, moving the pointer left/right picks which level the item lands on
// (sibling of the row above, of its parent, of its grandparent, ...), like WorkFlowy.
const treeEl = container.querySelector('#ol-tree'), dropLine = el('div', 'dropline');
container.appendChild(dropLine);
let dropT = null, dropIn = null;
const depthOf = n => { let d = 0; for (let x = par.get(n); x && x !== zoom; x = par.get(x)) d++; return d; };
const inDrag = n => { for (let x = n; x; x = par.get(x)) if (dragSet.includes(x)) return true; return false; };
const nextFree = (p, from) => { for (let i = from; i < p.children.length; i++) if (!dragSet.includes(p.children[i])) return p.children[i]; return null; };
function clearDrop() { dropT = null; dropLine.style.display = 'none'; if (dropIn) { dropIn.classList.remove('drop-in'); dropIn = null; } }
function aimDrop(e) {
  clearDrop();
  const list = vis().filter(n => !inDrag(n)); if (!list.length) return;
  const rects = list.map(n => els.get(n).getBoundingClientRect()), y = e.clientY;
  let i = 0, bd = Infinity;
  rects.forEach((b, j) => { const d = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0; if (d < bd) { bd = d; i = j; } });
  const f = (y - rects[i].top) / rects[i].height;
  if (f >= .33 && f <= .67) { const n = list[i]; if(n.photos)return; dropT = { parent: n, before: null, open: true }; dropIn = els.get(n); dropIn.classList.add('drop-in'); return; }
  const g = f < .5 ? i : i + 1, p = list[g - 1], nx = list[g];
  let ref, ry, t, childIndent = 0;
  if (!p || (nx && par.get(nx) === p)) { ref = nx; ry = rects[g].top; t = { parent: par.get(nx), before: nx }; }
  // Owner-approved leaf-gap enhancement (2026-10-16): 32px is the existing .kids margin + border + padding.
  else if (!p.children.length && e.clientX >= rects[g - 1].left + (touchGesture?.active ? 31.5 : (32 + 10) / 2)) {
    if(p.photos)return;
    ref = p; ry = rects[g - 1].bottom; childIndent = touchGesture?.active ? 48 : 32; t = { parent: p, before: null, open: true };
  }
  else {
    const chain = []; let a = p;
    for (let k = depthOf(p), lo = nx ? depthOf(nx) : 0; k >= lo && a; k--, a = par.get(a)) chain.push(a);
    if (!chain.length) chain.push(p);
    ref = chain.find(a => e.clientX >= els.get(a).getBoundingClientRect().left + 10) || chain[chain.length - 1];
    const pp = par.get(ref); ry = rects[g - 1].bottom; t = { parent: pp, before: nextFree(pp, pp.children.indexOf(ref) + 1) };
  }
  if(t.parent.photos)return;
  dropT = t;
  const rr = els.get(ref).getBoundingClientRect(), sh = treeEl.getBoundingClientRect();
  if (ry < sh.top || ry > sh.bottom) return;
  Object.assign(dropLine.style, { display: 'block', left: rr.left + childIndent + 'px', width: rr.width - childIndent + 'px', top: ry - 1 + 'px' });
}
function dropTo(items, t) {
  if(t.parent.photos)return;
  items.forEach(rm);
  clearSpacerKind(t.parent);
  if (t.open) writeViewOpen(t.parent, true);
  const k = t.parent.children, i = t.before ? k.indexOf(t.before) : k.length;
  k.splice(i < 0 ? k.length : i, 0, ...items);
  render(null, undefined, {anchorId:(t.before ?? t.parent).id});
}
listen(treeEl, 'dragover', e => { if (!dragSet) return; aimDrop(e); if (dropT) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
listen(treeEl, 'dragleave', e => { if (!treeEl.contains(e.relatedTarget)) clearDrop(); });
listen(treeEl, 'drop', e => { if (!dragSet) return; e.preventDefault(); const t = dropT, items = dragSet; dragSet = null; clearDrop(); if (t) dropTo(items, t); });
function delItems(items, {focusPrevious = true} = {}) {
  if (!focusPrevious) blurOutlineText();
  const focusRemoved = zoom !== root && items.some(node => isWithin(zoom, node.id));
  const restoreFocus = focusPrevious && !focusRemoved;
  const deletedIndex = restoreFocus ? vis().indexOf(items[0]) : -1;
  if (focusRemoved) depthController?.invalidate();
  items.forEach(rm); sel.clear(); render();
  if (!restoreFocus) return;
  const visible = vis();
  const previous = visible[Math.max(0, Math.min(deletedIndex - 1, visible.length - 1))];
  if (previous) revealFocusedField(focusNode(previous.id, undefined, true), true);
}
// Bullet menu. Wording is a requirement: Expand All / Collapse All act on this bullet's subtree, Export Visible, Export, Delete.
const menu = container.querySelector('#ol-menu'),numericBindings=[];
const sizeInput=container.querySelector('#ol-map-size'),sizeScope=container.querySelector('#ol-size-subtree');
const childRowToggle=menu.querySelector('.child-row-toggle');
let sizeInclude=false,sizeSession=null;
function promotePresentation(n){if(n===phNode){openPlaceholderOwner(n);phNode=phOwner=null;}}
function syncPresentationMenu(){
  if(!menuNode)return;const value=menuNode.mapSize??1;sizeField.refresh(value);
  const leafOnly = menuNode.kind==='spacer' || !!menuNode.photos;
  sizeScope.parentElement.hidden=leafOnly;
  if(leafOnly){sizeInclude=false;sizeScope.checked=false;}
  childRowToggle.hidden=leafOnly||menuNode===phNode;
  childRowToggle.setAttribute('aria-pressed',String(menuNode.childrenInRow===true));
  container.querySelector('#ol-size-down').disabled=value<=MIN_MAP_SIZE;container.querySelector('#ol-size-up').disabled=value>=MAX_MAP_SIZE;
  menu.querySelector('[data-a="description"]').hidden=!!menuNode.photos||menuNode.kind==='spacer'||splitNodeText(menuNode.text,menuNode.titleLineCount).hasDescription;
  menu.querySelector('[data-a="removeSpacer"]').hidden=menuNode.kind!=='spacer';
  menu.querySelector('[data-a="spacer"]').textContent=canMarkSpacer(menuNode)?'Mark as Spacer':'Insert Spacer';
}
// History replaces node objects. Rebind only menu state; never replay a stale numeric draft.
function reconcilePresentationMenu(){
  if(!menuNode)return;
  numericBindings.forEach(binding=>binding.finish());
  const restored=find(root,menuNode.id);
  menuNode=restored&&par.has(restored)?restored:null;
  menuT=menuT.map(node=>find(root,node.id)).filter(node=>node&&par.has(node));
  sizeField.reset();
  if(!menuNode){menuT=[];menu.classList.remove('show');return;}
  syncPresentationMenu();syncMenuActions();
}
function captureSizeBaseline(n,include){
  const entries=[],stack=[n];while(stack.length){const node=stack.pop();entries.push({node,parent:par.get(node),value:node.mapSize??1});if(include){const children=realChildren(node);for(let i=children.length-1;i>=0;i--)stack.push(children[i]);}}return entries;
}
function beginPresentationCommand(){
  endAdjustment();
  if(historyHost&&!historyCallback('beforeCommand','presentation'))return false;
  record();
  return true;
}
function editorForNode(node) {
  return node === zoom ? headBinding : els.get(node)?.querySelector('.tw')?._nodeEditor;
}
function refreshPresentationEditors(node){
  updateEditorBadge(editorForNode(node),node);
}
function presentationCommand(action,n=menuNode,value,reset=false){
  if(!n||n===root||!par.has(n)||historyComposing||sizeField.composing||destroyed)return false;
  if(action==='size'){
    if(!Number.isFinite(value))return false;value=normalizeMapSize(value);
    const session=sizeSession;
    if(session&&(document.hidden||!document.hasFocus()||adjustment?.token!==session.token||session.node!==n||menuNode!==n||!menu.classList.contains('show')))return false;
    const entries=session?session.entries:captureSizeBaseline(n,sizeInclude),p0=entries[0].value;
    const clearSubtree=reset&&sizeInclude&&p0===1;
    if(!session&&!clearSubtree&&value===(n.mapSize??1))return false;
    const factor=value/p0,changes=[];
    for(const entry of entries){
      const {node,parent}=entry;if(!parent||par.get(node)!==parent||mapSizeUnits(entry.value)===null)return false;
      const next=clearSubtree?1:node===n?value:normalizeMapSize(entry.value*factor);
      if(next!==(node.mapSize??1))changes.push({node,value:next});
    }
    if(!changes.length)return false;
    if(!session&&!beginPresentationCommand())return false;
    if(session)adjustment.writing=true;
    for(const change of changes){
      const node=change.node;promotePresentation(node);if(change.value===1)delete node.mapSize;else node.mapSize=change.value;
      refreshPresentationEditors(node);
    }
    save();if(session&&adjustment?.token===session.token)adjustment.writing=false;syncPresentationMenu();return true;
  }
  if(action==='childrenInRow'){
    if(n.kind==='spacer'||n===phNode||!beginPresentationCommand())return false;
    if(n.childrenInRow)delete n.childrenInRow;else n.childrenInRow=true;
    refreshPresentationEditors(n);
    save();syncPresentationMenu();return true;
  }
  if(action!=='spacer'&&action!=='removeSpacer')return false;
  if(action==='removeSpacer'&&n.kind!=='spacer')return false;
  if(!beginPresentationCommand())return false;
  if(action==='removeSpacer'){
    clearSpacerKind(n);
    if(searching())sKeep.add(n);
  }else{
    let spacer=n;
    if(canMarkSpacer(n)){promotePresentation(n);n.text='';}
    else{spacer=mk();insertAfterNodeEnd(n,spacer);}
    delete spacer.childrenInRow;
    spacer.kind='spacer';if(searching())sKeep.add(spacer);
  }
  menu.classList.remove('show');render(undefined, undefined, {anchorId:n.id});return true;
}
function commitSize(){return !historyComposing&&sizeField.settle();}
function sizeActionBoundary(e){
  const control=e.target.closest('#ol-size-down,#ol-size-up,#ol-size-reset,#ol-size-subtree,.size-scope,#ol-map-size');if(!control)return;
  if(sizeField.composing||historyComposing||e.isComposing||e.keyCode===229){if(!sizeInput.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();}return;}
  numericBindings.forEach(b=>b.finish());
  if(e.target!==sizeInput)commitSize();
}
listen(menu,'pointerdown',sizeActionBoundary,true);
listen(menu,'keydown',e=>{if(!e.repeat)sizeActionBoundary(e);},true);
listen(menu,'click',e=>{if((sizeField.composing||historyComposing)&&e.target.closest('#ol-size-down,#ol-size-up,#ol-size-reset,.size-scope')){e.preventDefault();e.stopImmediatePropagation();}},true);
listen(childRowToggle,'click',()=>{
  if(childRowToggle.hidden||!menu.classList.contains('show'))return;
  numericBindings.forEach(binding=>binding.finish());
  if(commitSize())presentationCommand('childrenInRow');
});
listen(sizeScope,'change',()=>{if(sizeField.composing||historyComposing){sizeScope.checked=sizeInclude;return;}numericBindings.forEach(b=>b.finish());commitSize();sizeInclude=sizeScope.checked;});
listen(container.querySelector('#ol-size-reset'),'click',()=>{numericBindings.forEach(b=>b.finish());if(commitSize())presentationCommand('size',menuNode,1,true);});
for(const [id,direction]of [['ol-size-down',-1],['ol-size-up',1]])numericBindings.push(createNumericStepper({button:container.querySelector('#'+id),direction,scale:true,valueAt:mapSizeAt,read:()=>menuNode?.mapSize??1,bounds:()=>({min:MIN_MAP_SIZE,max:MAX_MAP_SIZE}),allowed:()=>(!sizeSession||adjustment?.token===sizeSession.token)&&!sizeField.composing&&!historyComposing&&menu.classList.contains('show')&&!!menuNode&&par.has(menuNode),step:()=>{if(commitSize())presentationCommand('size',menuNode,normalizeMapSize((menuNode.mapSize??1)*Math.pow(1.1,direction)));},write:value=>presentationCommand('size',menuNode,value),start:()=>{if(!commitSize())return false;const token=beginAdjustment('outline');if(!token)return false;sizeSession={node:menuNode,include:sizeInclude,entries:captureSizeBaseline(menuNode,sizeInclude),token};return true;},finish:()=>{const session=sizeSession;sizeSession=null;if(session)endAdjustment(session.token);}}));
let pinnedFocusId = null, menuNode = null;
const sizeField=numericSelection.register(sizeInput,{
  precision:2,read:()=>menuNode?.mapSize??1,format:displayMapSize,
  bounds:()=>({min:MIN_MAP_SIZE,max:MAX_MAP_SIZE}),write:value=>presentationCommand('size',menuNode,value),
  onCompose:()=>numericBindings.forEach(binding=>binding.finish()),
});
function setPinnedFocus(nodeId) {
  if (nodeId !== null && !Number.isInteger(nodeId)) throw new TypeError('Expected a pinned node ID or null');
  if (destroyed) return;
  pinnedFocusId = nodeId;
  menu.querySelector('[data-a="pinFocus"]').textContent = menuNode?.id === pinnedFocusId ? 'Unpin Focus' : 'Pin Focus';
}
function syncMenuActions(){
  const n=menuNode;
  const photoAction = menu.querySelector('[data-a="addPhoto"]'), placement = photoPlacement(n);
  photoAction.hidden = !placement;
  photoAction.textContent = placement === 'below' ? 'Insert Photo' : 'Add Photo';
  const importHidden = !canImportInto(n);
  menu.querySelector('[data-a="importFile"]').hidden = importHidden;
  menu.querySelector('[data-group="import"]').hidden = importHidden;
  const placeholder = !subscribers.get('pinFocus').size || n === phNode && phOwner && phOwner.children.length === 1 && !n.text && !n.children.length;
  menu.querySelector('[data-a="pinFocus"]').hidden = placeholder;
  menu.querySelector('[data-group="pin"]').hidden = placeholder; setPinnedFocus(pinnedFocusId);
  // Owner V1.1 override of the historical full-menu requirement: use actual subtree depth,
  // not the currently expanded/search-filtered rows. Selected roots share one menu policy.
  const hasChildren = menuT.some(n => realChildren(n).length), hasGrandchildren = menuT.some(n => realChildren(n).some(c => realChildren(c).length));
  menu.querySelectorAll('[data-a="expand"],[data-a="collapse"]').forEach(b => { b.hidden = !hasGrandchildren; });
  menu.querySelectorAll('[data-scope="visible"]').forEach(button => { button.hidden = !hasChildren; });
  menu.querySelector('[data-group="branches"]').hidden = !hasGrandchildren;
}
function openMenu(n, b, sizeOnly = false) {
  menu.classList.toggle('size-only', sizeOnly);
  numericBindings.forEach(b=>b.finish());commitSize();menuNode = n;sizeField.reset();sizeInclude=false;sizeScope.checked=false;syncPresentationMenu(); menuT = n !== zoom && sel.has(n) ? roots() : [n]; const r = b.getBoundingClientRect();
  syncMenuActions();
  depthController?.close();topMenu.classList.remove('show'); positionMenu(menu, r);
  if (sizeOnly) sizeInput.focus({preventScroll:true});
}
const setOpen = (n, o) => { const children = realChildren(n); if (children.length) setNodeOpen(n, o); children.forEach(c => setOpen(c, o)); };
menu.onclick = e => {
  const a = e.target.dataset.a; if (!a || e.target.hidden) return;numericBindings.forEach(b=>b.finish());if(!commitSize())return;if(a==='spacer'||a==='removeSpacer'){presentationCommand(a);return;} menu.classList.remove('show');
  if(a==='description'){
    const binding=editorForNode(menuNode);
    if(binding&&!e.target.hidden&&!binding.description&&!historyComposing){
      const end=binding.title.value.length;
      insertDescription(binding,end,end);
    }
    return;
  }
  if (a === 'pinFocus') { if (menuNode && !menu.querySelector('[data-a="pinFocus"]').hidden) emit('pinFocus', {nodeId:menuNode.id,action:menuNode.id===pinnedFocusId?'unpin':'pin'}); }
  else if (a === 'addPhoto') choosePhoto(menuNode);
  else if (a === 'delete') delItems(menuT, {focusPrevious:false});
  else if (a === 'importFile') chooseOutlineFile(menuNode);
  else if (a === 'copy' || a === 'download') outputOutlineText(e.target, menuT);
  else if (a === 'expand' || a === 'collapse') { depthController?.invalidate(); menuT.forEach(n => setOpen(n, a === 'expand')); render(undefined, undefined, {anchorId:menuNode.id}); }
};
listen(document, 'click', e => { if (menu.classList.contains('show') && !menu.contains(e.target)) {commitSize();menu.classList.remove('show');} if (topMenu.classList.contains('show') && !topMenu.contains(e.target)) {depthController?.close();topMenu.classList.remove('show');} });

function keys(e, n, t) {
  // Keys pressed while an IME is composing belong to the IME (they confirm the text); line breaks from soft keyboards arrive via beforeinput.
  if (e.isComposing || e.keyCode === 229) return;
  const pos = t.selectionStart, end = t.selectionEnd, p = par.get(n);
  const mod = e.ctrlKey || e.metaKey;
  const isEnter = e.key === 'Enter' || e.keyCode === 13, isTab = e.key === 'Tab' || e.keyCode === 9;
  if (e.key === 'Escape') { e.preventDefault(); anchor = cursor = n; setSel(new Set([n])); return; }
  if (e.shiftKey && !mod && !e.altKey && ((e.key === 'ArrowUp' && pos === 0) || (e.key === 'ArrowDown' && end === t.value.length))) { e.preventDefault(); anchor = cursor = n; setSel(new Set([n])); return; }
  if (isTab || (e.altKey && !e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft'))) {
    e.preventDefault(); anchor = n;
    tab(e.shiftKey || e.key === 'ArrowLeft');
    return;
  }
  if (isEnter && !e.shiftKey && !e.altKey && !mod) {
    e.preventDefault(); enter(n, t); return;
  }
  if (e.key === 'Backspace' && pos === 0 && end === 0) {
    if (n.photos) { e.preventDefault(); return; }
    const list = vis(), i = list.indexOf(n), prev = list[i - 1];
    if (prev?.photos && !n.children.length) { e.preventDefault(); return; }
    if (!n.children.length && prev) {
      e.preventDefault();
      const at = prev.text.length, left=splitNodeText(prev.text,prev.titleLineCount), right=splitNodeText(n.text,n.titleLineCount);
      // Preserve canonical concatenation and its first description boundary.
      setNodeText(prev,left.hasDescription?{...left,description:left.description+n.text}:{title:left.title+right.title,description:right.description,hasDescription:right.hasDescription});if(prev.text!=='')clearSpacerKind(prev); if (searching()) sKeep.add(prev); rm(n); render(prev.id, at);
    } else if (!n.children.length && !prev && p.children.length > 1) {
      e.preventDefault(); const nx = p.children[1]; rm(n); render(nx.id, 0);
    }
    return;
  }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const up = e.key === 'ArrowUp';
    if (e.altKey && e.shiftKey) {
      e.preventDefault(); const i = p.children.indexOf(n), j = i + (up ? -1 : 1);
      if (j >= 0 && j < p.children.length) { [p.children[i], p.children[j]] = [p.children[j], p.children[i]]; render(n.id, pos); }
      return;
    }
    if (mod) {
      e.preventDefault();
      if (n.children.length) { setNodeOpen(n, !up); render(n.id, pos, {anchorId:n.id}); }
      return;
    }
    const first = pos === 0 || t.value.lastIndexOf('\n', pos - 1) === -1, last = t.value.indexOf('\n', end) === -1;
    if ((up && first) || (!up && last)) {
      const list = vis(), nx = list[list.indexOf(n) + (up ? -1 : 1)];
      if (nx) { e.preventDefault(); focusNode(nx.id, Math.min(pos, nx.text.length)); }
    }
  }
}

function parseHtml(h) {
  const d = new DOMParser().parseFromString(h, 'text/html');
  const walk = l => [...l.children].filter(x => x.tagName === 'LI').map(li => {
    const n = mk(), c = li.cloneNode(true); c.querySelectorAll('ul,ol').forEach(x => x.remove());
    n.text = c.textContent.replace(/\s+/g, ' ').trim();
    [...li.querySelectorAll('ul,ol')].filter(u => u.closest('li') === li).forEach(u => n.children.push(...walk(u)));
    return n;
  });
  return [...d.querySelectorAll('ul,ol')].filter(u => !u.parentElement.closest('ul,ol')).flatMap(walk);
}
function placeItems(items, target, replaceEmpty) {
  const parent = target ? par.get(target) : root;
  const index = target ? parent.children.indexOf(target) + 1 : parent.children.length;
  const peers = replaceEmpty ? items.slice(1) : items;
  if (target) openPlaceholderOwner(target);
  if (replaceEmpty) {
    const first = items[0];
    copyPresentation(first, target);
    target.text = first.text;
    target.children = first.children;
    if (target === phNode) promotePresentation(target);
  }
  if (peers.length) {
    const before = parent.children.slice(0, index);
    parent.children = before.concat(peers, parent.children.slice(index));
  }
  return peers.at(-1) ?? target;
}
function insertItems(items, target, replaceEmpty) {
  const last = placeItems(items, target, replaceEmpty && !target.photos && !target.text.trim() && !target.children.length);
  if (searching()) { sKeep.add(target); items.forEach(i => sKeep.add(i)); }
  sel.clear(); render(last.photos ? null : last.id, undefined, {anchorId:target.id});
}
// Photo nodes are childless and contain only photos. On load, ZIP import and rich paste,
// keep legacy text and children on their original branch and move the photos to a new first child.
function separatePhotoText(node) {
  for (const child of node.children) separatePhotoText(child);
  if (!node.photos || (!node.text && !node.children.length)) return;
  const child = mk();
  child.photos = node.photos;
  if (node.mapSize !== undefined) child.mapSize = node.mapSize;
  delete node.photos;
  node.children.unshift(child);
}
function instantiateOutlineItem(item) {
  const node = copyPresentation(item, mk(item.text));
  if (typeof item.open === "boolean") node.open = item.open;
  node.children = item.children.map(instantiateOutlineItem);
  return node;
}
async function pastePhotoOutline(base64, target, replaceEmpty) {
  const initial = snap();
  const current = () => !destroyed && !historyComposing && par.has(target) && snap() === initial;
  try {
    if (base64.length > 4 * Math.ceil(photoZipLimit / 3)) throw new Error();
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    const project = await readPhotoOutline(bytes.buffer, () => !destroyed);
    if (!project || !current()) throw new Error();
    await photoService.write(project.assets);
    if (!current()) throw new Error();
    const items = project.items.map(instantiateOutlineItem);
    items.forEach(separatePhotoText);
    record();
    insertItems(items, target, replaceEmpty);
  } catch (_) { if (!destroyed) toast('Could not paste the photo outline. Try copying it again.'); }
}

listen(document, 'paste', e => {
  if (!ownsEvent(e)) return;
  if(e.target?.matches('.photo-caret')){e.preventDefault();return;}
  if (!e.clipboardData || e.target?.id === 'ol-qIn') return;
  const text = e.clipboardData.getData('text/plain'), html = e.clipboardData.getData('text/html');
  if (historyComposing) return;
  const photoPayload = html.match(/href=["'][^"'<>]*?#moa-photo-zip-([A-Za-z0-9+/=]+)["']/i);
  const a = e.target?.matches('textarea[data-id]') ? e.target : null;
  const selected = sel.size ? roots().at(-1) : null;
  const target = (a && find(root, +a.dataset.id)) || selected || cur();
  if (photoPayload) {
    if (e.target.closest('#ol-menu,#ol-topMenu,input')) return;
    e.preventDefault();
    if (e.target.closest('#ol-head') || !target) toast('Paste the photo outline into an outline row');
    else pastePhotoOutline(photoPayload[1], target, !!a);
    return;
  }
  const decoded = decodeDescriptionOutline(text);
  const legacyDocument=/^ *\[moa v=[12]\](?:\r?\n|$)/.test(text);
  if(decoded.attempted&&!decoded.recognized&&!legacyDocument){e.preventDefault();toast('Invalid or unsupported outline interchange document');return;}
  if(e.target?.closest('#ol-head')){if(decoded.extended&&!legacyDocument){e.preventDefault();toast('Paste an outline document into an outline row');}return;}
  let items = decoded.recognized ? decoded.items.map(instantiateOutlineItem) : !decoded.attempted&&/<li[\s>]/i.test(html) ? parseHtml(html) : [];
  if (!items.length) items = parseOutline(text);
  if (!items.length) return;
  // The event target is the focused bullet even inside sandboxed frames where document.activeElement can be stale.
  if (!decoded.recognized && a && items.length === 1 && !items[0].children.length) return; // single line: normal paste
  if (!target) return;
  e.preventDefault();
  insertItems(items, target, !!a);
}, true);

const outlineFileInput = container.querySelector('#ol-import-file');
let pendingFileTarget, fileRequest = 0;
function canImportInto(node) {
  return !!node && par.has(node) && node.kind !== 'spacer' && !node.photos && !node.text.includes('\n') &&
    !node.text.trim() && !realChildren(node).length;
}
function chooseOutlineFile(target) {
  if (historyComposing || (target && !canImportInto(target))) return;
  fileRequest++;
  pendingFileTarget = target;
  outlineFileInput.value = '';
  try { outlineFileInput.click(); }
  catch (_) { pendingFileTarget = undefined; toast('Could not open the file picker'); }
}
listen(outlineFileInput, 'cancel', () => { pendingFileTarget = undefined; });
listen(outlineFileInput, 'change', async () => {
  const file = outlineFileInput.files[0], target = pendingFileTarget, request = fileRequest;
  pendingFileTarget = undefined;
  outlineFileInput.value = '';
  if (!file || target === undefined) return;
  const zip = /\.zip$/i.test(file.name);
  if (!zip && !/\.txt$/i.test(file.name)) { toast('Choose an outline text or project file'); return; }
  if (zip && file.size > photoZipLimit) { toast('This project file is too large'); return; }
  const currentRequest = () => !destroyed && request === fileRequest;
  let items, assets;
  try {
    const bytes = await file.arrayBuffer();
    if (!currentRequest()) return;
    if (zip) {
      const project = await readPhotoOutline(bytes, currentRequest);
      if (!project || !currentRequest()) return;
      items = project.items.map(instantiateOutlineItem); items.forEach(separatePhotoText); assets = project.assets;
    } else {
      const source = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
      const decoded = decodeDescriptionOutline(source, true);
      if (decoded.attempted && !decoded.recognized) { toast('Invalid or unsupported outline interchange document'); return; }
      items = decoded.recognized ? decoded.items.map(instantiateOutlineItem) : parseOutline(source);
    }
  } catch (_) {
    if (currentRequest()) toast(zip ? 'Invalid or unsupported project ZIP' : 'Could not read the file as UTF-8 text');
    return;
  }
  if (!items.length) { toast('This text file is empty'); return; }
  if (historyComposing) { toast('Finish typing and try importing again'); return; }
  if (target && !canImportInto(target)) { toast('The import target is no longer empty or available'); return; }
  if (assets) {
    try { await photoService.write(assets); }
    catch (_) { if (currentRequest()) toast('Could not store the photos. The outline was not changed.'); return; }
    if (!currentRequest()) return;
    if (historyComposing || target && !canImportInto(target)) { toast('The import target is no longer available'); return; }
  }
  record();
  discardUnusedPlaceholder(target ?? root);
  placeItems(items, target, !!target);
  if (zip && target) writeViewOpen(target, items[0].open);
  if (target && searching()) {
    sKeep.add(target);
    items.slice(1).forEach(node => sKeep.add(node));
  }
  depthController?.invalidate();
  render();
  toast(target ? 'Imported here' : 'Imported to Home', baseToastDuration);
});

// REQUIREMENT: export text is always 2-space indent and a "- " prefix. Not configurable. visible=true skips children of collapsed bullets.
// REQUIREMENT (top menu Export All / Export Visible, list = null): exports only the current zoom, but when zoomed into a bullet that bullet itself is the
// depth 0 line and its children are indented under it (Node D, then E F G under it). At Home there is no header line, only the top-level bullets.
// Plain text export: 2-space indent, "- " prefix. With visible = true, children of collapsed bullets are left out.
function toText(list, visible) {
  return serializeOutline(list, visible).text;
}
function photoLabel(count, {titleCase = false} = {}) {
  return count === 1 ? 'Photo' : count + (titleCase ? ' Photos' : ' photos');
}
function serializeOutline(list, visible, photoMarkers = false) {
  const entries=[];
  (function w(l,d){for(const n of l){if(n===phNode&&!n.text)continue;entries.push({n,d});w(visible?shownKids(n):n.children,d+1);}})(list||(zoom!==root?[zoom]:visible?shownKids(zoom):zoom.children),0);
  const extended = entries.some(({n}) => n.childrenInRow || n.titleLineCount > 1 || n.kind === 'spacer' || (n.mapSize ?? 1) !== 1);
  const out=entries.map(({n,d})=>{
    const photoCount = photoMarkers ? n.photos?.length : 0;
    const photoTitle = photoCount ? '[' + photoLabel(photoCount) + ']' : undefined;
    const encoded=encodeNodeText(n,d,extended,photoTitle).split('\n');
    if(n.kind==='spacer'||(n.mapSize??1)!==1||n.childrenInRow){
      encoded.splice(1,0,'  '.repeat(d+1)+'[map '+(n.kind==='spacer'?'spacer ':'')+'size='+(n.mapSize??1)+(n.childrenInRow?' children=row':'')+']');
    }
    return encoded.join('\n');});
  const body = out.join('\n');
  return {text: extended ? '[moa]\n'+body+'\n[/moa]' : body, first: entries[0]?.n, entries};
}
const toastEl = container.querySelector('#ol-toast');
if (opts.toastHost instanceof Element) opts.toastHost.append(toastEl);
const baseToastDuration = 1400;
const maxWarningDuration = 3500;
const shortestWarning = 'Copy failed';
const photoCopyWarning = 'Copied text. Use Export to include photos.';
const photoAddWarning = 'Could not add photo. Check the format, size, and browser storage.';
let toastT;
function warningDuration(message) {
  // The general photo-add warning is the longest built-in timed warning.
  const range = photoAddWarning.length - shortestWarning.length;
  const fraction = Math.min(1, Math.max(0, (message.length - shortestWarning.length) / range));
  return Math.round(baseToastDuration + fraction * (maxWarningDuration - baseToastDuration));
}
function toast(message, duration = warningDuration(message)) {
  if (destroyed) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), duration);
}
async function copyText(s) {
  if (destroyed) return false;
  try { await navigator.clipboard.writeText(s); return !destroyed; } catch (e) {}
  if (destroyed) return false;
  const t = document.createElement('textarea'); t.value = s; t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  container.appendChild(t); t.select(); let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); return ok;
}
// HTML carries the existing portable project ZIP. Plain-text destinations use the outline text.
async function photoClipboardHtml(entries, text) {
  const zip = await exportPhotoOutline(entries);
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(zip);
  });
  const base64 = data.slice(data.indexOf(',') + 1);
  return new Blob(['<pre><a href="#moa-photo-zip-', base64, '">', esc(text), '</a></pre>'], {type:'text/html'});
}

async function copyOutline(text, entries, confirm) {
  const hasPhotos = entries.some(({n}) => n.photos);
  if (hasPhotos && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      const html = photoClipboardHtml(entries, text);
      html.catch(() => {}); // A browser may reject the write before requesting its data.
      await navigator.clipboard.write([new ClipboardItem({
        'text/plain':new Blob([text], {type:'text/plain'}), 'text/html':html
      })]);
      if (confirm && !destroyed) toast('Copied to clipboard', baseToastDuration);
      return !destroyed;
    } catch (_) { /* Fall back to the existing plain-text copy path. */ }
  }
  const ok = await copyText(text);
  if (!destroyed) {
    if (!ok) toast(shortestWarning);
    else if (hasPhotos) toast(photoCopyWarning);
    else if (confirm) toast('Copied to clipboard', baseToastDuration);
  }
  return ok;
}

// Export = copy immediately and show a toast. DO NOT bring back a popup or modal.
const textDownloadUrls = new Set();
function outlineFileName(first) {
  const title = splitNodeText(first.text, first.titleLineCount).title;
  const clean = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
  const name = [...clean].slice(0, 80).join('').replace(/[. ]+$/, '') || 'Outline';
  const reserved = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name);
  return (reserved ? '_' : '') + name;
}
async function outputOutlineText(button, list) {
  const {a, scope} = button.dataset;
  try {
    const {text, first, entries} = serializeOutline(scope === 'all' ? root.children : list, scope === 'visible', a === 'copy');
    const hasPhotos = entries.some(({n}) => n.photos);
    if (!text) { toast(a === 'copy' ? 'Nothing to copy' : 'Nothing to export'); return; }
    if (a === 'copy') {
      await copyOutline(text, entries, true);
      return;
    }

    const link = document.createElement('a');
    link.hidden = true;
    link.download = outlineFileName(first) + (hasPhotos ? '.zip' : '.txt');
    const blob = hasPhotos ? await exportPhotoOutline(entries) : new Blob([text], {type: 'text/plain;charset=utf-8'});
    if (destroyed) return;
    const url = URL.createObjectURL(blob);
    textDownloadUrls.add(url);
    try {
      link.href = url;
      container.appendChild(link);
      link.click();
      toast('Download started', baseToastDuration);
    } finally {
      link.remove();
      setTimeout(() => { URL.revokeObjectURL(url); textDownloadUrls.delete(url); }, 1500);
    }
  } catch (error) { toast(a === 'copy' ? shortestWarning : error.message || 'Could not export the file'); }
}
// Escape closes whichever menu is open (top menu or bullet menu).
listen(document, 'keydown', e => { if (!ownsEvent(e)) return; if (e.key === 'Escape') { topMenu.classList.remove('show'); menu.classList.remove('show'); } });
function setAll(open) {
  depthController?.invalidate();
  if (zoom !== root) setOpen(zoom, open);
  else realChildren(zoom).forEach(node => setOpen(node, open));
  render();
}
// Measure actual menu height; long menus remain reachable in a short visual viewport.
function positionMenu(target, anchor, top = false) {
  const v = window.visualViewport, left = v ? v.offsetLeft : 0, y = v ? v.offsetTop : 0;
  const width = v ? v.width : innerWidth, height = v ? v.height : innerHeight, margin = 8;
  target.style.maxHeight = Math.max(1, height - margin * 2) + 'px';
  target.style.maxWidth = Math.max(1, width - margin * 2) + 'px';
  target.style.right = 'auto'; target.classList.add('show');
  const r = target.getBoundingClientRect();
  target.style.left = Math.max(left + margin, Math.min(top ? anchor.right - r.width : anchor.left, left + width - r.width - margin)) + 'px';
  target.style.top = Math.max(y + margin, Math.min(anchor.bottom + (top ? 4 : 0), y + height - r.height - margin)) + 'px';
}
const topMenu = container.querySelector('#ol-topMenu'), moreBtn = container.querySelector('#ol-moreBtn');
const textStyleButtons = topMenu.querySelectorAll('.text-style button');
function updateTextStyleMenu() {
  textStyleButtons.forEach(button => {
    button.setAttribute('aria-pressed', String((button.dataset.style === 'plain') === plainText));
  });
}
updateTextStyleMenu();
// Owner-approved immediate depth actions; target/draft state never enters history.
// Idle depth is derived; only deliberate commands normalize expansion and publish intent.
function createDepthController(){
  const block=topMenu.querySelector('.depth-controls'),input=block.querySelector('#ol-depth'),bindings=[];
  let target=1,writing=false,held=false,disposed=false,scopeId=null,session=null,epoch=0;
  const field=numericSelection.register(input,{
    read:()=>target,bounds:()=>({min:1,max:Math.max(1,analyze(target).max)}),explicit:true,deferPointer:true,
    write:value=>{target=value;command('tap','apply');refresh();},onCompose:()=>finishGesture(),
    onDraft:()=>{if(!input.disabled)for(const button of block.querySelectorAll('button'))button.disabled=false;},
  });
  const available=()=>!disposed&&!destroyed&&visibleHost()&&!searching()&&!historyComposing&&!field.composing&&(zoom===root||par.has(zoom));
  // Reachability determines visible match; every real descendant contributes to normalization.
  function analyze(level){
    const scopeOpen = zoom === root || viewOpen(zoom);
    let max=0,maxVisible=0,endpointSum=0,endpointCount=0,deepestOpen=0,shallowestClosed=Infinity;const changes=[],stack=zoom===root||par.has(zoom)?[{node:zoom,depth:0,reachable:true}]:[];
    if (stack.length && !scopeOpen && realChildren(zoom).length) changes.push({node:zoom,open:true});
    while(stack.length){
      const {node,depth,reachable}=stack.pop(),children=realChildren(node),expanded=viewOpen(node);
      if(depth){
        max=Math.max(max,depth);
        if(reachable){maxVisible=Math.max(maxVisible,depth);if(!children.length||!expanded){endpointSum+=depth;endpointCount++;}}
        if(children.length){
          const open=depth<level;
          if(expanded!==open)changes.push({node,open});
          if(reachable){if(expanded)deepestOpen=Math.max(deepestOpen,depth);else shallowestClosed=Math.min(shallowestClosed,depth); }
        }
      }
      const nextReachable=reachable&&(node===root||expanded);
      for(let i=children.length-1;i>=0;i--)stack.push({node:children[i],depth:depth+1,reachable:nextReachable});
    }
    const exact=scopeOpen&&max>0&&maxVisible>deepestOpen&&maxVisible<=shallowestClosed;
    const observed=exact?maxVisible:endpointCount?Math.max(1,Math.min(max,Math.floor(endpointSum/endpointCount+.5))):1;
    return{max,observed,changes};
  }
  // Only an active adjustment needs a structural baseline; idle edits never scan it.
  function structure(){
    const ids=[],stack=[root];
    while(stack.length){const node=stack.pop(),children=realChildren(node);ids.push(node.id,children.length);for(let i=children.length-1;i>=0;i--)stack.push(children[i]);}
    return ids.join(',');
  }
  function finishGesture(end=true){
    const previous=session;session=null;held=false;
    bindings.forEach(binding=>binding.finish());
    if(end&&previous&&adjustment?.token===previous.token)endAdjustment(previous.token);
  }
  function stop(){epoch++;finishGesture();field.reset();}
  function refresh(state){
    if(!root||disposed)return;
    if(scopeId!==zoom.id){stop();scopeId=zoom.id;state=null;}
    state=state||analyze(target);
    const active=field.dirty||field.composing||held||session||writing;
    if(!active&&!searching())target=state.observed;
    field.refresh();
    input.disabled=searching()||!state.max;
    block.querySelector('#ol-depth-down').disabled=input.disabled||(!field.dirty&&target<=1);
    block.querySelector('#ol-depth-up').disabled=input.disabled||(!field.dirty&&target>=state.max);
  }
  function reconcile(){
    if(disposed||!root)return;
    if(scopeId!==zoom.id){stop();scopeId=zoom.id;}
    if(session&&!writing&&session.baseline!==structure())stop();
    if(session||writing||topMenu.classList.contains('show'))refresh();
  }
  function close(cancel=false){
    if(!cancel&&!field.composing)field.settle();
    stop();refresh();
  }
  function invalidate(){close(!field.pointerPending);}
  // Preserve a text field that received focus from the click that submitted the depth.
  function redraw(){
    const active=ownedActiveElement();
    if(active?.matches('.photo-caret')){
      const node=find(root,+active.closest('.node').dataset.id),place=active._photoCaret.current();
      render();if(node)focusPhotoCaret(node,place);return;
    }
    if(!active?.matches('#ol-tree textarea[data-id]')){render();return;}
    const node=find(root,+active.dataset.id),range=node&&readEditorRange(node,active);
    render(node?.id,range?.start);
    const replacement=ownedActiveElement();
    if(range&&replacement?.matches('#ol-tree textarea[data-id]')){
      replacement.setSelectionRange(active.selectionStart,active.selectionEnd,active.selectionDirection);
    }
  }
  // Typed commits and stepper gestures share the existing outline adjustment transaction.
  function command(kind,source='adjust'){
    if(!available()||scopeId!==zoom.id||!topMenu.classList.contains('show'))return false;
    if(session&&(adjustment?.token!==session.token||session.scope!==zoom.id))return false;
    const level=target;
    let state=analyze(level);if(!state.max||level<1||level>state.max)return false;
    if(!state.changes.length){refresh(state);emit('expansionLevel',{level,source});return true;}
    if(!session){
      const context=epoch,scope=zoom.id,baseline=structure(),token=beginAdjustment('outline');
      if(!token){toast('Expansion depth could not be applied');refresh();return false;}
      if(!available()||context!==epoch||scope!==zoom.id||!topMenu.classList.contains('show')||adjustment?.token!==token||baseline!==structure()){endAdjustment(token);refresh();return false;}
      session={token,scope,baseline};
      state=analyze(level); // Host settlement may replace the tree; resolve objects again.
      if(level>state.max){finishGesture();refresh();return false;}
      target=level;
    }
    const token=session.token;
    adjustment.writing=true;writing=true;
    try{
      for(const {node,open} of state.changes)writeViewOpen(node,open);
      redraw();
    }finally{writing=false;if(adjustment?.token===token)adjustment.writing=false;}
    if(kind==='tap')finishGesture();
    refresh();emit('expansionLevel',{level,source});return true;
  }
  function cancelInteraction(){if(session||held){finishGesture();refresh();}}
  listen(window,'blur',cancelInteraction);
  listen(document,'visibilitychange',()=>{if(document.hidden)cancelInteraction();});
  for(const [id,direction]of [['ol-depth-down',-1],['ol-depth-up',1]]){
    const button=block.querySelector('#'+id);
    bindings.push(createNumericStepper({button,direction,scale:false,read:()=>target,bounds:()=>({min:1,max:Math.max(1,analyze(target).max)}),
      allowed:()=>available()&&topMenu.classList.contains('show')&&(!session||session.token===adjustment?.token)&&scopeId===zoom.id,
      step:(sign=direction,count=1)=>{
        if(!field.settle())return;
        target=Math.max(1,Math.min(analyze(target).max,target+sign*count));
        command(held?'gesture':'tap');refresh();
      },
      start:()=>{if(!field.settle())return false;held=true;return true;},
      finish:()=>{finishGesture();refresh();}
    }));
  }
  listen(document,'keydown',e=>{
    if(e.key==='Escape'&&topMenu.classList.contains('show')&&container.contains(e.target)&&!e.isComposing&&e.keyCode!==229&&!field.composing){
      close(true);topMenu.classList.remove('show');e.preventDefault();e.stopImmediatePropagation();input.blur();
    }
  },true);
  return{refresh,reconcile,invalidate,close,finishGesture:stop,endTransaction(){if(session){epoch++;finishGesture(false);field.reset();}},
    dispose(){stop();disposed=true;bindings.forEach(binding=>binding.dispose());}
  };
}
depthController=createDepthController();

moreBtn.onclick = e => {
  e.stopPropagation(); menu.classList.remove('show');
  if (topMenu.classList.contains('show')) {depthController.close();topMenu.classList.remove('show');}
  else {
    topMenu.querySelectorAll('[data-scope="focus"]').forEach(button => { button.hidden = zoom === root; });
    depthController.refresh();positionMenu(topMenu, moreBtn.getBoundingClientRect(), true);
  }
};
topMenu.onclick = e => {
  const a = e.target.dataset.a; if (!a || e.target.hidden) return; depthController.close();topMenu.classList.remove('show');
  if (a === 'clearAll') clearAll();
  else if (a === 'expandAll') setAll(true); else if (a === 'collapseAll') setAll(false);
  // Current owner override: Export Focus retains historical zoom scope; Export All uses Home.
  else if (a === 'copy' || a === 'download') outputOutlineText(e.target, null);
  else if (a === 'importFile') chooseOutlineFile(null);
  else if (a === 'textStyle') {
    const plain = e.target.dataset.style === 'plain';
    if (plain === plainText) return;
    plainText = plain;
    try { localStorage.setItem(TEXT_STYLE_KEY, plain ? 'plain' : 'hierarchy'); } catch (_) {}
    updateTextStyleMenu();
    keepSheetPosition(() => {
      container.querySelectorAll('.head.show[data-text-level], .row[data-text-level]').forEach(editor => {
        setLevel(editor, Number(editor.dataset.textLevel));
        fit(editor.querySelector('textarea[data-role="title"]'));
      });
    });
  }
};

// Clear the complete Home tree, with one history entry even after recent typing.
function clearAll() {
  depthController?.invalidate();record();
  root.children.length = 0; zoom = root; focusVisits.length = 0; phNode = phOwner = null;
  sel.clear(); anchor = cursor = null;
  saveBlocked = false;
  const wasSearching = searching(); endSearch();
  if (!wasSearching) render();
  toast('Cleared', baseToastDuration);
}

// Only these toolbar buttons (class kb) cancel mousedown so the caret stays in the bullet. That is original behaviour; do not extend it to other controls.
// Toolbar fallbacks for touch screens and hosts that swallow Enter / Tab.
// Their mousedown is cancelled so the caret stays in the bullet being edited.
container.querySelectorAll('.kb').forEach(b => listen(b, 'mousedown', e => e.preventDefault()));
container.querySelector('#ol-inBtn').onclick = () => tab(false);
container.querySelector('#ol-outBtn').onclick = () => tab(true);
// Latest owner exception: an iPad toolbar history tap must not reopen a dismissed keyboard.
// Only suppress the existing restore focus request when the zoom-compensated viewport is full height.
function toolbarHistory(direction) {
  const vv = window.visualViewport, previous = ipadToolbarHistoryNoFocus;
  ipadToolbarHistoryNoFocus = ipadSafari && !!vv && vv.height * vv.scale >= document.documentElement.clientHeight - 1;
  try { return historyHost ? runHistory(direction) : direction === 'undo' ? undo() : redo(); }
  finally { ipadToolbarHistoryNoFocus = previous; }
}
container.querySelector('#ol-undoBtn').onclick = () => toolbarHistory('undo');
container.querySelector('#ol-redoBtn').onclick = () => toolbarHistory('redo');

// Global shortcuts (capture phase). Ctrl+A selects all visible bullets (not text), Ctrl+Z / Ctrl+Y undo and redo, Ctrl+C / Ctrl+X copy or cut the selection.
// The search box and the zoom title keep their native keys. The shortcut letter is layout independent on purpose (Thai keyboard bug).
listen(document, 'keydown', e => {
  if (e.target && (e.target.id === 'ol-qIn' || e.target.closest('#ol-head textarea'))) return; // the search box and title keeps its own Ctrl+A / Ctrl+Z
  const mod = e.ctrlKey || e.metaKey, kk = e.key || '';
  // Shortcut letter: the typed Latin letter, else the physical key (so Ctrl+A / Z / Y / C / X still work on a Thai or other non-Latin layout).
  const k = /^[a-z]$/i.test(kk) ? kk.toLowerCase() : /^Key[A-Z]$/.test(e.code || '') ? e.code.slice(3).toLowerCase() : kk.toLowerCase();
  const historyShortcut = mod && (k === 'z' || k === 'y');
  if (historyHost && historyShortcut) {
    if (!ownsHistoryKey(e)) return;
    e.preventDefault(); runHistory(k === 'y' || e.shiftKey ? 'redo' : 'undo');
    const a = document.activeElement;
    historyShortcutOwned = a === document.body || a === document.documentElement || a === null;
    return;
  }
  if (!ownsEvent(e, historyShortcut)) return;
  if(e.key==='Enter'&&e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229&&!historyComposing){
    const native=historyEditable(e.target)||historyEditable(document.activeElement);if(!native&&sel.size===1){const n=[...sel][0];if(par.has(n)){e.preventDefault();presentationCommand('spacer',n);}}return;
  }
  if (historyShortcut) {
    e.preventDefault(); (k === 'y' || e.shiftKey) ? redo() : undo();
    // Restore can remove the focused row. Keep only history keys owned; never focus a replacement.
    const a = document.activeElement;
    historyShortcutOwned = a === document.body || a === document.documentElement || a === null;
    return;
  }
  if (e.target?.closest('#ol-head button')) return;
  if (mod && k === 'a') { e.preventDefault(); const l = vis(); anchor = l[0]; cursor = l[l.length - 1]; setSel(new Set(l)); return; }
  // With no selection this handler stops here. DO NOT add code that focuses a bullet when typing or Enter is pressed with nothing focused (rejected: it causes mistypes).
  if (!sel.size) return;
  if (e.key === 'Enter') { e.preventDefault(); const r = roots(), t = r[r.length - 1]; setSel(new Set()); if (t) focusNode(t.id); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); delItems(roots()); }
  else if (e.key === 'Escape') { setSel(new Set()); if (anchor) focusNode(anchor.id); }
  else if (mod && (k === 'c' || k === 'x')) { e.preventDefault(); const it = roots(), cutSnapshot = k === 'x' ? JSON.stringify(it) : null;
    // Cut removes the bullets ONLY after the copy succeeded (the copy is asynchronous and can be refused).
    const {text, entries} = serializeOutline(it, false, true);
    const hasPhotos = entries.some(({n}) => n.photos);
    if (k === 'x' && hasPhotos) { toast('Use Export to keep photos before moving this branch.'); return; }
    copyOutline(text, entries, false).then(ok => {
      if (destroyed || k !== 'x') return;
      if (!ok) { toast('Copy failed, nothing was cut'); return; }
      const live = it.filter(n => par.has(n));
      if (live.length !== it.length || JSON.stringify(it) !== cutSnapshot) { toast('Outline changed, nothing was cut'); return; }
      if (live.length) delItems(live);
    }); }
  else if (e.key === 'Tab') {
    e.preventDefault(); tab(e.shiftKey);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); const l = vis(), up = e.key === 'ArrowUp';
    if (e.shiftKey) {
      const ni = Math.max(0, Math.min(l.length - 1, l.indexOf(cursor) + (up ? -1 : 1))), a = l.indexOf(anchor);
      cursor = l[ni]; setSel(new Set(l.slice(Math.min(a, ni), Math.max(a, ni) + 1)));
    } else { const r = roots(), t = up ? r[0] : r[r.length - 1]; setSel(new Set()); focusNode((l[l.indexOf(t) + (up ? -1 : 1)] || t).id); }
  }
}, true);
// Presses on the scroll container itself (not on a bullet).
// REQUIREMENT: a press on the scrollbar must never change focus or scroll position, and clicking the empty side gutters must not make the outline jump.
// Only the empty area BELOW the last bullet puts the caret in the last bullet (click below to keep typing). Any other blank press just clears the selection.
// R12-4 owner override (2026-10-16): genuine sheet padding defocuses only
// after a completed neutral click/tap; real textarea trailing space stays editable.
const neutralSheet = container.querySelector('#ol-tree');
let neutralPress = null, neutralComposing = false;
const cancelNeutral = () => { neutralPress = null; };
function neutralTarget(e) {
  if (e.target !== neutralSheet) return false;
  const b = neutralSheet.getBoundingClientRect();
  const x = e.clientX - b.left - neutralSheet.clientLeft, y = e.clientY - b.top - neutralSheet.clientTop;
  return x >= 0 && y >= 0 && x < neutralSheet.clientWidth && y < neutralSheet.clientHeight;
}
listen(container, 'compositionstart', () => { neutralComposing = true; cancelNeutral(); }, true);
listen(container, 'compositionend', () => { neutralComposing = false; }, true);
listen(document, 'pointerdown', e => {
  cancelNeutral();
  if (!e.isPrimary || e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey ||
      neutralComposing || dragSet || multi || !visibleHost() || !neutralTarget(e)) return;
  neutralPress = { id: e.pointerId, x: e.clientX, y: e.clientY, active: document.activeElement, complete: false };
}, true);
listen(document, 'pointermove', e => {
  if (neutralPress && (e.pointerId !== neutralPress.id || Math.hypot(e.clientX - neutralPress.x, e.clientY - neutralPress.y) >= 4)) cancelNeutral();
}, { capture: true, passive: true });
listen(document, 'pointerup', e => {
  if (!neutralPress) return;
  if (e.pointerId !== neutralPress.id || e.button !== 0 || !neutralTarget(e) ||
      Math.hypot(e.clientX - neutralPress.x, e.clientY - neutralPress.y) >= 4) cancelNeutral();
  else neutralPress.complete = true;
}, true);
// Suppress only the browser's early neutral mouse focus change, never touch scrolling.
listen(neutralSheet, 'mousedown', e => { if (e.button === 0 && neutralTarget(e)) e.preventDefault(); });
listen(neutralSheet, 'click', e => {
  const press = neutralPress; cancelNeutral();
  if (!press?.complete || !neutralTarget(e) || neutralComposing || dragSet || multi ||
      !visibleHost() || document.activeElement !== press.active) return;
  setSel(new Set());
  const active = ownedActiveElement();
  if (active && typeof active.blur === 'function') active.blur();
});
listen(neutralSheet, 'scroll', cancelNeutral, { passive: true });
listen(neutralSheet, 'wheel', cancelNeutral, { passive: true });
// Touch releases implicit capture after pointerup and before its completed click.
listen(document, 'lostpointercapture', () => { if (!neutralPress?.complete) cancelNeutral(); }, true);
['pointercancel', 'dragstart', 'selectstart', 'keydown'].forEach(type => listen(document, type, cancelNeutral, true));
listen(window, 'blur', cancelNeutral);
// drag across bullets -> select whole bullets; drag inside one bullet -> normal text selection
let dragFrom = null, dragTA = null, multi = false, sx = 0, sy = 0;
const rowAt = y => {
  let best = null, bd = Infinity;
  for (const n of vis()) { const b = els.get(n).getBoundingClientRect(), d = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0; if (d < bd) { bd = d; best = n; } }
  return best;
};
listen(container, 'mousedown', e => {
  if (dragSet) { dragSet = null; clearDrop(); }
  dragFrom = null; multi = false; container.classList.remove('multi'); sx = e.clientX; sy = e.clientY;
  if (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey || !e.target.closest) return;
  if (e.target.tagName === 'TEXTAREA' && e.target.closest('#ol-tree')) { dragTA = e.target; dragFrom = find(root, +e.target.dataset.id); }
}, true);
listen(document, 'mousemove', e => {
  if (!dragFrom && !multi) return;
  if (!(e.buttons & 1)) { if (dragFrom || multi) endDrag(); return; } // button released outside the page: leave drag-select mode
  if (!dragFrom) return;
  const sh = container.querySelector('#ol-tree'), b = sh.getBoundingClientRect();
  if (multi) { if (e.clientY < b.top + 30) sh.scrollTop -= 14; else if (e.clientY > b.bottom - 30) sh.scrollTop += 14; }
  const n = rowAt(e.clientY); if (!n) return;
  if (!multi) {
    const fb = els.get(dragFrom).getBoundingClientRect();
    if (n === dragFrom || Math.hypot(e.clientX - sx, e.clientY - sy) < 8 || (e.clientY > fb.top - 6 && e.clientY < fb.bottom + 6)) return; // still one bullet: native text selection
  }
  if (!multi) { multi = true; container.classList.add('multi'); anchor = dragFrom; try { dragTA.setSelectionRange(0, 0); } catch (x) {} }
  const l = vis(), a = l.indexOf(dragFrom), c = l.indexOf(n); cursor = n;
  setSel(new Set(l.slice(Math.min(a, c), Math.max(a, c) + 1)));
  const g = window.getSelection(); if (g) g.removeAllRanges();
}, true);
const endDrag = () => { dragFrom = null; multi = false; container.classList.remove('multi'); };
listen(document, 'mouseup', () => { if (dragFrom || multi) endDrag(); }, true);
listen(window, 'blur', () => { lastOwnedInteraction = false; if (dragFrom || multi) endDrag(); if (dragSet) { dragSet = null; clearDrop(); } });
const qBox = container.querySelector('#ol-qBox'), qIn = container.querySelector('#ol-qIn');
const searchAction = container.querySelector('#ol-qx');
let searchComposing = false, searchPressBlocked = false;
let searchExitPending = false, searchExitTimer = 0, searchExitPointer = null;
function cancelSearchExit() {
  searchExitPending = false;
  clearTimeout(searchExitTimer);
  searchExitTimer = 0;
}
function syncSearchAction() {
  if (!integratedHeader) return;
  const active = searching();
  searchAction.textContent = active ? '×' : '↵';
  searchAction.title = active ? 'Clear search' : 'Submit search';
  searchAction.setAttribute('aria-label', searchAction.title);
}
function startSearch(v) {
  cancelSearchExit();
  v = v.trim(); if (!v) { endSearch(); return; }
  const changed=sq!==v;
  depthController?.invalidate();
  if (integratedHeader) qIn.value = v;
  sq = v; sOver.clear(); sKeep.clear(); sel.clear(); qBox.classList.add('on'); qIn.blur(); syncSearchAction();
  render(undefined, undefined, {fallbackToTop:true});
  if(changed)emit('search',{query:sq});
}
function endSearch(redraw = true) {
  cancelSearchExit();
  const was = searching();
  sq = ''; sShown.clear(); sAnc.clear(); sOver.clear(); sKeep.clear(); qIn.value = ''; qBox.classList.remove('on'); syncSearchAction();
  if (was) { sel.clear(); if (redraw) render(); emit('search',{query:sq}); }
}
function commitSearchExit() {
  if (!searchExitPending || searchComposing || searchExitPointer !== null) return;
  cancelSearchExit();
  const query = qIn.value.trim();
  if (query === sq) { qIn.value = query; return; }

  // The destination action already ran. Keep its field if the new results still show it.
  const field = document.activeElement;
  const node = field?.matches('#ol-tree textarea[data-id]') && treeEl.contains(field) ? find(root, +field.dataset.id) : null;
  const range = node && [field.selectionStart, field.selectionEnd, field.selectionDirection];
  startSearch(query);
  if (!field?.isConnected && node && document.activeElement === document.body) {
    const replacement = els.get(node)?.querySelector(`textarea[data-role="${field.dataset.role}"]`);
    if (replacement) {
      replacement.focus({preventScroll: true});
      replacement.setSelectionRange(...range);
    }
  }
}
function scheduleSearchExit(delay = 0) {
  clearTimeout(searchExitTimer);
  searchExitTimer = setTimeout(() => {
    searchExitTimer = 0;
    commitSearchExit();
  }, delay);
}
function getSearchQuery(){return sq;}
listen(qIn, 'keydown', e => {
  if (e.isComposing || e.keyCode === 229 || searchComposing) return;
  if (e.key === 'Enter') { e.preventDefault(); startSearch(qIn.value); }
  else if (e.key === 'Escape' && (searching() || (integratedHeader && qIn.value))) { e.preventDefault(); endSearch(); }
});
if (integratedHeader) {
  listen(qIn, 'compositionstart', () => { searchComposing = true; });
  listen(qIn, 'compositionend', () => {
    searchComposing = false;
    if (searchExitPending && searchExitPointer === null) scheduleSearchExit();
  });
  listen(qBox, 'focusin', cancelSearchExit);
  listen(qBox, 'focusout', e => {
    if (qBox.contains(e.relatedTarget) || (!searchComposing && qIn.value === sq)) return;
    searchExitPending = true;
    if (searchExitPointer === null) scheduleSearchExit();
  });
  listen(document, 'pointerdown', e => {
    if (!e.isPrimary || !qBox.contains(document.activeElement) || qBox.contains(e.target)) return;
    searchExitPointer = e.pointerId;
  }, true);
  function releaseSearchPointer(e) {
    if (searchExitPointer !== e.pointerId) return;
    searchExitPointer = null;
    // A completed click normally settles first. Also settle blur from a canceled or dragged press.
    if (searchExitPending) scheduleSearchExit(e.type === 'pointerup' ? 350 : 0);
  }
  listen(document, 'pointerup', releaseSearchPointer, true);
  listen(document, 'pointercancel', releaseSearchPointer, true);
  listen(window, 'blur', () => {
    searchExitPointer = null;
    if (searchExitPending) scheduleSearchExit();
  });
  listen(document, 'click', () => {
    if (!qBox.contains(document.activeElement)) commitSearchExit();
  });
  listen(searchAction, 'pointerdown', () => { searchPressBlocked = searchComposing; });
  listen(searchAction, 'pointercancel', () => { searchPressBlocked = false; });
  listen(searchAction, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') searchPressBlocked = searchComposing || e.isComposing || e.keyCode === 229; });
  listen(searchAction, 'click', e => {
    const blocked = searchPressBlocked || searchComposing || e.isComposing;
    searchPressBlocked = false;
    if (blocked) return;
    if (searching()) { endSearch(); searchAction.blur(); } else startSearch(qIn.value);
  });
  syncSearchAction();
} else searchAction.onclick = endSearch;
// R12-2: only the resize/font path batches measurements; ordinary fit/render stay unchanged.
let refitRaf = 0, refitWidth = null, refitTreeWidth = null, refitFontDirty = false;
const refit = () => {
  if (refitRaf) return;
  refitRaf = requestAnimationFrame(() => {
    refitRaf = 0;
    const width = container.getBoundingClientRect().width, treeWidth = treeEl.getBoundingClientRect().width;
    if (!width || !treeWidth) { refitWidth = refitTreeWidth = null; return; }
    if (!refitFontDirty && width === refitWidth && treeWidth === refitTreeWidth) return;
    paneLayout(); resizeCrumbs();
    const textareas = [...container.querySelectorAll('#ol-tree textarea[data-id], #ol-head textarea')];
    // Preserve a visible row while sequentially measuring a scrolled sheet.
    if (treeEl.scrollTop) keepSheetPosition(() => textareas.forEach(fit));
    else {
      textareas.forEach(t => { t.style.height = 'auto'; });
      const heights = textareas.map(t => t.scrollHeight);
      textareas.forEach((t, i) => { setEditorHeight(t,heights[i] + 'px'); });
      textareas.forEach(t => { t.scrollTop = 0; });
    }
    ownedActiveElement()?._photoCaret?.position();
    refitWidth = width; refitTreeWidth = treeWidth; refitFontDirty = false;
  });
};
const refitFonts = () => { if (destroyed) return; refitFontDirty = true; refit(); resizeCrumbs(); };
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refitFonts);
if (document.fonts && document.fonts.addEventListener) {
  document.fonts.addEventListener('loadingdone', refitFonts);
  globalListeners.push([document.fonts, 'loadingdone', refitFonts]);
}

// Bullet heights are measured when drawn, so they must be re-measured when the width changes; otherwise lines that wrapped
// while the window was narrow keep their extra empty rows after it is widened again.
listen(window, 'resize', refit);
if (window.ResizeObserver) { resizeObserver = new ResizeObserver(() => { if (destroyed) return; refit(); }); resizeObserver.observe(container); resizeObserver.observe(treeEl); }

// REQUIREMENT (scrollbar): see CSS .sheet. Timings (450ms idle, 36px edge zone, 0.18s fade) were chosen by the owner, do not change them.
// Scrollbar is hidden by default; it shows while scrolling or when the cursor is near the right edge of the outline.
const sheet = container.querySelector('#ol-tree'); let sbT, sbNear = false;
const showSb = () => { sheet.classList.add('sb'); clearTimeout(sbT); sbT = setTimeout(() => { if (!sbNear) sheet.classList.remove('sb'); }, 450); };
listen(sheet, 'scroll', showSb, { passive: true });
listen(container, 'mousemove', e => {
  const b = sheet.getBoundingClientRect();
  const near = e.clientX > b.right - 36 && e.clientX <= b.right + 8 && e.clientY >= b.top && e.clientY <= b.bottom;
  if (near) { sbNear = true; sheet.classList.add('sb'); } else if (sbNear) { sbNear = false; showSb(); }
});

listen(container, 'mouseleave', () => { if (sbNear) { sbNear = false; showSb(); } });
// iPad Safari touch move: initial defaults stay native; prevent only an active held move.
let touchGesture = null, touchTimer = null, blockClickUntil = 0;
const touchInside = (x, y) => {
  const b = treeEl.getBoundingClientRect();
  return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
};
function cancelTouch(reason) {
  clearTimeout(touchTimer);
  if (!touchGesture) return;
  if (touchGesture.active) blockClickUntil = performance.now() + 900;
  touchGesture = null; dragSet = null; clearDrop();
  container.classList.remove('touch-moving');
  container.querySelectorAll('.row.dragging').forEach(r => r.classList.remove('dragging'));
}
function aimTouch(x, y) {
  // Keep real finger bounds/y. Only indentation x is anchored to the original bullet.
  if (touchInside(x, y)) aimDrop({clientX:x - touchGesture.indentOffset, clientY:y}); else clearDrop();
}
listen(container, 'touchstart', e => {
  if (e.touches.length !== 1) { cancelTouch('second finger'); return; }
  if (!ipadSafari) return;
  cancelTouch('new contact'); blockClickUntil = 0;
  const row = e.target.closest('.row'), excluded = e.target.closest('.arrow,.dots,.map-size-badge,.menu,.photo-delete,.photo-sortable .photo-thumb,.photo-caret');
  if (!row || excluded || historyComposing || neutralComposing || destroyed) return;
  const textarea = row.contains(document.activeElement) && document.activeElement.matches('textarea[data-id]') ? document.activeElement : row.querySelector('textarea');
  // Eligibility captured before any browser focus default. Never blur/refocus.
  if (textarea === document.activeElement) { return; }
  const n = find(root, +row.parentElement.dataset.id), t = e.touches[0];
  if (!n || !e.target.closest('.bullet,.tw,.row')) return;
  const bullet = row.querySelector('.bullet').getBoundingClientRect();
  // Bullet contacts retain their exact old x; body contacts share its center anchor.
  const indentOffset = e.target.closest('.bullet') ? 0 : t.clientX - (bullet.left + bullet.width / 2);
  touchGesture = {id:t.identifier, n, row, textarea, x:t.clientX, y:t.clientY, active:false,
    indentOffset};
  touchTimer = setTimeout(() => {
    if (!touchGesture || destroyed || !row.isConnected || els.get(n) !== row || historyComposing || neutralComposing) { cancelTouch('unavailable'); return; }
    touchGesture.active = true;
    dragSet = sel.has(n) ? roots() : [n];
    row.classList.add('dragging'); container.classList.add('touch-moving');
    // Do not call aimDrop until movement: holding and releasing is cancellation.
  }, 450);
}, {capture:true, passive:true});
listen(document, 'touchmove', e => {
  if (!touchGesture) return;
  if (destroyed || !touchGesture.row.isConnected || els.get(touchGesture.n) !== touchGesture.row) { cancelTouch('source replaced'); return; }
  const t = [...e.touches].find(t => t.identifier === touchGesture.id);
  if (!t || e.touches.length !== 1) { cancelTouch('contact changed'); return; }
  if (!touchGesture.active) {
    if (Math.hypot(t.clientX-touchGesture.x,t.clientY-touchGesture.y) > 10) cancelTouch('early movement: native scroll');
    return;
  }
  if (!e.cancelable) { cancelTouch('noncancelable move: browser owns touchGesture'); return; }
  e.preventDefault(); aimTouch(t.clientX,t.clientY);
}, {capture:true, passive:false});
listen(document, 'touchend', e => {
  if (!touchGesture) return;
  const t = [...e.changedTouches].find(t => t.identifier === touchGesture.id);
  if (!t) return;
  clearTimeout(touchTimer);
  if (!touchGesture.active) { touchGesture = null; return; }
  if (e.cancelable) e.preventDefault();
  // Revalidate release geometry; never reuse a stale destination outside the tree.
  const valid = !destroyed && touchGesture.row.isConnected && els.get(touchGesture.n) === touchGesture.row &&
    dropT && (dropT.parent === root || par.has(dropT.parent)) && !inDrag(dropT.parent) &&
    (!dropT.before || dropT.parent.children.includes(dropT.before));
  const target = valid && touchInside(t.clientX,t.clientY) ? dropT : null, items = dragSet;
  cancelTouch(target ? 'completed cleanup' : 'release without valid target');
  if (target && items?.length && !destroyed) {
    dropTo(items,target);
  }
}, {capture:true, passive:false});
listen(document, 'touchcancel', () => cancelTouch('touchcancel'), true);
listen(document, 'pointercancel', () => cancelTouch('pointercancel'), true);
listen(window, 'blur', () => cancelTouch('window blur'));
listen(document, 'visibilitychange', () => { if (document.hidden) cancelTouch('hidden'); });
listen(container, 'compositionstart', () => cancelTouch('composition'), true);
listen(treeEl, 'scroll', () => cancelTouch('tree scroll'), {passive:true});
listen(document, 'keydown', e => { if (e.key === 'Escape') cancelTouch('Escape'); }, true);
listen(container, 'click', e => {
  if (performance.now() < blockClickUntil && e.target.closest('.row')) {
    e.preventDefault(); e.stopImmediatePropagation();
  }
}, true);
listen(container, 'contextmenu', e => {
  if (touchGesture?.active) e.preventDefault();
}, true);
listen(container, 'dragstart', e => {
  if (touchGesture) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);

async function exportPhotoOutline(entries) {
  const photos = new Map(), nodes = entries.map(({n, d}) => {
    if (d > photoZipMaxDepth) throw new Error('This outline is too deeply nested for a project ZIP. Export a smaller branch.');
    n.photos?.forEach(photo => photos.set(photo.id, photo));
    return copyPresentation(n, {depth: d, text: n.text, open: n.open});
  });
  const manifest = new Blob([JSON.stringify({version: 1, nodes})]);
  const files = new Map([['outline.json', manifest]]);
  let total = manifest.size;
  for (const id of photos.keys()) {
    const asset = await photoService.read(id);
    if (!asset?.detail) throw new Error('A photo is unavailable. Export canceled.');
    total += asset.detail.size;
    if (total > photoZipLimit) throw new Error('Choose a smaller outline section to export');
    const extension = asset.detail.type === 'image/jpeg' ? 'jpg' : 'png';
    files.set(`images/${id}.${extension}`, asset.detail);
  }
  return writePhotoZip(files);
}

async function readPhotoOutline(buffer, current) {
  const files = readPhotoZip(buffer);
  const {version, nodes} = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(files.get('outline.json')));
  const invalid = () => { throw new Error('Invalid or unsupported project ZIP'); };
  if (version !== 1 || !Array.isArray(nodes) || !nodes.length) invalid();
  const items = [], stack = [], photos = new Map();
  for (const data of nodes) {
    if (!data || !Number.isInteger(data.depth) || data.depth < 0 || data.depth > stack.length || data.depth > photoZipMaxDepth ||
        typeof data.text !== 'string' || typeof data.open !== 'boolean') invalid();
    const item = {...data, children: []};
    if (!validPresentation(item)) invalid();
    const parent = stack[data.depth - 1];
    if (parent?.kind === 'spacer') invalid();
    (parent?.children || items).push(item);
    stack.length = data.depth;
    stack.push(item);
    for (const photo of item.photos || []) {
      const previous = photos.get(photo.id);
      if (previous && (previous.width !== photo.width || previous.height !== photo.height)) invalid();
      photos.set(photo.id, photo);
    }
  }
  if (!photos.size || files.size !== photos.size + 1) invalid();
  const assets = [], remapped = new Map();
  for (const [id, photo] of photos) {
    if (!current()) return null;
    const jpeg = files.get(`images/${id}.jpg`), png = files.get(`images/${id}.png`);
    if (jpeg && png) invalid();
    const data = jpeg || png, type = jpeg ? 'image/jpeg' : 'image/png';
    if (!data || data.length > 12 * 1024 * 1024) invalid();
    const dimensions = photoDimensions(data, type);
    if (!dimensions || dimensions.width !== photo.width || dimensions.height !== photo.height) invalid();
    const detail = new Blob([data], {type}), image = await decodePhoto(detail);
    try {
      if (image.naturalWidth !== photo.width || image.naturalHeight !== photo.height) invalid();
      const fresh = newPhotoId(), {blob: thumb} = await resizePhoto(image, 320, type);
      assets.push([fresh, {detail, thumb}]); remapped.set(id, fresh);
    } finally { image.src = ''; }
  }
  for (const item of nodes) if (item.photos) item.photos.forEach(photo => { photo.id = remapped.get(photo.id); });
  return {items, assets};
}

const photoService = createPhotoService();
const photoDialog = container.querySelector('.photo-viewer');
const photoFrame = photoDialog.querySelector('.photo-frame');
const photoPreview = photoFrame.querySelector('canvas');
const photoStatus = photoFrame.querySelector('[role=status]');
const photoClose = photoDialog.querySelector('button');
const visiblePhotos = new Map();
let viewerLease, viewerThumb, viewerOrigin, viewerRevision = 0, photoTarget, photoRequest = 0;
let photoProcessing = false;

function paintPreview(canvas, image) {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext('2d').drawImage(image, 0, 0);
}

function stopPhotoPreview(button) {
  const current = visiblePhotos.get(button);
  if (!current) return;
  current.lease?.release();
  current.lease = null;
  current.canvas.width = current.canvas.height = 1;
  current.canvas.hidden = true;
}

const photoObserver = new IntersectionObserver(entries => {
  for (const {target, isIntersecting} of entries) {
    const current = visiblePhotos.get(target);
    if (!current) continue;
    if (!isIntersecting) { stopPhotoPreview(target); continue; }
    if (current.lease) continue;
    const lease = current.lease = photoService.acquire(current.photo, 'thumb');
    lease.ready.then(image => {
      if (current.lease !== lease) return;
      paintPreview(current.canvas, image);
      current.canvas.hidden = false;
      current.status.hidden = true;
    }).catch(() => {
      if (current.lease === lease) current.status.hidden = false;
    });
  }
});

function removePhotoPreviews(group) {
  if (photoSort && group.contains(photoSort.button)) cancelPhotoSort();
  for (const button of group.querySelectorAll('.photo-thumb')) {
    photoObserver.unobserve(button);
    stopPhotoPreview(button);
    visiblePhotos.delete(button);
  }
}

function cleanupViewer() {
  viewerRevision++;
  viewerLease?.release(); viewerLease = null;
  viewerThumb?.release(); viewerThumb = null;
  photoPreview.width = photoPreview.height = 1;
  photoPreview.hidden = true;
}

function sizeViewer() {
  if (!photoDialog.open) return;
  const viewport = window.visualViewport;
  photoDialog.style.inset = 'auto';
  Object.assign(photoDialog.style, {left: `${viewport?.offsetLeft ?? 0}px`, top: `${viewport?.offsetTop ?? 0}px`,
    width: `${viewport?.width ?? innerWidth}px`, height: `${viewport?.height ?? innerHeight}px`});
  const style = getComputedStyle(photoDialog);
  const availableWidth = photoDialog.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const availableHeight = photoDialog.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 52;
  const {width, height} = viewerOrigin.photo;
  const scale = Math.max(0, Math.min(1, availableWidth / width, availableHeight / height));
  photoFrame.style.width = `${Math.max(44, width * scale)}px`;
  photoPreview.style.width = `${width * scale}px`;
  photoPreview.style.height = `${height * scale}px`;
}

function openPhotoViewer(button, photo, node) {
  if (photoDialog.open || historyComposing || touchGesture?.active || (ipadSafari && performance.now() < blockClickUntil)) return;
  cleanupViewer();
  viewerOrigin = {button, photo, node};
  const revision = viewerRevision;
  photoStatus.textContent = '';
  photoPreview.hidden = false;
  depthController?.close();commitSize();
  topMenu.classList.remove('show'); menu.classList.remove('show');
  button.focus({preventScroll: true});
  photoDialog.showModal();
  sizeViewer();
  photoClose.focus({preventScroll: true});
  let detailed = false;
  viewerThumb = photoService.acquire(photo, 'thumb');
  viewerThumb.ready.then(image => {
    if (revision !== viewerRevision || detailed) return;
    paintPreview(photoPreview, image); photoPreview.hidden = false;
  }).catch(() => {});
  viewerLease = photoService.acquire(photo, 'detail');
  viewerLease.ready.then(image => {
    if (revision !== viewerRevision) return;
    detailed = true;
    paintPreview(photoPreview, image); photoPreview.hidden = false;
    viewerThumb?.release(); viewerThumb = null;
  }).catch(() => { if (revision === viewerRevision) photoStatus.textContent = 'Larger image unavailable'; });
}

listen(photoClose, 'click', () => photoDialog.close());
listen(photoDialog, 'keydown', event => event.stopPropagation());
let backdropPressed = false;
listen(photoDialog, 'pointerdown', event => { backdropPressed = event.target === photoDialog; });
listen(photoDialog, 'click', event => { if (backdropPressed && event.target === photoDialog) photoDialog.close(); });
listen(photoDialog, 'close', () => {
  cleanupViewer();
  const origin = viewerOrigin;
  viewerOrigin = null;
  if (!origin || destroyed) return;
  const row = els.get(origin.node);
  const control = origin.button.isConnected ? origin.button : row?.querySelector('.photo-thumb, .more') ||
    (zoom === origin.node ? headControls?.more : null) || container.querySelector('.row .more');
  control?.focus({preventScroll: true});
});
listen(window, 'resize', sizeViewer);
if (window.visualViewport) listen(window.visualViewport, 'resize', sizeViewer);
if (window.visualViewport) listen(window.visualViewport, 'scroll', sizeViewer);

const remainingPhotoSlots = node => MAX_PHOTOS - (node.photos?.length ?? 0);

function photoPlacement(node) {
  if (!node || !par.has(node) || node.kind === 'spacer') return null;
  if (node.photos) return remainingPhotoSlots(node) > 0 ? 'here' : null;
  if (canImportInto(node)) return 'here';
  return node.text.trim() ? 'below' : null;
}

function choosePhoto(node) {
  const placement = photoPlacement(node);
  if (historyComposing || photoProcessing || !placement) return;
  photoTarget = {node, placement};
  photoRequest++;
  photoInput.value = '';
  try { photoInput.click(); }
  catch (_) { photoTarget = null; toast('Could not open the photo picker'); }
}

function commitPhotoChange(node, update) {
  record();
  promotePresentation(node);
  update();
  render(undefined, undefined, {anchorId:node.id});
}

const photoInput = container.querySelector('#ol-photo-file');
listen(photoInput, 'cancel', () => { photoTarget = null; });
listen(photoInput, 'change', async () => {
  const files = Array.from(photoInput.files), target = photoTarget, request = photoRequest;
  photoTarget = null; photoInput.value = '';
  if (!files.length || !target || photoProcessing) return;
  const {node, placement} = target;
  const capacity = remainingPhotoSlots(node);
  if (files.length > capacity) {
    const limit = capacity === MAX_PHOTOS ? `A row can hold only ${MAX_PHOTOS} photos.`
      : capacity > 0 ? `This row has room for ${capacity} more photo${capacity === 1 ? '' : 's'}.`
      : 'This row is full.';
    toast('Too many photos selected. ' + limit);
    return;
  }
  const current = () => !destroyed && request === photoRequest;
  const eligible = () => current() && !historyComposing && photoPlacement(node) === placement &&
    files.length <= remainingPhotoSlots(node);
  photoProcessing = true;
  try {
    const prepared = [];
    for (const file of files) {
      if (!eligible()) return;
      prepared.push(await preparePhoto(file));
    }
    if (!eligible()) return;
    await photoService.write(prepared.map(({photo, asset}) => [photo.id, asset]));
    if (!eligible()) return;
    commitPhotoChange(node, () => {
      const row = placement === 'below' ? mk() : node;
      if (row !== node) insertAfterNodeEnd(node, row);
      else discardUnusedPlaceholder(row); // A blank Focus title can still own a typing row.
      row.photos = [...(row.photos || []), ...prepared.map(item => item.photo)];
      if (searching()) sKeep.add(row);
    });
  } catch (error) {
    if (current()) toast(error.name === 'QuotaExceededError' ? 'Photo storage is full' : photoAddWarning);
  } finally { photoProcessing = false; }
});

let photoSort = null, photoClickBlockedUntil = 0;
function cancelPhotoSort() {
  if (!photoSort) return;
  const {button, group, line, ghost, timer, active, pointerId} = photoSort;
  photoSort = null;
  clearTimeout(timer);
  button.classList.remove('sorting');
  group.classList.remove('photo-reordering');
  line?.remove(); ghost?.remove();
  if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
  if (active) photoClickBlockedUntil = performance.now() + 500;
}
function beginPhotoSort(event, node, photo, button) {
  cancelPhotoSort();
  if (!event.isPrimary || event.button !== 0 || event.ctrlKey || event.shiftKey || event.metaKey) return;
  const group = button.closest('.photo-group'), active = ownedActiveElement();
  // Keep the editor focused until the thumbnail click can open the viewer.
  if (active?._photoCaret && group.contains(active)) event.preventDefault();
  photoClickBlockedUntil = 0;
  const state = photoSort = {node, photo, button, group, pointerId:event.pointerId, x:event.clientX, y:event.clientY, touch:event.pointerType === 'touch'};
  const activate = () => {
    if (photoSort !== state || !button.isConnected || state.active) return;
    state.active = true;
    clearTimeout(state.timer);
    group.classList.add('photo-reordering');
    state.line = el('span','photo-insertion-line');
    state.line.setAttribute('aria-hidden','true');
    state.line.hidden = true;
    state.group.append(state.line);
    if (!state.touch && !ipadSafari) {
      const image = button.querySelector('canvas'), rect = button.getBoundingClientRect();
      const ghost = state.ghost = document.createElement('canvas');
      ghost.width = image.width; ghost.height = image.height;
      ghost.getContext('2d').drawImage(image,0,0);
      ghost.setAttribute('aria-hidden','true');
      Object.assign(ghost.style,{position:'fixed',left:'0',top:'0',width:rect.width+'px',height:rect.height+'px',
        objectFit:'contain',borderRadius:'6px',opacity:'.8',pointerEvents:'none',zIndex:'2147483647'});
      state.grabX = state.x - rect.left; state.grabY = state.y - rect.top;
      document.body.append(ghost);
    }
    aimPhotoSort(state.x,state.y);
    button.classList.add('sorting');
    button.setPointerCapture(event.pointerId);
  };
  state.timer = setTimeout(activate, 350);
  state.activate = activate;
}
function aimPhotoSort(x, y) {
  const state = photoSort;
  if (!state) return;
  if (!state.active && Math.hypot(x-state.x,y-state.y) > 6) {
    if (state.touch) { cancelPhotoSort(); return; }
    state.activate();
  }
  if (!state.active) return;
  if (state.ghost) state.ghost.style.transform = `translate(${x-state.grabX}px,${y-state.grabY}px)`;
  const group = state.group, bounds = group.getBoundingClientRect();
  state.index = -1;
  state.line.hidden = true;
  if (x < bounds.left-4 || x > bounds.right+4 || y < bounds.top-4 || y > bounds.bottom+4) return;
  const boxes = Array.from(group.querySelectorAll('.photo-tile'),tile=>tile.getBoundingClientRect());
  // Choose the nearest visual row first, including the whitespace between wrapped rows.
  const distance = box => Math.abs(y - (box.top + box.height/2));
  const row = boxes.reduce((best,box)=>distance(box)<distance(best)?box:best);
  const first = boxes.findIndex(box=>Math.abs(box.top-row.top)<1);
  let slot = first;
  while (slot < boxes.length && Math.abs(boxes[slot].top-row.top)<1 && x >= boxes[slot].left+boxes[slot].width/2) slot++;
  const from = state.node.photos?.indexOf(state.photo) ?? -1;
  const index = slot > from ? slot - 1 : slot;
  if (from < 0 || index === from) return;
  state.index = index;
  const prev = slot > first ? boxes[slot-1] : null;
  const next = boxes[slot] && Math.abs(boxes[slot].top-row.top)<1 ? boxes[slot] : null;
  const lineX = prev && next ? (prev.right+next.left)/2 : prev ? prev.right+2 : next.left-2;
  Object.assign(state.line.style,{left:(lineX-bounds.left)+'px',top:(row.top-bounds.top)+'px',height:row.height+'px'});
  state.line.hidden = false;
}
listen(document, 'pointermove', event => {
  if (photoSort?.pointerId === event.pointerId) aimPhotoSort(event.clientX,event.clientY);
});
listen(document, 'touchmove', event => {
  if (photoSort?.touch && photoSort.active && event.cancelable) event.preventDefault();
}, {passive:false,capture:true});
listen(document, 'touchstart', event => { if(event.touches.length > 1) cancelPhotoSort(); }, {passive:true,capture:true});
listen(document, 'pointerup', event => {
  const state = photoSort;
  if (!state || state.pointerId !== event.pointerId) return;
  if (state.active) aimPhotoSort(event.clientX,event.clientY);
  const from = state.node.photos?.indexOf(state.photo) ?? -1;
  const index = state.index ?? -1;
  cancelPhotoSort();
  const {group, node, photo} = state;
  if (index < 0 || from < 0 || !par.has(node) || !group.isConnected) return;
  const tiles = Array.from(group.querySelectorAll('.photo-tile'));
  const [tile] = tiles.splice(from,1);
  const caret = group.querySelector('.photo-caret');
  // Reorder just the tiles so the focused textarea and its software keyboard survive the drop.
  record();
  node.photos.splice(from,1);
  node.photos.splice(index,0,photo);
  group.insertBefore(tile,tiles[index] ?? caret?.parentElement ?? null);
  tiles.splice(index,0,tile);
  tiles.forEach(labelPhotoTile);
  group.parentElement._nodeEditor.photosKey = photoOrderKey(node.photos);
  caret?._photoCaret.position();
  schedulePhotoCaretReveal();
  save(false,node.id);
});
listen(document,'pointercancel',cancelPhotoSort);
listen(window,'blur',cancelPhotoSort);

// Safari normally reveals a focused editor. If its docked keyboard still covers a photo,
// use the measured visible viewport and only scroll the Outliner as far as needed.
const photoKeyboardViewport=ipadSafari?window.visualViewport:null;
let photoKeyboardFrame=0;
function schedulePhotoCaretReveal(){
  if(!photoKeyboardViewport||photoKeyboardFrame)return;
  photoKeyboardFrame=requestAnimationFrame(()=>{
    photoKeyboardFrame=0;
    const active=ownedActiveElement(),vp=photoKeyboardViewport;
    if(!active?._photoCaret||document.documentElement.clientHeight-vp.height*vp.scale<=120){
      treeEl.style.removeProperty('--photo-keyboard-space');
      return;
    }
    const sheet=treeEl.getBoundingClientRect();
    const viewportTop=Number.isFinite(vp.pageTop)?vp.pageTop-window.scrollY:vp.offsetTop;
    const bottom=Math.min(sheet.bottom,viewportTop+vp.height);
    const overlap=Math.ceil(active.getBoundingClientRect().bottom+8-bottom);
    if(overlap<=0||bottom<=sheet.top)return;
    treeEl.style.setProperty('--photo-keyboard-space',Math.ceil(sheet.bottom-bottom)+8+'px');
    treeEl.scrollTop+=overlap;
  });
}
if(photoKeyboardViewport){
  for(const type of ['resize','scroll'])listen(photoKeyboardViewport,type,()=>{
    if(ownedActiveElement()?._photoCaret)schedulePhotoCaretReveal();
    else if(treeEl.style.getPropertyValue('--photo-keyboard-space'))treeEl.style.removeProperty('--photo-keyboard-space');
  });
  listen(treeEl,'focusout',e=>{if(e.target._photoCaret)schedulePhotoCaretReveal();});
  listen(treeEl,'focusin',()=>{if(treeEl.style.getPropertyValue('--photo-keyboard-space'))schedulePhotoCaretReveal();});
}
function focusPhotoCaret(node, position){
  const caret=els.get(node)?.querySelector('.photo-caret');
  if(caret){caret._photoCaret.position(position);caret.focus({preventScroll:!ipadSafari});revealFocusedField(caret,true);}
}
function deletePhoto(node,photo,position){
  if(!par.has(node)||!node.photos?.includes(photo))return;
  const caretRemoval=position!==undefined;
  const keepRow=caretRemoval&&node.photos.length===1;
  if(!caretRemoval)blurOutlineText();
  commitPhotoChange(node,()=>{
    if(keepRow){delete node.photos;if(searching())sKeep.add(node);}
    else if(node.photos.length===1)rm(node);
    else node.photos=node.photos.filter(item=>item!==photo);
  });
  if(keepRow)revealFocusedField(focusNode(node.id,0,!ipadSafari),true);
  else if(caretRemoval)focusPhotoCaret(node,{slot:position});
}
function bindPhotoCaret(group,node){
  const caret=el('textarea','photo-caret'),frame=el('span','photo-caret-slot'),hitArea=el('button','photo-caret-target'),marker='\u200b';
  let slot=node.photos.length,before=false;
  caret.rows=1;caret.spellcheck=false;caret.autocomplete='off';
  caret.setAttribute('aria-label','Photo editing cursor');
  hitArea.type='button';hitArea.tabIndex=-1;hitArea.setAttribute('aria-label','Place the photo cursor');
  function reset(){caret.value=marker;caret.setSelectionRange(marker.length,marker.length);}
  function position(place){
    const tiles=Array.from(group.querySelectorAll('.photo-tile'));
    if(place){slot=Math.min(tiles.length,place.slot);before=!!place.before&&slot<tiles.length;}
    const atStart=slot===0||before,tile=tiles[atStart?slot:slot-1];
    frame.style.left=(tile.offsetLeft+(atStart?-4:tile.offsetWidth+4))+'px';
    frame.style.top=tile.offsetTop+'px';
    frame.style.height=tile.offsetHeight+'px';
  }
  caret._photoCaret={position,current:()=>({slot,before})};
  function placeFromClick(e){
    if(e.defaultPrevented||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey||historyComposing||
       touchGesture?.active||performance.now()<photoClickBlockedUntil||(ipadSafari&&performance.now()<blockClickUntil))return;
    const boxes=Array.from(group.querySelectorAll('.photo-tile'),tile=>tile.getBoundingClientRect());
    const closest=boxes.reduce((best,box)=>Math.abs(e.clientY-(box.top+box.height/2))<Math.abs(e.clientY-(best.top+best.height/2))?box:best);
    const sameLine=boxes.filter(box=>box.top===closest.top);
    const left=sameLine.findLast(box=>box.right<=e.clientX);
    if(left)position({slot:boxes.indexOf(left)+1});
    else position({slot:boxes.indexOf(sameLine[0]),before:true});
    caret.focus({preventScroll:!ipadSafari});reset();schedulePhotoCaretReveal();
  }
  function act(action,back=false){
    if(!par.has(node)||historyComposing)return;
    if(action==='remove'){if(slot)deletePhoto(node,node.photos[slot-1],slot-1);}
    else if(action==='enter'){record();insertSiblingAfter(node);}
    else if(action==='indent')tab(back,{slot,before});
    else {position({slot:Math.max(0,Math.min(node.photos.length,slot+(back?-1:1)))});reset();}
  }
  listen(hitArea,'click',placeFromClick);
  listen(caret,'focus',()=>{anchor=cursor=node;setSel(new Set());position();reset();schedulePhotoCaretReveal();});
  listen(caret,'keydown',e=>{
    if(e.isComposing||e.keyCode===229||historyComposing||e.defaultPrevented)return;
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(e.key==='Enter'||e.key==='Backspace'||e.key==='Tab'||['ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();
      act(e.key==='Enter'?'enter':e.key==='Backspace'?'remove':e.key==='Tab'?'indent':'move',e.shiftKey||e.key==='ArrowLeft');
    }
  });
  function nativeAction(inputType){
    if(inputType==='deleteContentBackward')act('remove');
    else if(inputType==='insertLineBreak'||inputType==='insertParagraph')act('enter');
    else if(inputType==='historyUndo'||inputType==='historyRedo'){
      const back=inputType==='historyUndo';if(historyHost)runHistory(back?'undo':'redo');else if(back)undo();else redo();
    }
  }
  listen(caret,'beforeinput',e=>{
    if(!e.cancelable)return;
    e.preventDefault();if(!e.isComposing&&!historyComposing)nativeAction(e.inputType);
  });
  listen(caret,'input',e=>{reset();if(!e.isComposing&&!historyComposing)nativeAction(e.inputType);});
  listen(caret,'compositionend',reset);
  listen(caret,'drop',e=>e.preventDefault());
  listen(caret,'cut',e=>e.preventDefault());
  group.classList.add('photo-editable');group.prepend(hitArea);frame.append(caret);group.append(frame);reset();
}

function photoOrderKey(photos){return photos.map(photo=>photo.id).join(',');}
function labelPhotoTile(tile,index){
  tile.querySelector('.photo-thumb').setAttribute('aria-label',`View photo ${index + 1}`);
  tile.querySelector('.photo-delete').setAttribute('aria-label',`Remove photo ${index + 1}`);
}
function syncPhotoRow(binding) {
  const node = binding.getNode(), photos = node.photos;
  binding.host.classList.toggle('photo-row', !!photos);
  binding.title.readOnly = !!photos;
  const photosNode = photos ? node : null;
  const key = photos ? photoOrderKey(photos) : '';
  // Undo and Redo restore new node objects even when photo IDs and order match.
  if (binding.photosNode !== photosNode || binding.photosKey !== key) {
    binding.photosNode = photosNode;
    binding.photosKey = key;
    if (binding.photos) { removePhotoPreviews(binding.photos); binding.photos.remove(); binding.photos = null; }
    if (photos) {
      const group = binding.photos = el('div', 'photo-group');
      group.classList.toggle('photo-sortable', photos.length > 1);
      binding.host.append(group);
      photos.forEach((photo, index) => {
        const button = el('button', 'photo-thumb'), canvas = el('canvas'), status = el('span');
        button.type = 'button';
        if (photos.length > 1) listen(button, 'pointerdown', event => beginPhotoSort(event, node, photo, button));
        const tile = el('div', 'photo-tile');
        tile.style.width = `${Math.min(160, 80 * photo.width / photo.height)}px`;
        status.textContent = 'Unavailable'; status.hidden = canvas.hidden = true;
        canvas.setAttribute('aria-hidden', 'true');
        button.append(canvas, status);
        const remove = el('button', 'photo-delete photo-cross');
        remove.type = 'button';
        listen(remove, 'click', event => {
          event.stopPropagation();
          deletePhoto(node,photo);
        });
        tile.append(button, remove); labelPhotoTile(tile,index); group.append(tile);
        visiblePhotos.set(button, {photo, canvas, status}); photoObserver.observe(button);
        listen(button, 'click', event => {
          if (event.detail && performance.now() < photoClickBlockedUntil || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey) return;
          openPhotoViewer(button, photo, node);
        });
      });
      if(!binding.head)bindPhotoCaret(group,node);
    }
  }
  if (binding.photos && binding.host.lastElementChild !== binding.photos) binding.host.append(binding.photos);
}

load();
if (saveBlocked) blockedTree = JSON.stringify(JSON.parse(snap()).root);
render();
listen(window, 'pagehide', flushSave);
listen(document, 'visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
if (!persistRequested) {
  persistRequested = true;
  try { const request = navigator.storage?.persist?.(); if (request && typeof request.catch === 'function') request.catch(() => {}); } catch (_) {}
}
initializePublication();
return { on, getSnapshot, revealNode, acquirePhoto: photoService.acquire, getSearchQuery, destroy, showToast: toast, reportSaveFailure, setPaneMode, commitHostHistory, runHistory, setPinnedFocus, beginHostAdjustment, endHostAdjustment };
}
window.Outliner = { version: '1.23.3', apiVersion: 1, capabilities: ['outline-reveal-v1', 'snapshot-v1', 'photo-attachments-v1', 'node-title-lines', 'change-event', 'toggle-event', 'zoom-event', 'storage-feedback', 'toast-v1', 'pane-controls', 'header-content', 'host-history', 'pin-focus-menu-v1', 'outline-focus-history-v1', 'focus-collapse-v1', 'focus-expansion-v1', 'search-query-v1', 'node-presentation-v1', 'node-presentation-v2', 'node-presentation-v3', 'numeric-stepper-v1', 'numeric-select-all-v1', 'numeric-input-commit-v1', 'adjustment-history-v1', 'expansion-level-event-v1'], createNumericStepper, bindNumericInputs, mount };
})();
