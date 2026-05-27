export default function Pitch() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Mowed grass stripes — more visible contrast */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(180deg, #0d2018 0px, #0d2018 60px, #0a1912 60px, #0a1912 120px)',
        }}
      />

      {/* Stadium floodlight wash from top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 60% at 50% -5%, rgba(94,234,147,0.10) 0%, transparent 60%)',
        }}
      />

      {/* Bottom fade to dark */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Pitch lines — centre line + circle + centre dot */}
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1440 900"
        style={{ opacity: 0.12 }}
      >
        {/* Centre vertical line */}
        <line x1="720" y1="0" x2="720" y2="900" stroke="#5eea93" strokeWidth="1.5" />
        {/* Centre circle */}
        <circle cx="720" cy="450" r="150" stroke="#5eea93" strokeWidth="1.5" fill="none" />
        {/* Centre dot */}
        <circle cx="720" cy="450" r="4" fill="#5eea93" />
        {/* Penalty arcs */}
        <path d="M 720 50 L 400 50 L 400 250 L 720 250 Z" stroke="#5eea93" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M 720 50 L 1040 50 L 1040 250 L 720 250 Z" stroke="#5eea93" strokeWidth="1.5" fill="none" opacity="0.5" />
      </svg>
    </div>
  )
}
