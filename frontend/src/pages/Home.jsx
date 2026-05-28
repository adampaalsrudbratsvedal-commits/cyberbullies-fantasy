// Home.jsx — Cyberbullies Forside (redesigned).
//
// Centerpiece is the ligatabell, with three highlight cards stacked on the
// right (Leder · Rundemester · Sisteplass). Stadium-pitch background.
//
// Uses the existing API contract from ../api:
//   getStandings()  → [{ userName, overallPoints, roundPoints }]
//   getHistory()    → { [round]: [{ username, ... }] }   (round number only)

import { useEffect, useState } from 'react'
import { getStandings, getHistory } from '../api'
import Pitch from '../components/Pitch'
import SidePlayerCard from '../components/SidePlayerCard'
import { TH } from '../lib/theme'

const TOTAL_ROUNDS = 64

export default function Home() {
  const [standings, setStandings] = useState([])
  const [roundNo, setRoundNo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([getStandings(), getHistory().catch(() => null)])
      .then(([s, h]) => {
        setStandings(s.data)
        if (h?.data && Object.keys(h.data).length > 0) {
          const rounds = Object.keys(h.data).map(Number).filter((n) => !Number.isNaN(n))
          if (rounds.length) setRoundNo(Math.max(...rounds))
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...standings].sort(
    (a, b) =>
      (b.overallPoints ?? 0) - (a.overallPoints ?? 0) ||
      (a.userName ?? '').localeCompare(b.userName ?? '')
  )
  const leader = sorted[0] ?? null
  const last = sorted[sorted.length - 1] ?? null
  const roundWinner =
    [...standings].sort(
      (a, b) =>
        (b.roundPoints ?? 0) - (a.roundPoints ?? 0) ||
        (a.userName ?? '').localeCompare(b.userName ?? '')
    )[0] ?? null

  const hasRoundData = standings.some((p) => p.roundPoints != null)

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
              Tabell
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: TH.muted }}>
              VM 2026 Fantasy Liga
              {roundNo != null && ` · Runde ${roundNo} av ${TOTAL_ROUNDS}`}
            </p>
          </div>
          {roundNo != null && (
            <div
              className="hidden sm:inline-flex items-center font-mono uppercase rounded-full px-3 py-1.5"
              style={{
                background: TH.card,
                border: `1px solid ${TH.border}`,
                fontSize: 10.5,
                color: TH.muted,
                letterSpacing: '0.14em',
              }}
            >
              RUNDE {roundNo} / {TOTAL_ROUNDS}
            </div>
          )}
        </div>

        {/* Table left · cards stacked right */}
        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* LIGATABELL */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h2
                className="font-semibold"
                style={{ fontSize: 18, color: TH.text, letterSpacing: '-0.01em' }}
              >
                Ligatabell
              </h2>
              <span
                className="font-mono uppercase"
                style={{ fontSize: 11, color: TH.dim, letterSpacing: '0.12em' }}
              >
                {sorted.length} SPILLERE
              </span>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: TH.elev, border: `1px solid ${TH.border}` }}
            >
              {/* Header row */}
              <div
                className="grid items-center font-mono uppercase px-3 sm:px-6 py-3"
                style={{
                  gridTemplateColumns: '36px 1fr 70px 80px',
                  background: TH.bg,
                  borderBottom: `1px solid ${TH.border}`,
                  fontSize: 10,
                  color: TH.dim,
                  letterSpacing: '0.14em',
                }}
              >
                <span>#</span>
                <span>SPILLER</span>
                <span className="text-right" style={{ color: TH.muted }}>
                  {roundNo != null ? `RUNDE ${roundNo}` : 'RUNDE'}
                </span>
                <span className="text-right">TOTALT</span>
              </div>

              {/* Body */}
              {loading ? (
                <div className="text-center py-10" style={{ color: TH.dim }}>
                  Laster…
                </div>
              ) : error ? (
                <div
                  className="text-center py-10"
                  style={{ color: TH.warn }}
                >
                  Kunne ikke hente standings
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-10" style={{ color: TH.dim }}>
                  Ingen spillere registrert ennå
                </div>
              ) : (
                sorted.map((p, i) => {
                  const isLeader = i === 0
                  const isLast = i === sorted.length - 1
                  const isRoundWinner =
                    roundWinner && p.userName === roundWinner.userName && (p.roundPoints ?? 0) > 0
                  const railColor = isLeader ? TH.gold : isLast ? TH.warn : 'transparent'
                  return (
                    <div
                      key={p.userName}
                      className="relative grid items-center gap-2 px-3 sm:px-6 py-3 tabular-nums"
                      style={{
                        gridTemplateColumns: '36px 1fr 70px 80px',
                        borderTop: i > 0 ? `1px solid ${TH.border}` : 'none',
                        background: isLeader
                          ? 'linear-gradient(90deg, rgba(251,191,36,0.07) 0%, transparent 65%)'
                          : 'transparent',
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0"
                        style={{ width: 3, background: railColor }}
                      />
                      <span
                        className="font-mono font-semibold"
                        style={{
                          fontSize: 14,
                          color: isLeader ? TH.gold : isLast ? TH.warn : TH.muted,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>

                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="min-w-0">
                          <div
                            className="font-semibold flex items-center gap-1.5"
                            style={{ fontSize: 14, color: TH.text, letterSpacing: '-0.01em' }}
                          >
                            <span className="truncate">{p.userName}</span>
                            {isRoundWinner && roundNo != null && (
                              <span
                                className="font-mono font-semibold uppercase rounded px-1.5 py-0.5 flex-shrink-0"
                                style={{
                                  fontSize: 9,
                                  color: TH.info,
                                  background: TH.infoSoft,
                                  letterSpacing: '0.12em',
                                }}
                              >
                                RUNDEMESTER R{roundNo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className="text-right font-mono font-semibold"
                        style={{
                          fontSize: 15,
                          color: isRoundWinner ? TH.info : TH.muted,
                        }}
                      >
                        {p.roundPoints != null ? `+${p.roundPoints}` : (
                          <span style={{ color: TH.dim }}>—</span>
                        )}
                      </span>

                      <span
                        className="text-right font-bold"
                        style={{
                          fontSize: 22,
                          letterSpacing: '-0.025em',
                          color: isLeader ? TH.accent : TH.text,
                        }}
                      >
                        {p.overallPoints != null ? p.overallPoints : (
                          <span style={{ color: TH.dim, fontSize: 15 }}>—</span>
                        )}
                      </span>
                    </div>
                  )
                })
              )}

              {!loading && !error && sorted.length > 0 && !hasRoundData && (
                <p
                  className="text-center py-3"
                  style={{ color: TH.dim, fontSize: 11 }}
                >
                  VM starter snart — poeng vil vises her
                </p>
              )}
            </div>
          </section>

          {/* Right column: Leder · Rundemester · Sisteplass */}
          <aside className="flex flex-col gap-3.5 min-h-0">
            <SidePlayerCard
              kind="leader"
              player={leader}
              roundNo={roundNo}
              leaderOverall={leader?.overallPoints}
            />
            <SidePlayerCard kind="round" player={roundWinner} roundNo={roundNo} />
            <SidePlayerCard
              kind="last"
              player={last}
              roundNo={roundNo}
              leaderOverall={leader?.overallPoints}
            />
          </aside>
        </div>
      </div>
    </>
  )
}
