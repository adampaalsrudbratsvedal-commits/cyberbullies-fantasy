import { useEffect, useState } from 'react'
import { getHistory } from '../api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import Pitch from '../components/Pitch'
import Avatar from '../components/Avatar'
import { TH } from '../lib/theme'

const COLORS = [
  '#10b981','#f59e0b','#3b82f6','#f43f5e','#a78bfa',
  '#34d399','#fbbf24','#60a5fa','#fb7185','#c4b5fd',
  '#6ee7b7','#fde68a','#93c5fd',
]

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div style={{
      background: TH.elev, border: `1px solid ${TH.border}`,
      borderRadius: 10, padding: '10px 14px', minWidth: 160,
    }}>
      <div style={{ fontSize: 10.5, color: TH.muted, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label === 'R0' ? 'START' : label}
      </div>
      {sorted.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, color: p.color, marginBottom: 2 }}>
          <span>{p.dataKey}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
            {p.value > 0 ? `+${p.value}` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function History() {
  const [history, setHistory] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getHistory()
      .then((r) => setHistory(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const rounds = Object.keys(history).map(Number).sort((a, b) => a - b)

  const allPlayers = rounds.length
    ? [...new Set(rounds.flatMap((r) => history[r].map((e) => e.username)))]
    : []

  // Sort by last round's points-above-last descending
  const lastRound = rounds[rounds.length - 1]
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    const roundData = history[lastRound] ?? []
    const minPts = Math.min(...roundData.map((e) => e.overall_points ?? 0))
    const aVal = (roundData.find((e) => e.username === a)?.overall_points ?? 0) - minPts
    const bVal = (roundData.find((e) => e.username === b)?.overall_points ?? 0) - minPts
    return bVal - aVal
  })

  // Build chart data: R0 (everyone at 0) + one entry per round
  const chartData = [
    // R0 — everyone starts equal at 0
    Object.fromEntries([['round', 'R0'], ...sortedPlayers.map((p) => [p, 0])]),
    // Real rounds
    ...rounds.map((r) => {
      const roundData = history[r] ?? []
      const minPts = Math.min(...roundData.map((e) => e.overall_points ?? 0))
      const entry = { round: `R${r}` }
      for (const p of sortedPlayers) {
        const found = roundData.find((e) => e.username === p)
        entry[p] = found ? (found.overall_points ?? 0) - minPts : null
      }
      return entry
    }),
  ]

  // Leader for last round
  const leader = sortedPlayers[0]
  const lastEntry = chartData[chartData.length - 1]

  return (
    <>
      <Pitch />
      <div
        className="max-w-6xl mx-auto px-4 py-8"
        style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
      >
        <h1 className="font-bold mb-6" style={{ fontSize: 36, letterSpacing: '-0.03em' }}>
          Ligahistorie
        </h1>

        {loading ? (
          <div style={{ color: TH.dim }}>Laster historikk…</div>
        ) : error ? (
          <div style={{ color: TH.warn }}>Kunne ikke hente historikk.</div>
        ) : rounds.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
          >
            <p style={{ color: TH.dim, fontSize: 14 }}>Ingen historikk ennå — synker etter første runde.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Chart */}
            <div
              className="rounded-2xl p-5"
              style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
            >
              <div
                className="font-mono font-semibold uppercase mb-4"
                style={{ fontSize: 10.5, color: TH.muted, letterSpacing: '0.16em' }}
              >
                UTVIKLING — POENG OVER SISTEPLASS
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={TH.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="round"
                    tick={{ fill: TH.dim, fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: TH.dim, fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `+${v}`}
                    width={36}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke={TH.border} strokeWidth={1} />
                  {sortedPlayers.map((p, i) => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 px-1">
                {sortedPlayers.map((p, i) => {
                  const val = lastEntry?.[p]
                  return (
                    <span key={p} className="inline-flex items-center gap-1.5" style={{ fontSize: 11.5, color: TH.muted }}>
                      <span style={{ width: 14, height: 2, background: COLORS[i % COLORS.length], borderRadius: 1, flexShrink: 0 }} />
                      <span>{p}</span>
                      {val != null && (
                        <span style={{ fontFamily: 'monospace', fontSize: 10, color: COLORS[i % COLORS.length], fontWeight: 700 }}>
                          {val > 0 ? `+${val}` : val}
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${TH.border}` }}>
                      <th className="text-left px-5 py-3" style={{ fontSize: 10, color: TH.dim, fontFamily: 'monospace', letterSpacing: '0.12em' }}>#</th>
                      <th className="text-left px-4 py-3" style={{ fontSize: 10, color: TH.dim, fontFamily: 'monospace', letterSpacing: '0.12em' }}>SPILLER</th>
                      <th className="text-right px-4 py-3" style={{ fontSize: 10, color: TH.dim, fontFamily: 'monospace', letterSpacing: '0.12em' }}>R0</th>
                      {rounds.map((r) => (
                        <th key={r} className="text-right px-4 py-3" style={{ fontSize: 10, color: TH.dim, fontFamily: 'monospace', letterSpacing: '0.12em' }}>R{r}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.map((player, idx) => (
                      <tr key={player} style={{ borderTop: `1px solid ${TH.border}40` }}>
                        <td className="px-5 py-3" style={{ fontSize: 11, color: TH.dim, fontFamily: 'monospace' }}>{String(idx + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={player} size={24} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: TH.text }}>{player}</span>
                          </div>
                        </td>
                        {/* R0 — always 0 */}
                        <td className="px-4 py-3 text-right" style={{ fontSize: 12, fontFamily: 'monospace', color: TH.dim }}>0</td>
                        {rounds.map((r) => {
                          const roundData = history[r] ?? []
                          const minPts = Math.min(...roundData.map((e) => e.overall_points ?? 0))
                          const found = roundData.find((e) => e.username === player)
                          const diff = found ? (found.overall_points ?? 0) - minPts : null
                          return (
                            <td key={r} className="px-4 py-3 text-right tabular-nums" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                              {diff === null ? (
                                <span style={{ color: TH.dim }}>—</span>
                              ) : diff === 0 ? (
                                <span style={{ color: TH.warn, fontWeight: 700 }}>0</span>
                              ) : (
                                <span style={{ color: '#10b981', fontWeight: 600 }}>+{diff}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
