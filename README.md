# MindMapOutliner

Open `index.html` by double-clicking it. Keep these four files together: `index.html`, `outliner.js`, `mindmap.js`, `README.md`. No server, build, framework, bundler or installation is required. The complete Outliner is the source of truth; Mind Map is its live view. This folder is the entire upload package.

Use a current browser supporting classic scripts, canvas, ResizeObserver, container queries, Pointer Events and CSS color-mix. Browser zoom remains enabled. Internet/cache access is needed for the original fonts and PDF resources; local scripts and editing do not require a network connection.

## Views and controls

Startup uses logical SPLIT: 35% of workspace width, clamped to **346px editor / 346px map** when width is at least **692px**, in every orientation. The header contains the original M/brand, equal Sync collapse / Sync focus buttons, Expand/Shrink and Toggle Sidebar. Branding compacts in three measured stages: full, title only, then M only; sync buttons expand equally in the last stage. ON uses the Search fill, accent border and bright text; OFF is dim and interactive. No indicators are reserved.

Expand reaches FULL in 520ms. FULL has Shrink alone, restoring the preferred split in 360ms; its sidebar-toggle slot is absent. Toggle slides to COLLAPSED in 260ms; the transparent map-corner Toggle Sidebar reopens SPLIT. Logical mode is not saved. Below 692px the visible editor fills the workspace, BOTH arrow controls and divider disappear, and Toggle alternates full-width editor/map. Resize preserves an explicit FULL and the saved fraction. A narrow collapse/reopen establishes SPLIT; widening restores the saved, clamped fraction. Extreme widths/heights use local chrome scrolling without a new minimum window size.

The lower toolbar uses pane widths: above 700px one row with flexible breadcrumb, tools, Search and More; 420–700px tools/Search/More then breadcrumb; below 420px Search/More, centered tools, then breadcrumb. All new controls are 44px high. Content indentation, fonts, native text-field dimensions, scrollbar styling and breadcrumb abbreviation retain their original rules. R12-3A balances the focused title with 7.5px above and below its complete editing block within the area after the breadcrumb/toolbar region. Matching Home depth-1 and focused depth-0 child rows align in Plain Text and Static Hierarchy. Original Dynamic sizes and differently wrapped blocks flow naturally without overlap; exact alignment is not promised for different occupied heights. Home spacing stays unchanged.

Genuine sheet side/top/bottom padding uses the arrow cursor. A completed neutral click/tap clears bullet selection and defocuses; blank trailing space inside a textarea remains editable. Scroll/scrollbar, moved/canceled pointers, drag/selection and composition do not invoke this defocus route. No automatic bullet focus is added.

Search has one stable 44px action position: Enter before active Search, Clear × while Search is active. Type a query and press Enter or click the Enter action to submit; editing the query alone does not submit it. Keyboard Enter can resubmit an edited active query. Empty/whitespace submission ends Search; Clear clears/exits it. Composition is protected. Buttons take normal focus; no editor-node focus or caret restoration is added. Actual iPad software-keyboard Enter and native Undo/Redo are deferred, unverified and not Windows acceptance gates.

Drag the divider within the 346px floors. Left overscroll keeps the editor 346px wide and slides it left; release at an edge strictly below 200.68px collapses it. Right overscroll covers the fixed canvas; release strictly above workspace width minus 200.68px enters FULL. Equality snaps back. Hidden outcomes retain the saved fraction. Movement below 4px does not resize/save. Legal completed drag/snap saves once. Arrows resize 10px; Home, double-click or a touch pair less than 320ms and at most 24px apart saves exactly .35. Cancellation, lost capture, blur, Escape and width resize preserve the prior preference; height resize preserves tracking. Divider settling uses 200ms, rejected overscroll/cancel 220ms. All movement derives the divider from the displayed editor edge, including interrupted/reversed animations.

The map-side divider strip is 12px fine / 44px coarse. An open options panel wins where it intersects that strip. Editor menus close on pane movement; map options remain open for progressive covering. Outside press/Escape still closes options. Covered targets cannot receive pointer or keyboard activation; a newly covered map field blurs without editor autofocus. Still-uncovered targets remain available.

Map options (…) is 44px at top14/right16; its glass panel is 310px at top66/right16, clamped and scrollable at short heights. Rows are Wrap/count/enable, Color + Random, Seed, Download PDF. Count and Seed are typeable composite steppers with 30.8px-wide / 44px-high end arrows and no overlapping hit areas. Wrap off disables the count and arrows. Count uses the module's effective content cap; Seed UI is 0–16777215. Empty/invalid number commits restore the effective value; valid commits round/clamp. Random retains the original algorithm. PDF busy/failure feedback remains.

The canvas remains full-workspace beneath the opaque editor. HUD follows the legal editor edge at bottom-left14; Reset stays independently right16/bottom14. During right overscroll their legal-floor placement freezes while the editor covers them. Controls stay painted until physically covered, with per-target input exclusion; completely covered map work pauses. Safe areas adjust chrome locally and keyboard intersection is counted once. Pan, wheel, pinch and double-click/double-tap remain original. Reset explicitly fits; edits after moving the map preserve its transform and original depth compensation. Live fitting during legal movement is implemented by R12-3.

Pane buttons take normal focus and never automatically focus a bullet. With the shipped host-history pair, Undo/Redo follows one session chronology from bullets, deliberate neutral app interaction, canvas, non-text chrome and a collapsed editor. Header sync buttons grant history-only app context; other shortcuts and paste keep their previous ownership gates. Native Search/title/external fields, Wrap and the entire focused Seed editing session retain native text Undo. Native-field blur alone does not acquire application history context. A3 disappearing-row continuity remains; no replacement row is focused. Unclaimed Ctrl+Z remains browser-native.

| Sync collapse | Sync focus | Projection |
|---|---|---|
| On | On | Zoomed subtree, respecting real open flags |
| On | Off | Home tree, respecting real open flags |
| Off | On | Full zoomed subtree |
| Off | Off | Full Home tree |

Both default On. Home or a stale/deleted zoom target uses the Home tree. A reachable zoomed bullet shows its direct children even when collapsed; deeper descendants obey their own open flags. With focus Off, a collapsed ancestor can hide that branch. Search filtering and temporary search expansion never affect the map. R11 prunes blank leaves from the full tree before either sync filter. Blank means empty after removing U+200B and applying String.trim() (including tabs/NBSP). Blank parents with surviving children appear as `(Untitled)` with label-only `rgb(180,178,170)` grey in canvas and PDF; connector colors and normal seeded colors stay unchanged. A focused blank leaf shows a blank map. User-typed `(Untitled)` remains normal text. The transient typing placeholder is excluded by the snapshot API. Soft newlines become spaces; literal leading bullet/markup characters remain label content. One real top-level bullet is a visible map root; multiple roots use the original parser's invisible synthetic root. An empty outline has an empty map and no demo.

A touched map retains exactly the same scale/pan and screen position through pane buttons and resize. Pane geometry alone causes no map layout/draw; a backing-store resize redraws the same transform. Untouched maps fit the displayed legal map rectangle during divider movement and pane animations, with at most one latest fit/draw per animation frame. Fit bounds are reused for the same layout/font identity; pane movement does not parse or lay out content. At right overscroll the fit rectangle freezes at the 346px map floor until reveal or legal movement. Gestures cancel queued automatic fitting and keep their original pan/zoom behavior. Hidden-map edits only mark the view dirty: the shell skips snapshot projection and new setText/layout requests until reveal, then reads the latest snapshot once. It compares projected text and placeholder flags to avoid redundant map work. With viewport-insets support, the covered map also pauses queued render/fit/keyboard work and defers font/resize invalidations. Reveal sends the latest data/settings while paused, then resumes one catch-up layout. Positive-area PDF/fit operations use the latest source/layout; calls while covered defer rendering. The module's original 180ms rendering debounce remains; Outliner real-data notifications have an independent 40ms debounce. Existing synchronous storage, whole-tree rendering, recursive module traversal and exponential map depth scaling remain limitations. Very deep/huge trees are not guaranteed to work; no truncation or renderer redesign is introduced.

## Module and event contracts

All three runtime files are classic scripts. Only `index.html` knows both modules; modules never reference each other. Each module injects its own CSS/DOM and exposes one global. Single-instance mount, destroy and remount are supported; simultaneous instances are outside the contract. No local fetch/import or extra runtime files are used. The sole remote dynamic import is the original HarfBuzz import during PDF download.

Accepted versions: `Outliner.version === '1.5.1'`, `MindMap.version === '1.5.0'`; both `apiVersion === 1`. Each global includes `version`, integer `apiVersion`, `capabilities` and `mount(container, opts = {})`. The same versions/API are in module header comments. Supply a connected Element with usable dimensions, the host theme below, and inherited fonts. Methods belong to the returned instance, not the global.

Outliner capabilities: `snapshot-v1`, `change-event`, `toggle-event`, `zoom-event`, `storage-feedback`, `pane-controls`, `header-content`, `host-history`.

| Outliner method | Contract |
|---|---|
| `on(event, fn)` | Subscribe to change/toggle/zoom/paneAction; returns an unsubscribe function. Subscriber exceptions are caught individually. |
| `getSnapshot()` | Fresh detached `{zoomId, tree}` of the entire real Home tree; each node is `{id, text, open, children}`. Numeric IDs, raw text/soft newlines and persisted open states; no storage root, search overrides, parent links, DOM, history or mutable internal references. `zoomId: null` means Home. Excludes only the actual lone empty leaf placeholder of its owner; former placeholders with real structure and other real blank bullets stay. Immediate, even before notification. |
| `destroy()` | Idempotently removes owned DOM/styles/listeners/observers and cancels pending notifications/timers/frames. Guards async completion; keeps stored data. |
| `setPaneMode(mode)` | With `pane-controls`, synchronously accepts split/full/collapsed, updates Expand/Shrink (legacy Minimize) icon and label, and closes owned menus, including when the mode is unchanged. No focus or editing mutation. |
| `commitHostHistory({before,after,force:false})` | Optional host-history: detach small JSON host values, flush a pending outline typing group, synchronously apply and append an opaque edge to the existing private chronology. Force records an equal-result Random action. False for refused/invalid/reentrant/destroyed commands; no general outline restore API. |
| `runHistory("undo"|"redo")` | Optional host-history: prepare through the adapter, flush pending typing, then traverse one edge. Hidden connected hosts work without hidden row focus. Host replay never calls outline restore/render/save. False at an end/refusal or after destroy. |
| `reportSaveFailure()` | Shows “Couldn’t save changes” at most once per page session, shared with editor saves. Available with `storage-feedback`; no data mutation. |

`Outliner.mount(host,{paneControls:true})` retains its established toolbar. Opt into the R12 header with the additive `header-content` capability and `mount(host,{paneControls:true,headerContent:element})`. The host owns the supplied element/listeners; Outliner parents it in its slot and detaches it on destroy without clearing host listeners. The slot is excluded from ordinary shortcut-ownership checks; optional host-history eligibility applies only to history keys. Default standalone mounting keeps the original toolbar/Search. The integrated wide Search column is 255px (150% of its former 170px); its compact class begins at 785px so the breadcrumb keeps the same space at the switch. The very-small class remains below 420px, standalone pane controls retain 700/400px, and unaffected head/sheet container queries stay unchanged. `paneAction` remains `{action:"expand"|"toggle"}`; no new focus/menu API is added. Hidden/stale FULL toggles cannot act. The shell owns the independent corner toggle.

`change` publishes `{revision}` after a trailing 40ms real-tree mutation debounce (text, structure/order or open flags). The trailing 500ms typing history timer remains; default standalone retains 300 outline positions. In host-history mode the same 300 positions include the baseline and small Seed edges, allowing at most 299 reversible mixed edges. `toggle` publishes `{changes:[{id,open}], transient:boolean}` after the synchronous operation/microtask, batching final values. `transient: true` is a search-view override and does not change persisted open flags. `zoom` publishes `{zoomId}` only when the effective target changes. When applicable, order is toggle, zoom, then debounced change; baselines are independent. Search, style and resize alone do not publish real changes. Initial state is read explicitly after subscribing; no mount-time event is required. The shell ignores optional event metadata and coalesces work before reading the authoritative snapshot.

MindMap capabilities: `text-input`, `viewport-fit`, `settings-v1`, `pdf-export`, `reset-view`, `placeholderNodes`, `viewport-insets`, `settings-bounds`, `chrome-occlusion`, `live-viewport-fit`, `color-seed-only`.

| MindMap method | Contract |
|---|---|
| `setViewportInsets({left,top,right,bottom},{duration=0,live=false}={})` | Optional `viewport-insets`: finite nonnegative CSS-pixel insets and duration; invalid arguments throw. Intersect with host bounds and keyboard once. Zero area pauses immediately; positive area resumes latest pending work once. With additive `live-viewport-fit` and explicit `live:true`, copy the latest rectangle and coalesce one immediate fit/draw per animation frame, using cached layout/font bounds. Superseding duration-only calls, gestures, coverage and destroy cancel queued live work. Touched transforms remain exact; pane-only updates cause no draw, while actual backing-store resize redraws the same transform. A user zoom animation continues during live movement. Without `live:true`, retain destination-only duration behavior, including repeat-duration-0 cancellation. Without calls the viewport is the whole host. |
| `getSettingBounds()` | Optional `settings-bounds`: detached `{horizontalLimit:{min:1,max}}` from existing current content-cap state; does not parse/render or change settings. |
| `setChromeOcclusion({left,top,right,bottom})` | Optional `chrome-occlusion`: finite nonnegative actual coverage insets; invalid values throw. Manages module-owned HUD/Reset paint/focus/pointer eligibility without drawing/layout/fitting. Separate from viewport fit insets. Enables managed keyboard placement; standalone behavior stays original until called. Destroy is safe/idempotent. |
| `setText(indentedText, options = {})` | Replace latest string and optional `{placeholderNodes: [0, ...]}` metadata; indexes count parsed real nodes in preorder, excluding the synthetic root. Flags are replaced each call (omitting options clears them), not inferred from text. Schedule original 180ms debounce; unchanged text and flags are a no-op. Empty input clears and never seeds demo. Returns void. The shell sends metadata only with the `placeholderNodes` capability; older pinned maps show `(Untitled)` in normal color. |
| `fit()` | Flush latest text/layout, fit nonempty content using original animation; empty is a no-op. |
| `resetView()` | Flush text/layout; original Reset clears touched state and animates for 320ms; empty is a no-op. |
| `setColorSeed(seed)` | Optional color-seed-only: finite nonnegative integer, no module upper cap; invalid values throw. Reuse unchanged assignColors/draw on the retained layout. No parse/layout, bounds/transform/touched/animation/source changes. Paused calls update only numeric state/pending color; reveal joins one paint without making color a fit/render invalidation. Equal calls may repaint for failure recovery. Safe after destroy. |
| `getSettings()` | Detached `{horizontalLimit:{enabled,count}, colorSeed}`; count is effective after original content clamping. |
| `setSettings(partial)` | Merge only these fields, using latest source; return effective settings. Enabled count uses Number, rounding and clamp to 1…max(1,direct-root-children−1). Disabled limit retains original count semantics. Seed uses trimmed string/parseInt, nonnegative conversion; empty seed does not change it. Original content-based cap adjustments remain. Relayout without map editing history. |
| `exportPDF()` | Promise; flush latest text/layout. Original filename, fonts and shapes, including accepted mixed-script Thai PDF fix. Reports/rejects failures; null fonts visibly warn and keep original fallback. Busy state restored in finally. Empty has no download. |
| `destroy()` | Cancel owned timers/frames, listeners/observer, DOM/styles and object URLs; guard in-flight resource callbacks/downloads. No outline/storage changes. |

`MindMap.mount(host, {settings, onError})` accepts optional initial settings and an `onError(error)` host callback for caught scheduled-render/export/font failures. Without it, standalone visible error feedback remains. Async callbacks are guarded inside the module. The shell catches synchronous calls, error callbacks and Promise rejections; map failure cannot interrupt an Outliner subscriber or erase its data. Errors identify the module/resource in nonmodal bottom overlays without reserving a top strip or blocking input. A failed editor leaves map controls usable; a failed map leaves editing and persistence usable. The shell retains dirty state for latest-data catch-up; it never resets data or silently loads another release.

Optional compatibility: feature-detect capability plus callable method. Older Outliners without header-content retain their established toolbar and shell sync controls appear on the map; an absent/incomplete pane-controls contract mounts the normal toolbar. Older maps without settings-bounds still enforce count caps through setSettings, but the shell cannot know the upper arrow boundary in advance. Without chrome-occlusion, fine-grained HUD/Reset coverage/managed placement is unavailable; full coverage still hides chrome. Without live-viewport-fit, shell pane movement keeps the older destination-only fitting path, so continuous displayed-rectangle fitting is unavailable. Without viewport-insets, fitting uses the full host and private font/resize pause cannot be guaranteed, although the shell defers hidden sync work. No private-DOM fallback, error solely for missing optional features, or automatic version substitution is used.

## Application history and native Seed editing

The shell opts into Outliner.mount with a complete historyHost adapter: beforeCommand(direction), apply(detachedValue), ownsKey(event), each returning boolean. Incomplete adapters retain default standalone behavior. beforeCommand may settle one Seed draft; recursive commands and pushes from apply are rejected. Host values contain only seed, canonical display and storage:{known,raw}. The shell keeps no outline snapshots or second cursor. Destroy releases adapter/listener/delivery ownership; remount/reload starts a fresh baseline from current persistence.

Outline changes and committed typed Seed, Seed steps and every Random press share one private list. A Seed commit first closes a pending outline typing group; the next edit begins a new 500ms group. Existing render/Clear All/cut boundaries remain. Actual changes truncate the whole redo future; zoom-only navigation, drafts, invalid/equal typed values, Wrap/Sync/pane/Search/style/selection/viewport/PDF do not. Real outline checkpoints retain original root+zoom restoration and Search carry-over. Seed uses part of the 300-position capacity; the earliest retained position is the baseline, not another reversible action.

Seed typing remains a native draft, with no application action or passive field rewrite. Noncomposing Enter/change/ordinary blur commits once after rounding/clamping to 0..16777215; invalid/empty restores the committed display. Seed keyboard Undo/Redo stays native for its ENTIRE focused editing session, including after Enter. Use toolbar Undo or deliberately leave for an application surface to traverse application history. Toolbar commands settle a draft without new focus/caret work. A valid blur commit followed by a step can create two actions. Random samples the original formula once per press, including collisions; Redo never rerolls. Native text grouping across programmatic normalization/replay is browser-dependent; no synthetic native stack is provided. Composition and key229/action-start guards protect native editing; no iPad beforeinput history bridge is added.

Seed replay restores numeric state, canonical display, colors and the exact raw moa:map:colorSeed string or absence. Startup preserves an invalid/missing/raw-spelled bootstrap value until an explicit changed Seed commit. Passive settings feedback cannot replace an active Seed draft or committed Seed. Seed-only steps write only that key, with no outline save/projection or viewport change. If storage is denied, restored memory/history stays authoritative with existing save feedback; physical raw restoration is unverified when unreadable/unwritable. Unknown raw values are not invented or deleted. History is never persisted.

Host memory/history commits synchronously. Color-only map delivery runs afterward, catches throws/rejections/scheduled failures, permits one in-flight response and sends only the latest pending generation. A failure cannot roll back Seed/history or editing; retry occurs on a later meaningful ready/reveal/action, without a retry loop. Missing settings/map does not block outline history. With new Outliner and a pinned map missing color-seed-only, hide only Seed/Random while supported Wrap/PDF remain. Older Outliner or map-only surviving mode retains legacy settings/history behavior; no shell history stack or silent release replacement is added.

## Host CSS and font contract

The single runtime source of eight literal theme values is the marked theme block in `index.html`. Both modules consume inherited variables; standalone development hosts provide identical copies that are not uploaded. Map-only/errors remain themed even if Outliner fails.

| Variable | Canonical value | Use |
|---|---|---|
| `--bg` | `hsl(222 25% 16%)` | Page/editor background |
| `--page` | `#14224a` | Menus, popover, toast/error surface |
| `--ink` | `#e6ecf7` | Foreground |
| `--mute` | `#8b9bb8` | Secondary text/icons/scrollbar |
| `--line` | `#27375f` | Borders |
| `--accent` | `#4cc9cc` | Active/hover/focus/selection |
| `--halo` | `#1f2f58` | Selection/drop/secondary surface |
| `--btn` | `#182855` | Editor/settings buttons/search |

Host inheritance is exactly `16px/1.5 "IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif`, with dark color-scheme, inherited border-box sizing, full-height flex layout and original top/bottom safe-area padding. Shell also accommodates left/right safe areas. Editor host is a flex column with min-height:0; give it width and height. It owns `.moa-outliner`, the named `moa-outline` inline-size container, `--gut:max(14px,(100% - 1040px) / 2)` and per-row/title `--fs/--lh/--bh/--fw`. Do not override those metrics. Its full-width sheet owns scrolling. Do not transform/filter/paint-contain the editor or ancestors: fixed menus/toast/drop line retain viewport coordinates.

Map host owns .moa-mindmap with usable width/height; canvas and chrome are absolutely positioned. In this shell it spans the full workspace at origin (0,0), below the opaque Outliner. Do not reserve toolbar space above it. Only canvas and divider own touch-action:none; editor scrolling stays independent. Sarabun, canvas #F5F4EE, seeded palette, geometry and Thai/PDF algorithms remain unchanged.

Placement variables are inherited from the shell; standalone hosts may omit them for original placement: --map-control-right (16px), --map-hud-top (14px), --map-hud-bottom (auto), --map-hud-max-width (none), --map-hud-height (auto), --map-reset-top (auto), --map-reset-bottom (14px), --map-reset-width/height (auto), --map-chrome-visibility (visible). R12 managed chrome also consumes --map-hud-left, following the actual legal edge then freezing at the map floor. The shell HUD is content-sized at 24px high and capped only by the space before the independent112×44 Reset control. Full zoom text remains in the DOM and ordinary values are not padded to an arbitrary fixed width. Ownership remains in MindMap; no private elements move into shell DOM. setChromeOcclusion disables the old Reset inline keyboard-bottom writer while the shell accounts for keyboard intersection once.

Localized glass values are canonical in index.html and inherited; header sync/Search use the eight Outliner tokens above. HUD retains Cascadia Code11, Reset Segoe/system11/600 and pill shape. Panel numbers use Cascadia Code / JetBrains Mono / monospace13. All glass uses 8px blur with both browser prefixes.

| Variable | Canonical value |
|---|---|
| --map-glass-bg / --map-hud-bg | rgba(0,0,0,.28) / rgba(0,0,0,.32) |
| --map-glass-ink / --map-hud-ink | rgba(255,255,255,.6) / rgba(255,255,255,.5) |
| --map-glass-hover / --map-glass-pressed | rgba(0,0,0,.46) / rgba(0,0,0,.55) |
| --map-glass-blur / --map-glass-radius / --map-glass-pill | 8px / 6px / 100px |
| --map-sync-border | rgba(255,255,255,.18), now shared by panel/More |
| --map-panel-bg | rgba(28,34,47,.94) |

The independent floors are O346/M346, threshold692 in every orientation; panel310 does not derive or enlarge them. Existing real-iPad/Safari/touch/safe-area/OS-keyboard/IME/native HTML5 drag checks and D6 remain deferred/unverified. Windows Edge checks do not claim those passes. R12-2 batches width-triggered textarea height measurements when the sheet is at the top, skips unchanged-width/tree-height-only observer passes, and explicitly invalidates for font readiness/loading and zero-size reveal. Scrolled sheets retain the original sequential fit to preserve native scroll anchoring; ordinary typing/render fit is unchanged. This is a compatible performance fix, with no API/capability change. R12-3 adds explicit live map fitting and bounds reuse as described above; R12-3 kept Outliner byte-identical to R12-2; R12-3A changes only title spacing and top-menu grouping. Combined large-outline work can still exceed a display frame, especially on the deliberately sequential scrolled-editor path. Neutral-padding behavior is shipped in Outliner1.3.3; R12-4B adds the optional application history described here.

## Loader, independent releases and compatibility

Edit the single commented `MODULES` block in `index.html`:

```js
const MODULES = {
  outliner: { src: './outliner.js', v: '1.5.1' },
  mindmap: { src: './mindmap.js', v: '1.5.0' }
};
```

Relative sources resolve beside the shell and receive encoded `?v=` (or `&v=` after an existing query), before any fragment. They work unchanged at a GitHub Pages project path. Outliner loads/mounts before waiting on MindMap; its failure still permits the second attempt. Each classic script attempt has a 15-second timeout and ignores late completions. If an Outliner advertises pane-controls but omits setPaneMode, its incomplete initial instance is destroyed and mounted normally without paneControls. No automatic fallback version is loaded. Check the global, integer API 1, callable mount and capability array before mounting; instance methods are checked before integration. Cache version is separate from contract compatibility: an API-compatible semantic version can differ from `v`.

Pin either module independently with an explicit absolute HTTPS URL, for example:

```js
outliner: { src: 'https://cdn.jsdelivr.net/gh/YOURNAME/YOURREPO@v1.0.0/outliner.js', v: '1.0.0' },
mindmap: { src: 'https://cdn.jsdelivr.net/gh/YOURNAME/YOURREPO@FULL_COMMIT_SHA/mindmap.js', v: '1.0.1' }
```

Replace all names and FULL_COMMIT_SHA with a real release/full commit containing the root files. Exact HTTPS URLs are loaded unchanged: no appended `v`. Keep the other entry relative if desired. Publish a new tag/commit for updates; never move a release tag. `@main`, `@latest` or a moving tag is floating, not pinned; stale alias caches are possible. Pinned mode needs reachable remote scripts/cache. No public release was deployed or fetched during Phase 4; development validation mocks exact CDN responses using accepted local bytes.

Patch version means compatible fix; minor means compatible additive capability; major means breaking contract. Increment integer apiVersion for a breaking contract with the major version. Keep header and exported version/API aligned. Add actual capabilities to the array; detect capability plus callable method, never infer support from semantic version. Missing optional settings/PDF capabilities create no controls; no speculative disabled future controls. Bump each changed relative module's `v` and hard-refresh after upload; query versions do not refresh a stale index itself or guarantee CDN invalidation.

A first open without saved data shows one empty bullet and a blank map, with no welcome text or hint. The Outliner’s top `…` menu is grouped as **Clear All**; separator; **Plain Text / Static Hierarchy / Dynamic Hierarchy**; separator; **Expand All / Collapse All**; separator; **Export Visible / Export All**. The style check-mark column is reserved for all three choices. **Clear All** clears the entire outline, returns to Home, exits search, saves immediately and shows “Cleared”. Toolbar Undo restores the whole outline in one step; Undo history is kept only while the tab remains open. API 1 remains compatible. Outliner 1.1.0 adds the `storage-feedback` capability and `reportSaveFailure()` method so the shell can share the editor’s once-per-session save-failure toast for preferences. Clear All is a menu action, not a new API method; MindMap 1.1.0 separately adds the API-compatible `placeholderNodes` capability for R11.

## Storage and origin limits

| Key | Owner | Default/content |
|---|---|---|
| `outliner-v1` | Outliner | Unchanged original JSON `{root,zoom}` |
| `moa:syncCollapse` | Shell | JSON boolean true |
| `moa:syncFocus` | Shell | JSON boolean true |
| `moa:viewMode` | Legacy rollback data | Preserved byte-for-byte; no longer read, written, deleted or repurposed |
| `moa:paneWidth` | Shell | Fraction 0 < f <= 1; missing/invalid uses .35. Values > 1 migrate once as legacy pixels/first positive workspace width, capped at 1 |
| `moa:map:hlimitEnabled` | Shell | JSON boolean false |
| `moa:map:hlimitCount` | Shell | Initial request 3; original effective clamping may reduce it |
| `moa:map:colorSeed` | Shell | Nonnegative integer 0 |

No other persisted keys are added. Search, logical pane mode, history, selection, map pan/zoom, popover and narrow presentation are not persisted. Corrupt/unavailable shell storage uses safe in-memory defaults. Width migration/user commits use a silent guarded write and retain their in-memory fraction on failure; they do not consume the editor save-error toast. Invalid raw width data survives startup, buttons and resize until an explicit width commit. Display clamping, FULL/COLLAPSED and narrow transitions never overwrite the fraction. Other preference writes retain existing visible failure feedback. The editor saves every data change immediately, including typing, and flushes on pagehide and when the tab becomes hidden. A failed save shows "Couldn't save changes" once per session and retains in-memory editing. Unreadable saved outline data is kept untouched with a toast; saving resumes only when you edit the outline or explicitly use Clear All. Persistent browser storage is requested once, best effort. Neither module reads shell keys. Do not rename, migrate, clear or overwrite `outliner-v1` for troubleshooting.

Your data is stored per browser and per web address; the local file and GitHub site have separate storage. Safari on iPad may clear site data after about a week without using the site. Use **Add to Home Screen** and the Outliner’s **Export** button/menu as a backup.

Storage belongs to a browser origin. GitHub Pages projects under one username share the same origin: the required legacy `outliner-v1` key can collide with another Outliner site. `file://` storage is browser-dependent and may differ by file path. Original files, this index and an HTTPS site need not share data. Uploading files does not transfer browser data. Use existing Outliner export to protect a text copy; do not clear storage to cure a stale script.

## Fonts, PDF and touch limitations

The original IBM stylesheet is `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap`; Sarabun remains `https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap`. Google-selected font binaries come from fonts.gstatic.com. These floating provider resources are not bundled/pinned. Offline canvas/editor use cached faces or the original system fallbacks, whose metrics can differ. Exact visual comparison requires loaded original font faces.

Download PDF alone imports `https://unpkg.com/harfbuzzjs@1.4.0` and its relative JS/WASM assets. It downloads Sarabun-Regular.ttf and Sarabun-Bold.ttf from `https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/`, then tries the original `https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/` fallbacks. URLs and Thai shaping are unchanged. Uncached offline shaping fails with a clear message; failed fonts warn that Thai output may be incomplete while preserving the original fallback download. Ordinary editing/rendering does not request HarfBuzz/TTFs. Restore the network and reload after a failed dynamic import before retrying; Chromium can cache that failure for the page lifetime.

Canvas gestures cannot block normal outline scrolling/taps; pointer capture/cancel belongs to the divider. Native Outliner HTML5 drag/drop and mouse-based multi-selection have no touch redesign/polyfill. Real-phone drag support, scroll/taps, soft keyboard Enter/IME, pinch/double-tap and keyboard avoidance require device checks. Phase 3 phone-only checks remain deferred; desktop emulation is not real-phone acceptance. Actual Thai OS shortcuts, clipboard permissions and native browser dragging also merit owner checks. Phase 2A PDF owner approval is preserved; Phase 4 manual side-by-side visual acceptance is still owner-only.

If a module fails, read the filename/API/resource banner, confirm all local files exist, and check the exact pin. A map failure does not require replacing or clearing outline data. Offline font fallback is not a fully bundled offline PDF guarantee.

## Manual GitHub website upload (after final approval)

1. Complete local browser acceptance first. Keep the four files together and upload the **contents** of this folder; do not upload dev, Original, prompts, snapshots or project record files.
2. On GitHub's website create a public repository, leaving automatic README/.gitignore/license creation off. No git commands are needed.
3. Choose uploading an existing file (empty repository) or Add file → Upload files. Select the four files. Confirm `index.html` is at repository root, save with Commit changes.
4. Settings → Pages → Build and deployment: Deploy from a branch, select the branch containing the files (usually main), folder /(root), Save. Follow the displayed site URL after deployment. The browser opens root index.html with relative module links.
5. Updates: retain local backups, test first, bump changed relative-module `v`, upload changed files including index, then hard-refresh. Publishing may take several minutes; do not promise an exact cache TTL. An exact release pin only changes when its URL changes.
6. Optional pins: create a fresh exact release tag through GitHub's Releases page, or copy a full commit SHA from its website. Verify that URL returns the intended JavaScript, test locally, then upload the changed index. Keep all four local files for switching back. Public jsDelivr links cannot authenticate a private repository; never put tokens in source URLs. Private-repository Pages availability/visibility depends on the owner's plan and settings.

Official guidance: [Upload files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository), [Pages source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [Pages quickstart](https://docs.github.com/en/pages/quickstart), [jsDelivr purge](https://www.jsdelivr.com/tools/purge). This is owner guidance only. Phase 4 did not publish a site or test a hosted GitHub Pages deployment. Phase 5 remains out of scope; remaining Phase4b batches require separate instructions.

Windows bullet drag/drop: near a row edge, one straight line previews the insertion level. After a leaf, cross the halfway horizontal trigger (21px from the row left) to preview and insert at one full child indentation (32px); move left to return to the shallower choices. Existing parents keep their original targeting. Dropping in the middle of a row still inserts inside that node. Multi-selected roots move in outline order with their subtrees. Undo/Redo uses the existing history. Outliner1.5.1/API1; MindMap1.5.0/API1 unchanged.
