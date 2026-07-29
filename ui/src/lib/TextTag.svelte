<!-- TextTag.svelte (Svelte 5) -->
<script lang="ts">
  import { type Snippet } from 'svelte';

  // Props using Svelte 5 run-time destructuring pattern
  let { 
    color = '#ffffff', 
    bgColor = 'rgba(255, 255, 255, 0.15)', 
    onclick,
    children
  }: { 
    color?: string; 
    bgColor?: string; 
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  } = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span 
  class="text-tag" 
  style:--tag-color={color} 
  style:--tag-bg={bgColor}
  on:click={onclick}
>
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .text-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--tag-bg);
    color: var(--tag-color);
    border: 1px solid var(--tag-color);
    border-radius: 4px;
    padding: 0 4px;
    margin: 0 2px;
    font-size: 10px;
    font-weight: bold;
    font-family: monospace;
    cursor: pointer;
    user-select: none;
    pointer-events: auto; /* Re-enable clicks in pointer-events: none mirror overlay */
    transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
    line-height: 1.2;
    vertical-align: middle;
  }

  .text-tag:hover {
    background-color: rgba(from var(--tag-color) r g b / 0.3);
    transform: scale(1.05);
  }

  .text-tag:active {
    transform: scale(0.95);
  }
</style>
