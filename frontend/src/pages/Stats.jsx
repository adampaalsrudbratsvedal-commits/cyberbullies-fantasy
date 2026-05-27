import { useEffect, useState } from 'react'
import { getSimulation, getProbabilityHistory } from '../api'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const PLAYER_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#06b6d4']

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

function ProbChart({ history, valueKey, title }) {
  if (!history || Object.keys(history).length === 0) return null

  const rounds = Object.keys(history).map(Number).sort((a, b) => a - b)
  const players = [...new Set(rounds.flatMap((r) => Object.keys(history[r])))]

  const data = rounds.map((r) => {
    const point = { round: `R${r}` }
    players.forEach((p) => {
      const val = history[r][p]?.[valueKey]
      point[p] = val != null ? parseFloat((val * 100).toFixed(1)) : null
    })
    return point
  })

  return (
    <section>
      <h2 className="text-slate-300 font-semibold mb-4 uppercase text-xs tracking-widest">{title}</h2>
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <XAxis dataKey="round" stroke="#64748b" tick={{ fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [`${v}%`]}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            {players.map((p, i) => (
              <Line key={p} type="monotone" dataKey={p} stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]} strokeWidth={2} dot={{ r: 4 }} connectNulls={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default function Stats() {
  const [sim, setSim] = useState(null)
  const [simError, setSimError] = useState(false)
  const [simLoading, setSimLoading] = useState(true)
  const [probHistory, setProbHistory] = useState(null)

  useEffect(() => {
    setSimLoading(true)
    getSimulation()
      .then((r) => setSim(r.data))
      .catch(() => setSimError(true))
      .finally(() => setSimLoading(false))
    getProbabilityHistory()
      .then((r) => setProbHistory(r.data))
      .catch(() => {})
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">Stats</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimSection
          title="Sannsynlighet for seier (Monte Carlo)"
          entries={simEntries}
          valueKey="win_probability"
          color="bg-green-500"
        />
        <ProbChart history={probHistory} valueKey="win_probability" title="Vinnersannsynlighet per runde" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SimSection
          title="Sannsynlighet for sisteplass"
          entries={[...simEntries].sort((a, b) => b[1].last_probability - a[1].last_probability)}
          valueKey="last_probability"
          color="bg-red-500"
        />
        <ProbChart history={probHistory} valueKey="last_probability" title="Sisteplasssannsynlighet per runde" />
      </div>

    </div>
  )
}
