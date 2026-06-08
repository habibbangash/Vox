'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const HEADING = "var(--font-display), 'DM Sans', sans-serif"
const LM      = 'rgba(15,26,20,0.55)'
const LT      = '#0F1A14'
const ACCENT  = '#D97706'
const GREEN   = '#1A3D2B'
const GREEN_M = '#2D5A3D'
const EASE    = 'cubic-bezier(0.32,0.72,0,1)'

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
      <circle cx={cx} cy={cy} r="28" fill="none" stroke="rgba(26,61,43,0.45)" strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-ring 2.4s ease-out infinite' }} />
      <circle cx={cx} cy={cy} r="24" fill="rgba(26,61,43,0.1)" stroke="rgba(26,61,43,0.6)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="8" fill="#1A3D2B"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-dot 2.4s ease-in-out infinite' }} />
      <text x={cx} y={cy + 44} fontSize="9.5" fill="rgba(15,26,20,0.42)"
        textAnchor="middle" fontFamily="monospace" letterSpacing="1.6">VOX</text>
    </svg>
  )
}

function SignalDiagram() {
  const topics = [
    { x: 70,  y: 64,  r: 12, color: '#1A3D2B', label: 'PRICING',   ly: 45,  anim: 'vox-float-a', dur: '3.0s', delay: '0s'   },
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
      <circle cx="131" cy="160" r="26" fill="none" stroke="rgba(26,61,43,0.35)" strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-ring 2.4s ease-out infinite' }} />
      <circle cx="131" cy="160" r="20" fill="rgba(26,61,43,0.1)" stroke="rgba(26,61,43,0.6)" strokeWidth="2" />
      <circle cx="131" cy="160" r="7" fill="#1A3D2B"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-dot 2.4s ease-in-out infinite' }} />
    </svg>
  )
}

function PipelineHeroDiagram() {
  const sources = [
    { label: 'Krisp',    dot: '#FF5757', y: 44  },
    { label: 'Slack',    dot: '#6B49A9', y: 120 },
    { label: 'HubSpot',  dot: '#FF7A59', y: 196 },
    { label: 'Gmail',    dot: '#EA4335', y: 272 },
    { label: 'Granola',  dot: '#00A67E', y: 348 },
  ]
  const formats = [
    { label: 'LinkedIn post',   color: '#1A3D2B', y: 44  },
    { label: 'Email sequence',  color: '#D97706', y: 120 },
    { label: 'Blog post',       color: '#1A3D2B', y: 196 },
    { label: 'Newsletter',      color: '#D97706', y: 272 },
    { label: 'Battle card',     color: '#1A3D2B', y: 348 },
  ]
  const cx = 480, cy = 196
  const srcRx = 248, outLx = 726

  return (
    <svg
      viewBox="0 0 960 392"
      className="w-full h-full"
      fill="none"
      style={{ fontFamily: 'var(--font-sans, sans-serif)', overflow: 'visible' }}
    >
      {/* Source → Vox bezier lines */}
      {sources.map((s, i) => {
        const mx = Math.round((srcRx + cx - 52) / 2)
        return (
          <path key={`sl-${i}`}
            d={`M ${srcRx} ${s.y} C ${mx} ${s.y}, ${mx} ${cy}, ${cx - 54} ${cy}`}
            stroke="rgba(26,61,43,0.22)" strokeWidth="1.5" strokeDasharray="7 5"
            style={{ animation: `vox-dash 1.8s linear infinite`, animationDelay: `${i * 0.2}s` }}
          />
        )
      })}

      {/* Source cards */}
      {sources.map((s, i) => (
        <g key={s.label} style={{ animation: `pipe-source-in 0.4s ease-out ${i * 0.1}s both` }}>
          <rect x={70} y={s.y - 18} width={160} height={36} rx={9}
            fill="rgba(15,26,20,0.03)" stroke="rgba(26,61,43,0.18)" strokeWidth="1.2" />
          <circle cx={97} cy={s.y} r={5.5} fill={s.dot} />
          <text x={112} y={s.y + 4.5} fontSize={13} fill="rgba(15,26,20,0.72)" letterSpacing="0.3">
            {s.label}
          </text>
        </g>
      ))}

      {/* Column label: Sources */}
      <text x={150} y={14} textAnchor="middle" fontSize={9} fill="rgba(15,26,20,0.32)"
        letterSpacing="2">SOURCES</text>

      {/* Vox engine — outer amber pulse ring */}
      <circle cx={cx} cy={cy} r={66} fill="none" stroke="rgba(217,119,6,0.22)" strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-ring 3.2s ease-out infinite' }} />

      {/* Vox engine — body */}
      <circle cx={cx} cy={cy} r={54} fill="#1A3D2B" />

      {/* Vox engine — inner amber accent ring */}
      <circle cx={cx} cy={cy} r={45} fill="none" stroke="rgba(217,119,6,0.45)" strokeWidth="1.2"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'vox-pulse-dot 3.2s ease-in-out infinite' }} />

      {/* Vox engine — wordmark */}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={17} fontWeight="700"
        fill="#F5F0E8" letterSpacing="4.5">VOX</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize={9}
        fill="rgba(245,240,232,0.58)" letterSpacing="1">AI ENGINE</text>

      {/* Vox → Output bezier lines */}
      {formats.map((f, i) => {
        const mx = Math.round((cx + 54 + outLx) / 2)
        return (
          <path key={`fl-${i}`}
            d={`M ${cx + 54} ${cy} C ${mx} ${cy}, ${mx} ${f.y}, ${outLx} ${f.y}`}
            stroke="rgba(217,119,6,0.3)" strokeWidth="1.5" strokeDasharray="7 5"
            style={{ animation: `vox-dash 1.8s linear infinite`, animationDelay: `${0.9 + i * 0.2}s` }}
          />
        )
      })}

      {/* Output format cards */}
      {formats.map((f, i) => (
        <g key={f.label} style={{
          animation: `pipe-card-in 0.5s ease-out ${1.0 + i * 0.18}s both`,
          transformBox: 'fill-box',
        }}>
          <rect x={outLx} y={f.y - 18} width={168} height={36} rx={9}
            fill="rgba(255,255,255,0.94)" stroke="rgba(229,224,216,1)" strokeWidth="1.2" />
          <circle cx={outLx + 18} cy={f.y} r={5} fill={f.color} />
          <text x={outLx + 34} y={f.y + 4.5} fontSize={13} fill="rgba(15,26,20,0.72)" letterSpacing="0.3">
            {f.label}
          </text>
        </g>
      ))}

      {/* Column label: Signal-based content */}
      <text x={810} y={14} textAnchor="middle" fontSize={9} fill="rgba(15,26,20,0.32)"
        letterSpacing="1.4">SIGNAL-BASED CONTENT</text>
    </svg>
  )
}

const CARDS = [
  {
    label: 'INGEST FROM EVERY SOURCE',
    description: 'Meetings from Krisp, conversations from Slack, threads from Gmail and Granola. All flow into Vox automatically. No copy-paste, no new habit to build.',
    Diagram: IngestionDiagram,
  },
  {
    label: 'FINDS THE SIGNAL',
    description: 'Signals are recurring themes your customers mention across calls, emails, and articles. Automatically detected and ready to draft. The more you connect, the sharper your intelligence gets.',
    Diagram: SignalDiagram,
  },
  {
    label: 'WRITES IN YOUR VOICE',
    description: 'Turn signals into LinkedIn posts, email sequences, and sales copy. Grounded in what your customers actually said. Not invented. Extracted.',
    Diagram: OutputDiagram,
  },
]

const BENTO_FEATURES = [
  {
    tag: 'Signal Detection',
    tagColor: 'rgba(26,61,43,0.1)',
    tagTextColor: 'rgba(26,61,43,0.9)',
    title: 'Know what your market is thinking before they say it.',
    body: 'Recurring objections, buying signals, competitive mentions. Vox surfaces them automatically across every connected source, ranked by frequency and recency.',
    chips: ['Recurring topics', 'Objection trends', 'Buying signals', 'Competitor mentions'],
    span: 'md:col-span-7',
  },
  {
    tag: 'Multi-source',
    tagColor: 'rgba(16,185,129,0.1)',
    tagTextColor: 'rgba(5,150,105,0.9)',
    title: 'Every conversation. One place.',
    body: 'Meetings, Slack threads, emails, CRM notes. All ingested automatically, chunked, embedded, and made searchable.',
    chips: [],
    span: 'md:col-span-5',
  },
  {
    tag: 'Voice matching',
    tagColor: 'rgba(245,158,11,0.1)',
    tagTextColor: 'rgba(180,105,0,0.9)',
    title: 'Content that sounds like you.',
    body: 'Train Vox on your writing style. Every draft is grounded in real conversations. Never invented from thin air.',
    chips: [],
    span: 'md:col-span-5',
  },
  {
    tag: 'One-click publish',
    tagColor: 'rgba(217,119,6,0.1)',
    tagTextColor: 'rgba(180,83,9,0.9)',
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
    body: 'Invite teammates, share drafts, and keep your intelligence layer in sync. Everyone working from the same signal.',
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
          style={{ fontFamily: HEADING, color: LT }}>
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

const TESTIMONIALS = [
  {
    quote: "Vox caught a recurring onboarding objection buried across six Slack threads and three Krisp calls, all in the same week. That became our best-performing LinkedIn post and a new FAQ page. I would never have spotted it manually.",
    name: 'Lena M.',
    title: 'Head of Content',
    company: 'B2B SaaS',
  },
  {
    quote: "We used to spend a Friday afternoon figuring out what to write next week. Now Vox tells us. It's always grounded in something a real customer said. The team ships twice as much content with half the effort.",
    name: 'James R.',
    title: 'GTM Lead',
    company: 'Early-stage startup',
  },
  {
    quote: "The knowledge graph is genuinely useful. It shows which objections are connected to which accounts, which topics come up before a deal closes. It's like having a second analyst who reads every call.",
    name: 'Sarah K.',
    title: 'Founder',
    company: 'Revenue-stage B2B',
  },
] as const

const USE_CASES = [
  {
    tag: 'Content & Demand Gen',
    tagColor: 'rgba(26,61,43,0.1)',
    tagTextColor: 'rgba(26,61,43,0.9)',
    title: 'Turn every call into content that converts.',
    body: "Your customers already have the words. Vox finds the themes they repeat across meetings, Slack, and email, then turns them into LinkedIn posts, newsletters, and sales assets that land because they're real.",
  },
  {
    tag: 'Account Executives',
    tagColor: 'rgba(16,185,129,0.1)',
    tagTextColor: 'rgba(5,150,105,0.9)',
    title: 'Walk into every deal knowing what actually matters.',
    body: "Surface buying signals, recurring objections, and competitive mentions across all your accounts. Ranked by recency and frequency. Know the right thing to say before you say it.",
  },
  {
    tag: 'Founders & GTM Leaders',
    tagColor: 'rgba(245,158,11,0.1)',
    tagTextColor: 'rgba(180,105,0,0.9)',
    title: "Stay close to the voice of your customer without reading every transcript.",
    body: "Vox synthesises everything your team hears into a live intelligence layer. See what's shifting, what's trending, and what your market is saying right now. Not last quarter.",
  },
] as const

export function LandingPage() {
  const features      = useInView(0.08)
  const testimonials  = useInView(0.08)
  const useCases      = useInView(0.08)
  const howWorks      = useInView(0.08)
  const pricingRef    = useInView(0.08)
  const ctaRef        = useInView(0.15)

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
                  background: GREEN,
                  transition: `all 500ms ${EASE}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = GREEN_M)}
                onMouseLeave={e => (e.currentTarget.style.background = GREEN)}>
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
              style={{ background: 'rgba(26,61,43,0.08)', border: '1px solid rgba(26,61,43,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN, animation: 'vox-pulse-dot 2s ease-in-out infinite' }} />
              <span className="text-[10px] uppercase tracking-[0.22em] font-medium" style={{ color: GREEN }}>B2B Content Intelligence</span>
            </div>

            <h1 className="animate-fade-rise text-5xl sm:text-[72px] md:text-[92px] font-normal max-w-[18ch]"
              style={{ fontFamily: HEADING, lineHeight: 0.94, letterSpacing: '-2.8px', color: LT }}>
              Every conversation your team has is a content brief{' '}
              <em className="not-italic" style={{ color: LM }}>waiting to be written.</em>
            </h1>

            <p className="animate-fade-rise-delay text-[17px] max-w-[46ch] mt-9 leading-relaxed" style={{ color: LM }}>
              Vox listens to your meetings, CRM, and Slack. It turns what your customers
              actually say into LinkedIn posts, email sequences, and sales copy.
              Not invented. Extracted.
            </p>

            {/* Button-in-Button CTA */}
            <div className="animate-fade-rise-delay-2 mt-12 flex items-center gap-5 flex-wrap justify-center">
              <Link href="/signup"
                className="group inline-flex items-center gap-3 rounded-full px-9 py-4 text-[15px] text-white active:scale-[0.97]"
                style={{ background: ACCENT, transition: `all 700ms ${EASE}` }}
                onMouseEnter={e => (e.currentTarget.style.background = '#b45309')}
                onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>
                Start for free
                <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                  style={{ transition: `all 700ms ${EASE}` }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 8L8 2M8 2H3.5M8 2V6.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
              <Link href="#how-it-works"
                className="text-[14px] transition-colors duration-300"
                style={{ color: LM }}
                onMouseEnter={e => (e.currentTarget.style.color = LT)}
                onMouseLeave={e => (e.currentTarget.style.color = LM)}>
                See how it works &rarr;
              </Link>
            </div>
          </section>

          {/* ── Pipeline diagram — how Vox works ── */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-6 overflow-hidden">
            <div style={{ width: '100%', maxWidth: '960px', minWidth: '320px' }}>
              <PipelineHeroDiagram />
            </div>
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

      {/* ═══ TESTIMONIALS ══════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 py-32 sm:py-40"
        style={{ backgroundColor: '#F0EDE6', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={testimonials.ref} className="max-w-6xl mx-auto">

          <div className={`text-center mb-16 ${reveal(testimonials.inView)}`}
            style={{ transitionTimingFunction: EASE }}>
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-5"
              style={{ color: 'rgba(0,0,0,0.38)' }}>What teams are saying</p>
            <h2 className="text-4xl sm:text-5xl font-normal"
              style={{ fontFamily: HEADING, letterSpacing: '-1.2px', lineHeight: 1.0, color: LT }}>
              The signal was always there.{' '}
              <em className="not-italic" style={{ color: LM }}>Vox finds it.</em>
            </h2>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${reveal(testimonials.inView)}`}
            style={{ transitionTimingFunction: EASE, transitionDelay: '150ms' }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-[6px] rounded-[2rem]"
                style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div className="rounded-[calc(2rem-6px)] p-7 flex flex-col gap-6 h-full bg-background"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
                  <svg width="22" height="16" viewBox="0 0 22 16" fill="none" className="shrink-0">
                    <path d="M0 16V9.6C0 4.267 2.56 1.067 7.68 0l1.12 1.92C6.293 2.667 4.96 4.213 4.64 6.4H8V16H0Zm12 0V9.6C12 4.267 14.56 1.067 19.68 0l1.12 1.92c-2.507.747-3.84 2.293-4.16 4.48H20V16H12Z"
                      fill="rgba(0,0,0,0.1)" />
                  </svg>
                  <p className="text-[14px] leading-relaxed flex-1" style={{ color: LM }}>
                    {t.quote}
                  </p>
                  <div className="flex items-center gap-3 pt-4"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ background: 'rgba(0,0,0,0.07)', color: LT }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: LT }}>{t.name}</p>
                      <p className="text-[11px]" style={{ color: 'rgba(0,0,0,0.38)' }}>{t.title} · {t.company}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES BENTO ════════════════════════════════════════════════════ */}
      <section id="features" className="px-4 sm:px-8 py-32 sm:py-40 bg-background"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={features.ref} className="max-w-6xl mx-auto">

          <div className={`text-center mb-16 ${reveal(features.inView)}`}
            style={{ transitionTimingFunction: EASE }}>
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-5"
              style={{ color: 'rgba(0,0,0,0.38)' }}>What Vox does</p>
            <h2 className="text-4xl sm:text-5xl md:text-[60px] font-normal max-w-[20ch] mx-auto"
              style={{ fontFamily: HEADING, letterSpacing: '-1.8px', lineHeight: 1.0, color: LT }}>
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

      {/* ═══ USE CASES ═════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 py-32 sm:py-40 bg-background"
        style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={useCases.ref} className="max-w-6xl mx-auto">

          <div className={`text-center mb-16 ${reveal(useCases.inView)}`}
            style={{ transitionTimingFunction: EASE }}>
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-5"
              style={{ color: 'rgba(0,0,0,0.38)' }}>Built for</p>
            <h2 className="text-4xl sm:text-5xl md:text-[60px] font-normal max-w-[20ch] mx-auto"
              style={{ fontFamily: HEADING, letterSpacing: '-1.8px', lineHeight: 1.0, color: LT }}>
              Revenue teams who{' '}
              <em className="not-italic" style={{ color: LM }}>move on signal.</em>
            </h2>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${reveal(useCases.inView)}`}
            style={{ transitionTimingFunction: EASE, transitionDelay: '150ms' }}>
            {USE_CASES.map((u) => (
              <div key={u.tag} className="p-[6px] rounded-[2rem]"
                style={{ background: 'rgba(0,0,0,0.025)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div className="rounded-[calc(2rem-6px)] p-7 flex flex-col gap-5 h-full bg-background"
                  style={{ boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.04)' }}>
                  <span className="inline-block self-start rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium"
                    style={{ background: u.tagColor, color: u.tagTextColor }}>
                    {u.tag}
                  </span>
                  <h3 className="text-lg sm:text-xl font-normal leading-snug"
                    style={{ fontFamily: HEADING, color: LT }}>
                    {u.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed flex-1" style={{ color: LM }}>{u.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="px-4 sm:px-8 py-32 sm:py-40"
        style={{ backgroundColor: '#F0EDE6', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={howWorks.ref} className="max-w-5xl mx-auto">

          <div className={`text-center mb-16 ${reveal(howWorks.inView)}`}
            style={{ transitionTimingFunction: EASE }}>
            <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-5"
              style={{ color: 'rgba(0,0,0,0.38)' }}>How it works</p>
            <h2 className="text-4xl sm:text-5xl md:text-[60px] font-normal"
              style={{ fontFamily: HEADING, letterSpacing: '-1.8px', lineHeight: 1.0, color: LT }}>
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
              style={{ fontFamily: HEADING, letterSpacing: '-1.2px', lineHeight: 1.0, color: LT }}>
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
              style={{ background: 'rgba(26,61,43,0.08)', border: '1px solid rgba(26,61,43,0.35)' }}>
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-semibold px-4 py-1 rounded-full tracking-[0.1em] uppercase"
                style={{ background: ACCENT, color: '#fff' }}>
                Most popular
              </span>
              <div className="rounded-[calc(2rem-6px)] p-7 flex flex-col gap-6 h-full"
                style={{ background: 'rgba(26,61,43,0.04)', boxShadow: 'inset 0 1px 0 rgba(26,61,43,0.12)' }}>
                <div className="space-y-2">
                  <p className="text-[10px] tracking-[0.22em] uppercase font-semibold" style={{ color: GREEN }}>Growth</p>
                  <div className="flex items-end gap-1.5">
                    <p className="text-[42px] font-semibold leading-none" style={{ color: LT }}>$79</p>
                    <p className="text-sm mb-1" style={{ color: LM }}>/month</p>
                  </div>
                  <p className="text-sm" style={{ color: LM }}>For teams turning customer intelligence into pipeline.</p>
                </div>
                <ul className="space-y-3 flex-1">
                  {['Up to 5 seats', 'Unlimited sources', 'Unlimited drafts', 'All Starter features', 'Priority email support', 'Early access to new integrations'].map(f => (
                    <li key={f} className="flex items-center gap-3 text-[13px]" style={{ color: 'rgba(15,26,20,0.75)' }}>
                      <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(26,61,43,0.15)' }}>
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3l2 2 4-4" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup"
                  className="block text-center rounded-full py-3 text-[13px] font-medium text-white"
                  style={{ background: ACCENT, transition: `background 400ms ${EASE}` }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#b45309')}
                  onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>
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
        style={{ backgroundColor: '#F0EDE6', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div ref={ctaRef.ref} className={`max-w-5xl mx-auto ${reveal(ctaRef.inView)}`}
          style={{ transitionTimingFunction: EASE }}>
          <div className="p-[6px] rounded-[2rem]"
            style={{ background: 'rgba(26,61,43,0.06)', border: '1px solid rgba(26,61,43,0.2)' }}>
            <div className="rounded-[calc(2rem-6px)] px-8 sm:px-20 py-20 text-center bg-background"
              style={{ boxShadow: 'inset 0 1px 0 rgba(26,61,43,0.06)' }}>
              <p className="text-[10px] tracking-[0.3em] uppercase font-medium mb-7"
                style={{ color: 'rgba(26,61,43,0.65)' }}>Start today</p>
              <h2 className="text-4xl sm:text-5xl md:text-[60px] font-normal max-w-[22ch] mx-auto mb-6"
                style={{ fontFamily: HEADING, letterSpacing: '-1.8px', lineHeight: 1.0, color: LT }}>
                Stop writing from scratch.{' '}
                <em className="not-italic" style={{ color: LM }}>Start writing from signal.</em>
              </h2>
              <p className="text-[15px] max-w-[44ch] mx-auto mb-12 leading-relaxed" style={{ color: LM }}>
                Connect your first source in under two minutes. Vox starts finding patterns immediately.
              </p>
              <Link href="/signup"
                className="group inline-flex items-center gap-3 rounded-full px-10 py-4 text-[15px] text-white active:scale-[0.97]"
                style={{ background: ACCENT, transition: `all 700ms ${EASE}` }}
                onMouseEnter={e => (e.currentTarget.style.background = '#b45309')}
                onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}>
                Start for free, no credit card
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
