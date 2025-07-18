# DOM Widget ContainerNode Changes

## LiteGraph Changes (Completed)

### 1. Added `containerNode` property to widget interfaces and classes:

**In `src/types/widgets.ts` (IBaseWidget interface):**
```typescript
/** 
 * Reference to the subgraph container node when this widget is inside a subgraph.
 * Used for positioning DOM widgets that are promoted to parent graphs.
 */
containerNode?: LGraphNode
```

**In `src/widgets/BaseWidget.ts` (BaseWidget class):**
```typescript
/** 
 * Reference to the subgraph container node when this widget is inside a subgraph.
 * Used for positioning DOM widgets that are promoted to parent graphs.
 */
containerNode?: LGraphNode
```

### 2. Modified `SubgraphNode.ts` to set containerNode:

**In `#setWidget()` method:**
- Creates a copy of the widget (for all widgets, to avoid execution issues)
- For DOM widgets specifically, sets `promotedWidget.containerNode = this` (the subgraph node)

**In `onRemoved()` method:**
- Cleans up containerNode references when the subgraph is removed

## Frontend Changes Needed

### 1. Update DOM Widget Positioning Logic

Wherever the frontend positions DOM widgets (likely in a DOM widget manager or positioning system), update to use:

```typescript
// Old approach:
const node = widget.node
const position = [node.pos[0] + margin, node.pos[1] + margin + widget.y]

// New approach:
const positionNode = widget.containerNode || widget.node
const position = [positionNode.pos[0] + margin, positionNode.pos[1] + margin + widget.y]
```

### 2. Key Areas to Check:

1. **DOM Widget Creation/Registration** - When DOM widgets are created and positioned initially
2. **Graph Navigation** - When switching between graphs/subgraphs, repositioning logic
3. **Widget Update/Render Loop** - Any continuous positioning updates
4. **Resize/Zoom Handlers** - May need to use containerNode for proper scaling

### 3. Benefits:

- DOM widgets promoted from subgraphs will be positioned relative to the subgraph node (their container) instead of their original node inside the subgraph
- This fixes positioning issues when navigating between graph levels
- The `|| widget.node` fallback ensures backward compatibility for widgets not in subgraphs

## Summary

The LiteGraph side now provides `widget.containerNode` which points to the subgraph node when a widget is promoted from inside a subgraph. The frontend just needs to check for this property when calculating widget positions and use it instead of `widget.node` when available.