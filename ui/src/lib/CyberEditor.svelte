<!-- CyberEditor.svelte (Svelte 5) -->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { TextMateLexer, type HighlightToken } from './TextMateLexer.js';
  import { applyContrastProtection } from './ColorMath.js';

  // Props using Svelte 5 runes
  let {
    value = $bindable(''),
    grammar,
    placeholder = 'Digite seu código aqui...'
  }: {
    value: string;
    grammar: any;
    placeholder?: string;
  } = $props();

  let textareaElement = $state<HTMLTextAreaElement | null>(null);
  let highlightsElement = $state<HTMLDivElement | null>(null);

  // Instancia o Lexer reativamente de acordo com a gramática e os dados digitados
  let lexer = $derived(new TextMateLexer(grammar));
  let tokens = $derived(lexer.tokenize(value));

  // Sincroniza a rolagem entre a textarea transparente e a sobreposição de realce
  function handleScroll() {
    if (textareaElement && highlightsElement) {
      highlightsElement.scrollTop = textareaElement.scrollTop;
      highlightsElement.scrollLeft = textareaElement.scrollLeft;
    }
  }

  // === FASE 2: INDEXADOR HÍBRIDO E AUTOCOMPLETE ===
  let showAutocomplete = $state(false);
  let autocompleteX = $state(0);
  let autocompleteY = $state(16);
  let autocompleteQuery = $state('');
  let selectedIndex = $state(0);
  let caretPos = $state(0); // Tracks cursor position for smart expansion!

  function updateCaretPos() {
    if (textareaElement) {
      caretPos = textareaElement.selectionStart;
    }
  }

  // Escopo estático e indexador de escopos semânticos do TextMate em tempo real!
  const staticSuggestions = ['MATCH', 'DEPENDS_ON', 'SYNCS_WITH', 'ROUTES_TO', 'BUFFERED_BY', 'MONITORS', 'LOGS'];
  const themeColorSuggestions = ['#66fcf1', '#ec4899', '#a855f7', '#facc15', '#22c55e', '#0b0f19', '#05070a', '#ffffff'];
  
  let dynamicSuggestions = $derived.by<string[]>(() => {
    const list = new Set<string>();
    tokens.forEach(t => {
      // Indexa palavras que caem sob escopos de nós, membranas ou cores do TextMate
      if (
        t.scopes.includes('entity.name.node.hcypher') || 
        t.scopes.includes('entity.name.membrane.hcypher') ||
        t.scopes.includes('constant.numeric.color.hcypher')
      ) {
        list.add(t.content);
      }
    });
    return Array.from(list);
  });

  // Lista consolidada e filtrada de sugestões
  let filteredSuggestions = $derived.by<string[]>(() => {
    const query = autocompleteQuery.toUpperCase();
    
    // Se estivermos buscando uma cor (prefixo #), mostre APENAS as cores do tema!
    if (query.startsWith('#')) {
      return themeColorSuggestions.filter(s => s.toUpperCase().includes(query));
    }

    if (!query) return [...staticSuggestions, ...dynamicSuggestions];
    
    const combined = Array.from(new Set([...staticSuggestions, ...dynamicSuggestions]));
    return combined.filter(s => s.toUpperCase().includes(query));
  });

  // Calcula a coordenada exata em pixels do cursor (caret) dentro do editor
  function getCaretCoordinates(): { x: number; y: number } {
    if (!textareaElement) return { x: 0, y: 0 };
    
    const { selectionStart } = textareaElement;
    const textBeforeCaret = textareaElement.value.substring(0, selectionStart);
    
    const mirror = document.createElement('div');
    const computed = window.getComputedStyle(textareaElement);
    
    for (const prop of computed) {
      mirror.style[prop] = computed[prop];
    }
    
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordBreak = 'break-all';
    mirror.style.overflow = 'hidden';
    mirror.style.width = `${textareaElement.clientWidth}px`;
    mirror.style.height = 'auto';
    
    mirror.textContent = textBeforeCaret;
    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);
    
    document.body.appendChild(mirror);
    const rect = marker.getBoundingClientRect();
    const parentRect = textareaElement.getBoundingClientRect();
    
    const x = rect.left - parentRect.left - textareaElement.scrollLeft;
    const y = rect.top - parentRect.top - textareaElement.scrollTop + 18; // 18px abaixo da linha
    
    document.body.removeChild(mirror);
    return { x, y };
  }

  // Monitora alterações de digitação para abrir o popover de autocompletação ou color picker
  function handleInput(e: Event) {
    if (!textareaElement) return;
    
    const text = textareaElement.value;
    const pos = textareaElement.selectionStart;
    
    // Captura a palavra sendo digitada ou um prefixo de cor de forma isolada!
    const lastWordRegex = /(#[0-9a-fA-F]*|[\w_]+)$/;
    const textBefore = text.slice(0, pos);
    const match = lastWordRegex.exec(textBefore);
    
    if (match) {
      const query = match[1];

      // Ativa autocomplete se for maior que 1 letra ou gatilho comum (incluindo '#')
      if (query.length >= 1) {
        const coords = getCaretCoordinates();
        autocompleteX = coords.x;
        autocompleteY = coords.y;
        autocompleteQuery = query;
        showAutocomplete = true;
        showColorPicker = false; // Hide color picker if typing a new word
        selectedIndex = 0;
        return;
      }
    }
    
    showAutocomplete = false;
    showColorPicker = false;
  }

  // Insere o item selecionado na autocompletação diretamente no cursor de digitação
  function applySuggestion(suggestion: string) {
    if (!textareaElement || !suggestion) return; // FIX: Guard against undefined
    
    const text = value;
    const pos = textareaElement.selectionStart;
    
    // Encontra os limites da palavra parcial ou cor sendo editada para substituí-la sem apagar o que está antes!
    const lastWordRegex = /(#[0-9a-fA-F]*|[\w_]+)$/;
    const textBefore = text.slice(0, pos);
    const match = lastWordRegex.exec(textBefore);
    
    if (match) {
      const wordLength = match[1].length;
      const start = pos - wordLength;
      value = text.slice(0, start) + suggestion + text.slice(pos);
      
      // Restaura o foco na textarea e posiciona o cursor logo após o termo inserido
      setTimeout(() => {
        if (textareaElement) {
          textareaElement.focus();
          textareaElement.selectionStart = start + suggestion.length;
          textareaElement.selectionEnd = start + suggestion.length;
        }
      }, 0);
    }
    
    showAutocomplete = false;
  }

  // Captura comandos de teclado direcionais para navegar pelas sugestões
  function handleKeyDown(e: KeyboardEvent) {
    if (showAutocomplete && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % filteredSuggestions.length;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + filteredSuggestions.length) % filteredSuggestions.length;
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        const suggestion = filteredSuggestions[selectedIndex];
        if (suggestion) {
          e.preventDefault();
          applySuggestion(suggestion);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        showAutocomplete = false;
      }
    }
  }

  // === FASE 3: COLOR PICKER INTERATIVO ===
  let showColorPicker = $state(false);
  let colorPickerX = $state(0);
  let colorPickerY = $state(0);
  let activeColorHex = $state('');
  let activeColorOffset = $state(0);
  let colorInputElement = $state<HTMLInputElement | null>(null);

  // Monitora o movimento do mouse para detectar hover sobre códigos hexadecimais de cor
  function handleMouseMove(e: MouseEvent) {
    if (!textareaElement) return;

    const pos = textareaElement.selectionStart;
    const text = textareaElement.value;
    
    const hexColorRegex = /(#[0-9a-fA-F]{6})/g;
    let match;
    let found = false;

    while ((match = hexColorRegex.exec(text)) !== null) {
      const start = match.index;
      const end = hexColorRegex.lastIndex;
      
      if (pos >= start && pos <= end) {
        // Usa a coordenada real do MOUSE, e não do cursor de digitação (caret)
        colorPickerX = x;
        colorPickerY = y - 28; // Abre imediatamente acima do mouse
        activeColorHex = match[1];
        activeColorOffset = start;
        showColorPicker = true;
        found = true;
        break;
      }
    }

    if (!found) {
      // Avoid closing if we just typed `#`
      if (text[pos - 1] !== '#') {
        showColorPicker = false;
      }
    }
  }

  // Dispara a substituição em tempo de digitação contínua via oninput do color picker
  function handleColorInput(e: Event) {
    if (!colorInputElement || !textareaElement) return;
    
    const newColor = colorInputElement.value;
    const text = value;
    const start = activeColorOffset;
    
    // Substitui o código de cor antigo de 7 caracteres (ex: #ec4899) pelo novo
    value = text.slice(0, start) + newColor + text.slice(start + 7);
    activeColorHex = newColor;

    setTimeout(() => {
      if (textareaElement) {
        textareaElement.focus();
        textareaElement.selectionStart = start + 7;
        textareaElement.selectionEnd = start + 7;
      }
    }, 0);
  }

  function triggerColorSelection() {
    if (colorInputElement) {
      colorInputElement.click();
    }
  }

  // Fecha o autocomplete ou popup se clicar fora do editor
  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (target && !target.closest('.cyber-editor-viewport')) {
      showAutocomplete = false;
      showColorPicker = false;
    }
  }

  onMount(() => {
    window.addEventListener('click', handleWindowClick);
    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  });
</script>

<div class="cyber-editor-viewport">
  <!-- Sobreposição de realce TextMate (Atrás) -->
  <div class="highlights-layer" bind:this={highlightsElement}>
    {#each tokens as token}
      <!-- Mapeia escopos semânticos para classes de colorização cyberpunk -->
      {#if token.scopes[0].includes('constant.numeric.color')}
        <!-- Se o token for uma cor hexadecimal, renderiza-o colapsado, ocultando o texto com a própria cor do fundo! -->
        {@const isActive = caretPos >= token.start && caretPos <= token.end}
        {@const contrastColor = applyContrastProtection(token.content, '#ffffff')}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <span 
          class="custom-hex-tag {isActive ? 'active' : ''}" 
          style="--hex-color: {token.content}; --hex-contrast: {contrastColor};"
        >
          <span class="hex-hash">#</span><span class="hex-digits">{token.content.slice(1)}</span>
        </span>
      {:else}
        <span class="token-span {token.scopes[0].replace(/\./g, ' ')}">
          {token.content}
        </span>
      {/if}
    {/each}
  </div>

  <!-- Camada de Edição Transparente (Frente) -->
  <textarea
    bind:this={textareaElement}
    bind:value={value}
    {placeholder}
    onscroll={handleScroll}
    oninput={(e) => { handleInput(e); updateCaretPos(); }}
    onkeydown={(e) => { handleKeyDown(e); updateCaretPos(); }}
    onkeyup={updateCaretPos}
    onclick={updateCaretPos}
    onmouseup={updateCaretPos}
    onmousemove={(e) => { handleMouseMove(e); updateCaretPos(); }}
    spellcheck="false"
    class="editor-textarea"
  ></textarea>

  <!-- === FASE 2: POPUP FLUTUANTE DE AUTOCOMPLETE === -->
  {#if showAutocomplete && filteredSuggestions.length > 0}
    <div 
      class="autocomplete-popover" 
      style="left: {autocompleteX}px; top: {autocompleteY}px;"
    >
      {#each filteredSuggestions as suggestion, idx}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="autocomplete-item" 
          class:selected={idx === selectedIndex}
          onclick={() => applySuggestion(suggestion)}
        >
          <span class="suggestion-text">
            {#if suggestion.startsWith('#')}
              <span class="inline-color-swatch" style="background-color: {suggestion};"></span>
            {/if}
            {suggestion}
          </span>
          <span class="suggestion-badge">{suggestion.startsWith('#') ? 'color' : (suggestion === 'MATCH' ? 'control' : 'entity')}</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- === FASE 3: POPUP FLUTUANTE COM COLOR PICKER IN-PLACE === -->
  {#if showColorPicker}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div 
      class="color-picker-popover"
      style="left: {colorPickerX}px; top: {colorPickerY}px;"
      onclick={triggerColorSelection}
    >
      <div class="color-bubble-preview" style="background-color: {activeColorHex};"></div>
      <span class="color-picker-text">PICK COLOR</span>
      
      <!-- Seletor de cores nativo invisível disparado programmaticamente -->
      <input 
        type="color" 
        bind:this={colorInputElement} 
        value={activeColorHex}
        oninput={handleColorInput}
        class="hidden-color-input"
      />
    </div>
  {/if}
</div>

<style>
  .cyber-editor-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    background-color: #060913;
    font-family: "Fira Code", monospace;
    font-size: 11px;
    line-height: 1.5;
    overflow: hidden;
    border: 1px solid rgba(102, 252, 241, 0.1);
  }

  /* Camada de destaques TextMate (Atrás) */
  .highlights-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: auto;
    color: #94a3b8;
    z-index: 1;
    pointer-events: none; /* deixa cliques passarem para a textarea */
    
    /* ALINHAMENTO DE FONTE REQUERIDO */
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    margin: 0;
    border: none;
  }

  /* Textarea transparente (Frente) */
  .editor-textarea {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
    background: transparent !important;
    background-color: transparent !important;
    color: transparent !important;
    -webkit-text-fill-color: transparent !important; /* impede colorização padrão de texto do navegador */
    caret-color: #66fcf1 !important; /* cursor de digitação de neon ciano */
    border: none !important;
    outline: none !important;
    resize: none !important;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: auto;
    z-index: 2;

    /* ALINHAMENTO DE FONTE REQUERIDO (Alinha o cursor ao fundo) */
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    margin: 0;
  }

  /* Mapeamento de Classes e Cores de Tokenização do TextMate */
  .token-span {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  /* 1. Comentários de Linha: Cinza */
  :global(.comment) {
    color: #45a29e !important;
    font-style: italic;
  }

  /* 2. Palavras-Chave de Controle (MATCH): Roxo Neon */
  :global(.keyword.control) {
    color: #a855f7 !important;
    font-weight: bold;
    text-shadow: 0 0 6px rgba(168, 85, 247, 0.3);
  }

  /* 3. Nós: Branco Brilhante */
  :global(.entity.name.node) {
    color: #f8fafc !important;
    font-weight: bold;
  }

  /* 4. Membranas: Rosa-Choque */
  :global(.entity.name.membrane) {
    color: #ec4899 !important;
    font-weight: bold;
    text-shadow: 0 0 6px rgba(236, 72, 153, 0.3);
  }

  /* 5. Constantes de Cores Hexadecimais customizadas */
  :global(.custom-hex-tag) {
    color: var(--hex-color);
    font-weight: bold;
    border-radius: 4px;
    padding: 0 1px;
    transition: background-color 0.1s;
  }
  
  /* Oculta os digitos visualmente fundindo com o background, formando um bloco de cor, mas preservando o tamanho real! */
  :global(.hex-digits) {
    color: transparent;
    background-color: var(--hex-color);
    border-radius: 2px;
    transition: background-color 0.1s, color 0.1s;
  }

  /* Revela o código quando o cursor passa por cima ou está ativo! */
  :global(.custom-hex-tag:hover .hex-digits),
  :global(.custom-hex-tag.active .hex-digits) {
    color: var(--hex-contrast);
    background-color: var(--hex-color);
  }

  /* 6. Relacionamentos: Ciano Neon */
  :global(.keyword.operator.relationship) {
    color: #00ffcc !important;
    font-weight: bold;
    text-shadow: 0 0 6px rgba(0, 255, 204, 0.3);
  }

  /* === ESTILOS DOS POPOVERS FLUTUANTES === */

  /* 1. Autocomplete */
  .autocomplete-popover {
    position: absolute;
    width: 220px;
    max-height: 160px;
    overflow-y: auto;
    background-color: #0a0e1a;
    border: 1px solid rgba(102, 252, 241, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
    border-radius: 4px;
    z-index: 100;
    font-family: "Fira Code", monospace;
  }

  .autocomplete-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    cursor: pointer;
    font-size: 9px;
    transition: background-color 0.1s ease-in-out;
  }

  .autocomplete-item:hover, .autocomplete-item.selected {
    background-color: rgba(102, 252, 241, 0.15);
  }

  .suggestion-text {
    color: #ffffff;
    font-weight: bold;
  }

  .suggestion-badge {
    font-size: 7px;
    background-color: rgba(102, 252, 241, 0.1);
    border: 1px solid rgba(102, 252, 241, 0.3);
    color: #66fcf1;
    padding: 1px 4px;
    border-radius: 3px;
    text-transform: uppercase;
  }

  /* 2. Color Picker */
  .color-picker-popover {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #0c101f;
    border: 1px solid #ff007f;
    box-shadow: 0 0 10px rgba(255, 0, 127, 0.25);
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
    z-index: 110;
    font-family: "Fira Code", monospace;
    font-size: 8.5px;
    font-weight: bold;
    color: #ff007f;
    letter-spacing: 0.5px;
    transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out;
  }

  .color-picker-popover:hover {
    transform: scale(1.05);
    box-shadow: 0 0 14px rgba(255, 0, 127, 0.4);
  }

  .color-bubble-preview {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  .hidden-color-input {
    display: none;
  }

  .inline-color-swatch {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 6px;
    border: 1px solid rgba(255,255,255,0.4);
    vertical-align: middle;
  }
</style>