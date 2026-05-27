// Pitch.jsx — Football pitch background.
// Renders fixed-positioned, behind all content (-z-10), so the page chrome
// (navbar, App background) sits on top. Subtle mowed-grass diagonal stripes
// + a soft stadium-light wash and a faint centre line / circle.

export default function Pitch() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Mowed stripes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(78deg, #0a1610 0px, #0a1610 100px, #0d1d15 100px, #0d1d15 200px)',
        }}
      />
      {/* Stadium light wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, rgba(94,234,147,0.06) 0%, transparent 55%), linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.35) 100%)',
        }}
      />
      {/* Faint centre line + circle */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
        style={{ opacity: 0.05 }}
      >
        <line x1="720" y1="0" x2="720" y2="900" stroke="#5eea93" strokeWidth="1.2" />
        <circle cx="720" cy="450" r="120" stroke="#5eea93" strokeWidth="1.2" fill="none" />
        <circle cx="720" cy="450" r="2.5" fill="#5eea93" />
      </svg>
    </div>
  )
}
