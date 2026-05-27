// SidePlayerCard.jsx — Vertical highlight card used on the right rail of
// the Forside (Home) layout. One of three roles:
//
//   kind="leader"  Adam · 1247 totalt · gold accent
//   kind="round"   Markus · +124 i runde 4 · sky-blue accent
//   kind="last"    Even · 947 totalt, −300 fra leder · rose accent
//
// Receives a player from the standings array plus context to compute
// secondary values (round number, leader's overall for the "from leader"
// gap on the last-place card).

import Avatar from './Avatar'
import { TH } from '../lib/theme'

export default function SidePlayerCard({ kind, player, roundNo, leaderOverall }) {
  if (!player) return null

  const cfg = {
    leader: {
      label: 'LEDER',
      color: TH.gold,
      soft: TH.goldSoft,
      icon: '👑',
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
      icon: '🎯',
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
      icon: '🪣',
      bigValue: player.overallPoints ?? '—',
      bigSub: 'POENG · TOTALT',
      bigColor: TH.text,
      sideLabel: 'FRA LEDER',
      sideValue:
        leaderOverall != null && player.overallPoints != null
          ? `−${leaderOverall - player.overallPoints}`
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
        {/* Label pill */}
        <div
          className="self-start inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1"
          style={{ background: cfg.soft, border: `1px solid ${cfg.color}33` }}
        >
          <span style={{ fontSize: 11 }}>{cfg.icon}</span>
          <span
            className="font-mono font-semibold uppercase"
            style={{ fontSize: 9.5, color: cfg.color, letterSpacing: '0.14em' }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Identity */}
        <div className="flex items-center gap-3">
          <Avatar name={player.userName ?? '?'} size={48} ring={cfg.color} />
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
            style={{
              fontSize: 42,
              lineHeight: 0.95,
              color: cfg.bigColor,
              letterSpacing: '-0.04em',
            }}
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
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.12em' }}
          >
            {cfg.sideLabel}
          </span>
          <span
            className="font-semibold tabular-nums"
            style={{ fontSize: 17, color: cfg.sideColor, letterSpacing: '-0.02em' }}
          >
            {cfg.sideValue}
          </span>
        </div>
      </div>
    </div>
  )
}
