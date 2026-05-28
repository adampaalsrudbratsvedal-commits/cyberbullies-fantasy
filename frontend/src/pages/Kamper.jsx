// Kamper.jsx — VM 2026 kampoppsett og resultater
// Auto-refresher hvert 60. sekund

import { useEffect, useState, useCallback } from 'react'
import { getFixtures } from '../api'
import Pitch from '../components/Pitch'
import { TH } from '../lib/theme'

// ── Flagg-mapping ─────────────────────────────────────────────

const FLAGS = {
  'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Korea Republic': 'kr',
  'Czechia': 'cz', 'Canada': 'ca', 'Bosnia-Herzegovina': 'ba', 'United States': 'us',
  'Paraguay': 'py', 'Qatar': 'qa', 'Switzerland': 'ch', 'Brazil': 'br',
  'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct', 'Australia': 'au',
  'Turkey': 'tr', 'Türkiye': 'tr', 'Germany': 'de', 'Curaçao': 'cw',
  'Netherlands': 'nl', 'Japan': 'jp', "Côte d'Ivoire": 'ci', 'Ivory Coast': 'ci',
  'Ecuador': 'ec', 'Sweden': 'se', 'Tunisia': 'tn', 'Belgium': 'be',
  'Egypt': 'eg', 'Iran': 'ir', 'IR Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cape Verde Islands': 'cv', 'Cabo Verde': 'cv',
  'Saudi Arabia': 'sa', 'Uruguay': 'uy', 'France': 'fr', 'Senegal': 'sn',
  'Iraq': 'iq', 'Norway': 'no', 'Argentina': 'ar', 'Algeria': 'dz',
  'Austria': 'at', 'Jordan': 'jo', 'Portugal': 'pt', 'Congo DR': 'cd',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
  'Uzbekistan': 'uz', 'Colombia': 'co',
}

function Flag({ name }) {
  const code = FLAGS[name]
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/w20/${code}.png`}
      alt={name}
      style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
    />
  )
}

// ── Hjelpefunksjoner ──────────────────────────────────────────

function isLive(status) {
  if (!status) return false
  const s = status.toUpperCase()
  return s.includes('LIVE') || s.includes('IN_PLAY') || s.includes('INPROGRESS') || s.includes('HALFTIME')
}

function isFinished(status) {
  if (!status) return false
  const s = status.toUpperCase()
  return s.includes('FINISH') || s.includes('COMPLETED') || s.includes('FULL') || s === 'FT'
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('no-NO', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function groupByRound(fixtures) {
  const map = {}
  for (const f of fixtures) {
    const key = f.roundId ?? '?'
    if (!map[key]) map[key] = { matches: [], stage: f.stage, stageLabel: f.stageLabel }
    map[key].matches.push(f)
  }
  return map
}

// ── Kampkort ──────────────────────────────────────────────────

function MatchCard({ match }) {
  const live = isLive(match.status)
  const finished = isFinished(match.status)

  const homeTeam = match.homeSquadName || '—'
  const awayTeam = match.awaySquadName || '—'
  const homeScore = match.homeScore
  const awayScore = match.awayScore
  const hasScore = homeScore !== null && awayScore !== null && homeScore !== undefined && awayScore !== undefined
  const hasPenalty = match.homePenaltyScore !== null && match.homePenaltyScore !== undefined

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: live
          ? `linear-gradient(135deg, ${TH.accent}0a 0%, ${TH.elev} 60%)`
          : TH.elev,
        border: `1px solid ${live ? TH.accent + '44' : TH.border}`,
      }}
    >
      {live && <div style={{ height: 2, background: TH.accent }} />}

      <div className="p-3.5">
        {/* Topprad: status + venue */}
        <div className="flex items-center justify-between mb-3">
          {live ? (
            <span
              className="font-mono font-bold uppercase rounded px-2 py-0.5 flex items-center gap-1.5"
              style={{ fontSize: 9.5, background: TH.accent + '20', color: TH.accent, letterSpacing: '0.14em' }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: TH.accent, display: 'inline-block' }} />
              LIVE
            </span>
          ) : finished ? (
            <span className="font-mono uppercase" style={{ fontSize: 9.5, color: TH.muted, letterSpacing: '0.12em' }}>FERDIG</span>
          ) : (
            <span className="font-mono uppercase" style={{ fontSize: 9.5, color: TH.dim, letterSpacing: '0.12em' }}>
              {formatDate(match.date)}
            </span>
          )}
          {match.venueName && (
            <span
              className="font-mono truncate ml-2"
              style={{ fontSize: 9, color: TH.dim, maxWidth: 140, letterSpacing: '0.04em' }}
              title={match.venueName}
            >
              {match.venueName.replace(' Stadium', '')}
            </span>
          )}
        </div>

        {/* Lag + resultat */}
        <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          {/* Hjemmelag */}
          <div className="flex items-center justify-end gap-1.5 min-w-0">
            <span
              className="font-semibold truncate"
              style={{ fontSize: 14, color: TH.text, letterSpacing: '-0.01em' }}
            >
              {homeTeam}
            </span>
            <Flag name={homeTeam} />
          </div>

          {/* Score / VS */}
          <div
            className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg"
            style={{ background: TH.card, minWidth: 64 }}
          >
            {hasScore ? (
              <>
                <div className="flex items-center gap-1">
                  <span
                    className="font-bold tabular-nums"
                    style={{ fontSize: 22, color: live ? TH.accent : TH.text, letterSpacing: '-0.04em', lineHeight: 1 }}
                  >
                    {homeScore}
                  </span>
                  <span style={{ fontSize: 13, color: TH.dim }}>–</span>
                  <span
                    className="font-bold tabular-nums"
                    style={{ fontSize: 22, color: live ? TH.accent : TH.text, letterSpacing: '-0.04em', lineHeight: 1 }}
                  >
                    {awayScore}
                  </span>
                </div>
                {hasPenalty && (
                  <span style={{ fontSize: 9, color: TH.dim, marginTop: 1 }}>
                    ({match.homePenaltyScore} – {match.awayPenaltyScore}) s.s.
                  </span>
                )}
              </>
            ) : (
              <span
                className="font-mono font-semibold"
                style={{ fontSize: 12, color: TH.dim, letterSpacing: '0.06em' }}
              >
                VS
              </span>
            )}
          </div>

          {/* Bortelag */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Flag name={awayTeam} />
            <span
              className="font-semibold truncate"
              style={{ fontSize: 14, color: TH.text, letterSpacing: '-0.01em' }}
            >
              {awayTeam}
            </span>
          </div>
        </div>

        {/* Dato under score (bare når live eller ferdig) */}
        {(live || finished) && (
          <div className="mt-2 text-center">
            <span style={{ fontSize: 9.5, color: TH.dim }}>{formatDate(match.date)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Runde-seksjon ─────────────────────────────────────────────

const STAGE_COLORS = {
  GROUP: TH.accent,
  R32: TH.info,
  R16: TH.info,
  QF: TH.gold,
  SF: TH.gold,
  F: '#f43f5e',
}

function RoundSection({ roundId, stage, stageLabel, matches }) {
  const liveCount = matches.filter((m) => isLive(m.status)).length
  const color = STAGE_COLORS[stage] || TH.accent

  // Sort by date
  const sorted = [...matches].sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: color, minHeight: 20 }}
        />
        <div>
          <h2 className="font-bold" style={{ fontSize: 17, color: TH.text, letterSpacing: '-0.01em' }}>
            {stageLabel}
          </h2>
          <span className="font-mono uppercase" style={{ fontSize: 9.5, color: TH.dim, letterSpacing: '0.12em' }}>
            RUNDE {roundId} · {sorted.length} KAMPER
          </span>
        </div>
        {liveCount > 0 && (
          <span
            className="font-mono uppercase rounded-full px-2.5 py-0.5 ml-1"
            style={{ fontSize: 9.5, background: TH.accent + '20', color: TH.accent, letterSpacing: '0.14em' }}
          >
            {liveCount} LIVE
          </span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </section>
  )
}

// ── Hovedside ─────────────────────────────────────────────────

export default function Kamper() {
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(() => {
    getFixtures()
      .then((r) => {
        setFixtures(r.data?.fixtures ?? [])
        setError(r.data?.error || false)
        setLastUpdated(new Date())
      })
      .catch(() => setError('Nettverksfeil'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const grouped = groupByRound(fixtures.filter(m => m.homeSquadName && m.awaySquadName))
  const roundIds = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))
  const liveTotal = fixtures.filter((m) => isLive(m.status)).length
  const totalMatches = fixtures.length

  return (
    <>
      <Pitch />

      <div
        className="max-w-7xl mx-auto px-4 py-8"
        style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-bold" style={{ fontSize: 36, letterSpacing: '-0.03em', color: TH.text }}>
              Kamper
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: TH.muted }}>
              VM 2026 · {totalMatches} kamper · Gruppespill starter 11. juni
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {liveTotal > 0 && (
              <span
                className="inline-flex items-center gap-2 font-mono uppercase rounded-full px-3 py-1.5"
                style={{ background: TH.accent + '18', border: `1px solid ${TH.accent}44`, fontSize: 10.5, color: TH.accent, letterSpacing: '0.14em' }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: TH.accent }} />
                {liveTotal} LIVE
              </span>
            )}
            {lastUpdated && (
              <span
                className="inline-flex items-center font-mono uppercase rounded-full px-3 py-1.5"
                style={{ background: TH.card, border: `1px solid ${TH.border}`, fontSize: 10.5, color: TH.muted, letterSpacing: '0.14em' }}
              >
                {lastUpdated.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Innhold */}
        {loading ? (
          <div className="text-center py-16" style={{ color: TH.dim }}>Henter kampdata…</div>
        ) : error && fixtures.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
          >
            <p style={{ color: TH.warn, fontSize: 14, marginBottom: 8 }}>Kunne ikke hente kampdata.</p>
            {typeof error === 'string' && (
              <p className="font-mono" style={{ color: TH.dim, fontSize: 11 }}>{error}</p>
            )}
          </div>
        ) : fixtures.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
          >
            <p style={{ color: TH.dim, fontSize: 14 }}>Ingen kampdata tilgjengelig ennå.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {roundIds.map((rid) => {
              const { matches, stage, stageLabel } = grouped[rid]
              return (
                <RoundSection
                  key={rid}
                  roundId={rid}
                  stage={stage}
                  stageLabel={stageLabel}
                  matches={matches}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
