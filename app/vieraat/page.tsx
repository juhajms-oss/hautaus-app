'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TUOTTEET = [
  { id: 1, nimi: 'Surunvalittelu - Valkoiset liljat', hinta: 15, kuva: '🕊️' },
  { id: 2, nimi: 'Lämmin osanotto - Auringonlasku', hinta: 18, kuva: '🌅' },
  { id: 3, nimi: 'Muistoa kunnioittaen - Risti', hinta: 12, kuva: '⛪' },
  { id: 4, nimi: 'Metsän rauha - Maisema', hinta: 20, kuva: '🌲' },
]

export default function VierasSivu() {
  const router = useRouter()
  const [tapaus, setTapaus] = useState<any>(null)
  const [ladataan, setLadataan] = useState(true)
  const [valittuTuote, setValittuTuote] = useState<any>(null)
  const [lahettaja, setLahettaja] = useState('')
  const [viesti, setViesti] = useState('')
  const [tilausStatus, setTilausStatus] = useState('')

  useEffect(() => {
    // Tarkista kirjautuminen
    const savedSession = localStorage.getItem('hautaus_session')
    if (savedSession) {
      const session = JSON.parse(savedSession)
      if (session.arrangement_id) {
        haeTiedot(session.arrangement_id)
      } else {
        router.push('/') // Ei oikeutta, takaisin login
      }
    } else {
      router.push('/') // Ei kirjautunut
    }
  }, [])

  async function haeTiedot(id: string) {
    const { data } = await supabase.from('arrangements').select('*').eq('id', id).single()
    setTapaus(data)
    setLadataan(false)
  }

  // ... (Sama tilauslogiikka kuin aiemmin) ...
  async function lahetaTilaus(e: React.FormEvent) {
    e.preventDefault()
    if (!valittuTuote || !tapaus) return
    setTilausStatus('loading')
    const { error } = await supabase.from('orders').insert({ arrangement_id: tapaus.id, product_name: valittuTuote.nimi, price: valittuTuote.hinta, sender_name: lahettaja, message: viesti })
    if (error) { alert('Virhe: ' + error.message); setTilausStatus('') } 
    else { setTilausStatus('success'); setTimeout(() => { setValittuTuote(null); setLahettaja(''); setViesti(''); setTilausStatus('') }, 3000) }
  }

  const kirjauduUlos = () => {
    localStorage.removeItem('hautaus_session')
    router.push('/')
  }

  if (ladataan) return <div className="p-10 text-center text-slate-500">Ladataan tietoja...</div>
  if (!tapaus) return <div className="p-10 text-center text-slate-500">Tietoja ei löytynyt.</div>

  const map1 = `https://maps.google.com/maps?q=${encodeURIComponent(tapaus.location_address || 'Helsinki')}&t=&z=14&ie=UTF8&iwloc=&output=embed`
  const map2 = tapaus.memorial_location_address ? `https://maps.google.com/maps?q=${encodeURIComponent(tapaus.memorial_location_address)}&t=&z=14&ie=UTF8&iwloc=&output=embed` : null

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700 pb-20">
      
      <header className="bg-white pt-10 pb-8 px-4 text-center border-b border-slate-100 relative">
        <button onClick={kirjauduUlos} className="absolute top-4 right-4 text-xs text-slate-400 hover:text-slate-800">KIRJAUDU ULOS</button>
        <h2 className="text-slate-400 text-xs uppercase tracking-[0.2em] font-bold mb-4">HAUTAUS-APP</h2>
        <h1 className="text-4xl font-serif text-slate-800 mb-6">{tapaus.deceased_name}</h1>
        <div className="w-16 h-1 bg-slate-200 mx-auto mb-6"></div>
        <p className="text-slate-500 max-w-lg mx-auto font-medium text-lg leading-relaxed">Olette lämpimästi tervetulleita.</p>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-16 mt-6">
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="p-8"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest block mb-4 w-fit">Siunaus</span><h4 className="text-2xl font-bold text-slate-800 mb-2">{tapaus.location_name || 'Kappeli'}</h4><p className="text-slate-500 mb-6">{tapaus.location_address}</p><div className="h-64 bg-slate-100 relative grayscale-[20%] rounded-xl overflow-hidden"><iframe src={map1} className="absolute inset-0 w-full h-full border-0" loading="lazy"></iframe></div></div></div>
            {tapaus.memorial_location_name && (<div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="p-8"><span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest block mb-4 w-fit">Muistotilaisuus</span><h4 className="text-2xl font-bold text-slate-800 mb-2">{tapaus.memorial_location_name}</h4><p className="text-slate-500 mb-6">{tapaus.memorial_location_address}</p><div className="h-64 bg-slate-100 relative grayscale-[20%] rounded-xl overflow-hidden">{map2 && <iframe src={map2} className="absolute inset-0 w-full h-full border-0" loading="lazy"></iframe>}</div></div></div>)}
          </div>
        </section>

        <section className="pt-12 border-t border-slate-200">
          <div className="text-center mb-12"><h3 className="text-3xl font-serif text-slate-800 mb-4">Muista adressilla</h3><p className="text-slate-500 max-w-xl mx-auto">Välitä osanottosi adressilla. Toimitamme sen suoraan muistotilaisuuteen.</p></div>
          {tilausStatus === 'success' ? (<div className="bg-white text-slate-800 p-10 text-center shadow-lg border-l-4 border-emerald-500 rounded-xl"><h4 className="text-2xl font-bold mb-2">Kiitos tilauksesta</h4><p className="text-slate-500">Adressinne on vastaanotettu ja toimitetaan arvokkaasti perille.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-10"><div className="grid grid-cols-2 gap-6">{TUOTTEET.map(tuote => (<div key={tuote.id} onClick={() => setValittuTuote(tuote)} className={`cursor-pointer rounded-xl border p-6 text-center transition-all ${valittuTuote?.id === tuote.id ? 'border-slate-500 bg-slate-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-400'}`}><div className="text-4xl mb-4">{tuote.kuva}</div><h5 className="font-bold text-slate-800 mb-1">{tuote.nimi}</h5><p className="text-slate-500 text-sm font-medium">{tuote.hinta} €</p></div>))}</div><div className="bg-white p-8 shadow-lg border-t-4 border-slate-700 rounded-xl"><h4 className="font-bold text-xl text-slate-800 mb-6">{valittuTuote ? `Valittu: ${valittuTuote.nimi}` : 'Valitse adressi vasemmalta'}</h4><form onSubmit={lahetaTilaus} className="space-y-6"><div><label className="block text-xs uppercase font-bold text-slate-500 mb-2">Lähettäjät</label><input required className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-slate-300 outline-none" placeholder="Esim. Virtasen perhe" value={lahettaja} onChange={e => setLahettaja(e.target.value)} /></div><div><label className="block text-xs uppercase font-bold text-slate-500 mb-2">Muistovärssy</label><textarea required rows={4} className="w-full border border-slate-200 p-3 rounded-lg focus:ring-2 focus:ring-slate-300 outline-none" placeholder="Kauniista muistoista kiittäen..." value={viesti} onChange={e => setViesti(e.target.value)} /></div><button disabled={!valittuTuote || tilausStatus === 'loading'} type="submit" className={`w-full py-4 rounded-lg uppercase text-xs font-bold tracking-widest text-white transition ${!valittuTuote ? 'bg-slate-300' : 'bg-slate-800 hover:bg-slate-700 shadow-md'}`}>{tilausStatus === 'loading' ? 'Lähetetään...' : `Vahvista tilaus (${valittuTuote ? valittuTuote.hinta : 0} €)`}</button></form></div></div>)}
        </section>
      </main>
    </div>
  )
}