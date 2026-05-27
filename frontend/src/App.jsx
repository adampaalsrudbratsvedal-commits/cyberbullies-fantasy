import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Stats from './pages/Stats'
import History from './pages/History'
import Admin from './pages/Admin'

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
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
