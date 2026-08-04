# Fullscreen editor — a distraction-free writing surface for `/admin/write`

**Date:** 2026-08-04 **Status:** Design — awaiting review **Touches:**
`src/views/components/admin/EditorJs.tsx`, `src/styles.css`, `public/fonts/`

## Summary

Add a fullscreen writing mode to the post editor: the Editor.js body expands to
cover the viewport, rendered in a serif face on a user-chosen surface color, with
every command consolidated into a floating pill that collapses to a circle while
you type.

The mode is **body only** — no title, description, or metadata fields. Those stay
in the normal three-column view; you exit fullscreen to reach them.

## Background — current state

- `src/views/Write.tsx` renders a single `<form>` in a three-column grid:
  `AdminNav`, a `Card` holding title / description / body, and `AdminTools`
  (publishing, metadata, image, controls).
- The `Card` header carries three actions: view live post, import Markdown,
  export Markdown.
- `src/views/components/admin/EditorJs.tsx` (1454 lines) renders the body editor:
  a root `<div data-editorjs>` with an Alpine `x-data="{ autosaveEnabled: true,
  saveState: 'saved' }"` and `x-init="initEditorJs($el, $data)"`, a toolbar row of
  ten block-tool buttons, an autosave indicator plus toggle in an `ml-auto` group,
  a hidden `<input data-editorjs-input>` carrying the serialized document, and the
  `[data-editorjs-holder]` div Editor.js mounts into.
- The init script resolves its targets by querying **within the root**:
  `root.querySelectorAll("[data-editorjs-tool]")`, `[data-editorjs-link]`, etc. It
  enables those buttons once the editor is ready and dispatches block insertion on
  click.
- The palette defines exactly one mist step, `--color-mist-600: oklch(45% 0.017
  213.2)`. Site convention is light `bg-amber-50 text-mist-600`, dark
  `dark:bg-mist-600 dark:text-amber-50`.
- Fonts are self-hosted in `public/fonts/`: Noto Sans (`--font-sans`) and Black
  Ops One. There is no serif.
- `tests/` runs on `node --test` with `tsx`. Alongside model and route tests,
  `tests/views/` renders components to HTML strings and asserts on them;
  `tests/views/editor-js.test.ts` already covers this component, including
  evaluating its inline script with `new Function("window", script)`.

## Design

### 1. Foundations (`src/styles.css`)

**Mist ramp.** Derive a full scale at the existing hue (213.2), chroma tapering
toward both ends so the light steps do not read as tinted grey and the dark steps
keep their blue cast. `mist-600` is reproduced **byte-identical** so no existing
usage shifts:

| Token | Value |
| --- | --- |
| `--color-mist-50` | `oklch(96% 0.005 213.2)` |
| `--color-mist-100` | `oklch(92% 0.008 213.2)` |
| `--color-mist-200` | `oklch(85% 0.011 213.2)` |
| `--color-mist-300` | `oklch(74% 0.014 213.2)` |
| `--color-mist-400` | `oklch(62% 0.017 213.2)` |
| `--color-mist-500` | `oklch(53% 0.018 213.2)` |
| `--color-mist-600` | `oklch(45% 0.017 213.2)` — unchanged |
| `--color-mist-700` | `oklch(37% 0.015 213.2)` |
| `--color-mist-800` | `oklch(28% 0.012 213.2)` |
| `--color-mist-900` | `oklch(20% 0.009 213.2)` |

**Newsreader**, self-hosted variable font, roman and italic, in
`public/fonts/Newsreader/` following the existing `@font-face` pattern (woff2 with
ttf fallback, `font-display: swap`, `font-weight: 100 900`). Exposed as
`--font-serif`. It is applied **only** to the fullscreen writing surface; the rest
of the site is unaffected.

### 2. Mechanism — overlay, not a route

Entering fullscreen adds a state class to the existing `[data-editorjs]` root,
promoting it to `fixed inset-0 z-50`. There is no new route and no new Editor.js
instance: the editor and its enclosing `<form>` stay mounted throughout, so
autosave, the hidden input, slug syncing, and form submission continue to work
with no state transfer.

The Alpine state on that root grows four properties:

```js
{ autosaveEnabled: true, saveState: 'saved',
  fullscreen: false, pillOpen: true, surface: null, nativeFs: false }
```

Because the init script binds tools by querying within the root, **pill buttons
carrying the same `data-editorjs-tool` / `data-editorjs-link` attributes are wired
and enabled automatically** — they are found by the existing `querySelectorAll`.
This is the main reason for the overlay approach: it requires almost no change to
the 1454-line script.

### 3. File organization

`EditorJs.tsx` is already too large to grow further. Three extractions:

- **`src/views/components/admin/editorTools.tsx`** — the ten block-tool
  definitions (label, title, dataset attributes, icon paths) as an exported array,
  plus a renderer. Consumed by **both** the embedded toolbar and the pill, so the
  SVG paths exist once rather than twice. This replaces the inline toolbar markup
  in `EditorJs.tsx`.
- **`src/views/components/admin/EditorCommandPill.tsx`** — the pill markup.
- **`src/views/components/admin/editorFullscreen.ts`** — the fullscreen and pill
  behavior, exported as a script string in the established pattern (cf.
  `postSlugScript` in `Write.tsx`).

### 4. The writing surface

- Centered single column, `max-w-[68ch]`, `mx-auto`.
- `pt-[12vh]` for breathing room above the first line; `pb-40` so the last line
  clears the pill.
- Newsreader at ~`1.15rem` with `1.75` line-height.
- The overlay scrolls internally; `documentElement` gets `overflow-hidden` while
  fullscreen and has it removed on exit.
- Editor.js block chrome (drag handles, plus button, inline toolbar) keeps working
  untouched.

**Surface and ink** travel as CSS custom properties (`--fs-surface`, `--fs-ink`,
`--fs-chrome`, `--fs-chrome-raised`) set by a `data-editor-surface` attribute on
the overlay, so one rule block in `styles.css` owns every pairing:

| `data-editor-surface` | Surface | Ink | Note |
| --- | --- | --- | --- |
| `amber-50` | `amber-50` | `mist-600` | light default |
| `mist-200` | `mist-200` | `mist-800` | |
| `mist-400` | `mist-400` | `mist-900` | |
| `mist-600` | `mist-600` | `amber-50` | dark default |
| `mist-800` | `mist-800` | `amber-50` | |

`--fs-chrome` is one step lighter than the surface for the expanded pill;
`--fs-chrome-raised` is two steps lighter for the collapsed circle. On the two
lightest surfaces the direction inverts (one step *darker*) so the pill stays
visible against paper.

**Persistence:** the selection is a personal writing preference, not post data.
Stored in `localStorage` under `editor:surface:light` and `editor:surface:dark` —
separate keys, so each theme remembers its own choice. Read during Alpine init;
defaults are `amber-50` (light) and `mist-600` (dark).

### 5. The command pill

Positioned `fixed bottom-24 left-1/2 -translate-x-1/2`.

**Everything is `rounded-full`** — the bar, every button, every swatch, the
divider caps, the collapsed circle. No hard corners anywhere in this UI.

```
╭────────────────────────────────────────────────────────╮
│ ¶ H ≡ 1≡ “ ⚭ <> † — ✉ ⋅ ○●●●● ⋅ Saved ⛶ ✕ │
╰────────────────────────────────────────────────────────╯
                          ↓ collapses
                        ( ✎✨ )
```

Expanded, left to right:

1. The ten block tools, `size-9 rounded-full` each, from `editorTools.tsx`.
2. A hairline divider with rounded caps.
3. Five surface swatches, `size-5 rounded-full`, inline (no popover — this keeps
   the pill to a single row). The active one carries a ring and `aria-pressed`.
4. Another divider.
5. The autosave status text and toggle, reusing the existing `x-text` expression
   and `data-autosave-toggle` behavior.
6. `maximize-2` — native fullscreen toggle, `aria-pressed`.
7. `✕` — exit the overlay.

Chrome: `--fs-chrome` background, `backdrop-blur`, hairline border, soft shadow.

Collapsed: a `size-12 rounded-full` circle on `--fs-chrome-raised` with lucide
`pencil-sparkles` centered.

**Collapse behavior.** The pill collapses ~1.2 s after a keystroke lands in the
body. It will **not** collapse while it is hovered or while any control inside it
holds focus. It reopens on pointer movement into the bottom band, on click of the
circle, or when focus enters it via Tab.

**Motion.** `transition-[width,opacity,transform] duration-300 ease-out` with a
content crossfade. Under `prefers-reduced-motion: reduce` the transition is
dropped for an instant swap.

**Accessibility.** The expanded pill is `role="toolbar"
aria-label="Editor commands"`. The collapsed circle is a `<button>` with
`aria-expanded` and `aria-label="Show editor commands"`. Tabbing into the region
expands it, so the tools are never keyboard-unreachable.

### 6. Icons

| Icon (lucide) | Location | Action |
| --- | --- | --- |
| `fullscreen` | embedded toolbar | enter the overlay |
| `maximize-2` | pill | toggle native browser fullscreen |
| `pencil-sparkles` | collapsed circle | expand the pill |
| `✕` | pill | exit the overlay |
| ten existing | pill | block tools, carried over unchanged |

The two fullscreen icons are distinct on purpose and the shapes match their
meanings: `fullscreen` (brackets framing an inner rect) is the contained viewport
overlay; `maximize-2` (arrows breaking outward) is reserved for the one action
that escapes the browser frame. They are never on screen simultaneously.

### 7. Native fullscreen

The overlay is viewport-only by default. The pill's `maximize-2` toggle calls
`requestFullscreen()` on the overlay element (and `exitFullscreen()` to reverse),
persisted to `localStorage` under `editor:native-fullscreen`. A `fullscreenchange`
listener keeps `nativeFs` in sync so a browser-initiated exit — the user pressing
F11 or Esc at the browser level — unwinds our state rather than desyncing it.

If `requestFullscreen()` rejects (browsers require a user gesture, and some refuse
outright), the overlay stays viewport-only and `nativeFs` reverts to `false`. This
is a silent, non-blocking degradation.

### 8. Escape key

Every pill control is inline — there are no popovers or menus — so `Esc` has
exactly two layers, closed one press at a time:

1. Native fullscreen, if active.
2. The overlay itself.

Editor.js binds its own `Esc` handling for inline toolbars; the overlay handler
must not fire when the event originated inside an open Editor.js popup.

### 9. Error handling

- Unreadable or corrupt `localStorage` values fall back to the theme default
  rather than throwing.
- An unrecognized persisted surface name falls back to the theme default.
- `requestFullscreen()` rejection degrades as described in §7.
- Exiting the overlay always restores `documentElement` scroll, including when the
  exit was browser-initiated.

## Testing and verification

`tests/views/` renders components with `renderToString` from `hono/jsx/dom/server`
and asserts against the HTML, and `tests/views/editor-js.test.ts` goes further —
it extracts the inline `<script>`, evaluates it with `new Function("window",
script)`, and calls the functions it hangs on `window`. This change follows both
patterns:

- **Markup assertions** for the tool definitions, the pill, and the enter button.
- **Behavior assertions** by evaluating the fullscreen script and calling a pure
  exported helper, `window.resolveEditorSurface(stored, isDark)`, which returns
  the `{ surface, ink }` pairing for a stored preference. Keeping the pairing
  table in a pure function is what makes §4 testable without a DOM.

Automated checks:

```sh
npm run typecheck
npm test
npm run build
git diff --check
```

Manual passes on `/admin/write`, in **both** light and dark themes:

1. Enter fullscreen from the toolbar; exit via `✕` and via `Esc`.
2. Each of the five swatches applies its surface and ink pairing; the selection
   survives a reload and is remembered per theme.
3. Every block tool inserts correctly from the pill.
4. The pill collapses while typing and never collapses while hovered or focused.
5. Tab into the collapsed pill expands it; the full toolbar is keyboard-reachable.
6. Native fullscreen toggles both ways, and exiting via the browser's own Esc
   unwinds the overlay state correctly.
7. Autosave continues from inside fullscreen, and a draft still saves after
   exiting.
8. `prefers-reduced-motion: reduce` removes the collapse animation.

## Out of scope

- Editing the title, description, or any metadata from fullscreen.
- Publishing or draft controls in the pill — those stay in `AdminTools`.
- Any change to the embedded editor's layout beyond adding the enter button and
  sourcing its tool buttons from `editorTools.tsx`.
- Applying Newsreader anywhere outside the fullscreen surface.
