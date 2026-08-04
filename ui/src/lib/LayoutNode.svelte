<!-- LayoutNode.svelte -->
<script lang="ts">
  import type { LayoutNode as LayoutNodeType } from './layout.js';
  import PaneNode from './PaneNode.svelte';
  import WidgetNode from './WidgetNode.svelte';

  // Props using Svelte 5 runes
  let { node }: { node: LayoutNodeType } = $props();
</script>

{#if node.type === 'split'}
  <PaneNode {node} />
{:else}
  <WidgetNode {node} />
{/if}
