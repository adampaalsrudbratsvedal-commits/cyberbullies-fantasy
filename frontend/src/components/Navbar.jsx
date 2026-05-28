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
    { to: '/kamper', label: 'Kamper' },
    { to: '/vm-bracket', label: 'VM-Bracket' },
    { to: '/historikk', label: 'Ligahistorie' },
    { to: '/regler', label: 'Regler' },
    ...(user?.is_admin ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  const isActive = (path) => location.pathname === path

  return (
    <>
      <nav style={{ background: '#000', borderBottom: '1px solid #222' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <img src="/VM_LOGO.png" alt="FIFA World Cup 2026" className="h-9 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
            <span className="text-white font-bold text-sm tracking-widest uppercase hidden sm:block">
              Fotball VM 2026
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                style={{
                  color: isActive(l.to) ? '#fff' : '#aaa',
                  borderBottom: isActive(l.to) ? '2px solid #fff' : '2px solid transparent',
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right: user + hamburger */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{user.username}</span>
                  <button onClick={logout} className="text-xs text-gray-400 hover:text-white uppercase tracking-wider transition-colors">
                    Logg ut
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="text-xs font-bold uppercase tracking-widest text-white border border-white px-4 py-1.5 hover:bg-white hover:text-black transition-colors"
                >
                  Logg inn
                </button>
              )}
            </div>

            <button
              className="md:hidden text-white p-1"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Meny"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid #222', background: '#000' }} className="md:hidden px-4 py-3 space-y-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block px-2 py-2 text-xs font-bold uppercase tracking-widest"
                style={{ color: isActive(l.to) ? '#fff' : '#aaa' }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-800 mt-2">
              {user ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase">{user.username}</span>
                  <button onClick={() => { logout(); setMenuOpen(false) }} className="text-xs text-gray-400 hover:text-white uppercase">
                    Logg ut
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowLogin(true); setMenuOpen(false) }}
                  className="w-full text-xs font-bold uppercase tracking-widest text-white border border-white px-4 py-2 hover:bg-white hover:text-black transition-colors"
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
