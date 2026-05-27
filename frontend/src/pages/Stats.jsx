import { useEffect, useState } from 'react'
import { getSimulation, getStats } from '../api'

function ProbBar({ value, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${(value * 100).toFixed(1)}%` }}
        />
      </div>
      <span className="text-sm w-12 text-right text-slate-300">
        {(value * 100).toFixed(1)}%
      </span>
    </div>
  )
}

export default function Stats() {
  const [sim, setSim] = useState(null)
  const [simError, setSimError] = useState(false)
  const [simLoading, setSimLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    setSimLoading(true)
    getSimulation()
      .then((r) => setSim(r.data))
      .catch(() => setSimError(true))
      .finally(() => setSimLoading(false))
    getStats()
      .then((r) => setStats(r.data))
      .catch(() => setStats({ most_round_wins: [], most_round_losses: [] }))
  }, [])

  const simEntries = sim
    ? Object.entries(sim).sort((a, b) => b[1].win_probability - a[1].win_probability)
    : []

  const SimSection = ({ title, entries, valueKey, color }) => (
    <section>
      <h2 className="text-slate-300 font-semibold mb-4 uppercase text-xs tracking-widest">
        {title}
      </h2>
      <div className="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
        {simLoading ? (
          <div className="px-5 py-6 text-slate-500 text-sm text-center">
            Beregner simuleringer…
          </div>
        ) : simError ? (
          <div className="px-5 py-6 text-red-400 text-sm text-center">
            Kunne ikke hente simuleringsdata fra serveren
          </div>
        ) : (
          entries.map(([name, data]) => (
            <div key={name} className="px-5 py-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-white">{name}</span>
                {valueKey === 'win_probability' && (
                  <span className="text-slate-400 text-xs">
                    Forventet: {data.expected_final.toFixed(0)} p
                  </span>
                )}
              </div>
              <ProbBar value={data[valueKey]} color={color} />
            </div>
          ))
        )}
      </div>
    </section>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">Stats</h1>

      <SimSection
        title="Sannsynlighet for seier (Monte Carlo)"
        entries={simEntries}
        valueKey="win_probability"
        color="bg-green-500"
      />

      <SimSection
        title="Sannsynlighet for sisteplass"
        entries={[...simEntries].sort((a, b) => b[1].last_probability - a[1].last_probability)}
        valueKey="last_probability"
        color="bg-red-500"
      />

      <div className="grid grid-cols-2 gap-4">
        <section>
          <h2 className="text-slate-300 font-semibold mb-3 uppercase text-xs tracking-widest">
            Flest rundeseiere
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
            {stats?.most_round_wins.length ? (
              stats.most_round_wins.map((r) => (
                <div key={r.username} className="px-4 py-3 flex justify-between">
                  <span className="text-white text-sm">{r.username}</span>
                  <span className="text-green-400 font-bold">{r.wins}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-slate-500 text-sm text-center">Ingen data ennå</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-slate-300 font-semibold mb-3 uppercase text-xs tracking-widest">
            Flest rundetap
          </h2>
          <div className="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
            {stats?.most_round_losses.length ? (
              stats.most_round_losses.map((r) => (
                <div key={r.username} className="px-4 py-3 flex justify-between">
                  <span className="text-white text-sm">{r.username}</span>
                  <span className="text-red-400 font-bold">{r.losses}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-slate-500 text-sm text-center">Ingen data ennå</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
