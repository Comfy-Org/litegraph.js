import { describe, expect, test } from "vitest"

// Use barrel import to avoid circular dependencies
import { LGraph, LGraphGroup } from "@/litegraph"

describe("Group Nesting Fix", () => {
  test("should fix nested group interaction issue", () => {
    const graph = new LGraph()
    
    // Create nested groups: outer contains inner
    // Note: LGraphGroup.minWidth = 140, minHeight = 80
    const outer = new LGraphGroup("Outer Group", 1)
    outer.pos = [0, 0]
    outer.size = [300, 300]
    
    const inner = new LGraphGroup("Inner Group", 2)
    inner.pos = [50, 50]
    inner.size = [200, 200]
    
    // Add groups to graph - this should trigger recomputeInsideNodes
    graph.add(outer)
    graph.add(inner)
    
    // Test that groups are in correct order (parents before children)
    const groups = graph.groups
    expect(groups).toHaveLength(2)
    
    // The group array should be sorted so parent comes before child
    // After recomputeInsideNodes, the array should be reordered correctly
    const outerIndex = groups.indexOf(outer)
    const innerIndex = groups.indexOf(inner)
    
    // Outer should come before inner in the array (lower index = rendered first = behind)
    expect(outerIndex).toBeLessThan(innerIndex)
    
    // Test that point queries work correctly (inner group should be found at its location)
    const innerGroup = graph.getGroupOnPos(100, 100) // Point inside inner group
    const outerGroup = graph.getGroupOnPos(25, 25) // Point in outer but not inner
    
    expect(innerGroup).toBe(inner) // Should get inner group (on top)
    expect(outerGroup).toBe(outer) // Should get outer group
  })

  test("should handle multiple nested levels", () => {
    const graph = new LGraph()
    
    // Create 3-level nesting
    const level1 = new LGraphGroup("Level 1", 1)
    level1.pos = [0, 0]
    level1.size = [400, 400]
    
    const level2 = new LGraphGroup("Level 2", 2)  
    level2.pos = [50, 50]
    level2.size = [300, 300]
    
    const level3 = new LGraphGroup("Level 3", 3)
    level3.pos = [100, 100]
    level3.size = [200, 200]
    
    // Add in order (should work regardless of order due to recomputeInsideNodes)
    graph.add(level1)
    graph.add(level2)  
    graph.add(level3)
    
    const groups = graph.groups
    expect(groups).toEqual([level1, level2, level3])
    
    // Test point query returns innermost group
    const innermost = graph.getGroupOnPos(200, 200)
    expect(innermost).toBe(level3)
  })

  test("should handle adding groups in reverse order", () => {
    const graph = new LGraph()
    
    const outer = new LGraphGroup("Outer", 1)
    outer.pos = [0, 0]
    outer.size = [300, 300]
    
    const inner = new LGraphGroup("Inner", 2)
    inner.pos = [50, 50]  
    inner.size = [200, 200]
    
    // Add inner first, then outer (reverse nesting order)
    graph.add(inner)
    graph.add(outer)
    
    // Should still be sorted correctly after both additions
    const groups = graph.groups
    const outerIndex = groups.indexOf(outer)
    const innerIndex = groups.indexOf(inner)
    
    expect(outerIndex).toBeLessThan(innerIndex)
  })
})