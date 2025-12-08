'use client'
import { useState, useEffect } from 'react'

export default function Gatekeeper({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Tarkistetaan heti alussa, onko käyttäjä jo syöttänyt koodin aiemmin
  useEffect(() => {
    const sessionAccess = sessionStorage.getItem('site_access')
    if (sessionAccess === 'true') {
      setAccess(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    // TÄSSÄ ON MÄÄRITETYT TUNNUKSET
    if (username === 'Phautaus' && password === 'Chautaus25') {
      setAccess(true)
      sessionStorage.setItem('site_access', 'true') // Tallennetaan istunto
      setError('')
    } else {
      setError('Väärä käyttäjätunnus tai salasana.')
    }
  }

  // Odotetaan hetki tarkistusta
  if (loading) return null

  // Jos lupa on kunnossa, näytetään itse sovellus (lapset)
  if (access) {
    return <>{children}</>
  }

  // Jos lupaa ei ole, näytetään tämä lukitusruutu
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
      <div className="max-w-sm w-full bg-white p-10 shadow-xl border border-slate-200 rounded-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">HAUTAUS-APP</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Suojattu yhteys</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Käyttäjätunnus</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-slate-200 bg-slate-50 focus:outline-none focus:border-slate-800 transition rounded-md"
              placeholder="Syötä tunnus"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Salasana</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 bg-slate-50 focus:outline-none focus:border-slate-800 transition rounded-md"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs text-center border border-red-100 rounded">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-slate-800 text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition rounded-md shadow-lg"
          >
            Avaa Sovellus
          </button>
        </form>
        
        <p className="text-center text-slate-300 text-xs mt-8">
          &copy; 2024 Hautaus-App
        </p>
      </div>
    </div>
  )
}