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

const FLOAT_ANIMS = ['vox-float-a', 'vox-float-b', 'vox-float-c', 'vox-float-d'] as const
const FLOAT_DURS  = ['3.2s', '2.9s', '3.5s', '3.1s'] as const
const FLOAT_DELAYS = ['0s', '0.7s', '1.4s', '0.35s'] as const

function IngestionDiagram() {
  const sources = [
    { x: 54,  y: 50,  label: 'KRISP',   dot: '#FF5757' },
    { x: 198, y: 44,  label: 'SLACK',   dot: '#6B49A9' },
    { x: 46,  y: 152, label: 'GMAIL',   dot: '#EA4335' },
    { x: 200, y: 154, label: 'GRANOLA', dot: '#00A67E' },
  ]
  const cx = 126, cy = 106
  return (
    <svg viewBox="0 0 268 210" className="w-full h-full" fill="none">
      {/* Flowing dashed lines */}
      {sources.map((s, i) => (
        <line key={i} x1={s.x} y1={s.y} x2={cx} y2={cy}
          stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="5 5"
          style={{ animation: `vox-dash ${1.1 + i * 0.15}s linear infinite`, animationDelay: FLOAT_DELAYS[i] }}
        />
      ))}
      {/* Floating source nodes */}
      {sources.map((s, i) => {
        const w = s.label.length * 8 + 36
        return (
          <g key={s.label} style={{
            transformBox: 'fill-box', transformOrigin: 'center',
            animation: `${FLOAT_ANIMS[i]} ${FLOAT_DURS[i]} ease-in-out infinite`,
            animationDelay: FLOAT_DELAYS[i],
          }}>
            <rect x={s.x - w / 2} y={s.y - 16} width={w} height={32} rx="7"
              fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
            <circle cx={s.x - w / 2 + 14} cy={s.y} r="5" fill={s.dot} />
            <text x={s.x - w / 2 + 27} y={s.y + 5.5} fontSize="10.5" fill="rgba(255,255,255,0.88)"
              fontFamily="monospace" letterSpacing="0.9">{s.label}</text>
          </g>
        )
      })}
      {/* Vox — outer pulse ring */}
      <circle cx={cx} cy={cy} r="28" fill="none" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-ring 2.4s ease-out infinite' }} />
      {/* Vox — inner ring */}
      <circle cx={cx} cy={cy} r="24" fill="rgba(59,130,246,0.18)" stroke="rgba(59,130,246,0.75)" strokeWidth="2" />
      {/* Vox — core dot */}
      <circle cx={cx} cy={cy} r="8" fill="#3B82F6"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-dot 2.4s ease-in-out infinite' }} />
      <text x={cx} y={cy + 44} fontSize="9.5" fill="rgba(255,255,255,0.6)"
        textAnchor="middle" fontFamily="monospace" letterSpacing="1.6">VOX</text>
    </svg>
  )
}

function SignalDiagram() {
  const topics = [
    { x: 70,  y: 64,  r: 12, color: '#3B82F6', label: 'PRICING',   ly: 45,  anim: 'vox-float-a', dur: '3.0s', delay: '0s'    },
    { x: 192, y: 56,  r: 9,  color: '#F59E0B', label: 'TIMELINE',  ly: 37,  anim: 'vox-float-b', dur: '2.8s', delay: '0.6s'  },
    { x: 58,  y: 152, r: 9,  color: '#10B981', label: 'OBJECTION', ly: 133, anim: 'vox-float-c', dur: '3.4s', delay: '1.2s'  },
    { x: 188, y: 154, r: 11, color: '#EF4444', label: 'BLOCKER',   ly: 135, anim: 'vox-float-d', dur: '3.1s', delay: '0.3s'  },
  ]
  const center = { x: 126, y: 107 }
  const connectors = [
    { x: 146, y: 80  },
    { x: 102, y: 132 },
  ]
  const edges: [number, number][] = [[0,1],[2,3]]
  return (
    <svg viewBox="0 0 268 210" className="w-full h-full" fill="none">
      {/* Topic → center lines (dashed, flowing) */}
      {topics.map((t, i) => (
        <line key={`tc-${i}`} x1={t.x} y1={t.y} x2={center.x} y2={center.y}
          stroke="rgba(255,255,255,0.28)" strokeWidth="1.3" strokeDasharray="5 5"
          style={{ animation: `vox-dash 1.3s linear infinite`, animationDelay: t.delay }} />
      ))}
      {/* Topic ↔ topic cross lines */}
      {edges.map(([a, b], i) => (
        <line key={`tt-${i}`}
          x1={topics[a].x} y1={topics[a].y} x2={topics[b].x} y2={topics[b].y}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 4" />
      ))}
      {/* Center node */}
      <circle cx={center.x} cy={center.y} r="8" fill="rgba(255,255,255,0.35)" />
      {connectors.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="4.5" fill="rgba(255,255,255,0.2)" />
      ))}
      {/* Floating topic nodes */}
      {topics.map((t) => (
        <g key={t.label} style={{
          transformBox: 'fill-box', transformOrigin: 'center',
          animation: `${t.anim} ${t.dur} ease-in-out infinite`,
          animationDelay: t.delay,
        }}>
          {/* Outer glow ring */}
          <circle cx={t.x} cy={t.y} r={t.r + 5} fill={`${t.color}18`} stroke={`${t.color}40`} strokeWidth="1" />
          <circle cx={t.x} cy={t.y} r={t.r} fill={t.color} />
          <text x={t.x} y={t.ly} fontSize="9" fill="rgba(255,255,255,0.65)"
            textAnchor="middle" fontFamily="monospace" letterSpacing="0.8">
            {t.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function OutputDiagram() {
  return (
    <svg viewBox="0 0 268 210" className="w-full h-full" fill="none">
      {/* LinkedIn post card — floats */}
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-float-a 3.2s ease-in-out infinite' }}>
        <rect x="22" y="34" width="98" height="76" rx="8"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
        <line x1="36" y1="55" x2="106" y2="55" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
        <line x1="36" y1="68" x2="100" y2="68" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <line x1="36" y1="79" x2="92"  y2="79" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <line x1="36" y1="90" x2="97"  y2="90" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
        <text x="71" y="124" fontSize="9.5" fill="rgba(255,255,255,0.6)"
          textAnchor="middle" fontFamily="monospace" letterSpacing="1.1">LINKEDIN</text>
      </g>
      {/* Email card — floats with offset */}
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-float-b 2.9s ease-in-out infinite', animationDelay: '0.6s' }}>
        <rect x="148" y="48" width="98" height="70" rx="8"
          fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
        <line x1="162" y1="67" x2="232" y2="67" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
        <line x1="162" y1="80" x2="226" y2="80" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <line x1="162" y1="91" x2="220" y2="91" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
        <line x1="162" y1="102"x2="228" y2="102" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
        <text x="197" y="134" fontSize="9.5" fill="rgba(255,255,255,0.6)"
          textAnchor="middle" fontFamily="monospace" letterSpacing="1.1">EMAIL</text>
      </g>
      {/* Flowing lines from cards to output node */}
      <line x1="96"  y1="110" x2="122" y2="146"
        stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="5 5"
        style={{ animation: 'vox-dash 1.1s linear infinite' }} />
      <line x1="172" y1="118" x2="140" y2="146"
        stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="5 5"
        style={{ animation: 'vox-dash 1.1s linear infinite', animationDelay: '0.55s' }} />
      {/* Output node — pulse */}
      <circle cx="131" cy="160" r="26" fill="none" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-ring 2.4s ease-out infinite' }} />
      <circle cx="131" cy="160" r="20" fill="rgba(59,130,246,0.18)" stroke="rgba(59,130,246,0.75)" strokeWidth="2" />
      <circle cx="131" cy="160" r="7" fill="#3B82F6"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-dot 2.4s ease-in-out infinite' }} />
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
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ zIndex: 1, height: '340px', background: `linear-gradient(to bottom, transparent 0%, ${BG} 70%)` }}
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

          {/* Connects to — floats in the gradient fade zone */}
          <footer className="pb-12 pt-16 flex flex-col items-center gap-8">
            <span
              className="text-sm tracking-[0.28em] uppercase font-medium"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Connects to
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {INTEGRATIONS.map(({ name, domain }) => (
                <div key={name} className="flex flex-col items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://logo.clearbit.com/${domain}`}
                    alt={name}
                    width={44}
                    height={44}
                    className="rounded-xl"
                    style={{ opacity: 0.75 }}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
                      img.onerror = () => { img.style.display = 'none' }
                    }}
                  />
                  <span
                    className="text-xs tracking-[0.12em] uppercase font-medium"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {name}
                  </span>
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
            className={`rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-3 transition-all duration-700 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ border: '2px solid rgba(255,255,255,0.28)' }}
          >
            {CARDS.map(({ label, description, Diagram }, i) => (
              <div
                key={label}
                className={i > 0 ? 'border-t sm:border-t-0 sm:border-l' : ''}
                style={i > 0 ? { borderColor: 'rgba(255,255,255,0.28)' } : undefined}
              >
                {/* Illustration */}
                <div
                  className="h-60 flex items-center justify-center px-6 py-6"
                  style={{ borderBottom: '2px solid rgba(255,255,255,0.28)' }}
                >
                  <Diagram />
                </div>
                {/* Text */}
                <div className="px-7 py-7 space-y-3">
                  <p className="text-sm tracking-[0.12em] font-semibold uppercase" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {label}
                  </p>
                  <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>
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
