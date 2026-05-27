export default function Pitch() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">

      {/* Horizontal grass stripes — clearly visible alternating bands */}
      <div
        className="absolute inset-0"
        style={{
          background: 'repeating-linear-gradient(180deg, #0d2318 0px, #0d2318 80px, #091810 80px, #091810 160px)',
        }}
      />

      {/* Stadium floodlight glow from top centre */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 140% 50% at 50% 0%, rgba(94,234,147,0.08) 0%, transparent 55%)',
        }}
      />

      {/* Pitch lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
        style={{ opacity: 0.18 }}
      >
        {/* Halfway line */}
        <line x1="720" y1="0" x2="720" y2="900" stroke="#5eea93" strokeWidth="2" />
        {/* Centre circle */}
        <circle cx="720" cy="450" r="160" stroke="#5eea93" strokeWidth="2" fill="none" />
        {/* Centre dot */}
        <circle cx="720" cy="450" r="5" fill="#5eea93" />
        {/* Left penalty box */}
        <rect x="0" y="270" width="200" height="360" stroke="#5eea93" strokeWidth="2" fill="none" />
        {/* Right penalty box */}
        <rect x="1240" y="270" width="200" height="360" stroke="#5eea93" strokeWidth="2" fill="none" />
        {/* Outer boundary */}
        <rect x="20" y="30" width="1400" height="840" stroke="#5eea93" strokeWidth="2" fill="none" />
      </svg>

      {/* Subtle dark vignette at bottom */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.4) 100%)' }}
      />
    </div>
  )
}
