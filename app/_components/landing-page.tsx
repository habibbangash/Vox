'use client'
import Link from 'next/link'

const DISPLAY = "'Instrument Serif', serif"

const NAV_LINKS = ['Features', 'How it works', 'Pricing'] as const

// Clearbit Logo API — widely-used B2B logo CDN, no auth required
const INTEGRATIONS = [
  { name: 'Krisp',    domain: 'krisp.ai'      },
  { name: 'Slack',    domain: 'slack.com'     },
  { name: 'Gmail',    domain: 'gmail.com'     },
  { name: 'HubSpot',  domain: 'hubspot.com'   },
  { name: 'Notion',   domain: 'notion.so'     },
  { name: 'LinkedIn', domain: 'linkedin.com'  },
  { name: 'Granola',  domain: 'granola.so'    },
] as const

export function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#F5F3EF', fontFamily: 'var(--font-geist-sans), sans-serif' }}
    >
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <header className="px-8 py-5 border-b border-[#E8E4DC]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <span
            className="text-2xl tracking-tight text-[#111827] select-none"
            style={{ fontFamily: DISPLAY }}
          >
            Vox
          </span>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA pair */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full px-5 py-2 text-sm text-white bg-[#0F2744] hover:bg-[#1a3a5c] transition-colors"
            >
              Get early access
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — copy */}
          <div className="space-y-8">

            {/* Pill */}
            <span className="inline-flex items-center rounded-full border border-[#D4CFC6] bg-white/60 px-3 py-1 text-xs text-[#6B7280]">
              Content engine for B2B teams
            </span>

            {/* Headline */}
            <h1
              className="text-5xl sm:text-6xl lg:text-[72px] font-normal text-[#111827] animate-fade-rise"
              style={{
                fontFamily:    DISPLAY,
                lineHeight:    1.02,
                letterSpacing: '-1.5px',
              }}
            >
              Your customers<br />
              already told you<br />
              <em className="not-italic" style={{ color: '#A8A29E' }}>
                what to write.
              </em>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg text-[#6B7280] max-w-md leading-relaxed animate-fade-rise-delay">
              Connect your meetings, Slack, and email. Vox generates LinkedIn
              posts, email sequences, and sales copy from the exact language
              your customers use.
            </p>

            {/* CTAs */}
            <div className="flex items-center gap-5 animate-fade-rise-delay-2">
              <Link
                href="/signup"
                className="rounded-full px-7 py-3.5 text-base text-white bg-[#0F2744] hover:bg-[#1a3a5c] transition-colors"
              >
                Get early access →
              </Link>
              <Link
                href="/login"
                className="text-base text-[#374151] hover:text-[#6B7280] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Right — video panel */}
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl w-full animate-fade-rise-delay"
            style={{ height: 'clamp(340px, 45vw, 600px)' }}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source
                src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>
      </main>

      {/* ── "Connects to" bar ──────────────────────────────────────────── */}
      <footer className="border-t border-[#E8E4DC] bg-[#ECEAE4] px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-7 gap-y-3">

          <span
            className="text-sm shrink-0 pr-6 border-r border-[#D4CFC6]"
            style={{ color: '#9CA3AF' }}
          >
            Connects to
          </span>

          {INTEGRATIONS.map(({ name, domain }) => (
            <div key={name} className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://logo.clearbit.com/${domain}`}
                alt={name}
                width={20}
                height={20}
                className="rounded-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <span className="text-sm text-[#6B7280]">{name}</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  )
}
