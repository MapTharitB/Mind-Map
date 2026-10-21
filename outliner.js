/* Outliner version 1.8.2 | apiVersion 1. Classic, single-instance mountable module. */
(function () {
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
.moa-outliner.ipad-safari .arrow{left:-22.5px;width:20px;font-size:32.5px;top:0;height:calc(var(--bh) * 1.15)}
/* Owner-approved iPad gutter: give the outermost More button room while retaining guide/control geometry. */
@container moa-outline (max-width:700px){.moa-outliner.ipad-safari .sheet,.moa-outliner.ipad-safari .head{padding-left:calc(var(--gut) + 80px)}}
.moa-outliner.ipad-safari .arrow span{display:block;line-height:1}
.moa-outliner.ipad-safari .arrow.open span{transform:rotate(90deg)}
.moa-outliner.touch-moving .row.dragging,.moa-outliner.touch-moving .row.dragging *{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
`;
const css = String.raw`/* REQUIREMENT (full width layout): the toolbar and breadcrumb row span the whole app width and the outline scrollbar sits at the far right edge of the app.
   The outline TEXT must stay at the same horizontal position as the original centred 1040px column: --gut is that column's old side margin
   (14px, or half of the width beyond 1040px). .sheet and .head add their old paddings on top of --gut.
   DO NOT put max-width or side padding back on .page or its children: that moves the scrollbar away from the app edge. */
.moa-outliner{box-sizing:border-box;--gut:max(14px,(100% - 1040px) / 2);display:flex;flex-direction:column;min-height:0;container-type:inline-size;container-name:moa-outline}
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
.moa-outliner button.t:hover{border-color:var(--accent)}.moa-outliner button.t.p{background:var(--accent);border-color:var(--accent);color:#fff}
/* REQUIREMENT (scrollbar): invisible by default; shown only while scrolling or when the pointer is near the right edge (JS toggles .sb), then it fades out.
   The fade (0.18s) and the idle delay (450ms in JS) are deliberately fast: the owner asked for twice as fast as the first version.
   DO NOT switch to ::-webkit-scrollbar rules (Chrome ignores them once scrollbar-color is set) and DO NOT make the scrollbar always visible.
   .sheet is the scroll container and spans the full app width; its side padding uses --gut so the text does not move. */
.moa-outliner .sheet{background:none;border:1px solid transparent;padding:16px calc(var(--gut) + 28px) 120px calc(var(--gut) + 88px);flex:1;min-height:0;overflow:auto;cursor:default;scrollbar-width:thin;scrollbar-color:transparent transparent;transition:scrollbar-color .18s ease}
/* REQUIREMENT: Indent, Outdent, Undo and Redo are minimal icon-only buttons (arrows and circular arrows), no text labels, no border until hover. */
.moa-outliner .ic{background:none!important;border-color:transparent!important;color:var(--mute)!important;padding:3px 8px!important;font-size:18px!important;line-height:1.1}
.moa-outliner .ic:hover{color:var(--ink)!important;border-color:var(--line)!important}
/* REQUIREMENT (zoom title): the zoomed-in bullet is shown as a big editable heading above its children, aligned with the bullets.
   Its font size and weight are size level 0 (49px bold, see levelStyle()) in the two hierarchy modes, plain 16px in Plain Text mode; set by head(). Its line height is the shared textarea rule. */
.moa-outliner .head{flex:none;display:none;padding:7.5px calc(var(--gut) + 28px) 6.5px calc(var(--gut) + 88px)}
/* Owner override 2026-10-16 (R12-3A): balance the complete title in the first-row slot.
   The focused sheet border adds 1px below: 7.5px above = 6.5px + 1px below.
   Total 15px plus the title's extra 2px preserves the Home child anchor (16px + 1px). */
.moa-outliner .head.show{display:block}
.moa-outliner .head.show + .sheet{padding-top:0}
@container moa-outline (max-width:700px){.moa-outliner .head{padding-left:calc(var(--gut) + 56px)}}
.moa-outliner .head textarea{display:block;width:100%;flex:none;font-size:var(--fs);font-weight:var(--fw);padding:4px 4px;min-height:calc(var(--lh) + 8px);color:var(--ink)}
.moa-outliner .head textarea::placeholder{color:var(--mute)}
.moa-outliner .sheet.sb{scrollbar-color:var(--mute) transparent}
@container moa-outline (max-width:700px){.moa-outliner .sheet{padding-left:calc(var(--gut) + 56px)}}
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
.moa-outliner .row.drop-in{background:var(--halo);box-shadow:inset 0 0 0 1px var(--accent)}
.moa-outliner .dots{position:absolute;left:-47px;top:0;width:21px;height:var(--bh);display:flex;align-items:center;justify-content:center;line-height:1;background:none;border:0;color:var(--mute);cursor:pointer;padding:0;font-size:16px;opacity:0}
.moa-outliner .row:hover .dots,.moa-outliner .dots:focus-visible{opacity:1}
.moa-outliner .menu{position:fixed;display:none;z-index:20;background:var(--page);border:1px solid var(--line);border-radius:8px;padding:4px;box-shadow:0 6px 24px rgba(0,0,0,.25);min-width:170px;overflow-y:auto;overscroll-behavior:contain}
.moa-outliner .menu.show{display:block}
.moa-outliner .menu button{display:block;width:100%;text-align:left;font:inherit;font-size:14px;color:var(--ink);background:none;border:0;border-radius:5px;padding:6px 10px;cursor:pointer}
.moa-outliner .menu [hidden]{display:none}
.moa-outliner .menu button:hover{background:var(--btn)}
.moa-outliner .menu .sep{border-top:1px solid var(--line);margin:4px 0}
/* The three text style buttons at the top of the menu: a check mark (reserved width, so the labels stay aligned) shows the current one. */
.moa-outliner .menu button[data-m]::before{content:"";display:inline-block;width:1.3em}
.moa-outliner .menu button[data-m].on::before{content:"✓"}
.moa-outliner .arrow{position:absolute;left:-13px;top:0;width:16px;height:var(--bh);flex:none;display:flex;align-items:center;justify-content:center;line-height:1;background:none;border:0;color:var(--mute);cursor:pointer;padding:0;font-size:26px;opacity:0;transition:transform .12s,opacity .12s}
.moa-outliner .row:hover .arrow,.moa-outliner .arrow:focus-visible{opacity:1}
.moa-outliner:not(.ipad-safari) .arrow span{display:block;line-height:1;transition:transform .12s}
.moa-outliner:not(.ipad-safari) .arrow.open span{transform:rotate(90deg)}.moa-outliner .arrow.hide{visibility:hidden}
.moa-outliner .bullet{width:22px;height:var(--bh);flex:none;display:flex;align-items:center;justify-content:center;cursor:pointer}
.moa-outliner .bullet i{width:7px;height:7px;border-radius:50%;background:var(--ink);opacity:.75}
.moa-outliner .bullet:hover i{opacity:1}
.moa-outliner .bullet.closed::before{content:"";position:absolute;width:20px;height:20px;border-radius:50%;background:var(--halo);z-index:0}
.moa-outliner .bullet i{position:relative;z-index:1}
.moa-outliner .bullet{position:relative}
.moa-outliner textarea{flex:1;min-width:0;min-height:var(--bh);font:inherit;color:inherit;background:transparent;border:0;outline:0;resize:none;padding:3px 4px;overflow:hidden;line-height:var(--lh);display:block}
.moa-outliner .kids{margin-left:11px;padding-left:20px;border-left:1px solid var(--line)}
/* REQUIREMENT: export feedback is this small Copied toast, NOT a dialog. */
.moa-outliner .toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,8px);background:var(--page);color:var(--ink);border:1px solid var(--accent);border-radius:8px;padding:7px 14px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:30}
.moa-outliner .toast.show{opacity:1;transform:translate(-50%,0)}
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
const paneExpand = "<svg width=\"11\" height=\"11\" viewBox=\"0 0 11 11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 4V1H7\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M1 7V10H4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", paneMinimize = "<svg width=\"11\" height=\"11\" viewBox=\"0 0 11 11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 1V4H10\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M4 10V7H1\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>", paneToggle = "<svg width=\"18\" height=\"14\" viewBox=\"0 0 18 14\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n    <defs>\n      <filter id=\"ol-tog-glow\" x=\"-80%\" y=\"-20%\" width=\"260%\" height=\"140%\">\n        <feGaussianBlur in=\"SourceGraphic\" stdDeviation=\"1.4\" result=\"blur\"/>\n        <feMerge><feMergeNode in=\"blur\"/><feMergeNode in=\"SourceGraphic\"/></feMerge>\n      </filter>\n    </defs>\n    <rect x=\"0.75\" y=\"0.75\" width=\"16.5\" height=\"12.5\" rx=\"2.25\" stroke=\"currentColor\" stroke-width=\"1.5\"/>\n    <line x1=\"6.5\" y1=\"0.75\" x2=\"6.5\" y2=\"13.25\" stroke=\"currentColor\" stroke-width=\"1.5\"/>\n  </svg>";
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
<div class="menu" id="ol-topMenu"><button data-a="mode" data-m="plain" class="on">Plain Text</button><button data-a="mode" data-m="static">Static Hierarchy</button><button data-a="mode" data-m="dynamic">Dynamic Hierarchy</button><div class="sep" role="separator"></div><button data-a="expandAll">Expand All</button><button data-a="collapseAll">Collapse All</button><div class="sep" role="separator"></div><button data-a="exportVis">Export Visible</button><button data-a="exportFocus">Export Focus</button><button data-a="exportAll">Export All</button><div class="sep" role="separator"></div><button data-a="clearAll">Clear All</button></div>
<div class="menu" id="ol-menu"><button data-a="pinFocus">Pin Focus</button><div class="sep" data-group="pin" role="separator"></div><button data-a="expand">Expand All</button><button data-a="collapse">Collapse All</button><div class="sep" data-group="branches" role="separator"></div><button data-a="exportVis">Export Visible</button><button data-a="export">Export</button><div class="sep" data-group="export" role="separator"></div><button data-a="delete">Delete</button></div>
<div class="toast" id="ol-toast"></div>`;
// Session notices/persistent-storage request survive a destroy/remount.
let saveFailureShown = false, persistRequested = false;
function encodeNodeText(text, depth) {
  const lines = text.split('\n'), prefix = '  '.repeat(depth), out = [prefix + '- ' + lines.shift()];
  if (lines.length) {
    const bodyPrefix = prefix + '  ';
    out.push(bodyPrefix + '[desc]');
    lines.forEach(line => out.push(bodyPrefix + (/^\\/.test(line) || line === '[desc]' || line === '[/desc]' ? '\\' : '') + line));
    out.push(bodyPrefix + '[/desc]');
  }
  return out.join('\n');
}
function decodeDescriptionOutline(text) {
  const reject = { recognized: false }, raw = text.replace(/\r\n/g, '\n').split('\n');
  if (!raw.length || raw.some(line => /\r/.test(line) || /^[ ]*\t/.test(line))) return reject;
  const common = Math.min(...raw.filter(line => line.length).map(line => line.match(/^ */)[0].length));
  if (!Number.isFinite(common) || common % 2) return reject;
  const lines = raw.map(line => line.slice(common)), items = [], stack = [];
  let owner = null, ownerDepth = -1, mayDescribe = false, recognized = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], match = /^( *)(- )(.*)$/.exec(line);
    if (match) {
      const depth = match[1].length / 2;
      if (!Number.isInteger(depth) || depth > stack.length) return reject;
      owner = { text: match[3], children: [] }; ownerDepth = depth;
      if (depth === 0) items.push(owner); else stack[depth - 1].children.push(owner);
      stack.length = depth; stack.push(owner); mayDescribe = true; continue;
    }
    const prefix = '  '.repeat(ownerDepth + 1);
    if (!owner || !mayDescribe || line !== prefix + '[desc]') return reject;
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
  return recognized ? { recognized: true, items } : reject;
}

function splitNodeText(text) {
  const at = text.indexOf('\n');
  return at < 0 ? { title: text, description: '', hasDescription: false } : { title: text.slice(0, at), description: text.slice(at + 1), hasDescription: true };
}
function joinNodeText(parts) { return parts.title + (parts.hasDescription ? '\n' + parts.description : ''); }
function mount(container, opts = {}) {
if (!(container instanceof Element)) throw new TypeError('Outliner.mount requires an Element');
// Owner-approved iPad Safari exception. Identity is best-effort, never a viewport/pointer gate.
const ipadSafari = navigator.maxTouchPoints > 1 &&
  (/iPad/i.test(navigator.userAgent) || navigator.platform === 'MacIntel' && /Macintosh/i.test(navigator.userAgent)) &&
  /AppleWebKit/i.test(navigator.userAgent) && /Version\//i.test(navigator.userAgent) && /Safari\//i.test(navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Android|Edg\/|OPR\//i.test(navigator.userAgent);
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
function historyBullet(node) { return node instanceof Element && container.contains(node) && node.matches('#ol-tree textarea[data-id]'); }
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
let destroyed = false, resizeObserver = null, lastOwnedInteraction = false, historyShortcutOwned = false;
const timers = new Set(), frames = new Set(), listeners = new WeakMap(), globalListeners = [];
const hadHostClass = container.classList.contains('moa-outliner');
container.classList.add('moa-outliner');
if (ipadSafari) container.classList.add('ipad-safari');
const style = document.createElement('style'); style.textContent = css + descriptionCSS + (ipadSafari ? ipadCSS : '') + (opts.paneControls ? paneCSS : '') + (integratedHeader ? headerCSS : '');
const fragment = document.createElement('template'); fragment.innerHTML = originalHeader + template;
const ownedNodes = [...fragment.content.childNodes];
container.append(style, fragment.content);
function listen(target, type, fn, options) {
  const guarded = e => { if (!destroyed) fn(e); };
  target.addEventListener(type, guarded, options);
  const entry = [type, guarded, options];
  if (target === document || target === window || target === container) globalListeners.push([target, ...entry]);
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
  if (!visibleHost()) return false;
  if (headerSlot?.contains(e.target)) return false;
  if (container.contains(e.target)) return true;
  const a = document.activeElement, neutral = n => n === document.body || n === document.documentElement || n === null;
  return lastOwnedInteraction && (sel.size > 0 || (historyShortcut && historyShortcutOwned)) && neutral(e.target) && neutral(a) && !e.target?.isContentEditable;
}
function destroy() {
  if (destroyed) return;
  cancelTouch('destroy'); destroyed = true; lastOwnedInteraction = historyShortcutOwned = false;
  historyHost = null; hist.length = 0; typingSnapshot = null; historyBusy = historyPreparing = historyComposing = false;
  timers.forEach(id => window.clearTimeout(id)); timers.clear();
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
const subscribers = new Map(['change', 'toggle', 'zoom', 'paneAction', 'pinFocus'].map(event => [event, new Set()]));
let publicationReady = false, publicationQueued = false, changeTimer = null, revision = 0;
let immediateSnapshot, observedTree, publishedTree;
const transientToggles = new Map();
function getSnapshot() {
  const tree = [], stack = [{ nodes: root.children, into: tree }];
  while (stack.length) {
    const { nodes, into } = stack.pop();
    for (const n of nodes) {
      if (n === phNode && phOwner && phOwner.children.length === 1 && phOwner.children[0] === n && !n.text && !n.children.length) continue;
      const copy = { id: n.id, text: n.text, open: n.open, children: [] };
      into.push(copy); stack.push({ nodes: n.children, into: copy.children });
    }
  }
  return { zoomId: zoom === root ? null : zoom.id, tree };
}
function on(event, fn) {
  if (!subscribers.has(event) || typeof fn !== 'function') throw new TypeError('Expected change, toggle, zoom, paneAction or pinFocus and a callback');
  if (destroyed) return () => {};
  subscribers.get(event).add(fn);
  return () => subscribers.get(event).delete(fn);
}
function emit(event, payload) {
  for (const fn of [...subscribers.get(event)]) {
    if (destroyed) break;
    try { fn(event === 'toggle' ? { changes: payload.changes.map(c => ({ ...c })), transient: payload.transient } : { ...payload }); } catch (error) { /* A subscriber cannot interrupt editing or other subscribers. */ }
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
  container.querySelectorAll('.menu').forEach(menu => menu.classList.remove('show'));
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
      container.querySelectorAll('.menu').forEach(menu => menu.classList.remove('show'));
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
  immediateSnapshot = getSnapshot();
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
    const current = getSnapshot(), data = JSON.stringify(current.tree);
    const before = nodeStates(immediateSnapshot), after = nodeStates(current), changes = [];
    after.forEach((open, id) => { if (before.has(id) && before.get(id) !== open) changes.push({ id, open }); });
    const transientChanges = [];
    transientToggles.forEach((v, id) => { if (v.before !== v.open) transientChanges.push({ id, open: v.open }); });
    transientToggles.clear();
    const zoomChanged = current.zoomId !== immediateSnapshot.zoomId;
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
// 8. Text style (owner specified, top menu, three choices; a view setting only: not saved, not part of undo). Size levels: 0 = 49px bold, 1 = 28px bold (1.75x per level),
//    2 = 16px bold, 3 = 16px normal. A row at depth d has level base + d. See measureBase() and levelStyle().
//    Plain Text (default): every row and the zoom title is level 3, no hierarchy.
//    Static Hierarchy: depth 0, 1, 2 always get levels 0, 1, 2 (49px, 28px, 16px bold), deeper rows are normal. Zoomed: the title is level 0 and plays the role of
//    Home's depth 0, so depth 0, 1 get levels 1, 2 (28px bold, 16px bold) and deeper rows are normal.
//    Dynamic Hierarchy: the deepest shown row is always level 3 (normal), the row level above it is bold 16px, and so on up, never above the static levels. A view with
//    only one level is all normal 16px and the sizes grow as the user adds depth (side effect: text jumps when the visible depth changes).
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
let saveBlocked = false, blockedTree = null;

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
        ids.add(n.id); for (const child of n.children) stack.push(child);
      }
      root = updateUidFromTree(d.root);
      zoom = find(root, d.zoom) || root;
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
const snap = () => JSON.stringify({ root, zoom: zoom.id }, (k, v) => k === 'children' && phNode && v.length === 1 && v[0] === phNode && !phNode.text ? [] : v);
// Outline snapshots stay canonical strings; compound focus metadata exists only in history.
const outlineValue = entry => typeof entry === 'string' ? entry : entry?.outline;
function outlineHistoryIndex(i = hi) { while (i >= 0 && !outlineValue(hist[i])) i--; return i; }
function historyRootEqual(a, b) { return !!b && JSON.stringify(JSON.parse(a).root) === JSON.stringify(JSON.parse(b).root); }
function appendHistory(entry) {
  hist.length = hi + 1; hist.push(entry);
  if (hist.length > 300) {
    const baseline = hist[0]; hist.shift();
    if (typeof hist[0] !== 'string') hist[0] = outlineValue(hist[0]) || baseline;
  }
  hi = hist.length - 1;
}
let typingSnapshot = null;
function record(x = snap(), settleTyping = false) {
  const pending = tm && typingSnapshot; clearTimeout(tm); tm = null; typingSnapshot = null;
  // Owner V1.1 exception: a changed zoom is an outline history step, even with identical text.
  if (historyHost) {
    if (x === outlineValue(hist[outlineHistoryIndex()])) return;
    let focus = null;
    if ((!historyBusy || settleTyping) && typeof historyHost.reconcileFocus === 'function') {
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
    appendHistory(focus ? {outline:x,focus} : x); return;
  }
  if (x === hist[hi]) return; hist.length = hi + 1; hist.push(x); if (hist.length > 300) hist.shift(); hi = hist.length - 1;
}
function detachedHostValue(value) {
  const text = JSON.stringify(value);
  if (!text) throw new TypeError('Host history requires a JSON value');
  const copy = JSON.parse(text);
  if (!copy || typeof copy !== 'object' || Array.isArray(copy) || 'root' in copy || 'tree' in copy) throw new TypeError('Invalid host history value');
  return copy;
}
function commitHostHistory(edge) {
  if (!historyHost || destroyed || !container.isConnected || historyBusy || historyComposing || historyPreparing && historyPreparedCommit) return false;
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
    appendHistory({ before, after });
    if (historyPreparing) historyPreparedCommit = true;
    return true;
  } finally { historyBusy = false; }
}
function runHistory(direction) {
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
      hi = next; restore(outlineHistoryIndex());
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
    const value = snap();
    if (saveBlocked) {
      if (JSON.stringify(JSON.parse(value).root) === blockedTree) return;
      saveBlocked = false;
    }
    localStorage.setItem(KEY, value);
  } catch (e) {
    reportSaveFailure();
  }
}
function save(typing) {
  flushSave();
  if (typing) { typingSnapshot = snap(); clearTimeout(tm); tm = setTimeout(record, 500); } else record();
  schedulePublication();
}
function restore(i) {
  const value = outlineValue(hist[i]), d = JSON.parse(value);
  const viewOnly = d.zoom !== zoom.id && historyRootEqual(snap(), value);
  if (viewOnly) blurOutlineText();
  // Search state is keyed by node objects, and undo/redo rebuilds every node: carry it over by id so bullets typed during a search stay visible.
  const keepIds = [...sKeep].map(n => n.id), overIds = [...sOver].map(([n, v]) => [n.id, v]);
  root = updateUidFromTree(d.root); zoom = find(root, d.zoom) || root; sel.clear();
  sKeep.clear(); keepIds.forEach(id => { const n = find(root, id); if (n) sKeep.add(n); });
  sOver.clear(); overIds.forEach(([id, v]) => { const n = find(root, id); if (n) sOver.set(n, v); });
  const a = viewOnly || ipadToolbarHistoryNoFocus || historyHost && !visibleHost() ? null : ownedActiveElement(); render(a && a.dataset && a.dataset.id ? +a.dataset.id : null);
}
function undo() { if (tm) record(); if (hi > 0) restore(--hi); }
function redo() { if (tm) record(); if (hi < hist.length - 1) restore(++hi); }

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
function buildPar(n) { n.children.forEach(c => { par.set(c, n); buildPar(c); }); }
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
const isOpen = n => searching() ? (sOver.has(n) ? sOver.get(n) : sAnc.has(n)) : n.open;
const setNodeOpen = (n, o) => { const before = isOpen(n), transient = searching(); if (searching()) sOver.set(n, o); else n.open = o; observeToggle(n, before, isOpen(n), transient); };
function shownKids(n) {
  if (!searching()) return n === zoom || n.open ? n.children : [];
  if (n !== zoom && !isOpen(n)) return [];
  return n !== zoom && sOver.get(n) === true ? n.children : n.children.filter(c => sShown.has(c));
}
function vis() { const o = []; (function w(n) { for (const c of shownKids(n)) { o.push(c); w(c); } })(zoom); return o; }
const esc = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Backdrop markup for the textarea: same text, transparent, with the matches wrapped in <mark>. The trailing newline keeps a last empty line's height.
const el = (t, c) => { const e = document.createElement(t); if (c) e.className = c; return e; };
// Height is measured before the web font loads, so it is re-measured once fonts are ready (see the end of the script).
// scrollTop is reset because a leftover internal scroll offset shifts the caret upward and clips it on an empty bullet.
const fit = t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; t.scrollTop = 0; };

// Size level of the first row (depth 0) of the current view (level 0 is the biggest), chosen by the text style (mode, see requirement 8).
// top = the smallest level depth 0 may use: 0 at Home, 1 when zoomed because the title already is level 0.
// Recomputed on every render, so expanding, collapsing, searching and zooming are all followed. Nothing is stored on the bullet.
const PLAIN = 3; // the size level of plain text: 16px, normal weight
let base = 0, mode = 'plain';
function measureBase() {
  const top = zoom === root ? 0 : 1;
  if (mode === 'plain') base = PLAIN;
  else if (mode === 'static') base = top;
  else base = Math.max(top, PLAIN - vis().reduce((m, n) => Math.max(m, depthOf(n)), 0));
}
// Text metrics for a size level: every level above PLAIN (0, 1, 2) is bold; the size grows 1.75x per level for levels 0 and 1 (1.75 x 1.75 x 16px, 1.75 x 16px), then the 16px default.
// Line height keeps the default 22/16 ratio; the row height adds the 6px of vertical padding so the dots stay centred on the first line.
function levelStyle(lvl) {
  const fs = 16 * Math.pow(1.75, Math.max(0, PLAIN - 1 - lvl)), lh = Math.round(fs * 22 / 16);
  return { '--fs': fs + 'px', '--lh': lh + 'px', '--bh': (lh + 6) + 'px', '--fw': lvl < PLAIN ? 600 : 400 };
}
const setLevel = (e, lvl) => Object.entries(levelStyle(lvl)).forEach(([k, v]) => e.style.setProperty(k, v));

// Shared row/head editor binding. Canonical offsets never depend on the active field.
function readEditorRange(n, textarea) {
  const role = textarea.dataset.role || 'title', offset = role === 'description' ? splitNodeText(n.text).title.length + 1 : 0;
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
  const { host, title, getNode, head } = binding, n = getNode(), parts = splitNodeText(n.text);
  if (title.value !== parts.title) title.value = parts.title;
  host.classList.toggle('has-description', parts.hasDescription);
  if (parts.hasDescription && !binding.description) {
    const field = el('div', 'description-field'), t = el('textarea'); setLevel(field, PLAIN);
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
function focusEditor(binding, pos) {
  const n = binding.getNode(), p = pos == null ? n.text.length : Math.max(0, Math.min(pos, n.text.length)), parts = splitNodeText(n.text);
  const desc = parts.hasDescription && p > parts.title.length, t = desc ? binding.description : binding.title, local = desc ? p - parts.title.length - 1 : p;
  if (!t) return; t.focus(); t.setSelectionRange(local, local);
}
function bindField(binding, t) {
  const isBreak = e => e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph';
  let soft = false, composing = false, pendingBreak = null;
  const writeField = () => {
    const n = binding.getNode(), parts = { title: binding.title.value, description: binding.description ? binding.description.value : '', hasDescription: !!binding.description };
    if (t.dataset.role === 'description') parts.description = t.value; else parts.title = t.value;
    n.text = joinNodeText(parts); if (searching() && !binding.head) sKeep.add(n);
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
    } else if (intent.kind === 'navigate') {
      if (range.role === 'description' && t.selectionStart !== t.selectionEnd) {
        t.setRangeText('', t.selectionStart, t.selectionEnd, 'end');writeField();refreshNodeEditor(binding);crumbs();save(true);
      }
      toFirst();
    }
    else enter(n, range);
  };
  listen(t, 'beforeinput', e => {
    pendingBreak = null;
    if (composing || e.isComposing || historyComposing || soft || !isBreak(e)) return;
    // Interior description Enter is a native newline, preserving native header Undo.
    if (enterIntent(binding.getNode(), readEditorRange(binding.getNode(), t), binding.head).kind === 'newline') { soft = true; return; }
    if (e.cancelable) { e.preventDefault(); applyBreak(); }
    else pendingBreak = { value: t.value, start: t.selectionStart, end: t.selectionEnd };
  });
  listen(t, 'input', e => {
    const wasSoft = soft; soft = false;
    if (!composing && !e.isComposing && !historyComposing && !wasSoft && isBreak(e)) {
      const parts = splitNodeText(binding.getNode().text), old = pendingBreak || {
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
    const role = t.dataset.role, local = t.selectionStart, n = writeField();
    if (composing || e.isComposing || historyComposing) { fit(t); save(true); return; }
    const hasNewTitleLF = role === 'title' && t.value.includes('\n');
    refreshNodeEditor(binding);
    if (hasNewTitleLF) focusEditor(binding, wasSoft ? splitNodeText(n.text).title.length + 1 : local);
    if (binding.head) crumbs(); save(true);
  });
  listen(t, 'keydown', e => {
    if (composing || e.isComposing || e.keyCode === 229 || historyComposing) { soft = false; return; }
    soft = (e.key === 'Enter' || e.keyCode === 13) && e.shiftKey && !e.ctrlKey && !e.metaKey;
    const n = binding.getNode(), range = readEditorRange(n, t), parts = splitNodeText(n.text), collapsed = range.start === range.end;
    if (soft) return; // native insertion, then split only the local editor on input
    if ((e.key === 'Enter' || e.keyCode === 13) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (enterIntent(n, range, binding.head).kind === 'newline') { soft = true; return; }
      e.preventDefault(); applyBreak(); return;
    }
    if (collapsed && ((e.key === 'Backspace' && range.role === 'description' && t.selectionStart === 0) || (e.key === 'Delete' && range.role === 'title' && parts.hasDescription && t.selectionEnd === t.value.length))) {
      e.preventDefault(); n.text = parts.title + parts.description; refreshNodeEditor(binding); focusEditor(binding, parts.title.length); if (binding.head) crumbs(); save(true); return;
    }
    if (!e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && ((e.key === 'ArrowDown' && range.role === 'title' && parts.hasDescription) || (e.key === 'ArrowUp' && range.role === 'description' && (t.selectionStart === 0 || t.value.lastIndexOf('\n', t.selectionStart - 1) === -1)))) {
      e.preventDefault(); focusEditor(binding, range.role === 'title' ? parts.title.length + 1 + Math.min(t.selectionStart, parts.description.indexOf('\n') < 0 ? parts.description.length : parts.description.indexOf('\n')) : Math.min(t.selectionStart, parts.title.length)); return;
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
function render(focusId, pos) {
  // The empty placeholder bullet must exist before the parent map is built; otherwise it has no parent,
  // and Enter, Tab, paste and Backspace all fail on it until some later redraw.
  if (phNode && phOwner !== zoom) {
    if (!phNode.text && !phNode.children.length && phOwner.children.length === 1 && phOwner.children[0] === phNode) phOwner.children.length = 0;
    phNode = phOwner = null;
  }
  if (!zoom.children.length) { phNode = mk(); phOwner = zoom; zoom.children.push(phNode); }
  par = new Map(); buildPar(root);
  // Drop selection / anchor entries that are gone or outside the current view; a stale selection used to swallow Enter, Delete and Tab.
  for (const n of [...sel]) { let x = n; while (x && x !== zoom) x = par.get(x); if (!x) sel.delete(n); }
  if (anchor && !par.has(anchor)) anchor = null; if (cursor && !par.has(cursor)) cursor = null;
  els.clear(); const tree = container.querySelector('#ol-tree'); tree.innerHTML = '';
  if (searching()) computeSets();
  measureBase();
  shownKids(zoom).forEach(c => tree.appendChild(row(c, false, 0)));
  if (searching() && !tree.firstChild) { const m = el('div', 'nomatch'); m.textContent = 'No matches'; tree.appendChild(m); }
  tree.querySelectorAll('textarea').forEach(fit);
  crumbs(); head(); save();
  if (focusId) focusNode(focusId, pos);
}
// Big title for the bullet you zoomed into (hidden at Home). It edits that bullet's text.
const titleEl = container.querySelector('#ol-title'), headEl = container.querySelector('#ol-head');
let headBinding = null;
function head() {
  const on = zoom !== root; headEl.classList.toggle('show', on);
  if (!on) return;
  setLevel(headEl, mode === 'plain' ? PLAIN : 0);
  if (!headBinding) { const host = el('div', 'tw'); titleEl.before(host); host.appendChild(titleEl); headBinding = bindNodeEditor(host, zoom, true, titleEl); }
  else refreshNodeEditor(headBinding);
}
const toFirst = () => { const c = zoom.children[0]; if (c) focusNode(c.id, 0); };
function focusNode(id, pos) {
  const n = find(root, +id), r = n && els.get(n), host = r && r.querySelector('.tw');
  if (host && host._nodeEditor) focusEditor(host._nodeEditor, pos);
}
// Shared bullet/breadcrumb navigation: separate pending typing from the view step.
function blurOutlineText() {
  const a = ownedActiveElement(); if (a && a.tagName === 'TEXTAREA') a.blur();
}
function navigate(n) {
  blurOutlineText();
  if (n === zoom) return;
  record(); zoom = n; render();
}
// REQUIREMENT (breadcrumb abbreviation), in this order:
// 1. Everything fits: show the full path.
// 2. Too long: names shrink with an ellipsis first (ancestors down to ANC px, the current one down to CUR px) so the user still sees enough of each.
// 3. Still too long: fold the middle into one ellipsis, one crumb at a time, giving Home > ... > parent > this node, finally Home > ... > this node.
// 4. Even that does not fit: the current name shrinks further.
// Recomputed on window resize and when fonts load. The line must stay a single line.
function crumbs() {
  const c = container.querySelector('#ol-crumbs');
  const path = []; for (let n = zoom; n; n = par.get(n)) path.unshift(n);
  // h = how many crumbs right after Home are folded into "…"
  const draw = h => {
    c.innerHTML = '';
    path.forEach((n, i) => {
      if (h && i >= 1 && i <= h) {
        if (i === 1) {
          c.appendChild(document.createTextNode('›'));
          const e = el('span', 'ell'); e.textContent = '…'; e.title = path.slice(1, h + 1).map(x => splitNodeText(x.text).title || 'Untitled').join(' › '); c.appendChild(e);
        }
        return;
      }
      if (i) c.appendChild(document.createTextNode('›'));
      const a = el('a'); a.textContent = n === root ? 'Home' : (splitNodeText(n.text).title || 'Untitled'); a.title = a.textContent;
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

// d = depth of this row in the current view (0 = top level), used only for text size and weight.
function row(n, inSel, d) {
  const wrap = el('div', 'node'); wrap.dataset.id = n.id;
  const r = el('div', 'row'); const selOn = inSel || sel.has(n); if (selOn) r.classList.add('sel'); els.set(n, r);
  setLevel(r, base + d);
  const ar = el('button', 'arrow' + (n.children.length ? '' : ' hide') + (isOpen(n) ? ' open' : ''));
  const glyph = document.createElement('span'); glyph.textContent = '▸'; ar.appendChild(glyph); ar.tabIndex = -1; ar.title = 'Collapse / expand (Ctrl+click: all levels)';
  // REQUIREMENT: Ctrl/Cmd+click on the triangle = expand all / collapse all for this bullet and everything below it.
  // The click must not select the row (see the row mousedown handler below, which skips the arrow).
  // Ctrl/Cmd+click expands or collapses this bullet and everything under it.
  ar.onclick = e => { const o = !isOpen(n); if (e.ctrlKey || e.metaKey) setOpen(n, o); else setNodeOpen(n, o); render(); };
  const bu = el('a', 'bullet' + (n.children.length && !isOpen(n) ? ' closed' : '')); bu.innerHTML = '<i></i>'; bu.title = 'Zoom in';
  // Owner V1.1 exception: bullet navigation opens the view without starting text entry.
  bu.onclick = () => navigate(n);
  const tw = el('div', 'tw'); bindNodeEditor(tw, n);
  // The ... button on each bullet opens the bullet menu. DO NOT add mousedown preventDefault to it or to the triangle (rejected, see summary at the top).
  const dt = el('button', 'dots'); dt.textContent = '⋯'; dt.tabIndex = -1; dt.title = 'More';
  dt.onclick = e => { e.stopPropagation(); openMenu(n, dt); };
  bu.draggable = true;
  bu.ondragstart = e => { dragSet = sel.has(n) ? roots() : [n]; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', toText(dragSet)); e.dataTransfer.setDragImage(r, 10, 10); r.classList.add('dragging'); };
  bu.ondragend = () => { dragSet = null; clearDrop(); r.classList.remove('dragging'); };
  // Ctrl/Cmd/Shift+click multi-selects rows, EXCEPT when the click is on the triangle (.arrow): that is the expand-all shortcut and must not select.
  listen(r, 'mousedown', e => { if ((e.shiftKey || e.ctrlKey || e.metaKey) && !e.target.closest('.arrow')) { e.preventDefault(); pick(n, e); } });
  r.append(dt, ar, bu, tw); wrap.appendChild(r);
  const kk = shownKids(n);
  if (kk.length) {
    const k = el('div', 'kids'); kk.forEach(c => k.appendChild(row(c, selOn, d + 1))); wrap.appendChild(k);
  }
  return wrap;
}

const rm = n => { const p = par.get(n); p.children.splice(p.children.indexOf(n), 1); };
function indent(n) {
  const p = par.get(n), i = p.children.indexOf(n); if (!i) return false;
  const prev = p.children[i - 1]; p.children.splice(i, 1); prev.children.push(n); prev.open = true; return true;
}
function outdent(n) {
  const p = par.get(n); if (!p || p === zoom) return false;
  const g = par.get(p); rm(n); g.children.splice(g.children.indexOf(p) + 1, 0, n); return true;
}
// The bullet that toolbar buttons act on: the last one that had the caret, else the last visible one.
const cur = () => { const l = vis(); return l.includes(anchor) ? anchor : l[l.length - 1]; };
// Indent / outdent the selection, or the current bullet when nothing is selected. Shared by Tab, Alt+Arrows and the toolbar.
function tab(back) {
  const it = sel.size ? roots() : [cur()]; if (!it[0]) return;
  // All or none: indent needs a previous sibling for EVERY selected item; outdent is impossible if ANY selected item is at the top level of the view.
  if (!back && !it.every(n => par.get(n).children.indexOf(n) > 0)) return;
  if (back && it.some(n => par.get(n) === zoom)) return;
  const active = ownedActiveElement(), t = sel.size ? null : active && active.matches(`textarea[data-id="${it[0].id}"]`) ? active : container.querySelector(`#ol-tree textarea[data-id="${it[0].id}"]`), pos = t ? readEditorRange(it[0], t).start : null;
  (back ? it.slice().reverse() : it).forEach(n => back ? outdent(n) : indent(n));
  render(sel.size ? null : it[0].id, pos);
}
// Split the bullet at the caret into a new bullet (or outdent when the bullet is empty). Shared by Enter and the toolbar.
// Current owner override: split titles into same-level siblings; descriptions keep their own newlines.
function enterIntent(n, t, head = false) {
  const parts = splitNodeText(t.value), start = t.selectionStart, end = t.selectionEnd;
  const text = t.value.slice(0, start) + t.value.slice(end);
  if (t.role === 'description') return { kind: start < text.length ? 'newline' : head ? 'navigate' : 'insert', text, start };
  if (head) return { kind: 'navigate', text, start };
  if (!text && !n.children.length && par.get(n) !== zoom) return { kind: 'outdent', text, start };
  return { kind: start === 0 || start < parts.title.length - (end - start) ? 'split' : 'insert', text, start };
}
function enter(n, t) {
  const p = par.get(n), intent = enterIntent(n, t), parts = splitNodeText(intent.text);
  record(); // Commit pending typing before the single structural history step.
  if (intent.kind === 'outdent') { n.text = intent.text; outdent(n); render(n.id, 0); return; }
  if (intent.kind === 'newline') {
    n.text = intent.text.slice(0, intent.start) + '\n' + intent.text.slice(intent.start); render(n.id, intent.start + 1); return;
  }
  if (intent.kind === 'split') {
    const upper = mk(parts.title.slice(0, intent.start));
    n.text = joinNodeText({ ...parts, title: parts.title.slice(intent.start) });
    p.children.splice(p.children.indexOf(n), 0, upper);
    if (searching()) { sKeep.add(n); sKeep.add(upper); }
    render(intent.start === 0 ? upper.id : n.id, 0); return;
  }
  n.text = intent.text; const nn = mk();
  if (searching()) { sKeep.add(n); sKeep.add(nn); }
  if (isOpen(n) && n.children.length) n.children.unshift(nn);
  else p.children.splice(p.children.indexOf(n) + 1, 0, nn);
  render(nn.id, 0);
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
  if (f >= .33 && f <= .67) { const n = list[i]; dropT = { parent: n, before: null, open: true }; dropIn = els.get(n); dropIn.classList.add('drop-in'); return; }
  const g = f < .5 ? i : i + 1, p = list[g - 1], nx = list[g];
  let ref, ry, t, childIndent = 0;
  if (!p || (nx && par.get(nx) === p)) { ref = nx; ry = rects[g].top; t = { parent: par.get(nx), before: nx }; }
  // Owner-approved leaf-gap enhancement (2026-10-16): 32px is the existing .kids margin + border + padding.
  else if (!p.children.length && e.clientX >= rects[g - 1].left + (touchGesture?.active ? 31.5 : (32 + 10) / 2)) {
    ref = p; ry = rects[g - 1].bottom; childIndent = touchGesture?.active ? 48 : 32; t = { parent: p, before: null, open: true };
  }
  else {
    const chain = []; let a = p;
    for (let k = depthOf(p), lo = nx ? depthOf(nx) : 0; k >= lo && a; k--, a = par.get(a)) chain.push(a);
    if (!chain.length) chain.push(p);
    ref = chain.find(a => e.clientX >= els.get(a).getBoundingClientRect().left + 10) || chain[chain.length - 1];
    const pp = par.get(ref); ry = rects[g - 1].bottom; t = { parent: pp, before: nextFree(pp, pp.children.indexOf(ref) + 1) };
  }
  dropT = t;
  const rr = els.get(ref).getBoundingClientRect(), sh = treeEl.getBoundingClientRect();
  if (ry < sh.top || ry > sh.bottom) return;
  Object.assign(dropLine.style, { display: 'block', left: rr.left + childIndent + 'px', width: rr.width - childIndent + 'px', top: ry - 1 + 'px' });
}
function dropTo(items, t) {
  items.forEach(rm);
  if (t.open) t.parent.open = true;
  const k = t.parent.children, i = t.before ? k.indexOf(t.before) : k.length;
  k.splice(i < 0 ? k.length : i, 0, ...items); render(null);
}
listen(treeEl, 'dragover', e => { if (!dragSet) return; aimDrop(e); if (dropT) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
listen(treeEl, 'dragleave', e => { if (!treeEl.contains(e.relatedTarget)) clearDrop(); });
listen(treeEl, 'drop', e => { if (!dragSet) return; e.preventDefault(); const t = dropT, items = dragSet; dragSet = null; clearDrop(); if (t) dropTo(items, t); });
function delItems(items) {
  const idx = vis().indexOf(items[0]); items.forEach(rm); sel.clear(); render(null);
  const l = vis(), f = l[Math.max(0, Math.min(idx - 1, l.length - 1))]; if (f) focusNode(f.id);
}
// Bullet menu. Wording is a requirement: Expand All / Collapse All act on this bullet's subtree, Export Visible, Export, Delete.
const menu = container.querySelector('#ol-menu');
let pinnedFocusId = null, menuNode = null;
function setPinnedFocus(nodeId) {
  if (nodeId !== null && !Number.isInteger(nodeId)) throw new TypeError('Expected a pinned node ID or null');
  if (destroyed) return;
  pinnedFocusId = nodeId;
  menu.querySelector('[data-a="pinFocus"]').textContent = menuNode?.id === pinnedFocusId ? 'Unpin Focus' : 'Pin Focus';
}
function openMenu(n, b) {
  menuNode = n; menuT = sel.has(n) ? roots() : [n]; const r = b.getBoundingClientRect();
  const placeholder = !subscribers.get('pinFocus').size || n === phNode && phOwner && phOwner.children.length === 1 && !n.text && !n.children.length;
  menu.querySelector('[data-a="pinFocus"]').hidden = placeholder;
  menu.querySelector('[data-group="pin"]').hidden = placeholder; setPinnedFocus(pinnedFocusId);
  // Owner V1.1 override of the historical full-menu requirement: use actual subtree depth,
  // not the currently expanded/search-filtered rows. Selected roots share one menu policy.
  const hasChildren = menuT.some(n => n.children.length), hasGrandchildren = menuT.some(n => n.children.some(c => c.children.length));
  menu.querySelectorAll('[data-a="expand"],[data-a="collapse"]').forEach(b => { b.hidden = !hasGrandchildren; });
  menu.querySelector('[data-a="exportVis"]').hidden = !hasChildren;
  menu.querySelector('[data-group="branches"]').hidden = !hasGrandchildren;
  menu.querySelector('[data-group="export"]').hidden = !hasChildren;
  topMenu.classList.remove('show'); positionMenu(menu, r);
}
const setOpen = (n, o) => { if (n.children.length) setNodeOpen(n, o); n.children.forEach(c => setOpen(c, o)); };
menu.onclick = e => {
  const a = e.target.dataset.a; if (!a) return; menu.classList.remove('show');
  if (a === 'pinFocus') { if (menuNode && !menu.querySelector('[data-a="pinFocus"]').hidden) emit('pinFocus', {nodeId:menuNode.id,action:menuNode.id===pinnedFocusId?'unpin':'pin'}); }
  else if (a === 'delete') delItems(menuT); else if (a === 'export') exportText(menuT, false); else if (a === 'exportVis') exportText(menuT, true); else { menuT.forEach(n => setOpen(n, a === 'expand')); render(); }
};
listen(document, 'click', e => { if (menu.classList.contains('show') && !menu.contains(e.target)) menu.classList.remove('show'); if (topMenu.classList.contains('show') && !topMenu.contains(e.target)) topMenu.classList.remove('show'); });

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
  if (isEnter && !e.shiftKey && !mod) {
    e.preventDefault(); enter(n, t); return;
  }
  if (e.key === 'Backspace' && pos === 0 && end === 0) {
    const list = vis(), i = list.indexOf(n), prev = list[i - 1];
    if (!n.children.length && prev) {
      e.preventDefault();
      const at = prev.text.length; prev.text += n.text; if (searching()) sKeep.add(prev); rm(n); render(prev.id, at);
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
      if (n.children.length) { setNodeOpen(n, !up); render(n.id, pos); }
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
function insertItems(items, target, replaceEmpty) {
  const p = par.get(target); let last;
  if (replaceEmpty && !target.text.trim() && !target.children.length) {
    target.text = items[0].text; target.children = items[0].children;
    p.children.splice(p.children.indexOf(target) + 1, 0, ...items.slice(1));
    last = items.length > 1 ? items[items.length - 1] : target;
  } else { p.children.splice(p.children.indexOf(target) + 1, 0, ...items); last = items[items.length - 1]; }
  if (searching()) { sKeep.add(target); items.forEach(i => sKeep.add(i)); }
  sel.clear(); render(last.id);
}
listen(document, 'paste', e => {
  if (!ownsEvent(e)) return;
  if (!e.clipboardData || (e.target && (e.target.id === 'ol-qIn' || e.target.closest('#ol-head')))) return;
  const text = e.clipboardData.getData('text/plain'), html = e.clipboardData.getData('text/html');
  if (historyComposing) return;
  const decoded = decodeDescriptionOutline(text);
  const instantiate = item => { const n = mk(item.text); n.children = item.children.map(instantiate); return n; };
  let items = decoded.recognized ? decoded.items.map(instantiate) : /<li[\s>]/i.test(html) ? parseHtml(html) : [];
  if (!items.length) items = parseOutline(text);
  if (!items.length) return;
  // The event target is the focused bullet even inside sandboxed frames where document.activeElement can be stale.
  const a = e.target && e.target.tagName === 'TEXTAREA' && e.target.dataset.id ? e.target : null;
  if (!decoded.recognized && a && items.length === 1 && !items[0].children.length) return; // single line: normal paste
  let target = a ? find(root, +a.dataset.id) : null;
  if (!target && sel.size) { const r = roots(); target = r[r.length - 1]; }
  if (!target) target = cur();
  if (!target) return;
  e.preventDefault();
  insertItems(items, target, !!a);
}, true);

// REQUIREMENT: export text is always 2-space indent and a "- " prefix. Not configurable. visible=true skips children of collapsed bullets.
// REQUIREMENT (top menu Export All / Export Visible, list = null): exports only the current zoom, but when zoomed into a bullet that bullet itself is the
// depth 0 line and its children are indented under it (Node D, then E F G under it). At Home there is no header line, only the top-level bullets.
// Plain text export: 2-space indent, "- " prefix. With visible = true, children of collapsed bullets are left out.
function toText(list, visible) {
  const out = [];
  (function w(l, d) { for (const n of l) { if (n === phNode && !n.text) continue; out.push(encodeNodeText(n.text, d)); w(visible ? shownKids(n) : n.children, d + 1); } })(list || (zoom !== root ? [zoom] : visible ? shownKids(zoom) : zoom.children), 0);
  return out.join('\n');
}
const toastEl = container.querySelector('#ol-toast'); let toastT;
function toast(m) { if (destroyed) return; toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 1400); }
async function copyText(s) {
  if (destroyed) return false;
  try { await navigator.clipboard.writeText(s); return !destroyed; } catch (e) {}
  if (destroyed) return false;
  const t = document.createElement('textarea'); t.value = s; t.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  container.appendChild(t); t.select(); let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) {} t.remove(); return ok;
}
// Export = copy immediately and show a toast. DO NOT bring back a popup or modal.
async function exportText(list, visible) { const s = toText(list, visible); toast(!s ? 'Nothing to export' : (await copyText(s)) ? 'Copied to clipboard' : 'Copy failed'); }
// Escape closes whichever menu is open (top menu or bullet menu).
listen(document, 'keydown', e => { if (!ownsEvent(e)) return; if (e.key === 'Escape') { topMenu.classList.remove('show'); menu.classList.remove('show'); } });
function setAll(open) { (function w(n) { n.children.forEach(c => { if (c.children.length) setNodeOpen(c, open); w(c); }); })(zoom); render(); }
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
moreBtn.onclick = e => {
  e.stopPropagation(); menu.classList.remove('show');
  if (topMenu.classList.contains('show')) topMenu.classList.remove('show');
  else positionMenu(topMenu, moreBtn.getBoundingClientRect(), true);
};
topMenu.onclick = e => {
  const a = e.target.dataset.a; if (!a) return; topMenu.classList.remove('show');
  if (a === 'mode') { mode = e.target.dataset.m; topMenu.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b === e.target)); render(); }
  else if (a === 'clearAll') clearAll();
  else if (a === 'expandAll') setAll(true); else if (a === 'collapseAll') setAll(false);
  // Current owner override: Export Focus retains historical zoom scope; Export All uses Home.
  else if (a === 'exportAll') exportText(root.children, false);
  else if (a === 'exportFocus' || a === 'exportVis') exportText(null, a === 'exportVis');
};

// Clear the complete Home tree, with one history entry even after recent typing.
function clearAll() {
  record();
  root.children.length = 0; zoom = root; phNode = phOwner = null;
  sel.clear(); anchor = cursor = null;
  saveBlocked = false;
  const wasSearching = searching(); endSearch();
  if (!wasSearching) render();
  toast('Cleared');
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
  if (e.target && (e.target.id === 'ol-qIn' || e.target.closest('#ol-head'))) return; // the search box and title keeps its own Ctrl+A / Ctrl+Z
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
  if (historyShortcut) {
    e.preventDefault(); (k === 'y' || e.shiftKey) ? redo() : undo();
    // Restore can remove the focused row. Keep only history keys owned; never focus a replacement.
    const a = document.activeElement;
    historyShortcutOwned = a === document.body || a === document.documentElement || a === null;
    return;
  }
  if (mod && k === 'a') { e.preventDefault(); const l = vis(); anchor = l[0]; cursor = l[l.length - 1]; setSel(new Set(l)); return; }
  // With no selection this handler stops here. DO NOT add code that focuses a bullet when typing or Enter is pressed with nothing focused (rejected: it causes mistypes).
  if (!sel.size) return;
  if (e.key === 'Enter') { e.preventDefault(); const r = roots(), t = r[r.length - 1]; setSel(new Set()); if (t) focusNode(t.id); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); delItems(roots()); }
  else if (e.key === 'Escape') { setSel(new Set()); if (anchor) focusNode(anchor.id); }
  else if (mod && (k === 'c' || k === 'x')) { e.preventDefault(); const it = roots();
    // Cut removes the bullets ONLY after the copy succeeded (the copy is asynchronous and can be refused).
    copyText(toText(it)).then(ok => { if (destroyed || k !== 'x') return; const live = it.filter(n => par.has(n)); if (ok) { if (live.length) delItems(live); } else toast('Copy failed, nothing was cut'); }); }
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
function syncSearchAction() {
  if (!integratedHeader) return;
  const active = searching();
  searchAction.textContent = active ? '×' : '↵';
  searchAction.title = active ? 'Clear search' : 'Submit search';
  searchAction.setAttribute('aria-label', searchAction.title);
}
function startSearch(v) {
  v = v.trim(); if (!v) { endSearch(); return; }
  sq = v; sOver.clear(); sKeep.clear(); sel.clear(); qBox.classList.add('on'); qIn.blur(); syncSearchAction(); render();
}
function endSearch() {
  const was = searching();
  sq = ''; sShown.clear(); sAnc.clear(); sOver.clear(); sKeep.clear(); qIn.value = ''; qBox.classList.remove('on'); syncSearchAction();
  if (was) { sel.clear(); render(); }
}
listen(qIn, 'keydown', e => {
  if (e.isComposing || e.keyCode === 229 || searchComposing) return;
  if (e.key === 'Enter') { e.preventDefault(); startSearch(qIn.value); }
  else if (e.key === 'Escape' && searching()) { e.preventDefault(); endSearch(); }
});
if (integratedHeader) {
  listen(qIn, 'compositionstart', () => { searchComposing = true; });
  listen(qIn, 'compositionend', () => { searchComposing = false; });
  listen(searchAction, 'pointerdown', () => { searchPressBlocked = searchComposing; });
  listen(searchAction, 'pointercancel', () => { searchPressBlocked = false; });
  listen(searchAction, 'keydown', e => { if (e.key === 'Enter' || e.key === ' ') searchPressBlocked = searchComposing || e.isComposing || e.keyCode === 229; });
  listen(searchAction, 'click', e => {
    const blocked = searchPressBlocked || searchComposing || e.isComposing;
    searchPressBlocked = false;
    if (blocked) return;
    if (searching()) endSearch(); else startSearch(qIn.value);
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
    const textareas = [...container.querySelectorAll('#ol-tree textarea, #ol-head textarea')];
    // Sequential fit preserves native scroll anchoring when the sheet is scrolled.
    if (treeEl.scrollTop) textareas.forEach(fit);
    else {
      textareas.forEach(t => { t.style.height = 'auto'; });
      const heights = textareas.map(t => t.scrollHeight);
      textareas.forEach((t, i) => { t.style.height = heights[i] + 'px'; });
      textareas.forEach(t => { t.scrollTop = 0; });
    }
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
  const row = e.target.closest('.row'), excluded = e.target.closest('.arrow,.dots,.menu');
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
return { on, getSnapshot, destroy, reportSaveFailure, setPaneMode, commitHostHistory, runHistory, setPinnedFocus };
}
window.Outliner = { version: '1.8.2', apiVersion: 1, capabilities: ['snapshot-v1', 'change-event', 'toggle-event', 'zoom-event', 'storage-feedback', 'pane-controls', 'header-content', 'host-history', 'pin-focus-menu-v1', 'outline-focus-history-v1'], mount };
})();
