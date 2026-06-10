import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { triggerSync, syncFantasyPlayers, syncFantasySquads, debugFantasyPlayers } from '../api'
import { Navigate } from 'react-router-dom'

function SyncCard({ title, description, buttonLabel, onSync, status, syncing }) {
  return (
    <section className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-4">
      <div>
        <h2 className="text-white font-semibold mb-1">{title}</h2>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>

      <button
        onClick={onSync}
        disabled={syncing}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {syncing ? 'Synkroniserer…' : buttonLabel}
      </button>

      {status && (
        <div
          className={`text-sm px-4 py-3 rounded-lg ${
            status.ok
              ? 'bg-green-900/40 border border-green-700 text-green-300'
              : 'bg-red-900/40 border border-red-700 text-red-300'
          }`}
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {status.message}
        </div>
      )}
    </section>
  )
}

export default function Admin() {
  const { user, loading } = useAuth()

  const [roundSyncing, setRoundSyncing]     = useState(false)
  const [roundStatus, setRoundStatus]       = useState(null)

  const [playerSyncing, setPlayerSyncing]   = useState(false)
  const [playerStatus, setPlayerStatus]     = useState(null)

  const [squadSyncing, setSquadSyncing]     = useState(false)
  const [squadStatus, setSquadStatus]       = useState(null)

  const [debugLoading, setDebugLoading]     = useState(false)
  const [debugData, setDebugData]           = useState(null)

  if (loading) return null
  if (!user?.is_admin) return <Navigate to="/" replace />

  // ── Sync FIFA round scores ──────────────────────────────────────────────────
  const handleRoundSync = async () => {
    setRoundSyncing(true)
    setRoundStatus(null)
    try {
      const r = await triggerSync()
      const d = r.data
      setRoundStatus({
        ok: true,
        message: `Synkronisert! ${d.synced} rader oppdatert. Runde ${d.rounds_played}, ${d.players_found} spillere funnet. Snapshot lagret: ${d.snapshot_saved ? 'ja' : 'nei'}.`,
      })
    } catch (e) {
      const detail = e.response?.data?.detail || e.response?.data || e.message || 'Noe gikk galt'
      setRoundStatus({ ok: false, message: typeof detail === 'object' ? JSON.stringify(detail) : detail })
    } finally {
      setRoundSyncing(false)
    }
  }

  // ── Sync fantasy players (all WC players) ──────────────────────────────────
  const handlePlayerSync = async () => {
    setPlayerSyncing(true)
    setPlayerStatus(null)
    try {
      const r = await syncFantasyPlayers()
      const d = r.data
      setPlayerStatus({
        ok: true,
        message: `Lagret ${d.synced} spillere (av ${d.total ?? d.synced} totalt) til databasen.`,
      })
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Noe gikk galt'
      setPlayerStatus({ ok: false, message: typeof detail === 'object' ? JSON.stringify(detail) : String(detail) })
    } finally {
      setPlayerSyncing(false)
    }
  }

  // ── Sync fantasy squads (each participant's picks) ─────────────────────────
  const handleSquadSync = async () => {
    setSquadSyncing(true)
    setSquadStatus(null)
    try {
      const r = await syncFantasySquads()
      const d = r.data
      const errLine = d.errors?.length ? `\nFeil: ${d.errors.join(' · ')}` : ''
      setSquadStatus({
        ok: !d.errors?.length,
        message: `${d.total_picks} picks lagret for ${d.users_processed} brukere.${errLine}`,
      })
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || 'Noe gikk galt'
      setSquadStatus({ ok: false, message: typeof detail === 'object' ? JSON.stringify(detail) : String(detail) })
    } finally {
      setSquadSyncing(false)
    }
  }

  // ── Debug: inspect raw player API response ─────────────────────────────────
  const handleDebugPlayers = async () => {
    setDebugLoading(true)
    setDebugData(null)
    try {
      const r = await debugFantasyPlayers()
      setDebugData(r.data)
    } catch (e) {
      setDebugData({ error: e.message })
    } finally {
      setDebugLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin</h1>

      {/* ── 1. Round scores ── */}
      <SyncCard
        title="Synk rundedata"
        description="Henter siste poeng fra FIFA Fantasy og lagrer til databasen. Gjør dette etter hver runde er ferdigspilt. Simuleringen på Stats-siden vil automatisk bruke de nye tallene."
        buttonLabel="Synk runde fra FIFA"
        onSync={handleRoundSync}
        syncing={roundSyncing}
        status={roundStatus}
      />

      {/* ── 2. Fantasy players ── */}
      <SyncCard
        title="Synk spillerdatabase"
        description="Henter alle VM-spillere som er tilgjengelige i FIFA Fantasy (navn, nasjonallag, posisjon, pris). Disse kobles mot lagene til deltakerne. Gjør dette én gang for å fylle databasen."
        buttonLabel="Synk alle VM-spillere"
        onSync={handlePlayerSync}
        syncing={playerSyncing}
        status={playerStatus}
      />

      {/* ── 3. Fantasy squads ── */}
      <SyncCard
        title="Synk fantasy-lag"
        description="Henter hvert lags spillervalg fra FIFA Fantasy og lagrer i databasen. Krever at spillerdatabasen er synkronisert først. Oppdater etter at lagene er låst."
        buttonLabel="Synk alle fantasy-lag"
        onSync={handleSquadSync}
        syncing={squadSyncing}
        status={squadStatus}
      />

      {/* ── 4. Debug ── */}
      <section className="bg-slate-800 rounded-lg border border-slate-700 p-6 space-y-4">
        <div>
          <h2 className="text-white font-semibold mb-1">Debug — FIFA Fantasy API</h2>
          <p className="text-slate-400 text-sm">
            Se rå API-respons for å sjekke at feltnavnene stemmer. Nyttig hvis sync returnerer 0 spillere.
          </p>
        </div>
        <button
          onClick={handleDebugPlayers}
          disabled={debugLoading}
          className="w-full bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {debugLoading ? 'Henter…' : 'Vis rå spillerdata (5 første)'}
        </button>
        {debugData && (
          <pre
            className="text-xs text-green-300 bg-black/40 rounded p-3 overflow-x-auto"
            style={{ maxHeight: 320 }}
          >
            {JSON.stringify(debugData, null, 2)}
          </pre>
        )}
      </section>
    </div>
  )
}
