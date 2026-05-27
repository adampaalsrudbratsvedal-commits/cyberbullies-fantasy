import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { triggerSync } from '../api'
import { Navigate } from 'react-router-dom'

export default function Admin() {
  const { user, loading } = useAuth()
  const [status, setStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)

  if (loading) return null
  if (!user?.is_admin) return <Navigate to="/" replace />

  const handleSync = async () => {
    setSyncing(true)
    setStatus(null)
    try {
      const r = await triggerSync()
      setStatus({ ok: true, message: `Synkronisert! ${r.data.synced} rader oppdatert.` })
    } catch (e) {
      const detail = e.response?.data?.detail || 'Noe gikk galt'
      setStatus({ ok: false, message: detail })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin</h1>

      <section className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-4">
        <div>
          <h2 className="text-white font-semibold mb-1">Synk rundedata</h2>
          <p className="text-slate-400 text-sm">
            Henter siste poeng fra FIFA og lagrer til databasen. Gjør dette etter hver runde er ferdigspilt.
            Simuleringen på Stats-siden vil automatisk bruke de nye tallene.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {syncing ? 'Synkroniserer…' : 'Synk runde fra FIFA'}
        </button>

        {status && (
          <div
            className={`text-sm px-4 py-3 rounded-lg ${
              status.ok
                ? 'bg-green-900/40 border border-green-700 text-green-300'
                : 'bg-red-900/40 border border-red-700 text-red-300'
            }`}
          >
            {status.message}
          </div>
        )}
      </section>
    </div>
  )
}
