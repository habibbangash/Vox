'use client'

import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import type { GraphData, GraphNode } from '@/app/actions/intelligence'

// react-force-graph-2d uses canvas + requestAnimationFrame — must be client-only
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

// ─── Colour palette ───────────────────────────────────────────────────────────
const NODE_COLORS: Record<string, string> = {
  person:        '#6366f1', // indigo
  company:       '#8b5cf6', // violet
  topic:         '#10b981', // emerald
  theme:         '#14b8a6', // teal
  objection:     '#f59e0b', // amber
  buying_signal: '#22c55e', // green
  product:       '#06b6d4', // cyan
  competitor:    '#ef4444', // red
  other:         '#94a3b8', // slate
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

const MIN_NODE_SIZE = 4
const MAX_NODE_SIZE = 18

function nodeSize(mentionCount: number, maxCount: number): number {
  if (maxCount === 0) return MIN_NODE_SIZE
  const ratio = mentionCount / maxCount
  return MIN_NODE_SIZE + ratio * (MAX_NODE_SIZE - MIN_NODE_SIZE)
}

// ─── Types for force-graph ─────────────────────────────────────────────────────
interface FGNode extends GraphNode {
  x?: number
  y?: number
}

interface FGLink {
  source: string
  target: string
  relationship: string
  weight: number
}

// ─── Component ────────────────────────────────────────────────────────────────
interface KnowledgeGraphProps {
  data: GraphData
}

export function KnowledgeGraph({ data }: KnowledgeGraphProps) {
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [search, setSearch]     = useState('')

  const maxCount = Math.max(...data.nodes.map(n => n.mention_count), 1)

  const graphData = {
    nodes: data.nodes as FGNode[],
    links: data.edges.map(e => ({
      source:       e.source,
      target:       e.target,
      relationship: e.relationship,
      weight:       e.weight,
    } as FGLink)),
  }

  const searchLower = search.trim().toLowerCase()

  const paintNode = useCallback((node: FGNode, ctx: CanvasRenderingContext2D) => {
    const r     = nodeSize(node.mention_count, maxCount)
    const color = NODE_COLORS[node.type] ?? NODE_COLORS.other
    const label = node.canonical_name ?? node.name
    const isMatch = searchLower && label.toLowerCase().includes(searchLower)
    const isSelected = selected?.id === node.id

    // Glow for search match
    if (isMatch || isSelected) {
      ctx.beginPath()
      ctx.arc(node.x ?? 0, node.y ?? 0, r + 4, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.35)' : 'rgba(255,220,50,0.35)'
      ctx.fill()
    }

    // Node circle
    ctx.beginPath()
    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()

    // Label — only for larger nodes or selected/matched
    if (r >= 8 || isMatch || isSelected) {
      ctx.font = `${Math.max(8, r * 0.9)}px Inter,sans-serif`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label.length > 18 ? label.slice(0, 16) + '…' : label, node.x ?? 0, (node.y ?? 0) + r + 6)
    }
  }, [maxCount, searchLower, selected])

  const activeTypes = [...new Set(data.nodes.map(n => n.type))]

  if (data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-xl border border-dashed text-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">No graph data yet</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          Connect sources and sync documents — entities and relationships will appear here automatically once you've synced content.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search nodes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 w-56 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:border-ring"
        />
        <span className="text-xs text-muted-foreground">
          {data.nodes.length} nodes · {data.edges.length} edges
        </span>
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-muted-foreground hover:text-foreground ml-auto"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Graph canvas */}
      <div className="rounded-xl border overflow-hidden bg-[#0f1117]" style={{ height: 520 }}>
        <ForceGraph2D
          graphData={graphData}
          nodeId="id"
          nodeCanvasObject={paintNode as (node: object, ctx: CanvasRenderingContext2D) => void}
          nodeCanvasObjectMode={() => 'replace'}
          nodeVal={(node: object) => nodeSize((node as FGNode).mention_count, maxCount)}
          linkColor={() => 'rgba(148,163,184,0.25)'}
          linkWidth={(link: object) => Math.min((link as FGLink).weight * 0.8, 3)}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node: object) => setSelected(selected?.id === (node as FGNode).id ? null : node as FGNode)}
          backgroundColor="#0f1117"
          height={520}
          cooldownTicks={120}
        />
      </div>

      {/* Selected node panel */}
      {selected && (
        <div className="rounded-xl border p-4 space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ background: NODE_COLORS[selected.type] ?? NODE_COLORS.other }}
            />
            <span className="font-medium">{selected.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{NODE_LABELS[selected.type] ?? selected.type}</span>
          </div>
          <p className="text-muted-foreground text-xs">
            Mentioned in <strong>{selected.mention_count}</strong> document{selected.mention_count !== 1 ? 's' : ''}
          </p>
          {data.edges.filter(e => e.source === selected.id || e.target === selected.id).length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Connections</p>
              {data.edges
                .filter(e => e.source === selected.id || e.target === selected.id)
                .slice(0, 8)
                .map(e => {
                  const otherId = e.source === selected.id ? e.target : e.source
                  const other   = data.nodes.find(n => n.id === otherId)
                  return (
                    <div key={e.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: NODE_COLORS[other?.type ?? 'other'] }}
                      />
                      <span className="text-foreground">{other?.canonical_name ?? otherId}</span>
                      <span className="opacity-60">— {e.relationship.replace(/_/g, ' ')}</span>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {activeTypes.map(type => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS[type] ?? NODE_COLORS.other }} />
            {NODE_LABELS[type] ?? type}
          </div>
        ))}
      </div>
    </div>
  )
}
