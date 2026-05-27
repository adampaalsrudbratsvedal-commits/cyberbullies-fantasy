import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import LoginModal from './LoginModal'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const links = [
    { to: '/', label: 'Tabell' },
    { to: '/stats', label: 'Stats' },
    { to: '/historikk', label: 'Ligahistorie' },
    ...(user?.is_admin ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  const isActive = (path) => location.pathname === path

  const linkClass = (path) =>
    `text-sm px-3 py-1.5 rounded transition-colors ${
      isActive(path) ? 'bg-green-600 text-white' : 'text-slate-300 hover:text-white'
    }`

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-green-400 font-bold text-lg tracking-wide">Fotball VM 2026</span>
            <div className="hidden md:flex gap-2">
              {links.map((l) => (
                <Link key={l.to} to={l.to} className={linkClass(l.to)}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-slate-400 text-sm">{user.username}</span>
                <button onClick={logout} className="text-sm text-slate-400 hover:text-white transition-colors">
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

          <button
            className="md:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Meny"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-700 px-4 py-3 space-y-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`block ${linkClass(l.to)}`}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-700 mt-2">
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">{user.username}</span>
                  <button onClick={() => { logout(); setMenuOpen(false) }} className="text-sm text-slate-400 hover:text-white">
                    Logg ut
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowLogin(true); setMenuOpen(false) }}
                  className="w-full text-sm bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded transition-colors"
                >
                  Logg inn
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}
