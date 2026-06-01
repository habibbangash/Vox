'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const SERIF = "'Instrument Serif', serif"
const LM    = 'rgba(0,0,0,0.50)'
const LT    = '#0d0d0d'
const EASE  = 'cubic-bezier(0.32,0.72,0,1)'

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

const FLOAT_ANIMS  = ['vox-float-a', 'vox-float-b', 'vox-float-c', 'vox-float-d'] as const
const FLOAT_DURS   = ['3.2s', '2.9s', '3.5s', '3.1s'] as const
const FLOAT_DELAYS = ['0s', '0.7s', '1.4s', '0.35s'] as const

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
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
      {sources.map((s, i) => (
        <line key={i} x1={s.x} y1={s.y} x2={cx} y2={cy}
          stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeDasharray="5 5"
          style={{ animation: `vox-dash ${1.1 + i * 0.15}s linear infinite`, animationDelay: FLOAT_DELAYS[i] }}
        />
      ))}
      {sources.map((s, i) => {
        const w = s.label.length * 8 + 36
        return (
          <g key={s.label} style={{
            transformBox: 'fill-box', transformOrigin: 'center',
            animation: `${FLOAT_ANIMS[i]} ${FLOAT_DURS[i]} ease-in-out infinite`,
            animationDelay: FLOAT_DELAYS[i],
          }}>
            <rect x={s.x - w / 2} y={s.y - 16} width={w} height={32} rx="7"
              fill="rgba(0,0,0,0.04)" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" />
            <circle cx={s.x - w / 2 + 14} cy={s.y} r="5" fill={s.dot} />
            <text x={s.x - w / 2 + 27} y={s.y + 5.5} fontSize="10.5" fill="rgba(0,0,0,0.65)"
              fontFamily="monospace" letterSpacing="0.9">{s.label}</text>
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r="28" fill="none" stroke="rgba(59,130,246,0.45)" strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-ring 2.4s ease-out infinite' }} />
      <circle cx={cx} cy={cy} r="24" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.6)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="8" fill="#3B82F6"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-dot 2.4s ease-in-out infinite' }} />
      <text x={cx} y={cy + 44} fontSize="9.5" fill="rgba(0,0,0,0.42)"
        textAnchor="middle" fontFamily="monospace" letterSpacing="1.6">VOX</text>
    </svg>
  )
}

function SignalDiagram() {
  const topics = [
    { x: 70,  y: 64,  r: 12, color: '#3B82F6', label: 'PRICING',   ly: 45,  anim: 'vox-float-a', dur: '3.0s', delay: '0s'   },
    { x: 192, y: 56,  r: 9,  color: '#F59E0B', label: 'TIMELINE',  ly: 37,  anim: 'vox-float-b', dur: '2.8s', delay: '0.6s' },
    { x: 58,  y: 152, r: 9,  color: '#10B981', label: 'OBJECTION', ly: 133, anim: 'vox-float-c', dur: '3.4s', delay: '1.2s' },
    { x: 188, y: 154, r: 11, color: '#EF4444', label: 'BLOCKER',   ly: 135, anim: 'vox-float-d', dur: '3.1s', delay: '0.3s' },
  ]
  const center = { x: 126, y: 107 }
  const connectors = [{ x: 146, y: 80 }, { x: 102, y: 132 }]
  const edges: [number, number][] = [[0, 1], [2, 3]]
  return (
    <svg viewBox="0 0 268 210" className="w-full h-full" fill="none">
      {topics.map((t, i) => (
        <line key={`tc-${i}`} x1={t.x} y1={t.y} x2={center.x} y2={center.y}
          stroke="rgba(0,0,0,0.16)" strokeWidth="1.3" strokeDasharray="5 5"
          style={{ animation: `vox-dash 1.3s linear infinite`, animationDelay: t.delay }} />
      ))}
      {edges.map(([a, b], i) => (
        <line key={`tt-${i}`}
          x1={topics[a].x} y1={topics[a].y} x2={topics[b].x} y2={topics[b].y}
          stroke="rgba(0,0,0,0.08)" strokeWidth="1" strokeDasharray="3 4" />
      ))}
      <circle cx={center.x} cy={center.y} r="8" fill="rgba(0,0,0,0.22)" />
      {connectors.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="4.5" fill="rgba(0,0,0,0.14)" />
      ))}
      {topics.map((t) => (
        <g key={t.label} style={{
          transformBox: 'fill-box', transformOrigin: 'center',
          animation: `${t.anim} ${t.dur} ease-in-out infinite`,
          animationDelay: t.delay,
        }}>
          <circle cx={t.x} cy={t.y} r={t.r + 5} fill={`${t.color}18`} stroke={`${t.color}45`} strokeWidth="1" />
          <circle cx={t.x} cy={t.y} r={t.r} fill={t.color} />
          <text x={t.x} y={t.ly} fontSize="9" fill="rgba(0,0,0,0.50)"
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
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-float-a 3.2s ease-in-out infinite' }}>
        <rect x="22" y="34" width="98" height="76" rx="8"
          fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" />
        <line x1="36" y1="55" x2="106" y2="55" stroke="rgba(0,0,0,0.30)" strokeWidth="2" />
        <line x1="36" y1="68" x2="100" y2="68" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" />
        <line x1="36" y1="79" x2="92"  y2="79" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" />
        <line x1="36" y1="90" x2="97"  y2="90" stroke="rgba(0,0,0,0.10)" strokeWidth="1.2" />
        <text x="71" y="124" fontSize="9.5" fill="rgba(0,0,0,0.42)"
          textAnchor="middle" fontFamily="monospace" letterSpacing="1.1">LINKEDIN</text>
      </g>
      <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-float-b 2.9s ease-in-out infinite', animationDelay: '0.6s' }}>
        <rect x="148" y="48" width="98" height="70" rx="8"
          fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.22)" strokeWidth="1.5" />
        <line x1="162" y1="67" x2="232" y2="67" stroke="rgba(0,0,0,0.30)" strokeWidth="2" />
        <line x1="162" y1="80" x2="226" y2="80" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" />
        <line x1="162" y1="91" x2="220" y2="91" stroke="rgba(0,0,0,0.15)" strokeWidth="1.2" />
        <line x1="162" y1="102" x2="228" y2="102" stroke="rgba(0,0,0,0.10)" strokeWidth="1.2" />
        <text x="197" y="134" fontSize="9.5" fill="rgba(0,0,0,0.42)"
          textAnchor="middle" fontFamily="monospace" letterSpacing="1.1">EMAIL</text>
      </g>
      <line x1="96"  y1="110" x2="122" y2="146"
        stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeDasharray="5 5"
        style={{ animation: 'vox-dash 1.1s linear infinite' }} />
      <line x1="172" y1="118" x2="140" y2="146"
        stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeDasharray="5 5"
        style={{ animation: 'vox-dash 1.1s linear infinite', animationDelay: '0.55s' }} />
      <circle cx="131" cy="160" r="26" fill="none" stroke="rgba(59,130,246,0.35)" strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-ring 2.4s ease-out infinite' }} />
      <circle cx="131" cy="160" r="20" fill="rgba(59,130,246,0.1)" stroke="rgba(59,130,246,0.6)" strokeWidth="2" />
      <circle cx="131" cy="160" r="7" fill="#3B82F6"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-dot 2.4s ease-in-out infinite' }} />
    </svg>
  )
}

const CARDS = [
  {
    label: 'INGEST FROM EVERY SOURCE',
    description: 'Meetings from Krisp, conversations from Slack, threads from Gmail and Granola — all flow into Vox automatically. No copy-paste. No new habit to build.',
    Diagram: IngestionDiagram,
  },
  {
    label: 'FINDS THE SIGNAL',
    description: 'Signals are recurring themes your customers mention across calls, emails, and articles — automatically detected and ready to draft. The more you connect, the sharper your intelligence gets.',
    Diagram: SignalDiagram,
  },
  {
    label: 'WRITES IN YOUR VOICE',
    description: 'Turn signals into LinkedIn posts, email sequences, and sales copy — grounded in what your customers actually said. Not invented. Extracted.',
    Diagram: OutputDiagram,
  },
]

const BENTO_FEATURES = [
  {
    tag: 'Signal Detection',
    tagColor: 'rgba(59,130,246,0.1)',
    tagTextColor: 'rgba(37,99,235,0.9)',
    title: 'Know what your market is thinking — before they say it.',
    body: 'Recurring objections, buying signals, competitive mentions — Vox surfaces them automatically across every connected source, ranked by frequency and recency.',
    chips: ['Recurring topics', 'Objection trends', 'Buying signals', 'Competitor mentions'],
    span: 'md:col-span-7',
  },
  {
    tag: 'Multi-source',
    tagColor: 'rgba(16,185,129,0.1)',
    tagTextColor: 'rgba(5,150,105,0.9)',
    title: 'Every conversation. One place.',
    body: 'Meetings, Slack threads, emails, CRM notes — all ingested automatically, chunked, embedded, and made searchable.',
    chips: [],
    span: 'md:col-span-5',
  },
  {
    tag: 'Voice matching',
    tagColor: 'rgba(245,158,11,0.1)',
    tagTextColor: 'rgba(180,105,0,0.9)',
    title: 'Content that sounds like you.',
    body: 'Train Vox on your writing style. Every draft is grounded in real conversations — never invented from thin air.',
    chips: [],
    span: 'md:col-span-5',
  },
  {
    tag: 'One-click publish',
    tagColor: 'rgba(99,102,241,0.1)',
    tagTextColor: 'rgba(79,70,229,0.9)',
    title: 'From draft to LinkedIn in one click.',
    body: 'Connect your LinkedIn account. Publish directly from Vox. Track what went live and when.',
    chips: [],
    span: 'md:col-span-4',
  },
  {
    tag: 'Team workspace',
    tagColor: 'rgba(239,68,68,0.1)',
    tagTextColor: 'rgba(185,28,28,0.9)',
    title: 'Built for teams who move fast.',
    body: 'Invite teammates, share drafts, and keep your intelligence layer in sync — everyone working from the same signal.',
    chips: [],
    span: 'md:col-span-3',
  },
] as const

function BentoCard({
  tag, tagColor, tagTextColor, title, body, chips, span,
}: {
  tag: string; tagColor: string; tagTextColor: string
  title: string; body: string; chips: readonly string[]
  span: string
}) {
  return (
    <div className={`${span} p-[6px] rounded-[2rem]`}
      style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.08)' }}>
      <div className="rounded-[calc(2rem-6px)] p-6 h-full bg-background"
        style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
        <span className="inline-block rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium mb-4"
          style={{ background: tagColor, color: tagTextColor }}>
          {tag}
        </span>
        <h3 className="text-lg sm:text-xl font-normal mb-2.5 leading-snug"
          style={{ fontFamily: SERIF, color: LT }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: LM }}>{body}</p>
        {chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map(chip => (
              <span key={chip} className="text-[11px] rounded-full px-3 py-1"
                style={{ background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.55)', border: '1px solid rgba(0,0,0,0.08)' }}>
                {chip}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function LandingPage() {
  const features   = useInView(0.08)
  const howWorks   = useInView(0.08)
  const pricingRef = useInView(0.08)
  const ctaRef     = useInView(0.15)

  const reveal = (inView: boolean) =>
    `transition-all duration-700 ${inView ? 'opacity-100 translate-y-0 blur-none' : 'opacity-0 translate-y-10 blur-sm'}`

  return (
    <div className="bg-background">

      {/* ═══ HERO — white background ══════════════════════════════════════════ */}
      <div className="min-h-[100dvh] overflow-hidden flex flex-col bg-background">

        <div className="flex flex-col flex-1">

          {/* ── Floating nav — dark on white ── */}
          <header className="pt-6 flex justify-center px-4">
            <nav className="rounded-full px-5 py-2.5 flex items-center gap-6 w-max"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 1px 16px rgba(0,0,0,0.07)',
              }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/vlogo.png" alt="Vox" className="h-12 w-auto select-none" />
              <div className="hidden md:flex items-center gap-5">
                {NAV_LINKS.map(label => (
                  <a key={label}
                    href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                    className="text-[13px] transition-colors duration-300"
                    style={{ color: LM }}
                    onMouseEnter={e => ((e.target as HTMLElement).style.color = LT)}
                    onMouseLeave={e => ((e.target as HTMLElement).style.color = LM)}>
                    {label}
                  </a>
                ))}
                <Link href="/login"
                  className="text-[13px] transition-colors duration-300"
                  style={{ color: LM }}
                  onMouseEnter={e => (e.currentTarget.style.color = LT)}
                  onMouseLeave={e => (e.currentTarget.style.color = LM)}>
                  Sign in
                </Link>
              </div>
              <Link href="/signup"
                className="group flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] text-white active:scale-[0.97]"
                style={{
                  background: LT,
                  transition: `all 500ms ${EASE}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                onMouseLeave={e => (e.currentTarget.style.background = LT)}>
                Get access
                <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 6.5L6.5 1.5M6.5 1.5H2.5M6.5 1.5V5.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </nav>
          </header>

          {/* ── Hero headline — sits above the video ── */}
          <section className="pt-20 pb-6 flex flex-col items-center text-center px-6">

            <div className="animate-fade-rise inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-10"
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{ animation: 'vox-pulse-dot 2s ease-in-out infinite' }} />
              <span className="text-[10px] uppercase tracking-[0.22em] font-medium" style={{ color: 'rgb(37,99,235)' }}>B2B Content Intelligence</span>
            </div>

            <h1 className="animate-fade-rise text-5xl sm:text-[72px] md:text-[92px] font-normal max-w-[18ch]"
              style={{ fontFamily: SERIF, lineHeight: 0.94, letterSpacing: '-2.8px', color: LT }}>
              Your customers already told you{' '}
              <em className="not-italic" style={{ color: LM }}>what to write.</em>
            </h1>

            <p className="animate-fade-rise-delay text-[17px] max-w-[46ch] mt-9 leading-relaxed" style={{ color: LM }}>
              Vox connects your meetings, Slack, and email — then generates LinkedIn posts,
              email sequences, and sales copy from the exact language your customers use.
              Not from a brief. From your best calls.
            </p>

            {/* Button-in-Button CTA */}
            <div className="animate-fade-rise-delay-2 mt-12 flex items-center gap-5 flex-wrap justify-center">
              <Link href="/signup"
                className="group inline-flex items-center gap-3 rounded-full px-9 py-4 text-[15px] text-white active:scale-[0.97]"
                style={{ background: LT, transition: `all 700ms ${EASE}` }}
                onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                onMouseLeave={e => (e.currentTarget.style.background = LT)}>
                Get early access
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
                  style={{ transition: `all 700ms ${EASE}` }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
              <Link href="/login"
                className="text-[14px] transition-colors duration-300"
                style={{ color: LM }}
                onMouseEnter={e => (e.currentTarget.style.color = LT)}
                onMouseLeave={e => (e.currentTarget.style.color = LM)}>
                Sign in &rarr;
              </Link>
            </div>
          </section>

          {/* ── Brain video — in flow, wide, inward mask ── */}
          <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
            <video
              autoPlay loop muted playsInline
              style={{
                width: '90vw',
                maxWidth: '1140px',
                minWidth: '360px',
                height: 'auto',
                display: 'block',
                maskImage: 'radial-gradient(ellipse 74% 70% at 50% 50%, black 28%, transparent 72%)',
                WebkitMaskImage: 'radial-gradient(ellipse 74% 70% at 50% 50%, black 28%, transparent 72%)',
              }}
            >
              <source src="/brain_rotation.mp4" type="video/mp4" />
            </video>
          </div>

          {/* ── Integrations strip ── */}
          <footer className="pb-14 flex flex-col items-center gap-7">
            <span className="text-[11px] tracking-[0.3em] uppercase font-medium" style={{ color: 'rgba(0,0,0,0.32)' }}>
              Connects to
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-9 gap-y-5 px-6">
              {INTEGRATIONS.map(({ name, domain }) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://logo.clearbit.com/${domain}`}
                    alt={name} width={36} height={36}
                    className="rounded-xl"
                    onError={e => {
                      const img = e.target as HTMLImageElement
                      img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
                      img.onerror = () => { img.style.display = 'none' }
                    }}
                  />
                  <span className="text-[10px] tracking-[0.12em] uppercase font-medium" style={{ color: 'rgba(0,0,0,0.35)' }}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </footer>
        </div>
      </div>

      {/* ═══ FEATURES BENTO ════════════════════════════════════════════════════ */}
      <section id="features" className="px-4 sm:px-8 py-32 sm:py-40 bg-background"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={features.ref} className="max-w-6xl mx-auto">

          <div className={`text-center mb-16 ${reveal(features.inView)}`}
            style={{ transitionTimingFunction: EASE }}>
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-5"
              style={{ color: 'rgba(0,0,0,0.38)' }}>What Vox does</p>
            <h2 className="text-4xl sm:text-5xl md:text-[60px] font-normal max-w-[20ch] mx-auto"
              style={{ fontFamily: SERIF, letterSpacing: '-1.8px', lineHeight: 1.0, color: LT }}>
              Intelligence that turns into{' '}
              <em className="not-italic" style={{ color: LM }}>pipeline.</em>
            </h2>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-12 gap-3 ${reveal(features.inView)}`}
            style={{ transitionTimingFunction: EASE, transitionDelay: '150ms' }}>
            {BENTO_FEATURES.map((f) => (
              <BentoCard key={f.tag} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="px-4 sm:px-8 py-32 sm:py-40"
        style={{ backgroundColor: '#f5f6f8', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={howWorks.ref} className="max-w-5xl mx-auto">

          <div className={`text-center mb-16 ${reveal(howWorks.inView)}`}
            style={{ transitionTimingFunction: EASE }}>
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-5"
              style={{ color: 'rgba(0,0,0,0.38)' }}>How it works</p>
            <h2 className="text-4xl sm:text-5xl md:text-[60px] font-normal"
              style={{ fontFamily: SERIF, letterSpacing: '-1.8px', lineHeight: 1.0, color: LT }}>
              Ingest. Detect. Write.{' '}
              <em className="not-italic" style={{ color: LM }}>Publish.</em>
            </h2>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${reveal(howWorks.inView)}`}
            style={{ transitionTimingFunction: EASE, transitionDelay: '150ms' }}>
            {CARDS.map(({ label, description, Diagram }) => (
              <div key={label} className="p-[6px] rounded-[2rem]"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div className="rounded-[calc(2rem-6px)] flex flex-col bg-background"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
                  <div className="h-56 flex items-center justify-center px-6 py-6"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <Diagram />
                  </div>
                  <div className="px-6 py-6 space-y-3">
                    <p className="text-[10px] tracking-[0.18em] font-semibold uppercase"
                      style={{ color: 'rgba(0,0,0,0.38)' }}>{label}</p>
                    <p className="text-[14px] leading-relaxed" style={{ color: LM }}>{description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══════════════════════════════════════════════════════════ */}
      <section id="pricing" className="px-4 sm:px-8 py-32 sm:py-40 bg-background">
        <div ref={pricingRef.ref} className="max-w-5xl mx-auto">

          <div className={`text-center mb-16 ${reveal(pricingRef.inView)}`}
            style={{ transitionTimingFunction: EASE }}>
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-5"
              style={{ color: 'rgba(0,0,0,0.38)' }}>Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-normal"
              style={{ fontFamily: SERIF, letterSpacing: '-1.2px', lineHeight: 1.0, color: LT }}>
              Simple pricing.{' '}
              <em className="not-italic" style={{ color: LM }}>No surprises.</em>
            </h2>
            <p className="text-[15px] max-w-[46ch] mx-auto mt-5 leading-relaxed" style={{ color: LM }}>
              Start free. Scale when your team does. Every plan includes all sources and the full intelligence layer.
            </p>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch ${reveal(pricingRef.inView)}`}
            style={{ transitionTimingFunction: EASE, transitionDelay: '150ms' }}>

            {/* Starter */}
            <div className="p-[6px] rounded-[2rem]"
              style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="rounded-[calc(2rem-6px)] p-7 flex flex-col gap-6 h-full bg-background"
                style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
                <div className="space-y-2">
                  <p className="text-[10px] tracking-[0.22em] uppercase font-semibold" style={{ color: LM }}>Starter</p>
                  <p className="text-[42px] font-semibold leading-none" style={{ color: LT }}>Free</p>
                  <p className="text-sm" style={{ color: LM }}>Perfect for solo operators getting started.</p>
                </div>
                <ul className="space-y-3 flex-1">
                  {['1 workspace', '3 connected sources', '20 drafts / month', 'LinkedIn + Email publish', 'Signals & entity graph'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: 'rgba(0,0,0,0.65)' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(0,0,0,0.07)' }}>
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup"
                  className="block text-center rounded-full py-3 text-[13px] font-medium"
                  style={{ background: 'rgba(0,0,0,0.06)', color: LT, border: '1px solid rgba(0,0,0,0.1)', transition: `background 400ms ${EASE}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}>
                  Get started free
                </Link>
              </div>
            </div>

            {/* Growth */}
            <div className="p-[6px] rounded-[2rem] relative"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.35)' }}>
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-4 py-1 rounded-full tracking-[0.1em] uppercase"
                style={{ background: 'rgb(59,130,246)', color: '#fff' }}>
                Most popular
              </span>
              <div className="rounded-[calc(2rem-6px)] p-7 flex flex-col gap-6 h-full"
                style={{ background: 'rgba(59,130,246,0.05)', boxShadow: 'inset 0 1px 0 rgba(59,130,246,0.15)' }}>
                <div className="space-y-2">
                  <p className="text-[10px] tracking-[0.22em] uppercase font-semibold" style={{ color: 'rgb(37,99,235)' }}>Growth</p>
                  <div className="flex items-end gap-1.5">
                    <p className="text-[42px] font-semibold leading-none" style={{ color: LT }}>$79</p>
                    <p className="text-sm mb-1" style={{ color: LM }}>/month</p>
                  </div>
                  <p className="text-sm" style={{ color: LM }}>For teams turning customer intelligence into pipeline.</p>
                </div>
                <ul className="space-y-3 flex-1">
                  {['Up to 5 seats', 'Unlimited sources', 'Unlimited drafts', 'All Starter features', 'Priority email support', 'Early access to new integrations'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: 'rgba(0,0,0,0.75)' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(59,130,246,0.2)' }}>
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke="rgb(37,99,235)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup"
                  className="block text-center rounded-full py-3 text-[13px] font-medium text-white"
                  style={{ background: 'rgb(59,130,246)', transition: `background 400ms ${EASE}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgb(37,99,235)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgb(59,130,246)')}>
                  Start free trial
                </Link>
              </div>
            </div>

            {/* Enterprise */}
            <div className="p-[6px] rounded-[2rem]"
              style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="rounded-[calc(2rem-6px)] p-7 flex flex-col gap-6 h-full bg-background"
                style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
                <div className="space-y-2">
                  <p className="text-[10px] tracking-[0.22em] uppercase font-semibold" style={{ color: LM }}>Enterprise</p>
                  <p className="text-[42px] font-semibold leading-none" style={{ color: LT }}>Custom</p>
                  <p className="text-sm" style={{ color: LM }}>For revenue teams that need scale and control.</p>
                </div>
                <ul className="space-y-3 flex-1">
                  {['Unlimited seats', 'Custom integrations', 'SSO / SAML', 'Dedicated Slack support', 'SLA + uptime guarantee', 'Custom data retention'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: 'rgba(0,0,0,0.65)' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(0,0,0,0.07)' }}>
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke="rgba(0,0,0,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="mailto:hello@vox.so"
                  className="block text-center rounded-full py-3 text-[13px] font-medium"
                  style={{ background: 'rgba(0,0,0,0.06)', color: LT, border: '1px solid rgba(0,0,0,0.1)', transition: `background 400ms ${EASE}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}>
                  Talk to us
                </a>
              </div>
            </div>
          </div>

          <p className="text-center text-xs mt-9" style={{ color: 'rgba(0,0,0,0.32)' }}>
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </section>

      {/* ═══ FINAL CTA ═════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 py-24 sm:py-32"
        style={{ backgroundColor: '#f5f6f8', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={ctaRef.ref} className={`max-w-5xl mx-auto ${reveal(ctaRef.inView)}`}
          style={{ transitionTimingFunction: EASE }}>
          <div className="p-[6px] rounded-[2rem]"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
            <div className="rounded-[calc(2rem-6px)] px-8 sm:px-20 py-20 text-center bg-background"
              style={{ boxShadow: 'inset 0 1px 0 rgba(59,130,246,0.06)' }}>
              <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-7"
                style={{ color: 'rgba(37,99,235,0.65)' }}>Start today</p>
              <h2 className="text-4xl sm:text-5xl md:text-[60px] font-normal max-w-[22ch] mx-auto mb-6"
                style={{ fontFamily: SERIF, letterSpacing: '-1.8px', lineHeight: 1.0, color: LT }}>
                Stop writing from scratch.{' '}
                <em className="not-italic" style={{ color: LM }}>Start writing from signal.</em>
              </h2>
              <p className="text-[15px] max-w-[44ch] mx-auto mb-12 leading-relaxed" style={{ color: LM }}>
                Connect your first source in under two minutes. Vox starts finding patterns immediately.
              </p>
              <Link href="/signup"
                className="group inline-flex items-center gap-3 rounded-full px-10 py-4 text-[15px] text-white active:scale-[0.97]"
                style={{ background: LT, transition: `all 700ms ${EASE}` }}
                onMouseEnter={e => (e.currentTarget.style.background = '#222')}
                onMouseLeave={e => (e.currentTarget.style.background = LT)}>
                Get early access — it&apos;s free
                <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center"
                  style={{ transition: `all 700ms ${EASE}` }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="px-6 sm:px-10 py-10 bg-background" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/vlogo.png" alt="Vox" className="h-12 w-auto select-none" />
          <p className="text-xs" style={{ color: 'rgba(0,0,0,0.28)' }}>
            &copy; {new Date().getFullYear()} Vox. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
