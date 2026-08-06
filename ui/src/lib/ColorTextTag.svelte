<!-- ColorTextTag.svelte (Svelte 5) -->
<script lang="ts">
  import TextTag from './TextTag.svelte';
  import { getRelativeLuminance, hexToRgb } from './ColorMath';

  // Props using Svelte 5 runes
  let {
    color = '#ffffff',
    bgColor = '#0b0f19',
    onselect
  }: {
    color?: string;
    bgColor?: string;
    onselect: (newColor: string) => void;
  } = $props();

  let showPicker = $state(false);
  let isHovered = $state(false);

  // Allowed vibrant palette
  const allowedPalette = [
    '#ffffff', // Default/White
    '#00d2ff', // Neon Cyan
    '#a855f7', // Neon Violet
    '#22c55e', // Neon Green
    '#eab308', // Neon Gold
    '#f97316', // Neon Orange
    '#ec4899', // Neon Pink
  ];

  // Derive contrast-safe palette options
  let safePalette = $derived(
    allowedPalette.filter(option => {
      const optionRgb = hexToRgb(option);
      const optionL = getRelativeLuminance(optionRgb.r, optionRgb.g, optionRgb.b);
      const bgRgb = hexToRgb(bgColor);
      const bgL = getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
      const dl = Math.abs(optionL - bgL);
      // Only keep options that have at least 0.35 relative luminance difference
      return dl >= 0.35;
    })
  );

  function togglePicker(e: MouseEvent) {
    e.stopPropagation();
    showPicker = !showPicker;
  }

  function selectColor(c: string, e: MouseEvent) {
    e.stopPropagation();
    onselect(c);
    showPicker = false;
  }

  function closePicker() {
    showPicker = false;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span 
  class="color-tag-wrapper"
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
>
  <TextTag 
    {color} 
    bgColor={`${color}22`} 
    onclick={togglePicker}
  >
    <span class="hash-symbol">#</span>
    {#if isHovered}
      <span class="color-hex">{color.replace('#', '')}</span>
    {/if}
  </TextTag>

  {#if showPicker}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="backdrop" onclick={closePicker}></div>
    <div class="picker-popup" style:--picker-bg={bgColor}>
      <div class="picker-header">SELECT TOPOLOGY COLOR</div>
      <div class="palette-grid">
        {#each safePalette as paletteColor}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <span 
            class="color-option"
            class:active={color.toLowerCase() === paletteColor.toLowerCase()}
            style:background-color={paletteColor}
            style:--opt-shadow={paletteColor}
            onclick={(e) => selectColor(paletteColor, e)}
            title={paletteColor}
          ></span>
        {/each}
      </div>
    </div>
  {/if}
</span>

<style>
  .color-tag-wrapper {
    position: relative;
    display: inline-block;
    vertical-align: middle;
    pointer-events: auto; /* Re-enable clicks in pointer-events: none mirror overlay */
  }

  .hash-symbol {
    font-size: 11px;
    font-weight: bold;
    display: inline-block;
    transform: translateY(-0.5px);
  }

  /* Backdrop overlay to click outside and close */
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999;
    pointer-events: auto;
  }

  .picker-popup {
    position: absolute;
    top: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--picker-bg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    z-index: 1000;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 150px;
    animation: popIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: translateX(-50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
  }

  .picker-header {
    font-size: 8px;
    color: #64748b;
    font-weight: bold;
    letter-spacing: 0.5px;
    font-family: monospace;
    text-align: center;
  }

  .palette-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    max-width: 160px;
  }

  .color-option {
    display: inline-block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: transform 0.15s, border-color 0.15s;
  }

  .color-option:hover {
    transform: scale(1.15);
    border-color: #ffffff;
    box-shadow: 0 0 6px var(--opt-shadow);
  }

  .color-option.active {
    transform: scale(1.2);
    border-color: #ffffff;
    box-shadow: 0 0 8px var(--opt-shadow);
  }

  .color-hex {
    font-size: 8px;
    margin-left: 2px;
    font-family: monospace;
    display: inline-block;
    vertical-align: middle;
  }
</style>
