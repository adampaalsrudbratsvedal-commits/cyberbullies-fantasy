import { TH } from '../lib/theme'

export default function SidePlayerCard({ kind, player, roundNo, leaderOverall, safeOverall }) {
  if (!player) return null

  const cfg = {
    leader: {
      label: 'LEDER',
      color: TH.gold,
      soft: TH.goldSoft,
      image: '/trophy.png',
      bigValue: player.overallPoints ?? '—',
      bigSub: 'POENG · TOTALT',
      bigColor: TH.accent,
      sideLabel: `RUNDE ${roundNo ?? ''}`.trim(),
      sideValue: player.roundPoints != null ? `+${player.roundPoints}` : '—',
      sideColor: TH.text,
      wash: 'linear-gradient(180deg, rgba(251,191,36,0.07) 0%, transparent 55%)',
    },
    round: {
      label: `RUNDEMESTER · R${roundNo ?? ''}`.trim(),
      color: TH.info,
      soft: TH.infoSoft,
      image: '/rundevinner.png',
      bigValue: player.roundPoints != null ? `+${player.roundPoints}` : '—',
      bigSub: `POENG · RUNDE ${roundNo ?? ''}`.trim(),
      bigColor: TH.info,
      sideLabel: 'TOTALT',
      sideValue: player.overallPoints ?? '—',
      sideColor: TH.text,
      wash: 'linear-gradient(180deg, rgba(125,211,252,0.06) 0%, transparent 55%)',
    },
    last: {
      label: 'SISTEPLASS',
      color: TH.warn,
      soft: TH.warnSoft,
      image: '/sisteplass.jpg',
      bigValue: player.overallPoints ?? '—',
      bigSub: 'POENG · TOTALT',
      bigColor: TH.text,
      sideLabel: 'TIL TRYGGHET',
      sideValue:
        safeOverall != null && player.overallPoints != null
          ? `−${safeOverall - player.overallPoints}`
          : '—',
      sideColor: TH.warn,
      wash: 'linear-gradient(180deg, rgba(251,113,133,0.06) 0%, transparent 55%)',
    },
  }[kind]

  return (
    <div
      className="relative overflow-hidden rounded-2xl flex flex-col flex-1 min-h-0"
      style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
    >
      {/* Top rail */}
      <div style={{ height: 3, background: cfg.color }} />

      <div
        className="flex flex-col gap-3.5 flex-1 p-4 px-[18px]"
        style={{ background: cfg.wash }}
      >
        {/* Label */}
        <span
          className="font-mono font-semibold uppercase"
          style={{ fontSize: 9.5, color: cfg.color, letterSpacing: '0.14em' }}
        >
          {cfg.label}
        </span>

        {/* Identity + image */}
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex-shrink-0 overflow-hidden"
            style={{ border: `2px solid ${cfg.color}66`, background: TH.card }}
          >
            <img src={cfg.image} alt={cfg.label} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <div
              className="font-bold leading-tight truncate"
              style={{ fontSize: 18, color: TH.text, letterSpacing: '-0.02em' }}
            >
              {player.userName ?? '—'}
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Primary stat */}
        <div>
          <div
            className="font-bold tabular-nums"
            style={{ fontSize: 42, lineHeight: 0.95, color: cfg.bigColor, letterSpacing: '-0.04em' }}
          >
            {cfg.bigValue}
          </div>
          <div
            className="font-mono mt-1.5 uppercase"
            style={{ fontSize: 9.5, color: TH.dim, letterSpacing: '0.14em' }}
          >
            {cfg.bigSub}
          </div>
        </div>

        {/* Secondary stat */}
        <div className="h-px mt-0.5" style={{ background: TH.border }} />
        <div className="flex items-baseline justify-between">
          <span className="font-mono uppercase" style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.12em' }}>
            {cfg.sideLabel}
          </span>
          <span className="font-semibold tabular-nums" style={{ fontSize: 17, color: cfg.sideColor, letterSpacing: '-0.02em' }}>
            {cfg.sideValue}
          </span>
        </div>
      </div>
    </div>
  )
}
