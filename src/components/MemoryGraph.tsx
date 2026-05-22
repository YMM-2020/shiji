import { useEffect, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import { Memory, MEMORY_TYPE_COLORS, MEMORY_TYPE_LABELS, MEMORY_TYPE_ICONS } from '../types'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: string
  confidence: number
  color: string
  icon: string
  memory: Memory
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

interface MemoryGraphProps {
  memories: Memory[]
  selectedId: string | null
  onSelectMemory: (id: string | null) => void
  onLinkMemories: (id1: string, id2: string) => void
}

export default function MemoryGraph({
  memories,
  selectedId,
  onSelectMemory,
  onLinkMemories,
}: MemoryGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const linkMode = useRef<string | null>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null)

  const buildGraph = useCallback(() => {
    if (!svgRef.current || memories.length === 0) return

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight
    svg.selectAll('*').remove()

    // Build nodes
    const nodes: GraphNode[] = memories.map((m) => ({
      id: m.id,
      label: m.summary.length > 20 ? m.summary.slice(0, 20) + '...' : m.summary,
      type: m.type,
      confidence: m.confidence,
      color: MEMORY_TYPE_COLORS[m.type],
      icon: MEMORY_TYPE_ICONS[m.type],
      memory: m,
    }))

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    // Build links from relatedMemories
    const linkSet = new Set<string>()
    const links: GraphLink[] = []
    memories.forEach((m) => {
      m.relatedMemories.forEach((rid) => {
        const key = [m.id, rid].sort().join('-')
        if (!linkSet.has(key) && nodeMap.has(rid)) {
          linkSet.add(key)
          links.push({ source: m.id, target: rid })
        }
      })
    })

    // Zoom behavior
    const g = svg.append('g')
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    // Draw links
    const link = g
      .append('g')
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(links)
      .join('line')
      .attr('class', 'memory-link')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')

    // Draw nodes
    const node = g
      .append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', 'memory-node')
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulationRef.current?.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulationRef.current?.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => 8 + d.confidence * 20)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', 0.85)
      .attr('stroke', (d) => (d.memory.locked ? '#f59e0b' : '#fff'))
      .attr('stroke-width', (d) => (d.memory.locked ? 2.5 : 1.5))
      .attr('class', (d) => (d.memory.confidence < 0.7 ? 'animate-pulse-glow' : ''))

    // Node icons (emoji)
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', (d) => 6 + d.confidence * 8)
      .text((d) => d.icon)

    // Node labels
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => 18 + d.confidence * 20)
      .attr('fill', '#374151')
      .attr('font-size', '10px')
      .text((d) => d.label)

    // Node interactions
    node
      .on('click', (event: MouseEvent, d: GraphNode) => {
        event.stopPropagation()
        if (linkMode.current) {
          onLinkMemories(linkMode.current, d.id)
          linkMode.current = null
          svg.style('cursor', 'grab')
          return
        }
        onSelectMemory(selectedId === d.id ? null : d.id)
      })
      .on('dblclick', (event: MouseEvent, d: GraphNode) => {
        event.stopPropagation()
        linkMode.current = d.id
        svg.style('cursor', 'crosshair')
      })

    // Click background to deselect
    svg.on('click', () => {
      if (linkMode.current) {
        linkMode.current = null
        svg.style('cursor', 'grab')
        return
      }
      onSelectMemory(null)
    })

    // Highlight selected node
    if (selectedId) {
      node
        .select('circle')
        .attr('stroke', (d) => (d.id === selectedId ? '#2563eb' : d.memory.locked ? '#f59e0b' : '#fff'))
        .attr('stroke-width', (d) => (d.id === selectedId ? 3 : d.memory.locked ? 2.5 : 1.5))
      link.attr('stroke', (l) => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source
        const tid = typeof l.target === 'object' ? l.target.id : l.target
        return sid === selectedId || tid === selectedId ? '#93c5fd' : '#cbd5e1'
      })
      link.attr('stroke-width', (l) => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source
        const tid = typeof l.target === 'object' ? l.target.id : l.target
        return sid === selectedId || tid === selectedId ? 2.5 : 1.5
      })
      link.attr('stroke-dasharray', (l) => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source
        const tid = typeof l.target === 'object' ? l.target.id : l.target
        return sid === selectedId || tid === selectedId ? '0' : '4,3'
      })
    }

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(120),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius((d) => 20 + d.confidence * 20))
      .on('tick', () => {
        link
          .attr('x1', (d) => (typeof d.source === 'object' ? d.source.x ?? 0 : 0))
          .attr('y1', (d) => (typeof d.source === 'object' ? d.source.y ?? 0 : 0))
          .attr('x2', (d) => (typeof d.target === 'object' ? d.target.x ?? 0 : 0))
          .attr('y2', (d) => (typeof d.target === 'object' ? d.target.y ?? 0 : 0))

        node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })

    simulationRef.current = simulation

    // Auto-zoom to fit after simulation settles
    simulation.on('end', () => {
      const bounds = (g.node() as SVGGElement)?.getBBox()
      if (!bounds || bounds.width === 0) return
      const dx = bounds.width
      const dy = bounds.height
      const x = bounds.x + dx / 2
      const y = bounds.y + dy / 2
      const scale = 0.85 / Math.max(dx / width, dy / height)
      const translate = [width / 2 - scale * x, height / 2 - scale * y]
      svg
        .transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale))
    })
  }, [memories, selectedId, onSelectMemory, onLinkMemories])

  useEffect(() => {
    buildGraph()
    return () => {
      simulationRef.current?.stop()
    }
  }, [buildGraph])

  // Handle resize
  useEffect(() => {
    const handleResize = () => buildGraph()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [buildGraph])

  return (
    <div className="flex-1 relative">
      {linkMode.current && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          🔗 点击另一个节点建立关联 (ESC 取消)
        </div>
      )}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ minHeight: 'calc(100vh - 100px)' }}
      />
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg border border-gray-200 p-3 text-xs text-gray-500 space-y-1">
        <p>🖱️ 拖拽节点调整位置</p>
        <p>🔍 滚轮缩放画布</p>
        <p>👆 点击节点查看详情</p>
        <p>🔗 双击节点建立关联</p>
      </div>
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg border border-gray-200 p-3">
        <div className="flex flex-wrap gap-3">
          {Object.entries(MEMORY_TYPE_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: MEMORY_TYPE_COLORS[key as keyof typeof MEMORY_TYPE_COLORS] }}
              />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-amber-500 mr-1" />
            已锁定
          </span>
          <span className="text-xs text-gray-400">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500 mr-1" />
            已选中
          </span>
        </div>
      </div>
    </div>
  )
}
