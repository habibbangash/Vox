'use client'
import Link from 'next/link'

const DISPLAY = "'Instrument Serif', serif"
const MUTED   = 'hsl(240, 4%, 66%)'

const NAV_LINKS = ['Features', 'How it works', 'Pricing'] as const

export function LandingPage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: 'hsl(201, 100%, 13%)' }}
    >
      {/* ── Video background ──────────────────────────────────────────── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      {/* ── Content layer ─────────────────────────────────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <header className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">

            {/* Logo */}
            <span
              className="text-3xl tracking-tight text-white select-none"
              style={{ fontFamily: DISPLAY }}
            >
              Vox
            </span>

            {/* Links — hidden on mobile */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((label) => (
                <a
                  key={label}
                  href="#"
                  className="text-sm transition-colors"
                  style={{ color: MUTED }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = MUTED)}
                >
                  {label}
                </a>
              ))}
              <Link
                href="/login"
                className="text-sm transition-colors"
                style={{ color: MUTED }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#fff')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = MUTED)}
              >
                Sign in
              </Link>
            </nav>

            {/* CTA */}
            <Link
              href="/signup"
              className="liquid-glass rounded-full px-6 py-2.5 text-sm text-white transition-transform hover:scale-[1.03]"
            >
              Get early access
            </Link>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-[90px]">

          {/* Headline */}
          <h1
            className="text-5xl sm:text-7xl md:text-8xl font-normal max-w-5xl text-white animate-fade-rise"
            style={{
              fontFamily:    DISPLAY,
              lineHeight:    0.95,
              letterSpacing: '-2.46px',
            }}
          >
            Your customers already told you{' '}
            <em className="not-italic" style={{ color: MUTED }}>
              what to write.
            </em>
          </h1>

          {/* Subtext */}
          <p
            className="text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay"
            style={{ color: MUTED }}
          >
            Vox connects your meetings, Slack conversations, and email threads
            — then generates LinkedIn posts, email sequences, and sales copy
            from the exact language your customers use. Not from a brief.
            From your best calls.
          </p>

          {/* CTA */}
          <Link
            href="/signup"
            className="liquid-glass rounded-full px-14 py-5 text-base text-white mt-12 transition-transform hover:scale-[1.03] animate-fade-rise-delay-2 inline-block"
          >
            Get early access
          </Link>

        </section>
      </div>
    </div>
  )
}
