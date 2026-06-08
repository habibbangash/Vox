'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useRef, useEffect, useState } from 'react'
import type { GraphData, GraphNode } from '@/app/actions/intelligence'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

// ─── Warm Intelligence palette ────────────────────────────────────────────────
const NODE_COLORS: Record<string, string> = {
  person:        '#1A3D2B',
  company:       '#1A3D2B',
  topic:         '#2D5A3D',
  theme:         '#2D5A3D',
  objection:     '#DC2626',
  buying_signal: '#D97706',
  product:       '#1A3D2B',
  competitor:    '#D97706',
  other:         '#9CA3AF',
}

const NODE_LABELS: Record<string, string> = {
  person:        'Person',
  company:       'Company',
  topic:         'Topic',
  theme:         'Theme',
  objection:     'Objection',
  buying_signal: 'Buying signal',
  product:       'Product',
  competitor:    'Competitor',
  other:         'Other',
}

const MIN_NODE_R = 4
const MAX_NODE_R = 14

function nodeRadius(mentionCount: number, maxCount: number): number {
  if (maxCount === 0) return MIN_NODE_R
  return MIN_NODE_R + (mentionCount / maxCount) * (MAX_NODE_R - MIN_NODE_R)
}

interface FGNode extends GraphNode { x?: number; y?: number }
interface FGLink { source: string; target: string; weight: number }

interface Props { data: GraphData }

export function DashboardKnowledgeGraph({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    setContainerWidth(containerRef.current.offsetWidth)
    return () => ro.disconnect()
  }, [])

  const maxCount = Math.max(...data.nodes.map(n => n.mention_count), 1)

  const graphData = {
    nodes: data.nodes as FGNode[],
    links: data.edges.map(e => ({ source: e.source, target: e.target, weight: e.weight } as FGLink)),
  }

  const paintNode = useCallback((node: FGNode, ctx: CanvasRenderingContext2D) => {
    const r = nodeRadius(node.mention_count, maxCount)
    const x = node.x ?? 0
    const y = node.y ?? 0
    const color = NODE_COLORS[node.type] ?? NODE_COLORS.other
    const label = node.canonical_name ?? node.name

    // Amber pulse ring for high-signal nodes
    if (node.type === 'buying_signal' || node.type === 'competitor') {
      ctx.beginPath()
      ctx.arc(x, y, r + 3.5, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(217,119,6,0.18)'
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    if (r >= 7) {
      ctx.font = `500 ${Math.max(7, r * 0.85)}px DM Sans,sans-serif`
      ctx.fillStyle = 'rgba(15,26,20,0.72)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(
        label.length > 16 ? label.slice(0, 14) + '…' : label,
        x,
        y + r + 2,
      )
    }
  }, [maxCount])

  const activeTypes = [...new Set(data.nodes.map(n => n.type))]

  if (data.nodes.length < 3) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Entity Graph</h2>
          <Link href="/intelligence" className="text-xs text-muted-foreground hover:text-foreground">
            View full graph →
          </Link>
        </div>
        <div className="rounded-lg border border-dashed py-8 text-center space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">No entity graph yet</p>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
            Sync more content to build your knowledge graph. Entities and relationships appear automatically.
          </p>
          <Link href="/sources" className="text-xs text-primary underline underline-offset-2 block">
            → Connect a source
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Entity Graph</h2>
          <span className="text-xs text-muted-foreground">
            {data.nodes.length} nodes · {data.edges.length} edges
          </span>
        </div>
        <Link href="/intelligence" className="text-xs text-muted-foreground hover:text-foreground">
          View full graph →
        </Link>
      </div>

      <div
        ref={containerRef}
        className="rounded-lg border bg-card overflow-hidden"
        style={{ height: 300 }}
        aria-label="Knowledge graph showing entity relationships in your workspace"
      >
        {containerWidth > 0 && (
          <ForceGraph2D
            graphData={graphData}
            nodeId="id"
            width={containerWidth}
            height={300}
            nodeCanvasObject={paintNode as (node: object, ctx: CanvasRenderingContext2D) => void}
            nodeCanvasObjectMode={() => 'replace'}
            nodeVal={(node: object) => nodeRadius((node as FGNode).mention_count, maxCount)}
            linkColor={() => 'rgba(180,168,155,0.35)'}
            linkWidth={(link: object) => Math.min((link as FGLink).weight * 0.6, 2.5)}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            backgroundColor="#ffffff"
            cooldownTicks={80}
            enableNodeDrag={false}
            enableZoomInteraction={false}
            enablePanInteraction={false}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {activeTypes.map(type => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: NODE_COLORS[type] ?? NODE_COLORS.other }}
            />
            {NODE_LABELS[type] ?? type}
          </div>
        ))}
      </div>

      <p className="sr-only">
        Interactive knowledge graph with {data.nodes.length} entity nodes and {data.edges.length} relationship edges.
        Entity types include: {activeTypes.map(t => NODE_LABELS[t] ?? t).join(', ')}.
        Visit the Intelligence page for the full interactive graph with search and node selection.
      </p>
    </section>
  )
}
