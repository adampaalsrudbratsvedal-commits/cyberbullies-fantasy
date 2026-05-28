// Regler.jsx — Cyberbullies Regelside

import { TH } from '../lib/theme'

export default function Regler() {
  return (
    <>
      {/* Hero-bakgrunn */}
      <div
        className="relative w-full"
        style={{ minHeight: '340px' }}
      >
        <img
          src="/reglerBakgrunn.jpg"
          alt="Regler bakgrunn"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ filter: 'brightness(0.45)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0a1610 100%)' }} />
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 py-20 text-center">
          <span
            className="font-mono font-semibold uppercase mb-3"
            style={{ fontSize: 11, color: TH.accent, letterSpacing: '0.22em' }}
          >
            CYBERBULLIES FANTASY · VM 2026
          </span>
          <h1
            className="font-bold"
            style={{ fontSize: 48, letterSpacing: '-0.035em', color: TH.text, lineHeight: 1.1 }}
          >
            Regler
          </h1>
          <p className="mt-3" style={{ fontSize: 15, color: TH.muted, maxWidth: 480 }}>
            Alt du trenger å vite for å delta i ligaen
          </p>
        </div>
      </div>

      {/* Innhold */}
      <div
        className="max-w-3xl mx-auto px-4 py-10"
        style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
      >
        {/* Plassholder-seksjon */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: TH.elev,
            border: `1px solid ${TH.border}`,
          }}
        >
          <div style={{ height: 3, background: TH.accent, borderRadius: '9999px 9999px 0 0', marginBottom: 24, marginLeft: -32, marginRight: -32, marginTop: -32 }} />
          <p
            className="font-mono uppercase"
            style={{ fontSize: 11, color: TH.dim, letterSpacing: '0.18em' }}
          >
            KOMMER SNART
          </p>
          <p className="mt-3" style={{ fontSize: 15, color: TH.muted }}>
            Reglene fylles inn her
          </p>
        </div>
      </div>
    </>
  )
}
