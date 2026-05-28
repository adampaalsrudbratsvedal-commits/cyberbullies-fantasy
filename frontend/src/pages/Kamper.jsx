// Kamper.jsx — VM 2026 kampoppsett og resultater
// Auto-refresher hvert 60. sekund for live-oppdateringer

import { useEffect, useState, useCallback } from 'react'
import { getFixtures } from '../api'
import Pitch from '../components/Pitch'
import { TH } from '../lib/theme'

// ── Hjelpefunksjoner ───────────────────────────────────────────

function statusLabel(status) {
  if (!status) return null
  const s = String(status).toUpperCase()
  if (s.includes('LIVE') || s.includes('IN_PLAY') || s.includes('HALFTIME') || s === 'INPROGRESS')
    return 'LIVE'
  if (s.includes('FINISH') || s.includes('FULL') || s.includes('FT') || s === 'COMPLETED')
    return 'FERDIG'
  if (s.includes('SCHED') || s.includes('UPCOMING') || s === 'NOTSTARTED')
    return 'KOMMENDE'
  return status
}

function isLive(status) {
  return statusLabel(status) === 'LIVE'
}

function isFinished(status) {
  return statusLabel(status) === 'FERDIG'
}

function formatKickoff(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('no-NO', {
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
    const key = f.roundId ?? f.round ?? f.eventId ?? 'Ukjent runde'
    if (!map[key]) map[key] = []
    map[key].push(f)
  }
  return map
}

// ── Kampkort ──────────────────────────────────────────────────

function MatchCard({ match }) {
  const live = isLive(match.status)
  const finished = isFinished(match.status)
  const statusText = statusLabel(match.status)

  // Prøv ulike feltnavn som FIFA APIet kan bruke
  const homeTeam = match.homeTeamName || match.home?.name || match.homeTeam || '—'
  const awayTeam = match.awayTeamName || match.away?.name || match.awayTeam || '—'
  const homeScore = match.homeScore ?? match.home?.score ?? match.score?.home ?? null
  const awayScore = match.awayScore ?? match.away?.score ?? match.score?.away ?? null
  const kickoff = match.kickoffTime || match.kickOff || match.date || match.startTime

  const hasScore = homeScore !== null && awayScore !== null

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: live
          ? 'linear-gradient(135deg, rgba(94,234,147,0.07) 0%, rgba(21,42,31,1) 50%)'
          : TH.elev,
        border: `1px solid ${live ? TH.accent + '55' : TH.border}`,
      }}
    >
      {live && (
        <div style={{ height: 2, background: TH.accent }} />
      )}

      <div className="px-4 py-3">
        {/* Status + tid */}
        <div className="flex items-center justify-between mb-3">
          {live ? (
            <span
              className="font-mono font-bold uppercase rounded px-2 py-0.5 flex items-center gap-1.5"
              style={{ fontSize: 10, background: TH.accent + '22', color: TH.accent, letterSpacing: '0.14em' }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: TH.accent,
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              LIVE
            </span>
          ) : statusText ? (
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 10,
                color: finished ? TH.muted : TH.dim,
                letterSpacing: '0.14em',
              }}
            >
              {statusText}
            </span>
          ) : (
            <span />
          )}
          <span
            className="font-mono"
            style={{ fontSize: 10.5, color: TH.dim, letterSpacing: '0.04em' }}
          >
            {formatKickoff(kickoff)}
          </span>
        </div>

        {/* Lag + resultat */}
        <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          {/* Hjemmelag */}
          <div className="text-right">
            <span
              className="font-semibold"
              style={{ fontSize: 15, color: TH.text, letterSpacing: '-0.01em' }}
            >
              {homeTeam}
            </span>
          </div>

          {/* Resultat / VS */}
          <div
            className="flex items-center justify-center gap-1 px-3 py-1 rounded-lg"
            style={{ background: TH.card, minWidth: 72 }}
          >
            {hasScore ? (
              <>
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: 22, color: live ? TH.accent : TH.text, letterSpacing: '-0.04em' }}
                >
                  {homeScore}
                </span>
                <span style={{ fontSize: 14, color: TH.dim, margin: '0 2px' }}>–</span>
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: 22, color: live ? TH.accent : TH.text, letterSpacing: '-0.04em' }}
                >
                  {awayScore}
                </span>
              </>
            ) : (
              <span
                className="font-mono font-semibold"
                style={{ fontSize: 13, color: TH.dim, letterSpacing: '0.08em' }}
              >
                VS
              </span>
            )}
          </div>

          {/* Bortelag */}
          <div>
            <span
              className="font-semibold"
              style={{ fontSize: 15, color: TH.text, letterSpacing: '-0.01em' }}
            >
              {awayTeam}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Runde-seksjon ─────────────────────────────────────────────

function RoundSection({ roundId, matches }) {
  const liveCount = matches.filter((m) => isLive(m.status)).length

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2
          className="font-bold"
          style={{ fontSize: 16, color: TH.text, letterSpacing: '-0.01em' }}
        >
          Runde {roundId}
        </h2>
        {liveCount > 0 && (
          <span
            className="font-mono uppercase rounded-full px-2.5 py-0.5"
            style={{ fontSize: 9.5, background: TH.accent + '22', color: TH.accent, letterSpacing: '0.14em' }}
          >
            {liveCount} LIVE
          </span>
        )}
        <span
          className="font-mono uppercase"
          style={{ fontSize: 10, color: TH.dim, letterSpacing: '0.12em' }}
        >
          {matches.length} KAMPER
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {matches.map((m, i) => (
          <MatchCard key={m.id || m.matchId || i} match={m} />
        ))}
      </div>
    </section>
  )
}

// ── Fallback: ingen data fra APIet ────────────────────────────

function NoDataCard({ error }) {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
    >
      <div style={{ height: 3, background: TH.accent, borderRadius: '9999px 9999px 0 0', marginBottom: 24, marginLeft: -32, marginRight: -32, marginTop: -32 }} />
      <p
        className="font-mono uppercase mb-2"
        style={{ fontSize: 11, color: TH.dim, letterSpacing: '0.18em' }}
      >
        {error ? 'FEIL VED HENTING' : 'INGEN DATA ENNÅ'}
      </p>
      <p style={{ fontSize: 14, color: TH.muted }}>
        {error
          ? 'Kunne ikke hente kampdata fra FIFA APIet. Prøv igjen senere.'
          : 'VM 2026 kampoppsettet er ikke tilgjengelig ennå. Kom tilbake nærmere turneringsstart.'}
      </p>
    </div>
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
        setLastUpdated(new Date())
        setError(false)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [load])

  const grouped = groupByRound(fixtures)
  const roundIds = Object.keys(grouped).sort((a, b) => Number(a) - Number(b))
  const liveTotal = fixtures.filter((m) => isLive(m.status)).length

  return (
    <>
      <Pitch />

      <div
        className="max-w-7xl mx-auto px-4 py-8"
        style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1
              className="font-bold"
              style={{ fontSize: 36, letterSpacing: '-0.03em', color: TH.text }}
            >
              Kamper
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: TH.muted }}>
              VM 2026 · Kampoppsett og resultater
            </p>
          </div>

          <div className="flex items-center gap-3">
            {liveTotal > 0 && (
              <span
                className="hidden sm:inline-flex items-center gap-2 font-mono uppercase rounded-full px-3 py-1.5"
                style={{
                  background: TH.accent + '18',
                  border: `1px solid ${TH.accent}44`,
                  fontSize: 10.5,
                  color: TH.accent,
                  letterSpacing: '0.14em',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: TH.accent }} />
                {liveTotal} LIVE
              </span>
            )}
            {lastUpdated && (
              <span
                className="hidden sm:inline-flex items-center font-mono uppercase rounded-full px-3 py-1.5"
                style={{
                  background: TH.card,
                  border: `1px solid ${TH.border}`,
                  fontSize: 10.5,
                  color: TH.muted,
                  letterSpacing: '0.14em',
                }}
              >
                OPPDATERT {lastUpdated.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>

        {/* Innhold */}
        {loading ? (
          <div className="text-center py-16" style={{ color: TH.dim }}>
            Henter kampdata…
          </div>
        ) : error || fixtures.length === 0 ? (
          <NoDataCard error={error} />
        ) : (
          <div className="flex flex-col gap-8">
            {roundIds.map((rid) => (
              <RoundSection key={rid} roundId={rid} matches={grouped[rid]} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}
