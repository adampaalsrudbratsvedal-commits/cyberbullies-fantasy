import { useEffect, useState } from 'react'
import { getHistory } from '../api'

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">Ligahistorie</h1>

      {loading ? (
        <p className="text-slate-500">Laster...</p>
      ) : error ? (
        <p className="text-red-400">Kunne ikke hente historikk fra serveren.</p>
      ) : rounds.length === 0 ? (
        <p className="text-slate-500">Ingen historikk ennå — VM har ikke startet.</p>
      ) : (
        <>
          <section>
            <h2 className="text-slate-300 font-semibold mb-3 uppercase text-xs tracking-widest">
              Poeng per runde
            </h2>
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Spiller</th>
                    {rounds.map((r) => (
                      <th key={r} className="text-right px-3 py-3">
                        R{r}
                      </th>
                    ))}
                    <th className="text-right px-4 py-3">Totalt</th>
                  </tr>
                </thead>
                <tbody>
                  {allPlayers.map((player) => {
                    const lastRound = history[rounds[rounds.length - 1]]?.find(
                      (r) => r.username === player
                    )
                    return (
                      <tr
                        key={player}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-3 font-medium text-white">{player}</td>
                        {rounds.map((r) => {
                          const entry = history[r]?.find((e) => e.username === player)
                          return (
                            <td key={r} className="px-3 py-3 text-right text-slate-300">
                              {entry?.round_points ?? '—'}
                            </td>
                          )
                        })}
                        <td className="px-4 py-3 text-right font-bold text-green-400">
                          {lastRound?.overall_points ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-slate-300 font-semibold mb-3 uppercase text-xs tracking-widest">
              Differanse til sisteplass per runde
            </h2>
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">Spiller</th>
                    {rounds.map((r) => (
                      <th key={r} className="text-right px-3 py-3">
                        R{r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allPlayers.map((player) => (
                    <tr
                      key={player}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30"
                    >
                      <td className="px-4 py-3 font-medium text-white">{player}</td>
                      {rounds.map((r) => {
                        const roundData = history[r] ?? []
                        const entry = roundData.find((e) => e.username === player)
                        const minPts = Math.min(...roundData.map((e) => e.overall_points ?? 0))
                        const diff = entry ? (entry.overall_points ?? 0) - minPts : null
                        return (
                          <td key={r} className="px-3 py-3 text-right">
                            {diff === null ? (
                              '—'
                            ) : diff === 0 ? (
                              <span className="text-red-400">0</span>
                            ) : (
                              <span className="text-green-400">+{diff}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
