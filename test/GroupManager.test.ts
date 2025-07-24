import { describe, expect, test } from "vitest"

// Use barrel import to avoid circular dependencies
import { LGraph, LGraphGroup } from "@/litegraph"
import { GroupManager } from "@/GroupManager"

describe("GroupManager", () => {
  describe("R-Tree Spatial Index", () => {
    test("should efficiently find groups at specific points", () => {
      const manager = new GroupManager()
      
      // Create test groups
      const group1 = new LGraphGroup("Group 1", 1)
      group1.pos = [0, 0]
      group1.size = [100, 100]
      
      const group2 = new LGraphGroup("Group 2", 2)
      group2.pos = [150, 150]
      group2.size = [100, 100]
      
      const group3 = new LGraphGroup("Group 3", 3)
      group3.pos = [25, 25]
      group3.size = [50, 50] // Inside group1
      
      manager.addGroup(group1)
      manager.addGroup(group2)
      manager.addGroup(group3)
      
      // Test point queries
      expect(manager.getGroupAt(50, 50)).toBe(group3) // Should get smallest containing group
      expect(manager.getGroupAt(10, 10)).toBe(group1) // Should get group1 (group3 doesn't contain this point)
      expect(manager.getGroupAt(200, 200)).toBe(group2)
      expect(manager.getGroupAt(300, 300)).toBe(null)
    })

    test("should handle group nesting correctly", () => {
      const manager = new GroupManager()
      
      // Create nested groups: outer contains middle contains inner
      // Note: LGraphGroup.minWidth = 140, minHeight = 80
      const outer = new LGraphGroup("Outer", 1)
      outer.pos = [0, 0]
      outer.size = [300, 300]
      
      const middle = new LGraphGroup("Middle", 2)
      middle.pos = [25, 25]
      middle.size = [250, 250] // Must be big enough to contain inner (140x80 minimum)
      
      const inner = new LGraphGroup("Inner", 3)
      inner.pos = [50, 50]
      inner.size = [140, 80] // Use actual minimums
      
      manager.addGroup(outer)
      manager.addGroup(middle)
      manager.addGroup(inner)
      
      // Test z-order (parents before children)
      const zOrder = manager.getGroupsInZOrder()
      expect(zOrder).toEqual([outer, middle, inner])
      
      expect(manager.getParentId(inner.id)).toBe(middle.id)
      expect(manager.getParentId(middle.id)).toBe(outer.id)
      expect(manager.getParentId(outer.id)).toBeUndefined()
      
      // Test point queries return innermost group
      expect(manager.getGroupAt(100, 100)).toBe(inner)
      expect(manager.getGroupAt(30, 30)).toBe(middle)
      expect(manager.getGroupAt(10, 10)).toBe(outer)
    })

    test("should efficiently query groups in regions", () => {
      const manager = new GroupManager()
      
      const groups = []
      for (let i = 0; i < 10; i++) {
        const group = new LGraphGroup(`Group ${i}`, i)
        group.pos = [i * 50, i * 50]
        group.size = [40, 40]
        groups.push(group)
        manager.addGroup(group)
      }
      
      // Query a region that should contain some groups
      const inRegion = manager.getGroupsInRegion(75, 75, 225, 225)
      expect(inRegion.length).toBeGreaterThan(0) // Should find some groups
      expect(inRegion).toContain(groups[2])
      expect(inRegion).toContain(groups[3])
      expect(inRegion).toContain(groups[4])
    })

    test("should handle group updates efficiently", () => {
      const manager = new GroupManager()
      
      const group = new LGraphGroup("Test Group", 1)
      group.pos = [0, 0]
      group.size = [50, 50]
      manager.addGroup(group)
      
      // Should find group at original position
      expect(manager.getGroupAt(25, 25)).toBe(group)
      expect(manager.getGroupAt(125, 125)).toBe(null)
      
      // Move group
      group.pos = [100, 100]
      manager.updateGroup(group)
      
      // Should find group at new position
      expect(manager.getGroupAt(25, 25)).toBe(null)
      expect(manager.getGroupAt(125, 125)).toBe(group)
    })

    test("should handle group removal", () => {
      const manager = new GroupManager()
      
      const group1 = new LGraphGroup("Group 1", 1)
      group1.pos = [0, 0]
      group1.size = [50, 50]
      
      const group2 = new LGraphGroup("Group 2", 2)
      group2.pos = [100, 100]
      group2.size = [50, 50]
      
      manager.addGroup(group1)
      manager.addGroup(group2)
      
      expect(manager.getAllGroups()).toHaveLength(2)
      expect(manager.getGroupAt(25, 25)).toBe(group1)
      
      manager.removeGroup(group1)
      
      expect(manager.getAllGroups()).toHaveLength(1)
      expect(manager.getGroupAt(25, 25)).toBe(null)
      expect(manager.getGroupAt(125, 125)).toBe(group2)
    })
  })

  describe("Integration with LGraph", () => {
    test("should integrate seamlessly with LGraph", () => {
      const graph = new LGraph()
      
      const group1 = new LGraphGroup("Group 1", 1)
      group1.pos = [0, 0]
      group1.size = [100, 100]
      
      const group2 = new LGraphGroup("Group 2", 2)
      group2.pos = [25, 25]
      group2.size = [50, 50] // Nested inside group1
      
      // Add groups to graph
      graph.add(group1)
      graph.add(group2)
      
      // Test that groups property returns correct z-order
      const groups = graph.groups
      expect(groups).toHaveLength(2)
      expect(groups[0]).toBe(group1) // Parent first
      expect(groups[1]).toBe(group2) // Child second
      
      // Test efficient point queries
      expect(graph.getGroupOnPos(50, 50)).toBe(group2) // Should get innermost
      expect(graph.getGroupOnPos(10, 10)).toBe(group1) // Should get parent
      expect(graph.getGroupOnPos(200, 200)).toBeUndefined()
    })

    test("should update spatial index when groups move", () => {
      const graph = new LGraph()
      
      const group = new LGraphGroup("Moving Group", 1)
      group.pos = [0, 0]
      group.size = [50, 50]
      
      graph.add(group)
      
      // Should find group at original position
      expect(graph.getGroupOnPos(25, 25)).toBe(group)
      expect(graph.getGroupOnPos(125, 125)).toBeUndefined()
      
      // Move group using its move method (which should update spatial index)
      group.move(100, 100)
      
      // Should find group at new position
      expect(graph.getGroupOnPos(25, 25)).toBeUndefined()
      expect(graph.getGroupOnPos(125, 125)).toBe(group)
    })

    test("should handle group removal from graph", () => {
      const graph = new LGraph()
      
      const group = new LGraphGroup("Test Group", 1)
      group.pos = [0, 0]
      group.size = [50, 50]
      
      graph.add(group)
      expect(graph.groups).toHaveLength(1)
      expect(graph.getGroupOnPos(25, 25)).toBe(group)
      
      graph.remove(group)
      expect(graph.groups).toHaveLength(0)
      expect(graph.getGroupOnPos(25, 25)).toBeUndefined()
    })
  })

  describe("Performance Characteristics", () => {
    test("should handle many groups efficiently", () => {
      const manager = new GroupManager()
      const groups = []
      
      // Create a grid of 100 groups (10x10)
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 10; y++) {
          const group = new LGraphGroup(`Group ${x}-${y}`, x * 10 + y)
          group.pos = [x * 60, y * 60]
          group.size = [50, 50]
          groups.push(group)
          manager.addGroup(group)
        }
      }
      
      // Point queries should be fast even with many groups
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 600
        const y = Math.random() * 600
        manager.getGroupAt(x, y)
      }
      const end = performance.now()
      
      // Should complete 1000 queries in reasonable time (< 100ms)
      expect(end - start).toBeLessThan(100)
    })

    test("should handle viewport queries efficiently", () => {
      const manager = new GroupManager()
      const groups = []
      
      // Create many scattered groups
      for (let i = 0; i < 200; i++) {
        const group = new LGraphGroup(`Group ${i}`, i)
        group.pos = [Math.random() * 2000, Math.random() * 2000]
        group.size = [20, 20]
        groups.push(group)
        manager.addGroup(group)
      }
      
      // Viewport queries should be efficient
      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 1500
        const y = Math.random() * 1500
        manager.getGroupsInRegion(x, y, x + 200, y + 200)
      }
      const end = performance.now()
      
      // Should complete 100 viewport queries in reasonable time
      expect(end - start).toBeLessThan(50)
    })
  })

  describe("Edge Cases", () => {
    test("should handle overlapping non-nested groups", () => {
      const manager = new GroupManager()
      
      const group1 = new LGraphGroup("Group 1", 1)
      group1.pos = [0, 0]
      group1.size = [100, 100]
      
      const group2 = new LGraphGroup("Group 2", 2)
      group2.pos = [50, 50]
      group2.size = [100, 100]
      
      manager.addGroup(group1)
      manager.addGroup(group2)
      
      // At overlap point, should return smaller group (by area)
      const result = manager.getGroupAt(75, 75)
      expect(result).toBe(group1) // Both same size, so should get first one
    })

    test("should handle groups with zero size", () => {
      const manager = new GroupManager()
      
      const group = new LGraphGroup("Zero Size", 1)
      group.pos = [50, 50]
      group.size = [0, 0]
      
      manager.addGroup(group)
      
      // Should not crash, but likely won't be found
      expect(() => manager.getGroupAt(50, 50)).not.toThrow()
    })

    test("should handle negative coordinates", () => {
      const manager = new GroupManager()
      
      const group = new LGraphGroup("Negative", 1)
      group.pos = [-100, -100]
      group.size = [50, 50]
      
      manager.addGroup(group)
      
      expect(manager.getGroupAt(-75, -75)).toBe(group)
      expect(manager.getGroupAt(0, 0)).toBe(null)
    })
  })
})