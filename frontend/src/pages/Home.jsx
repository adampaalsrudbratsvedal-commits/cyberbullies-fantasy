import { useEffect, useState } from 'react'
import { getStandings } from '../api'

const MOCK_STANDINGS = [
  { userName: 'KalkunBlaster', overallPoints: null, roundPoints: null, overallRank: 1 },
  { userName: 'Apb03', overallPoints: null, roundPoints: null, overallRank: 2 },
  { userName: 'Odin67', overallPoints: null, roundPoints: null, overallRank: 3 },
]

export default function Home() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStandings()
      .then((r) => setStandings(r.data))
      .catch(() => setStandings(MOCK_STANDINGS))
      .finally(() => setLoading(false))
  }, [])

  const top3 = [...standings]
    .sort((a, b) => (b.roundPoints ?? 0) - (a.roundPoints ?? 0))
    .slice(0, 3)

  const sorted = [...standings].sort(
    (a, b) => (b.overallPoints ?? 0) - (a.overallPoints ?? 0)
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-green-400 mb-1">Cyberbullies</h1>
      <p className="text-slate-400 text-sm mb-8">VM 2026 Fantasy Liga</p>

      {top3.some((p) => p.roundPoints !== null) && (
        <section className="mb-8">
          <h2 className="text-slate-300 font-semibold mb-3 uppercase text-xs tracking-widest">
            Rundens topp 3
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {top3.map((p, i) => (
              <div
                key={p.userName}
                className={`rounded-lg p-4 text-center border ${
                  i === 0
                    ? 'bg-yellow-500/10 border-yellow-500/40'
                    : i === 1
                    ? 'bg-slate-400/10 border-slate-400/40'
                    : 'bg-orange-700/10 border-orange-700/40'
                }`}
              >
                <div className="text-2xl mb-1">{['🥇', '🥈', '🥉'][i]}</div>
                <div className="font-semibold text-white text-sm">{p.userName}</div>
                <div className="text-green-400 font-bold text-lg">{p.roundPoints ?? '-'}</div>
                <div className="text-slate-400 text-xs">poeng</div>
              </div>
            ))}
          </div>
        </section>
      )}

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
                  <td colSpan={4} className="text-center py-8 text-slate-500">
                    Laster...
                  </td>
                </tr>
              ) : (
                sorted.map((p, i) => (
                  <tr
                    key={p.userName}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
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
        </div>
        {sorted.every((p) => p.overallPoints === null) && (
          <p className="text-slate-500 text-xs text-center mt-3">
            VM starter snart — poeng vil vises her
          </p>
        )}
      </section>
    </div>
  )
}
