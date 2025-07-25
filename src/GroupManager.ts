import type { LGraphGroup } from "./LGraphGroup"
import type { LGraph } from "./LGraph"

// Simple R-Tree implementation optimized for rectangles
// Based on rbush algorithm but tailored for our use case

interface Rectangle {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

interface GroupItem extends Rectangle {
  group: LGraphGroup
  id: number
}

interface RTreeNode {
  children: (RTreeNode | GroupItem)[]
  leaf: boolean
  bbox: Rectangle
  height: number
}

/**
 * Spatial index for efficient group queries using R-Tree data structure.
 * Optimized for ComfyUI's usage pattern: many groups, shallow nesting.
 */
export class GroupManager {
  private tree!: RTreeNode // Initialized in clear()
  private data: Map<number, GroupItem> = new Map()
  private nestingMap: Map<number, number> = new Map() // child -> parent
  private zOrderCache: LGraphGroup[] = []
  private isDirty = false
  private maxEntries: number
  private minEntries: number

  constructor(maxEntries = 9) {
    this.maxEntries = Math.max(4, maxEntries)
    this.minEntries = Math.max(2, Math.ceil(this.maxEntries * 0.4))
    this.clear()
  }

  clear(): void {
    this.tree = this.createNode([])
    this.data.clear()
    this.nestingMap.clear()
    this.zOrderCache = []
    this.isDirty = false
  }

  /**
   * Add a group to the spatial index
   */
  addGroup(group: LGraphGroup): void {
    const item = this.createGroupItem(group)
    this.data.set(group.id, item)
    this.insert(item)
    this.updateNestingRelationships(group)
    this.isDirty = true
  }

  /**
   * Remove a group from the spatial index
   */
  removeGroup(group: LGraphGroup): void {
    const item = this.data.get(group.id)
    if (!item) return

    this.remove(item)
    this.data.delete(group.id)
    this.nestingMap.delete(group.id)
    this.isDirty = true
  }

  /**
   * Update a group's position in the spatial index
   */
  updateGroup(group: LGraphGroup): void {
    const item = this.data.get(group.id)
    if (!item) return

    // Remove old position
    this.remove(item)
    
    // Update bounds
    const [x, y, w, h] = group.boundingRect
    item.minX = x
    item.minY = y
    item.maxX = x + w
    item.maxY = y + h
    
    // Reinsert
    this.insert(item)
    this.updateNestingRelationships(group)
    this.isDirty = true
  }

  /**
   * Find the topmost group at a specific point
   */
  getGroupAt(x: number, y: number): LGraphGroup | null {
    const candidates = this.search({ minX: x, minY: y, maxX: x, maxY: y })
    
    if (candidates.length === 0) return null

    // Filter to actual hits and find smallest (topmost)
    let bestGroup: LGraphGroup | null = null
    let minArea = Infinity

    for (const item of candidates) {
      if (item.group.isPointInside(x, y)) {
        const area = (item.maxX - item.minX) * (item.maxY - item.minY)
        if (area < minArea) {
          minArea = area
          bestGroup = item.group
        }
      }
    }

    return bestGroup
  }

  /**
   * Find all groups in a rectangular region
   */
  getGroupsInRegion(minX: number, minY: number, maxX: number, maxY: number): LGraphGroup[] {
    return this.search({ minX, minY, maxX, maxY }).map(item => item.group)
  }

  /**
   * Get groups in z-order (parents before children)
   */
  getGroupsInZOrder(): LGraphGroup[] {
    if (this.isDirty) {
      this.rebuildZOrder()
      this.isDirty = false
    }
    return this.zOrderCache.slice()
  }

  /**
   * Get all groups as an array (for compatibility)
   */
  getAllGroups(): LGraphGroup[] {
    return Array.from(this.data.values()).map(item => item.group)
  }

  /**
   * Get parent group ID for a given group
   */
  getParentId(groupId: number): number | undefined {
    return this.nestingMap.get(groupId)
  }

  // Private implementation methods
  
  private createGroupItem(group: LGraphGroup): GroupItem {
    const [x, y, w, h] = group.boundingRect
    return {
      minX: x,
      minY: y,
      maxX: x + w,
      maxY: y + h,
      group,
      id: group.id
    }
  }

  private updateNestingRelationships(group: LGraphGroup): void {
    // Clear existing parent relationship
    this.nestingMap.delete(group.id)

    // Find potential parent (smallest containing group)
    const candidates = this.search(this.createGroupItem(group))
    let bestParent: LGraphGroup | null = null
    let minArea = Infinity

    for (const item of candidates) {
      if (item.group === group) continue
      
      if (this.contains(item, this.createGroupItem(group))) {
        const area = (item.maxX - item.minX) * (item.maxY - item.minY)
        if (area < minArea) {
          minArea = area
          bestParent = item.group
        }
      }
    }

    if (bestParent) {
      this.nestingMap.set(group.id, bestParent.id)
    }
  }

  private rebuildZOrder(): void {
    const allGroups = this.getAllGroups()
    const visited = new Set<number>()
    const result: LGraphGroup[] = []

    // Topological sort based on nesting relationships
    const visit = (group: LGraphGroup): void => {
      if (visited.has(group.id)) return
      visited.add(group.id)

      // Visit parent first
      const parentId = this.nestingMap.get(group.id)
      if (parentId) {
        const parentItem = this.data.get(parentId)
        if (parentItem) {
          visit(parentItem.group)
        }
      }

      result.push(group)
    }

    for (const group of allGroups) {
      visit(group)
    }

    this.zOrderCache = result
  }

  // R-Tree implementation methods

  private createNode(children: (RTreeNode | GroupItem)[]): RTreeNode {
    return {
      children,
      leaf: children.length > 0 ? !('children' in children[0]) : true,
      bbox: this.calcBBox(children),
      height: children.length > 0 && 'height' in children[0] ? (children[0] as RTreeNode).height + 1 : 1
    }
  }

  private calcBBox(children: (RTreeNode | GroupItem)[]): Rectangle {
    if (children.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const child of children) {
      const bbox = 'bbox' in child ? child.bbox : child
      minX = Math.min(minX, bbox.minX)
      minY = Math.min(minY, bbox.minY)
      maxX = Math.max(maxX, bbox.maxX)
      maxY = Math.max(maxY, bbox.maxY)
    }

    return { minX, minY, maxX, maxY }
  }

  private insert(item: GroupItem): void {
    this.insertItem(item, this.tree, this.tree.height - 1)
  }

  private insertItem(item: GroupItem, node: RTreeNode, level: number): void {
    const bbox = item
    const insertPath: RTreeNode[] = []

    // Find the best node to insert the item
    let targetNode = this.chooseSubtree(bbox, node, level, insertPath)

    // Add item to the node
    targetNode.children.push(item)
    this.extend(targetNode.bbox, bbox)

    // Split overflowed nodes
    while (level >= 0) {
      if (insertPath[level].children.length > this.maxEntries) {
        this.split(insertPath, level)
        level--
      } else {
        break
      }
    }

    // Adjust bounding boxes
    this.adjustParentBBoxes(bbox, insertPath, level)
  }

  private chooseSubtree(bbox: Rectangle, node: RTreeNode, level: number, path: RTreeNode[]): RTreeNode {
    while (true) {
      path.push(node)

      if (node.leaf || path.length - 1 === level) break

      let minArea = Infinity
      let minEnlargement = Infinity
      let targetNode: RTreeNode | undefined

      for (const child of node.children as RTreeNode[]) {
        const area = this.bboxArea(child.bbox)
        const enlargement = this.enlargedArea(bbox, child.bbox) - area

        if (enlargement < minEnlargement) {
          minEnlargement = enlargement
          minArea = area
          targetNode = child
        } else if (enlargement === minEnlargement && area < minArea) {
          minArea = area
          targetNode = child
        }
      }

      node = targetNode!
    }

    return node
  }

  private split(insertPath: RTreeNode[], level: number): void {
    const node = insertPath[level]
    const totalEntries = node.children.length
    const minEntries = this.minEntries

    this.chooseSplitAxis(node, minEntries, totalEntries - minEntries)
    const splitIndex = this.chooseSplitIndex(node, minEntries, totalEntries - minEntries)

    const newNode = this.createNode(node.children.splice(splitIndex, node.children.length - splitIndex))
    newNode.height = node.height
    newNode.leaf = node.leaf

    this.calcBBox(node.children)
    this.calcBBox(newNode.children)

    if (level) {
      insertPath[level - 1].children.push(newNode)
    } else {
      this.splitRoot(node, newNode)
    }
  }

  private splitRoot(node: RTreeNode, newNode: RTreeNode): void {
    this.tree = this.createNode([node, newNode])
    this.tree.height = node.height + 1
    this.tree.leaf = false
  }

  private chooseSplitAxis(node: RTreeNode, m: number, M: number): void {
    const compareMinX = (a: RTreeNode | GroupItem, b: RTreeNode | GroupItem) => 
      ('bbox' in a ? a.bbox.minX : a.minX) - ('bbox' in b ? b.bbox.minX : b.minX)
    const compareMinY = (a: RTreeNode | GroupItem, b: RTreeNode | GroupItem) => 
      ('bbox' in a ? a.bbox.minY : a.minY) - ('bbox' in b ? b.bbox.minY : b.minY)

    const xMargin = this.allDistMargin(node, m, M, compareMinX)
    const yMargin = this.allDistMargin(node, m, M, compareMinY)

    if (xMargin < yMargin) {
      node.children.sort(compareMinX)
    } else {
      node.children.sort(compareMinY)
    }
  }

  private chooseSplitIndex(node: RTreeNode, m: number, M: number): number {
    let index = m
    let minOverlap = Infinity
    let minArea = Infinity

    for (let i = m; i <= M; i++) {
      const bbox1 = this.calcBBox(node.children.slice(0, i))
      const bbox2 = this.calcBBox(node.children.slice(i))
      const overlap = this.intersectionArea(bbox1, bbox2)
      const area = this.bboxArea(bbox1) + this.bboxArea(bbox2)

      if (overlap < minOverlap) {
        minOverlap = overlap
        index = i
        minArea = area
      } else if (overlap === minOverlap && area < minArea) {
        minArea = area
        index = i
      }
    }

    return index
  }

  private allDistMargin(node: RTreeNode, m: number, M: number, compare: (a: any, b: any) => number): number {
    node.children.sort(compare)
    let margin = 0

    for (let i = m; i <= M; i++) {
      const bbox1 = this.calcBBox(node.children.slice(0, i))
      const bbox2 = this.calcBBox(node.children.slice(i))
      margin += this.bboxMargin(bbox1) + this.bboxMargin(bbox2)
    }

    return margin
  }

  private adjustParentBBoxes(bbox: Rectangle, path: RTreeNode[], level: number): void {
    for (let i = level; i >= 0; i--) {
      this.extend(path[i].bbox, bbox)
    }
  }

  private search(bbox: Rectangle): GroupItem[] {
    let node = this.tree
    const result: GroupItem[] = []

    if (!this.intersects(bbox, node.bbox)) return result

    const nodesToSearch: RTreeNode[] = []

    while (node) {
      for (const child of node.children) {
        const childBBox = 'bbox' in child ? child.bbox : child

        if (this.intersects(bbox, childBBox)) {
          if (node.leaf) {
            result.push(child as GroupItem)
          } else if (this.contains(bbox, childBBox)) {
            this.collectAll(child as RTreeNode, result)
          } else {
            nodesToSearch.push(child as RTreeNode)
          }
        }
      }

      node = nodesToSearch.pop()!
    }

    return result
  }

  private collectAll(node: RTreeNode, result: GroupItem[]): void {
    const nodesToSearch = [node]

    while (nodesToSearch.length) {
      const currentNode = nodesToSearch.pop()!

      if (currentNode.leaf) {
        for (const child of currentNode.children) {
          result.push(child as GroupItem)
        }
      } else {
        for (const child of currentNode.children) {
          nodesToSearch.push(child as RTreeNode)
        }
      }
    }
  }

  private remove(item: GroupItem): void {
    let node: RTreeNode | undefined = this.tree
    const path: RTreeNode[] = []
    let indexes: number[] = []
    let i = 0
    let parent: RTreeNode | undefined

    // Depth-first search for the item
    while (node || path.length) {
      if (!node) {
        node = path.pop()!
        parent = path[path.length - 1]
        i = indexes.pop()!
        continue
      }

      if (node.leaf) {
        i = node.children.findIndex(child => child === item)
        if (i !== -1) {
          // Item found, remove it
          node.children.splice(i, 1)
          path.push(node)
          this.condenseTree(path)
          return
        }
      }

      if (!node.leaf && this.contains(node.bbox, item)) {
        path.push(node)
        indexes.push(i)
        i = 0
        parent = node
        node = node.children[0] as RTreeNode
      } else {
        i = (i || 0) + 1
        if (parent && i < parent.children.length) {
          node = parent.children[i] as RTreeNode
        } else {
          node = undefined
        }
      }
    }
  }

  private condenseTree(path: RTreeNode[]): void {
    // Go up the tree, adjusting bounding boxes and removing empty nodes
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i].children.length === 0) {
        if (i > 0) {
          const parent = path[i - 1]
          const index = parent.children.indexOf(path[i])
          parent.children.splice(index, 1)
        } else {
          this.clear()
        }
      } else {
        path[i].bbox = this.calcBBox(path[i].children)
      }
    }
  }

  // Utility methods

  private extend(a: Rectangle, b: Rectangle): Rectangle {
    a.minX = Math.min(a.minX, b.minX)
    a.minY = Math.min(a.minY, b.minY)
    a.maxX = Math.max(a.maxX, b.maxX)
    a.maxY = Math.max(a.maxY, b.maxY)
    return a
  }

  private intersects(a: Rectangle, b: Rectangle): boolean {
    return b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY
  }

  private contains(a: Rectangle, b: Rectangle): boolean {
    return a.minX <= b.minX && a.minY <= b.minY && b.maxX <= a.maxX && b.maxY <= a.maxY
  }

  private bboxArea(bbox: Rectangle): number {
    return (bbox.maxX - bbox.minX) * (bbox.maxY - bbox.minY)
  }

  private bboxMargin(bbox: Rectangle): number {
    return (bbox.maxX - bbox.minX) + (bbox.maxY - bbox.minY)
  }

  private enlargedArea(bbox: Rectangle, toBBox: Rectangle): number {
    return (Math.max(toBBox.maxX, bbox.maxX) - Math.min(toBBox.minX, bbox.minX)) *
           (Math.max(toBBox.maxY, bbox.maxY) - Math.min(toBBox.minY, bbox.minY))
  }

  private intersectionArea(a: Rectangle, b: Rectangle): number {
    const minX = Math.max(a.minX, b.minX)
    const minY = Math.max(a.minY, b.minY)
    const maxX = Math.min(a.maxX, b.maxX)
    const maxY = Math.min(a.maxY, b.maxY)

    return Math.max(0, maxX - minX) * Math.max(0, maxY - minY)
  }
}