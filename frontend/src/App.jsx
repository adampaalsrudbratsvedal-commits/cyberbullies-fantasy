import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Stats from './pages/Stats'
import History from './pages/History'
import Admin from './pages/Admin'
import Regler from './pages/Regler'
import Kamper from './pages/Kamper'
import VMBracket from './pages/VMBracket'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen text-slate-100" style={{ background: 'transparent' }}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/historikk" element={<History />} />
              <Route path="/kamper" element={<Kamper />} />
              <Route path="/regler" element={<Regler />} />
              <Route path="/vm-bracket" element={<VMBracket />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
