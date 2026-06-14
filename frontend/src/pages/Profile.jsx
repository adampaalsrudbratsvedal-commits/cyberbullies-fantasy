import { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'
import { getMe, updateFifaSid } from '../api'
import { Navigate } from 'react-router-dom'
import { TH } from '../lib/theme'

export default function Profile() {
  const { user, loading } = useAuth()
  const [sid, setSid] = useState('')
  const [hasSid, setHasSid] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (user) {
      getMe().then((r) => setHasSid(r.data.has_fifa_sid)).catch(() => {})
    }
  }, [user])

  if (loading) return null
  if (!user) return <Navigate to="/" replace />

  const handleSave = async () => {
    const val = sid.trim()
    if (!val) return
    setSaving(true)
    setMsg(null)
    try {
      await updateFifaSid(val)
      setHasSid(true)
      setSid('')
      setMsg({ ok: true, text: 'FIFA-sesjon lagret! Synk lag for å oppdatere.' })
    } catch {
      setMsg({ ok: false, text: 'Noe gikk galt. Prøv igjen.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="max-w-xl mx-auto px-4 py-10"
      style={{ color: TH.text, fontFamily: '"Space Grotesk", system-ui, sans-serif' }}
    >
      <h1 className="font-bold mb-1" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
        Min profil
      </h1>
      <p className="mb-8" style={{ fontSize: 14, color: TH.muted }}>
        Innlogget som <strong>{user.username}</strong>
        {user.fifa_username && <> · FIFA: <strong>{user.fifa_username}</strong></>}
      </p>

      <div
        className="rounded-2xl p-6 space-y-5"
        style={{ background: TH.card, border: `1px solid ${TH.border}` }}
      >
        <div>
          <h2 className="font-semibold mb-1" style={{ fontSize: 16 }}>
            FIFA Fantasy sesjon
          </h2>
          <p style={{ fontSize: 13, color: TH.muted, lineHeight: 1.6 }}>
            For at appen skal se bytter du gjør underveis i en runde, trenger vi din FIFA X-SID cookie.
            {hasSid
              ? ' Du har allerede lagret en sesjon.'
              : ' Du har ikke lagret noen sesjon ennå.'}
          </p>
        </div>

        <details style={{ fontSize: 13, color: TH.muted }}>
          <summary className="cursor-pointer font-medium" style={{ color: TH.text }}>
            Slik finner du X-SID
          </summary>
          <ol className="mt-3 space-y-1 list-decimal list-inside" style={{ lineHeight: 1.7 }}>
            <li>Åpne <strong>play.fifa.com</strong> i nettleseren og logg inn</li>
            <li>Åpne utviklerverktøy (F12) → fanen <strong>Application</strong> (Chrome) eller <strong>Storage</strong> (Firefox)</li>
            <li>Velg <strong>Cookies</strong> → <strong>https://play.fifa.com</strong></li>
            <li>Kopier verdien for <strong>X-SID</strong> (ikke inkluder "X-SID=" — bare verdien)</li>
            <li>Lim inn under og trykk Lagre</li>
          </ol>
        </details>

        <div className="space-y-2">
          <input
            type="text"
            value={sid}
            onChange={(e) => setSid(e.target.value)}
            placeholder="Lim inn X-SID-verdi her…"
            className="w-full rounded-lg px-4 py-2.5 font-mono text-sm outline-none"
            style={{
              background: TH.bg,
              border: `1px solid ${TH.border}`,
              color: TH.text,
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !sid.trim()}
            className="w-full rounded-lg py-2.5 font-semibold transition-colors"
            style={{
              background: saving || !sid.trim() ? TH.border : TH.accent,
              color: saving || !sid.trim() ? TH.muted : '#000',
              fontSize: 14,
              cursor: saving || !sid.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Lagrer…' : hasSid ? 'Oppdater sesjon' : 'Lagre sesjon'}
          </button>
        </div>

        {msg && (
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{
              background: msg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: msg.ok ? '#4ade80' : '#f87171',
              border: `1px solid ${msg.ok ? '#166534' : '#7f1d1d'}`,
            }}
          >
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}
