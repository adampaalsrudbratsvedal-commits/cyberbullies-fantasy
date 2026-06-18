// Stats.jsx — Cyberbullies Stats (redesigned).
//
// Two sections, each with a top-3 podium on the left and a line chart on
// the right showing how the probability has evolved over rounds. Same
// stadium-pitch theme as Forside.
//
// Uses the existing API contract from ../api:
//   getSimulation()         → { [name]: { win_probability, last_probability, expected_final } }
//   getProbabilityHistory() → { [round]: { [name]: { win_probability, last_probability } } }

import { useEffect, useState } from 'react'
import { getSimulation, getProbabilityHistory, getScorers, getHistory } from '../api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Pitch from '../components/Pitch'
import Avatar from '../components/Avatar'
import { TH } from '../lib/theme'

// ─────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────

function PodiumRow({ name, prob, exp, color, rank }) {
  return (
    <div
      className="relative grid items-center gap-3 rounded-xl px-3.5 py-3 overflow-hidden"
      style={{
        gridTemplateColumns: '26px 40px 1fr auto',
        background: TH.elev,
        border: `1px solid ${TH.border}`,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 3, background: color }}
      />
      <span
        className="font-mono font-semibold tabular-nums"
        style={{ fontSize: 12, color }}
      >
        {String(rank).padStart(2, '0')}
      </span>
      <Avatar name={name} size={36} ring={rank === 1 ? color : undefined} />
      <div className="min-w-0">
        <div
          className="font-semibold truncate"
          style={{ fontSize: 14, color: TH.text, letterSpacing: '-0.01em' }}
        >
          {name}
        </div>
      </div>
      <div className="text-right">
        <div
          className="font-bold tabular-nums"
          style={{
            fontSize: 22,
            lineHeight: 1,
            color: rank === 1 ? color : TH.text,
            letterSpacing: '-0.025em',
          }}
        >
          {(prob * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  )
}

function ProbRow({ name, prob, exp, color, max }) {
  const pct = max > 0 ? prob / max : 0
  return (
    <div
      className="grid items-center gap-3 px-1 py-2"
      style={{ gridTemplateColumns: '28px 1fr 52px' }}
    >
      <Avatar name={name} size={24} />
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span style={{ fontSize: 12.5, color: TH.text, fontWeight: 500 }}>{name}</span>
        </div>
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: TH.bg }}
        >
          <div
            className="h-full"
            style={{ width: `${pct * 100}%`, background: color }}
          />
        </div>
      </div>
      <span
        className="text-right font-mono font-semibold tabular-nums"
        style={{ fontSize: 12, color }}
      >
        {(prob * 100).toFixed(1)}%
      </span>
    </div>
  )
}

function ChartTooltip({ active, payload, label, colors, players }) {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => b.value - a.value)
  return (
    <div style={{
      background: TH.elev, border: `1px solid ${TH.border}`,
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: TH.muted, fontFamily: 'monospace', fontSize: 10, marginBottom: 6 }}>{label}</div>
      {sorted.map((p) => {
        const idx = players.indexOf(p.dataKey)
        const color = colors[idx] || TH.muted
        return (
          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color, marginBottom: 2 }}>
            <span>{p.dataKey}</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{p.value}%</span>
          </div>
        )
      })}
    </div>
  )
}

function ProbLineChart({ data, players, colors, height = 200 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={TH.border} strokeDasharray="2 3" vertical={false} />
        <XAxis
          dataKey="round"
          stroke={TH.dim}
          tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
          tickLine={false}
          axisLine={{ stroke: TH.border }}
        />
        <YAxis
          stroke={TH.dim}
          tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
          unit="%"
          domain={[0, 'dataMax + 5']}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip colors={colors} players={players} />} cursor={{ stroke: TH.border }} />
        {players.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={colors[i] || TH.muted}
            strokeWidth={2}
            dot={{ r: 3, fill: colors[i] || TH.muted, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

function Section({
  title,
  subtitle,
  color,
  entries,        // [{ name, value, exp }] sorted desc
  valueKey,       // 'win_probability' | 'last_probability'
  probHistory,
  scenarioCount,
  mode,           // 'win' | 'last'
}) {
  const [top4Only, setTop4Only] = useState(false)

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const max = entries[0]?.value ?? 0
  const PALETTE =
    mode === 'win'
      ? ['#5eea93','#fbbf24','#7dd3fc','#f97316','#a78bfa','#fb7185','#34d399','#e879f9','#facc15','#38bdf8','#f43f5e','#22d3ee']
      : ['#fb7185','#fda4af','#fbbf24','#f97316','#a78bfa','#5eea93','#34d399','#e879f9','#facc15','#38bdf8','#7dd3fc','#22d3ee']

  const allNames = entries.map((e) => e.name)
  const colors = allNames.map((_, i) => PALETTE[i % PALETTE.length])

  // Top 4 sorted by the relevant probability in the latest snapshot round
  const rounds = probHistory
    ? Object.keys(probHistory).map(Number).sort((a, b) => a - b)
    : []
  const lastRound = rounds.length ? rounds[rounds.length - 1] : null

  const top4Names = lastRound != null
    ? [...allNames]
        .sort((a, b) => {
          const va = probHistory?.[lastRound]?.[a]?.[valueKey] ?? 0
          const vb = probHistory?.[lastRound]?.[b]?.[valueKey] ?? 0
          return vb - va
        })
        .slice(0, 4)
    : allNames.slice(0, 4)

  const visibleNames = top4Only ? top4Names : allNames

  const chartData = rounds.map((r) => {
    const point = { round: `R${r}` }
    allNames.forEach((n) => {
      const v = probHistory?.[r]?.[n]?.[valueKey]
      point[n] = v != null ? parseFloat((v * 100).toFixed(1)) : null
    })
    return point
  })

  return (
    <section
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
    >
      <div style={{ height: 3, background: color }} />
      <div className="flex items-end justify-between px-5 pt-4">
        <div>
          <div
            className="font-mono font-semibold uppercase mb-1.5"
            style={{ fontSize: 10, color, letterSpacing: '0.16em' }}
          >
            SIMULERING · {scenarioCount}
          </div>
          <h2
            className="font-bold"
            style={{ fontSize: 22, color: TH.text, letterSpacing: '-0.025em' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1" style={{ fontSize: 12, color: TH.muted }}>
              {subtitle}
            </p>
          )}
        </div>
        <span
          className="font-mono uppercase"
          style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.12em' }}
        >
          {lastRound != null ? `R1 → R${lastRound}` : ''}
        </span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[320px_1fr]">
        {/* Top 3 podium + rest */}
        <div className="flex flex-col gap-2">
          {top3.map((e, i) => (
            <PodiumRow
              key={e.name}
              name={e.name}
              prob={e.value}
              exp={e.exp}
              color={colors[i]}
              rank={i + 1}
            />
          ))}
          {rest.length > 0 && (
            <div
              className="mt-1.5 pt-2 px-1"
              style={{ borderTop: `1px solid ${TH.border}` }}
            >
              <div
                className="font-mono uppercase mb-1 px-1"
                style={{ fontSize: 9.5, color: TH.dim, letterSpacing: '0.14em' }}
              >
                ØVRIGE
              </div>
              {rest.map((e) => (
                <ProbRow
                  key={e.name}
                  name={e.name}
                  prob={e.value}
                  exp={e.exp}
                  color={TH.muted}
                  max={max}
                />
              ))}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="flex flex-col gap-2.5 min-w-0">
          <div className="flex items-center justify-between">
            <div
              className="font-mono font-semibold uppercase"
              style={{ fontSize: 10.5, color: TH.muted, letterSpacing: '0.16em' }}
            >
              UTVIKLING
            </div>
            {/* Top 4 toggle */}
            <button
              onClick={() => setTop4Only((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: top4Only ? color + '22' : TH.bg,
                border: `1px solid ${top4Only ? color : TH.border}`,
                borderRadius: 99,
                padding: '3px 10px',
                cursor: 'pointer',
                fontSize: 10,
                fontFamily: 'monospace',
                color: top4Only ? color : TH.dim,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              <span
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: top4Only ? color : TH.border,
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              />
              TOPP 4
            </button>
          </div>
          <div
            className="rounded-xl p-2.5"
            style={{ background: TH.bg, border: `1px solid ${TH.border}` }}
          >
            {chartData.length > 0 ? (
              <ProbLineChart data={chartData} players={visibleNames} colors={visibleNames.map((n) => colors[allNames.indexOf(n)])} height={220} />
            ) : (
              <div
                className="text-center py-12"
                style={{ color: TH.dim, fontSize: 13 }}
              >
                Ingen historikk ennå
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 px-1">
            {visibleNames.map((n) => {
              const i = allNames.indexOf(n)
              const lastPct = chartData[chartData.length - 1]?.[n]
              return (
                <span
                  key={n}
                  className="inline-flex items-center gap-1.5"
                  style={{ fontSize: 11.5, color: TH.muted }}
                >
                  <span
                    style={{ width: 14, height: 2, background: colors[i], borderRadius: 1 }}
                  />
                  <span>{n}</span>
                  {lastPct != null && (
                    <span
                      className="font-mono tabular-nums"
                      style={{ fontSize: 10, color: colors[i], letterSpacing: '0.04em' }}
                    >
                      {lastPct}%
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────
// Toppscorere
// ─────────────────────────────────────────────────────────────

const FLAGS_SCORERS = {
  'Mexico': 'mx', 'South Africa': 'za', 'Korea Republic': 'kr', 'South Korea': 'kr',
  'Czechia': 'cz', 'Canada': 'ca', 'Bosnia-Herzegovina': 'ba', 'United States': 'us', 'USA': 'us',
  'Paraguay': 'py', 'Qatar': 'qa', 'Switzerland': 'ch', 'Brazil': 'br',
  'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct', 'Australia': 'au',
  'Turkey': 'tr', 'Türkiye': 'tr', 'Germany': 'de', 'Curaçao': 'cw',
  'Netherlands': 'nl', 'Japan': 'jp', "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci',
  'Ecuador': 'ec', 'Sweden': 'se', 'Tunisia': 'tn', 'Belgium': 'be',
  'Egypt': 'eg', 'Iran': 'ir', 'IR Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cape Verde Islands': 'cv', 'Cabo Verde': 'cv', 'Cape Verde': 'cv',
  'Saudi Arabia': 'sa', 'Uruguay': 'uy', 'France': 'fr', 'Senegal': 'sn',
  'Iraq': 'iq', 'Norway': 'no', 'Argentina': 'ar', 'Algeria': 'dz',
  'Austria': 'at', 'Jordan': 'jo', 'Portugal': 'pt', 'Congo DR': 'cd', 'DR Congo': 'cd',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
  'Uzbekistan': 'uz', 'Colombia': 'co',
}

function ScorerRow({ rank, name, teamName, value, isTop }) {
  const flagCode = FLAGS_SCORERS[teamName]
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderTop: rank > 1 ? `1px solid ${TH.border}` : 'none' }}
    >
      <span
        className="font-mono font-semibold flex-shrink-0 w-5 text-right"
        style={{ fontSize: 11, color: isTop ? TH.gold : TH.dim }}
      >
        {String(rank).padStart(2, '0')}
      </span>
      {flagCode ? (
        <img
          src={`https://flagcdn.com/w20/${flagCode}.png`}
          alt={teamName}
          style={{ width: 18, height: 12, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 18, height: 12, borderRadius: 2, background: TH.bg, flexShrink: 0, opacity: 0.3 }} />
      )}
      <span style={{ fontSize: 13.5, color: TH.text, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
      <span
        className="font-mono font-bold tabular-nums flex-shrink-0"
        style={{ fontSize: 16, color: isTop ? TH.accent : TH.muted, letterSpacing: '-0.02em' }}
      >
        {value}
      </span>
    </div>
  )
}

function TopScorersSection({ scorers, loading, error }) {
  const rawList = scorers ?? []

  const topGoals = [...rawList]
    .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0) || (a.player?.name ?? '').localeCompare(b.player?.name ?? ''))
    .slice(0, 5)

  const topAssists = [...rawList]
    .filter((s) => (s.assists ?? 0) > 0)
    .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0) || (a.player?.name ?? '').localeCompare(b.player?.name ?? ''))
    .slice(0, 5)
  const hasAssists = topAssists.length > 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
    >
      <div style={{ height: 3, background: TH.gold }} />
      <div className="px-5 pt-4 pb-2">
        <h2 className="font-bold" style={{ fontSize: 22, color: TH.text, letterSpacing: '-0.025em' }}>
          Toppscorere
        </h2>
        <p className="mt-1 mb-4" style={{ fontSize: 12, color: TH.muted }}>
          VM 2026 · Topp 5 mål{hasAssists ? ' og assist' : ''}
        </p>

        {loading ? (
          <div className="text-center py-8" style={{ color: TH.dim }}>Henter data…</div>
        ) : error ? (
          <div className="text-center py-8" style={{ color: TH.warn, fontSize: 13 }}>Kunne ikke hente toppscorere</div>
        ) : (
          <div className={`grid gap-6 pb-2 ${hasAssists ? 'sm:grid-cols-2' : ''}`}>
            {/* Mål */}
            <div>
              <div
                className="font-mono font-semibold uppercase mb-2"
                style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.14em' }}
              >
                MÅL
              </div>
              {topGoals.length === 0 ? (
                <p style={{ fontSize: 12, color: TH.dim, padding: '12px 0' }}>Ingen mål scoret ennå</p>
              ) : (
                topGoals.map((s, i) => (
                  <ScorerRow
                    key={s.player?.id ?? i}
                    rank={i + 1}
                    name={s.player?.name ?? '—'}
                    teamName={s.team?.name}
                    value={s.goals ?? 0}
                    isTop={i === 0}
                  />
                ))
              )}
            </div>
            {/* Assist — kun vist om data finnes */}
            {hasAssists && (
              <div>
                <div
                  className="font-mono font-semibold uppercase mb-2"
                  style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.14em' }}
                >
                  ASSIST
                </div>
                {topAssists.map((s, i) => (
                  <ScorerRow
                    key={s.player?.id ?? i}
                    rank={i + 1}
                    name={s.player?.name ?? '—'}
                    teamName={s.team?.name}
                    value={s.assists ?? 0}
                    isTop={i === 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Runderekorder
// ─────────────────────────────────────────────────────────────

function RecordRow({ rank, username, round, points, isHigh }) {
  const isFirst = rank === 1
  const numColor = isFirst ? (isHigh ? TH.gold : TH.warn) : TH.dim
  const ptColor  = isFirst ? (isHigh ? TH.accent : TH.warn) : TH.muted
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderTop: rank > 1 ? `1px solid ${TH.border}` : 'none' }}
    >
      <span
        className="font-mono font-semibold flex-shrink-0"
        style={{ fontSize: 11, color: numColor, width: 20, textAlign: 'right' }}
      >
        {String(rank).padStart(2, '0')}
      </span>
      <span
        style={{ fontSize: 13.5, color: TH.text, fontWeight: 500, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {username}
      </span>
      <span
        className="font-mono flex-shrink-0"
        style={{ fontSize: 10.5, color: TH.dim, letterSpacing: '0.06em' }}
      >
        R{round}
      </span>
      <span
        className="font-mono font-bold tabular-nums flex-shrink-0"
        style={{ fontSize: 20, color: ptColor, letterSpacing: '-0.025em', minWidth: 44, textAlign: 'right' }}
      >
        {points}
      </span>
    </div>
  )
}

function RoundRecordsSection({ history, loading }) {
  const allScores = []
  if (history) {
    Object.entries(history).forEach(([round, scores]) => {
      scores.forEach((s) => {
        if (s.round_points != null) {
          allScores.push({ username: s.username, round: Number(round), points: s.round_points })
        }
      })
    })
  }

  const top5 = [...allScores].sort((a, b) => b.points - a.points).slice(0, 5)
  const low5 = [...allScores].sort((a, b) => a.points - b.points).slice(0, 5)
  const noData = allScores.length === 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
    >
      <div style={{ height: 3, background: `linear-gradient(90deg, ${TH.accent} 0%, ${TH.warn} 100%)` }} />
      <div className="px-5 pt-4 pb-2">
        <h2 className="font-bold" style={{ fontSize: 22, color: TH.text, letterSpacing: '-0.025em' }}>
          Runderekorder
        </h2>
        <p className="mt-1 mb-4" style={{ fontSize: 12, color: TH.muted }}>
          Beste og svakeste enkeltrunder i ligaen
        </p>

        {loading ? (
          <div className="text-center py-8" style={{ color: TH.dim }}>Laster…</div>
        ) : noData ? (
          <p style={{ fontSize: 12, color: TH.dim, padding: '12px 0' }}>
            Ingen rundedata ennå — vises etter første runde
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 pb-2">
            <div>
              <div
                className="font-mono font-semibold uppercase mb-2"
                style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.14em' }}
              >
                TOPP 5 RUNDER
              </div>
              {top5.map((s, i) => (
                <RecordRow key={i} rank={i + 1} username={s.username} round={s.round} points={s.points} isHigh />
              ))}
            </div>
            <div>
              <div
                className="font-mono font-semibold uppercase mb-2"
                style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.14em' }}
              >
                BUNN 5 RUNDER
              </div>
              {low5.map((s, i) => (
                <RecordRow key={i} rank={i + 1} username={s.username} round={s.round} points={s.points} isHigh={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function Stats() {
  const [sim, setSim] = useState(null)
  const [simError, setSimError] = useState(false)
  const [simLoading, setSimLoading] = useState(true)
  const [probHistory, setProbHistory] = useState(null)
  const [scorers, setScorers] = useState(null)
  const [scorersLoading, setScorersLoading] = useState(true)
  const [scorersError, setScorersError] = useState(false)
  const [history, setHistory] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(true)

  useEffect(() => {
    setSimLoading(true)
    getSimulation()
      .then((r) => {
        if (r.data?._error) { setSimError(true); return }
        setSim(r.data)
      })
      .catch(() => setSimError(true))
      .finally(() => setSimLoading(false))
    getProbabilityHistory()
      .then((r) => setProbHistory(r.data))
      .catch(() => {})
    getScorers()
      .then((r) => setScorers(r.data?.scorers ?? []))
      .catch(() => setScorersError(true))
      .finally(() => setScorersLoading(false))
    getHistory()
      .then((r) => setHistory(r.data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [])

  const winEntries = sim
    ? Object.entries(sim)
        .map(([name, d]) => ({ name, value: d.win_probability, exp: d.expected_final }))
        .sort((a, b) => b.value - a.value)
    : []
  const lastEntries = sim
    ? Object.entries(sim)
        .map(([name, d]) => ({ name, value: d.last_probability, exp: d.expected_final }))
        .sort((a, b) => b.value - a.value)
    : []

  const rounds = probHistory ? Object.keys(probHistory).length : 0
  const scenarioCount = '500K SIMULERINGER'

  return (
    <>
      <Pitch />

      <div
        className="max-w-7xl mx-auto px-4 py-8"
        style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
      >
        {/* Page header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1
              className="font-bold"
              style={{ fontSize: 36, letterSpacing: '-0.03em', color: TH.text }}
            >
              Stats
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: TH.muted }}>
              Monte Carlo-simulering av sluttstillingen
              {rounds > 0 && ` · Runde ${rounds}`}
            </p>
          </div>
        </div>

        {simLoading ? (
          <div className="text-center py-16" style={{ color: TH.dim }}>
            Beregner simuleringer…
          </div>
        ) : simError ? (
          <div className="text-center py-16" style={{ color: TH.muted, fontSize: 13 }}>
            Poeng oppdateres — prøv igjen om litt.
          </div>
        ) : winEntries.length === 0 ? (
          <div className="text-center py-16" style={{ color: TH.dim }}>
            Ingen simulering tilgjengelig ennå
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <Section
              title="Sannsynlighet for seier"
              subtitle="Who knows ball"
              color={TH.accent}
              entries={winEntries}
              valueKey="win_probability"
              probHistory={probHistory}
              scenarioCount={scenarioCount}
              mode="win"
            />
            <Section
              title="Sannsynlighet for sisteplass"
              subtitle="Hvem stryker med bunnplassen?"
              color={TH.warn}
              entries={lastEntries}
              valueKey="last_probability"
              probHistory={probHistory}
              scenarioCount={scenarioCount}
              mode="last"
            />
          </div>
        )}
      </div>

      {/* Runderekorder */}
      <div className="max-w-2xl mx-auto mt-5 px-4">
        <RoundRecordsSection history={history} loading={historyLoading} />
      </div>

      {/* Toppscorere */}
      <div className="max-w-2xl mx-auto mt-5">
        <TopScorersSection
          scorers={scorers}
          loading={scorersLoading}
          error={scorersError}
        />
      </div>

      {/* Størst tiss */}
      <div className="max-w-sm mx-auto mt-8">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
        >
          <div style={{ height: 3, background: TH.accent }} />
          <div className="px-5 py-4">
            <h2
              className="font-bold mb-0.5"
              style={{ fontSize: 18, color: TH.text, letterSpacing: '-0.01em' }}
            >
              Størst tiss
            </h2>
            <p
              className="font-mono uppercase mb-4"
              style={{ fontSize: 9.5, color: TH.dim, letterSpacing: '0.12em' }}
            >
              Tall hentet fra Helsenorge
            </p>
            {[
              { name: 'Apb03', cm: '21,3 cm' },
              { name: 'Aibo FC', cm: '20,4 cm' },
              { name: 'RithiP', cm: '19,1 cm' },
              { name: 'Odin67', cm: '18,2 cm' },
              { name: 'torres0512', cm: '17,3 cm' },
              { name: 'oskarop', cm: '16,7 cm' },
              { name: 'xFELIXx', cm: '16,0 cm' },
              { name: 'KalkunBlaster', cm: '15,0 cm' },
              { name: 'T-bag637273', cm: '14,2 cm' },
              { name: 'Jaeger FC', cm: '13,8 cm' },
              { name: 'LeonC', cm: '12,3 cm' },
              { name: 'hansssb', cm: '11,4 cm' },
              { name: 'sa1ut', cm: '9,6 cm' },
              { name: 'Børge Haugset', cm: '6,2 cm' },
            ].map((p, i) => (
              <div
                key={p.name}
                className="flex items-center justify-between py-2.5"
                style={{ borderTop: i > 0 ? `1px solid ${TH.border}` : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono font-semibold w-6 text-right"
                    style={{ fontSize: 12, color: i === 0 ? TH.gold : TH.dim }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 14, color: TH.text, fontWeight: 500 }}>{p.name}</span>
                </div>
                <span
                  className="font-mono font-bold"
                  style={{ fontSize: 14, color: i === 0 ? TH.accent : TH.muted }}
                >
                  {p.cm}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
