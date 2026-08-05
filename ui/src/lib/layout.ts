// layout.ts - Blender-inspired tiling window manager node models

export type SplitType = 'vertical' | 'horizontal';

export interface SplitNode {
  type: 'split';
  split: SplitType;
  percent: number; // 0 to 100 representing the first child size
  children: [LayoutNode, LayoutNode];
}

export interface WidgetNode {
  type: 'widget';
  id: string;
  widgetType: 'editor' | 'canvas' | 'projection3d' | 'workspaces' | 'ssr_simulator' | 'dev_tools';
}

export type LayoutNode = SplitNode | WidgetNode;
