'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function SijaintiKortti({ otsikko, paikka, osoite, numero }: any) {
    if (!osoite) return null
    const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(osoite)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
    const directionsUrl = `https://www.google.com/maps/dir//${encodeURIComponent(osoite)}`
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6 last:mb-0">
        <div className="p-5 border-b border-slate-50 bg-white">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">{numero}</span>
            <h3 className="font-bold text-slate-800 text-lg">{otsikko}</h3>
          </div>
          <p className="font-medium text-slate-600 text-sm mb-1">{paikka}</p>
          <div className="flex items-center text-sm text-slate-500"><span className="mr-2">📍</span><p>{osoite}</p></div>
        </div>
        <div className="h-48 w-full bg-slate-50 relative grayscale-[20%] hover:grayscale-0 transition-all duration-700"><iframe src={mapUrl} width="100%" height="100%" style={{border:0}} loading="lazy" className="absolute inset-0"></iframe></div>
        <div className="p-4 bg-slate-50 text-xs text-center border-t border-slate-100"><a href={directionsUrl} target="_blank" className="text-slate-600 hover:text-slate-900 font-medium uppercase tracking-wide transition-colors">Avaa reittiohjeet →</a></div>
      </div>
    )
}

export default function Sovellus() {
  const router = useRouter()
  const [kirjautunut, setKirjautunut] = useState(false)
  const [email, setEmail] = useState('')
  const [koodi, setKoodi] = useState('')
  const [loginVirhe, setLoginVirhe] = useState('')
  
  const [tapaus, setTapaus] = useState<any>(null)
  const [tehtavat, setTehtavat] = useState<any[]>([])
  const [ladataan, setLadataan] = useState(true)
  const [naytaKauppa, setNaytaKauppa] = useState(false)
  const [tuotteet, setTuotteet] = useState<any[]>([])
  const [ostoskoriStatus, setOstoskoriStatus] = useState('')

  useEffect(() => {
    const savedSession = localStorage.getItem('hautaus_session')
    if (savedSession) {
      const session = JSON.parse(savedSession)
      if (session.role === 'admin') router.push('/admin')
      else if (session.role === 'vieras') router.push('/vieraat')
      else if (session.role === 'kuljetus') router.push('/kuljetus')
      else if (session.role === 'omainen') { setKirjautunut(true); haeTiedot(session.arrangement_id) }
    } else {
      setLadataan(false)
    }
  }, [])

  const hoidaKirjautuminen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email === 'admin' && koodi === 'admin') { localStorage.setItem('hautaus_session', JSON.stringify({ role: 'admin' })); router.push('/admin'); return }

    const { data, error } = await supabase.from('access_rights').select('*').eq('email', email).eq('code', koodi).single()

    if (data) {
      const session = { role: data.role, arrangement_id: data.arrangement_id, company_name: data.company_name }
      localStorage.setItem('hautaus_session', JSON.stringify(session))

      if (data.role === 'vieras') router.push('/vieraat')
      else if (data.role === 'kuljetus') router.push('/kuljetus')
      else if (data.role === 'omainen') { setKirjautunut(true); haeTiedot(data.arrangement_id) }
    } else {
      setLoginVirhe('Väärä sähköposti tai koodi.')
    }
  }

  const kirjauduUlos = () => { localStorage.removeItem('hautaus_session'); setKirjautunut(false); setEmail(''); setKoodi(''); setTapaus(null) }

  async function haeTiedot(id: string) {
    const { data } = await supabase.from('arrangements').select('*').eq('id', id).single()
    if (data) {
      setTapaus(data)
      const { data: tData } = await supabase.from('tasks').select('*').eq('arrangement_id', data.id).order('title')
      setTehtavat(tData || [])
      const { data: pData } = await supabase.from('products').select('*').order('category')
      setTuotteet(pData || [])
    }
    setLadataan(false)
  }

  async function rastiRuutuun(id: string, tila: boolean) { setTehtavat(tehtavat.map(t => t.id === id ? { ...t, is_completed: !tila } : t)); await supabase.from('tasks').update({ is_completed: !tila }).eq('id', id) }
  async function tilaaTuote(tuote: any) { if(!confirm(`Haluatko varmasti tilata tuotteen: ${tuote.name} (${tuote.price}€)?`)) return; const { error } = await supabase.from('orders').insert({ arrangement_id: tapaus.id, product_name: tuote.name, price: tuote.price, status: 'Tilattu' }); if(error) { alert('Virhe tilauksessa.') } else { setOstoskoriStatus(`Tilattu onnistuneesti: ${tuote.name}`); setTimeout(() => setOstoskoriStatus(''), 3000) } }

  if (!kirjautunut) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
      <div className="max-w-md w-full bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-center mb-2 text-slate-800 tracking-tight">HAUTAUS-APP</h1>
        <p className="text-center text-slate-400 text-sm mb-8">Kirjaudu sisään</p>
        <form onSubmit={hoidaKirjautuminen} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sähköposti</label><input type="text" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" placeholder="tunnus@firma.fi" /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Koodi / Salasana</label><input type="password" value={koodi} onChange={e => setKoodi(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" placeholder="••••" /></div>
          {loginVirhe && <p className="text-red-500 text-sm text-center">{loginVirhe}</p>}
          <button type="submit" className="w-full bg-slate-800 text-white py-4 rounded-lg hover:bg-slate-700 transition font-bold shadow-sm">Kirjaudu sisään</button>
        </form>
      </div>
    </div>
  )

  if (ladataan) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">Ladataan tietoja...</div>
  if (!tapaus) return <div className="min-h-screen flex items-center justify-center flex-col gap-4 bg-slate-50"><p className="text-slate-500">Ei tietoja.</p><button onClick={kirjauduUlos} className="text-slate-800 underline">Kirjaudu ulos</button></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700 pb-20">
      
      {naytaKauppa && (<div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl h-[85vh] flex flex-col"><div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl"><h2 className="text-2xl font-bold text-slate-800">Lisäpalvelut & Tuotteet</h2><button onClick={() => setNaytaKauppa(false)} className="text-slate-400 hover:text-slate-800 text-2xl">✕</button></div>{ostoskoriStatus && <div className="p-4 bg-emerald-50 text-emerald-700 text-center border-b border-emerald-100">{ostoskoriStatus}</div>}<div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">{tuotteet.map(tuote => (<div key={tuote.id} className="flex items-start gap-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm"><div className="text-5xl bg-slate-50 w-20 h-20 flex items-center justify-center rounded-xl">{tuote.image_emoji}</div><div className="flex-1"><div className="flex justify-between items-baseline mb-1"><h4 className="font-bold text-lg text-slate-800">{tuote.name}</h4><span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full text-sm">{tuote.price} €</span></div><p className="text-slate-500 text-sm mb-4 leading-relaxed">{tuote.description}</p><button onClick={() => tilaaTuote(tuote)} className="text-white bg-slate-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition shadow-sm">+ Lisää tilaukseen</button></div></div>))}</div><div className="p-4 border-t bg-white rounded-b-2xl text-center"><button onClick={() => setNaytaKauppa(false)} className="text-slate-500 hover:text-slate-800 text-sm">Sulje</button></div></div></div>)}
      
      <nav className="bg-white px-6 py-4 shadow-sm border-b border-slate-100 sticky top-0 z-10"><div className="max-w-6xl mx-auto flex justify-between items-center"><span className="font-bold text-slate-800 text-xl tracking-tight">HAUTAUS-APP</span><div className="flex items-center gap-6"><button onClick={kirjauduUlos} className="text-sm font-medium text-slate-500 hover:text-slate-800 transition">Kirjaudu ulos</button><div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-sm font-bold shadow-inner">K</div></div></div></nav>
      
      <main className="max-w-6xl mx-auto p-4 md:p-8 mt-4">
        
        {/* TÄSSÄ ON MUUTOS: flex-col (Mobiili) vs grid (Desktop) + ORDER */}
        <div className="flex flex-col md:grid md:grid-cols-3 gap-8 items-start">
          
          {/* Sijainti-sarake (Vasemmalla desktopissa, Alhaalla mobiilissa) */}
          <div className="order-2 md:order-1 md:col-span-1 space-y-8 w-full">
            <div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sijainnit</h3><SijaintiKortti numero="1" otsikko="Siunaustilaisuus" paikka={tapaus.location_name || 'Kappeli'} osoite={tapaus.location_address} /><SijaintiKortti numero="2" otsikko="Muistotilaisuus" paikka={tapaus.memorial_location_name} osoite={tapaus.memorial_location_address} /></div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100"><h3 className="font-bold text-slate-800 mb-4 text-lg">Yhteystiedot</h3><div className="space-y-3 text-sm text-slate-600"><p className="flex items-center gap-3"><span className="bg-slate-100 p-2 rounded-full">📞</span> 010 123 4567</p><p className="flex items-center gap-3"><span className="bg-slate-100 p-2 rounded-full">✉️</span> info@hautaus-app.fi</p></div></div>
          </div>

          {/* Tietosisältö-sarake (Oikealla desktopissa, Ylhäällä mobiilissa) */}
          <div className="order-1 md:order-2 md:col-span-2 space-y-8 w-full">
            
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
              <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-3 font-bold relative z-10">Hautajaisjärjestelyt</h2>
              <h1 className="text-3xl md:text-4xl font-serif text-slate-800 mb-6 leading-tight relative z-10">{tapaus.deceased_name}</h1>
              <div className="space-y-6 relative z-10"><div className="inline-block border border-slate-200 px-4 py-2 bg-slate-50 rounded-lg"><span className="font-medium text-slate-600">{tapaus.status}</span></div><div className="flex items-center gap-6 border-t border-slate-100 pt-6"><span className="text-4xl">📅</span><div><span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Siunauspäivä</span><p className="font-medium text-xl md:text-2xl text-slate-800">{tapaus.ceremony_date ? new Date(tapaus.ceremony_date).toLocaleDateString('fi-FI') : 'Ei päätetty'}</p></div></div></div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-4 px-2"><h3 className="text-xl font-bold text-slate-800">Muistilista</h3><span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{tehtavat.filter(t => t.is_completed).length} / {tehtavat.length} VALMIINA</span></div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">{tehtavat.map(t => (<div key={t.id} onClick={() => rastiRuutuun(t.id, t.is_completed)} className={`p-5 border-b border-slate-50 flex items-center gap-5 cursor-pointer hover:bg-slate-50 transition ${t.is_completed ? 'bg-slate-50/50' : ''}`}><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${t.is_completed ? 'bg-slate-700 border-slate-700' : 'border-slate-300'}`}>{t.is_completed && <span className="text-white text-xs">✓</span>}</div><span className={`text-base ${t.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{t.title}</span></div>))}</div>
            </div>

            <div className="pt-4 text-center">
               <button onClick={() => setNaytaKauppa(true)} className="bg-slate-800 text-white px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-700 transition shadow-lg w-full md:w-auto transform active:scale-95">Selaa lisäpalveluita</button>
               <p className="text-slate-400 text-xs mt-4">Kukat, uurnat ja muut palvelut kätevästi verkkokaupastamme.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}