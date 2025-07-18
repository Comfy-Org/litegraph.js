# DOM Widget Repositioning Implementation Task

## Background Context

The LiteGraph.js library (v0.16.5) has a widget promotion system that automatically exposes internal subgraph widgets to parent graph interfaces. This works well for regular widgets, but DOM widgets (widgets with HTMLElement properties) cannot be serialized/copied normally.

**Problem**: When navigating between graphs containing promoted DOM widgets, the DOM elements get destroyed and recreated, losing state and causing visual disruption.

**Solution**: Instead of copying DOM widgets during promotion, we use direct references and reposition the existing DOM elements during graph navigation.

## Foundation Branch: PR #4382 (Async Nodes)

This implementation builds on PR #4382 which provides enhanced infrastructure:

1. **Node Locator System** (`src/types/nodeIdentification.ts`):
   - `NodeLocatorId`: Stable identifiers across subgraph instances
   - `NodeExecutionId`: Execution-specific identifiers for nested contexts  
   - `executionIdToNodeLocatorId()`: Maps execution contexts to stable IDs

2. **Enhanced Progress State Management** (`src/stores/executionStore.ts`):
   - Multi-node execution tracking with stable node references
   - Better async node support for widget state management

3. **Improved Event System**: Multi-node preview support and enhanced context tracking

These utilities provide stable node identification and better async support, which complements DOM widget repositioning during subgraph navigation.

## What's Already Implemented (LiteGraph.js)

The foundational work is complete in LiteGraph.js:

1. **DOM Widget Type Guard** (`src/widgets/BaseWidget.ts:305`):
   ```typescript
   isDOMWidget(): this is this & { element: HTMLElement } {
     return this.element instanceof HTMLElement
   }
   ```

2. **Modified SubgraphNode** (`src/subgraph/SubgraphNode.ts:189-228`):
   - Detects DOM widgets using `isDOMWidget()` type guard
   - For DOM widgets: Uses direct reference instead of copying
   - For non-DOM widgets: Creates a copy as before
   - Applies name/label property overrides to both types

## Your Task: Frontend Implementation

You need to implement DOM widget repositioning in the ComfyUI frontend that will:

1. **Listen for graph navigation events** (`litegraph:set-graph`)
2. **Find DOM widgets** by checking `widget.element instanceof HTMLElement`
3. **Reposition DOM elements** instead of destroying/recreating them

## Implementation Pattern

Create a Vue composable that handles this automatically:

```typescript
// composables/useDOMWidgetRepositioning.ts
import { type NodeLocatorId, createNodeLocatorId } from '@/types/nodeIdentification'
import { useDOMWidgetStore } from '@/stores/domWidgetStore'
import { useExecutionStore } from '@/stores/executionStore'

export function useDOMWidgetRepositioning() {
  const graphStore = useGraphStore()
  const domWidgetStore = useDOMWidgetStore()
  const executionStore = useExecutionStore()
  
  // Watch for graph changes
  watch(() => graphStore.currentGraph, (newGraph, oldGraph) => {
    if (!newGraph || !oldGraph) return
    
    // Find all DOM widgets in the new graph
    const domWidgets = newGraph.nodes
      .flatMap(node => node.widgets)
      .filter(widget => widget.element instanceof HTMLElement)
    
    domWidgets.forEach(widget => {
      // Use existing DOM widget store patterns for positioning
      const widgetKey = `${widget.node.id}-${widget.name}`
      
      // Check if widget state exists in store
      const existingWidgetState = domWidgetStore.widgetStates[widgetKey]
      
      if (existingWidgetState && existingWidgetState.element === widget.element) {
        // Reactivate and reposition existing DOM element
        domWidgetStore.activateWidget(widgetKey)
        updateWidgetPosition(widget, existingWidgetState)
      } else {
        // New DOM widget - let normal DOM widget flow handle registration
        // but mark it for repositioning tracking
        widget.element.dataset.repositioningTracked = 'true'
      }
    })
  })
  
  // Listen for LiteGraph events
  useEventListener('litegraph:set-graph', (event) => {
    const { graph } = event.detail
    repositionDOMWidgets(graph)
  })
  
  function updateWidgetPosition(widget: any, widgetState: any) {
    const node = widget.node
    const margin = 15
    
    // Use existing DOM widget positioning logic
    widgetState.pos = [
      node.pos[0] + margin,
      node.pos[1] + margin + (widget.y || 0)
    ]
    widgetState.size = [
      (widget.width ?? node.width) - margin * 2,
      (widget.computedHeight ?? 50) - margin * 2
    ]
  }
  
  function repositionDOMWidgets(graph: any) {
    // Deactivate all widgets first (standard DOM widget store pattern)
    Object.keys(domWidgetStore.widgetStates).forEach(key => {
      domWidgetStore.deactivateWidget(key)
    })
    
    // Reactivate and reposition DOM widgets
    const domWidgets = graph.nodes
      .flatMap(node => node.widgets)
      .filter(widget => widget.element instanceof HTMLElement)
    
    domWidgets.forEach(widget => {
      const widgetKey = `${widget.node.id}-${widget.name}`
      const widgetState = domWidgetStore.widgetStates[widgetKey]
      
      if (widgetState) {
        domWidgetStore.activateWidget(widgetKey)
        updateWidgetPosition(widget, widgetState)
      }
    })
  }
  
  return {
    repositionDOMWidgets
  }
}
```

## Key Technical Details

### DOM Widget Detection
- Use `widget.element instanceof HTMLElement` to identify DOM widgets
- Available on all widget instances after promotion

### Node Identification (from PR #4382)
- **NodeLocatorId**: Stable identifiers across subgraph instances
  - Format: `<subgraph-uuid>:<local-node-id>` or just `<node-id>` for root
  - Use `createNodeLocatorId()` to generate stable widget tracking IDs
- **Enhanced execution tracking**: Multi-node execution support for better async widget state management

### Canvas Coordinate Conversion
Use `canvas.convertOffsetToCanvas(nodePos)` to convert node positions to canvas coordinates for DOM positioning.

### DOM Widget Store Integration
- Leverage existing `domWidgetStore` patterns for consistency
- Use `activateWidget()` and `deactivateWidget()` for show/hide logic
- `widgetStates` map maintains position and size information
- Integrate with existing DOM widget positioning logic instead of creating parallel systems

## Architecture Decisions Made

1. **Frontend vs LiteGraph**: DOM repositioning belongs in the frontend since that's where DOM widgets are created and managed
2. **Functional/Compositional**: Use Vue composables, not singleton classes (matches codebase patterns)
3. **Type Safety**: No type assertions (`as any`) - use proper type guards
4. **Event-Driven**: Use existing LiteGraph events rather than polling
5. **Simplified Approach**: DOM widgets use direct references, avoiding complex metadata tracking

## Important Notes

### Widget Reference Behavior
- DOM widgets promoted to subgraph nodes use the **same object reference** as the original widget
- This means the `widget.node` property still points to the original node inside the subgraph
- For positioning, you may need to use the subgraph node's position instead of `widget.node.pos`

### Shared State Considerations
- Since DOM widgets share the same object reference, modifications affect both the original and promoted widget
- This can be beneficial (shared state) or problematic (unexpected side effects) depending on your use case

## Integration Points

1. **Graph Store**: You'll need access to current graph and canvas instance
2. **Event System**: Hook into `litegraph:set-graph` events
3. **DOM Widget Manager**: Integrate with existing DOM widget management if present

## Testing Considerations

- Test with subgraphs containing DOM widgets
- Verify DOM elements maintain state during navigation
- Check positioning accuracy after graph switches
- Ensure no memory leaks from event listeners

## Success Criteria

When complete:
- DOM widgets should maintain their state when navigating between graphs
- DOM elements should be repositioned smoothly without visual disruption
- No DOM elements should be destroyed/recreated unnecessarily
- Performance should remain good even with many DOM widgets

## Files You'll Likely Need to Modify

- `composables/useDOMWidgetRepositioning.ts` (create new)
- Graph store or main canvas component (integrate the composable)
- Possibly existing DOM widget management files

The LiteGraph.js foundation is solid - your job is to wire up the frontend to use these new capabilities effectively.