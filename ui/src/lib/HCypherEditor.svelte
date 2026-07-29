<!-- HCypherEditor.svelte (Svelte 5) -->
<script lang="ts">
  import ColorTextTag from './ColorTextTag.svelte';

  // Props using Svelte 5 runes
  let {
    value = $bindable(''),
    bgColor = '#0b0f19'
  }: {
    value: string;
    bgColor?: string;
  } = $props();

  let textareaElement: HTMLTextAreaElement | null = $state(null);
  let highlightsElement: HTMLDivElement | null = $state(null);
  let cursorIndex = $state(0);

  // Sync scroll positions
  function handleScroll() {
    if (textareaElement && highlightsElement) {
      highlightsElement.scrollTop = textareaElement.scrollTop;
      highlightsElement.scrollLeft = textareaElement.scrollLeft;
    }
  }

  // Update cursor position tracking
  function updateCursor() {
    if (textareaElement) {
      cursorIndex = textareaElement.selectionStart;
    }
  }

  // Helper to check if the cursor is currently inside or adjacent to a given span
  function isCursorClose(start: number, end: number): boolean {
    return cursorIndex >= start - 1 && cursorIndex <= end + 1;
  }

  // Custom callback when a ColorTextTag selects a new color
  function handleColorSelect(start: number, end: number, newColor: string) {
    const before = value.substring(0, start);
    const after = value.substring(end);
    value = before + newColor + after;

    // Refocus the textarea and set the cursor at the end of the replaced token
    setTimeout(() => {
      if (textareaElement) {
        textareaElement.focus();
        textareaElement.selectionStart = start + newColor.length;
        textareaElement.selectionEnd = start + newColor.length;
        cursorIndex = textareaElement.selectionStart;
      }
    }, 10);
  }

  // Token definition structure
  interface HighlightToken {
    type: 'text' | 'comment' | 'keyword' | 'tag' | 'membrane' | 'color';
    content: string;
    start: number;
    end: number;
  }

  // Tokenize and parse H-Cypher text for syntax highlighting and tag injection
  let tokens = $derived.by<HighlightToken[]>(() => {
    const list: HighlightToken[] = [];
    const text = value;
    let index = 0;

    // Split text into lines to easily process single-line comments
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let lineIndex = 0;

      while (lineIndex < line.length) {
        const remaining = line.substring(lineIndex);
        const globalStart = index + lineIndex;

        // 1. Match comments
        if (remaining.startsWith('//')) {
          const content = remaining;
          list.push({
            type: 'comment',
            content,
            start: globalStart,
            end: globalStart + content.length,
          });
          lineIndex += content.length;
          continue;
        }

        // 2. Match Hex Colors (#ec4899)
        const colorMatch = remaining.match(/^#[0-9a-fA-F]{6}\b/);
        if (colorMatch) {
          const content = colorMatch[0];
          list.push({
            type: 'color',
            content,
            start: globalStart,
            end: globalStart + content.length,
          });
          lineIndex += content.length;
          continue;
        }

        // 3. Match Keywords / Operator Prefixes
        const kwMatch = remaining.match(/^(MATCH|TRANSITION|op::[a-zA-Z0-9_]+|var::[a-zA-Z0-9_]+|val::[a-zA-Z0-9_]+|sys::[a-zA-Z0-9_]+)\b/);
        if (kwMatch) {
          const content = kwMatch[0];
          list.push({
            type: 'keyword',
            content,
            start: globalStart,
            end: globalStart + content.length,
          });
          lineIndex += content.length;
          continue;
        }

        // 4. Match Edges / Arrow relationships (-[:REL]->)
        const edgeMatch = remaining.match(/^-[:[a-zA-Z0-9_ \t#]+]->/);
        if (edgeMatch) {
          const content = edgeMatch[0];
          list.push({
            type: 'tag',
            content,
            start: globalStart,
            end: globalStart + content.length,
          });
          lineIndex += content.length;
          continue;
        }

        // 5. Match Membranes ([NAME])
        const membMatch = remaining.match(/^\[[a-zA-Z0-9_ ]+\]/);
        if (membMatch) {
          const content = membMatch[0];
          list.push({
            type: 'membrane',
            content,
            start: globalStart,
            end: globalStart + content.length,
          });
          lineIndex += content.length;
          continue;
        }

        // 6. Match standard characters
        const char = remaining.charAt(0);
        list.push({
          type: 'text',
          content: char,
          start: globalStart,
          end: globalStart + 1,
        });
        lineIndex += 1;
      }

      // Add a newline token unless it is the last line
      if (i < lines.length - 1) {
        list.push({
          type: 'text',
          content: '\n',
          start: index + line.length,
          end: index + line.length + 1,
        });
      }
      index += line.length + 1; // update global index (+1 for newline character)
    }

    return list;
  });
</script>

<div class="editor-wrapper" style:--editor-bg={bgColor}>
  <!-- Highlight mirror overlay backdrop (scrolled in sync) -->
  <div class="highlights" bind:this={highlightsElement}>
    {#each tokens as token}
      {#if token.type === 'comment'}
        <span class="comment">{token.content}</span>
      {:else if token.type === 'keyword'}
        <span class="keyword">{token.content}</span>
      {:else if token.type === 'tag'}
        <span class="relationship">{token.content}</span>
      {:else if token.type === 'membrane'}
        <span class="membrane-bracket">{token.content}</span>
      {:else if token.type === 'color'}
        {#if isCursorClose(token.start, token.end)}
          <!-- If cursor is close, show raw text for editing -->
          <span class="raw-color">{token.content}</span>
        {:else}
          <!-- Otherwise, mask and render our beautiful abstract ColorTextTag -->
          <ColorTextTag 
            color={token.content} 
            {bgColor}
            onselect={(c) => handleColorSelect(token.start, token.end, c)}
          />
        {/if}
      {:else}
        {token.content}
      {/if}
    {/each}
  </div>

  <!-- Real interactive transparent textarea capturing caret/input -->
  <textarea
    bind:this={textareaElement}
    bind:value
    placeholder="// Enter H-Cypher declarations..."
    spellcheck="false"
    on:scroll={handleScroll}
    on:input={updateCursor}
    on:click={updateCursor}
    on:keyup={updateCursor}
    on:select={updateCursor}
    on:focus={updateCursor}
  ></textarea>
</div>

<style>
  .editor-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: var(--editor-bg);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  /* Shared common styles to ensure perfect pixel alignment between overlay and textarea */
  .highlights, textarea {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 16px;
    font-family: 'Fira Code', 'Courier New', Courier, monospace;
    font-size: 11.5px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-wrap: break-word;
    box-sizing: border-box;
    border: none;
    outline: none;
  }

  /* Real interactive textarea */
  textarea {
    background: transparent;
    color: transparent; /* Makes text transparent so the underlying highlight is visible */
    caret-color: #00d2ff; /* Keeps our glowing cyan caret visible! */
    resize: none;
    z-index: 2;
  }

  /* Behind-the-scenes highlight viewer */
  .highlights {
    color: #94a3b8; /* Default text color */
    z-index: 1;
    overflow-y: auto;
    overflow-x: hidden;
    pointer-events: none; /* Let clicks fall through to the textarea, EXCEPT for pointer-events: auto children! */
  }

  /* Token syntax highlight colors */
  .comment {
    color: #64748b;
    font-style: italic;
  }

  .keyword {
    color: #a855f7; /* Violet */
    font-weight: bold;
  }

  .relationship {
    color: #3b82f6; /* Blue */
    font-weight: bold;
  }

  .membrane-bracket {
    color: #ec4899; /* Pink */
    font-weight: bold;
  }

  .raw-color {
    color: #22c55e; /* Green edit state */
    font-weight: bold;
    text-decoration: underline;
    background-color: rgba(34, 197, 94, 0.08);
    padding: 0 2px;
    border-radius: 2px;
  }
</style>
