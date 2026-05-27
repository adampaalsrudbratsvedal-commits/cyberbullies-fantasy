import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { login, register } from '../api'

export default function LoginModal({ onClose }) {
  const { loginUser } = useAuth()
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fifaUsername, setFifaUsername] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (tab === 'register') {
      try {
        await register(username, password, fifaUsername)
      } catch (e) {
        const detail = e.response?.data?.detail
        setError(detail === 'Username taken' ? 'Brukernavnet er allerede tatt' : (detail || 'Registrering feilet'))
        return
      }
    }

    try {
      const res = await login(username, password)
      await loginUser(res.data.access_token)
      onClose()
    } catch {
      setError('Feil brukernavn eller passord')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-end pt-16 pr-6 z-50" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-80 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 mb-5">
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded text-sm transition-colors ${
                tab === t ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t === 'login' ? 'Logg inn' : 'Registrer'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className="bg-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-green-500"
            placeholder="Brukernavn"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="bg-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-green-500"
            placeholder="Passord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {tab === 'register' && (
            <input
              className="bg-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-green-500"
              placeholder="FIFA-brukernavn (valgfritt)"
              value={fifaUsername}
              onChange={(e) => setFifaUsername(e.target.value)}
            />
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-500 text-white rounded py-2 text-sm font-medium transition-colors"
          >
            {tab === 'login' ? 'Logg inn' : 'Opprett konto'}
          </button>
        </form>
      </div>
    </div>
  )
}
