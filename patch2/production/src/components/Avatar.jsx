// Avatar.jsx — Initial-circle avatar with a deterministic hue derived from
// the username. Optional ring colour for highlighted roles (leader, last).

function hashHue(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff
  return h % 360
}

export default function Avatar({ name = '', size = 40, ring }) {
  const initials = name.slice(0, 2).toUpperCase()
  const hue = hashHue(name)
  return (
    <div
      className="grid place-items-center flex-shrink-0 text-slate-100 font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
        background: `linear-gradient(140deg, oklch(0.38 0.10 ${hue}) 0%, oklch(0.22 0.06 ${hue + 30}) 100%)`,
        border: ring ? `2px solid ${ring}` : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {initials}
    </div>
  )
}
