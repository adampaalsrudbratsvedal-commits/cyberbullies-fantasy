import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider } from './AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Stats from './pages/Stats'
import History from './pages/History'
import Admin from './pages/Admin'
import Regler from './pages/Regler'
import Kamper from './pages/Kamper'
import VMBracket from './pages/VMBracket'
import Squads from './pages/Squads'
import KampDetalj from './pages/KampDetalj'
import Profile from './pages/Profile'
import { TH } from './lib/theme'

class PageBoundary extends Component {
  constructor(props) { super(props); this.state = { crashed: false } }
  static getDerivedStateFromError() { return { crashed: true } }
  render() {
    if (this.state.crashed) return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p style={{ color: TH.muted, fontSize: 14 }}>Poeng oppdateres — prøv igjen om litt.</p>
      </div>
    )
    return this.props.children
  }
}

const W = (Page) => <PageBoundary><Page /></PageBoundary>

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen text-slate-100" style={{ background: 'transparent' }}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={W(Home)} />
              <Route path="/stats" element={W(Stats)} />
              <Route path="/historikk" element={W(History)} />
              <Route path="/kamper" element={W(Kamper)} />
              <Route path="/regler" element={W(Regler)} />
              <Route path="/vm-bracket" element={W(VMBracket)} />
              <Route path="/lag" element={W(Squads)} />
              <Route path="/admin" element={W(Admin)} />
              <Route path="/profil" element={W(Profile)} />
              <Route path="/kamper/:matchId" element={W(KampDetalj)} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
