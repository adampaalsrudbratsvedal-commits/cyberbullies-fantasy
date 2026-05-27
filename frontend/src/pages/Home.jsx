import { useEffect, useState } from 'react'
import { getStandings } from '../api'

function PlayerCard({ title, player, accentClass, image }) {
  const initials = player?.userName
    ? player.userName.slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className={`bg-slate-800 rounded-lg border ${accentClass} p-4`}>
      <p className="text-slate-400 text-xs uppercase tracking-widest mb-3">{title}</p>
      <div className="flex items-center gap-3">
        <div className={`w-14 h-14 rounded-full bg-slate-700 border-2 ${accentClass} flex items-center justify-center flex-shrink-0 overflow-hidden`}>
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover" />
          ) : player ? (
            <span className="text-lg font-bold text-slate-300">{initials}</span>
          ) : (
            <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white truncate">{player?.userName ?? '—'}</p>
          <p className="text-slate-400 text-sm">
            {player?.overallPoints != null ? `${player.overallPoints} p` : 'Ingen data ennå'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getStandings()
      .then((r) => setStandings(r.data))
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
  const roundWinner = [...standings].sort(
    (a, b) =>
      (b.roundPoints ?? 0) - (a.roundPoints ?? 0) ||
      (a.userName ?? '').localeCompare(b.userName ?? '')
  )[0] ?? null

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-400 mb-1">Cyberbullies</h1>
      <p className="text-slate-400 text-sm mb-8">VM 2026 Fantasy Liga</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="text-slate-300 font-semibold mb-3 uppercase text-xs tracking-widest">
              Ligatabell
            </h2>
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                    <th className="text-left px-4 py-3 w-8">#</th>
                    <th className="text-left px-4 py-3">Spiller</th>
                    <th className="text-right px-4 py-3">Runde</th>
                    <th className="text-right px-4 py-3">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500">Laster...</td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-red-400">Kunne ikke hente standings</td>
                    </tr>
                  ) : (
                    sorted.map((p, i) => (
                      <tr key={p.userName} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-white">{p.userName}</td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {p.roundPoints ?? <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-400">
                          {p.overallPoints ?? <span className="text-slate-600">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {sorted.every((p) => p.overallPoints === null) && (
                <p className="text-slate-500 text-xs text-center py-3">
                  VM starter snart — poeng vil vises her
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <PlayerCard
            title="Leder"
            player={leader}
            accentClass="border-yellow-500/40"
            image="/trophy.png"
          />
          <PlayerCard
            title="Regjerende rundemester"
            player={roundWinner}
            accentClass="border-blue-500/40"
            image="/rundevinner.png"
          />
          <PlayerCard
            title="Sisteplass"
            player={last}
            accentClass="border-red-500/40"
            image="/sisteplass.jpg"
          />
        </div>
      </div>
    </div>
  )
}
