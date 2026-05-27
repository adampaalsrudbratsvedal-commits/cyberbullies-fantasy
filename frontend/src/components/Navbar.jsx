import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import LoginModal from './LoginModal'

const links = [
  { to: '/', label: 'Forside' },
  { to: '/stats', label: 'Stats' },
  { to: '/historikk', label: 'Ligahistorie' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const location = useLocation()

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-green-400 font-bold text-lg tracking-wide">
            Cyberbullies
          </span>
          <div className="flex gap-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm px-3 py-1 rounded transition-colors ${
                  location.pathname === l.to
                    ? 'bg-green-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-slate-400 text-sm">{user.username}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Logg ut
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded transition-colors"
            >
              Logg inn
            </button>
          )}
        </div>
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
