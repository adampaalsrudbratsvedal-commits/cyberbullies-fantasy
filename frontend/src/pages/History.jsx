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

  // Sort players by their latest overall_points descending
  const lastRound = rounds[rounds.length - 1]
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    const aEntry = history[lastRound]?.find((e) => e.username === a)
    const bEntry = history[lastRound]?.find((e) => e.username === b)
    return (bEntry?.overall_points ?? 0) - (aEntry?.overall_points ?? 0)
  })

  // Points above last place per round (using overall_points)
  const getDiff = (player, round) => {
    const roundData = history[round] ?? []
    const entry = roundData.find((e) => e.username === player)
    if (!entry) return null
    const minPts = Math.min(...roundData.map((e) => e.overall_points ?? 0))
    return (entry.overall_points ?? 0) - minPts
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Ligahistorie</h1>

      {loading ? (
        <p className="text-slate-500">Laster...</p>
      ) : error ? (
        <p className="text-red-400">Kunne ikke hente historikk fra serveren.</p>
      ) : rounds.length === 0 ? (
        <p className="text-slate-500">Ingen historikk ennå — VM har ikke startet.</p>
      ) : (
        <section>
          <h2 className="text-slate-300 font-semibold mb-3 uppercase text-xs tracking-widest">
            Poeng over sisteplass per runde
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase">
                  <th className="text-left px-4 py-3 whitespace-nowrap">#</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Spiller</th>
                  {rounds.map((r) => (
                    <th key={r} className="text-right px-3 py-3 whitespace-nowrap">
                      R{r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, idx) => (
                  <tr key={player} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{player}</td>
                    {rounds.map((r) => {
                      const diff = getDiff(player, r)
                      return (
                        <td key={r} className="px-3 py-3 text-right tabular-nums">
                          {diff === null ? (
                            <span className="text-slate-600">—</span>
                          ) : diff === 0 ? (
                            <span className="text-red-400 font-semibold">0</span>
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
      )}
    </div>
  )
}
