'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ─── Constants ────────────────────────────────────────────────────────────────
const DISPLAY = "'Instrument Serif', serif"
const MUTED   = 'hsl(240, 4%, 66%)'
const BG      = 'hsl(201, 100%, 13%)'

const NAV_LINKS = ['Features', 'How it works', 'Pricing'] as const

const INTEGRATIONS = [
  { name: 'Krisp',    domain: 'krisp.ai'     },
  { name: 'Slack',    domain: 'slack.com'    },
  { name: 'Gmail',    domain: 'gmail.com'    },
  { name: 'HubSpot',  domain: 'hubspot.com'  },
  { name: 'Notion',   domain: 'notion.so'    },
  { name: 'LinkedIn', domain: 'linkedin.com' },
  { name: 'Granola',  domain: 'granola.so'   },
] as const

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref  = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, inView }
}

// ─── SVG diagrams ─────────────────────────────────────────────────────────────

function IngestionDiagram() {
  const sources = [
    { x: 52,  y: 48,  label: 'KRISP',   dot: '#FF5757' },
    { x: 195, y: 42,  label: 'SLACK',   dot: '#6B49A9' },
    { x: 44,  y: 148, label: 'GMAIL',   dot: '#EA4335' },
    { x: 198, y: 150, label: 'GRANOLA', dot: '#00A67E' },
  ]
  const cx = 124, cy = 106
  return (
    <svg viewBox="0 0 260 200" className="w-full h-full" fill="none">
      {sources.map((s, i) => (
        <line key={i} x1={s.x} y1={s.y} x2={cx} y2={cy}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      ))}
      {sources.map((s) => {
        const w = s.label.length * 7.2 + 28
        return (
          <g key={s.label}>
            <rect x={s.x - w / 2} y={s.y - 13} width={w} height={25} rx="4"
              fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <circle cx={s.x - w / 2 + 11} cy={s.y} r="3.5" fill={s.dot} />
            <text x={s.x - w / 2 + 21} y={s.y + 4.5} fontSize="8.5" fill="rgba(255,255,255,0.65)"
              fontFamily="monospace" letterSpacing="0.8">{s.label}</text>
          </g>
        )
      })}
      {/* Vox node */}
      <circle cx={cx} cy={cy} r="22" fill="rgba(59,130,246,0.12)"
        stroke="rgba(59,130,246,0.55)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="6" fill="#3B82F6" />
      <text x={cx} y={cy + 38} fontSize="8" fill="rgba(255,255,255,0.4)"
        textAnchor="middle" fontFamily="monospace" letterSpacing="1.5">VOX</text>
    </svg>
  )
}

function SignalDiagram() {
  // Nodes: topics surfaced from conversations
  const nodes = [
    { x: 68,  y: 62,  r: 10, color: '#3B82F6',  label: 'PRICING',   lx: 68,  ly: 46  },
    { x: 188, y: 55,  r: 7,  color: '#F59E0B',  label: 'TIMELINE',  lx: 188, ly: 39  },
    { x: 55,  y: 148, r: 7,  color: '#10B981',  label: 'OBJECTION', lx: 55,  ly: 132 },
    { x: 185, y: 150, r: 9,  color: '#EF4444',  label: 'BLOCKER',   lx: 185, ly: 134 },
    { x: 124, y: 105, r: 5,  color: 'rgba(255,255,255,0.35)', label: '', lx: 0, ly: 0 },
    { x: 144, y: 78,  r: 3.5,color: 'rgba(255,255,255,0.2)',  label: '', lx: 0, ly: 0 },
    { x: 100, y: 130, r: 3.5,color: 'rgba(255,255,255,0.2)',  label: '', lx: 0, ly: 0 },
  ]
  const edges = [[0,4],[1,4],[2,4],[3,4],[4,5],[4,6],[0,1],[2,3]]
  return (
    <svg viewBox="0 0 260 200" className="w-full h-full" fill="none">
      {edges.map(([a, b], i) => (
        <line key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1"
          strokeDasharray={i > 3 ? '3 3' : undefined} />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} />
          {n.label && (
            <text x={n.lx} y={n.ly} fontSize="8" fill="rgba(255,255,255,0.4)"
              textAnchor="middle" fontFamily="monospace" letterSpacing="0.8">
              {n.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function OutputDiagram() {
  return (
    <svg viewBox="0 0 260 200" className="w-full h-full" fill="none">
      {/* LinkedIn post card */}
      <rect x="28" y="38" width="90" height="72" rx="6"
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      <line x1="42" y1="58" x2="104" y2="58" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <line x1="42" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="42" y1="80" x2="90" y2="80" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="42" y1="90" x2="95" y2="90" stroke="rgba(255,255,255,0.1)"  strokeWidth="1" />
      <text x="73" y="124" fontSize="8" fill="rgba(255,255,255,0.4)"
        textAnchor="middle" fontFamily="monospace" letterSpacing="1">LINKEDIN</text>
      {/* Email card */}
      <rect x="142" y="52" width="90" height="66" rx="6"
        fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      <line x1="156" y1="70" x2="218" y2="70" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <line x1="156" y1="82" x2="212" y2="82" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="156" y1="92" x2="208" y2="92" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="156" y1="102"x2="216" y2="102"stroke="rgba(255,255,255,0.1)"  strokeWidth="1" />
      <text x="187" y="132" fontSize="8" fill="rgba(255,255,255,0.4)"
        textAnchor="middle" fontFamily="monospace" letterSpacing="1">EMAIL</text>
      {/* Central output node */}
      <circle cx="130" cy="155" r="16" fill="rgba(59,130,246,0.12)"
        stroke="rgba(59,130,246,0.55)" strokeWidth="1.5" />
      <circle cx="130" cy="155" r="5.5" fill="#3B82F6" />
      {/* Arrows from cards to node */}
      <line x1="100" y1="110" x2="122" y2="141"
        stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <line x1="160" y1="118" x2="137" y2="141"
        stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
    </svg>
  )
}

// ─── How Vox works — three cards ──────────────────────────────────────────────
const CARDS = [
  {
    label:       'INGEST FROM EVERY SOURCE',
    description: 'Meetings from Krisp, conversations from Slack, threads from Gmail and Granola — all flow into Vox automatically. No copy-paste. No new habit to build.',
    Diagram:     IngestionDiagram,
  },
  {
    label:       'FINDS THE SIGNAL',
    description: 'Vox surfaces recurring topics, objections, and buying signals across all your sources. The more you connect, the sharper your intelligence gets.',
    Diagram:     SignalDiagram,
  },
  {
    label:       'WRITES IN YOUR VOICE',
    description: 'Turn signals into LinkedIn posts, email sequences, and sales copy — grounded in what your customers actually said. Not invented. Extracted.',
    Diagram:     OutputDiagram,
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const { ref: sectionRef, inView } = useInView(0.1)

  return (
    <div style={{ backgroundColor: BG }}>

      {/* ═══ SECTION 1 — Hero (fullscreen video) ═══════════════════════════ */}
      <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: BG }}>

        {/* Video */}
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
            type="video/mp4"
          />
        </video>

        {/* Fade video into background colour at the bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ zIndex: 1, background: `linear-gradient(to bottom, transparent, ${BG})` }}
        />

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col">

          {/* Nav */}
          <header className="px-8 py-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <span className="text-3xl tracking-tight text-white select-none" style={{ fontFamily: DISPLAY }}>
                Vox
              </span>
              <nav className="hidden md:flex items-center gap-8">
                {NAV_LINKS.map((label) => (
                  <a key={label} href="#" className="text-sm transition-colors" style={{ color: MUTED }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = MUTED)}>
                    {label}
                  </a>
                ))}
                <Link href="/login" className="text-sm transition-colors" style={{ color: MUTED }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#fff')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = MUTED)}>
                  Sign in
                </Link>
              </nav>
              <Link href="/signup"
                className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03]">
                Get early access
              </Link>
            </div>
          </header>

          {/* Hero text */}
          <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-[90px]">
            <h1
              className="text-5xl sm:text-7xl md:text-8xl font-normal max-w-5xl text-white animate-fade-rise"
              style={{ fontFamily: DISPLAY, lineHeight: 0.95, letterSpacing: '-2.46px' }}
            >
              Your customers already told you{' '}
              <em className="not-italic" style={{ color: MUTED }}>what to write.</em>
            </h1>
            <p className="text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay"
              style={{ color: MUTED }}>
              Vox connects your meetings, Slack conversations, and email threads — then generates
              LinkedIn posts, email sequences, and sales copy from the exact language your
              customers use. Not from a brief. From your best calls.
            </p>
            <Link href="/signup"
              className="liquid-glass rounded-full px-14 py-5 text-base text-white mt-12 transition-transform hover:scale-[1.03] animate-fade-rise-delay-2 inline-block">
              Get early access
            </Link>
          </section>

          {/* Connects to bar */}
          <footer className="liquid-glass border-t border-white/10 px-8 py-4">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-7 gap-y-3">
              <span className="text-sm shrink-0 pr-6 border-r border-white/20" style={{ color: MUTED }}>
                Connects to
              </span>
              {INTEGRATIONS.map(({ name, domain }) => (
                <div key={name} className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`https://logo.clearbit.com/${domain}`} alt={name} width={18} height={18}
                    className="rounded-sm opacity-80"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span className="text-sm" style={{ color: MUTED }}>{name}</span>
                </div>
              ))}
            </div>
          </footer>
        </div>
      </div>

      {/* ═══ SECTION 2 — How Vox works ══════════════════════════════════════ */}
      <section
        ref={sectionRef}
        className="px-6 sm:px-8 py-24 sm:py-32"
        style={{ backgroundColor: BG }}
      >
        <div className="max-w-5xl mx-auto">

          {/* Heading */}
          <div className={`text-center mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl font-normal text-white mb-5"
              style={{ fontFamily: DISPLAY, letterSpacing: '-1px', lineHeight: 1.05 }}
            >
              How Vox turns your calls{' '}
              <em className="not-italic" style={{ color: MUTED }}>into content.</em>
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: MUTED }}>
              Every meeting, message, and email thread is raw material. Vox ingests it,
              finds the signal, and writes content your customers already recognise — because
              they said it first.
            </p>
          </div>

          {/* Card grid */}
          <div
            className={`rounded-xl border border-white/10 overflow-hidden grid grid-cols-1 sm:grid-cols-3 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {CARDS.map(({ label, description, Diagram }, i) => (
              <div
                key={label}
                className={i > 0 ? 'border-t sm:border-t-0 sm:border-l border-white/10' : ''}
              >
                {/* Illustration */}
                <div className="h-52 flex items-center justify-center px-6 py-4 border-b border-white/10">
                  <Diagram />
                </div>
                {/* Text */}
                <div className="px-6 py-5 space-y-2.5">
                  <p className="text-xs tracking-[0.1em] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {label}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
