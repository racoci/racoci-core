# CyberEditor Specification

`CyberEditor.svelte` is a highly-reactive, zero-dependency generic text editor component designed for Svelte 5. It uses a dual-layer overlapping technique to achieve syntax highlighting without the overhead of heavy DOM manipulation (like traditional `contenteditable` divs).

## Layer Architecture

1. **Highlights Layer (`div.highlights-layer`):** A read-only background layer that renders the syntax-colored text. It parses raw text through the `TextMateLexer` and maps tokens to CSS classes. It sits perfectly aligned beneath the textarea.
2. **Editing Layer (`textarea.editor-textarea`):** A transparent foreground layer where the user types. The text is invisible (`-webkit-text-fill-color: transparent`), but the caret and selection highlights remain visible.

## Hybrid Indexing & Autocomplete

The editor intercepts keydown events (`ArrowUp`, `ArrowDown`, `Tab`, `Enter`) to navigate a floating autocomplete suggestions list. The suggestions are derived dynamically by scanning the TextMate tokens and extracting terms that match specific generic scopes (e.g. `entity.name.node.*`), mixed with static keyword fallbacks.
